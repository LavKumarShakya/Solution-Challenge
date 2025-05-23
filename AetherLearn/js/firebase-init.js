// Firebase initialization module
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBicWD9ppun6U9muhLJM3oESrhNGybS_O8",
  authDomain: "aetherlearn-5c389.firebaseapp.com",
  projectId: "aetherlearn-5c389",
  storageBucket: "aetherlearn-5c389.firebasestorage.app",
  messagingSenderId: "322278188019",
  appId: "1:322278188019:web:109af65c86035cb424e886",
  measurementId: "G-08XLBFTXS9",
};

// Initialize Firebase - use try/catch to handle potential duplicate initialization
let app;
let auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  if (error.code === "app/duplicate-app") {
    console.log("Firebase already initialized, using existing instance");
    app = firebase.app();
    auth = getAuth(app);
  } else {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth };
