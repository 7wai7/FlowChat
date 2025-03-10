import { Router } from 'express';
import jwt from 'jsonwebtoken'
import { User, isEnableEmail } from '../models/User.js';

const router = new Router();


router.post('/signup', async (req, res, next) => {
    try {
        const { login, email, password, confirmPassword } = req.body;

        if (!login) return res.status(400).json({ message: 'Login are required', error: 'login'});
        if (!email) return res.status(400).json({ message: 'Email are required', error: 'email'});
        if(!isEnableEmail(email)) return res.status(400).json({ message: 'The email address is not valid', error: 'email'});
        if (!password) return res.status(400).json({ message: 'Password are required', error: 'password'});

        const existedUser = await User.findOne({ email });
        if (existedUser) return res.status(400).json({ message: 'This email already exist', error: 'email'});

        if (password != confirmPassword) {
            return res.status(400).json({ message: 'Password confirmation is not equal to the password', error: 'password confirmation' })
        }

        const user = await User.create({ email, password, login });
        const token = jwt.sign({ id: user._id }, process.env.TOKEN_KEY);

        res.cookie('token', token, { httpOnly: true, /* secure: true, */ sameSite: 'Lax', path: '/', }); // httpOnly захищає від доступу через JS
        res.status(200).json("Successful signup.");
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email) return res.status(400).json({ message: 'Email are required', error: 'email'});
        if(!isEnableEmail(email)) return res.status(400).json({ message: 'The email address is not valid', error: 'email'});
        if (!password) return res.status(400).json({ message: 'Password are required', error: 'password'});


        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email', error: 'email'});

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid password', error: 'password'});

        const token = jwt.sign({ id: user._id }, process.env.TOKEN_KEY);

        res.cookie('token', token, { httpOnly: true, /* secure: true, */ sameSite: 'Lax', path: '/', }); // httpOnly захищає від доступу через JS
        res.status(200).json({ message: "Successful login." });
    } catch (err) {
        next(err);
    }
});

router.post('/logout', (req, res, next) => {
    try {
        res.clearCookie('token');
        res.redirect('/');
    } catch (err) {
        next(err);
    }
})


export default router;
