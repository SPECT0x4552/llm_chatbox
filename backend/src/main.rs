use std::net::SocketAddr;
use std::time::Duration;

use axum::{
    http::{
        HeaderValue,
        Method,
        header::{CONTENT_TYPE, AUTHORIZATION},
    },
    routing::{get, post},
    Router
};
use tower_http::cors::CorsLayer;

mod handlers;
mod models;
mod services;

use handlers::{create_chat, list_chats, send_message};
use services::ChatService;

#[tokio::main]
async fn main() {
    // Create the in-memory chat service (stores chats in a HashMap)
    let chat_service = ChatService::new();

    // Build our router with 3 endpoints:
    //  - POST /api/v1/chats       --> create_chat
    //  - GET /api/v1/chats        --> list_chats
    //  - POST /api/v1/chats/:id/messages --> send_message
    let app = Router::new()
        .route("/api/v1/chats", post(create_chat))
        .route("/api/v1/chats", get(list_chats))
        .route("/api/v1/chats/:chat_id/messages", post(send_message))
        // Provide the chat_service as state to all handlers
        .with_state(chat_service)
        // Add CORS to allow requests from localhost:5173 (Vite)
        .layer(
            CorsLayer::new()
                .allow_origin("http://localhost:5174".parse::<HeaderValue>().unwrap())
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers([CONTENT_TYPE, AUTHORIZATION])
                .max_age(Duration::from_secs(3600)),
        );

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server listening on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
