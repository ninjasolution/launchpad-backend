const axios = require('axios').default;
const db = require("../models");
const User = db.user;

exports.list = (req, res) => {

    return res.status(200).send({ status: 200, data: [], pagination: { totalPages: 0 } });
}

exports.create = (req, res) => {
    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 8),
    });

    if (req.body.role) {
        Role.findOne({ name: req.body.role }, (err, role) => {
            if (err) {
                return res.status(200).send({ message: err, status: "errors" });
            }

            user.role = role._id;
            user.save(err => {
                if (err) {
                    return res.status(200).send({ message: err, status: "errors" });
                }

                res.send(user);
            });
        }
        );
    } else {
        Role.findOne({ name: SUBADMIN }, (err, role) => {
            if (err) {
                return res.status(200).send({ message: "Role doesn't exist.", status: "errors" });

            }

            user.role = role._id;
            user.save(async (err, nUser) => {
                if (err) {
                    return res.status(200).send({ message: `E11000 duplicate key error collection: users index: email_1 dup key: { email: ${req.body.email}}`, status: "errors" });

                }

                nUser.save(async (err, rUser) => {
                    if (err) {
                        res.status(200).send({ message: err, status: "errors" });
                        return;
                    }

                    var token = jwt.sign({ id: rUser._id }, securityCode, {
                        expiresIn: 86400 // 24 hours
                    });

                    return res.status(200).send({
                        message: "success",
                        token,
                        status: "success",
                    });
                });
            });
        });
    }
}
