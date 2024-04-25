const User = require("../../models/User");
const OTP = require("../../models/Otp");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError } = require("../../errors");
const { generateOtp } = require("../../services/mailSender");
const jwt = require("jsonwebtoken");

const verifyOtp = async (req, res) => {
  const { data, email, otp, otp_type } = req.body;

  if (!email || !otp || !otp_type) {
    throw new BadRequestError("Invalid body for request");
  } else if (otp_type != "email" && !data) {
    throw new BadRequestError("Invalid body for request");
  }

  const otpRecord = await OTP.findOne({ email, otp_type })
    .sort({ createdAt: -1 })
    .limit(1);

  if (!otpRecord) {
    throw new BadRequestError("Invalid OTP or OTP expired");
  }
  const isVerified = await otpRecord.compareOTP(otp);
  if (!isVerified) {
    throw new BadRequestError("Invalid OTP or OTP expired");
  }
  await OTP.findByIdAndDelete(otpRecord.id);

  switch (otp_type) {
    case "phone":
      await User.findOneAndUpdate({ email }, { phone_number: data });
      break;
    case "email":
      break;
    case "reset_pin":
      if (!data || data.length != 4) {
        throw new BadRequestError("PIN Should be 4 Digit");
      }
      await User.updatePIN(email, data);
      break;
    case "reset_password":
      await User.updatePassword(email, data);
      break;
    default:
      throw new BadRequestError("Invalid OTP Request type");
  }

  const user = await User.findOne({ email });

  if (otp_type == "email" && !user) {
    const register_token = jwt.sign(
      { email: email },
      process.env.REGISTER_SECRET,
      {
        expiresIn: process.env.REGISTER_SECRET_EXPIRY,
      }
    );
    res.status(StatusCodes.OK).json({
      msg: "OTP Verified and operation completed successfully",
      register_token: register_token,
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    msg: "OTP Verified and operation completed successfully",
  });
};

const sendOtp = async (req, res) => {
  const { email, otp_type } = req.body;
  if (!email || !otp_type) {
    throw new BadRequestError("Invalid body for request");
  }

  const user = await User.findOne({ email });

  if(!user){
    throw new BadRequestError("User not found");
  }

  if (otp_type == "email" && user) {
    throw new BadRequestError("User already exist");
  }
  if (otp_type == "phone" && user.phone_number) {
    throw new BadRequestError("Phone number already exist!");
  }

  const otp = await generateOtp();
  const otpPayload = { email: email, otp: otp, otp_type: otp_type };
  await OTP.create(otpPayload);

  res.status(StatusCodes.OK).json({
    msg: "OTP Sent to registered email address",
  });
};

module.exports = {
  verifyOtp,
  sendOtp,
};
