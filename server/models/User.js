import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    // Deterministic color used for live cursors / presence avatars
    color: {
      type: String,
      default: function () {
        const palette = [
          "#F14C4C", "#3FB950", "#58A6FF", "#D29922",
          "#BC8CFF", "#39C5CF", "#F778BA", "#FF7B72",
        ];
        return palette[Math.floor(Math.random() * palette.length)];
      },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    color: this.color,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
