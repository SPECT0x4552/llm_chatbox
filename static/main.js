let currentChatId = null;
let activeChats = new Map();

const newChatBtn = document.getElementById("new-chat-btn");
const sendBtn = document.getElementById("send-btn");
const chatContainer = document.getElementById("chat-container");
const userMessageInput = document.getElementById("user-message");
const apiKeyInput = document.getElementById("api-key");
const modelNameInput = document.getElementById("model-name");
const chatDropdown = document.getElementById("chat-dropdown");
const loadingIndicator = document.querySelector(".loading");

// Initialize highlight.js
hljs.highlightAll();

// Chat dropdown management
chatDropdown.addEventListener("change", (e) => {
    if (e.target.value) {
        currentChatId = e.target.value;
        renderConversation(activeChats.get(currentChatId));
    }
});

function updateChatDropdown() {
    const currentSelection = chatDropdown.value;
    chatDropdown.innerHTML = "<option value=''>Select Chat</option>";

    activeChats.forEach((messages, chatId) => {
        const option = document.createElement("option");
        option.value = chatId;
        const firstUserMsg = messages.find(m => m.role === "user")?.content;
        option.textContent = firstUserMsg ?
            `Chat ${chatId.slice(0, 6)} - ${firstUserMsg.slice(0, 30)}...` :
            `Chat ${chatId.slice(0, 6)}`;
        chatDropdown.appendChild(option);
    });

    if (currentSelection) {
        chatDropdown.value = currentSelection;
    }
}

newChatBtn.addEventListener("click", async () => {
    if (!apiKeyInput.value.trim()) {
        alert("Please enter your DeepSeek API Key");
        return;
    }

    try {
        const response = await fetch("/new-chat", { method: "POST" });
        const data = await response.json();
        currentChatId = data.chat_id;
        activeChats.set(currentChatId, []);
        updateChatDropdown();
        chatDropdown.value = currentChatId;
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

    if (!apiKeyInput.value.trim()) {
        alert("Please enter your DeepSeek API Key");
        return;
    }

    if (!currentChatId) {
        alert("Please start a new chat first!");
        return;
    }

    addMessage("user", userMessage);
    userMessageInput.value = "";
    loadingIndicator.style.display = "flex";

    try {
        const response = await fetch("/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: currentChatId,
                user_message: userMessage,
                api_key: apiKeyInput.value.trim(),
                model_name: modelNameInput.value.trim() || "deepseek-reasoner"
            })
        });

        loadingIndicator.style.display = "none";

        const data = await response.json();
        if (data.error) {
            console.error("Server error:", data.error);
            return;
        }

        activeChats.set(currentChatId, data.conversation);
        updateChatDropdown();
        renderConversation(data.conversation);
    } catch (error) {
        loadingIndicator.style.display = "none";
        console.error("Error sending message:", error);
    }
}

function formatCode(content) {
    if (!content) return "";

    // Handle thought process first
    if (content.includes("<antThinking>")) {
        const thoughtMatch = content.match(/<antThinking>([\s\S]*?)<\/antThinking>/);
        if (thoughtMatch) {
            const thought = thoughtMatch[1].trim();
            const restContent = content.replace(/<antThinking>[\s\S]*?<\/antThinking>/, '').trim();

            return `
                <div class="thought-toggle">
                    <button class="show-thought" onclick="toggleThought(this)">Show Thought Process</button>
                    <div class="thought-content">${thought}</div>
                </div>
                ${formatMessageContent(restContent)}
            `;
        }
    }

    return formatMessageContent(content);
}

function formatMessageContent(content) {
    if (content.includes("```")) {
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map(part => {
            if (part.startsWith("```")) {
                const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
                if (match) {
                    const [_, lang, code] = match;
                    return `
                        <div class="code-block">
                            <pre><code class="${lang || ''}">${code.trim()}</code></pre>
                            <button class="copy-button" onclick="navigator.clipboard.writeText(\`${code.trim()}\`)">
                                Copy
                            </button>
                        </div>`;
                }
            }
            return `<p>${part}</p>`;
        }).join("");
    }
    return `<p>${content}</p>`;
}

function toggleThought(button) {
    const content = button.nextElementSibling;
    const isHidden = content.style.display === "none" || content.style.display === "";
    content.style.display = isHidden ? "block" : "none";
    button.textContent = isHidden ? "Hide Thought Process" : "Show Thought Process";
}

function renderConversation(conversation) {
    chatContainer.innerHTML = "";
    conversation?.forEach(msg => {
        addMessage(msg.role, msg.content);
    });
}

function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", role);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.innerHTML = formatCode(content);

    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    messageDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
}