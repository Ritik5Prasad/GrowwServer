const { StatusCodes } = require("http-status-codes");
const { BadRequestError } = require("../../errors/bad-request");
const Order = require("../../models/Order");
const jwt = require("jsonwebtoken");

const getOrder = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET);
  const userId = decodedToken.userId;

  try {
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password -biometricKey -login_pin",
      })
      .populate({
        path: "stock",
        select: "symbol companyName iconUrl lastDayTradedPrice currentPrice",
      });

    res.status(StatusCodes.OK).json({
      msg: "Orders retrieved successfully!",
      data: orders,
    });
  } catch (error) {
    throw new BadRequestError("Failed to retrieve orders. " + error.message);
  }
};

module.exports = {
  getOrder,
};
