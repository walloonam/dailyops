use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use sqlx::QueryBuilder;
use uuid::Uuid;

use crate::middleware::{AppState, AuthUser};
use crate::models::{Task, TaskCreate, TaskUpdate};

#[derive(Deserialize)]
pub struct TaskListQuery {
    pub q: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tag: Option<String>,
    pub sort: Option<String>,
    pub order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn create(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Json(payload): Json<TaskCreate>,
) -> impl IntoResponse {
    let tags = payload.tags.unwrap_or_default();
    let start_date = payload.start_date.or(payload.due_date);
    let end_date = payload.end_date.or(payload.due_date);
    let due_date = payload.due_date.or(end_date);
    let row = sqlx::query_as!(
        Task,
        r#"
        INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, start_date, end_date, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at
        "#,
        Uuid::new_v4(),
        user_id,
        payload.title,
        payload.description,
        payload.status,
        payload.priority,
        due_date,
        start_date,
        end_date,
        &tags
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(task) => Json(task).into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}

pub async fn list(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Query(query): Query<TaskListQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).max(1).min(100);
    let offset = (page - 1) * limit;

    let sort = match query.sort.as_deref() {
        Some("end_date") => "COALESCE(end_date, due_date)",
        Some("created_at") => "created_at",
        _ => "created_at",
    };
    let order = match query.order.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    let mut qb = QueryBuilder::new(
        "SELECT id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at FROM tasks WHERE user_id = ",
    );
    qb.push_bind(user_id);

    if let Some(q) = query.q {
        let like = format!("%{}%", q);
        qb.push(" AND (title ILIKE ");
        qb.push_bind(like.clone());
        qb.push(" OR description ILIKE ");
        qb.push_bind(like);
        qb.push(")");
    }
    if let Some(status) = query.status {
        qb.push(" AND status = ");
        qb.push_bind(status);
    }
    if let Some(priority) = query.priority {
        qb.push(" AND priority = ");
        qb.push_bind(priority);
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

    let tasks = qb.build_query_as::<Task>().fetch_all(&state.pool).await;

    match tasks {
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
        Task,
        "SELECT id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at FROM tasks WHERE id = $1 AND user_id = $2",
        id,
        user_id
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(task)) => Json(task).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, "not found").into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response(),
    }
}

pub async fn update(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<TaskUpdate>,
) -> impl IntoResponse {
    let start_date = payload.start_date.or(payload.end_date);
    let end_date = payload.end_date.or(payload.start_date);
    let due_date = payload.due_date.or(end_date);
    let row = sqlx::query_as!(
        Task,
        r#"
        UPDATE tasks
        SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            priority = COALESCE($4, priority),
            due_date = COALESCE($5, due_date),
            start_date = COALESCE($6, start_date),
            end_date = COALESCE($7, end_date),
            tags = COALESCE($8, tags),
            updated_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at
        "#,
        payload.title,
        payload.description,
        payload.status,
        payload.priority,
        due_date,
        start_date,
        end_date,
        payload.tags.as_deref(),
        id,
        user_id
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(task)) => Json(task).into_response(),
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
        "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
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
