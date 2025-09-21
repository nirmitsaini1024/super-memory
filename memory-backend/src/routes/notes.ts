import { Router } from 'express';
import { validateNote } from '../models/Note.js';
import { NoteService } from '../services/noteService.js';

const router = Router();

// POST /notes - Create a new note
router.post('/', validateNote, async (req: any, res: any) => {
  try {
    const { text, tags } = req.body;
    
    const newNote = await NoteService.createNote({ text, tags });
    
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /notes - Get all notes
router.get('/', async (req: any, res: any) => {
  try {
    const notes = await NoteService.getAllNotes();
    res.status(200).json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET /notes/:id - Get a specific note
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const note = await NoteService.getNoteById(id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.status(200).json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// PUT /notes/:id - Update a note
router.put('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { text, tags } = req.body;
    
    const updatedNote = await NoteService.updateNote(id, { text, tags });
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.status(200).json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /notes/:id - Delete a note
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const deleted = await NoteService.deleteNote(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
