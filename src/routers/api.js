import Router from 'express';
import fs from "fs";
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';
import { createCanvas } from "canvas";
import mongoose from 'mongoose';

import auth from '../middlewares/auth.js';
import { User } from '../models/User.js';

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


router.get('/messages', auth, (req, res) => {
    try {
        if (!req.user) return res.status(401).json("Not registered");
        res.render('message');
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
})

router.get('/chats', auth, (req, res) => {
    try {
        if (!req.user) return res.status(401).json("Not registered");
        res.render('chat');
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
})

router.get('/find', auth, (req, res) => {
    try {
        if (!req.user) return res.status(401).json("Not registered");

        const text = req.query.text;
        console.log(text);
        
        res.render('chat');
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
})

router.get('/avatar/:id', async (req, res) => {
    try {
        const avatarPath = path.join(__dirname, '../../data/avatars', `${req.params.id}.png`);

        // Якщо файл вже існує — відправляємо його
        if (fs.existsSync(avatarPath)) {
            return res.sendFile(avatarPath);
        }

        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json('User not found');

        // Генеруємо аватарку
        const avatarBuffer = generateAvatar(user.login[0].toUpperCase()); // Перша літера логіна

        // Зберігаємо зображення
        fs.writeFileSync(avatarPath, avatarBuffer);

        // Відправляємо клієнту
        res.setHeader("Content-Type", "image/png");
        res.send(avatarBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// Функція для генерації аватарки
function generateAvatar(letter) {
    const size = 128;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Генеруємо випадковий колір
    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    
    // Малюємо фон
    ctx.fillStyle = randomColor;
    ctx.fillRect(0, 0, size, size);

    // Налаштовуємо текст
    ctx.fillStyle = "#fff";
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Малюємо першу літеру
    ctx.fillText(letter, size / 2, size / 2);

    return canvas.toBuffer("image/png");
}




router.put("/avatar", auth, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json("Not registered");
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
        console.error(err);
        res.status(500).json(err);
    }
});


export default router;