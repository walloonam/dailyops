use axum::{routing::get, routing::post, Router};

use crate::config::Config;
use crate::handlers;
use crate::middleware::AppState;

pub fn app(pool: sqlx::PgPool, cfg: Config) -> Router {
    let state = AppState {
        pool,
        jwt_secret: cfg.jwt_secret,
        ai_base_url: cfg.ai_base_url,
        ai_model: cfg.ai_model,
    };

    Router::new()
        .route("/healthz", get(handlers::healthz::healthz))
        .route("/api/v1/auth/signup", post(handlers::auth::signup))
        .route("/api/v1/auth/login", post(handlers::auth::login))
        .route("/api/v1/tasks", post(handlers::tasks::create).get(handlers::tasks::list))
        .route("/api/v1/tasks/:id", get(handlers::tasks::get).patch(handlers::tasks::update).delete(handlers::tasks::delete))
        .route("/api/v1/notes", post(handlers::notes::create).get(handlers::notes::list))
        .route("/api/v1/notes/:id", get(handlers::notes::get).patch(handlers::notes::update).delete(handlers::notes::delete))
        .route("/api/v1/dashboard/summary", get(handlers::dashboard::summary))
        .route("/api/v1/ai/chat", post(handlers::ai::chat))
        .with_state(state)
}
