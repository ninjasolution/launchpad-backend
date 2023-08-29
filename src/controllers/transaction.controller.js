const db = require("../models");
const config = require("../config/index")
const Transaction = db.transaction;

exports.create = (req, res) => {

  const transaction = new Transaction({
    type: req.body.type,
    platform: req.body.platform,
    project: req.body.project,
    amount: req.body.amount,
    coin: req.body.coin,
    paymentMethod: req.body.paymentMethod,
    chainId: req.body.chainId,
    status: req.body.status,
    hash: req.body.hash,
    user: req.userId,
  })

  if(req.body.project) {
    transaction.project = req.body.project
  }
  if(req.body.hash) {
    transaction.hash = req.body.hash
  }
  

  transaction.save(async (err, _transaction) => {
    if (err) {
      console.log(err)
      res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
      return;
    }


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
        return res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
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
        return res.status(500).send({ message: err, status: config.RES_MSG_UPDATE_FAIL });
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
        return res.status(500).send({ message: err, status: config.RES_MSG_DELETE_FAIL });
      }
      return res.status(200).send({
        message: config.RES_MSG_DELETE_SUCCESS,
        status: config.RES_STATUS_SUCCESS,
      });

    })
};
