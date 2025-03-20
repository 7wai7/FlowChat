
const socket = io("/", { withCredentials: true, });
let userId;
let isShowingChat = false;
let isFetching = false;
let hasMoreMessages = true;
let currentChatId;
let currentChatElement;
let currentChatUserId;



function resize() {
    if (window.innerWidth <= 800) {
        if (isShowingChat) {
            document.getElementById('navigation-chats').setAttribute('hidden', '');
            document.querySelector('main').removeAttribute('hidden');
        } else {
            document.getElementById('navigation-chats').removeAttribute('hidden');
            document.querySelector('main').setAttribute('hidden', '');
        }
    } else {
        document.getElementById('navigation-chats').removeAttribute('hidden');
        document.querySelector('main').removeAttribute('hidden');

        if (!isShowingChat) {
            closeChat();
        }
    }
}

async function loadChats() {
    try {
        const container = document.getElementById('chats-container');

        const res = await fetch('/api/chats', { method: 'GET' });
        if (res.ok) {
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
        if (res.ok) {
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

function createFileElement(fileUrl) {
    const fileExt = fileUrl.split('.').pop().toLowerCase();
    const url = `/api${fileUrl}`;

    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt)) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Image';
        img.style.width = '100%';
        return img;
    }

    if (['mp4', 'webm', 'ogg'].includes(fileExt)) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.width = '100%';
        return video;
    }

    if (['mp3', 'wav', 'ogg'].includes(fileExt)) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        return audio;
    }

    // Для інших файлів – просто посилання
    const link = document.createElement('a');
    link.href = fileUrl;
    link.textContent = 'Download File';
    link.target = '_blank';
    link.style.display = 'block';
    link.style.color = '#007bff';
    return link;
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
        .replace('{content}', linkify(message.content))
        .replace('{timeAgo}', timeAgo(message.createdAt))
        .replace('{delete}', translations.delete);

    if (isOwnMessage) {
        template = template.replace(/<div class="user-login">[\s\S]*?<\/div>/, '');
        template = template.replace(/<div class="avatar">[\s\S]*?<\/div>/, '');
    } else {
        template = template.replace(/<div class="dropdown message-options">[\s\S]*?<\/div>/, '');
        template = template.replace(/<div class="check-mark">[\s\S]*?<\/div>/, '');
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template.trim();

    const messageElement = tempDiv.firstChild;

    if (isOwnMessage) {
        messageElement.setAttribute('isOwnMessage', '');
    }

    if(message.fileUrl) {
        const fileElement = createFileElement(message.fileUrl);
        messageElement.querySelector('.uploaded-file').appendChild(fileElement);
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

function joinToChat() {
    if (!currentChatId || parseInt(currentChatId) === -1) {
        document.getElementById('chat-options').setAttribute('hidden', '');
        return;
    }

    isFetching = true;
    document.getElementById('chat-options').removeAttribute('hidden');
    const deleteChatBtn = document.getElementById('delete-chat-btn');
    const leaveGroupBtn = document.getElementById('leave-group-btn');
    const shareGroupBtn = document.getElementById('share-group-btn');

    socket.emit("join-chat", { chatId: currentChatId }, async (res) => {
        isFetching = false;

        if (res.success) {
            document.getElementById('content-container').innerHTML = '';
            hasMoreMessages = true;
            await loadMessagesOnTop();

            if (currentChatElement.dataset.type === 'private') {
                deleteChatBtn.removeAttribute('hidden');
                leaveGroupBtn.setAttribute('hidden', '');
                shareGroupBtn.setAttribute('hidden', '');
            } else if (currentChatElement.dataset.type === 'group') {
                deleteChatBtn.setAttribute('hidden', '');
                leaveGroupBtn.removeAttribute('hidden');
                shareGroupBtn.removeAttribute('hidden');
            }

            const wrapper = document.getElementById('content-wrapper');
            wrapper.scroll(0, wrapper.scrollHeight);
        } else if (res.error) {
            console.error(res.error);
        } else {
            console.log(res);
        }
    });
}

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





document.addEventListener("DOMContentLoaded", async () => {

    // ПОДІЇ СОКЕТУ

    try {
        socket.on("connected", (userId_) => {
            userId = userId_;
            joinToChat();
        });

        // Отримання нового повідомлення від сервера
        socket.on("new-message", async ({ chat, isUpdatedChatId, message, translations }) => {
            await appendMessages([message], translations);

            if (isUpdatedChatId) {
                currentChatId = chat._id;
                currentChatElement.dataset.id = chat._id;
                currentChatElement.dataset.type = chat.type;
                joinToChat(); // Перезапускаємо приєднання до чату
            }

            const chatBtn = document.querySelector(`#chats-container [data-id="${message.chat}"]`)
            chatBtn.querySelector('.last-message').innerText = message.fileUrl ? "file" : message.content;
            chatBtn.querySelector('.date').innerText = timeAgo(message.createdAt);
            document.getElementById('chats-container').prepend(chatBtn);

            const wrapper = document.getElementById('content-wrapper');
            wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
        });

        socket.on("delete-message", ({ id, lastMessage }) => {
            document.querySelector(`[data-id="${id}"]`).remove();

            if (lastMessage) {
                const chatBtn = document.querySelector(`#chats-container [data-id="${lastMessage.chat}"]`)
                chatBtn.querySelector('.last-message').innerText = lastMessage.fileUrl ? "file" : lastMessage.content;
                chatBtn.querySelector('.date').innerText = timeAgo(lastMessage.createdAt);
            }
        });
    } catch (err) {
        console.error(err);
    }



    // ЗАВАНТАЖИТИ АВАТАРКУ

    try {
        document.getElementById('upload-avatar-btn').addEventListener('click', event => {
            document.getElementById('upload-avatar-input').click();
        });

        document.getElementById('upload-avatar-input').addEventListener("change", async (e) => {
            const file = e.target.files[0];

            if (file && file.type.startsWith("image/")) {
                const formData = new FormData();
                formData.append("avatar", file);

                const res = await fetch(`/api/avatar`, {
                    method: 'PUT',
                    body: formData
                })

                if (res.ok) {
                    document.querySelectorAll('.avatar').forEach(img => {
                        img.src = img.src.split('?')[0] + '?t=' + new Date().getTime();
                    })
                } else {
                    const data = await res.json();
                    console.error(data.message);
                }
            }
        });
    } catch (error) {
        console.error(error);
    }



    // СТВОРИТИ ГРУПУ

    try {
        document.getElementById('create-group-btn').addEventListener('click', async event => {
            const res = await fetch(`/api/group/newGroup`, { method: "POST" });

            if (res.ok) {
                document.getElementById('chats-container').innerHTML = '';
                loadChats();
            } else {
                const data = await res.json();
                console.error(data);
            }
        });
    } catch (err) {
        console.error(err);
    }



    // ВИХІД ІЗ АКАУНТА

    try {
        document.getElementById('logout-btn').addEventListener('click', async event => {
            const res = await fetch('/api/auth/logout', { method: "POST" })
            if (res.ok) window.location.href = '/auth';
            else {
                const data = await res.json();
                console.error(data.message);
            }
        });
    } catch (err) {
        console.error(err);
    }



    // НАДІСЛАТИ ПОШУКОВИЙ ЗАПИТ

    try {
        async function sendSearchQuery() {
            const container = document.getElementById('chats-container');
            const chat = document.getElementById('search-input').value;

            container.innerHTML = '';

            const res = await fetch(`/api/find?chat=${chat}`, { method: "GET" });
            if (res.ok) {
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
            if (!document.getElementById('search-input').value.trim()) {
                document.getElementById('chats-container').innerHTML = '';
                loadChats();
            } else sendSearchQuery();
        })
    } catch (err) {
        console.error(err);
    }



    // КОНТЕЙНЕР ІЗ ЧАТАМИ

    try {
        document.getElementById('chats-container').addEventListener('click', async event => {
            const chatBtn = event.target.closest('.chat');

            if (chatBtn && window.innerWidth <= 800) {
                document.getElementById('navigation-chats').setAttribute('hidden', '');
                document.querySelector('main').removeAttribute('hidden');
                isShowingChat = true;
            }

            if (chatBtn) {
                document.getElementById('content-container').innerHTML = '';
                document.getElementById('choose-chat-text').setAttribute('hidden', '');
                document.getElementById('chat-wrapper').removeAttribute('hidden');
                isShowingChat = true;

                currentChatId = chatBtn.dataset.id;
                currentChatElement = chatBtn;
                currentChatUserId = chatBtn.dataset.userid;
                document.getElementById('chat-title').innerText = chatBtn.dataset.title;

                joinToChat();
            }
        })

        document.getElementById('return-btn').addEventListener('click', event => {
            document.getElementById('navigation-chats').removeAttribute('hidden');
            document.querySelector('main').setAttribute('hidden', '');
            isShowingChat = false;
            resize();
            socket.emit("leave-chat", currentChatId);
        })
    } catch (err) {
        console.error(err);
    }



    // КОНТЕЙНЕР ІЗ ПОВІДОМЛЕННЯМИ

    try {
        document.getElementById('content-container').addEventListener('click', async event => {
            const deleteMessageBtn = event.target.closest('.delete-message-btn');
            if (deleteMessageBtn) {
                if (!currentChatId) return;

                const message = deleteMessageBtn.closest('.message');
                const id = message.dataset.id;

                socket.emit("delete-message", { chatId: currentChatId, id }, (res) => {
                    if (!res.success) {
                        console.error(res.error);
                    }
                });
            }
        });
    } catch (err) {
        console.error(err);
    }



    // ПРИКРІПИТИ ФАЙЛ ДО ПОВІДОМЛЕННЯ

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
                attachFilePanel.removeAttribute('hidden');
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
                    attachFilePanel.removeAttribute('hidden');
                }, { once: true });
            } else {
                attachFilePanel.removeAttribute('hidden');
            }
        });

        closePanelBtn.addEventListener('click', event => {
            attachFilePanel.setAttribute('hidden', '');
            fileInput.value = '';
            uploadedFileImg.src = '';
            uploadedFileImg.file = '';
            uploadedFileVideo.src = '';
        })
    } catch (err) {
        console.error(err);
    }



    // НАДІСЛАТИ ПОВІДОМЛЕННЯ

    try {
        const uploadingModal = document.getElementById('attach-file-uploading-modal');
        const progressBar = document.getElementById('upload-progress-bar');
        const attachFilePanel = document.getElementById('attach-file-panel');
        const uploadedFileImg = document.getElementById('uploaded-file-img');
        const uploadedFileVideo = document.getElementById('uploaded-file-video');

        async function sendMessage() {
            const fileInput = document.getElementById('input-file');
            const content = document.getElementById('write-message-textarea').value;
            if (!content.trim() && !fileInput.value) return;

            if (!currentChatId) {
                console.error('The current chat id value is not written');
                return;
            }

            document.getElementById('write-message-textarea').value = '';
            attachFilePanel.setAttribute('hidden', '');
            uploadedFileImg.src = '';
            uploadedFileImg.file = '';
            uploadedFileVideo.src = '';

            const chatId = currentChatId;
            const recipient = currentChatUserId;
            let fileUrl = null;

            const sendMessageSocket = () => socket.emit("send-message", {
                chatId,
                recipient,
                content,
                fileUrl
            }, (res) => {
                if (res.success) {
                } else {
                    if(chatId === currentChatId) document.getElementById('write-message-textarea').value = content;
                    console.error(res.error);
                }
            });

            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append("uploadedFile", fileInput.files[0]);

                fileInput.value = '';
                uploadingModal.removeAttribute('hidden');
                progressBar.value = 0;

                // Відправка файлу з XMLHttpRequest для отримання прогресу
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/message/upload", true);

                // Відстеження прогресу завантаження
                xhr.upload.onprogress = function (event) {
                    if (event.lengthComputable) {
                        let percentComplete = Math.round((event.loaded / event.total) * 100);
                        progressBar.value = percentComplete;
                    }
                };
                
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        const data = JSON.parse(xhr.responseText);
                        fileUrl = data.fileUrl;
        
                        // Приховати модальне вікно після успішного завантаження
                        uploadingModal.setAttribute('hidden', '');
                        progressBar.value = 0;
                        
                        sendMessageSocket();
                    } else {
                        console.error("Upload failed:", xhr.responseText);
                        uploadingModal.setAttribute('hidden', '');
                        progressBar.value = 0;
                    }
                };
        
                xhr.send(formData);
            } else {
                sendMessageSocket();
            }
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



    // КЕРУВАННЯ КНОПКОЮ scroll-to-down-btn

    try {
        const wrapper = document.getElementById('content-wrapper');
        const scrollToDownBtn = document.getElementById('scroll-to-down-btn');

        document.getElementById('content-wrapper').addEventListener('scroll', async () => {
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
                await loadMessagesOnTop();
            }
        });

        scrollToDownBtn.addEventListener('click', event => {
            wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
        })
    } catch (err) {
        console.error(err);
    }



    // ВИДАЛИТИ ЧАТ АБО ВИЙТИ ІЗ ГРУПИ

    try {
        async function removeCurrentChat(url) {
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                currentChatElement.remove();
                isShowingChat = false;
                resize();
            } else {
                const data = await res.json();
                console.error(data);
            }
        }

        document.getElementById('delete-chat-btn').addEventListener('click', async event => {
            await removeCurrentChat(`/api/chat/${currentChatId}`);
        });
        document.getElementById('leave-group-btn').addEventListener('click', async event => {
            await removeCurrentChat(`/api/group/${currentChatId}`);
        });
        document.getElementById('share-group-btn').addEventListener('click', async event => {
            const res = await fetch(`/api/groupLink/${currentChatId}`, { method: 'GET' });
            if (res.ok) {
                const link = await res.json();
                try {
                    await navigator.clipboard.writeText(link);
                } catch (err) {
                    try {
                        const textarea = document.createElement("textarea");
                        textarea.value = link;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textarea);
                    } catch (err) {
                        console.error("Помилка копіювання:", err);
                    }
                }
            } else {
                const data = await res.json();
                console.error(data);
            }
        })
    } catch (err) {
        console.error(err);
    }



    try {
        window.addEventListener('resize', resize);
    } catch (err) {
        console.error(err);
    }




    loadChats();
    resize();

});