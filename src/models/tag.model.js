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
    },
    maxCap: {
      type: Number,
    },
    allocation: {
      type: Number,
    },
    minAllocation: {
      type: Number,
    },
    maxAllocation: {
      type: Number
    },
    minSwapLevel: {
      type: Number
    },
    maxParticipants: {
      type: Number
    },
    accessType: {
      type: String
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