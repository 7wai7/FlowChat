import { createCanvas } from "canvas";

import ChatConnection from "./models/ChatConnection.js";
import Message from "./models/Message.js";
import { User } from "./models/User.js";
import Chat from "./models/Chat.js";
import ChatParticipant from "./models/ChatParticipant.js";


export const findChat = async (userA, userB) => {
    const chat = await ChatConnection.findOne({
        $or: [
            { user1: userA, user2: userB },
            { user1: userB, user2: userA }
        ],
        group: null
    });

    return chat;
};

export const findMessages = async (userA, userB, offset, limit) => {
    const chat = await findChat(userA, userB);
    if (!chat) return [];

    const messages = await Message.find({ chat: chat._id })
        .populate('sender')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
    
    return messages;
};

export const findMessagesByChatId = async (chatId, offset, limit) => {
    const chat = parseInt(chatId) !== -1 ? await Chat.findById(chatId) : null;
    if (!chat) return [];

    const messages = await Message.find({ chat: chat._id })
        .populate('sender')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
    
    return messages;
};

export const findGroupMessages = async (groupId) => {
    const chat = await ChatConnection.findOne({ group: groupId });
    if (!chat) return [];

    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    return messages;
};


export const createMessage = async (chatId, sender, recipient, content) => {
    let existedChat = parseInt(chatId) !== -1 ? await Chat.findById(chatId) : null;
    if(!existedChat) {
        const newChat = new Chat({ type: 'private' });
        existedChat = await newChat.save();

        const newParticipantSender = new ChatParticipant({ chat: newChat._id, user: sender });
        await newParticipantSender.save();

        const newParticipantRecipient = new ChatParticipant({ chat: newChat._id, user: recipient });
        await newParticipantRecipient.save();
    }

    const newMessage = new Message({ chat: existedChat._id, sender, content });
    return await newMessage.save();
}



export const deleteMessage = async (id) => {
    await Message.findByIdAndDelete(id);
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