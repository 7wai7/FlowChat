let isShowingChat = false;
let isFetching = false;
let hasMoreMessages = true;
let currentChatId;


function closeChat() {
    document.getElementById('content-container').innerHTML = '';
    document.getElementById('choose-chat-text').removeAttribute('hidden');
    document.getElementById('chat-wrapper').setAttribute('hidden', '');
    currentChatId = null;
    hasMoreMessages = true;
    isShowingChat = false;
}


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
            closeChat();
        }
    }
}

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
        } else {
            const data = await res.json();
            console.error(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadMessagesOnTop() {
    try {
        if (isFetching || !hasMoreMessages) return;
        isFetching = true;

        const container = document.getElementById('content-container');
        const offset = container.querySelectorAll('.message').length;

        const res = await fetch(`/api/messages?chatId=${currentChatId}&offset=${offset}`, { method: 'GET' });
        if(res.ok) {
            const htmlText = await res.text();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlText;

            const fragment = document.createDocumentFragment();
            const messages = tempDiv.querySelectorAll('.message');
            if (messages.length === 0) hasMoreMessages = false;

            messages.forEach((message) => {
                fragment.prepend(message);
            });

            container.prepend(fragment);
            tempDiv.remove();
            isFetching = false;
        } else {
            isFetching = false;
            const data = await res.json();
            console.error(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}




document.addEventListener("DOMContentLoaded", async () => {
    const socket = io(/* "http://localhost:3000" */ /* window.location.href */ "/", { withCredentials: true, });


    function joinToChat() {
        if(!currentChatId) return;
        hasMoreMessages = true;
        
        socket.emit("join-chat", { chatId: currentChatId }, (res) => {
            if(res.messages) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = res.messages;

                const fragment = document.createDocumentFragment();
                const messages = tempDiv.querySelectorAll('.message');

                messages.forEach((message) => {
                    fragment.prepend(message); // Додаємо в зворотньому порядку
                });

                document.getElementById('content-container').prepend(fragment);
                tempDiv.remove();

                
                const wrapper = document.getElementById('content-wrapper');
                wrapper.scroll(0, wrapper.scrollHeight);
            } else if (res.error) {
                console.error(res.error);
            } else {
                console.log(res);
            }
        });
    }


    try {
        socket.on("connected", () => {
            joinToChat();
        });

        // Отримання нового повідомлення від сервера
        socket.on("new-message", (message) => {
            document.getElementById('content-container').innerHTML += message;
            const wrapper = document.getElementById('content-wrapper');
            wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
        });
        
    } catch (err) {
        console.error(err);
    }


    try {
        const wrapper = document.getElementById('content-wrapper');
        const scrollToDownBtn = document.getElementById('scroll-to-down-btn');

        document.getElementById('content-wrapper').addEventListener('scroll', () => {
            const scrollThreshold = wrapper.scrollHeight - wrapper.offsetHeight - 100;

            if (wrapper.scrollTop < scrollThreshold) {
                scrollToDownBtn.style.opacity = '1';
                scrollToDownBtn.style.visibility = 'visible';
            } else {
                scrollToDownBtn.style.opacity = '0';
                scrollToDownBtn.style.visibility = 'hidden';
            }

            if (!hasMoreMessages || isFetching) return;
        
            if (wrapper.scrollTop <= 200) {
                loadMessagesOnTop();
            }
        });

        scrollToDownBtn.addEventListener('click', event => {
            wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
        })
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

                joinToChat();
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
        document.getElementById('content-container').addEventListener('click', async event => {
            const deleteMessageBtn = event.target.closest('.delete-message-btn');
            if(deleteMessageBtn) {
                const message = deleteMessageBtn.closest('.message');
                const id = message.dataset.id;

                const res = await fetch(`/api/message/${id}`, { method: "DELETE" });
                if(res.ok) {
                    message.remove();
                } else {
                    const data = await res.json();
                    console.error(data.message);
                }
            }
        });
    } catch (err) {
        console.error(err);
    }


    try {
        window.addEventListener('resize', resize);
    } catch (err) {
        console.error(err);
    }


    try {
        const fileInput = document.getElementById('input-file');
        const attachFilePanel = document.getElementById('attach-file-panel');
        const closePanelBtn = document.getElementById('close-panel-btn');
        const uploadedFileImg = document.getElementById('uploaded-file-img');
        const uploadedFileVideo = document.getElementById('uploaded-file-video');

        document.getElementById('attach-file-btn').addEventListener('click', event => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return

            const fileURL = URL.createObjectURL(file);
            
            if (file.type.startsWith("image/")) {
                uploadedFileImg.src = fileURL;
            } else if (file.type.startsWith("video/")) {
                uploadedFileVideo.src = fileURL;
                uploadedFileVideo.crossOrigin = "anonymous";

                uploadedFileVideo.addEventListener("loadedmetadata", function () {
                    uploadedFileVideo.currentTime = 1; // Перемотуємо на 1 секунду
                }, { once: true });

                uploadedFileVideo.addEventListener("seeked", function generatePreview() {
                    const canvas = document.createElement("canvas");
                    canvas.width = uploadedFileVideo.videoWidth;
                    canvas.height = uploadedFileVideo.videoHeight;
                    const ctx = canvas.getContext("2d");

                    ctx.drawImage(uploadedFileVideo, 0, 0, canvas.width, canvas.height);
                    uploadedFileImg.src = canvas.toDataURL("image/png");

                    canvas.toBlob(blob => {
                        uploadedFileImg.file = new File([blob], "preview.png", { type: "image/png" });
                    }, "image/png");

                    uploadedFileVideo.removeEventListener("seeked", generatePreview); // Видаляємо обробник після виконання
                }, { once: true });
            }

            attachFilePanel.removeAttribute('hidden');
        });

        closePanelBtn.addEventListener('click', event => {
            attachFilePanel.setAttribute('hidden', '');
            uploadedFileImg.src = '';
            uploadedFileImg.file = '';
            uploadedFileVideo.src = '';
        })
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
                loadChats();
            } else sendSearchQuery();
        })
    } catch (err) {
        console.error(err);
    }


    try {
        document.getElementById('lang-dropdown-content').addEventListener('click', event => {
            if(event.target.matches('button')) {
                const btn = event.target;
                document.cookie = `lang=${btn.dataset.lang}`; 
                btn.closest('.content').setAttribute('hidden', '');
            }
        })

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

            
            socket.emit("send-message", { chatId: currentChatId, text: message }, (res) => {
                if(res.message) {
                    document.getElementById('content-container').innerHTML += res.message;
                    const wrapper = document.getElementById('content-wrapper');
                    wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
                } else if (res.error) {
                    document.getElementById('write-message-textarea').value = message;
                    console.error(res.error);
                } else {
                    console.log(res);
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




    
    loadChats();
    resize();

});