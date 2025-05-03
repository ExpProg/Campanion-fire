// TODO: Replace with your actual Firebase config
// Instructions:
// 1. Go to your Firebase project console: https://console.firebase.google.com/
// 2. In the project settings, find your web app's configuration.
// 3. Copy the `firebaseConfig` object.
// 4. Paste the copied configuration object below, replacing the placeholder values.

// IMPORTANT: For security reasons, it's highly recommended to use environment variables
// to store your Firebase configuration, especially the API key.
// Example using environment variables:
/*
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
*/

// --- PASTE YOUR FIREBASE CONFIGURATION BELOW ---
// --- OR set up environment variables as shown above ---

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ** ACTION REQUIRED: Replace with your Firebase project configuration **
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <-- REPLACE
  authDomain: "YOUR_AUTH_DOMAIN", // <-- REPLACE
  projectId: "YOUR_PROJECT_ID", // <-- REPLACE
  storageBucket: "YOUR_STORAGE_BUCKET", // <-- REPLACE
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <-- REPLACE
  appId: "YOUR_APP_ID", // <-- REPLACE
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: Add if you use Analytics
};


// Basic check if config is placeholder
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.warn(
    "Firebase configuration is missing or using placeholder values. " +
    "Please update src/config/firebase.ts with your actual Firebase project configuration. " +
    "Authentication and Firestore features will not work correctly until this is done."
  );
}


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Use the existing app instance
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
