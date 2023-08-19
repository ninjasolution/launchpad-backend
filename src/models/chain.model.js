const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const ChainSchema = new mongoose.Schema({
    name: {
      type: String,
    },
    chainID: {
      type: Number
    },
    RPC: {
      type: String
    },
    explorer: {
      type: String
    }
  });
  
  ChainSchema.plugin(autoIncrement.plugin, "Chain")  

  const Chain = connection.model(
    "Chain",
    ChainSchema
  );

  return Chain;
}