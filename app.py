import os
import openai
import uuid
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# In-memory store of conversations
conversations = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/new-chat", methods=["POST"])
def new_chat():
    chat_id = str(uuid.uuid4())
    conversations[chat_id] = []
    return jsonify({"chat_id": chat_id})

@app.route("/send-message", methods=["POST"])
def send_message():
    data = request.json
    chat_id = data.get("chat_id")
    user_message = data.get("user_message")
    api_key = data.get("api_key")
    model_name = data.get("model_name") or "deepseek-reasoner"

    if not chat_id or not user_message:
        return jsonify({"error": "Missing 'chat_id' or 'user_message'"}), 400

    if chat_id not in conversations:
        conversations[chat_id] = []

    # Append user's message
    conversations[chat_id].append({"role": "user", "content": user_message})

    # Use provided API key or environment-based
    if api_key:
        openai.api_key = api_key

    # DeepSeek custom base
    openai.api_base = "https://api.deepseek.com"

    try:
        response = openai.ChatCompletion.create(
            model=model_name,
            messages=conversations[chat_id]
        )
        content = response.choices[0].message["content"]
        reasoning_content = response.choices[0].message.get("reasoning_content", "")

        # Append assistant's main content
        conversations[chat_id].append({"role": "assistant", "content": content})

        # Optionally add reasoning content as a separate message
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
    app.run(debug=True, host="0.0.0.0", port=5000)
