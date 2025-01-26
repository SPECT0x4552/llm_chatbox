import React, { useState } from 'react'

type Message = {
  role: string
  content: string
}

type ChatResponse = {
  messages: Message[]
  reasoning_content: string | null
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [chatId, setChatId] = useState<string | null>(null)
  const [modelName, setModelName] = useState('gpt-3.5-turbo')
  const [userMessage, setUserMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  // Create a new chat on the Rust backend
  const handleCreateChat = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your DeepSeek API key')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('http://localhost:3000/api/v1/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })

      if (!response.ok) {
        throw new Error('Failed to create chat')
      }

      const data = await response.json()
      setChatId(data.id)
      // A new chat typically starts empty
      setMessages(data.messages ?? [])
    } catch (error) {
      console.error('Error creating chat:', error)
      alert('Error creating chat. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  // Send a user message
  const handleSendMessage = async () => {
    if (!chatId) {
      alert('Please create a chat first')
      return
    }

    if (!userMessage.trim()) return

    try {
      setLoading(true)
      const response = await fetch(`http://localhost:3000/api/v1/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          api_key: apiKey,
          model_name: modelName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data: ChatResponse = await response.json()
      setMessages(data.messages)
      setUserMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-8">DeepSeek Chat</h1>

        <div className="bg-white rounded shadow p-6">
          {/* API Key + Create Chat row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DeepSeek API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="border border-gray-300 rounded w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your DeepSeek API key"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateChat}
                className="bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Chat'}
              </button>
            </div>
          </div>

          {/* Chat Info */}
          {chatId && (
            <div className="mb-4">
              <p className="text-gray-600">
                <span className="font-semibold">Chat ID:</span> {chatId}
              </p>
            </div>
          )}

          {/* Model + Message Input */}
          {chatId && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="border border-gray-300 rounded w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. gpt-3.5-turbo"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Message
                </label>
                <textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="border border-gray-300 rounded w-full px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your message..."
                />
              </div>

              <button
                onClick={handleSendMessage}
                className="bg-green-600 text-white font-semibold py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </>
          )}

          {/* Conversation */}
          {chatId && (
            <div className="mt-6 border-t pt-4">
              <h2 className="text-xl font-bold mb-3">Conversation</h2>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {messages.map((msg, index) => (
                  <div key={index} className="p-3 rounded bg-gray-50">
                    <span
                      className={`inline-block font-semibold mr-2 ${msg.role === 'assistant' ? 'text-blue-700' : 'text-gray-800'
                        }`}
                    >
                      {msg.role === 'assistant' ? 'Assistant' : 'User'}:
                    </span>
                    <span className="text-gray-800">{msg.content}</span>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-gray-500">No messages yet. Say something!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
