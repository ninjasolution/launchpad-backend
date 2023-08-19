const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');


module.exports = (connection, autoIncrement) => {

  const TransactionSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ["Deposit", "Withdraw", "Swap", "Server Error"],
    },
    amount: Number,
    currency: {
      type: String,
      enum: ["USD", "CHF", "EUR", "ETH", "BTC", "BNB", "USDT", "USDC", "BUSD", "AVAX"],    
    },
    paymentMethod: {
      type: String,
      enum: ["Stripe", "Paypal", "Crypto"],
    },
    network: {
      type: String,
      enum: ["BSC", "ETH", "BTC", "Avalanche"],
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