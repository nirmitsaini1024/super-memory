import express from 'express';
import cors from 'cors';
import notesRouter from './routes/notes.js';

const app = express();
const port = 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello World');
});




// Use the notes router
app.use('/notes', notesRouter);







// Placeholder routes for future implementation
app.post('/chats/:id', (req, res) => {
  res.send('Post request received');
});

app.get('/chats/:id', (req, res) => {
  res.send('Get request received');
});

app.get('/chats', (req, res) => {
  res.send('Get request received');
});

app.get('/query', (req, res) => {
  res.send('Get request received');
});


// POST /notes → add a note

// GET /notes → fetch all notes

// POST /chats → add a chat message

// GET /chats → fetch all chats

// POST /query → placeholder for retrieval + AI


// Add this at the very end, before app.listen
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!' 
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
