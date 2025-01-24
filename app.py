import os
import openai
import uuid
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# In-memory store of conversations.
# Format:
#   conversations = {
#     <chat_id>: [
#        {"role": "user", "content": "hello"},
#        {"role": "assistant", "content": "hi, how can I help?"}
#     ]
#   }
conversations = {}

@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")

@app.route("/new-chat", methods=["POST"])
def new_chat():
    """
    Create a new chat session.
    Returns a unique chat_id for referencing the conversation.
    """
    chat_id = str(uuid.uuid4())
    conversations[chat_id] = []
    return jsonify({"chat_id": chat_id})

@app.route("/send-message", methods=["POST"])
def send_message():
    """
    Handles sending a user message to the DeepSeek-based model and 
    returning the updated conversation.
    Expects JSON:
      { chat_id, user_message, api_key, model_name }
    """
    data = request.json
    chat_id = data.get("chat_id")
    user_message = data.get("user_message")
    api_key = data.get("api_key")        # Optional if you also have it in environment
    model_name = data.get("model_name")  # e.g. "deepseek-reasoner"

    # Basic validation
    if not chat_id or not user_message:
        return jsonify({"error": "Missing 'chat_id' or 'user_message'"}), 400

    # If the chat does not exist yet, create it
    if chat_id not in conversations:
        conversations[chat_id] = []

    # Append user's message to the conversation
    conversations[chat_id].append({"role": "user", "content": user_message})

    # Apply API key if provided (overrides environment)
    if api_key:
        openai.api_key = api_key

    # Point the OpenAI library to the DeepSeek endpoint
    openai.api_base = "https://api.deepseek.com"

    # Default to 'deepseek-reasoner' if model name is not provided
    model_name = model_name or "deepseek-reasoner"

    try:
        # Make the ChatCompletion request to DeepSeek's API
        response = openai.ChatCompletion.create(
            model=model_name,
            messages=conversations[chat_id]
        )

        # Extract standard assistant "content" 
        content = response.choices[0].message["content"]

        # DeepSeek custom field "reasoning_content" 
        # (use .get(...) to avoid errors if the field is missing)
        reasoning_content = response.choices[0].message.get("reasoning_content", "")

        # Append assistant's main content
        conversations[chat_id].append({"role": "assistant", "content": content})

        # Optionally, you can also store the reasoning content as a separate message
        # or handle it however you like. For example:
        if reasoning_content:
            conversations[chat_id].append({
                "role": "assistant_reasoning", 
                "content": reasoning_content
            })

        return jsonify({"conversation": conversations[chat_id]})
    except Exception as e:
        print(f"Error querying DeepSeek: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run in debug mode on localhost:5000 (customize as needed)
    app.run(debug=True, host="0.0.0.0", port=5000)
