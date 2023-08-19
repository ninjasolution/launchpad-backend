const { ethers } = require("ethers");
const { SUBADMIN, RES_STATUS_SUCCESS } = require("../config");
const { requestBotAPI } = require("../helpers");
const db = require("../models");
const { getRndInteger } = require("../service");
const User = db.user;
const Role = db.role;
const Nonce = db.nonce;
const Transaction = db.transaction;
const axios = require("axios").default;

exports.create = async (req, res) => {

  const user = new User(req.body);

  if (req.body.role) {
    Role.findOne({ name: req.body.role }, (err, role) => {
      if (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      user.role = role._id;
      user.save(err => {
        if (err) {
          return res.status(200).send({ message: err, status: "errors" });
        }

        return res.status(200).send({ message: err, data: user, status: false });
      });
    }
    );
  } else {
    Role.findOne({ name: SUBADMIN }, (err, role) => {
      if (err) {
        return res.status(200).send({ message: "Role doesn't exist.", status: "errors" });

      }

      user.role = role._id;
      user.save(async (err, nUser) => {
        if (err) {
          return res.status(200).send({ message: `E11000 duplicate key error collection: users index: email_1 dup key: { email: ${req.body.email}}`, status: "errors" });

        }
        var token = jwt.sign({ id: rUser._id }, securityCode, {
          expiresIn: 86400 // 24 hours
        });
        nUser.token = token

        return res.status(200).send({
          message: RES_STATUS_SUCCESS,
          data: nUser,
          status: RES_STATUS_SUCCESS
        });
      });
    });
  }
};

exports.allUsers = (req, res) => {
  User.find()
    .populate('role', "name")
    .exec((err, users) => {

      if (err) {
        res.status(200).send({ message: err });
        return;
      }

      if (!users) {
        return res.status(404).send({ message: "Orders Not found." });
      }

      return res.status(200).send(users);
    })
};


exports.getUser = (req, res) => {
  User.findOne({ _id: req.params.id })
    .populate('role', "name")
    .exec((err, user) => {

      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "User Not found.", status: "errors" });
      }

      return res.status(200).send({ status: RES_STATUS_SUCCESS, data: user });
    })
};

exports.getUsers = (req, res) => {
  Role.findOne({ name: SUBADMIN })
    .populate('users')
    .exec((err, role) => {

      if (err) {
        res.status(200).send({ message: err });
        return;
      }

      if (!role) {
        return res.status(200).send({ message: "Role Not found.", status: "errors" });
      }

      return res.status(200).send({ status: RES_STATUS_SUCCESS, data: role.users });
    })
};

exports.getUserNonce = (req, res) => {
  Nonce.findOne({ wallet: req.params.address })
    .exec(async (err, nonce) => {

      if (err) {
        res.status(200).send({ message: err });
        return;
      }

      if (!nonce) {

        let _nonce = getRndInteger(0, 10000)
        let newNonce = new Nonce({wallet: req.params.address, nonce: _nonce})
        await newNonce.save();

        return res.status(200).json({ status: RES_STATUS_SUCCESS, data: { nonce: _nonce } });
        // return res.status(200).send({ message: "User Not found.", status: "errors" });
      }

      return res.status(200).json({ status: RES_STATUS_SUCCESS, data: {nonce: nonce.nonce} });

    })
};

exports.setRole = (req, res) => {
  User.findOne({ _id: req.params.id })
    .populate('role', "name")
    .exec((err, user) => {

      if (err) {
        res.status(200).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "Orders Not found." });
      }

      Role
        .findOne({ name: req.params.role },
          (err, role) => {
            if (err) {
              return;
            }
            user.role = role._id;
            user.save(err => {
              if (err) {
                return;
              }
              User.findOne({ _id: user._id })
                .populate('role', "name")
                .exec((err, fUser) => {
                  if (err) {
                    res.status(200).send({ message: err });
                    return;
                  }

                  if (!fUser) {
                    return res.status(404).send({ message: "Orders Not found." });
                  }
                  return res.status(200).json(fUser);
                })
            });

          }
        );
    })
};

exports.update = (req, res) => {
  User.findOne({ _id: req.userId })
    .populate('role', "name")
    .exec(async (err, user) => {

      if (err) {
        res.status(200).send({ message: err, status: "errors" });
        return;
      }

      if (!user) {
        return res.status(200).send({ message: "User Not found.", status: "errors" });
      }

      user.name = req.body.name;
      user.email = req.body.email;
      user.description = req.body.description;
      if (req.body.image) {
        user.image = req.body.image;
      }
      user.socialUrl = req.body.socialUrl;

      user.save(err => {
        if (err) {
          return res.status(200).send({ message: err, status: "errors" });
        }
        return res.status(200).json({ status: RES_STATUS_SUCCESS, data: user });
      });
    })
};

exports.delete = (req, res) => {
  User.deleteOne({ _id: req.params.id })
    .exec(() => {
      res.status(200).send(RES_STATUS_SUCCESS);
    })
};


exports.getCSV = (req, res) => {

  User.findOne({ _id: req.params.id })
    .populate('role', "name")
    .exec(async (err, user) => {

      if (err) {

        return res.status(200).send({ message: err, status: "errors" });
      }

      if (!user) {
        return res.status(404).send({ message: "User Not found.", status: "errors" });
      }

      var resStats;
      try {
        resStats = await axios.post(`${process.env.BOT_API}/api/csv`, {
          userId: 2250,
          authCode: "1ee9394573062b6dbe275d9c570d52f4",
          // userId: req.userId,
          // authCode: user.authCode,
        })
      } catch (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      return res.status(200).send({ data: resStats.data });
    })
}

exports.dashboard = (req, res) => {

  User.findOne({ _id: req.userId })
    .populate('role', "name")
    .populate('transactions')
    .exec(async (err, user) => {

      if (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      if (!user) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      try {

        const resStats = await requestBotAPI("get", "stats?userId=2250&authCode=1ee9394573062b6dbe275d9c570d52f4")
        const resCsv = await requestBotAPI("get", "csv?userId=1&authCode=ea66c06c1e1c05fa9f1aa39d98dc5bc1 ")
        const daily_profit = resCsv.data.map(r => ({ date: r.period, profit: r.total_profit }))
        const result = {
          my_balance: resStats.data["current_balance"],
          total_profit: resStats.data["current_balance"],
          last_24h_profit: resStats.data["current_balance"],
          total_currencies: resStats.data["total_currencies"],
          daily_profit,
          enabled: user.enabled,
          deposit_history: user.transactions.filter(t => t.type === "Deposit"),
          withdraw_history: user.transactions.filter(t => t.type === "Withdraw"),
          profile: {
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            phoneVerified: user.phoneVerified,
            address: user.address,
            avatar: user.avatar,
            city: user.city,
            country: user.country,
            zipCode: user.zipCode,
            withdrawAddress: user.withdrawAddress,
            evmAddress: user.evmAddress,
            btcAddress: user.btcAddress,
            apiKey: user.apiKey,
            apiSecret: user.apiSecret,
            enabled: user.enabled,
            referralCode: user.referralCode,
            leaderCode: user.leaderCode,
            role: user.role
          }
        }
        return res.status(200).send({ data: result, status: RES_STATUS_SUCCESS });
      } catch (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

    })
}

exports.checkVerification = (req, res) => {

  User.findOne({ _id: req.userId })
    .exec(async (err, user) => {

      if (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      if (!user) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      try {

        return res.status(200).send({
          message: {
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified
          }, status: RES_STATUS_SUCCESS
        });
      } catch (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

    })
}

exports.getpaymentinfo = (req, res) => {

  User.findOne({ _id: req.userId })
    .exec(async (err, user) => {

      if (err) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      if (!user) {
        return res.status(200).send({ message: err, status: "errors" });
      }

      const result = {
        evmAddress: user.evmAddress,
        btcAddress: user.btcAddress,
        paypalClientID: process.env.ADMIN_PAYPAL_CLIENT_ID,
        stripePublicKey: process.env.ADMIN_STRIPE_PUBLIC_KEY
      }
      return res.status(200).send({ data: result });

    })
}

exports.withdraw = (req, res) => {
  User.findOne({
    _id: req.userId
  })
    .exec(async (err, user) => {
      if (err) {
        res.status(200).send({ message: "Incorrect id or password", status: "errors" });
        return;
      }

      if (!user) {
        return res.status(200).send({ message: "User doesn't exist", status: "errors" });
      }

      if (!user.withdrawAddress) {
        return res.status(200).send({ message: "Please put withdraw address", status: "errors" });
      }

      try {

        var data = JSON.stringify({
          userId: 2250,
          authCode: "1ee9394573062b6dbe275d9c570d52f4",
          amount: req.body.amount
        });

        await requestBotAPI("post", "withdrawal", data)


      } catch (error) {
        return res.status(200).send({ message: "The amount exceeds the total funds", status: "errors" });
      }

      try {

        new Transaction({
          user: user._id,
          type: "Withdraw",
          amount: req.body.amount,
          status: RES_STATUS_SUCCESS,
          paymentMethod: "Crypto"
        }).save(async (err, transaction) => {

          if (err) {
            console.log("error", err);
            return res.status(200).send({ message: err, status: "errors" });
          }

          user.transactions.push(transaction);
          await user.save();
          return res.status(200).send({ message: `${req.body.amount} USDC is withdrawn to ${user.withdrawAddress}`, status: RES_STATUS_SUCCESS });

        });

      } catch (error) {
        return res.status(200).send({ message: error, status: "errors" });
      }
    })

}
