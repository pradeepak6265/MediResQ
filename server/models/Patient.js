const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },
    relationship: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    phone: {
      type: String,
      trim: true,
      required: true,
      maxlength: 20,
    },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    medicalId: {
      type: String,
      unique: true,
      default: () => randomUUID(),
      immutable: true,
    },

    // Account that owns this medical profile
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },

    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value) => !value || value <= new Date(),
        message: "Date of birth cannot be in the future",
      },
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
      default: "Unknown",
    },

    allergies: {
      type: [String],
      default: [],
    },

    medicalConditions: {
      type: [String],
      default: [],
    },

    medications: {
      type: [String],
      default: [],
    },

    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);