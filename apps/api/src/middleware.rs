use axum::{
    async_trait,
    extract::{FromRequestParts, State},
    http::{header, request::Parts},
    response::{IntoResponse, Response},
};
use uuid::Uuid;

use crate::auth::decode_jwt;

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
    pub jwt_secret: String,
    pub ai_base_url: String,
    pub ai_model: String,
}

pub struct AuthUser {
    pub user_id: Uuid,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if !auth_header.starts_with("Bearer ") {
            return Err((axum::http::StatusCode::UNAUTHORIZED, "missing token").into_response());
        }
        let token = auth_header.trim_start_matches("Bearer ").trim();
        let user_id = decode_jwt(token, &state.jwt_secret)
            .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, "invalid token").into_response())?;
        Ok(AuthUser { user_id })
    }
}
