use axum::{extract::State, response::IntoResponse, Json};
use chrono::Utc;

use crate::middleware::{AppState, AuthUser};
use crate::models::{DashboardSummary, Task};

pub async fn summary(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
) -> impl IntoResponse {
    let today = Utc::now().date_naive();
    let week_start = Utc::now() - chrono::Duration::days(7);

    let total_tasks = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1",
        user_id
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(Some(0))
    .unwrap_or(0);

    let due_today = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND COALESCE(start_date, due_date) <= $2 AND COALESCE(end_date, due_date) >= $2",
        user_id,
        today
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(Some(0))
    .unwrap_or(0);

    let overdue = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND COALESCE(end_date, due_date) < $2 AND status != 'done'",
        user_id,
        today
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(Some(0))
    .unwrap_or(0);

    let done_this_week = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'done' AND updated_at >= $2",
        user_id,
        week_start
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(Some(0))
    .unwrap_or(0);

    let recent_tasks = sqlx::query_as!(
        Task,
        "SELECT id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at FROM tasks WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 10",
        user_id
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(DashboardSummary {
        total_tasks,
        due_today,
        overdue,
        done_this_week,
        recent_tasks,
    })
    .into_response()
}
