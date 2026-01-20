use axum::{extract::State, response::IntoResponse, Json};
use uuid::Uuid;

use crate::auth::{create_jwt, hash_password, verify_password};
use crate::middleware::AppState;
use crate::models::{AuthResponse, LoginPayload, SignupPayload};

pub async fn signup(
    State(state): State<AppState>,
    Json(payload): Json<SignupPayload>,
) -> impl IntoResponse {
    let email = payload.email.trim();
    let password = payload.password.trim();
    if email.is_empty() || password.is_empty() {
        return (axum::http::StatusCode::BAD_REQUEST, "email/password required").into_response();
    }
    if password.len() < 6 {
        return (axum::http::StatusCode::BAD_REQUEST, "password too short").into_response();
    }
    let password_hash = match hash_password(&payload.password) {
        Ok(h) => h,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "hash failed").into_response(),
    };
    let user_id = Uuid::new_v4();

    let res = sqlx::query!(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
        user_id,
        payload.email,
        password_hash
    )
    .execute(&state.pool)
    .await;

    if let Err(err) = res {
        if err.to_string().contains("unique") {
            return (axum::http::StatusCode::CONFLICT, "email exists").into_response();
        }
        return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response();
    }

    let token = match create_jwt(user_id, &state.jwt_secret) {
        Ok(t) => t,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "token error").into_response(),
    };

    Json(AuthResponse { token }).into_response()
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    let email = payload.email.trim();
    let password = payload.password.trim();
    if email.is_empty() || password.is_empty() {
        return (axum::http::StatusCode::BAD_REQUEST, "email/password required").into_response();
    }
    let row = sqlx::query!(
        "SELECT id, password_hash FROM users WHERE email = $1",
        payload.email
    )
    .fetch_optional(&state.pool)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        _ => return (axum::http::StatusCode::UNAUTHORIZED, "invalid credentials").into_response(),
    };

    let ok = verify_password(&payload.password, &row.password_hash).unwrap_or(false);
    if !ok {
        return (axum::http::StatusCode::UNAUTHORIZED, "invalid credentials").into_response();
    }

    let token = match create_jwt(row.id, &state.jwt_secret) {
        Ok(t) => t,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "token error").into_response(),
    };

    Json(AuthResponse { token }).into_response()
}
