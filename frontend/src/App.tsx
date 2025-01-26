import React, { useState, useEffect, useRef, FormEvent } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { ChevronDown } from 'lucide-react';
import AutoResizingTextarea from './components/AutoResizingInput';


// Syntax highlighting imports
import 'prismjs/components/prism-c';
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

const ChatDropdown = ({
  selectedChat,
  chatList,
  chats,
  onSelect
}: {
  selectedChat: string | null;
  chatList: string[];
  chats: { [id: string]: StoredChat };
  onSelect: (chatId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getChatName = (chatId: string) => {
    const chat = chats[chatId];
    if (!chat?.messages.length) return 'New Chat';
    const firstMessage = chat.messages[0].content;
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-lg font-semibold hover:opacity-80"
      >
        <span className="truncate max-w-[200px]">
          {selectedChat ? getChatName(selectedChat) : 'Select Chat'}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          {chatList.map((chatId) => (
            <button
              key={chatId}
              onClick={() => {
                onSelect(chatId);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${selectedChat === chatId ? 'bg-gray-700' : ''
                }`}
            >
              {getChatName(chatId)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [chatList, setChatList] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('deepseek-reasoner');
  const [chats, setChats] = useState<{ [id: string]: StoredChat }>({});
  const [userMessage, setUserMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          setModelName(state.modelName || 'deepseek-reasoner');
        }
      } catch (error) {
        console.error('Failed to load state:', error);
        setError('Failed to load saved chats');
      }
    };
    loadState();
  }, []);

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

  useEffect(() => {
    if (!isSending) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      Prism.highlightAll();
    }
  }, [chats[selectedChat || '']?.messages, isSending]);

  const handleNewChat = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key first.');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const res = await fetch('http://localhost:3000/api/v1/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const chatData = await res.json();
      const newChatId = chatData.id;

      setChatList(prev => [...prev, newChatId]);
      setChats(prev => ({
        ...prev,
        [newChatId]: {
          messages: [],
          created: Date.now(),
          model: modelName
        }
      }));
      setSelectedChat(newChatId);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to create new chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !userMessage.trim() || isSending) return;

    const messageToSend = userMessage;
    setUserMessage('');

    try {
      setIsSending(true);
      setError(null);

      setChats(prev => ({
        ...prev,
        [selectedChat]: {
          ...prev[selectedChat],
          messages: [
            ...prev[selectedChat].messages,
            { role: 'user', content: messageToSend },
            { role: 'assistant', content: '...', temp: true }
          ]
        }
      }));

      const res = await fetch(`http://localhost:3000/api/v1/chats/${selectedChat}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: messageToSend,
          api_key: apiKey,
          model_name: modelName,
        }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data: ChatResponse = await res.json();
      setChats(prev => ({
        ...prev,
        [selectedChat]: {
          ...prev[selectedChat],
          messages: data.messages
        }
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
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
      if (index % 2 === 0) {
        return part.replace(/`([^`]+)`/g, '<code class="inline-code bg-gray-700 px-1 rounded">$1</code>');
      }

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
        <pre class="w-full overflow-x-auto" style="max-width: 100%;">
          <code class="language-${selectedLang} block min-w-full">${Prism.highlight(
        code.join('\n'),
        validLanguages[selectedLang as keyof typeof validLanguages] || Prism.languages.javascript,
        selectedLang
      )
        }</code>
        </pre>
      `;
    }).join('');
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-gray-100 flex">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-2">
        <header className="py-3 border-b border-gray-700 sticky top-0 bg-gray-900/95 backdrop-blur z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <ChatDropdown
                selectedChat={selectedChat}
                chatList={chatList}
                chats={chats}
                onSelect={setSelectedChat}
              />
              <button
                onClick={handleNewChat}
                disabled={isCreating}
                className="bg-blue-600 px-3 py-1.5 rounded text-sm disabled:opacity-50 
                         transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {isCreating ? 'Creating...' : 'New Chat'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 px-3 py-1.5 rounded text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="API Key: sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
              <input
                className="w-32 bg-gray-800 px-3 py-1.5 rounded text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto py-6">
          <div className="space-y-8 max-w-[95%] lg:max-w-5xl mx-auto"> {/* Increased max width */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            {selectedChat && chats[selectedChat]?.messages?.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`w-full lg:w-[85%] rounded-xl ${msg.role === 'user'
                    ? 'bg-blue-600/90 text-white'
                    : 'bg-gray-800/80'
                    }`}
                >
                  <div className="px-6 py-2 border-b border-gray-700/50">
                    <span className="text-sm font-medium opacity-90">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                  </div>

                  <div className="p-6"> {/* Increased padding */}
                    <div
                      className="prose prose-invert max-w-none
                         prose-pre:bg-gray-900/50 
                         prose-pre:border 
                         prose-pre:border-gray-700
                         prose-pre:rounded-lg 
                         prose-code:bg-gray-800 
                         prose-code:px-1 
                         prose-code:py-0.5 
                         prose-code:rounded
                         prose-headings:text-gray-100 
                         prose-a:text-blue-400
                         prose-p:text-base 
                         prose-p:leading-relaxed
                         prose-pre:my-4"
                      style={{
                        width: '100%',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: formatContent(msg.content)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="w-full lg:w-[85%] bg-gray-800/80 rounded-xl p-6">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        {selectedChat && (
          <footer className="sticky bottom-0 bg-gray-900 pt-2 pb-3">
            <form
              onSubmit={handleSend}
              className="bg-gray-800/50 backdrop-blur-lg rounded-lg p-3 shadow-lg"
            >
              <div className="flex gap-3 items-end">
                <AutoResizingTextarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  disabled={isSending}
                  placeholder="Type your message..."
                />
                <button
                  type="submit"
                  disabled={isSending || !userMessage.trim()}
                  className="bg-blue-600 px-5 py-3 rounded-lg text-sm disabled:opacity-50 
                   transition-colors flex items-center gap-2 self-end h-12"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </form>
          </footer>
        )}

        {!selectedChat && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 p-6 rounded-lg bg-gray-800/50">
              <p>Create a new chat to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}