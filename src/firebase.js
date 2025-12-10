import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.log('Persistence not supported by browser');
        }
    });
} catch (err) {
    console.log('Persistence error:', err);
}

export { app, auth, db };
