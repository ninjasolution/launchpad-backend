const db = require("../models");
const Chain = db.chain;
const config = require("../config/index")

exports.list = (req, res) => {
    Chain.find()
      .exec((err, chains) => {
  
        if (err) {
          res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
          return;
        }
  
        if (!chains) {
          return res.status(404).send({ message: config.RES_MSG_DATA_NOT_FOUND });
        }
  
        return res.status(200).send({
          message: config.RES_MSG_DATA_FOUND,
          data: chains,
          status: config.RES_STATUS_SUCCESS,
        });
      })
  };
  
  exports.update = (req, res) => {
    Chain.updateOne({ _id: req.params.id }, { name: req.body.name })
      .exec((err, chain) => {
  
        if (err) {
          res.status(500).send({ message: err, status: config.RES_MSG_UPDATE_FAIL });
          return;
        }
  
        return res.status(200).send({
          message: config.RES_MSG_UPDATE_SUCCESS,
          data: chain,
          status: config.RES_STATUS_SUCCESS,
        });
      })
  };
  
  
  exports.delete = (req, res) => {
    Chain.deleteOne({ _id: req.params.id })
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
    const chain = new Project(req.body);
    chain.save(async (err, chain) => {
        if (err) {
            console.log(err)
            return res.status(400).send({ message: err, status: "errors" });
        }

        return res.status(200).send({
            message: config.RES_MSG_SAVE_SUCCESS,
            data: chain,
            status: config.RES_STATUS_SUCCESS,
        });
    });
}
