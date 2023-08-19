const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const db = require("../models");
const Transaction = db.transaction;
const User = db.user;
const { requestBotAPI } = require('../helpers');
require('dotenv').config();
const stripe = require('stripe')(process.env.ADMIN_STRIPE_SECRET_KEY);

exports.index = (req, res, next) => {
    const fromDate = moment();
    const toDate = moment().add(10, 'years');
    const range = moment().range(fromDate, toDate);

    const years = Array.from(range.by('year')).map(m => m.year());
    const months = moment.monthsShort();

    //return res.render('index', { months, years, message: req.flash() });
    return res.status(200).json({
        months, years
    })
}

exports.payment = async (req, res, next) => {
    

    User.findOne({ _id: req.userId }, {}, async function (err, user) {

        if (err) {
            return res.status(200).send({ message: err, status: "errors" });
        }

        const charge = await createCharge(req.body.token, packages[req.body.package]);
        if (charge && charge.status == 'succeeded') {

            return savePayment(user, req.body.currency, Number(req.body.depositAmount) - Number(settings.packages[req.body.package].fee) , res);

        } else {
            return res.status(200).json({
                message: 'Payment failed.',
                status: "errors"
            });
        }
    })
}

const createCharge = async (tokenId, data) => {
    let charge = {};
    try {
        charge = await stripe.charges.create({
            amount: data.depositAmountUSD,
            currency: "USD",
            source: tokenId,
            description: 'Mr-Tradly payment'
        });
    } catch (error) {
        charge.error = error.message;
    }
    return charge;
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
       
    } catch (error) {
        status = "Server Error";
    }

    new Transaction({
        user: user._id,
        type: "Deposit",
        amount: amount,
        status,
        currency: currency.toUpperCase(),
        paymentMethod: "Stripe",

    }).save(async (err, transaction) => {
        if (err) {
            console.log("error", err);
            return res.status(200).send({ message: err, status: "errors" });
        }

        user.transactions.push(transaction);
        user.enabled = true;
        await user.save();

        if(status === "Success") {
            return res.status(200).send({
                status: "success",
                message: amount + " " + currency.toUpperCase() + " desposit successfully!"
            });
        }else {
            return res.status(500).send({
                status: "false",
                message: status
            });
        }
    });
}
