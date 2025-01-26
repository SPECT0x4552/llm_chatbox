use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::{
    models::chat::{
        CreateChatRequest, ChatResponse, MessageRole, SendMessageRequest, Chat,
    },
    services::{ChatService, DeepSeekClient},
};

/// POST /api/v1/chats
/// Body: { "api_key": "<YOUR_DEEPSEEK_API_KEY>" }
pub async fn create_chat(
    State(chat_service): State<ChatService>,
    Json(payload): Json<CreateChatRequest>,
) -> impl IntoResponse {
    match chat_service.create_chat(payload.api_key).await {
        Ok(chat) => (StatusCode::CREATED, Json(chat)).into_response(),
        Err(err) => {
            eprintln!("Error creating chat: {:?}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create chat").into_response()
        }
    }
}

/// GET /api/v1/chats
pub async fn list_chats(
    State(chat_service): State<ChatService>,
) -> impl IntoResponse {
    let chats = chat_service.list_chats().await;
    Json(chats)
}

/// POST /api/v1/chats/:chat_id/messages
/// Body: { "user_message": "Hello?", "api_key": "...", "model_name": "gpt-3.5-turbo" }
pub async fn send_message(
    State(chat_service): State<ChatService>,
    Path(chat_id): Path<Uuid>,
    Json(request): Json<SendMessageRequest>,
) -> impl IntoResponse {
    // 1) Add user message to the chat
    let Ok(_added_user) = chat_service
        .add_message(chat_id, request.user_message.clone(), MessageRole::User, None)
        .await
    else {
        return (StatusCode::NOT_FOUND, "Chat not found").into_response();
    };

    // 2) Call DeepSeek
    let deepseek_client = DeepSeekClient::new(request.api_key.clone());
    let ds_response = match deepseek_client
        .generate_response(&request.user_message, &request.model_name)
        .await
    {
        Ok(content) => content,
        Err(err) => {
            eprintln!("Error calling DeepSeek: {:?}", err);
            return (StatusCode::INTERNAL_SERVER_ERROR, "DeepSeek error").into_response();
        }
    };

    // 3) Add assistant's message to the chat
    let Ok(updated_chat) = chat_service
        .add_message(chat_id, ds_response, MessageRole::Assistant, None)
        .await
    else {
        return (StatusCode::NOT_FOUND, "Chat not found").into_response();
    };

    let response = ChatResponse {
        messages: updated_chat.messages,
        reasoning_content: None,
    };
    Json(response).into_response()
}
