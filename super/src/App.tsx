import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import NotesPage from './pages/NotesPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/notes" element={<NotesPage />} />
      </Routes>
    </div>
  )
}