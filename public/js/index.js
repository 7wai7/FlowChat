let userId;
let isShowingChat = false;
let isFetching = false;
let hasMoreMessages = true;
let currentChatId;
let currentChatElement;
let currentChatUserId;


function closeChat() {
    document.getElementById('content-container').innerHTML = '';
    document.getElementById('choose-chat-text').removeAttribute('hidden');
    document.getElementById('chat-wrapper').setAttribute('hidden', '');
    currentChatId = null;
    currentChatElement = null;
    currentChatUserId = null;
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

            tempDiv.querySelectorAll('.date').forEach(dateEl => {
                dateEl.innerText = dateEl.dataset.date ? timeAgo(dateEl.dataset.date) : '';
            })

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
            const data = await res.json();
            await appendMessages(data.messages, data.translations);
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


async function loadMessageTemplate() {
    const response = await fetch('/html/message.html');
    return await response.text();
}

async function renderMessage(message, translations) {
    let template = await loadMessageTemplate();

    // Визначаємо, чи це повідомлення поточного користувача
    const isOwnMessage = userId === message.sender._id;

    // Замінюємо плейсхолдери реальними даними
    template = template
        .replace('{id}', message._id)
        .split('{sender_id}').join(message.sender._id)
        .replace('{createdAt}', new Date(message.createdAt).toLocaleDateString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }))
        .replace('{login}', message.sender.login)
        .replace('{content}', message.content)
        .replace('{timeAgo}', timeAgo(message.createdAt))
        .replace('{delete}', translations.delete);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template.trim();

    const messageElement = tempDiv.firstChild;

    if (isOwnMessage) {
        messageElement.setAttribute('isOwnMessage', '');
        messageElement.querySelector('.user-login').remove();
        messageElement.querySelector('.avatar').remove();
    } else {
        messageElement.querySelector('.message-options').remove();
        messageElement.querySelector('.check-mark').remove();
    }

    return messageElement;
}

async function appendMessages(messages, translations) {
    const chatContainer = document.getElementById('content-container');
    const fragment = document.createDocumentFragment();

    for (const message of messages) {
        const messageElement = await renderMessage(message, translations);
        fragment.prepend(messageElement); // Додаємо в зворотньому порядку
    }

    chatContainer.appendChild(fragment);
}





document.addEventListener("DOMContentLoaded", async () => {
    const socket = io(/* "http://localhost:3000" */ /* window.location.href */ "/", { withCredentials: true, });


    function joinToChat() {
        if(!currentChatId || parseInt(currentChatId) === -1) return;
        hasMoreMessages = true;
        
        socket.emit("join-chat", { chatId: currentChatId }, async (res) => {
            if(res.messages) {
                document.getElementById('content-container').innerHTML = '';
                isFetching = false;
                hasMoreMessages = true;
                await loadMessagesOnTop();

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
        socket.on("connected", (userId_) => {
            userId = userId_;
            joinToChat();
        });

        // Отримання нового повідомлення від сервера
        socket.on("new-message", async ({ chatId, isUpdatedChatId, message, translations }) => {
            await appendMessages([message], translations);
            
            if(isUpdatedChatId) {
                currentChatId = chatId;
                currentChatElement.dataset.id = chatId;
                joinToChat(); // Перезапускаємо приєднання до чату
            }

            const chat = document.querySelector(`#chats-container [data-id="${currentChatId}"]`)
            chat.querySelector('.last-message').innerText = message.content;
            chat.querySelector('.date').innerText = timeAgo(message.createdAt);

            const wrapper = document.getElementById('content-wrapper');
            wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
        });

        socket.on("delete-message", (id) => {
            document.querySelector(`[data-id="${id}"]`).remove();
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
                currentChatElement = entityBtn;
                currentChatUserId = entityBtn.dataset.userid;
                document.getElementById('chat-title').innerText = entityBtn.dataset.title;

                joinToChat();
            }
        })

        document.getElementById('return-btn').addEventListener('click', event => {
            document.getElementById('navigation-chats').removeAttribute('hidden');
            document.querySelector('main').setAttribute('hidden', '');
            isShowingChat = false;
            socket.emit("leave-chat", currentChatId);
            currentChatId = null;
            currentChatElement = null;
            currentChatUserId = null;
        })
    } catch (err) {
        console.error(err);
    }


    try {
        document.getElementById('content-container').addEventListener('click', async event => {
            const deleteMessageBtn = event.target.closest('.delete-message-btn');
            if(deleteMessageBtn) {
                if(!currentChatId) return;

                const message = deleteMessageBtn.closest('.message');
                const id = message.dataset.id;

                socket.emit("delete-message", { chatId: currentChatId, id });
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

                const res = await fetch(`/api/avatar`, {
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

                tempDiv.querySelectorAll('.date').forEach(dateEl => {
                    dateEl.innerText = dateEl.dataset.date ? timeAgo(dateEl.dataset.date) : '';
                })
        
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
            const content = document.getElementById('write-message-textarea').value;
            if(!content.trim()) return;

            if(!currentChatId) {
                console.error('The current chat id value is not written');
                return;
            }

            document.getElementById('write-message-textarea').value = '';

            socket.emit("send-message", { chatId: currentChatId, recipient: currentChatUserId, content }, (res) => {
                console.log(res);
                if (res.error) {
                    document.getElementById('write-message-textarea').value = content;
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