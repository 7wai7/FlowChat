import Router from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

import auth from '../middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const router = new Router();


router.get('/', auth, (req, res) => {
    try {
        res.render('main');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", err });
    }
})


export default router;