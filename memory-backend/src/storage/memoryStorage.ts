import type { Note } from '../models/Note.js';

// In-memory storage for notes
const notes: Note[] = [];
let noteIdCounter = 1;

// Storage operations
export const createNote = (noteData: Omit<Note, 'id' | 'timestamp'>): Note => {
  const newNote: Note = {
    id: `note_${noteIdCounter++}`,
    timestamp: new Date(),
    ...noteData
  };
  notes.push(newNote);
  return newNote;
};

export const getAllNotes = (): Note[] => {
  return [...notes]; // Return copy to prevent external mutation
};

export const getNoteById = (id: string): Note | undefined => {
  return notes.find(note => note.id === id);
};

export const updateNote = (id: string, updates: Partial<Note>): Note | null => {
  const index = notes.findIndex(note => note.id === id);
  if (index === -1) return null;
  
  notes[index] = { ...notes[index], ...updates } as Note;
  return notes[index];
};

export const deleteNote = (id: string): boolean => {
  const index = notes.findIndex(note => note.id === id);
  if (index === -1) return false;
  
  notes.splice(index, 1);
  return true;
};
