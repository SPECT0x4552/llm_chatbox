import React, { useState, FormEvent } from 'react'

// Example message shape
interface Message {
  role: string
  content: string
  reasoning?: string
}

interface ChatResponse {
  messages: Message[]
  reasoning_content: string | null
}

export default function App() {
  const [chatList, setChatList] = useState<string[]>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gpt-3.5-turbo')
  const [messages, setMessages] = useState<Message[]>([])
  const [userMessage, setUserMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Create a new chat on the backend
  async function handleNewChat() {
    if (!apiKey.trim()) {
      alert('Please enter your DeepSeek API key first.')
      return
    }
    try {
      setLoading(true)
      const res = await fetch('http://localhost:3000/api/v1/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })
      if (!res.ok) {
        throw new Error('Failed to create chat')
      }
      const chatData = await res.json()
      const newChatId = chatData.id

      setSelectedChat(newChatId)
      setMessages(chatData.messages || [])
      setChatList((prev) => [...prev, newChatId])
    } catch (error) {
      console.error('Error creating chat:', error)
      alert('Error creating chat. Check the console.')
    } finally {
      setLoading(false)
    }
  }

  // Send a message
  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!selectedChat) {
      alert('No chat selected. Please create a chat first.')
      return
    }
    if (!userMessage.trim()) return

    try {
      setLoading(true)
      const res = await fetch(`http://localhost:3000/api/v1/chats/${selectedChat}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          api_key: apiKey,
          model_name: modelName,
        }),
      })
      if (!res.ok) {
        throw new Error(`Send failed with status ${res.status}`)
      }
      const data: ChatResponse = await res.json()
      setMessages(data.messages)
      setUserMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message. Check the console.')
    } finally {
      setLoading(false)
    }
  }

  // Optional: toggles for "reasoning" in each message
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  function toggleReasoning(index: number) {
    setExpandedIdx(expandedIdx === index ? null : index)
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-900 text-gray-100">
      {/* HEADER ROW #1 */}
      <header className="flex items-center px-4 py-2 bg-gray-800 shadow flex-none">
        <div className="text-xl font-bold mr-4">DeepSeek R3</div>

        {/* Chat selector (if multiple chats) */}
        <select
          className="bg-gray-700 px-3 py-1 text-sm rounded focus:outline-none"
          value={selectedChat || ''}
          onChange={(e) => setSelectedChat(e.target.value)}
        >
          {selectedChat === null && <option value="">No chat selected</option>}
          {chatList.map((chatId) => (
            <option key={chatId} value={chatId}>
              {chatId}
            </option>
          ))}
        </select>

        {/* New Chat button */}
        <button
          onClick={handleNewChat}
          disabled={loading}
          className="ml-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
        >
          {loading ? 'Creating...' : 'New Chat'}
        </button>
      </header>

      {/* HEADER ROW #2 */}
      <div className="flex items-center p-3 bg-gray-800 flex-none space-x-2">
        <input
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-64 focus:outline-none"
          placeholder="API Key: sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <input
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-44 focus:outline-none"
          placeholder="Model (e.g. gpt-3.5-turbo)"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
        />
      </div>

      {/* MAIN: conversation */}
      <main className="flex-1 overflow-y-auto p-4">
        {!selectedChat ? (
          <div className="text-center text-gray-400 mt-10">
            <h2 className="text-xl mb-2">No Chat Selected</h2>
            <p>Enter your API key and click "New Chat" to begin.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded ${msg.role === 'assistant' ? 'bg-gray-800' : 'bg-gray-700'
                  }`}
              >
                {/* Role + optional reasoning toggle */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-blue-400 font-semibold">
                    {msg.role === 'assistant' ? 'Assistant' : 'User'}
                  </span>
                  {msg.reasoning && (
                    <button
                      onClick={() => toggleReasoning(idx)}
                      className="text-sm text-gray-300 hover:underline"
                    >
                      {expandedIdx === idx ? 'Hide Reasoning' : 'Show Reasoning'}
                    </button>
                  )}
                </div>

                <div className="whitespace-pre-wrap break-words">
                  {msg.content}
                </div>

                {msg.reasoning && expandedIdx === idx && (
                  <div className="mt-2 p-2 bg-gray-600 rounded">
                    <h4 className="font-medium mb-1">Reasoning:</h4>
                    <div className="text-sm whitespace-pre-wrap break-words">{msg.reasoning}</div>
                  </div>
                )}
              </div>
            ))}

            {messages.length === 0 && (
              <p className="text-gray-500">No messages yet. Say something!</p>
            )}
          </div>
        )}
      </main>

      {/* FOOTER: send user message */}
      {selectedChat && (
        <footer className="bg-gray-800 p-3 flex-none">
          <form onSubmit={handleSend} className="flex space-x-2 w-full">
            <textarea
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 resize-none focus:outline-none h-12"
              placeholder="Type your message..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                // Press Enter to send (unless Shift is held)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </footer>
      )}
    </div>
  )
}
