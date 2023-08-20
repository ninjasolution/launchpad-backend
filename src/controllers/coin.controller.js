const db = require("../models");
const Coin = db.coin;
const config = require("../config/index")

exports.list = (req, res) => {
    Coin.find({chain: req.query.chainId})
      .exec((err, coins) => {
  
        if (err) {
          res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
          return;
        }
  
        if (!coins) {
          return res.status(404).send({ message: config.RES_MSG_DATA_NOT_FOUND });
        }
  
        return res.status(200).send({
          message: config.RES_MSG_DATA_FOUND,
          data: coins,
          status: config.RES_STATUS_SUCCESS,
        });
      })
  };
  
  exports.update = (req, res) => {
    Coin.updateOne({ _id: req.params.id }, { name: req.body.name })
      .exec((err, coin) => {
  
        if (err) {
          res.status(500).send({ message: err, status: config.RES_MSG_UPDATE_FAIL });
          return;
        }
  
        return res.status(200).send({
          message: config.RES_MSG_UPDATE_SUCCESS,
          data: coin,
          status: config.RES_STATUS_SUCCESS,
        });
      })
  };
  
  
  exports.delete = (req, res) => {
    Coin.deleteOne({ _id: req.params.id })
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
  

exports.create = (req, res) => {
    const coin = new Project(req.body);
    coin.save(async (err, coin) => {
        if (err) {
            console.log(err)
            return res.status(400).send({ message: err, status: "errors" });
        }

        return res.status(200).send({
            message: config.RES_MSG_SAVE_SUCCESS,
            data: coin,
            status: config.RES_STATUS_SUCCESS,
        });
    });
}
