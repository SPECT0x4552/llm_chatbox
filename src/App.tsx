import { useState } from 'react'

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [chatId, setChatId] = useState(null)
  const [modelName, setModelName] = useState('gpt-3.5-turbo')
  const [userMessage, setUserMessage] = useState('')
  const [messages, setMessages] = useState([])

  // Create a new chat with the given apiKey
  async function handleCreateChat() {
    try {
      const res = await fetch('http://localhost:3000/api/v1/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })
      if (!res.ok) {
        throw new Error('Failed to create chat')
      }
      const chat = await res.json()
      setChatId(chat.id)
      setMessages(chat.messages)
    } catch (err) {
      console.error('Error creating chat:', err)
      alert('Error creating chat - see console for details')
    }
  }

  // Send a user message to the chat
  async function handleSendMessage() {
    if (!chatId) {
      alert('No chatId yet. Create a chat first.')
      return
    }
    if (!userMessage.trim()) return

    try {
      const res = await fetch(`http://localhost:3000/api/v1/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          api_key: apiKey,
          model_name: modelName,
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to send message')
      }
      const data = await res.json()
      setMessages(data.messages)
      setUserMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Error sending message - see console for details')
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">DeepSeek Chat</h1>

      <div className="mb-4">
        <label className="block font-semibold mb-1">DeepSeek API Key:</label>
        <input
          className="border p-2 w-full"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      {!chatId && (
        <button
          onClick={handleCreateChat}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create Chat
        </button>
      )}

      {chatId && (
        <>
          <div className="mb-2 text-gray-700">
            <strong>Chat ID:</strong> {chatId}
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">Model Name:</label>
            <input
              className="border p-2 w-full"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">Your Message:</label>
            <input
              className="border p-2 w-full"
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage()
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            className="bg-green-500 text-white px-4 py-2 rounded mb-4"
          >
            Send Message
          </button>

          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-lg font-bold mb-3">Conversation</h2>
            {messages.map((msg, idx) => (
              <div key={idx} className="mb-2">
                <span className="font-semibold mr-2">{msg.role}:</span>
                <span>{msg.content}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
