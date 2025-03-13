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
import { createMessage, findMessages } from "./service.js";

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
        console.log("Користувач підключився:", socket.id);

        socket.emit('connected', {})

        socket.on("join-chat", async ({ chatId }, callback) => {
            socket.join(chatId);
            console.log(`Користувач приєднався до чату ${chatId}`);

            const messages = await findMessages(socket.user._id, chatId, 0, 20);

            ejs.renderFile(
                path.join(__dirname, '../views/partials/message.ejs'),
                {
                    user: socket.user,
                    messages,
                    timeAgo: functions.timeAgo, // Додаємо функції явно
                    formatTime: functions.formatTime
                },
                (err, renderedMessages) => {
                    if (err) {
                        console.error("Помилка рендерингу повідомлення:", err);
                        return;
                    }
                    callback({ messages: renderedMessages });
                }
            );
        });

        socket.on("send-message", async ({ chatId, text }, callback) => {
            try {
                if (!chatId || !text) return callback({ error: "Chat or text is not specified" });

                const message = await createMessage(socket.user._id, chatId, text);
                const fullMessage = await Message.findById(message._id).populate("sender");

                ejs.renderFile(
                    path.join(__dirname, '../views/partials/message.ejs'),
                    {
                        user: { _id: -1 },
                        messages: [fullMessage],
                        timeAgo: functions.timeAgo,
                        formatTime: functions.formatTime
                    },
                    (err, renderedMessage) => {
                        if (err) {
                            console.error("Помилка рендерингу повідомлення:", err);
                            return;
                        }
                        io.to(socket.user._id.toString()).emit("new-message", renderedMessage);
                    }
                );

                ejs.renderFile(
                    path.join(__dirname, '../views/partials/message.ejs'),
                    {
                        user: socket.user,
                        messages: [fullMessage],
                        timeAgo: functions.timeAgo,
                        formatTime: functions.formatTime
                    },
                    (err, renderedMessage) => {
                        if (err) {
                            console.error("Помилка рендерингу повідомлення:", err);
                            return;
                        }
                        callback({ message: renderedMessage });
                    }
                );
            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("disconnect", () => {
            console.log("Користувач відключився:", socket.id);
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
