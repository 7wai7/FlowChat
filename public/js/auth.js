
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
            formTitle.textContent = isSignUp ? formTitle.dataset.signup : formTitle.dataset.signin;
            toggleText.textContent = isSignUp ? toggleText.dataset.signup : toggleText.dataset.signin;
            toggleForm.textContent = isSignUp ? toggleForm.dataset.signin : toggleForm.dataset.signup;
            loginGroup.style.display = isSignUp ? 'block' : 'none';
            confirmPasswordGroup.style.display = isSignUp ? 'block' : 'none';
            submitBtn.textContent = isSignUp ? submitBtn.dataset.signup : submitBtn.dataset.signin;
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
                const errorDiv = login.nextElementSibling;
                errorDiv.textContent = errorDiv.dataset.invalid_login_error;
                login.classList.add('error');
                isValid = false; 
            }

            if (!emailRegex.test(email.value)) {
                const errorDiv = email.nextElementSibling;
                errorDiv.textContent = errorDiv.dataset.invalid_email_format_error;
                email.classList.add('error');
                isValid = false;
            }

            if (password.value.length < 4) {
                const errorDiv = password.nextElementSibling;
                errorDiv.textContent = errorDiv.dataset.password_4_symbols_error;
                password.classList.add('error');
                isValid = false;
            }

            if (isSignUp && password.value !== confirmPassword.value) {
                const errorDiv = confirmPassword.nextElementSibling;
                errorDiv.textContent = errorDiv.dataset.match_passwords_error;
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
                else {
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
    
                    if(data.message) console.error(data.message);
                }
            }
        });
    } catch (err) {
        console.error(err);
    }

});