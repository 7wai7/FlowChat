import { createCanvas } from "canvas";

import ChatConnection from "./models/ChatConnection.js";
import Message from "./models/Message.js";
import { User } from "./models/User.js";


export const findChat = async (userA, userB) => {
    const chat = await ChatConnection.findOne({
        user1: { $in: [userA, userB] },
        user2: { $in: [userA, userB] },
        group: null
    });

    return chat;
};

export const findMessages = async (userA, userB) => {
    const chat = await findChat(userA, userB);
    if (!chat) return [];

    const messages = await Message.find({ chat: chat._id }).populate('sender').sort({ createdAt: 1 });
    return messages;
};

export const findGroupMessages = async (groupId) => {
    const chat = await ChatConnection.findOne({ group: groupId });
    if (!chat) return [];

    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    return messages;
};



export const createConnection = async (userA, userB) => {
    const newConnection = new ChatConnection({ user1: userA, user2: userB });
    return await newConnection.save();
}

export const createMessage = async (sender, recipient, text) => {
    let existedConnection = await ChatConnection.findOne({ $or: [{ user1: sender, user2: recipient }, { user1: recipient, user2: sender }] });
    if(!existedConnection) {
        existedConnection = await createConnection(sender, recipient);
    }

    if(!existedConnection) return;

    const recipientUser = await User.findById(recipient);
    if(recipientUser) {
        const newMessage = new Message({ chat: existedConnection._id, sender, text });
        return await newMessage.save();
    }
}




// Функція для генерації аватарки
export const generateAvatar = (letter) => {
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