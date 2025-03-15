import Router from 'express';
import fs from "fs";
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

import auth from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { createMessage, deleteMessage, findMessages, findMessagesByChatId, generateAvatar } from '../service.js';
import ChatConnection from '../models/ChatConnection.js';
import { translate } from '../localization.js';
import ChatParticipant from '../models/ChatParticipant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'avatar') cb(null, "data/avatars/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, req.filename + ext);
    }
});
const upload = multer({ storage });

const router = new Router();


router.get('/messages', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Not registered"});
        const lang = req.cookies.lang || "en";

        const chatId = req.query.chatId;
        const offset = parseInt(req.query.offset) || 0;
        const limit = 20;

        const messages = await findMessagesByChatId(chatId, offset, limit);
        const translations = {
            delete: translate(lang, "delete")
        };

        res.json({ messages, translations })
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.get('/chats', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});
        const lang = req.cookies.lang || "en";

        const chats = await ChatParticipant.aggregate([
            { 
                $match: { user: req.user._id } 
            },
            {
                $lookup: {
                    from: 'chats',
                    localField: 'chat',
                    foreignField: '_id',
                    as: 'chat'
                }
            },
            { $unwind: "$chat" },
            {
                $set: { "chat.user1": "$user" }
            },
            {
                $lookup: {
                    from: 'chatparticipants', // Шукаємо всіх учасників цього чату
                    let: { chatId: "$chat._id", currentUser: "$user" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } }, // Беремо учасників цього чату
                        { $match: { $expr: { $ne: ["$user", "$$currentUser"] } } }, // Відкидаємо поточного користувача
                        { $limit: 1 } // Нам потрібен тільки один інший користувач
                    ],
                    as: "otherUser"
                }
            },
            {
                $set: { "chat.user2": { $arrayElemAt: ["$otherUser.user", 0] } } // Додаємо user2
            },
            { $unset: "otherUser" }, // Прибираємо тимчасове поле
            { $replaceRoot: { newRoot: "$chat" } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user2',
                    foreignField: '_id',
                    as: 'user2'
                }
            },
            { $unwind: "$user2" },
            {
                $lookup: {
                    from: "messages",
                    localField: "_id",
                    foreignField: "chat",
                    as: "lastMessage",
                    pipeline: [
                        { $sort: { createdAt: -1 } }, // Сортуємо повідомлення за датою (останнє перше)
                        { $limit: 1 } // Беремо тільки одне (останнє)
                    ]
                }
            },
            { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } }, // Залишаємо null, якщо немає повідомлень
        ]);

        res.render('partials/chat', {
            chats: chats
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.get('/find', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});
        const lang = req.cookies.lang || "en";

        const chatName = req.query.chat;

        const searchChats = await User.aggregate([
            // Пошук користувачів за логіном
            {
                $match: {
                    login: { $regex: `^${chatName}`, $options: 'i' }, // Пошук за логіном
                    _id: { $ne: req.user._id } // Виключаємо поточного користувача
                }
            },
            // Знаходимо всі чати, в яких бере участь поточний користувач
            {
                $lookup: {
                    from: "chatparticipants",
                    let: { currentUserId: req.user._id },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$user", "$$currentUserId"] } } }
                    ],
                    as: "currentUserChats"
                }
            },
            // Шукаємо, чи знайдений користувач є в тих самих чатах
            {
                $lookup: {
                    from: "chatparticipants",
                    let: { userId: "$_id", chats: "$currentUserChats.chat" },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { 
                                    $and: [
                                        { $in: ["$chat", "$$chats"] }, // Перевіряємо, чи є чат у списку
                                        { $eq: ["$user", "$$userId"] } // Чи є цей користувач у чаті
                                    ]
                                }
                            } 
                        }
                    ],
                    as: "commonChatParticipants"
                }
            },
            // Додаємо інформацію про спільні чати
            {
                $lookup: {
                    from: "chats",
                    localField: "commonChatParticipants.chat",
                    foreignField: "_id",
                    as: "commonChats"
                }
            },
            // Групуємо результати, щоб уникнути дублікатів
            {
                $group: {
                    _id: "$_id",
                    login: { $first: "$login" },
                    email: { $first: "$email" },
                    password: { $first: "$password" },
                    role: { $first: "$role" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    __v: { $first: "$__v" },
                    chat: { $first: { $arrayElemAt: ["$commonChats", 0] } } // Беремо тільки один спільний чат
                }
            },
            // Якщо немає спільних чатів, то встановлюємо chat: null
            {
                $set: {
                    chat: { $ifNull: ["$chat", null] }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "chat._id",
                    foreignField: "chat",
                    as: "lastMessage",
                    pipeline: [
                        { $sort: { createdAt: -1 } }, // Сортуємо повідомлення за датою (останнє перше)
                        { $limit: 1 } // Беремо тільки одне (останнє)
                    ]
                }
            },
            { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } }, // Залишаємо null, якщо немає повідомлень
        ]);

        res.render('partials/chat', {
            chats: searchChats,
            t: (key) => translate(lang, key)
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.get('/avatar/:id', async (req, res, next) => {
    try {
        const avatarPath = path.join(__dirname, '../../data/avatars', `${req.params.id}.png`);

        // Якщо файл вже існує — відправляємо його
        if (fs.existsSync(avatarPath)) {
            return res.sendFile(avatarPath);
        }

        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json({ message: 'User not found' });

        // Генеруємо аватарку
        const avatarBuffer = generateAvatar(user.login[0].toUpperCase()); // Перша літера логіна

        // Зберігаємо зображення
        fs.writeFileSync(avatarPath, avatarBuffer);

        // Відправляємо клієнту
        res.setHeader("Content-Type", "image/png");
        res.send(avatarBuffer);
    } catch (err) {
        next(err);
    }
});





router.post('/message/:id', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});

        const recipientId = req.params.id;
        const text = req.body.message;

        await createMessage(req.user._id, recipientId, text);

        res.end();
    } catch (err) {
        console.error(err);
        next(err);
    }
})




router.put("/avatar", auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});
        req.filename = req.user._id.toString();

        upload.fields([
            { name: 'avatar', maxCount: 1 }
        ])(req, res, async(err) => {
            if(err) return res.status(500).json({ err: "Error uploading files" });

            if (!req.files || !req.files.avatar) {
                return res.status(400).json({ err: "Avatar not uploaded" });
            }

            return res.json("Avatar uploaded successfully");
        })
    } catch (err) {
        next(err);
    }
});



export default router;