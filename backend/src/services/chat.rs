use std::collections::HashMap;
use std::sync::Arc;

use anyhow::Result;
use time::Duration;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::models::chat::{Chat, Message, MessageRole};

#[derive(Clone)]
pub struct ChatService {
    chats: Arc<RwLock<HashMap<Uuid, Chat>>>,
}

impl ChatService {
    pub fn new() -> Self {
        Self {
            chats: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_chat(&self, api_key: String) -> Result<Chat> {
        let chat = Chat::new(api_key);
        let id = chat.id;
        let mut map = self.chats.write().await;
        map.insert(id, chat.clone());
        Ok(chat)
    }

    pub async fn get_chat(&self, chat_id: Uuid) -> Option<Chat> {
        let map = self.chats.read().await;
        map.get(&chat_id).cloned()
    }

    pub async fn list_chats(&self) -> Vec<Chat> {
        let map = self.chats.read().await;
        map.values().cloned().collect()
    }

    pub async fn add_message(
        &self,
        chat_id: Uuid,
        content: String,
        role: MessageRole,
        reasoning_content: Option<String>,
    ) -> Result<Chat> {
        let mut map = self.chats.write().await;
        let chat = map
            .get_mut(&chat_id)
            .ok_or_else(|| anyhow::anyhow!("Chat not found"))?;

        let msg = Message {
            role,
            content,
            timestamp: time::OffsetDateTime::now_utc(),
            reasoning_content,
        };

        chat.add_message(msg);

        Ok(chat.clone())
    }

    // (Optional) background task to clean up older chats
    pub async fn cleanup_old_chats(&self) {
        let max_age = Duration::hours(24);

        loop {
            {
                let mut map = self.chats.write().await;
                let now = time::OffsetDateTime::now_utc();
                map.retain(|_, chat| now - chat.last_updated < max_age);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
        }
    }
}
