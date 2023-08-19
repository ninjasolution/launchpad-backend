const db = require("../models");
const User = db.user;
const Role = db.role;
const Token = db.token;
const twilio = require('twilio');
const promisify = require('util.promisify');
const nodemailer = require("nodemailer");
const crypto = require("crypto")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const service = require("../service");
const { requestBotAPI } = require("../helpers");
const { securityCode, SUBADMIN, USER, RES_MSG_SUCESS, RES_STATUS_FAIL } = require("../config");

exports.signup = async (req, res) => {

  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8),
  });

  if (req.body.role) {
    Role.findOne({ name: req.body.role }, (err, role) => {
      if (err) {
        return res.status(200).send({ message: err, status: RES_STATUS_FAIL });
      }

      user.role = role._id;
      user.save(err => {
        if (err) {
          return res.status(200).send({ message: err, status: RES_STATUS_FAIL });
        }

        res.send(user);
      });
    }
    );
  } else {
    Role.findOne({ name: SUBADMIN }, (err, role) => {
      if (err) {
        return res.status(200).send({ message: "Role doesn't exist.", status: RES_STATUS_FAIL });

      }

      user.role = role._id;
      user.save(async (err, nUser) => {
        if (err) {
          return res.status(200).send({ message: `E11000 duplicate key error collection: users index: email_1 dup key: { email: ${req.body.email}}`, status: RES_STATUS_FAIL });

        }

        nUser.save(async (err, rUser) => {
          if (err) {
            res.status(200).send({ message: err, status: RES_STATUS_FAIL });
            return;
          }

          var token = jwt.sign({ id: rUser._id }, securityCode, {
            expiresIn: 86400 // 24 hours
          });

          return res.status(200).send({
            message: RES_MSG_SUCESS,
            token,
            status: RES_MSG_SUCESS,
          });
        });
      });
    });
  }
};

exports.signin = async (req, res) => {
  const address = await service.recoverSignature(req.body.nonce, req.body.signature)
  User.findOne({
    wallet: address
  })
    .populate("role", "name")
    .exec((err, user) => {
      if (err) {
        return res.status(200).send({ message: err, status: RES_STATUS_FAIL });
      }

      if (!user) {

        return Role.findOne({ name: USER }, (err, role) => {
          if (err) {
            return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
          }

          if(!role) {
            return res.status(404).send({ message: "Role doesn't exist.", status: RES_STATUS_FAIL });
          }

          const user = new User({
            wallet: address,
            nonce: req.body.nonce,
            role: role._id
          });
          user.save(async (err, nUser) => {
            if (err) {
              return res.status(200).send({ message: `E11000 duplicate key error collection: users index: email_1 dup key: { email: ${req.body.email}}`, status: RES_STATUS_FAIL });
            }
            var token = jwt.sign({ id: nUser._id }, securityCode, {
              expiresIn: 86400 // 24 hours
            });

            return res.status(200).send({
              message: RES_MSG_SUCESS,
              data: {
                _id: nUser._id,
                wallet: nUser.wallet,
                nonce: nUser.nonce,
                role: {name: SUBADMIN},
                token,
              },
              status: true,
            });
          });
        });

      }

      var token = jwt.sign({ id: user._id }, securityCode, {
        expiresIn: 86400 // 24 hours
      });

      return res.status(200).send({
        status: RES_MSG_SUCESS,
        data: {
          _id: user._id,
          wallet: address,
          nonce: req.body.nonce,
          name: user.name,
          email: user.email,
          description: user.description,
          socialUrl: user.socialUrl,
          image: user.image,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          changePasswordAt: user.changePasswordAt,
          passwordtoken: user.resetPasswordToken,
          passwordtokenexp: user.resetPasswordExpires,
          role: user.role,
          token
        }
      });
    });
};

exports.verifyEmail = async (req, res) => {
  try {
    User.findOne({
      _id: req.params.id
    })
      .populate("tokens", "-__v")
      .populate("role", "name")
      .exec(async (err, user) => {
        if (!user) return res.status(200).send({ message: "Not exist user", status: RES_STATUS_FAIL });
        if (user.emailVerified) {
          var token = jwt.sign({ id: user._id }, securityCode, {
            expiresIn: 86400 // 24 hours
          });
          return res.status(200).send({
            status: RES_MSG_SUCESS,
            token,
            data: {
              _id: user._id,
              username: user.username,
              email: user.email,
              emailVerified: user.emailVerified,
              phoneVerified: user.phoneVerified,
              changePasswordAt: user.changePasswordAt,
              passwordtoken: user.resetPasswordToken,
              passwordtokenexp: user.resetPasswordExpires,
              role: user.role,
            }
          });
        }

        const tokens = await Token.find({
          user: req.params.id,
          type: "Email",
        });
        if (tokens.length === 0) return res.status(200).send({ message: "Token doesn't exist", status: RES_STATUS_FAIL });
        if (!tokens.map(t => t.token).includes(req.params.token)) {
          return res.status(200).send({ message: "Incorrect token", status: RES_STATUS_FAIL });
        }

        await User.updateOne({ _id: user._id }, { emailVerified: true });
        await Token.deleteMany({ _id: { $in: tokens.map(t => t._id) } });

        var token = jwt.sign({ id: user._id }, securityCode, {
          expiresIn: 86400 // 24 hours
        });

        return res.status(200).send({
          status: RES_MSG_SUCESS,
          token,
          data: {
            _id: user._id,
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            changePasswordAt: user.changePasswordAt,
            passwordtoken: user.resetPasswordToken,
            passwordtokenexp: user.resetPasswordExpires,
            role: user.role,
          }
        });
      })


  } catch (error) {
    res.status(200).send({ message: "An error occured", status: RES_STATUS_FAIL });
  }
}

exports.verifyPhoneNumber = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) return res.status(200).send({ message: "An error occured", status: RES_STATUS_FAIL });
    if (user.phoneVerified) return res.send({ message: "phone verified sucessfully", status: RES_MSG_SUCESS });

    const token = await Token.findOne({
      user: user._id,
      type: "SMS",
      token: req.params.token,
    });
    if (!token) return res.status(200).send({ message: "An error occured", status: RES_STATUS_FAIL });

    await User.updateOne({ _id: user._id, phoneVerified: true });
    await Token.findByIdAndRemove(token._id);

    res.send({ message: "phone verified sucessfully", status: RES_MSG_SUCESS });
  } catch (error) {
    res.status(200).send({ message: "An error occured", status: RES_STATUS_FAIL });
  }
}

exports.signout = async (req, res) => {
  try {
    req.session = null;
    return res.status(200).send({
      message: "You've been signed out!",
      status: RES_MSG_SUCESS
    });
  } catch (err) {
    res.status(200).send({ message: "An error occured", status: RES_STATUS_FAIL });
  }
};

exports.forgot = async (req, res, next) => {
  const token = (await promisify(crypto.randomBytes)(20)).toString('hex');
  User.findOne({ email: req.body.email }, {}, async function (err, user) {
    if (err) {
      return res.status(200).send({ message: err, status: RES_STATUS_FAIL });
    }
    if (!user) {
      return res.status(200).send({ message: "There is no user with this email", status: RES_STATUS_FAIL });
    }

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;

    const message = `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.
        Please click on the following link, or paste this into your browser to complete the process:
        <a href="http://${req.headers.host}/reset/${token}" target="_blank">link</a>
        If you did not request this, please ignore this email and your password will remain unchanged.</p>`

    try {
      await sendEmail(user.email, "Reset Password", message)

      return res.status(200).send({ resettoken: token, status: RES_MSG_SUCESS });
    } catch {
      return res.status(200).send({ message: "There is no user with this email.", status: RES_STATUS_FAIL });
    }
  })
}

exports.reset = async (req, res) => {
  User.findOne({
    _id: req.userId
  })
    .populate("role", "name")
    .exec((err, user) => {
      if (err) {
        res.status(200).send({ message: "Incorrect id or password", status: RES_STATUS_FAIL });
        return;
      }

      if (!user) {
        return res.status(200).send({ message: "Incorrect id or password", status: RES_STATUS_FAIL });
      }

      if (!(user.resetPasswordExpires > Date.now()) && crypto.timingSafeEqual(Buffer.from(user.resetPasswordToken), Buffer.from(req.params.token))) {
        return res.status(200).send({ message: "Password reset token is invalid or has expired." });
      }

      user.password = req.body.password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = 0;

      user.save(async (err, rUser) => {
        if (err) {
          res.status(200).send({ message: err, status: RES_STATUS_FAIL });
          return;
        }
        const message = `<p>This is a confirmation that the password for your account "${user.email}" has just been changed. </p>`

        await sendEmail(user.email, "Reset Password", message)
        return res.send({ message: `Success! Your password has been changed.`, status: RES_STATUS_FAIL });

      });
    })
}

exports.changePassword = (req, res) => {
  User.findOne({
    _id: req.userId
  })
    .exec((err, user) => {
      if (err) {
        res.status(200).send({ message: err, status: RES_STATUS_FAIL });
        return;
      }

      if (!user) {
        return res.status(200).send({ message: "Incorrect id or password", status: RES_STATUS_FAIL });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(200).send({ message: "Incorrect id or password", status: RES_STATUS_FAIL });
      }

      user.password = req.body.newPassword;
      user.changePasswordAt = Date.now();

      user.save(async (err, rUser) => {
        if (err) {
          res.status(200).send({ message: err, status: RES_STATUS_FAIL });
          return;
        }

        return res.status(200).send({
          status: RES_MSG_SUCESS,
          data: "Password is reseted!"
        });
      })
    });
};

exports.requestEmailVerify = (req, res) => {
  User.findOne({
    _id: req.userId
  })
    .exec(async (err, user) => {
      if (err) {
        res.status(200).send({ message: err, status: RES_STATUS_FAIL });
        return;
      }

      if (!user) {
        return res.status(200).send({ message: "Not exist user", status: RES_STATUS_FAIL });
      }

      let token = await new Token({
        user: user._id,
        type: "Email",
        token: crypto.randomBytes(32).toString("hex"),
      }).save();

      const message = `<p>You requested for email verification, kindly use this <a href="${process.env.BASE_URL}/#/auth/verify/${user._id}/${token.token}" target="_blank">link</a> to verify your email address</p>`
      await sendEmail(user.email, "Verify Email", message);

      return res.status(200).send({ message: "Sucess", status: RES_MSG_SUCESS });
    })
}

exports.requestPhoneVerify = (req, res) => {
  User.findOne({
    _id: req.userId
  })
    .populate("role", "name")
    .exec(async (err, user) => {
      if (err) {
        res.status(200).send({ message: err, status: RES_STATUS_FAIL });
        return;
      }

      if (!user) {
        return res.status(200).send({ message: "Incorrect token", status: RES_STATUS_FAIL });
      }

      await sendSMS(user);
      return res.status(200).send({ message: "Sucess", status: RES_MSG_SUCESS });
    })
}

const sendEmail = async (email, subject, html) => {

  try {

    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS
      },
      port: 465
    })

    await transporter.sendMail({
      from: process.env.USER,
      to: email,
      subject: subject,
      html: html
    })
  } catch {
    return console.log("SMTP server error");
  }

}

const sendSMS = async (user) => {
  try {
    const client = new twilio(process.env.SMS_ID, process.env.SMS_TOKEN);
    const code = getRandomInt(100000, 999999)

    await new Token({
      user: user._id,
      type: "SMS",
      token: code,
    }).save();

    await client.messages
      .create({
        body: `Mr-Tradly security code: ${code}`,
        to: user.phoneNumber, // Text this number
        from: process.env.PHONE_NUMBER, // From a valid Twilio number
      })

  } catch {
    return console.log("SMS server error");
  }

}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}
