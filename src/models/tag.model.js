const mongoose = require("mongoose");

module.exports = (connection, autoIncrement) => {

  const TagSchema = new mongoose.Schema({
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      default: 0
    },
    maxCap: {
      type: Number,
      default: 0
    },
    allocation: {
      type: Number,
      default: 0
    },
    minAllocation: {
      type: Number,
      default: 0
    },
    maxAllocation: {
      type: Number,
      default: 0
    },
    minSwapLevel: {
      type: Number,
      default: 0
    },
    maxParticipants: {
      type: Number,
      default: 0
    },
    accessType: {
      type: String
    },
    open: {
      type: Boolean,
      default: false
    },
    startAt: {
      type: Number
    },
    endAt: {
      type: Number
    },
    project: {
      type: Number,
      ref: "Project"
    }
  });
  
  TagSchema.plugin(autoIncrement.plugin, "Tag")  

  const Tag = connection.model(
    "Tag",
    TagSchema
  );

  return Tag;
}