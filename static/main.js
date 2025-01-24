let currentChatId = null;

const newChatBtn = document.getElementById("new-chat-btn");
const sendBtn = document.getElementById("send-btn");
const chatContainer = document.getElementById("chat-container");
const userMessageInput = document.getElementById("user-message");
const apiKeyInput = document.getElementById("api-key");
const modelNameInput = document.getElementById("model-name");

newChatBtn.addEventListener("click", async () => {
    try {
        const response = await fetch("/new-chat", { method: "POST" });
        const data = await response.json();
        currentChatId = data.chat_id;
        chatContainer.innerHTML = "";
        userMessageInput.value = "";
    } catch (error) {
        console.error("Error creating new chat:", error);
    }
});

sendBtn.addEventListener("click", sendMessage);

userMessageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
    const userMessage = userMessageInput.value.trim();
    if (!userMessage) return;

    if (!currentChatId) {
        alert("Please click 'New Chat' first!");
        return;
    }

    addMessage("user", userMessage);
    userMessageInput.value = "";

    const apiKey = apiKeyInput.value.trim();
    const modelName = modelNameInput.value.trim();

    try {
        const response = await fetch("/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: currentChatId,
                user_message: userMessage,
                api_key: apiKey || null,
                model_name: modelName || null
            })
        });
        const data = await response.json();
        if (data.error) {
            console.error("Server error:", data.error);
            return;
        }
        renderConversation(data.conversation);
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

function renderConversation(conversation) {
    chatContainer.innerHTML = "";
    conversation.forEach(msg => {
        addMessage(msg.role, msg.content);
    });
}

function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", role);

    const p = document.createElement("p");
    p.textContent = content;

    messageDiv.appendChild(p);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
