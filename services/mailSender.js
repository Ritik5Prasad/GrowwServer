const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const fs = require("fs");
const inlineCss = require("inline-css");

module.exports.mailSender = async (email, otp, otp_type) => {
  let htmlContent = fs.readFileSync("otp_template.html", "utf8");
  htmlContent = htmlContent.replace("groww_otp", otp);
  htmlContent = htmlContent.replace("groww_otp2", otp);
  const options = { url: " " };
  htmlContent = await inlineCss(htmlContent, options);
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let result = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Groww Clone",
      html: htmlContent,
    });

    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

module.exports.generateOtp = async () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
};
