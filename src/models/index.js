const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const autoIncrement = require('mongoose-auto-increment');
const { SUPERADMIN, SUBADMIN, USER } = require('../config');

const db = {};

const options = {
    autoIndex: false, // Don't build indexes
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying IPv6
};

db.mongoose = mongoose;
db.connection = db.mongoose.createConnection(`mongodb://usjkxlgklwmbbp8ssj9k:RzRKELibpVOZjkSNkIO@bixhoxq33cknhojilvm4-mongodb.services.clever-cloud.com:2692/bixhoxq33cknhojilvm4`)
// db.connection = db.mongoose.createConnection(`mongodb://127.0.0.1:27017/launchpad`)
autoIncrement.initialize(db.connection);

db.user = require("./user.model")(db.connection, autoIncrement);
db.role = require("./role.model")(db.connection, autoIncrement);
db.transaction = require("./transaction.model")(db.connection, autoIncrement);
db.token = require("./token.model")(db.connection, autoIncrement);
db.project = require("./project.model")(db.connection, autoIncrement);
db.collection = require("./collection.model")(db.connection, autoIncrement);
db.chain = require("./chain.model")(db.connection, autoIncrement);
db.coin = require("./coin.model")(db.connection, autoIncrement);
db.country = require("./country.model")(db.connection, autoIncrement);
db.whiteList = require("./whiteList.model")(db.connection, autoIncrement);
db.tier = require("./tier.model")(db.connection, autoIncrement);
db.nonce = require("./nonce.model")(db.connection, autoIncrement);
db.tag = require("./tag.model")(db.connection, autoIncrement);
db.category = require("./category.model")(db.connection, autoIncrement);
db.proposal = require("./proposal.model")(db.connection, autoIncrement);
db.comment = require("./comment.model")(db.connection, autoIncrement);
db.class = require("./assetClass.model")(db.connection, autoIncrement);


db.ROLES = [SUPERADMIN, SUBADMIN, USER]

module.exports = db;