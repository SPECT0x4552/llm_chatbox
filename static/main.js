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
hljs.configure({
    ignoreUnescapedHTML: true
});
hljs.highlightAll();

// Enhanced storage functions
function saveChatsToStorage() {
    const maxStorageAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const currentTime = new Date().getTime();

    const chatsData = {};
    activeChats.forEach((chat, chatId) => {
        if (chat.timestamp && (currentTime - chat.timestamp) < maxStorageAge) {
            chatsData[chatId] = {
                messages: chat.messages,
                timestamp: chat.timestamp,
                apiKey: chat.apiKey,
                modelName: chat.modelName
            };
        }
    });

    try {
        localStorage.setItem('deepseek_chats', JSON.stringify(chatsData));
    } catch (e) {
        console.warn('Failed to save chats to storage:', e);
        if (e.name === 'QuotaExceededError') {
            cleanupOldChats();
            saveChatsToStorage();
        }
    }
}

function loadChatsFromStorage() {
    try {
        const savedChats = localStorage.getItem('deepseek_chats');
        if (savedChats) {
            const chatsData = JSON.parse(savedChats);
            Object.entries(chatsData).forEach(([chatId, chat]) => {
                activeChats.set(chatId, {
                    messages: chat.messages,
                    timestamp: chat.timestamp || new Date().getTime(),
                    apiKey: chat.apiKey,
                    modelName: chat.modelName
                });
            });
            updateChatDropdown();
        }
    } catch (e) {
        console.error('Failed to load chats from storage:', e);
    }
}

function cleanupOldChats() {
    const maxChats = 50;
    if (activeChats.size > maxChats) {
        const sortedChats = Array.from(activeChats.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, maxChats);

        activeChats.clear();
        sortedChats.forEach(([id, chat]) => {
            activeChats.set(id, chat);
        });
    }
}

// Chat dropdown management
chatDropdown.addEventListener("change", (e) => {
    if (e.target.value) {
        currentChatId = e.target.value;
        const chat = activeChats.get(currentChatId);
        renderConversation(chat.messages);

        // Restore API key and model name if available
        if (chat.apiKey) apiKeyInput.value = chat.apiKey;
        if (chat.modelName) modelNameInput.value = chat.modelName;
    }
});

function updateChatDropdown() {
    const currentSelection = chatDropdown.value;
    chatDropdown.innerHTML = "<option value=''>Select Chat</option>";

    activeChats.forEach((chat, chatId) => {
        const option = document.createElement("option");
        option.value = chatId;
        const firstUserMsg = chat.messages.find(m => m.role === "user")?.content;
        const timestamp = new Date(chat.timestamp).toLocaleDateString();
        option.textContent = firstUserMsg ?
            `${timestamp} - ${firstUserMsg.slice(0, 30)}...` :
            `${timestamp} - New Chat`;
        chatDropdown.appendChild(option);
    });

    if (currentSelection && chatDropdown.querySelector(`option[value="${currentSelection}"]`)) {
        chatDropdown.value = currentSelection;
    }
}

// Message handling functions
function formatCode(content) {
    if (!content) return "";

    // Handle thought process
    if (content.includes("<antThinking>")) {
        const thoughtMatch = content.match(/<antThinking>([\s\S]*?)<\/antThinking>/);
        if (thoughtMatch) {
            const thought = thoughtMatch[1].trim();
            const restContent = content.replace(/<antThinking>[\s\S]*?<\/antThinking>/, '').trim();

            return `
                <div class="thought-container">
                    <button class="thought-toggle" aria-expanded="false">
                        <svg class="thought-icon" viewBox="0 0 20 20" width="16" height="16">
                            <path d="M10 12l-6-6h12l-6 6z" fill="currentColor"/>
                        </svg>
                        View Reasoning Process
                    </button>
                    <div class="thought-content">
                        ${formatThought(thought)}
                    </div>
                </div>
                ${formatMessageContent(restContent)}
            `;
        }
    }

    return formatMessageContent(content);
}

function formatThought(thought) {
    // Split thought into sentences and format as paragraphs
    return thought.split(/(?<=[.!?])\s+/)
        .filter(sentence => sentence.trim().length > 0)
        .map(sentence => `<p>${sentence.trim()}</p>`)
        .join('');
}

function formatMessageContent(content) {
    if (!content.includes("```")) {
        return `<p>${content}</p>`;
    }

    const segments = content.split(/(```[\s\S]*?```)/g);
    let formattedContent = '';

    segments.forEach(segment => {
        if (segment.startsWith('```')) {
            const match = segment.match(/```(\w+)?\n([\s\S]*?)```/);
            if (match) {
                const [_, lang, code] = match;
                const formattedCode = code.trim()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                formattedContent += `
                    <div class="code-block">
                        <div class="code-header">
                            ${lang ? `<span class="code-language">${lang}</span>` : ''}
                            <button class="copy-button" onclick="copyCode(this)">Copy Code</button>
                        </div>
                        <pre><code class="language-${lang || 'plaintext'}">${formattedCode}</code></pre>
                    </div>`;
            }
        } else if (segment.trim()) {
            formattedContent += `<p>${segment.trim()}</p>`;
        }
    });

    return formattedContent;
}

function copyCode(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const code = codeBlock.innerText;

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.innerText;
        button.innerText = 'Copied!';
        button.disabled = true;

        setTimeout(() => {
            button.innerText = originalText;
            button.disabled = false;
        }, 2000);
    });
}

function setupThoughtToggles() {
    document.querySelectorAll('.thought-toggle').forEach(button => {
        if (!button.hasListener) {
            button.addEventListener('click', () => {
                const content = button.nextElementSibling;
                const isExpanded = button.getAttribute('aria-expanded') === 'true';

                button.setAttribute('aria-expanded', !isExpanded);
                content.classList.toggle('visible');

                const icon = button.querySelector('.thought-icon');
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            });
            button.hasListener = true;
        }
    });
}

// Message sending and rendering
async function sendMessage() {
    const userMessage = userMessageInput.value.trim();
    if (!userMessage) return;

    if (!apiKeyInput.value.trim()) {
        alert("Please enter your DeepSeek API Key");
        return;
    }

    if (!currentChatId || !activeChats.has(currentChatId)) {
        try {
            const response = await fetch("/new-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: apiKeyInput.value.trim()
                })
            });
            const data = await response.json();
            currentChatId = data.chat_id;
            activeChats.set(currentChatId, {
                messages: [],
                timestamp: new Date().getTime(),
                apiKey: apiKeyInput.value.trim(),
                modelName: modelNameInput.value.trim()
            });
            updateChatDropdown();
            chatDropdown.value = currentChatId;
        } catch (error) {
            console.error("Error creating new chat:", error);
            alert("Failed to create new chat. Please try again.");
            return;
        }
    }

    // Add user message to UI and storage
    addMessage("user", userMessage);
    const chat = activeChats.get(currentChatId);
    chat.messages.push({ role: "user", content: userMessage });
    chat.timestamp = new Date().getTime();

    userMessageInput.value = "";
    userMessageInput.style.height = '40px';
    loadingIndicator.style.display = "flex";
    saveChatsToStorage();

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
            addMessage("assistant", `Error: ${data.error}`);
            return;
        }

        // Update chat with new messages
        chat.messages = data.conversation;
        chat.timestamp = new Date().getTime();
        saveChatsToStorage();
        renderConversation(chat.messages);
    } catch (error) {
        loadingIndicator.style.display = "none";
        console.error("Error sending message:", error);
        addMessage("assistant", "Error: Failed to send message. Please try again.");
    }
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

    // Highlight code blocks
    messageDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });

    // Setup thought toggles
    setupThoughtToggles();
}

function renderConversation(messages) {
    chatContainer.innerHTML = "";
    messages?.forEach(msg => {
        addMessage(msg.role, msg.content);
    });
}

// Event listeners
newChatBtn.addEventListener("click", async () => {
    if (!apiKeyInput.value.trim()) {
        alert("Please enter your DeepSeek API Key");
        return;
    }

    try {
        const response = await fetch("/new-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: apiKeyInput.value.trim()
            })
        });
        const data = await response.json();
        currentChatId = data.chat_id;
        activeChats.set(currentChatId, {
            messages: [],
            timestamp: new Date().getTime(),
            apiKey: apiKeyInput.value.trim(),
            modelName: modelNameInput.value.trim()
        });
        updateChatDropdown();
        chatDropdown.value = currentChatId;
        chatContainer.innerHTML = "";
        saveChatsToStorage();
    } catch (error) {
        console.error("Error creating new chat:", error);
        alert("Failed to create new chat. Please try again.");
    }
});

sendBtn.addEventListener("click", sendMessage);

userMessageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userMessageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadChatsFromStorage();

    // Clean up old chats periodically
    setInterval(() => {
        cleanupOldChats();
        saveChatsToStorage();
    }, 60 * 60 * 1000); // Every hour
});