use axum::{extract::State, response::IntoResponse, Json};
use chrono::NaiveDate;
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
    if is_task_create_request(&payload.message) {
        return handle_task_create(&state, user_id, &payload.message).await;
    }

    if !is_brief_request(&payload.message) {
        return Json(ChatResponse {
            reply: "저는 업무 등록과 브리핑만 도와드려요. 예) \"업무 등록: 회의 준비 2024-12-01\" 또는 \"오늘 브리핑\"".to_string(),
        })
        .into_response();
    }

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
                    "당신은 데일리 업무 비서입니다. 브리핑/요약만 처리합니다. \
간결한 불릿 포인트로 답하세요. 마감일이 없으면 \"마감 없음\"이라고 표기하세요. \
제공된 컨텍스트만 사용하세요.\n컨텍스트: {}",
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
                .unwrap_or_else(|| "모델 응답이 비어 있습니다.".to_string());
            Json(ChatResponse { reply }).into_response()
        }
        Ok(res) => {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            (
                axum::http::StatusCode::BAD_GATEWAY,
                format!("모델 호출 실패 ({status}): {text}"),
            )
                .into_response()
        }
        Err(err) => (
            axum::http::StatusCode::BAD_GATEWAY,
            format!("모델 서버 오류: {err} (ollama 실행 여부 확인)"),
        )
            .into_response(),
    }
}

fn is_task_create_request(message: &str) -> bool {
    let msg = message.to_lowercase();
    msg.contains("업무등록")
        || msg.contains("업무 등록")
        || msg.contains("일정등록")
        || msg.contains("일정 등록")
        || msg.contains("task")
        || msg.contains("add task")
        || msg.contains("create task")
        || msg.starts_with("task:")
}

fn is_brief_request(message: &str) -> bool {
    let msg = message.to_lowercase();
    msg.contains("브리핑")
        || msg.contains("요약")
        || msg.contains("정리")
        || msg.contains("우선순위")
        || msg.contains("brief")
        || msg.contains("summary")
        || msg.contains("priorities")
}

async fn handle_task_create(
    state: &AppState,
    user_id: Uuid,
    message: &str,
) -> axum::response::Response {
    let (title, due_date) = extract_title_and_due(message);
    if title.is_empty() {
        return Json(ChatResponse {
            reply: "업무 제목을 알려주세요. 예) \"업무 등록: 회의 준비 2024-12-01\"".to_string(),
        })
        .into_response();
    }

    let empty_tags: Vec<String> = Vec::new();
    let row = sqlx::query_as!(
        Task,
        r#"
        INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#,
        Uuid::new_v4(),
        user_id,
        title,
        Option::<String>::None,
        "todo",
        "medium",
        due_date,
        &empty_tags
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(task) => Json(ChatResponse {
            reply: format!(
                "업무가 등록됐어요: {}{}",
                task.title,
                task.due_date
                    .map(|d| format!(" (마감 {})", d))
                    .unwrap_or_default()
            ),
        })
        .into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db 오류").into_response(),
    }
}

fn extract_title_and_due(message: &str) -> (String, Option<NaiveDate>) {
    let mut due_date = None;
    let mut filtered: Vec<String> = Vec::new();

    for token in message.split_whitespace() {
        if due_date.is_none() {
            if let Ok(date) = NaiveDate::parse_from_str(token, "%Y-%m-%d") {
                due_date = Some(date);
                continue;
            }
        }
        filtered.push(token.to_string());
    }

    let cleaned = filtered
        .join(" ")
        .replace("업무등록", "")
        .replace("업무 등록", "")
        .replace("일정등록", "")
        .replace("일정 등록", "")
        .replace("등록", "")
        .replace("task:", "")
        .replace("add task", "")
        .replace("create task", "")
        .trim()
        .to_string();

    (cleaned, due_date)
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
        "등록된 업무나 노트가 없습니다.".to_string()
    } else {
        parts.join(" ; ")
    }
}
