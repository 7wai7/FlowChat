import mongoose from "mongoose";
const ObjectId = mongoose.Schema.Types.ObjectId;

const chatConnectionSchema = new mongoose.Schema({
    user1: { type: ObjectId, ref: "User", required: true },
    user2: { type: ObjectId, ref: "User", required: true },
    group: { type: ObjectId, ref: "Group", default: null },
}, {
    timestamps: true
});

// Унікальний індекс для уникнення дублікатів
chatConnectionSchema.index(
    { user1: 1, user2: 1, group: 1 },
    { unique: true }
);

// Перед збереженням впорядковуємо user1 і user2
chatConnectionSchema.pre("validate", function(next) {
    if (this.user1.toString() > this.user2.toString()) {
        [this.user1, this.user2] = [this.user2, this.user1]; // Міняємо місцями
    }
    next();
});

export default mongoose.model('ChatConnection', chatConnectionSchema);
