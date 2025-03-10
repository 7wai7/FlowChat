import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

import functions from './functions.js';
import apiRouter from './routers/api.js';
import pageRoutes from './routers/pages.js';
import authRoutes from './routers/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const PORT = process.env.PORT || 3000;
const DB_URL = "mongodb://localhost:27017/flowchat";

const app = express();



// Міжпрограмне забезпечення для доступу до функцій в ejs файлах
app.use((req, res, next) => {
    res.locals.timeAgo = functions.timeAgo;
    res.locals.formatTime = functions.formatTime;
    next();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Налаштування EJS
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Маршрути
app.use("/api", apiRouter);
app.use("/api/auth", authRoutes);
app.use("/", pageRoutes);

app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message });
});

async function startApp() {
    try {
        await mongoose.connect(DB_URL);
        app.listen(PORT, () => console.log(`Сервер працює на порті: http://localhost:${PORT}`));
    } catch (error) {
        console.log(error);
    }
}

startApp();