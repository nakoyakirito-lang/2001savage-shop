import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, child, onValue, push } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTLfJZOHYjhU9GqhTugCuZKWocqyAv5cg",
  authDomain: "savage-shop-4fb85.firebaseapp.com",
  databaseURL: "https://savage-shop-4fb85-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "savage-shop-4fb85",
  storageBucket: "savage-shop-4fb85.firebasestorage.app",
  messagingSenderId: "170117255829",
  appId: "1:170117255829:web:42c7248a1dff302d94419c",
  measurementId: "G-NHSF6YG02X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, ref, set, get, update, remove, child, onValue, push, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged };
