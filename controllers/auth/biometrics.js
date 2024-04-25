const User = require("../../models/User");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../../errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const NodeRSA = require("node-rsa");
const bufferFrom = require("buffer-from");

const uploadBiometric = async (req, res) => {
  const { public_key } = req.body;
  if (!public_key) {
    throw new BadRequestError("provide public key");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { biometricKey: public_key },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(StatusCodes.OK).json({
    msg: "Key Uploaded Successfully",
  });
};

const verifyBiometric = async (req, res) => {
  const { signature } = req.body;
  if (!signature) {
    throw new BadRequestError("provide biometric signature ");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  const user = await User.findById(userId);
  if (!user.biometricKey) {
    throw new BadRequestError("Biometric key does not exist");
  }

  const isVerifyingSignature = await verifySignature(
    signature,
    user.id,
    user.biometricKey
  );

  if (!isVerifyingSignature) {
    throw new UnauthenticatedError("Invalid Signature");
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

  res.status(StatusCodes.OK).json({
    msg: "Key Uploaded Successfully",
  });
};

async function verifySignature(signature, payload, publicKey) {
  const publicKeyBuffer = Buffer.from(publicKey, "base64");
  const key = new NodeRSA();
  const signer = key.importKey(publicKeyBuffer, "public-der");
  const signatureVerified = signer.verify(
    Buffer.from(payload),
    signature,
    "utf8",
    "base64"
  );
  return signatureVerified;
}

module.exports = { uploadBiometric, verifyBiometric };
