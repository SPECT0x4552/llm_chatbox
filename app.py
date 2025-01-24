import os
import openai
import uuid
from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)

# Enhanced conversation store with timestamps and metadata
conversations = {}

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == "POST":
            data = request.json
            if not data.get("api_key"):
                return jsonify({"error": "DeepSeek API Key is required"}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")

@app.route("/new-chat", methods=["POST"])
@require_api_key
def new_chat():
    """
    Create a new chat session.
    Returns a unique chat_id for referencing the conversation.
    """
    chat_id = str(uuid.uuid4())
    conversations[chat_id] = {
        'messages': [],
        'created_at': datetime.now().isoformat(),
        'last_updated': datetime.now().isoformat()
    }
    return jsonify({"chat_id": chat_id})

@app.route("/send-message", methods=["POST"])
@require_api_key
def send_message():
    """
    Handles sending a user message to the DeepSeek-based model and 
    returning the updated conversation.
    """
    data = request.json
    chat_id = data.get("chat_id")
    user_message = data.get("user_message")
    api_key = data.get("api_key")
    model_name = data.get("model_name", "deepseek-reasoner")

    if not chat_id or not user_message:
        return jsonify({"error": "Missing required fields"}), 400

    # Create chat if it doesn't exist
    if chat_id not in conversations:
        conversations[chat_id] = {
            'messages': [],
            'created_at': datetime.now().isoformat(),
            'last_updated': datetime.now().isoformat()
        }

    # Update conversation
    conversations[chat_id]['messages'].append({
        "role": "user", 
        "content": user_message
    })
    conversations[chat_id]['last_updated'] = datetime.now().isoformat()

    # Configure OpenAI client for DeepSeek
    openai.api_key = api_key
    openai.api_base = "https://api.deepseek.com"

    try:
        # Make the API request to DeepSeek
        response = openai.ChatCompletion.create(
            model=model_name,
            messages=conversations[chat_id]['messages']
        )

        # Process the response
        content = response.choices[0].message["content"]
        reasoning_content = response.choices[0].message.get("reasoning_content", "")

        # Add the main response
        conversations[chat_id]['messages'].append({
            "role": "assistant", 
            "content": content
        })

        # Add reasoning content if present
        if reasoning_content:
            conversations[chat_id]['messages'].append({
                "role": "assistant_reasoning", 
                "content": reasoning_content
            })

        return jsonify({
            "conversation": conversations[chat_id]['messages']
        })
    except Exception as e:
        print(f"Error querying DeepSeek: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/list-chats", methods=["GET"])
def list_chats():
    """Return a list of all active chats with their metadata."""
    chat_list = [
        {
            "id": chat_id,
            "created_at": chat_data['created_at'],
            "last_updated": chat_data['last_updated'],
            "message_count": len(chat_data['messages']),
            "first_message": next(
                (msg['content'] for msg in chat_data['messages'] 
                 if msg['role'] == 'user'), 
                None
            )
        }
        for chat_id, chat_data in conversations.items()
    ]
    return jsonify({"chats": chat_list})

@app.route("/get-chat/<chat_id>", methods=["GET"])
def get_chat(chat_id):
    """Retrieve a specific chat's messages and metadata."""
    if chat_id not in conversations:
        return jsonify({"error": "Chat not found"}), 404
    
    return jsonify({
        "conversation": conversations[chat_id]['messages'],
        "metadata": {
            "created_at": conversations[chat_id]['created_at'],
            "last_updated": conversations[chat_id]['last_updated']
        }
    })

@app.route("/delete-chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    """Delete a specific chat session."""
    if chat_id not in conversations:
        return jsonify({"error": "Chat not found"}), 404
    
    del conversations[chat_id]
    return jsonify({"status": "success", "message": "Chat deleted"})

def cleanup_old_chats(max_age_hours=24):
    """
    Remove chats older than the specified number of hours.
    """
    current_time = datetime.now()
    chats_to_remove = []
    
    for chat_id, chat_data in conversations.items():
        last_updated = datetime.fromisoformat(chat_data['last_updated'])
        if (current_time - last_updated) > timedelta(hours=max_age_hours):
            chats_to_remove.append(chat_id)
    
    for chat_id in chats_to_remove:
        del conversations[chat_id]
    
    return len(chats_to_remove)

@app.route("/cleanup", methods=["POST"])
def trigger_cleanup():
    """Endpoint to manually trigger chat cleanup."""
    removed_count = cleanup_old_chats()
    return jsonify({
        "status": "success",
        "message": f"Removed {removed_count} old chats"
    })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)