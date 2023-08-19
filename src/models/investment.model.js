const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const InvestmentSchema = new mongoose.Schema({
    address: {
      type: String,
    },
    amount: {
      type: String,
    },
    duration: {
      type: Number,
    },
    percent: {
      type: Number
    },
    project: {
      type: Number,
      ref: "Project"
    }
  });
  
  InvestmentSchema.plugin(autoIncrement.plugin, "Investment")  

  const Investment = connection.model(
    "Investment",
    InvestmentSchema
  );

  return Investment;
}