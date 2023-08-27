const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp');
const mongoosePaginate = require('mongoose-paginate-v2');
const { PROJECT_VISIBLE_NOT_DEPLOYED, PROJECT_STATUS_UPLOAD } = require("../config");

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
    startAt: {
      type: Number,
    },
    endAt: {
      type: Number,
    },
    inoLaunchAt: {
      type: Number
    },
    teams: {
      type: Object,
      default: []
    },
    inGameFeatures: {
      type: Object,
      default: {}
    },
    visible: {
      type: String,
      default: PROJECT_VISIBLE_NOT_DEPLOYED
    },
    enable: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      default: PROJECT_STATUS_UPLOAD
    },
    price: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      default: 0
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
    vesting: {
      type: Object,
      default: {}
    },
    igo: {
      type: Object,
      default: {}
    },
    staking: {
      type: Object,
      default: {}
    },
    snapshot: {
      type: Object,
      default: {}
    },
    collections: [{
      type: Number,
      ref: "Collection",
    }],
    tags: [{
      type: Number,
      ref: "Tag",
    }],
    curTag: {
      type: Number,
      ref: "Tag"
    },
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