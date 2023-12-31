const mongoose = require("mongoose");
const { PROPOSAL_STATUS_PENDING } = require("../config");
const timestamps = require('mongoose-timestamp');


module.exports = (connection, autoIncrement) => {

  const ProposalSchema = new mongoose.Schema({
    proposalId: {
      type: String,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    webUrl: {
      type: String,
    },
    video: {
      type: String,
    },
    category: {
      type: Number,
      ref: "Category"
    },
    logo: {
      type: String,
    },
    email: {
      type: String,
    },
    images: {
      type: [],
    },
    status: {
      type: Number,
      default: PROPOSAL_STATUS_PENDING,
    },
    hash: {
      type: String,
    },
    owner: {
      type: Number,
      ref: "User"
    },
  });
  
  ProposalSchema.plugin(autoIncrement.plugin, "Proposal")  
  ProposalSchema.plugin(timestamps)  

  const Proposal = connection.model(
    "Proposal",
    ProposalSchema
  );

  return Proposal;
}