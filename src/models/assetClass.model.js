const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');


module.exports = (connection, autoIncrement) => {

  const AssetClassSchema = new mongoose.Schema({
    name: {
      type: String
    }
  });
  AssetClassSchema.plugin(autoIncrement.plugin, "Class")
  AssetClassSchema.plugin(timestamps);

  const AssetClass = connection.model(
    "Class",
    AssetClassSchema
  );
  return AssetClass;
}
