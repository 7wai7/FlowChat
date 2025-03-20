import Router from 'express';
import fs from "fs";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import auth from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { createGroup, createMessage, deleteChat, findChats, findMessagesByChatId, generateAvatar, getGroupLink, leaveGroup } from '../service.js';
import { translate } from '../localization.js';
import ChatParticipant from '../models/ChatParticipant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ⚡ Створюємо директорії заздалегідь, щоб уникнути помилок
const createFolder = (folder) => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
};
createFolder("data/avatars/");
createFolder("data/uploads/");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'avatar') cb(null, "data/avatars/")
        else if (file.fieldname === 'uploadedFile') cb(null, "data/uploads/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, req.filename + ext);
    }
});

const upload = multer({
    storage,
    // limits: { fileSize: 100 * 1024 * 1024 }, // 100MB макс. розмір файлу
});

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
        if (!req.user) return res.status(401).json({ error: "Not registered"});
        const lang = req.cookies.lang || "en";

        const chats = await findChats(req.user._id);

        res.render('partials/chat', {
            chats
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.get('/find', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Not registered"});
        const lang = req.cookies.lang || "en";

        const chatName = req.query.chat;

        const searchChats = await User.aggregate([
            // Пошук користувачів за логіном
            {
                $match: {
                    login: { $regex: `^${chatName}`, $options: 'i' },
                    _id: { $ne: req.user._id } // Виключаємо поточного користувача
                }
            },
            // Знаходимо всі чати, в яких бере участь поточний користувач
            {
                $lookup: {
                    from: "chatparticipants",
                    let: { currentUserId: req.user._id },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$user", "$$currentUserId"] },
                                        { $ne: ["$type", "group"] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: { chat: 1 }
                        }
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
                                        { $eq: ["$user", "$$userId"] }, // Чи є цей користувач у чаті
                                        { $ne: ["$type", "group"] }
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
                    role: { $first: "$role" },
                    createdAt: { $first: "$createdAt" },
                    chat: { $first: { $arrayElemAt: ["$commonChats", 0] } }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { chatId: "$chat._id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } },
                        { $sort: { createdAt: -1 } }, // Сортуємо повідомлення за датою (останнє перше)
                        { $limit: 1 } // Беремо тільки одне (останнє)
                    ],
                    as: "lastMessage"
                }
            },
            { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } } // Залишаємо null, якщо немає повідомлень
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

router.get('/groupLink/:id', async (req, res, next) => {
    try {
        const link = await getGroupLink(req.params.id);
        res.json(link);
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
        if(!user) {
            return res.sendFile(path.join(__dirname, '../../data/avatars/no avatar.png'));
        }

        // Генеруємо аватарку
        const avatarBuffer = generateAvatar(user.login[0].toUpperCase()); // Перша літера логіна

        // Зберігаємо зображення
        fs.writeFileSync(avatarPath, avatarBuffer);

        // Відправляємо клієнту
        res.setHeader("Content-Type", "image/png");
        res.send(avatarBuffer);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/uploads/:id', async (req, res, next) => {
    try {
        const filePath = path.join(__dirname, `../..//data/uploads/${req.params.id}`);
        
        return res.sendFile(filePath);
    } catch (err) {
        console.error(err);
        next(err);
    }
});



router.post('/message/upload', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Not registered"});
        req.filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        upload.fields([
            { name: 'uploadedFile', maxCount: 1 }
        ])(req, res, async(err) => {
            if(err) {
                console.error(err);
                return res.status(500).json({ error: "Error uploading file" });
            }

            if (!req.files || !req.files.uploadedFile) {
                return res.status(400).json({ error: "File not uploaded" });
            }

            res.json({ fileUrl: `/uploads/${req.files.uploadedFile[0].filename}` });
        })
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.post('/group/:name', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Not registered"});
        if (!req.params.name) return res.status(400).json({ error: "Group name is not specified"});

        const newGroup = await createGroup(req.user._id, req.params.name);

        res.json(newGroup);
    } catch (err) {
        console.error(err);
        next(err);
    }
})




router.put("/avatar", auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Not registered"});
        req.filename = req.user._id.toString();

        upload.fields([
            { name: 'avatar', maxCount: 1 }
        ])(req, res, async(err) => {
            if(err) {
                console.error(err);
                return res.status(500).json({ error: "Error uploading files" });
            }

            if (!req.files || !req.files.avatar) {
                return res.status(400).json({ error: "Avatar not uploaded" });
            }

            return res.json("Avatar uploaded successfully");
        })
    } catch (err) {
        console.error(err);
        next(err);
    }
});


router.delete('/chat/:id', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});

        await deleteChat(req.params.id);
        
        res.end();
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.delete('/group/:id', auth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not registered"});

        const result = await leaveGroup(req.params.id, req.user._id);
        if(result.error) {
            return res.status(result.status || 400).json(result);
        }
        
        res.status(204).end();
    } catch (err) {
        console.error(err);
        next(err);
    }
});


export default router;