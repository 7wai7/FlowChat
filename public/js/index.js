let isShowingChat = false;
let currentChatId;


function resize() {
    if(window.innerWidth <= 800) {
        if(isShowingChat) {
            document.getElementById('navigation-chats').setAttribute('hidden', '');
            document.querySelector('main').removeAttribute('hidden');
        } else {
            document.getElementById('navigation-chats').removeAttribute('hidden');
            document.querySelector('main').setAttribute('hidden', '');
        }
    } else {
        document.getElementById('navigation-chats').removeAttribute('hidden');
        document.querySelector('main').removeAttribute('hidden');

        if(!isShowingChat) {
            document.getElementById('choose-chat-text').removeAttribute('hidden');
            document.getElementById('chat-wrapper').setAttribute('hidden', '');
            currentChatId = null;
        }
    }
}



// AJAX FUNCTIONS

async function loadEntities() {
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
        } else {
            const data = await res.json();
            console.error(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadMessages() {
    try {
        const container = document.getElementById('content-container');

        const res = await fetch(`/api/messages/${currentChatId}`, { method: 'GET' });
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
        } else {
            const data = await res.json();
            console.error(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}


document.addEventListener("DOMContentLoaded", async () => {
    const socket = io(/* "http://localhost:3000" */ /* window.location.href */ "/", { withCredentials: true, });

    try {
        // Отримання нового повідомлення від сервера
        socket.on("new-message", (message) => {
            console.log("Нове повідомлення:", message);
            // Тут можна оновити DOM та показати нове повідомлення в UI
        });
        
    } catch (err) {
        console.error(err);
    }

    try {
        document.getElementById('chats-container').addEventListener('click', async event => {
            const entityBtn = event.target.closest('.chat');

            if(entityBtn && window.innerWidth <= 800) {
                document.getElementById('navigation-chats').setAttribute('hidden', '');
                document.querySelector('main').removeAttribute('hidden');
                isShowingChat = true;
            }

            if(entityBtn) {
                document.getElementById('content-container').innerHTML = '';
                document.getElementById('choose-chat-text').setAttribute('hidden', '');
                document.getElementById('chat-wrapper').removeAttribute('hidden');
                isShowingChat = true;

                currentChatId = entityBtn.dataset.id;
                document.getElementById('chat-title').innerText = entityBtn.dataset.title;
                loadMessages();

                socket.emit("join-chat", currentChatId);
            }
        })

        document.getElementById('return-btn').addEventListener('click', event => {
            document.getElementById('navigation-chats').removeAttribute('hidden');
            document.querySelector('main').setAttribute('hidden', '');
            isShowingChat = false;
            currentChatId = null;
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

                const res = await await fetch(`/api/avatar`, {
                    method: 'PUT',
                    body: formData
                })

                if(!res.ok) {
                    const data = await res.json();
                    console.error(data.message);
                }
            }
        });
    } catch(error) {
        console.error(error);
    }


    try {
        async function sendSearchQuery() {
            const container = document.getElementById('chats-container');
            const chat = document.getElementById('search-input').value;

            container.innerHTML = '';

            const res = await fetch(`/api/find?chat=${chat}`, { method: "GET" });
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
            } else {
                const data = await res.json();
                console.error(data.message);
            }
        }

        document.getElementById('find-btn').addEventListener('click', event => {
            sendSearchQuery();
        })

        document.getElementById('search-input').addEventListener('input', event => {
            if(!document.getElementById('search-input').value.trim()) {
                document.getElementById('chats-container').innerHTML = '';
                loadEntities();
            } else sendSearchQuery();
        })
    } catch (err) {
        console.error(err);
    }


    try {
        document.getElementById('logout-btn').addEventListener('click', async event => {
            const res = await fetch('/api/auth/logout', { method: "POST" })
            if(res.ok) window.location.href = '/auth';
            else {
                const data = await res.json();
                console.error(data.message);
            }
        });
    } catch (err) {
        console.error(err);
    }



    try {
        async function sendMessage() {
            const message = document.getElementById('write-message-textarea').value;
            if(!message.trim()) return;

            if(!currentChatId) {
                console.error('The current chat id value is not written');
                return;
            }

            document.getElementById('write-message-textarea').value = '';

            
            socket.emit("send-message", { currentChatId, text: message }, (res) => {
                if (res.error) {
                    document.getElementById('write-message-textarea').value = message;
                    console.error(res.error);
                }
            });
            
        }

        document.getElementById('send-message-btn').addEventListener('click', async event => {
            sendMessage();
        });

        document.getElementById('write-message-textarea').addEventListener('keydown', event => {
            if (event.ctrlKey && event.key === "Enter") {
                sendMessage();
            }
        })
    } catch (err) {
        console.error(err);
    }




    
    loadEntities();

});