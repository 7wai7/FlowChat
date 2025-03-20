import { createCanvas } from "canvas";
import jwt from 'jsonwebtoken';
import fs from "fs/promises";

import Message from "./models/Message.js";
import { User } from "./models/User.js";
import Chat from "./models/Chat.js";
import ChatParticipant from "./models/ChatParticipant.js";
import { matchesGlob } from "path";


export const findChats = async (userId) => {
    const chats = await ChatParticipant.aggregate([
        { 
            $match: { user: userId } 
        },
        {
            $lookup: {
                from: 'chats',
                localField: 'chat',
                foreignField: '_id',
                as: 'chat'
            }
        },
        { $unwind: "$chat" },
        {
            $set: { "chat.user1": "$user" }
        },
        {
            $lookup: {
                from: 'chatparticipants', // Шукаємо всіх учасників цього чату
                let: { chatId: "$chat._id", currentUser: "$user" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } }, // Беремо учасників цього чату
                    { $match: { $expr: { $ne: ["$user", "$$currentUser"] } } }, // Відкидаємо поточного користувача
                    { $limit: 1 } // Нам потрібен тільки один інший користувач
                ],
                as: "otherUser"
            }
        },
        {
            $set: { "chat.user2": { $arrayElemAt: ["$otherUser.user", 0] } } // Додаємо user2
        },
        { $unset: "otherUser" }, // Прибираємо тимчасове поле
        { $replaceRoot: { newRoot: "$chat" } },
        {
            $lookup: {
                from: 'users',
                localField: 'user2',
                foreignField: '_id',
                as: 'user2'
            }
        },
        { $unwind: { path: "$user2", preserveNullAndEmptyArrays: true }},
        {
            $lookup: {
                from: "messages",
                localField: "_id",
                foreignField: "chat",
                as: "lastMessage",
                pipeline: [
                    { $sort: { createdAt: -1 } }, // Сортуємо повідомлення за датою (останнє перше)
                    { $limit: 1 } // Беремо тільки одне (останнє)
                ]
            }
        },
        { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } }, // Залишаємо null, якщо немає повідомлень
        { $sort: { 'lastMessage.createdAt': -1 }}
    ]);

    return chats;
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

export const getGroupLink = async (groupId) => {
    const group = await Chat.findById(groupId);
    return group.inviteLink;
}



export const createMessage = async (chatId, sender, recipient, content, fileUrl) => {
    let existedChat = parseInt(chatId) !== -1 ? await Chat.findById(chatId) : null;
    if(!existedChat) {
        const newChat = new Chat({ type: 'private' });
        existedChat = await newChat.save();

        const newParticipantSender = new ChatParticipant({ chat: newChat._id, user: sender });
        await newParticipantSender.save();

        const newParticipantRecipient = new ChatParticipant({ chat: newChat._id, user: recipient });
        await newParticipantRecipient.save();
    }

    const newMessage = new Message({ chat: existedChat._id, sender, content, fileUrl });
    return await newMessage.save();
}

export const createGroup = async (userId, name) => {
    const newGroup = new Chat({ type: "group", name });
    const token = generateInviteToken(newGroup._id);
    const inviteLink = `http://192.168.0.105:3000/invite/${token}`;
    newGroup.inviteLink = inviteLink;
    
    const newParticipant = new ChatParticipant({ chat: newGroup._id, user: userId, role: "admin" });
    await newParticipant.save();
    return await newGroup.save();
}



export const deleteMessage = async (id, user) => {
    const message = await Message.findById(id);
    if(!message) {
        return { error: "Message not found" };
    }
    if(message.sender.toString() !== user._id.toString()) {
        return { error: "You are not sender" };
    }

    if(message.fileUrl) await safeDelete(`./data${message.fileUrl}`);

    await message.deleteOne();
    return { success: true, deletedMessage: message };
}

export const deleteChat = async (id) => {
    const messages = await Message.find({ chat: id });

    await Promise.all([
        ...messages.map(async (m) => {
            if (m.fileUrl) await safeDelete(`./data${m.fileUrl}`);
        }),
        Message.deleteMany({ chat: id }),
        ChatParticipant.deleteMany({ chat: id }),
        Chat.findByIdAndDelete(id)
    ]);
}

export const leaveGroup = async (id, userId) => {
    const group = await Chat.findById(id);
    if (!group || group.type !== "group") {
        return { status: 404, error: "Group not found" };
    }

    const participant = await ChatParticipant.findOne({ chat: id, user: userId });
    if (!participant) {
        return { error: "You are not a member of this group" };
    }

    await participant.deleteOne();

    const usersInGroup = await ChatParticipant.find({ chat: id });
    if(usersInGroup.length === 0) { // якщо більше нема тут користувачів, видаляєм групу
        await Message.deleteMany({ chat: id }),
        await group.deleteOne();
    }

    return { success: true };
}





async function safeDelete(filePath) {
    try {
        await fs.access(filePath); // Перевіряємо існування
        await fs.unlink(filePath); // Видаляємо, якщо файл є
        console.log(`Deleted: ${filePath}`);
    } catch (err) {
        console.error(`Error removing file: ${filePath}`, err);
    }
}

export const generateInviteToken = (groupId) => {
    return jwt.sign({ groupId }, process.env.GROUP_TOKEN_KEY);
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