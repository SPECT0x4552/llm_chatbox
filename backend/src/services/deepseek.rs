use serde::{Deserialize, Serialize};
use reqwest::Client;
use anyhow::Result;

#[derive(Debug, Serialize)]
struct DeepSeekRequest {
    model: String,
    messages: Vec<DeepSeekMessage>,
    temperature: f32,
    max_tokens: i32,
}

#[derive(Debug, Deserialize)]
struct DeepSeekResponse {
    choices: Vec<DeepSeekChoice>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekChoice {
    message: DeepSeekMessage,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepSeekMessage {
    role: String,
    content: String,
}

pub struct DeepSeekClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl DeepSeekClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            // If the R3 base is different, adjust here:
            base_url: "https://api.deepseek.com/v1".to_string(),
        }
    }

    pub async fn generate_response(&self, prompt: &str, model: &str) -> Result<String> {
        let body = DeepSeekRequest {
            model: model.into(),
            messages: vec![DeepSeekMessage {
                role: "user".into(),
                content: prompt.into(),
            }],
            temperature: 0.7,
            max_tokens: 2000,
        };

        let resp = self.client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await?
            .json::<DeepSeekResponse>()
            .await?;

        let first_message = resp.choices
            .get(0)
            .map(|choice| choice.message.content.clone())
            .unwrap_or_else(|| "No response from DeepSeek".to_string());

        Ok(first_message)
    }
}
