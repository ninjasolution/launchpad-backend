const db = require("../models");
const config = require("../config/index")
const Transaction = db.transaction;

exports.create = (req, res) => {

  const Transaction = new Transaction({
    type: req.body.type,
    platform: req.body.platform,
    project: req.body.project,
    amount: req.body.amount,
    coin: req.body.coin,
    paymentMethod: req.body.paymentMethod,
    chain: req.body.chain,
    status: req.body.status,
    hash: req.body.hash,
    user: req.body.user,
  })

  Transaction.save(async (err, _transaction) => {
    if (err) {
      res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
      return;
    }

    console.log(_transaction)

    return res.status(200).send({
      message: config.RES_MSG_SAVE_SUCCESS,
      data: _transaction,
      status: config.RES_STATUS_SUCCESS,
    });
  });
}

exports.list = (req, res) => {

  let options = {}
  if(req.query.type) {
    options.type = req.query.type
  }

  Transaction.find()
    .exec((err, projects) => {

      if (err) {
        res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
        return;
      }

      if (!projects) {
        return res.status(404).send({ message: config.RES_MSG_DATA_NOT_FOUND });
      }

      return res.status(200).send({
        message: config.RES_MSG_DATA_FOUND,
        data: projects,
        status: config.RES_STATUS_SUCCESS,
      });
    })
};

exports.update = (req, res) => {
  Transaction.updateOne({ _id: req.params.id }, { name: req.body.name })
    .exec((err, Transaction) => {

      if (err) {
        res.status(500).send({ message: err, status: config.RES_MSG_UPDATE_FAIL });
        return;
      }

      return res.status(200).send({
        message: config.RES_MSG_UPDATE_SUCCESS,
        data: Transaction,
        status: config.RES_STATUS_SUCCESS,
      });
    })
};


exports.delete = (req, res) => {
  Transaction.deleteOne({ _id: req.params.id })
    .exec((err) => {

      if (err) {
        res.status(500).send({ message: err, status: config.RES_MSG_DELETE_FAIL });
        return;
      }
      return res.status(200).send({
        message: config.RES_MSG_DELETE_SUCCESS,
        status: config.RES_STATUS_SUCCESS,
      });

    })
};
