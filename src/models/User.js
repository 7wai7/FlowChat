import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    login: { type: String, required: true, unique: true, minlength: 3, maxlength: 16 },
    email: { type: String, required: true, unique: true,
        validate: {
            validator: function(value) {
                return isEnableEmail(value);
            },
            message: "Email is not valid"
        }
    },
    password: { type: String, required: true, minlength: 4, maxlength: 12 },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    about: { type: String, maxlength: 2000 }
}, {
    timestamps: true
});

export function isEnableEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Хешування пароля перед збереженням
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);