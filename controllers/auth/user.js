const User = require("../../models/User");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} = require("../../errors");
const bcrypt = require("bcryptjs");

const updateProfile = async (req, res) => {
  const { name, gender, date_of_birth } = req.body;

  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  const updatedFields = {};
  if (name) updatedFields.name = name;
  if (gender) updatedFields.gender = gender;
  if (date_of_birth) updatedFields.date_of_birth = date_of_birth;

  const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
    new: true,
    runValidators: true,
    select: "-password",
  });

  if (!updatedUser) {
    throw new NotFoundError("User not found");
  }

  res.status(StatusCodes.OK).json({ success: true, data: updatedUser });
};

const setLoginPinFirst = async (req, res) => {
  const { login_pin } = req.body;
  if (!login_pin || login_pin.length != 4) {
    throw new BadRequestError("Bad Request body");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;
  const user = await User.findById(userId);

  if (!user) {
    throw new BadRequestError("User not found");
  }
  if (user.login_pin) {
    throw new BadRequestError("Login PIN Exist! use reset pin");
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPin = await bcrypt.hash(login_pin, salt);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { login_pin: hashedPin },
    {
      new: true,
      runValidators: true,
    }
  );

  const access_token = await jwt.sign(
    { userId: userId },
    process.env.SOCKET_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );

  const refresh_token = await jwt.sign(
    { userId: userId },
    process.env.REFRESH_SOCKET_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
    }
  );
  res.status(StatusCodes.OK).json({
    success: true,
    socket_tokens: {
      socket_access_token: access_token,
      socket_refresh_token: refresh_token,
    },
  });
};

const verifyPin = async (req, res) => {
  const { login_pin } = req.body;
  if (!login_pin || login_pin.length != 4) {
    throw new BadRequestError("Bad Request body");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new BadRequestError("User not found");
  }
  if (!user.login_pin) {
    throw new BadRequestError("Set your PIN First");
  }

  const isVerifyingPin = await user.comparePIN(user, login_pin);

  if (!isVerifyingPin) {
    let message;
    if (user.blocked_until_pin && user.blocked_until_pin > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.blocked_until_pin - new Date()) / (60 * 1000)
      );
      message = `Please try again after ${remainingMinutes} minute(s).`;
    } else {
      const attemptsRemaining = 3 - user.wrong_pin_attempts;

      message =
        attemptsRemaining > 0
          ? `Wrong PIN. ${attemptsRemaining} attempts remaining.`
          : `Wrong PIN limit reached. Try after 30 minute(s).`;
    }
    throw new UnauthenticatedError(message);
  }

  const access_token = await jwt.sign(
    { userId: userId },
    process.env.SOCKET_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );

  const refresh_token = await jwt.sign(
    { userId: userId },
    process.env.REFRESH_SOCKET_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
    }
  );

  res.status(StatusCodes.OK).json({
    success: true,
    socket_tokens: {
      socket_access_token: access_token,
      socket_refresh_token: refresh_token,
    },
  });
};

const getProfile = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  let pinExist = false;
  let phoneExist = false;
  if (user.login_pin) {
    pinExist = true;
  }
  if (user.phone_number) {
    phoneExist = true;
  }
  res.status(StatusCodes.OK).json({
    userId: user.id,
    email: user.email,
    phone_exist: phoneExist,
    name: user.name,
    login_pin_exist: pinExist,
  });
};

module.exports = {
  updateProfile,
  setLoginPinFirst,
  verifyPin,
  getProfile,
};
