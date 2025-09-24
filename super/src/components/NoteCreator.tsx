"use client"

import { useState } from "react"
import { useAuth } from '@clerk/clerk-react'

interface NoteCreatorProps {
  onNoteCreated?: () => void
}

export default function NoteCreator({ onNoteCreated }: NoteCreatorProps) {
  const [text, setText] = useState("")
  const [tags, setTags] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const { getToken } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setIsLoading(true)
    setMessage("")

    try {
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text.trim(),
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create note')
      }

      const data = await response.json()
      setMessage(`Note created successfully!`)
      setText("")
      setTags("")
      
      // Call the callback to refresh the notes list
      onNoteCreated?.()
      
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error creating note. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Note</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Note Content
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your note content here..."
            className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="tags" className="block text-sm font-medium  text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="work, important, meeting"
            className="w-full px-3 py-2 border border-gray-300 text-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Note'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded-md ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
