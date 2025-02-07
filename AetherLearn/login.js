document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form")
    const signupForm = document.getElementById("signup-form")
    const showSignup = document.getElementById("show-signup")
    const showLogin = document.getElementById("show-login")
    const loginSection = document.getElementById("login")
    const signupSection = document.getElementById("signup")
  
    // Toggle between login and signup forms
    showSignup.addEventListener("click", (e) => {
      e.preventDefault()
      loginSection.style.display = "none"
      signupSection.style.display = "flex"
    })
  
    showLogin.addEventListener("click", (e) => {
      e.preventDefault()
      signupSection.style.display = "none"
      loginSection.style.display = "flex"
    })
  
    // Handle login form submission
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const username = document.getElementById("username").value
      const password = document.getElementById("password").value
  
      // Here you would typically send this data to your server for authentication
      console.log("Login attempt:", { username, password })
      alert(`Login attempt with username: ${username}`)
    })
  
    // Handle signup form submission
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const formData = new FormData(signupForm)
      const userData = {
        username: formData.get("signup-username"),
        email: formData.get("signup-email"),
        password: formData.get("signup-password"),
        confirmPassword: formData.get("signup-confirm-password"),
        fullName: formData.get("signup-fullname"),
        dateOfBirth: formData.get("signup-dob"),
        gender: formData.get("signup-gender"),
        educationLevel: formData.get("signup-education-level"),
        institution: formData.get("signup-institution"),
        major: formData.get("signup-major"),
        interests: formData.getAll("interests"),
        learningGoals: formData.get("signup-goals"),
      }
  
      if (userData.password !== userData.confirmPassword) {
        alert("Passwords don't match!")
        return
      }
  
      // Here you would typically send this data to your server to create a new account
      console.log("Signup attempt:", userData)
      alert(`Signup attempt for ${userData.fullName}. Check console for details.`)
    })
  })
  
  