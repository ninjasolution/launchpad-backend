const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const CoinSchema = new mongoose.Schema({
    name: {
      type: String,
    },
    address: {
      type: String,
    },
    chain: {
      type: Number,
      ref: "Chain"
    }
  });
  
  CoinSchema.plugin(autoIncrement.plugin, "Coin")  

  const Coin = connection.model(
    "Coin",
    CoinSchema
  );

  return Coin;
}