const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');


module.exports = (connection, autoIncrement) => {

  const TransactionSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ["Deposit", "Withdraw", "Swap", "Server Error"],
    },
    platform: {
      type: String,
      enum: ["IDO Staking", "IGO Staking", "INO"],
    },
    project: {
      type: Number,
      ref: "Project",
    },
    amount: Number,
    Coin: {
      type: Number,
      ref: "Coin",    
    },
    paymentMethod: {
      type: String,
      enum: ["Stripe", "Paypal", "Crypto"],
    },
    chain: {
      type: Number,
      ref: "Chain",
    },
    status: {
      type: String,
      enum: ["Pending", "Canceled", "Success", "Server Error"],
    },
    hash: String,
    user: {
      type: Number,
      ref: "User",
    }
  });
  
  TransactionSchema.plugin(timestamps);
  TransactionSchema.plugin(autoIncrement.plugin, "Transaction")  

  const Transaction = connection.model(
    "Transaction",
    TransactionSchema
  );

  return Transaction;
}