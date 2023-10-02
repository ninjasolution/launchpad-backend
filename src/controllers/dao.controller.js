const db = require("../models");
const Category = db.category;
const Proposal = db.proposal;
const Comment = db.comment;
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

  if(req.query.status == "active") {
    option.status = {
      $nin: [ config.PROPOSAL_STATUS_CANCELED, config.PROPOSAL_STATUS_DEFEATED, config.PROPOSAL_STATUS_EXECUTED, config.PROPOSAL_STATUS_SUCCEEDED ]
    }
  }

  if(req.query.status == "completed") {
    option.status = {
      $in: [ config.PROPOSAL_STATUS_SUCCEEDED, config.PROPOSAL_STATUS_DEFEATED, config.PROPOSAL_STATUS_EXECUTED ]
    }
  }

  Proposal.find(option)
  .limit(20)
  .populate({path: "category", select: "name"})
  .populate({path: "owner", select: "wallet"})
  .exec(async (err, proposals) => {
    if (err) {
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

exports.update = (req, res) => {
  Proposal.updateOne({proposalId: req.params.proposalId}, {status: req.body.status}, (err, proposal) => {
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


exports.dashboard = (req, res) => {

  Comment.find({"proposal": req.params.proposalId})
  .distinct("user")
  .exec(async (err, users) => {
    if (err) {
      console.log(err)
      return res.status(500).send({ message: err, status: config.RES_STATUS_FAIL });
    }

    if(!users) {
      return res.status(404).send({ message: config.RES_MSG_DATA_NOT_FOUND, status: config.RES_STATUS_FAIL });
    }

    let dashboard = {
      userCount: users.length
    }

    return res.status(200).send({
      message: config.RES_MSG_DATA_FOUND,
      data: dashboard,
      status: config.RES_STATUS_SUCCESS,
    });
  });
}

