import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import './styles/global.css'
import './styles/feedback.css'
import './styles/tutorials.css'

export function mount(element) {
  createRoot(element).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
}
