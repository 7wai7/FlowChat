import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ejs from 'ejs';

import functions from './functions.js';
import { User } from "./models/User.js";
import Message from "./models/Message.js";
import { createMessage, deleteMessage } from "./service.js";
import { translate } from './localization.js';
import { callbackify } from "util";
import Chat from "./models/Chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let io;

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            credentials: true, 
        }
    });

    io.use(async (socket, next) => {
        try {
            const cookies = socket.handshake.headers.cookie ? cookie.parse(socket.handshake.headers.cookie) : {};

            const token = cookies.token;
            if (!token) return next();
    
            const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    
            const user = await User.findById(decoded.id);
            if (!user) return next();
    
            socket.user = user;
            socket.userIp = socket.handshake.address;
            next();
        } catch (error) {
            next(new Error("Невірний токен"));
        }
    });

    io.on("connection", async (socket) => {
        try {
            socket.emit('connected', socket.user._id);
        } catch (err) {
            console.error(err);
        }


        function render(path_, params, callback) {
            ejs.renderFile(
                path.join(__dirname, `../views${path_}.ejs`),
                params,
                (err, rendered) => {
                    if (err) {
                        console.error("Помилка рендерингу повідомлення:", err);
                        return callback({ message: err.message });
                    }
                    callback(rendered);
                }
            );
        }

        socket.on("join-chat", async ({ chatId }, callback) => {
            try {
                socket.join(chatId);
                console.log(`Користувач ${socket.id} приєднався до чату ${chatId}`);
                
                callback({ success: true })
            } catch (err) {
                console.error(err);
                callback({ message: err.message })
            }
        });

        socket.on("leave-chat", async (chatId) => {
            try {
                socket.leave(chatId);
                console.log(`Користувач ${socket.id} покинув чат ${chatId}`);
            } catch (error) {
                console.error("Помилка виходу з чату:", error);
            }
        });

        socket.on("send-message", async (data, callback) => {
            try {
                let { chatId, recipient, content, fileUrl } = data;

                const cookies = socket.handshake.headers.cookie ? cookie.parse(socket.handshake.headers.cookie) : {};
                const lang = cookies.lang || "en";

                const message = await createMessage(chatId, socket.user._id, recipient, content, fileUrl);
                const fullMessage = await Message.findById(message._id).populate("sender");

                const translations = {
                    delete: translate(lang, "delete")
                }

                let isUpdatedChatId = false;
                if(parseInt(chatId) === -1) {
                    chatId = fullMessage.chat; // якщо чат створено динамічно при надсиланні повідомлення
                    isUpdatedChatId = true;
                    socket.join(chatId);
                    
                    const chat = await Chat.findById(chatId);
                    socket.emit("new-message", { chat, isUpdatedChatId, message: fullMessage, translations });
                    socket.to(chatId).emit("new-message", { chat, isUpdatedChatId, message: fullMessage, translations });
                    callback({ success: true });
                    return;
                }


                const chat = await Chat.findById(chatId);
                io.to(chatId).emit("new-message", { chat, isUpdatedChatId, message: fullMessage, translations })
                callback({ success: true });
            } catch (err) {
                console.error(err);
                callback({ error: err.message });
            }
        });

        socket.on("delete-message", async ({ chatId, id }, callback) => {
            try {
                const result = await deleteMessage(id, socket.user);
                if(result.success) {
                    const lastMessage = (
                        await Message.find({ chat: result.deletedMessage.chat })
                            .sort({ createdAt: -1 })
                            .limit(1)
                        )[0];

                    return io.to(chatId).emit("delete-message", { id, lastMessage });
                }
                
                callback(result);
            } catch (err) {
                console.log(err);
                callback({ error: err.message });
            }
        })

        socket.on("disconnect", () => {
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.io не ініціалізовано!");
    }
    return io;
}
