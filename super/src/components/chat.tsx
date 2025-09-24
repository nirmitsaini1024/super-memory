"use client"

import { PromptInputBox } from "./ui/ai-prompt-box"
import { useState } from "react"
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

interface Source {
  chunk_id: string
  note_id: string
  text_snippet: string
  relevance_score: number
}

interface Message {
  id: string
  text: string
  timestamp: Date
  type: 'user' | 'ai'
  sources?: Source[]
}

export default function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const handleViewNote = (noteId: string) => {
    // Navigate to notes page with the specific note highlighted
    navigate('/notes', { state: { highlightNoteId: noteId } })
  }

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
      
      // Add AI response with sources
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        type: 'ai' as const,
        sources: data.sources || []
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
    <div className="flex flex-col w-full h-full bg-gray-50 dark:bg-gray-900">
      {/* Messages area */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to SuperMemory
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
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
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  
                  {/* Show clickable note references for AI messages */}
                  {message.type === 'ai' && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Referenced notes:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, index) => (
                          <button
                            key={source.chunk_id}
                            onClick={() => handleViewNote(source.note_id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            title={`View note: ${source.text_snippet}`}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Note {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <PromptInputBox onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
