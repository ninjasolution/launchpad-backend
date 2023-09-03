const db = require("../models");
const Category = db.category;
const Proposal = db.proposal;
const config = require("../config/index")

exports.categories = (req, res) => {
  Category.find()
    .exec((err, categories) => {

      if (err) {
        res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
        return;
      }

      if (!categories) {
        return res.status(404).send({ message: config.RES_MSG_DATA_NOT_FOUND });
      }

      return res.status(200).send({
        message: config.RES_MSG_DATA_FOUND,
        data: categories,
        status: config.RES_STATUS_SUCCESS,
      });
    })
};

exports.list = (req, res) => {

  let option = {}

  if(req.query.status) {
    option.status = req.query.status;
  }

  Proposal.find(option)
  .populate("category")
  .populate("owner")
  .exec(async (err, proposals) => {
    if (err) {
      console.log(err)
      return res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
    }

    if(!proposals) {
      return res.status(404).send({ message: config.RES_MSG_DATA_NOT_FOUND, status: config.RES_STATUS_FAIL });
    }

    return res.status(200).send({
      message: config.RES_MSG_SAVE_SUCCESS,
      data: proposals,
      status: config.RES_STATUS_SUCCESS,
    });
  });
}


exports.create = (req, res) => {
  let proposal = {
    ...req.body,
    owner: req.userId
  }
  proposal = new Proposal(proposal);
  proposal.save(async (err, proposal) => {
    if (err) {
      console.log(err)
      return res.status(400).send({ message: err, status: config.RES_STATUS_FAIL });
    }

    return res.status(200).send({
      message: config.RES_MSG_SAVE_SUCCESS,
      data: proposal,
      status: config.RES_STATUS_SUCCESS,
    });
  });
}
