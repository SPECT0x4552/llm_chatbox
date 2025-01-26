import React, { useState, useEffect, useRef, FormEvent } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Import required syntax highlighting languages
import 'prismjs/components/prism-c'; // Must come before cpp
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-nasm';

interface Message {
  role: string;
  content: string;
  reasoning?: string;
  temp?: boolean;
}

interface ChatResponse {
  messages: Message[];
  reasoning_content: string | null;
}

interface StoredChat {
  messages: Message[];
  created: number;
  model: string;
}

export default function App() {
  const [chatList, setChatList] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('deepseek-reasoner');
  const [chats, setChats] = useState<{ [id: string]: StoredChat }>({});
  const [userMessage, setUserMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted data
  useEffect(() => {
    const loadState = () => {
      try {
        const savedState = localStorage.getItem('chatState');
        if (savedState) {
          const state = JSON.parse(savedState);
          setChatList(state.chatList || []);
          setChats(state.chats || {});
          setSelectedChat(state.selectedChat);
          setApiKey(state.apiKey || '');
          setModelName(state.modelName || 'gpt-3.5-turbo');
        }
      } catch (error) {
        console.error('Failed to load state:', error);
      }
    };
    loadState();
  }, []);

  // Persist all state changes
  useEffect(() => {
    const stateToSave = {
      chatList,
      chats,
      selectedChat,
      apiKey,
      modelName
    };
    localStorage.setItem('chatState', JSON.stringify(stateToSave));
  }, [chatList, chats, selectedChat, apiKey, modelName]);

  // Scroll handling and syntax highlighting
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    Prism.highlightAll();
  }, [chats[selectedChat || '']?.messages, isSending]);

  const handleNewChat = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your API key first.');
      return;
    }

    try {
      setIsCreating(true);
      const res = await fetch('http://localhost:3000/api/v1/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const chatData = await res.json();
      const newChatId = chatData.id;
      const timestamp = Date.now();

      setChatList(prev => [...prev, newChatId]);
      setChats(prev => ({
        ...prev,
        [newChatId]: {
          messages: chatData.messages || [],
          created: timestamp,
          model: modelName
        }
      }));
      setSelectedChat(newChatId);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Error creating chat. Check console.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !userMessage.trim()) return;

    const tempId = Date.now().toString();

    try {
      setIsSending(true);

      // Optimistic update
      setChats(prev => ({
        ...prev,
        [selectedChat]: {
          ...prev[selectedChat],
          messages: [
            ...prev[selectedChat].messages,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: '...', temp: true }
          ]
        }
      }));

      const res = await fetch(`http://localhost:3000/api/v1/chats/${selectedChat}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          api_key: apiKey,
          model_name: modelName,
        }),
      });

      const data: ChatResponse = await res.json();
      setChats(prev => ({
        ...prev,
        [selectedChat]: {
          ...prev[selectedChat],
          messages: data.messages
        }
      }));
      setUserMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Rollback optimistic update
      setChats(prev => ({
        ...prev,
        [selectedChat]: {
          ...prev[selectedChat],
          messages: prev[selectedChat].messages.filter(m => !m.temp)
        }
      }));
    } finally {
      setIsSending(false);
    }
  };

  const formatContent = (content: string) => {
    return content.split('```').map((part, index) => {
      if (index % 2 === 0) return part;

      const [lang, ...code] = part.split('\n');
      const language = lang.trim().toLowerCase();
      const validLanguages = {
        python: Prism.languages.python,
        cpp: Prism.languages.cpp,
        c: Prism.languages.c,
        rust: Prism.languages.rust,
        javascript: Prism.languages.javascript,
        nasm: Prism.languages.nasm,
        asm: Prism.languages.nasm,
        assembly: Prism.languages.nasm
      };

      const selectedLang = validLanguages[language as keyof typeof validLanguages]
        ? language
        : 'javascript';

      return `
        <pre class="language-${selectedLang}">
          <code>
            ${Prism.highlight(
        code.join('\n'),
        validLanguages[selectedLang as keyof typeof validLanguages] || Prism.languages.javascript,
        selectedLang
      )}
          </code>
        </pre>
      `;
    }).join('\n');
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-gray-100 flex flex-col">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
        {/* Header */}
        <header className="py-6 border-b border-gray-700 sticky top-0 bg-gray-900/95 backdrop-blur z-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DeepSeek Chat
              </h1>

              <button
                onClick={handleNewChat}
                disabled={isCreating}
                className="ml-auto bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm disabled:opacity-50 
                         transition-all duration-200 flex items-center gap-2 hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {isCreating ? 'Creating...' : 'New Chat'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <input
                className="w-full bg-gray-800 px-4 py-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="API Key: sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <input
                className="w-full sm:w-48 bg-gray-800 px-4 py-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto py-6 space-y-6">
          {selectedChat && chats[selectedChat]?.messages?.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-xl p-4 transition-all duration-200 ${msg.role === 'user'
                ? 'bg-blue-600/90 text-white'
                : 'bg-gray-800/80'
                }`}>
                <div className="mb-2 text-sm font-medium">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div
                  className="whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                />
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-gray-800/80 rounded-xl p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Area */}
        {selectedChat && (
          <footer className="sticky bottom-0 bg-gray-900 pt-6 pb-8">
            <form
              onSubmit={handleSend}
              className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 shadow-xl transition-all duration-200 hover:bg-gray-800/60"
            >
              <div className="flex gap-4 items-end">
                <textarea
                  className="flex-1 bg-gray-700/50 rounded-lg p-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Type your message..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  rows={Math.min(4, userMessage.split('\n').length)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-blue-600 hover:bg-blue-500 px-6 py-4 rounded-lg text-sm disabled:opacity-50 h-fit transition-colors"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </footer>
        )}

        {!selectedChat && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 p-8 rounded-xl bg-gray-800/50">
              <p className="text-lg">Create a new chat to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}