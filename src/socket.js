import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

import Message from "./models/Message.js";
import { createMessage } from "./service.js";
import auth from "./middlewares/auth.js";
import { User } from "./models/User.js";

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

    io.on("connection", (socket) => {
        console.log("Користувач підключився:", socket.id);

        socket.on("join-chat", (chatId) => {
            socket.join(chatId);
            console.log(`Користувач приєднався до чату ${chatId}`);
        });

        socket.on("send-message", async ({ chatId, text }, callback) => {
            try {
                if (!chatId || !text) return callback({ error: "Chat or text is not specified" });

                const message = await createMessage(socket.user._id, recipientId, text);

                console.log(message);

                // Відправка повідомлення всім користувачам цього чату
                io.to(chatId).emit("new-message", message);
                callback();
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
