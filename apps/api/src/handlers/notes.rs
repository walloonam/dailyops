use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use sqlx::QueryBuilder;
use uuid::Uuid;

use crate::middleware::{AppState, AuthUser};
use crate::models::{Note, NoteCreate, NoteUpdate};

#[derive(Deserialize)]
pub struct NoteListQuery {
    pub q: Option<String>,
    pub tag: Option<String>,
    pub sort: Option<String>,
    pub order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn create(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Json(payload): Json<NoteCreate>,
) -> impl IntoResponse {
    let title = payload.title.trim();
    if title.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            "title required",
        )
            .into_response();
    }
    let content = payload.content.trim();
    if content.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            "content required",
        )
            .into_response();
    }

    let tags = payload.tags.unwrap_or_default();
    let row = sqlx::query_as!(
        Note,
        r#"
        INSERT INTO notes (id, user_id, title, content, tags)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
        Uuid::new_v4(),
        user_id,
        title,
        content,
        &tags
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(note) => Json(note).into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}

pub async fn list(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Query(query): Query<NoteListQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).max(1).min(100);
    let offset = (page - 1) * limit;

    let sort = match query.sort.as_deref() {
        Some("created_at") => "created_at",
        _ => "created_at",
    };
    let order = match query.order.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    let mut qb = QueryBuilder::new("SELECT * FROM notes WHERE user_id = ");
    qb.push_bind(user_id);

    if let Some(q) = query.q {
        let like = format!("%{}%", q);
        qb.push(" AND (title ILIKE ");
        qb.push_bind(like.clone());
        qb.push(" OR content ILIKE ");
        qb.push_bind(like);
        qb.push(")");
    }
    if let Some(tag) = query.tag {
        qb.push(" AND ");
        qb.push_bind(tag);
        qb.push(" = ANY(tags)");
    }

    qb.push(" ORDER BY ");
    qb.push(sort);
    qb.push(" ");
    qb.push(order);
    qb.push(" LIMIT ");
    qb.push_bind(limit);
    qb.push(" OFFSET ");
    qb.push_bind(offset);

    let notes = qb.build_query_as::<Note>().fetch_all(&state.pool).await;

    match notes {
        Ok(items) => Json(items).into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}

pub async fn get(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let row = sqlx::query_as!(
        Note,
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        id,
        user_id
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(note)) => Json(note).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, "not found").into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}

pub async fn update(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<NoteUpdate>,
) -> impl IntoResponse {
    let title = payload.title.map(|t| t.trim().to_string());
    if let Some(ref t) = title {
        if t.is_empty() {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                "title required",
            )
                .into_response();
        }
    }
    let content = payload.content.map(|c| c.trim().to_string());
    if let Some(ref c) = content {
        if c.is_empty() {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                "content required",
            )
                .into_response();
        }
    }

    let row = sqlx::query_as!(
        Note,
        r#"
        UPDATE notes
        SET
            title = COALESCE($1, title),
            content = COALESCE($2, content),
            tags = COALESCE($3, tags),
            updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
        "#,
        title,
        content,
        payload.tags.as_deref(),
        id,
        user_id
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(note)) => Json(note).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, "not found").into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}

pub async fn delete(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let res = sqlx::query!(
        "DELETE FROM notes WHERE id = $1 AND user_id = $2",
        id,
        user_id
    )
    .execute(&state.pool)
    .await;

    match res {
        Ok(r) if r.rows_affected() == 1 => (axum::http::StatusCode::NO_CONTENT, "").into_response(),
        Ok(_) => (axum::http::StatusCode::NOT_FOUND, "not found").into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}
