const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const ProposalSchema = new mongoose.Schema({
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    webUrl: {
      type: String,
    },
    images: {
      type: [],
    },
  });
  
  ProposalSchema.plugin(autoIncrement.plugin, "Proposal")  

  const Proposal = connection.model(
    "Proposal",
    ProposalSchema
  );

  return Proposal;
}