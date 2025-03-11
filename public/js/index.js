let isShowingChat = false;


function resize() {
    if(window.innerWidth <= 800) {
        if(isShowingChat) {
            document.getElementById('navigation-chats').style.display = 'none';
            document.querySelector('main').style.display = 'flex';
        } else {
            document.getElementById('navigation-chats').style.display = 'flex';
            document.querySelector('main').style.display = 'none';
        }
    } else {
        document.getElementById('navigation-chats').style.display = 'flex';
        document.querySelector('main').style.display = 'flex';
    }
}



// AJAX FUNCTIONS

async function loadChats() {
    try {
        const container = document.getElementById('chats-container');
    
        const res = await fetch('/api/chats', { method: 'GET' });
        if(res.ok) {
            const htmlText = await res.text();
    
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlText;
    
            const fragment = document.createDocumentFragment();
    
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
    
            container.appendChild(fragment);
            tempDiv.remove();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadMessages() {
    try {
        const container = document.getElementById('content-container');

        const res = await fetch('/api/messages', { method: 'GET' });
        if(res.ok) {
            const htmlText = await res.text();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlText;

            const fragment = document.createDocumentFragment();

            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }

            container.prepend(fragment);
            tempDiv.remove();
        }
    } catch (err) {
        console.error(err);
    }
}


document.addEventListener("DOMContentLoaded", async () => {

    try {
        document.getElementById('chats-container').addEventListener('click', event => {
            const btn = event.target.closest('.select-chat');
            if(btn && window.innerWidth <= 800) {
                document.getElementById('navigation-chats').style.display = 'none';
                document.querySelector('main').style.display = 'flex';
                isShowingChat = true;
            }
        })

        document.getElementById('return-btn').addEventListener('click', event => {
            document.getElementById('navigation-chats').style.display = 'flex';
            document.querySelector('main').style.display = 'none';
            isShowingChat = false;
        })
    } catch (err) {
        console.error(err);
    }


    try {
        window.addEventListener('resize', resize);
        resize();
    } catch (err) {
        console.error(err);
    }


    try {
        document.getElementById('attach-file-btn').addEventListener('click', event => {
            document.getElementById('input-file').click()
        });
    } catch (err) {
        console.error(err);
    }


    try {
        document.getElementById('upload-avatar-btn').addEventListener('click', event => {
            document.getElementById('upload-avatar-input').click();
        });
        
        document.getElementById('upload-avatar-input').addEventListener("change", async (e) => {
            const file = e.target.files[0];
            
            if(file && file.type.startsWith("image/")) {
                const formData = new FormData();
                formData.append("avatar", file); 

                await fetch(`/api/avatar`, {
                    method: 'PUT',
                    body: formData
                })
            }
        });
    } catch(error) {
        console.error(error);
    }


    try {
        async function sendSearchQuery() {
            const container = document.getElementById('chats-container');
            const text = document.getElementById('search-input').value;

            const res = await fetch(`/api/find?text=${text}`, { method: "GET" });
            if(res.ok) {
                const htmlText = await res.text();
    
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlText;
        
                const fragment = document.createDocumentFragment();
        
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
        
                container.appendChild(fragment);
                tempDiv.remove();
            }
        }

        document.getElementById('find-btn').addEventListener('click', event => {
            sendSearchQuery();
        })
    } catch (err) {
        console.error(err);
    }


    try {
        document.getElementById('logout-btn').addEventListener('click', async event => {
            const res = await fetch('/api/auth/logout', { method: "POST" })
            if(res.ok) window.location.href = '/auth';
        });
    } catch (err) {
        console.error(err);
    }






    
    loadChats();
    loadMessages();

});