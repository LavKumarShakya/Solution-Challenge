// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
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
const auth = getAuth(app);

const login = document.getElementById("login-submit");

login.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      alert("Logged in successfully");
      // ...
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
  event.preventDefault();
  signInWithPopup(auth, provider)
    .then((result) => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;
      console.log(user);
      alert("Logged in successfully");
      window.location.href = "../../index.html";
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
  event.preventDefault();
  signInWithPopup(auth, provider1)
    .then((result) => {
      const credential = GithubAuthProvider.credentialFromResult(result);
      const user = result.user;
      console.log(user);
      alert("Logged in successfully");
      window.location.href = "../../index.html";  
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
    });
});
