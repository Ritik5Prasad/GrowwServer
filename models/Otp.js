const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { mailSender } = require("../services/mailSender");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp_type: {
    type: String,
    required: true,
    enum: ["phone", "email", "reset_password", "reset_pin"],
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5,
  },
});

otpSchema.pre("save", async function (next) {
  if (this.isNew) {
    const salt = await bcrypt.genSalt(10);
    await sendVerificationMail(this.email, this.otp, this.otp_type);
    this.otp = await bcrypt.hash(this.otp, salt);
  }
  next();
});

otpSchema.methods.compareOTP = async function (otp) {
  const isMatch = await bcrypt.compare(otp, this.otp);
  return isMatch;
};

async function sendVerificationMail(email, otp, otp_type) {
  try {
    const mailResponse = await mailSender(email, otp, otp_type);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

module.exports = mongoose.model("OTP", otpSchema);
