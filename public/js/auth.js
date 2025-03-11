
document.addEventListener("DOMContentLoaded", () => {

    try {
        const form = document.getElementById('auth-form');
        const formTitle = document.getElementById('form-title');
        const toggleText = document.getElementById('toggle-text');
        const toggleForm = document.getElementById('toggle-form');
        const loginGroup = document.getElementById('login-group');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const submitBtn = document.querySelector('.submit-btn');
        let isSignUp = false;

        toggleForm.addEventListener('click', () => {
            isSignUp = !isSignUp;
            formTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
            toggleText.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
            toggleForm.textContent = isSignUp ? 'Sign In' : 'Sign Up';
            loginGroup.style.display = isSignUp ? 'block' : 'none';
            confirmPasswordGroup.style.display = isSignUp ? 'block' : 'none';
            submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;
            const login = document.getElementById('login');
            const email = document.getElementById('email');
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirm-password');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
            document.querySelectorAll('.form-group input').forEach(el => el.classList.remove('error'));

            if(isSignUp && !login.value.trim()) {
                login.nextElementSibling.textContent = 'Invalid login';
                login.classList.add('error');
                isValid = false; 
            }

            if (!emailRegex.test(email.value)) {
                email.nextElementSibling.textContent = 'Invalid email format';
                email.classList.add('error');
                isValid = false;
            }

            if (password.value.length < 4) {
                password.nextElementSibling.textContent = 'Password must be at least 4 characters';
                password.classList.add('error');
                isValid = false;
            }

            if (isSignUp && password.value !== confirmPassword.value) {
                confirmPassword.nextElementSibling.textContent = 'Passwords do not match';
                confirmPassword.classList.add('error');
                isValid = false;
            }

            if (isValid) {
                const res = await fetch(`/api/auth/${isSignUp ? 'signup' : 'login'}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        login: login.value,
                        email: email.value,
                        password: password.value,
                        confirmPassword: confirmPassword.value,
                    })
                });

                if(res.ok) window.location.href = '/';
                
                const data = await res.json();

                if(data.error && data.field) {
                    const errorField = document.getElementById(data.field);
                    if(errorField) {
                        errorField.nextElementSibling.textContent = data.error;
                        errorField.classList.add('error');
                    } else {
                        console.error('Error field not found:', data.field);
                    }
                }

            }
        });
    } catch (err) {
        console.error(err);
    }

});