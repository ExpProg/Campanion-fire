
// Firebase configuration provided by the user

import { initializeApp, getApps, getApp } from "firebase/app";
// Removed GoogleAuthProvider import
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// User provided Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBNk1U0L0-vN2qZRN_0Wq0_J8Sk1HpLbr8",
  authDomain: "testfirebase-89d87.firebaseapp.com",
  databaseURL: "https://testfirebase-89d87.firebaseio.com",
  projectId: "testfirebase-89d87",
  storageBucket: "testfirebase-89d87.appspot.com", // Corrected from firebasestorage.app
  messagingSenderId: "49101306189",
  appId: "1:49101306189:web:6a421a06713d30c0eb5f04"
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: Add if you use Analytics
};


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Use the existing app instance
}

const auth = getAuth(app);
const db = getFirestore(app);
// Removed googleProvider instance creation

// Removed googleProvider export
export { app, auth, db };
