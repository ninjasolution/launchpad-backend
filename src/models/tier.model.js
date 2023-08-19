const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const TierSchema = new mongoose.Schema({
    label: {
      type: Number,
    },
    level: {
      type: Number,
    },
    minAmount: {
      type: String,
    },
    maxAmount: {
      type: String,
    },
    duration: {
      type: Number,
    },
    percent: {
      type: String
    }
  });
  
  TierSchema.plugin(autoIncrement.plugin, "Tier")  

  const Tier = connection.model(
    "Tier",
    TierSchema
  );

  return Tier;
}