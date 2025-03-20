
function getCookie(name) {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1] || null;
}

function linkify(text) {
    const urlPattern = /(http?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" rel="noopener noreferrer">$1</a>');
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
        { label: "second", seconds: 1 }
    ];
    const lang = getCookie("lang") || "en";
    
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count > 0) {
            let label;
            let ago = "ago";

            if(lang === "ua") {
                ago = "тому";

                switch (interval.label) {
                    case "year":
                        if (count % 10 === 1 && count % 100 !== 11) label = "рік";
                        else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) label = "роки";
                        else label = "років";
                        break;

                    case "month":
                        if (count === 1) label = "місяць";
                        else if (count >= 2 && count <= 4) label = "місяці";
                        else label = "місяців";
                        break;

                    case "day":
                        if (count === 1) label = "день";
                        else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) label = "дні";
                        else label = "днів";
                        break;

                    case "hour":
                        if (count % 10 === 1 && count % 100 !== 11) label = "годину";
                        else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) label = "години";
                        else label = "годин";
                        break;

                    case "minute":
                        if (count % 10 === 1 && count % 100 !== 11) label = "хвилину";
                        else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) label = "хвилини";
                        else label = "хвилин";
                        break;

                    case "second":
                        if (count % 10 === 1 && count % 100 !== 11) label = "секунду";
                        else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) label = "секунди";
                        else label = "секунд";
                        break;
                }
            } else {
                label = `${interval.label}${count > 1 ? "s" : ""}`;
            }

            return `${count} ${label} ${ago}`;
        }
    }

    return lang === "ua" ? "щойно" : 'now';
}

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