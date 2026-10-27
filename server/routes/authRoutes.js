const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { randomInt } = require("crypto");

const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const sendOtpEmail = require("../utils/sendOtpEmail");

const router = express.Router();

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_OTP_REQUESTS = 5;
const MAX_OTP_ATTEMPTS = 5;

// Hash an OTP using SHA-256.
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

// Compare OTP hashes without timing-based string comparison.
const compareOtpHashes = (submittedHash, storedHash) => {
  if (
    typeof submittedHash !== "string" ||
    typeof storedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(submittedHash) ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
};

// Send a newly generated OTP and invalidate it if delivery fails.
const issueOtp = async (pendingSignup) => {
  const otp = String(randomInt(100000, 1000000));

  pendingSignup.otpHash = hashOtp(otp);
  pendingSignup.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  pendingSignup.otpAttempts = 0;

  await pendingSignup.save();

  try {
    await sendOtpEmail({
      email: pendingSignup.email,
      name: pendingSignup.name,
      otp,
    });
  } catch (error) {
    console.error("OTP email delivery failed:", error.message);

    pendingSignup.otpHash = hashOtp(
      crypto.randomBytes(32).toString("hex")
    );
    pendingSignup.otpExpiresAt = new Date(0);

    await pendingSignup.save();

    throw new Error("OTP_EMAIL_FAILED");
  }
};

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be 100 characters or fewer.",
      });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    // Enforce password rules on the server.
    if (
      password.length < 8 ||
      password.length > 25 ||
      Buffer.byteLength(password, "utf8") > 72 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be 8–25 characters and include uppercase, lowercase, a number and a special character.",
      });
    }

    // Do not register an email that already belongs to a user.
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const now = new Date();

    let pendingSignup = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    // Enforce the OTP request limit for this pending signup.
    if (pendingSignup) {
      const windowStart = pendingSignup.otpRequestWindowStart
        ? new Date(pendingSignup.otpRequestWindowStart)
        : new Date(0);

      const windowExpired =
        now.getTime() - windowStart.getTime() >=
        OTP_REQUEST_WINDOW_MS;

      if (windowExpired) {
        pendingSignup.otpRequestCount = 0;
        pendingSignup.otpRequestWindowStart = now;
      }

      if (pendingSignup.otpRequestCount >= MAX_OTP_REQUESTS) {
        return res.status(429).json({
          success: false,
          message:
            "Too many verification requests. Please try again later.",
        });
      }
    }

    // Hash the password before storing the pending registration.
    const passwordHash = await bcrypt.hash(password, 12);

    if (!pendingSignup) {
      pendingSignup = new PendingSignup({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        otpHash: hashOtp(crypto.randomBytes(32).toString("hex")),
        otpExpiresAt: new Date(0),
        otpAttempts: 0,
        otpRequestCount: 1,
        otpRequestWindowStart: now,
      });
    } else {
      pendingSignup.name = normalizedName;
      pendingSignup.passwordHash = passwordHash;
      pendingSignup.otpRequestCount += 1;
    }

    await pendingSignup.save();

    try {
      await issueOtp(pendingSignup);
    } catch (error) {
      return res.status(502).json({
        success: false,
        message:
          "Unable to send the verification email. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent. Please check your email.",
      email: normalizedEmail,
      expiresIn: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A signup request for this email already exists. Please try again.",
      });
    }

    console.error("Signup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not start the signup process.",
    });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !email.trim() ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address and six-digit OTP.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const pendingSignup = await PendingSignup.findOne({
      email: normalizedEmail,
    }).select("+passwordHash +otpHash");

    if (!pendingSignup) {
      return res.status(404).json({
        success: false,
        message: "Signup request not found. Please sign up again.",
      });
    }

    if (pendingSignup.otpExpiresAt.getTime() <= Date.now()) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please sign up again.",
      });
    }

    if (pendingSignup.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please sign up again.",
      });
    }

    const submittedOtpHash = hashOtp(otp);
    const otpIsValid = compareOtpHashes(
      submittedOtpHash,
      pendingSignup.otpHash
    );

    if (!otpIsValid) {
      pendingSignup.otpAttempts += 1;

      if (pendingSignup.otpAttempts >= MAX_OTP_ATTEMPTS) {
        await PendingSignup.deleteOne({ _id: pendingSignup._id });

        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Please sign up again.",
        });
      }

      await pendingSignup.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP. Please try again.",
        attemptsRemaining:
          MAX_OTP_ATTEMPTS - pendingSignup.otpAttempts,
      });
    }

    // Recheck whether an account was created in the meantime.
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: pendingSignup.name,
      email: pendingSignup.email,
      passwordHash: pendingSignup.passwordHash,
    });

    await PendingSignup.deleteOne({ _id: pendingSignup._id });

    return res.status(201).json({
      success: true,
      message: "Email verified. Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify the OTP.",
    });
  }
});

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const pendingSignup = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    if (!pendingSignup) {
      return res.status(404).json({
        success: false,
        message: "Signup request not found. Please sign up again.",
      });
    }

    const now = new Date();

    const windowStart = pendingSignup.otpRequestWindowStart
      ? new Date(pendingSignup.otpRequestWindowStart)
      : new Date(0);

    const windowExpired =
      now.getTime() - windowStart.getTime() >=
      OTP_REQUEST_WINDOW_MS;

    if (windowExpired) {
      pendingSignup.otpRequestCount = 0;
      pendingSignup.otpRequestWindowStart = now;
    }

    if (pendingSignup.otpRequestCount >= MAX_OTP_REQUESTS) {
      return res.status(429).json({
        success: false,
        message:
          "Too many verification requests. Please try again later.",
      });
    }

    // Avoid sending OTPs for emails that have already registered.
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    pendingSignup.otpRequestCount += 1;
    await pendingSignup.save();

    try {
      await issueOtp(pendingSignup);
    } catch (error) {
      return res.status(502).json({
        success: false,
        message:
          "Unable to send the verification email. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent.",
      email: normalizedEmail,
      expiresIn: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not resend the verification code.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Regenerate the session to help prevent session fixation.
    req.session.regenerate((error) => {
      if (error) {
        console.error(
          "Session regeneration error:",
          error.message
        );

        return res.status(500).json({
          success: false,
          message: "Could not start your session.",
        });
      }

      req.session.userId = user._id.toString();

      req.session.save((saveError) => {
        if (saveError) {
          console.error(
            "Session save error:",
            saveError.message
          );

          return res.status(500).json({
            success: false,
            message: "Could not save your session.",
          });
        }

        return res.json({
          success: true,
          message: "Login successful.",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not log in.",
    });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: "You are not logged in.",
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user) {
      return req.session.destroy(() => {
        res.status(401).json({
          success: false,
          message: "Session is invalid. Please log in again.",
        });
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Session check error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify your session.",
    });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not log out.",
      });
    }

    res.clearCookie("connect.sid", {
      path: "/",
    });

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});

module.exports = router;