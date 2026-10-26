const express = require("express");
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");

const router = express.Router();

// ========================================
// Authentication Middleware
// ========================================
async function requireAuth(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to access this resource",
      });
    }

    const user = await User.findById(userId).select("_id");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid. Please sign in again",
      });
    }

    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
}

// ========================================
// CREATE Medical Profile
// POST /api/patients
// Login required
// ========================================
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      bloodGroup,
      allergies,
      medicalConditions,
      medications,
      emergencyContacts,
    } = req.body;

    if (typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    const patient = await Patient.create({
      owner: req.userId,
      fullName: fullName.trim(),
      dateOfBirth,
      bloodGroup,
      allergies,
      medicalConditions,
      medications,
      emergencyContacts,
    });

    return res.status(201).json({
      success: true,
      message: "Patient profile created successfully",
      patient,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient profile data",
      });
    }

    console.error("Patient creation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create patient profile",
    });
  }
});

// ========================================
// GET MY Medical Profiles
// GET /api/patients/my
// Login required
// ========================================
router.get("/my", requireAuth, async (req, res) => {
  try {
    const patients = await Patient.find({
      owner: req.userId,
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("Patient list failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve your profiles",
    });
  }
});

// ========================================
// UPDATE Medical Profile
// PUT /api/patients/:medicalId
// Login required; owner only
// ========================================
router.put("/:medicalId", requireAuth, async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      bloodGroup,
      allergies,
      medicalConditions,
      medications,
      emergencyContacts,
    } = req.body;

    if (
      fullName !== undefined &&
      (typeof fullName !== "string" || !fullName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name cannot be empty",
      });
    }

    // Allow only approved fields.
    // medicalId and owner cannot be changed through this endpoint.
    const updates = {};

    if (fullName !== undefined) {
      updates.fullName = fullName.trim();
    }

    if (dateOfBirth !== undefined) {
      updates.dateOfBirth = dateOfBirth;
    }

    if (bloodGroup !== undefined) {
      updates.bloodGroup = bloodGroup;
    }

    if (allergies !== undefined) {
      updates.allergies = allergies;
    }

    if (medicalConditions !== undefined) {
      updates.medicalConditions = medicalConditions;
    }

    if (medications !== undefined) {
      updates.medications = medications;
    }

    if (emergencyContacts !== undefined) {
      updates.emergencyContacts = emergencyContacts;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid profile fields provided for update",
      });
    }

    const patient = await Patient.findOneAndUpdate(
      {
        medicalId: req.params.medicalId,
        owner: req.userId,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-__v");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Medical profile not found in your account",
      });
    }

    return res.json({
      success: true,
      message: "Medical profile updated successfully",
      patient,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient profile data",
      });
    }

    console.error("Patient update failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update patient profile",
    });
  }
});

// ========================================
// DELETE Medical Profile
// DELETE /api/patients/:medicalId
// Login required; owner only
// ========================================
router.delete("/:medicalId", requireAuth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({
      medicalId: req.params.medicalId,
      owner: req.userId,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Medical profile not found in your account",
      });
    }

    return res.json({
      success: true,
      message: "Medical profile deleted successfully",
    });
  } catch (error) {
    console.error("Patient deletion failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not delete medical profile",
    });
  }
});

// ========================================
// PUBLIC Emergency QR Endpoint
// GET /api/patients/:medicalId
// Returns emergency-relevant fields only
// ========================================
router.get("/:medicalId", async (req, res) => {
  try {
    const patient = await Patient.findOne({
      medicalId: req.params.medicalId,
    }).select(
      "medicalId fullName bloodGroup allergies medicalConditions medications emergencyContacts"
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.json({
      success: true,
      patient,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid medical ID",
      });
    }

    console.error("Emergency profile lookup failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve emergency information",
    });
  }
});

module.exports = router;
