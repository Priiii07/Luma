import { createContext, useContext, useState, useEffect } from 'react'
import { loadUserPreferences, saveUserPreferences } from '../store/userPreferences'
import { useAuth } from './AuthContext'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const { user } = useAuth()

    const [theme, setTheme] = useState(() => {
        // Instant: apply cached theme from localStorage to avoid flash
        const cached = localStorage.getItem('theme')
        if (cached) {
            document.documentElement.setAttribute('data-theme', cached)
            return cached
        }
        return 'dark'
    })

    // Re-load theme from Firestore whenever auth state changes
    useEffect(() => {
        if (!user) return
        async function loadTheme() {
            try {
                const prefs = await loadUserPreferences()
                const savedTheme = prefs.theme || 'dark'
                setTheme(savedTheme)
                document.documentElement.setAttribute('data-theme', savedTheme)
                localStorage.setItem('theme', savedTheme)
            } catch {
                // Keep cached/default theme on error
            }
        }
        loadTheme()
    }, [user])

    const updateTheme = async (newTheme) => {
        setTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)

        const prefs = await loadUserPreferences()
        await saveUserPreferences({ ...prefs, theme: newTheme })
    }

    return (
        <ThemeContext.Provider value={{ theme, updateTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
