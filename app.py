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
        'last_updated': datetime.now().isoformat(),
        'api_key': request.json.get('api_key')  # Store API key with the chat
    }
    return jsonify({
        "chat_id": chat_id,
        "created_at": conversations[chat_id]['created_at']
    })

def process_message(message):
    """Remove reasoning and metadata from messages."""
    if not isinstance(message, dict) or 'content' not in message:
        return message

    # Skip processing for user messages
    if message.get('role') == 'user':
        return message

    content = message['content']
    
    # Remove reasoning patterns
    filtered_lines = []
    skip_line = False
    
    for line in content.split('\n'):
        # Skip lines with reasoning patterns
        if any(pattern in line.lower() for pattern in [
            'i can', 'i could', 'i should', 'i would', 'i will', 'i think',
            'let me', "let's", 'alternatively', 'we can', 'we could',
            'looks like', 'seems like', 'appears to be', 'might be',
            'don\'t make assumptions', 'encourage them',
            'they might', 'they may', 'they could',
            'antthinking', 'reasoning', 'checking', 'verifying'
        ]):
            skip_line = True
            continue

        # Skip explanatory or meta-commentary lines
        if line.strip().lower().startswith((
            'okay', 'alright', 'now', 'here', 'well', 'so',
            'first', 'next', 'then', 'finally'
        )):
            skip_line = True
            continue

        if not skip_line and line.strip():
            filtered_lines.append(line)
        skip_line = False

    # Update the message content
    message['content'] = '\n'.join(filtered_lines).strip()
    return message

@app.route("/send-message", methods=["POST"])
@require_api_key
def send_message():
    """Handle sending a message to DeepSeek."""
    data = request.json
    chat_id = data.get("chat_id")
    user_message = data.get("user_message")
    api_key = data.get("api_key")
    model_name = data.get("model_name", "deepseek-reasoner")

    if not chat_id or not user_message:
        return jsonify({"error": "Missing required fields"}), 400

    if chat_id not in conversations:
        return jsonify({"error": "Chat not found"}), 404

    try:
        # Configure OpenAI client for DeepSeek
        openai.api_key = api_key
        openai.api_base = "https://api.deepseek.com"

        # Get current conversation
        chat_messages = conversations[chat_id]['messages']

        # Add user message
        chat_messages.append({
            "role": "user",
            "content": user_message
        })

        # Make API request
        response = openai.ChatCompletion.create(
            model=model_name,
            messages=chat_messages
        )

        # Process and add assistant's response
        assistant_message = response.choices[0].message
        processed_message = process_message(assistant_message)
        
        if processed_message and processed_message['content'].strip():
            chat_messages.append(processed_message)

        # Update conversation timestamp
        conversations[chat_id]['last_updated'] = datetime.now().isoformat()

        return jsonify({
            "conversation": [process_message(msg) if msg['role'] != 'user' else msg 
                           for msg in chat_messages]
        })

    except Exception as e:
        print(f"Error in send_message: {str(e)}")
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