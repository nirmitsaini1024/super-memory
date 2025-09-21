import type { Note } from '../models/Note.js';
import { createNote, getAllNotes, getNoteById, updateNote, deleteNote } from '../storage/memoryStorage.js';

// Service layer for note business logic
export class NoteService {
  static async createNote(noteData: { text: string; tags?: string[] }): Promise<Note> {
    const trimmedText = noteData.text.trim();
    
    const newNote = createNote({
      text: trimmedText,
      source: 'note',
      tags: noteData.tags || []
    });
    
    return newNote;
  }

  static async getAllNotes(): Promise<Note[]> {
    return getAllNotes();
  }

  static async getNoteById(id: string): Promise<Note | null> {
    const note = getNoteById(id);
    return note || null;
  }

  static async updateNote(id: string, updates: { text?: string; tags?: string[] }): Promise<Note | null> {
    const updateData: Partial<Note> = {};
    
    if (updates.text) {
      updateData.text = updates.text.trim();
    }
    
    if (updates.tags) {
      updateData.tags = updates.tags;
    }
    
    return updateNote(id, updateData);
  }

  static async deleteNote(id: string): Promise<boolean> {
    return deleteNote(id);
  }
}
