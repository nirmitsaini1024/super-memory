"use client"

import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SignedIn>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Welcome to SuperMemory
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your personal AI-powered note-taking and memory assistant. 
              Create notes, ask questions, and get intelligent answers based on your personal knowledge.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Link
                to="/notes"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="text-blue-600 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Notes</h3>
                <p className="text-gray-600">
                  Create, organize, and manage your personal notes with tags and categories.
                </p>
              </Link>
              
              <Link
                to="/chat"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="text-green-600 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat with AI</h3>
                <p className="text-gray-600">
                  Ask questions about your notes and get intelligent answers powered by AI.
                </p>
              </Link>
            </div>
          </div>
        </SignedIn>
        
        <SignedOut>
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Welcome to SuperMemory
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your personal AI-powered note-taking and memory assistant. 
              Create notes, ask questions, and get intelligent answers based on your personal knowledge.
            </p>
            
            <div className="space-y-4">
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors">
                  Get Started
                </button>
              </SignInButton>
              
              <div className="text-sm text-gray-500">
                Sign in to start creating notes and chatting with your AI assistant
              </div>
            </div>
          </div>
        </SignedOut>
      </div>
    </div>
  )
}
