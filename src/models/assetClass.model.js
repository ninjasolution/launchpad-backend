const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const AssetClassSchema = new mongoose.Schema({
    name: {
      type: String
    }
  });
  AssetClassSchema.plugin(autoIncrement.plugin, "Class")

  const AssetClass = connection.model(
    "Class",
    AssetClassSchema
  );
  return AssetClass;
}
