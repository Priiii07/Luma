import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyCv3hmuyr7m3l-ptWjQpMIeuhGkZ9UCnlQ",
    authDomain: "cycle-aware-planner.firebaseapp.com",
    projectId: "cycle-aware-planner",
    storageBucket: "cycle-aware-planner.firebasestorage.app",
    messagingSenderId: "919477379392",
    appId: "1:919477379392:web:038dc24bb213dd4a635aa5"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
})
export default app
