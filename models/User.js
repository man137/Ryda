import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    firstName: String,
    lastName: String,

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: String,

    password: {
      type: String,
      select: false,
    },

    profilePic: {
      type: String,
      default: null,
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    googleId: {
      type: String,
      sparse: true,
    },

    // 🔥 IMPORTANT
    accountType: {
      type: String,
      enum: ["user", "owner"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);
