const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      unique: true,
    },

    // Password is hashed before it is stored.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    // Store the OTP hash, never the plain OTP.
    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    otpExpiresAt: {
      type: Date,
      required: true,
    },

    // Maximum incorrect verification attempts for the current OTP.
    otpAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Limit OTP email requests within a one-hour window.
    otpRequestCount: {
      type: Number,
      default: 1,
      min: 0,
    },

    otpRequestWindowStart: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

pendingSignupSchema.index(
  { email: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PendingSignup",
  pendingSignupSchema
);