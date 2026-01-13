use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::middleware::{AppState, AuthUser};
use crate::models::{Note, Task};

#[derive(Deserialize)]
pub struct ChatRequest {
    pub message: String,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub reply: String,
}

#[derive(Deserialize)]
struct OllamaChatMessage {
    content: String,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: Option<OllamaChatMessage>,
    response: Option<String>, // fallback shape for /api/generate
}

pub async fn chat(
    State(state): State<AppState>,
    AuthUser { user_id }: AuthUser,
    Json(payload): Json<ChatRequest>,
) -> impl IntoResponse {
    let tasks = fetch_tasks(&state, user_id).await.unwrap_or_default();
    let notes = fetch_notes(&state, user_id).await.unwrap_or_default();

    let context = build_context(&tasks, &notes);

    let client = reqwest::Client::new();
    let url = format!("{}/api/chat", state.ai_base_url.trim_end_matches('/'));

    let body = json!({
        "model": state.ai_model,
        "messages": [
            {
                "role": "system",
                "content": format!(
                    "너는 사용자의 비서다. 한국어로 짧고 실용적으로 답해라. \
                    오늘 할 일/우선순위/마감과 최근 노트를 참고해 요청에 맞게 정리하거나 답변해. \
                    할 일은 bullet로 요약하고, 날짜가 없다면 '마감 없음'이라고 적어라. \
                    컨텍스트: {}",
                    context
                )
            },
            { "role": "user", "content": payload.message }
        ],
        "stream": false
    });

    let resp = client.post(url).json(&body).send().await;

    match resp {
        Ok(res) if res.status().is_success() => {
            let parsed = res.json::<OllamaChatResponse>().await.ok();
            let reply = parsed
                .and_then(|p| p.message.map(|m| m.content).or(p.response))
                .unwrap_or_else(|| "모델 응답을 읽지 못했습니다.".to_string());
            Json(ChatResponse { reply }).into_response()
        }
        Ok(res) => {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            (
                axum::http::StatusCode::BAD_GATEWAY,
                format!("모델 호출 실패({status}): {text}"),
            )
                .into_response()
        }
        Err(err) => (
            axum::http::StatusCode::BAD_GATEWAY,
            format!("모델 서버에 연결할 수 없습니다: {err} (ollama serve 실행 여부 확인)"),
        )
            .into_response(),
    }
}

async fn fetch_tasks(state: &AppState, user_id: Uuid) -> Result<Vec<Task>, sqlx::Error> {
    sqlx::query_as!(
        Task,
        r#"SELECT * FROM tasks
           WHERE user_id = $1
           ORDER BY due_date NULLS LAST, updated_at DESC
           LIMIT 30"#,
        user_id
    )
    .fetch_all(&state.pool)
    .await
}

async fn fetch_notes(state: &AppState, user_id: Uuid) -> Result<Vec<Note>, sqlx::Error> {
    sqlx::query_as!(
        Note,
        r#"SELECT * FROM notes
           WHERE user_id = $1
           ORDER BY updated_at DESC
           LIMIT 10"#,
        user_id
    )
    .fetch_all(&state.pool)
    .await
}

fn build_context(tasks: &[Task], notes: &[Note]) -> String {
    let mut parts = vec![];
    if !tasks.is_empty() {
        let task_lines: Vec<String> = tasks
            .iter()
            .map(|t| {
                let status = &t.status;
                let prio = &t.priority;
                let due = t
                    .due_date
                    .map(|d| d.to_string())
                    .unwrap_or_else(|| "마감 없음".to_string());
                let tags = if t.tags.is_empty() {
                    "".to_string()
                } else {
                    format!(" #{}", t.tags.join(" #"))
                };
                format!("- [{}][{}][{}] {}{}", status, prio, due, t.title, tags)
            })
            .collect();
        parts.push(format!("업무: {}", task_lines.join(" | ")));
    }
    if !notes.is_empty() {
        let note_lines: Vec<String> = notes
            .iter()
            .map(|n| {
                let tags = if n.tags.is_empty() {
                    "".to_string()
                } else {
                    format!(" #{}", n.tags.join(" #"))
                };
                format!("- {}{}", n.title, tags)
            })
            .collect();
        parts.push(format!("노트: {}", note_lines.join(" | ")));
    }
    if parts.is_empty() {
        "현재 등록된 업무/노트가 없습니다.".to_string()
    } else {
        parts.join(" ; ")
    }
}
