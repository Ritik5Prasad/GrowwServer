const express = require("express");
const router = express.Router();
const {
  setPassword,
  login,
  refreshToken,
  logout,
  register,
} = require("../controllers/auth/auth");
const { checkEmail } = require("../controllers/auth/email");
const { verifyOtp, sendOtp } = require("../controllers/auth/otp");
const authenticateUser = require("../middleware/authentication");
const {
  updateProfile,
  setLoginPinFirst,
  verifyPin,
  getProfile,
} = require("../controllers/auth/user");
const { signInWithOauth } = require("../controllers/auth/oauth");
const {
  uploadBiometric,
  verifyBiometric,
} = require("../controllers/auth/biometrics");

router.post("/check-email", checkEmail);
router.post("/register", register);
router.post("/oauth", signInWithOauth);
router.post("/login", login);

router.post("/verify-otp", verifyOtp);
router.post("/send-otp", sendOtp);

router
  .route("/profile")
  .get(authenticateUser, getProfile)
  .put(authenticateUser, updateProfile);
router.post("/set-pin", authenticateUser, setLoginPinFirst);
router.post("/verify-pin", authenticateUser, verifyPin);
router.post("/upload-biometric", authenticateUser, uploadBiometric);
router.post("/verify-biometric", authenticateUser, verifyBiometric);
router.post("/refresh-token", refreshToken);
router.post("/logout", authenticateUser, logout);

module.exports = router;
