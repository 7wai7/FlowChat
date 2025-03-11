import { Router } from 'express';
import jwt from 'jsonwebtoken'
import { User, isEnableEmail } from '../models/User.js';

const router = new Router();


router.post('/signup', async (req, res, next) => {
    try {
        const { login, email, password, confirmPassword } = req.body;

        if (!login) return res.status(400).json({ error: 'Login are required', field: 'login'});
        if (!email) return res.status(400).json({ error: 'Email are required', field: 'email'});
        if(!isEnableEmail(email)) return res.status(400).json({ error: 'The email address is not valid', field: 'email'});
        if (!password) return res.status(400).json({ error: 'Password are required', field: 'password'});

        const existedLogin = await User.findOne({ login });
        if (existedLogin) return res.status(400).json({ error: 'This login already exist', field: 'login'});

        const existedUser = await User.findOne({ email });
        if (existedUser) return res.status(400).json({ error: 'This email already exist', field: 'email'});

        if (password != confirmPassword) {
            return res.status(400).json({ error: 'Password confirmation is not equal to the password', field: 'confirm-password' })
        }

        const user = await User.create({ email, password, login });
        const token = jwt.sign({ id: user._id }, process.env.TOKEN_KEY);

        res.cookie('token', token, { httpOnly: true, /* secure: true, */ sameSite: 'Lax', path: '/', }); // httpOnly захищає від доступу через JS
        res.status(200).json("Successful signup.");
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email) return res.status(400).json({ error: 'Email are required', field: 'email'});
        if(!isEnableEmail(email)) return res.status(400).json({ error: 'The email address is not valid', field: 'email'});
        if (!password) return res.status(400).json({ error: 'Password are required', field: 'password'});

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid email', field: 'email'});

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid password', field: 'password'});

        const token = jwt.sign({ id: user._id }, process.env.TOKEN_KEY);

        res.cookie('token', token, { httpOnly: true, /* secure: true, */ sameSite: 'Lax', path: '/', }); // httpOnly захищає від доступу через JS
        res.status(200).json("Successful login.");
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/logout', (req, res, next) => {
    try {
        res.clearCookie('token');
        res.end();
    } catch (err) {
        next(err);
    }
})


export default router;
