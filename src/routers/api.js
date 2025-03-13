import Router from 'express';
import fs from "fs";
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

import auth from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { createConnection, createMessage, deleteMessage, findMessages, findMessagesByChatId, generateAvatar } from '../service.js';
import ChatConnection from '../models/ChatConnection.js';
import { translate } from '../localization.js';

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

        res.render('partials/message', {
            user: req.user,
            messages,
            t: (key) => translate(lang, key)
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.get('/chats', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});
        const lang = req.cookies.lang || "en";

        const connections = await ChatConnection.aggregate([
            {
                $match: {
                    $or: [{ user1: req.user._id }, { user2: req.user._id }]
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { user1: "$user1", user2: "$user2" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $cond: {
                                        if: { $eq: ["$$user1", req.user._id] },
                                        then: { $eq: ["$_id", "$$user2"] },
                                        else: { $eq: ["$_id", "$$user1"] }
                                    }
                                }
                            }
                        },
                        {
                            $project: { _id: 1, login: 1 }
                        }
                    ],
                    as: "user"
                }
            },
            { $unwind: "$user" },
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
            /* {
                $set: {
                    "chat.lastMessage": "$lastMessage" // Додаємо lastMessage всередину chat
                }
            }, */
            /* { $replaceRoot: { newRoot: "$chat" } } */
        ]);

        /* console.log(connections); */
        
        
        res.render('partials/chat', {
            chats: connections,
            t: (key) => translate(lang, key)
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

        const chat = req.query.chat;

        const searchChat = await User.find({
            login: { $regex: `^${chat}`, $options: 'i' } // Пошук за початком логіна (без урахування регістру)
        })
        .where('_id')
        .ne(req.user._id);

        
        res.render('partials/chat', {
            chats: searchChat,
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