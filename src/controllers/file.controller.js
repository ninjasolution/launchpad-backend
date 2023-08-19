const fs = require('fs');
const path = require('path')
const multer = require('multer');
const uuid = require('uuid');
const db = require("../models");
const csv = require("csv-parser");
const { RES_STATUS_FAIL, RES_STATUS_SUCCESS, PROJECT_STATUS_FILEHASH, PROJECT_STATUS_SNAPSHOT, RES_MSG_SAVE_SUCCESS, RES_MSG_SAVE_FAIL, PERCENT_DIVISOR } = require('../config');
const { tiers } = require('../config/static.source');
const User = db.user;
const Project = db.project;
const Investment = db.investment;

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, './files');
    },
    filename: (req, file, cb) => {

        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

exports.uploadCVS = upload.single('csv');
exports.uploadAvatar = upload.single('avatar');

exports.csvUploader = (req, res) => {
    User.findOne({ _id: req.userId })
        .populate('role', "name")
        .exec(async (err, user) => {

            if (err) {
                res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                return;
            }

            if (!user) {
                res.status(404).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!req.file) {
                console.log("No file is available!");
                return res.send({
                    success: false
                });

            } else {

                const words = req.file.originalname.split('.');
                const fileType = words[words.length - 1];
                const fileName = uuid.v1() + "." + fileType;

                Project.findOne({ _id: req.body.projectId })
                    .exec(async (err, project) => {
                        if (err) {
                            res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                            return;
                        }

                        if (!project) {
                            res.status(404).send({ message: err, status: RES_STATUS_FAIL });
                        }

                        project.csv = fileName;
                        project.status = PROJECT_STATUS_SNAPSHOT;
                        await project.save()
                        var rows = [];
                        fs.createReadStream(`./files/${req.file.originalname}`)
                        .pipe(csv())
                        .on('data', async (row) => {

                            let tier = tiers.find(item => item.minAmount < row.amount && item.maxAmount > row.amount);

                            rows.push({
                                address: row.address,
                                amount: row.amount,
                                duration: row.duration,
                                percent: tier.percent * PERCENT_DIVISOR,
                                project: project._id
                            })
                        })
                        .on('end', () => {
                          console.log('CSV file successfully processed');
                          Investment.insertMany(rows)
                          .then(() => {
                            return res.status(200).send({status: RES_STATUS_SUCCESS, data: RES_MSG_SAVE_SUCCESS});
                          }).catch(err => {
                            return res.status(500).send({status: RES_STATUS_FAIL, data: RES_MSG_SAVE_FAIL});
                          })
                        });

                    })

            }

        })

}

exports.getWhiteList = (req, res) => {
    var rows = [];
    fs.createReadStream(`./src/files/csv/${req.query.projectId}`)
    .pipe(csv())
    .on('data', async (row) => {

        rows.push({
            address: row.address,
            percent: row.percent
        })
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
      return res.status(200).send({status: RES_STATUS_SUCCESS, data: rows});
    });
}

exports.getFile = (req, res) => {

    var url = path.join(__dirname, '../../files/')
    res.sendFile(`${url}/${req.params.fileName}`);
}

exports.delete = (req, res) => {
    fs.unlink(`./files/${req.params.fileName}`, (err) => {
        if (err) return res.status(200).send(err);
        return res.status(200).send('success');
    })
}


