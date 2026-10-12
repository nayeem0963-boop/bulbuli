import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Certificate from './routes/Certificate.jsx'
import Home from './routes/Home.jsx'
import Level from './routes/Level.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/level/:levelId" element={<Level />} />
        <Route path="/certificate/:levelId" element={<Certificate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
