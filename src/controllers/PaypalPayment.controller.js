const { requestBotAPI } = require('../helpers');
const db = require("../models");
const Transaction = db.transaction;
const User = db.user;


exports.payment = (req, res) => {
    User.findOne({_id: req.userId}, {}, async function(err, user) {
        if(err) {
          return res.status(200).send({message: err, status: "errors"});
        }

        if(req.body.data.status == "COMPLETED") {
            const _money = Number(req.body.data?.purchase_units[0]?.payments?.captures[0]?.amount?.value);
            return savePayment(user, req.body.data?.purchase_units[0]?.payments?.captures[0].amount?.currency_code, _money - Number(settings.packages[req.body.package].fee) , res);
        } else {
            return res.status(200).send({status: "errors", message: "The payment is fail!"});
        }
        
    })
}

const savePayment = async (user, currency, amount, res) => {
    var status = "Success";

    try {

        var data = JSON.stringify({
            userId: 2250,
            amount: amount,
            authCode: "1ee9394573062b6dbe275d9c570d52f4"
          });
          
        await requestBotAPI("post", "deposit", data)
    }catch (error) {
        status = "Server Error"
        return res.status(200).send({message: "Payment is failed", status: "errors"});
    }
    new Transaction({
        user: user._id,
        type: "Deposit",
        status,
        amount: amount,
        currency: currency.toUpperCase(),
        paymentMethod: "Paypal",

    }).save(async (err, transaction) => {
        
        if (err) {
            console.log("error", err);
        }
        
        user.transactions.push(transaction);
        user.enabled = true;
        await user.save();
        return res.status(200).send({message: amount + " " + currency + " Deposit Successful", status: "success"});
    });
}