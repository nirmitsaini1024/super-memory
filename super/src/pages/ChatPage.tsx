"use client"

import ChatArea from "../components/chat"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chat with SuperMemory</h1>
          <p className="mt-2 text-gray-600">
            Ask questions about your notes and get AI-powered answers
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <ChatArea />
        </div>
      </div>
    </div>
  )
}
