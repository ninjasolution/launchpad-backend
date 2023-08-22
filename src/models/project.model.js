const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');
const mongoosePaginate = require('mongoose-paginate-v2');

module.exports = (connection, autoIncrement) => {

  const ProjectSchema = new mongoose.Schema({
    projectName: {
      type: String,
      min: 3,
      max: 35,
    },
    token: {
      type: Object
    },
    csv: {
      type: String,
    },
    description: {
      type: String
    },
    webUrl: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    socialUrl: {
      type: Object,
      default: {}
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    inoLaunchDate: {
      type: Date
    },
    teams: {
      type: Object,
      default: []
    },
    inGameFeatures: {
      type: Object,
      default: {}
    },
    openStatus: {
      type: String
    },
    enable: {
      type: Boolean,
      default: false
    },
    status: {
      type: String
    },
    price: {
      type: Number,
    },
    grandTotal: {
      type: Number,
    },
    rootHash: {
      type: String,
    },
    chain: {
      type: Number,
      ref: "Chain"
    },
    paymentCoin: {
      type: Number,
      ref: "Coin"
    },
    funding: {
      type: Object
    },
    vesting: {
      type: Object
    },
    igo: {
      type: Object
    },
    staking: {
      type: Object
    },
    snapshot: {
      type: Object
    },
    allocations: [{
      type: Object
    }],
    collections: [{
      type: Number,
      ref: "Collection",
    }],
    createdBy: {
      type: Number,
      ref: "User",
    }
  });
  
  ProjectSchema.plugin(timestamps);
  ProjectSchema.plugin(mongoosePaginate);
  ProjectSchema.plugin(autoIncrement.plugin, "Project")  

  const Project = connection.model(
    "Project",
    ProjectSchema
  );

  return Project;
}