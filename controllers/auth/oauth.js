const User = require("../../models/User");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../../errors");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const jwksClient = require("jwks-rsa");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const jwksClientInstance = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  timeout: 30000,
});

async function getKey(kid) {
  return new Promise((resolve, reject) => {
    jwksClientInstance.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        resolve(key.getPublicKey());
      }
    });
  });
}

const signInWithOauth = async (req, res) => {
  const { provider, id_token } = req.body;

  if (!provider || !id_token || !["google", "apple"].includes(provider)) {
    throw new BadRequestError("Invalid Request");
  }

  try {
    let email, user;

    if (provider === "apple") {
      const { header } = jwt.decode(id_token, { complete: true });
      const kid = header.kid;
      const publicKey = await getKey(kid);
      ({ email } = jwt.verify(id_token, publicKey));
    }

    if (provider === "google") {
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      ({ email } = ticket.getPayload());
    }

    user = await User.findOneAndUpdate(
      { email: email },
      { email_verified: true },
      { upsert: true, new: true }
    );

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();
    let phone_exist = false;
    let login_pin_exist = false;

    if (user.phone_number) {
      phone_exist = true;
    }
    if (user.login_pin) {
      login_pin_exist = true;
    }

    res.status(StatusCodes.OK).json({
      user: {
        name: user.name,
        userId: user.id,
        phone_exist,
        login_pin_exist,
      },
      tokens: { access_token: accessToken, refresh_token: refreshToken },
    });
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid Token or expired");
  }
};

module.exports = { signInWithOauth };
