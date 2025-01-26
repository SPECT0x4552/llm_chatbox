import React, { useState, FormEvent } from 'react'

// Example message structure
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
  // State
  const [chatList, setChatList] = useState<string[]>([]) // If you want multiple chats
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gpt-3.5-turbo')
  const [messages, setMessages] = useState<Message[]>([])
  const [userMessage, setUserMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Creates a new chat on the backend
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
      const chat = await res.json() // e.g. { id: "...", messages: [] }
      const newChatId = chat.id

      setSelectedChat(newChatId)
      setMessages(chat.messages || [])

      // If you maintain a list of chats, push it
      setChatList(prev => [...prev, newChatId])
    } catch (err) {
      console.error('Error creating chat:', err)
      alert('Error creating chat. Check console.')
    } finally {
      setLoading(false)
    }
  }

  // Sends a message
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
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Error sending message. Check console.')
    } finally {
      setLoading(false)
    }
  }

  // Optional: a toggle in each message to show/hide "reasoning" content
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  function toggleReasoning(idx: number) {
    setExpandedIdx(expandedIdx === idx ? null : idx)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {/* TOP NAV */}
      <header className="flex items-center px-4 py-2 bg-gray-800 shadow">
        <div className="text-2xl font-bold">DeepSeek R3</div>
        {/* Chat selector dropdown (if you have multiple chats) */}
        <div className="ml-6">
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
        </div>

        {/* Possibly: a label to show the date/time for the selected chat if you store it */}
        {/* <div className="ml-4 text-sm opacity-75">(1/26/2025, 4:49:34 PM)</div> */}

        <button
          onClick={handleNewChat}
          disabled={loading}
          className="ml-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
        >
          {loading ? 'Creating...' : 'New Chat'}
        </button>
      </header>

      {/* SECOND ROW: API key, model */}
      <div className="flex items-center p-3 bg-gray-800 space-x-2">
        <input
          className="bg-gray-700 text-sm border border-gray-600 rounded px-2 py-1 w-60 focus:outline-none"
          placeholder="API Key: sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <input
          className="bg-gray-700 text-sm border border-gray-600 rounded px-2 py-1 w-44 focus:outline-none"
          placeholder="model name"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
        />
      </div>

      {/* MAIN CONTENT: conversation */}
      <main className="flex-1 overflow-y-auto p-4">
        {!selectedChat ? (
          <div className="text-center text-gray-400 mt-10">
            <h2 className="text-xl mb-2">No Chat Selected</h2>
            <p>Enter your API key and click "New Chat" to begin.</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-md ${msg.role === 'assistant' ? 'bg-gray-800' : 'bg-gray-700'
                  }`}
              >
                {/* The heading: role + maybe a timestamp */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-blue-400 font-semibold">
                    {msg.role === 'assistant' ? 'Assistant' : 'User'}
                  </span>
                  {/* If reasoning is present, show toggles */}
                  {msg.reasoning && (
                    <button
                      onClick={() => toggleReasoning(idx)}
                      className="text-sm text-gray-300 hover:underline"
                    >
                      {expandedIdx === idx ? 'Hide Reasoning' : 'Show Reasoning'}
                    </button>
                  )}
                </div>

                {/* The main message content */}
                <div className="text-gray-200 whitespace-pre-wrap break-words">
                  {msg.content}
                </div>

                {/* Optional expanded "reasoning" content */}
                {msg.reasoning && expandedIdx === idx && (
                  <div className="mt-2 p-2 bg-gray-600 rounded">
                    <h4 className="text-gray-100 font-medium mb-1">Reasoning:</h4>
                    <div className="text-gray-100 text-sm whitespace-pre-wrap break-words">
                      {msg.reasoning}
                    </div>
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
        <footer className="bg-gray-800 p-3">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex space-x-2">
            <textarea
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 resize-none h-12 focus:outline-none"
              placeholder="Type your message here..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                // send on Enter if not Shift
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
