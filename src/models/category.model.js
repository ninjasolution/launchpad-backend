const mongoose = require("mongoose");


module.exports = (connection, autoIncrement) => {

  const CategorySchema = new mongoose.Schema({
    name: {
      type: String,
    }
  });
  
  CategorySchema.plugin(autoIncrement.plugin, "Category")  

  const Category = connection.model(
    "Category",
    CategorySchema
  );

  return Category;
}