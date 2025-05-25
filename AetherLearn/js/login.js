// Import the functions you need from the SDKs you need
import { app, auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

// Function to check if user has completed preferences setup
async function checkUserPreferences(userId) {
  try {
    const preferencesRef = doc(db, 'users', userId, 'preferences', 'current');
    const preferencesDoc = await getDoc(preferencesRef);
    
    if (preferencesDoc.exists() && preferencesDoc.data().completed) {
      return true; // User has completed preferences
    }
    return false; // User needs to complete preferences
  } catch (error) {
    console.error('Error checking user preferences:', error);
    return false; // Default to preferences setup on error
  }
}

// Function to handle successful authentication
async function handleAuthSuccess(user) {
  const hasPreferences = await checkUserPreferences(user.uid);
  
  if (hasPreferences) {
    // User has completed preferences - redirect to dashboard
    window.location.href = "../html/dashboard.html";
  } else {
    // New user or user hasn't completed preferences - redirect to preferences overlay
    window.location.href = "../html/preferences-overlay.html";
  }
}

const login = document.getElementById("login-submit");

login.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, email, password)    .then((userCredential) => {
      const user = userCredential.user;
      handleAuthSuccess(user);
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
      // ..
    });
});

const provider = new GoogleAuthProvider();
const google_login = document.getElementById("google-login");

google_login.addEventListener("click", function (event) {
  event.preventDefault();  signInWithPopup(auth, provider)
    .then((result) => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;
      console.log(user);
      handleAuthSuccess(user);
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
    });
});

const provider1 = new GithubAuthProvider();
const github_login = document.getElementById("github-login");

github_login.addEventListener("click", function (event) {
  event.preventDefault();  signInWithPopup(auth, provider1)
    .then((result) => {
      const credential = GithubAuthProvider.credentialFromResult(result);
      const user = result.user;
      console.log(user);
      handleAuthSuccess(user);
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
    });
});
