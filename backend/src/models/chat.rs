use serde::{Deserialize, Serialize};
use uuid::Uuid;
use time::OffsetDateTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chat {
    pub id: Uuid,

    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,

    #[serde(with = "time::serde::rfc3339")]
    pub last_updated: OffsetDateTime,

    pub api_key: String,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,

    #[serde(with = "time::serde::rfc3339")]
    pub timestamp: OffsetDateTime,

    pub reasoning_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
}

// -- Request/Response payloads --
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChatRequest {
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageRequest {
    pub user_message: String,
    pub api_key: String,
    pub model_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub messages: Vec<Message>,
    pub reasoning_content: Option<String>,
}

// Implementation
impl Chat {
    pub fn new(api_key: String) -> Self {
        let now = OffsetDateTime::now_utc();
        Self {
            id: Uuid::new_v4(),
            created_at: now,
            last_updated: now,
            api_key,
            messages: Vec::new(),
        }
    }

    pub fn add_message(&mut self, message: Message) {
        self.messages.push(message);
        self.last_updated = OffsetDateTime::now_utc();
    }
}
