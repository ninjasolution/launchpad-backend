const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');
const mongoosePaginate = require('mongoose-paginate-v2');


module.exports = (connection, autoIncrement) => {

  const CollectionSchema = new mongoose.Schema({
    chain: {
      type: Number,
      ref: "Chain"
    },
    isHideContent: {
      type: Boolean,
      default: false
    },
    hash: String,
    project: {
      type: Number,
      ref: "Project",
    },
    owner: {
      type: Number,
      ref: "User",
    }
  });
  
  CollectionSchema.plugin(timestamps);
  CollectionSchema.plugin(mongoosePaginate);
  CollectionSchema.plugin(autoIncrement.plugin, "Collection")  

  const Collection = connection.model(
    "Collection",
    CollectionSchema
  );

  return Collection;
}