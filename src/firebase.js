import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDbUDhUSR2Jm-HD8EDFoIyyM2kmtKZQvzs",
    authDomain: "monstock-a8cbb.firebaseapp.com",
    projectId: "monstock-a8cbb",
    storageBucket: "monstock-a8cbb.firebasestorage.app",
    messagingSenderId: "710172228698",
    appId: "1:710172228698:web:69a14359db84087f106c63",
    measurementId: "G-8QWJ0K4G55"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache settings (replaces deprecated enableIndexedDbPersistence)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const auth = getAuth(app);

export { app, auth, db };
