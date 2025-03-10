import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export default async function auth(req, res, next) {
    try {
        const token = req.cookies.token;
        if (!token) return next();

        const decoded = jwt.verify(token, process.env.TOKEN_KEY);

        const user = await User.findById(decoded.id);
        if (!user) return next();

        req.user = user;
        next();
    } catch (error) {
        next();
    }
}