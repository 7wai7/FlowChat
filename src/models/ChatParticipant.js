import mongoose from 'mongoose';
const ObjectId = mongoose.Schema.Types.ObjectId;

const chatParticipantSchema = new mongoose.Schema({
  chat: { type: ObjectId, ref: 'Chat', required: true }, // Посилання на чат, в якому бере участь користувач
  user: { type: ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' }
}, { timestamps: true });

// Унікальний індекс, який не дозволяє зберігати дублікати для однієї пари чат–користувач,
// користувач не може бути доданий у той самий чат більше одного разу
chatParticipantSchema.index({ chat: 1, user: 1 }, { unique: true });

export default mongoose.model('ChatParticipant', chatParticipantSchema);
