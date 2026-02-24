import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../firebase'
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth'
import { setCurrentUserId } from '../utils/storageHelpers'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setCurrentUserId(firebaseUser?.uid || null)
            setLoading(false)
        })
        return unsubscribe
    }, [])

    const login = (email, password) =>
        signInWithEmailAndPassword(auth, email, password)

    const signup = (email, password) =>
        createUserWithEmailAndPassword(auth, email, password)

    const logout = () => signOut(auth)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                 style={{ background: 'var(--bg-primary)' }}>
                <div className="text-center">
                    <div className="text-4xl mb-4">🌸</div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
