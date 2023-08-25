const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');
const { PLATFORM_TYPE_STAKING_IDO, PLATFORM_TYPE_STAKING_IGO, PLATFORM_TYPE_FARMING_IDO, TX_TYPE_BUY_IGO, TX_TYPE_CLAIM_IGO, TX_TYPE_DEPOSIT, TX_TYPE_REFUND, TX_TYPE_SWAP, TX_TYPE_WITHDRAW, TX_STATUS_SUCCESS, TX_STATUS_FAIL, TX_TYPE_LOCK } = require("../config");


module.exports = (connection, autoIncrement) => {

  const TransactionSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: [TX_TYPE_BUY_IGO, TX_TYPE_LOCK, TX_TYPE_CLAIM_IGO, TX_TYPE_DEPOSIT, TX_TYPE_REFUND, TX_TYPE_SWAP, TX_TYPE_WITHDRAW],
    },
    platform: {
      type: String,
      enum: [PLATFORM_TYPE_STAKING_IDO, PLATFORM_TYPE_STAKING_IGO, PLATFORM_TYPE_FARMING_IDO],
    },
    project: {
      type: Number,
      ref: "Project",
    },
    amount: Number,
    coin: {
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
      enum: [TX_STATUS_SUCCESS, TX_STATUS_FAIL],
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