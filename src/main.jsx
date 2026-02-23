import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-datepicker/dist/react-datepicker.css'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
