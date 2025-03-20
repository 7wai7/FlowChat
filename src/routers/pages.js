import Router from 'express';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

import auth from '../middlewares/auth.js';
import { translate } from '../localization.js';
import Chat from '../models/Chat.js';
import ChatParticipant from '../models/ChatParticipant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const router = new Router();


router.get('/', auth, (req, res) => {
    try {
        if(!req.user) return res.redirect('/auth');
        const lang = req.cookies.lang || "en";
        
        res.render('main', {
            body: './index',
            stylesheets: ['index'],
            scripts: ['index'],
            user: req.user,
            t: (key) => translate(lang, key)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
})

router.get('/auth', auth, (req, res) => {
    try {
        if(req.user) return res.redirect('/');
        const lang = req.cookies.lang || "en";
        
        res.render('main', {
            body: './auth',
            stylesheets: ['auth'],
            scripts: ['auth'],
            t: (key) => translate(lang, key)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
})

router.get("/invite/:token", auth, async (req, res) => {
    try {
        if(!req.user) return res.redirect('/auth');
        const { token } = req.params;
        if (!token) return res.status(400).send("Token is required");

        let groupId
        try {
            groupId = jwt.verify(token, process.env.GROUP_TOKEN_KEY).groupId;
        } catch (err) {
            return res.status(400).send("Link is invalid or expired");
        }

        const group = await Chat.findById(groupId);
        if (!group) return res.status(404).send("Group not found");

        const existedParticipant = await ChatParticipant.findOne({ chat: group._id, user: req.user._id });
        if(!existedParticipant) {
            const newParticipant = new ChatParticipant({ chat: group._id, user: req.user._id });
            await newParticipant.save();
        }

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});



export default router;