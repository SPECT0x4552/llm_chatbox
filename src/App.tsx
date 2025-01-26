import React, { useState, useEffect, FormEvent } from 'react'

interface Message {
  role: string
  content: string
}

interface ChatResponse {
  messages: Message[]
  reasoning_content: string | null
}

export default function App() {
  // State
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gpt-3.5-turbo')
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [userMessage, setUserMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Create new chat
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
        body: JSON.stringify({ api_key: apiKey })
      })
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`)
      }
      const chat = await res.json()
      setChatId(chat.id)
      setMessages(chat.messages || [])
    } catch (err) {
      console.error('Error creating chat:', err)
      alert('Failed to create chat. Check console.')
    } finally {
      setLoading(false)
    }
  }

  // Send a new message
  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!chatId) {
      alert('No chatId yet. Please create a new chat first.')
      return
    }
    if (!userMessage.trim()) return

    try {
      setLoading(true)
      const res = await fetch(`http://localhost:3000/api/v1/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          api_key: apiKey,
          model_name: modelName
        })
      })
      if (!res.ok) {
        throw new Error(`Send failed. HTTP status ${res.status}`)
      }
      const data: ChatResponse = await res.json()
      setMessages(data.messages)
      setUserMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      {/* TOP BAR */}
      <header className="bg-gray-800 p-4 flex items-center space-x-4">
        {/* API Key Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">API Key:</label>
          <input
            className="bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 w-48 focus:outline-none"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        {/* Model Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">Model:</label>
          <input
            className="bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 w-36 focus:outline-none"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
          />
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          disabled={loading}
          className="ml-auto bg-gray-700 hover:bg-gray-600 text-sm px-4 py-2 rounded text-white"
        >
          {loading ? 'Creating...' : 'New Chat'}
        </button>
      </header>

      {/* MAIN: Conversation */}
      <main className="flex-1 overflow-y-auto p-4">
        {!chatId && (
          <div className="text-center text-gray-400 mt-10">
            <h2 className="text-xl">No Chat Yet</h2>
            <p className="mt-2">Enter your API key and click "New Chat" to begin.</p>
          </div>
        )}

        {chatId && (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-md ${msg.role === 'assistant' ? 'bg-gray-800' : 'bg-gray-700'
                  }`}
              >
                <div className="mb-1 font-semibold text-sm text-blue-400">
                  {msg.role === 'assistant' ? 'Assistant' : 'User'}
                </div>
                {/* If you have code blocks or want reasoning toggles, you could parse msg.content here */}
                <div className="whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-gray-500">No messages yet. Say something!</p>
            )}
          </div>
        )}
      </main>

      {/* FOOTER: input to send messages */}
      {chatId && (
        <footer className="p-4 bg-gray-800">
          <form onSubmit={handleSend} className="flex space-x-2 max-w-3xl mx-auto">
            <textarea
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 resize-none h-10 focus:outline-none"
              placeholder="Type your message..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                // Send on Enter (without shift)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </footer>
      )}
    </div>
  )
}
