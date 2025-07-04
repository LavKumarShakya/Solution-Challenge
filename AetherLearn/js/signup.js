// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyBicWD9ppun6U9muhLJM3oESrhNGybS_O8",
  authDomain: "aetherlearn-5c389.firebaseapp.com",
  projectId: "aetherlearn-5c389",
  storageBucket: "aetherlearn-5c389.firebasestorage.app",
  messagingSenderId: "322278188019",
  appId: "1:322278188019:web:109af65c86035cb424e886",
  measurementId: "G-08XLBFTXS9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth();
auth.languageCode = "en";

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

const signup = document.getElementById("submit");

signup.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const name = document.getElementById("name").value;

  const db = getFirestore();
  const interest = document.getElementById("interest").value;

  if (password !== confirmPassword) {
    event.preventDefault(); // Prevent form submission
    alert("Passwords do not match!");
  } else {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed up
        const user = userCredential.user;
        const userData = {
          email: email,
          name: name,
          interest: interest,
        };
        const docRef = doc(db, "users", user.uid);        setDoc(docRef, userData).then(() => {
          handleAuthSuccess(user);
        });
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert(errorMessage);
        // ..
      });
  }
});

const provider = new GoogleAuthProvider();
const google_login = document.getElementById("google-signup");

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
const github_login = document.getElementById("github-signup");

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

