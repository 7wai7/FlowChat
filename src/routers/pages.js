import Router from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

import auth from '../middlewares/auth.js';
import { translate } from '../localization.js';

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


export default router;