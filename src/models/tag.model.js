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
    minAllocation: {
      type: Number,
    },
    maxAllocation: {
      type: Number
    },
    minSwapLevel: {
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
  });
  
  TagSchema.plugin(autoIncrement.plugin, "Tag")  

  const Tag = connection.model(
    "Tag",
    TagSchema
  );

  return Tag;
}