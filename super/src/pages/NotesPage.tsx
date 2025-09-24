"use client"

import { useState, useEffect } from "react"
import { useAuth } from '@clerk/clerk-react'
import NoteCreator from "../components/NoteCreator"

interface Note {
  id: string
  text: string
  metadata: {
    timestamp: string
    user_id: string
    source: string
    tags: string
    note_id: string
    chunk_index: number
    total_chunks: number
  }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [editTags, setEditTags] = useState("")
  const { getToken, userId } = useAuth()

  const fetchNotes = async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError("")
    
    try {
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }

      const data = await response.json()
      setNotes(data.notes || [])
      
    } catch (error) {
      console.error('Error fetching notes:', error)
      setError('Failed to load notes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchNotes()
    }
  }, [userId])

  const handleNoteCreated = () => {
    // Refresh the notes list when a new note is created
    fetchNotes()
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!userId) return
    
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return
    }

    try {
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      // Refresh the notes list
      fetchNotes()
      
    } catch (error) {
      console.error('Error deleting note:', error)
      setError('Failed to delete note. Please try again.')
    }
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note.metadata.note_id)
    setEditText(note.text)
    setEditTags(note.metadata.tags)
  }

  const handleSaveEdit = async (noteId: string) => {
    if (!userId) return

    try {
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: editText.trim(),
          tags: editTags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update note')
      }

      // Reset edit state and refresh notes
      setEditingNote(null)
      setEditText("")
      setEditTags("")
      fetchNotes()
      
    } catch (error) {
      console.error('Error updating note:', error)
      setError('Failed to update note. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditText("")
    setEditTags("")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
          <p className="mt-2 text-gray-600">
            Create, manage, and organize your personal notes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Note Creator */}
          <div className="lg:col-span-1">
            <NoteCreator onNoteCreated={handleNoteCreated} />
          </div>

          {/* Notes List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Notes</h2>
                <button
                  onClick={fetchNotes}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {isLoading && notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading your notes...</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
                  <p className="text-gray-600">Create your first note using the form on the left!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingNote === note.metadata.note_id ? (
                            <div className="space-y-3 mb-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                              />
                              <input
                                type="text"
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                placeholder="Tags (comma-separated)"
                                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveEdit(note.metadata.note_id)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-900 whitespace-pre-wrap mb-3">
                              {note.text.length > 200 
                                ? `${note.text.substring(0, 200)}...` 
                                : note.text
                              }
                            </p>
                          )}
                          
                          {note.metadata.tags && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {note.metadata.tags.split(',').map((tag, index) => {
                                const trimmedTag = tag.trim()
                                return trimmedTag ? (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {trimmedTag}
                                  </span>
                                ) : null
                              })}
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-gray-500">
                            {(() => {
                              const timestampToUse = note.metadata.timestamp
                              
                              if (timestampToUse) {
                                const date = new Date(timestampToUse)
                                if (!isNaN(date.getTime())) {
                                  return (
                                    <>
                                      <span>Created: {date.toLocaleDateString()}</span>
                                      <span className="mx-2">•</span>
                                      <span>{date.toLocaleTimeString()}</span>
                                    </>
                                  )
                                }
                              }
                              
                              return <span>Created: Unknown date</span>
                            })()}
                          </div>
                        </div>
                        
                        {editingNote !== note.metadata.note_id && (
                          <div className="ml-4 flex space-x-2">
                            <button 
                              onClick={() => handleEditNote(note)}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit note"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteNote(note.metadata.note_id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete note"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
