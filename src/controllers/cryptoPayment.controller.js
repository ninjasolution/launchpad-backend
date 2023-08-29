const axios = require('axios').default;
const db = require("../models");
const Transaction = db.transaction;
const User = db.user;
const service = require('../service');
const { requestBotAPI } = require('../helpers');

exports.index = (req, res, next) => {

    Transaction.find({}, {}, { sort: { 'createdAt' : -1 } }, function(err, transactions) {
        if(err) {
          return res.status(200).send(err);
        }
        return res.status(200).json(transactions);
    });
}

exports.payment = async (req, res, next) => {
   
    User.findOne({_id: req.userId}, {}, async function(err, user) {
        if(err) {
            return res.status(200).send({amount: 0, message: err, status: "errors"});
        }
        const unFinishedCount = await Transaction.count({user: req.userId, status: "Pending"});
        if(unFinishedCount > 13) {
            return res.status(200).send({amount: 0, message: "Limited Transaction count", status: "errors"});
        }
        const network = req.body.network;
        const token = req.body.token;

        const transaction = await new Transaction({
            user: req.userId,
            type: "Deposit",
            status: "Pending",
            amount: settings.packages[req.body.package].priceUSD - settings.packages[req.body.package].fee ,
            currency: req.body.token.toUpperCase(),
            paymentMethod: "Crypto",
            network: req.body.network,
        }).save();

        const intervalID = setInterval(async () => {

            if(network !== "BTC") {
                
                try {
                    if(settings.nativeCoins.includes(token)) {
                        const balance = await service.getEVMBalance(req.body.network, user.evmAddress);
                        const price = await getPrice(`${token}`);
                        const amount = settings.packages[req.body.package].priceUSD / price;
                        if(balance > 0 && balance >= amount) {
                            clearInterval(intervalID);
                            const hash = await service.EVMwithdraw(user, req.body.network, user.evmPrivateKey);
                            return savePayment(user, req, res, `${settings.explorders[network]}/${hash.blockHash}`, transaction);
                        }
                    }else {
                        const balance = await service.getEVMTokenBalance(req.body.network, settings.tokens[network][token], user.evmAddress);
                        
                        if(balance > 0 && balance >= settings.packages[req.body.package].priceUSD) {
                            clearInterval(intervalID);
                            const hash = await service.EVMTokenwithdraw(user, req.body.network, settings.tokens[network][token], user.evmPrivateKey);
                        
                            return savePayment(user, req, res, `${settings.explorders[network]}/${hash.blockHash}`, transaction);
                        }
                    }

                }catch (err){
                    clearInterval(intervalID);
                    return res.status(200).send({message: "An error occured", status: "errors"});
                }

            }else {
                try {
                    const balance = await service.getBTCBalance(req.body.network, token, user.btcAddress);
                    const price = await getPrice(`${token}`);
                    const amount = settings.packages[req.body.package].priceUSD / price;
                    if(balance > 0 && balance >= amount) {
                        clearInterval(intervalID);
                        await service.BTCwithdraw(user.btcPrivateKey, user.btcAddress);
                        return savePayment(user, req, res, null, transaction);
                    }
                }catch (err){
                  return res.status(200).send({message: "An error occured", status: "errors"});
                }
            }
        }, 10000)

        setTimeout(() => {
            clearInterval(intervalID);
            return res.status(200).send({message: "order is expired", status: "errors"});
        }, settings.paymentExpire)
        
    });
}

const getPrice = async (symbol) => {
    const requestopts = {
        convert: "USD",
        headers: {
          "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY
        },
      };
      
    const res = await  axios
    .get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
      requestopts
    )

    // return res.data.data[symbol].quote.USD.price;
    return 300000;
}

const savePayment = async (user, req, res, hash, transaction) => {
    var status = "Success";
    try {
        var data = JSON.stringify({
            userId: 2250,
            authCode: "1ee9394573062b6dbe275d9c570d52f4",
            amount: settings.packages[req.body.package].priceUSD - settings.packages[req.body.package].fee ,
        });

        await requestBotAPI("post", "deposit", data)
    }catch (error) {
        status = "Server Error"
        return res.status(200).send({message: "An error occured", status: "errors"});
    }
    transaction.hash = hash;
    transaction.status = status;
    transaction.save(async (err, transaction) => {
        if (err) {
            console.log("error", err);
        }
        
        user.transactions.push(transaction)
        user.enabled = true;
        await user.save();
        return res.status(200).send({amount: settings.packages[req.body.package].depositAmountUSD, package: req.body.package, status: "success"});
    });
}