const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  UnauthenticatedError,
  BadRequestError,
  NotFoundError,
} = require("../errors");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
      unique: true,
    },
    password: {
      type: String,
    },
    name: {
      type: String,
      maxlength: 50,
      minlength: 3,
    },
    login_pin: {
      type: String,
    },
    phone_number: {
      type: String,
      match: [
        /^[0-9]{10}$/,
        "Please provide a 10-digit phone number without spaces or special characters",
      ],
      unique: true,
    },
    date_of_birth: Date,
    biometricKey: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    wrong_pin_attempts: {
      type: Number,
      default: 0,
    },
    blocked_until_pin: {
      type: Date,
      default: null,
    },
    wrong_password_attempts: {
      type: Number,
      default: 0,
    },
    blocked_until_password: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

UserSchema.pre("save", async function () {
  if (this.isModified("login_pin")) {
    const salt = await bcrypt.genSalt(10);
    this.login_pin = await bcrypt.hash(this.login_pin, salt);
  }
});

UserSchema.statics.updatePIN = async function (email, newPin) {
  try {
    const user = await this.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isSamePIN = await bcrypt.compare(newPin, user.login_pin);
    if (isSamePIN) {
      throw new BadRequestError(
        "New PIN must be different from the current PIN"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPIN = await bcrypt.hash(newPin, salt);

    await this.findOneAndUpdate(
      { email },
      { login_pin: hashedPIN, blocked_until_pin: null, wrong_pin_attempts: 0 }
    );

    return { success: true, message: "PIN updated successfully" };
  } catch (error) {
    throw error;
  }
};

UserSchema.statics.updatePassword = async function (email, newPassword) {
  try {
    const user = await this.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestError(
        "New password must be different from the current password"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.findOneAndUpdate(
      { email },
      {
        password: hashedPassword,
        blocked_until_password: null,
        wrong_password_attempts: 0,
      }
    );

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    throw error;
  }
};

UserSchema.methods.createAccessToken = function () {
  return jwt.sign(
    { userId: this._id, name: this.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

UserSchema.methods.createRefreshToken = function () {
  return jwt.sign({ userId: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (this.blocked_until_password && this.blocked_until_password > new Date()) {
    throw new UnauthenticatedError(
      "Invalid Login attempts exceeded. Please try after 30 minutes."
    );
  }

  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  if (!isMatch) {
    this.wrong_password_attempts += 1;
    if (this.wrong_password_attempts >= 3) {
      const blockDuration = 30 * 60 * 1000;
      this.blocked_until_password = new Date(Date.now() + blockDuration);
      this.wrong_password_attempts = 0;
    }

    await this.save();
  } else {
    this.wrong_password_attempts = 0;
    this.blocked_until_password = null;
    await this.save();
  }

  return isMatch;
};

UserSchema.methods.comparePIN = async function comparePIN(candidatePIN) {
  if (this.blocked_until_pin && this.blocked_until_pin > new Date()) {
    throw new UnauthenticatedError("Limit Exceeded,try after 30 minutes.");
  }

  const hashedPIN = this.login_pin;

  const isMatch = await bcrypt.compare(candidatePIN, hashedPIN);

  if (!isMatch) {
    this.wrong_pin_attempts += 1;
    if (this.wrong_pin_attempts > 3) {
      const blockDuration = 30 * 60 * 1000;
      this.blocked_until_pin = new Date(Date.now() + blockDuration);
      this.wrong_pin_attempts = 0;
    }
    await this.save();
  } else {
    this.wrong_pin_attempts = 0;
    this.blocked_until_pin = null;
    await this.save();
  }

  return isMatch;
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
