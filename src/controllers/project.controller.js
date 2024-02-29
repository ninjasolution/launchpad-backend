const { ethers } = require("ethers");
const db = require("../models");
const { PROJECT_STATUS_UPLOAD, RES_STATUS_SUCCESS, RES_MSG_SUCESS, RES_STATUS_FAIL, RES_MSG_DATA_NOT_FOUND, PROJECT_STATUS_LOTTERY, RES_MSG_FAIL, PROJECT_STATUS_FILEHASH, PLATFORM_TYPE_INVEST_IGO, PROJECT_STATUS_PENDING, RES_MSG_SAVE_SUCCESS } = require("../config");
const Project = db.project;
const WhiteList = db.whiteList;
const Transaction = db.transaction;
const Tier = db.tier;
const User = db.user;
const Tag = db.tag;
const service = require("../service");

exports.list = (req, res) => {
    var options = {
        sort: { createdAt: -1 },
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        populate: ["createdBy", "paymentCoin", "tags", "curTag", "chain"]
    };

    var condition = {}
    if (req.query.createdBy) {
        condition.createdBy = req.query.createdBy
    } else if (req.query.visible) {
        condition.visible = req.query.visible
    } else if (req.query.enable) {
        condition.enable = req.query.enable
    }

    Project.paginate(condition, options, (err, projects) => {

        if (err) {
            console.log(err)
            res.status(500).send({ message: err });
            return;
        }

        if (!projects) {
            return res.status(404).send({ message: "Project Not found.", status: RES_STATUS_FAIL });
        }

        return res.status(200).send({ status: RES_STATUS_SUCCESS, data: projects });
    })

}

exports.create = async (req, res) => {

    const _project = req.body;
    _project.status = PROJECT_STATUS_PENDING

    let tagCount = req.body.tags.length;
    let tags = [];
    for (let i = 0; i < tagCount; i++) {
        let tag = new Tag(_project.tags[i])
        tag = await tag.save();
        tags.push(tag._id);
    }

    const project = new Project({
        ...req.body,
        tags: tags
    });
    project.save(async (err, _project) => {
        if (err) {
            console.log(err)
            return res.status(400).send({ message: err, status: RES_STATUS_FAIL });
        }

        await Tag.updateMany({ _id: { $in: tags } }, { project: _project._id });

        Project
            .findOne({ _id: _project._id })
            .populate("paymentCoin")
            .populate("createdBy")
            .populate("chain")
            .populate("tags")
            .populate("curTag")
            .exec(async (err, project) => {
                return res.status(200).send({
                    message: RES_MSG_SUCESS,
                    data: project,
                    status: RES_STATUS_SUCCESS,
                });
            })

    });

}

exports.get = async (req, res) => {

    Project
        .findOne({ _id: req.query.projectId })
        .populate("paymentCoin")
        .populate("createdBy")
        .populate("chain")
        .populate("tags")
        .populate("curTag")
        .exec((err, project) => {
            if (err) {
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.getMyProjects = async (req, res) => {

    Transaction.aggregate([{
        $match: { "user": req.userId, platform: PLATFORM_TYPE_INVEST_IGO }
    },
    {
        $group: { _id: "$project", amount: { $sum: '$amount' } }
    }
    ]).exec((err, transactions) => {

        if (err) {
            return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
        }

        if (!transactions) {
            return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
        }

        Project
            .find({ _id: { "$in": transactions.map(item => item._id) } })
            .populate("paymentCoin")
            .populate("createdBy")
            .populate("chain")
            .populate("tags")
            .populate("curTag")
            .exec((err, projects) => {
                if (err) {
                    return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                }

                if (!projects) {
                    return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                }

                return res.status(200).send({
                    message: RES_MSG_SUCESS,
                    data: projects,
                    status: RES_STATUS_SUCCESS,
                });
            })
    })

}

exports.getProof = async (req, res) => {

    let { projectId } = req.params;
    if (!(projectId)) {
        return res.status(200).send({ message: RES_STATUS_FAIL, data: {} });
    }


    WhiteList
        .findOne({ project: projectId, address: req.wallet })
        .exec(async (err, whiteList) => {

            if (err) {
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!whiteList) {

                return res.status(404).send({
                    message: RES_MSG_DATA_NOT_FOUND,
                    status: RES_STATUS_FAIL,
                });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: { proof: whiteList.proof, allocation: whiteList.allocation },
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.pushHash = async (req, res) => {

    Project.findOne({ _id: req.query.projectId })
        .exec((err, project) => {
            if (err) {
                console.log(err)
                return res.status(400).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }
            project.rootHash = req.body.rootHash;
            project.status = PROJECT_STATUS_LOTTERY
            project.save(async (err, project) => {
                if (err) {
                    console.log(err)
                    return res.status(400).send({ message: err, status: RES_STATUS_FAIL });
                }

                return res.status(200).send({
                    message: RES_MSG_SUCESS,
                    data: project,
                    status: RES_STATUS_SUCCESS,
                });
            });
        })

}

exports.update = async (req, res) => {

    try {

        let tagIds = [];
        if (req.body.tags && req.body.tags.length) {
            for (let i = 0; i < req.body.tags.length; i++) {
                let tag = req.body.tags[i];

                if (tag._id) {
                    await Tag.updateOne({ _id: tag._id }, tag)
                } else {
                    let _newTag = new Tag({
                        ...tag,
                        project: req.body._id
                    });
                    tag = await _newTag.save();
                }
                tagIds.push(tag._id);
            }
        }

        let project = {
            ...req.body,
            tags: tagIds
        }

        let oldProject = await Project.findOne({ _id: req.body._id });
        if (oldProject?.curTag != req.body.curTag) {
            let tag = await Tag.findOne({ _id: req.body.curTag })
            if (tag) {

                User.find()
                    .exec(async (err, users) => {

                        if (!err) {
                            try {

                                if (users) {

                                    let allocations = users.map(user => ({
                                        tagId: tag.title,
                                        account: user.wallet,
                                        maxAllocation: service.customParse(tag.maxAllocation),
                                        refundFee: "40",
                                        igoTokenPerPaymentToken: tag.price,
                                    }));

                                    let leaves = service.generateAllocLeaves(allocations)
                                    let { root, proofs } = service.generateMerkleRootAndProof(leaves);

                                    let newList = [];
                                    let count = users.length;
                                    for (let i = 0; i < count; i++) {
                                        newList.push({
                                            address: users[i].wallet,
                                            project: project._id,
                                            allocation: allocations[i],
                                            proof: proofs[i]
                                        })
                                    }

                                    await WhiteList.insertMany(newList);
                                    await Project.updateOne({ _id: req.body._id }, { rootHash: root })

                                }
                            } catch (err) {
                                console.log(err)
                            }
                        }

                    })
            }
        }

        Project.updateOne({ _id: req.body._id }, project)
            .exec((err, project) => {
                if (err) {
                    console.log(err)
                    return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                }

                return res.status(200).send({
                    message: RES_MSG_SUCESS,
                    data: project,
                    status: RES_STATUS_SUCCESS,
                });
            })
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            message: RES_MSG_FAIL,
            status: RES_STATUS_FAIL,
        });
    }

}

exports.setVisible = async (req, res) => {

    Project.updateOne({ _id: req.query.projectId }, { visible: req.body.visible })
        .exec((err, project) => {
            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.updateTag = async (req, res) => {

    Tag.findOne({ _id: req.params.tagId })
        .exec(async (err, tag) => {
            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!tag) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }

            tag.open = req.body.open;
            await tag.save();


            Project.updateOne({ _id: req.params.projectId }, { curTag: tag._id })
                .exec((err, project) => {

                    if (err) {
                        console.log(err)
                    }

                    return res.status(200).send({
                        message: RES_MSG_SUCESS,
                        data: project,
                        status: RES_STATUS_SUCCESS,
                    });
                })
        })
}

exports.approve = async (req, res) => {


    Project.findOne({ _id: req.query.projectId })
        .populate("paymentCoin")
        .populate("chain")
        .populate("tags")
        .populate("createdBy")
        .exec(async (err, project) => {

            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            project.enable = true;
            await project.save();
            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: savedProject,
                status: RES_STATUS_SUCCESS,
            });

            let summedMaxTagCap = project.tags.reduce((sum, item) => {
                return Number.parseInt(item.maxCap) + Number.parseInt(sum);
            }, 0)

            let igoSetUp = {
                "vestingContract": project.paymentCoin.address,
                "paymentToken": project.paymentCoin.address,
                "grandTotal": service.customParse((summedMaxTagCap).toString()),
                "summedMaxTagCap": service.customParse((summedMaxTagCap * 2).toString()),
                "refundFeeDecimals": 2
            };

            let contractSetup = {
                "paymentReceiver": project.createdBy.wallet,
                "admin": project.createdBy.wallet,
                "vestedToken": project.token.address,
                "platformFee": 10,
                "totalTokenOnSale": ethers.utils.parseEther(project.vesting.amountTotal?.toString()),
                "gracePeriod": 60,
                "decimals": project.token.decimals
            };

            let vestingSetup = {
                "startTime": project.vesting.startAt,
                "cliff": project.vesting.cliff * 3600 * 24,
                "duration": project.vesting.duration * 3600 * 24,
                "initialUnlockPercent": project.vesting.initialUnlockPercent
            };

            let tags = []
            let tagIds = []

            for (let i = 0; i < project.tags.length; i++) {

                tags.push({
                    "status": "0",
                    "merkleRoot": ethers.utils.formatBytes32String("merkleroot"),
                    "startAt": project.tags[i].startAt,
                    "endAt": project.tags[i].endAt,
                    "maxTagCap": service.customParse(project.tags[i].maxCap.toString()),
                    "minAllocation": service.customParse(project.tags[i].minAllocation.toString()),
                    "maxAllocation": service.customParse(project.tags[i].maxAllocation.toString()),
                    "allocation": ethers.utils.parseEther(project.tags[i].allocation.toString()),
                    "maxParticipants": project.tags[i].maxParticipants
                });
                tagIds.push(project.tags[i].title);
            }

            let savedProject = await service.createIGO(project, project.projectName, project.createdBy.wallet, igoSetUp, contractSetup, vestingSetup, tagIds, tags)

            if (!savedProject.enable) {
                return res.status(500).send({
                    message: RES_MSG_FAIL,
                    status: RES_STATUS_FAIL,
                });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: savedProject,
                status: RES_STATUS_SUCCESS,
            });
        })


}

exports.getSnapshot = async (req, res) => {

    Project.findOne({ _id: req.query.projectId })
        .exec((err, project) => {

            if (err) {
                console.log(err)
                return res.status(400).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project.snapshot,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.getWhiteList = async (req, res) => {

    WhiteList.find({ project: req.query.projectId })
        .exec((err, whiteLists) => {
            if (err) {
                console.log(err)
                return res.status(400).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!whiteLists) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: whiteLists,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.dashboard = async (req, res) => {
    let data = {
        launchedProjects: 0,
        incubationProjects: 0
    }
    try {
        data.launchedProjects = await Project.countDocuments({ "igo.address": { $ne: null } })
    } catch (err) { }

    try {
        data.incubationProjects = await Project.countDocuments({ "igo.address": null })
    } catch (err) { }

    return res.status(200).send({
        message: RES_MSG_SUCESS,
        data,
        status: RES_STATUS_SUCCESS,
    });
}

exports.genSnapshot = async (req, res) => {
    Project.findOne({ _id: req.query.projectId })
        .exec((err, _project) => {

            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!_project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }
            Tier.find()
                .exec((err, tiers) => {

                    if (err) {
                        console.log(err)
                        return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                    }

                    if (!tiers) {
                        return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                    }
                    WhiteList.find({ project: req.query.projectId })
                        .exec((err, whiteLists) => {
                            if (err) {
                                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                            }

                            if (!whiteLists) {
                                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                            }
                            let snapshot = {
                                users: {
                                    tier0: 0,
                                    tier1: 0,
                                    tier2: 0,
                                    tier3: 0,
                                    tier4: 0,
                                    tier5: 0,
                                    tier6: 0,
                                    tier7: 0,
                                    tier8: 0,
                                    tier9: 0,
                                    tier10: 0,
                                    tier11: 0,
                                    tier12: 0,
                                    tier13: 0,
                                    tier14: 0,
                                    tier15: 0,
                                    public: 0
                                },
                                totalUser: 0
                            }

                            for (let i = 0; i < whiteLists.length; i++) {
                                snapshot.totalUser += 1;

                                if (tiers[tiers.length - 1].percent < whiteLists[i].percent) {
                                    snapshot.users.tier10 += 1;
                                }
                                for (let j = tiers.length - 1; j >= 0; j--) {

                                    if (j > 0) {
                                        if (tiers[j].percent >= whiteLists[i].percent && tiers[j - 1].percent >= whiteLists[i].percent) {
                                            snapshot.users[`tier${j}`] += 1;
                                            break;
                                        }
                                    } else {
                                        snapshot.users.public += 1;
                                    }
                                }
                            }

                            _project.snapshot = snapshot;
                            _project.status = PROJECT_STATUS_FILEHASH
                            _project.save(async (err, project) => {
                                if (err) {
                                    console.log(err)
                                    return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                                }

                                return res.status(200).send({
                                    message: RES_MSG_SUCESS,
                                    data: snapshot,
                                    status: RES_STATUS_SUCCESS
                                });
                            });
                        })
                })
        })


}
