const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require("bcryptjs");
const cors = require("cors");
var logger = require('morgan');
var path = require('path');
const bodyParser = require("body-parser");
const { securityCode, SUPERADMIN } = require("./src/config")

require('dotenv').config();

const indexRouter = require('./src/routes');
const app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: securityCode,
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}))
app.set("view engine", "ejs")
var allowedOrigins = ['*'];


app.use(cors());

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', "*");
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method == 'OPTIONS') {
    res.status(200).end()
    return;
  }
  // Pass to next layer of middleware
  next();
});


app.get("/api/check", (req, res) => {
  return res.send("Welcome to launchpad API: updated 10/2");
});
app.use('/api', indexRouter);



const db = require("./src/models");
const Role = db.role;
const User = db.user;
const Chain = db.chain;
const Coin = db.coin;
const Country = db.country;
const Tier = db.tier;
const Category = db.category;

db.connection.on("open", () => {
  console.log("Successfully connect to MongoDB.");
  initial();
})
db.connection.on("error", (err) => {
  console.error("Connection error", err);
  process.exit();
})

const source = require("./src/config/static.source")

function initial() {
  Role.estimatedDocumentCount(async (err, count) => {
    if (!err && count === 0) {

      for (let i = 0; i < db.ROLES.length; i++) {
        let role = new Role({
          name: db.ROLES[i]
        })
        await role.save();
      }


      Role.findOne({ name: SUPERADMIN }, (err, role) => {
        if (err) {
          return;
        }
        const adminUser = new User({
          username: 'admin',
          email: 'admin@gmail.com',
          wallet: "0x7B7887059860a1A21f3C62542B6CE5c0a23c76d5",
          password: bcrypt.hashSync("admin", 8),
          phoneVerified: true,
          emailVerified: true,
          status: 1,
          role: role._id,
          enabled: true
        })

        adminUser.save(err => {
          if (err) {
            return console.log(err);
          }

          console.log("Database is initialized successfuly!")
        });
      });

    }
  });


  Chain.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {

      source.chains.forEach((item) => {
        new Chain({
          name: item.name,
          chainID: item.id,
          RPC: item.RPC,
          explorer: item.explorer,
        }).save((err, chain) => {
          if (err) {
            console.log("error", err);
          }

          let coins = source.coins.filter(coin => item.name == coin.chain);
          coins.forEach((coin) => {
            new Coin({
              name: coin.name,
              address: coin.address,
              chain: chain._id
            }).save(err => {
              if (err) {
                console.log("error", err);
              }
            });  
          })
        });
      })
    }
  })


  Country.estimatedDocumentCount(async (err, count) => {
    if (!err && count == 0) {

      source.countries.forEach(async item => {
        const country = new Country({
          name: item.name,
          code: item.code,
          timezone: item.timezone,
          utc: item.utc,
          mobileCode: item.mobileCode,
        });
        await country.save();
      })
    }
  });

  Tier.estimatedDocumentCount(async (err, count) => {
    if (!err && count == 0) {

      source.tiers.forEach(async item => {
        const tier = new Tier({
          minAmount: item.minAmount,
          maxAmount: item.maxAmount,
          percent: item.percent,
          duration: item.duration,
          weight: item.weight,
          label: item.id
        });
        await tier.save();
      })
    }
  });

  Category.estimatedDocumentCount(async (err, count) => {
    if (!err && count == 0) {

      source.categories.forEach(async item => {
        const category = new Category({
          name: item.name,
        });
        await category.save();
      })
      console.log("category has been stored!")
    }
  });


}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});


//nodemon index.js mongod --dbpath=./db
//pm2 start index.js