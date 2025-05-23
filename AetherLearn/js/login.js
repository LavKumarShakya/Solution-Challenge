// Import the functions you need from the SDKs you need
import { app, auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

const login = document.getElementById("login-submit");

login.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      alert("Logged in successfully");
      window.location.href = "../html/dashboard.html";
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
      window.location.href = "dashboard.html";
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
      window.location.href = "../html/dashboard.html";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
    });
});
