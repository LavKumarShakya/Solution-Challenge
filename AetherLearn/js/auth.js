document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggle
    const toggleBtns = document.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Password strength checker
    const signupPassword = document.getElementById('signup-password');
    if (signupPassword) {
        const strengthBar = document.querySelector('.strength-level');
        const strengthText = document.querySelector('.strength-text');

        function checkPasswordStrength(password) {
            let strength = 0;
            const patterns = {
                length: password.length >= 8,
                lowercase: /[a-z]/.test(password),
                uppercase: /[A-Z]/.test(password),
                numbers: /\d/.test(password),
                symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
            };

            strength += Object.values(patterns).filter(Boolean).length;

            if (strength < 2) {
                return { level: 'weak', color: 'var(--error)', text: 'Weak password' };
            } else if (strength < 4) {
                return { level: 'medium', color: 'var(--warning)', text: 'Medium strength' };
            } else {
                return { level: 'strong', color: 'var(--success)', text: 'Strong password' };
            }
        }

        signupPassword.addEventListener('input', (e) => {
            const result = checkPasswordStrength(e.target.value);
            strengthBar.style.width = `${(result.level === 'weak' ? 33 : result.level === 'medium' ? 66 : 100)}%`;
            strengthBar.style.backgroundColor = result.color;
            strengthText.textContent = result.text;
        });
    }

    // Login form handling
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                // Simulate loading state
                const btn = e.target.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                btn.disabled = true;
                
                // Add your authentication logic here
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated API call
                
                // Redirect after successful login
                window.location.href = '/';
            } catch (error) {
                console.error('Login error:', error);
                // Handle login error (show message to user)
            }
        });
    }

    // Signup form handling
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const interests = [...document.querySelectorAll('input[name="interests"]:checked')]
                .map(input => input.value);
            
            try {
                // Simulate loading state
                const btn = e.target.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                btn.disabled = true;
                
                // Add your registration logic here
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated API call
                
                // Redirect after successful signup
                window.location.href = '/';
            } catch (error) {
                console.error('Signup error:', error);
                // Handle signup error (show message to user)
            }
        });
    }

    // Social auth buttons
    const socialBtns = document.querySelectorAll('.social-btn');
    socialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.classList.contains('google') ? 'Google' : 'GitHub';
            // Add your social auth logic here
        });
    });

    // Loading screen
    window.addEventListener('load', () => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    });
});