import mongoose from "mongoose";
const ObjectId = mongoose.Schema.Types.ObjectId;

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, minlength: 3, maxlength: 16 },
}, {
    timestamps: true
});

export default mongoose.model('Group', groupSchema);