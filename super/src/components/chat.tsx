"use client"

import { PromptInputBox } from "./ui/ai-prompt-box"
import { useState } from "react"
import { useAuth } from '@clerk/clerk-react'

export default function ChatArea() {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; timestamp: Date; type: 'user' | 'ai' }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const { getToken } = useAuth()

  const handleSendMessage = async (message: string, files?: File[]) => {
    console.log("Message:", message)
    console.log("Files:", files)

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: message,
      timestamp: new Date(),
      type: 'user' as const,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Get authentication token
      const token = await getToken()
      
      // Call the backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: message,
          top_k: 5
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      // Add AI response
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: data.answer || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        type: 'ai' as const,
      }
      setMessages((prev) => [...prev, aiMessage])
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date(),
        type: 'ai' as const,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col w-full h-full bg-gray-50">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to SuperMemory
              </h2>
              <p className="text-gray-600 mb-8">
                Ask me anything about your notes, or create new ones to get started!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <PromptInputBox onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
