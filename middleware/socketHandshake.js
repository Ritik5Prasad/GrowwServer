const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { UnauthenticatedError, NotFoundError } = require("../errors");

const authenticateSocketUser = async (socket, next) => {
  try {
    const token = socket.handshake.headers.access_token;
    if (!token) {
      throw new UnauthenticatedError("Authentication token not provided");
    }

    const decoded = jwt.verify(token, process.env.SOCKET_TOKEN_SECRET);
    if (!decoded) {
      throw new UnauthenticatedError("Invalid token");
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    socket.user = user;
    next();
  } catch (error) {
    console.log("Socket authentication error:", error.message);
    next(new UnauthenticatedError("Authentication error"));
  }
};

module.exports = authenticateSocketUser;
