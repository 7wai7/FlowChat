import mongoose from "mongoose";
const ObjectId = mongoose.Schema.Types.ObjectId;

const messageSchema = new mongoose.Schema({
    chat: { type: ObjectId, ref: "ChatConnection", required: true },
    sender: { type: ObjectId, ref: "User", required: true },
    content: { type: String, maxlength: 3000 },
    fileUrl: { type: String }
}, {
    timestamps: true
});

export default mongoose.model('Message', messageSchema);