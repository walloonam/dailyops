use axum::{extract::State, response::IntoResponse, Json};
use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::middleware::{AppState, AuthUser};
use crate::models::{Note, Task};

const MAX_CONTEXT_CHARS: usize = 4000;

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

    let context = truncate_context(&build_context(&tasks, &notes));

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
    let has_create_verb = msg.contains("등록")
        || msg.contains("추가")
        || msg.contains("생성")
        || msg.contains("만들");
    let has_task_noun = msg.contains("업무") || msg.contains("일정") || msg.contains("task");
    let mentions_note = msg.contains("노트") || msg.contains("메모");

    if mentions_note && !has_task_noun {
        return false;
    }

    has_create_verb
        || (has_task_noun
            && (msg.contains("업무등록")
                || msg.contains("업무 등록")
                || msg.contains("일정등록")
                || msg.contains("일정 등록")
                || msg.contains("add task")
                || msg.contains("create task")
                || msg.starts_with("task:")))
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
    let (title, start_date, end_date) = extract_title_and_range(message);
    let due_date = end_date.or(start_date);
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
        INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, start_date, end_date, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at
        "#,
        Uuid::new_v4(),
        user_id,
        title,
        Option::<String>::None,
        "todo",
        "medium",
        due_date,
        start_date,
        end_date,
        &empty_tags
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(task) => Json(ChatResponse {
            reply: format!(
                "업무가 등록됐어요: {}{}",
                task.title,
                format_date_range(task.start_date, task.end_date)
            ),
        })
        .into_response(),
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "db 오류").into_response(),
    }
}

fn extract_title_and_range(message: &str) -> (String, Option<NaiveDate>, Option<NaiveDate>) {
    let (keyword_start, keyword_end) = infer_range_from_keywords(message);
    let mut start_date = keyword_start;
    let mut end_date = keyword_end;
    let mut filtered: Vec<String> = Vec::new();

    if message.contains('~') && start_date.is_none() && end_date.is_none() {
        let parts: Vec<&str> = message.split('~').collect();
        if parts.len() >= 2 {
            start_date = extract_first_date(parts[0]);
            end_date = extract_first_date(parts[1]);
        }
    }

    for token in message.split_whitespace() {
        let token_trim = token.trim();
        if token_trim.contains('~') {
            continue;
        }

        if start_date.is_none() {
            if let Ok(date) = NaiveDate::parse_from_str(token_trim, "%Y-%m-%d") {
                start_date = Some(date);
                continue;
            }
        } else if end_date.is_none() {
            if let Ok(date) = NaiveDate::parse_from_str(token_trim, "%Y-%m-%d") {
                end_date = Some(date);
                continue;
            }
        }
        filtered.push(token.to_string());
    }

    if start_date.is_some() && end_date.is_none() {
        end_date = start_date;
    }
    if end_date.is_some() && start_date.is_none() {
        start_date = end_date;
    }

    let cleaned = filtered
        .join(" ")
        .replace("업무등록", "")
        .replace("업무 등록", "")
        .replace("일정등록", "")
        .replace("일정 등록", "")
        .replace("등록해줘요", "")
        .replace("등록해줘", "")
        .replace("추가해줘요", "")
        .replace("추가해줘", "")
        .replace("추가", "")
        .replace("해줘요", "")
        .replace("해줘", "")
        .replace("등록", "")
        .replace("task:", "")
        .replace("add task", "")
        .replace("create task", "")
        .replace("오늘", "")
        .replace("내일", "")
        .replace("이번주", "")
        .replace("다음주", "")
        .replace("이번달", "")
        .replace("다음달", "")
        .trim()
        .to_string();

    (cleaned, start_date, end_date)
}

fn extract_first_date(input: &str) -> Option<NaiveDate> {
    for token in input.split_whitespace() {
        if let Ok(date) = NaiveDate::parse_from_str(token.trim(), "%Y-%m-%d") {
            return Some(date);
        }
    }
    None
}

fn infer_range_from_keywords(message: &str) -> (Option<NaiveDate>, Option<NaiveDate>) {
    let today = Utc::now().date_naive();
    if message.contains("오늘") {
        return (Some(today), Some(today));
    }
    if message.contains("내일") {
        let next = today.succ_opt().unwrap_or(today);
        return (Some(next), Some(next));
    }
    if message.contains("이번주") {
        let weekday = today.weekday().num_days_from_monday() as i64;
        let start = today - chrono::Duration::days(weekday);
        let end = start + chrono::Duration::days(6);
        return (Some(start), Some(end));
    }
    if message.contains("다음주") {
        let weekday = today.weekday().num_days_from_monday() as i64;
        let start = today - chrono::Duration::days(weekday) + chrono::Duration::days(7);
        let end = start + chrono::Duration::days(6);
        return (Some(start), Some(end));
    }
    if message.contains("이번달") {
        let start = NaiveDate::from_ymd_opt(today.year(), today.month(), 1);
        if let Some(start_date) = start {
            let (next_year, next_month) = if today.month() == 12 {
                (today.year() + 1, 1)
            } else {
                (today.year(), today.month() + 1)
            };
            let next_month_start = NaiveDate::from_ymd_opt(next_year, next_month, 1)
                .unwrap_or(start_date);
            let end = next_month_start - chrono::Duration::days(1);
            return (Some(start_date), Some(end));
        }
    }
    if message.contains("다음달") {
        let (year, month) = if today.month() == 12 {
            (today.year() + 1, 1)
        } else {
            (today.year(), today.month() + 1)
        };
        if let Some(start_date) = NaiveDate::from_ymd_opt(year, month, 1) {
            let (next_year, next_month) = if month == 12 {
                (year + 1, 1)
            } else {
                (year, month + 1)
            };
            let next_month_start = NaiveDate::from_ymd_opt(next_year, next_month, 1)
                .unwrap_or(start_date);
            let end = next_month_start - chrono::Duration::days(1);
            return (Some(start_date), Some(end));
        }
    }
    (None, None)
}

fn format_date_range(start: Option<NaiveDate>, end: Option<NaiveDate>) -> String {
    match (start, end) {
        (Some(s), Some(e)) if s == e => format!(" (마감 {})", s),
        (Some(s), Some(e)) => format!(" ({} ~ {})", s, e),
        (Some(s), None) => format!(" (마감 {})", s),
        _ => "".to_string(),
    }
}

async fn fetch_tasks(state: &AppState, user_id: Uuid) -> Result<Vec<Task>, sqlx::Error> {
    sqlx::query_as!(
        Task,
        r#"SELECT id, user_id, title, description, status, priority, due_date, start_date, end_date, tags, created_at, updated_at FROM tasks
           WHERE user_id = $1
           ORDER BY end_date NULLS LAST, updated_at DESC
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
                let due = match (t.start_date, t.end_date) {
                    (Some(s), Some(e)) if s == e => format!("마감 {}", s),
                    (Some(s), Some(e)) => format!("{}~{}", s, e),
                    (Some(s), None) => format!("마감 {}", s),
                    _ => "마감 없음".to_string(),
                };
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

fn truncate_context(input: &str) -> String {
    if input.chars().count() <= MAX_CONTEXT_CHARS {
        return input.to_string();
    }
    let mut truncated: String = input.chars().take(MAX_CONTEXT_CHARS).collect();
    truncated.push_str("...");
    truncated
}
