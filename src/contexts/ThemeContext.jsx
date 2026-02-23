import { createContext, useContext, useState, useEffect } from 'react'
import { loadUserPreferences, saveUserPreferences } from '../store/userPreferences'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark')

    // Load theme from userPreferences on mount
    useEffect(() => {
        async function init() {
            const prefs = await loadUserPreferences()
            const savedTheme = prefs.theme || 'dark'
            setTheme(savedTheme)
            document.documentElement.setAttribute('data-theme', savedTheme)
        }
        init()
    }, [])

    const updateTheme = async (newTheme) => {
        setTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)

        // Persist to IndexedDB alongside other preferences
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
