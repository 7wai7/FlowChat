
document.addEventListener("DOMContentLoaded", () => {

    try {
        document.addEventListener("input", function(event) {
            if (event.target.matches(".textarea-autosize")) {
                const textarea = event.target;
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
            }
        });
    } catch (err) {
        console.error(err);
    }


    try {
        function calculateDropdownRect(button, content) {
            const buttonRect = button.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();
            const screenWidth = content.closest('#content-wrapper')?.offsetWidth || window.innerWidth;
            const screeHeight = content.closest('#content-wrapper')?.offsetHeight || window.innerHeight;

            // Якщо меню виходить за правий край, зміщуємо його ліворуч
            if (buttonRect.right + contentRect.width > screenWidth) {
                content.style.left = "auto";
                content.style.right = "0";
            } else {
                content.style.left = "0";
                content.style.right = "auto";
            }

            if (buttonRect.bottom + contentRect.height > screeHeight) {
                content.style.top = "auto";
                content.style.bottom = buttonRect.height + 'px';
            } else {
                content.style.top = buttonRect.height + 'px';
                content.style.bottom = "auto";
            }

            content.style.width = "max-content";
            content.style.height = "max-content";
        }


        document.querySelectorAll(".dropdown .content").forEach(content => {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    const button = content.closest(".dropdown").querySelector("button");

                    calculateDropdownRect(button, content);
                });
            });
            
            observer.observe(content, { childList: true, subtree: true });
        });


        document.addEventListener("click", function (event) {
            const dropdown = event.target.closest(".dropdown");

        
            // Якщо клікнули поза dropdown — закриваємо всі
            if (!dropdown) {
                document.querySelectorAll(".dropdown .content").forEach(content => {
                    content.setAttribute("hidden", "");
                });
                return;
            }
        
            const button = dropdown.querySelector("button");
            const content = dropdown.querySelector(".content");

        
            // Якщо клікнули по кнопці — перемикаємо видимість
            if (event.target.closest("button") === button) {
                // Закриваємо всі інші dropdown
                document.querySelectorAll(".dropdown .content").forEach(dropdown => {
                    if(!dropdown.closest('.dropdown')) dropdown.setAttribute("hidden", "")
                });
        
                content.removeAttribute("hidden");
                calculateDropdownRect(button, content);
            }
        });
    } catch (error) {
        console.error(error);
    }


    try {
        document.getElementById('lang-dropdown-content').addEventListener('click', event => {
            if(event.target.matches('button')) {
                const btn = event.target;
                document.cookie = `lang=${btn.dataset.lang}`;
                window.location.reload();
            }
        })
    } catch (error) {
        console.error(error);
    }
});