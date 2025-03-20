import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  type: { type: String, enum: ['private', 'group'], required: true },
  name: { type: String }, // Назва групового чату (для приватних чатів можна залишити null)
  inviteLink: { type: String }
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);
