const db = require("../models");
const Transaction = db.transaction;

exports.index = (req, res, next) => {

    const options = {}
    options._id = req.userId;
    if(req.body.type) {
        options.type = req.body.type;
    }
    if(req.body.currency) {
        options.currency = req.body.currency;
    }
    if(req.body.paymentMethod){
        options.paymentMethod = req.body.paymentMethod;
    }
    if(req.body.network) {
        options.network = req.body.network;
    }

    Transaction.find(options, {}, { sort: { 'createdAt' : -1 } }, function(err, transactions) {
        if(err) {
          return res.status(200).send({message: err, status: "errors"});
        }
        return res.status(200).json(transactions);
    });
}

