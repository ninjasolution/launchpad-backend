const { ethers } = require("ethers");
const { PROJECT_STATUS_UPLOAD, RES_STATUS_SUCCESS, RES_MSG_SUCESS, RES_STATUS_FAIL, RES_MSG_DATA_NOT_FOUND, PROJECT_STATUS_PROGRESS, PROJECT_STATUS_LOTTERY, PERCENT_DIVISOR } = require("../config");
const db = require("../models");
const Project = db.project;
const Investment = db.investment;
const Tier = db.tier;
const { createIGO, generateLeaves, generateMerkleRootAndProof } = require("../service");
const service = require("../service");

exports.list = (req, res) => {
    var options = {
        sort: { createdAt: -1 },
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        populate: "createdBy"
    };

    var condition = { }
    if (req.query.createdBy) {
        condition.createdBy = req.query.createdBy
    }else {
        condition.enable = true
    }

    Project.paginate(condition, options, (err, projects) => {

        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (!projects) {
            return res.status(404).send({ message: "Project Not found.", status: "errors" });
        }

        return res.status(200).send({ status: RES_STATUS_SUCCESS, data: projects });
    })

}

exports.create = async (req, res) => {

    const _project = req.body;
    _project.status = PROJECT_STATUS_UPLOAD
    const project = new Project(req.body);
    project.save(async (err, _project) => {
        if (err) {
            console.log(err)
            return res.status(400).send({ message: err, status: "errors" });
        }

        Project
            .findOne({ _id: _project._id })
            .populate("paymentCoin")
            .populate("createdBy")
            .populate("chain")
            .exec(async (err, project) => {

                let summedMaxTagCap = project.funding.allocations.reduce((sum, item) => {
                    return item.maxCap + sum;
                }, 0)
                let igoSetUp = {
                    igoVestingAddr: project.staking.address,
                    paymentTokenAddr: project.paymentCoin.address,
                    grandTotal: project.vesting.amountTotal,
                    summedMaxTagCap
                };

                let contractSetup = {
                    igoTokenAddr: project.token.address,
                    totalTokenOnSale: project.vesting.amountTotal,
                    decimals: project.token.decimals
                };

                let vestingSetup = {
                    startTime: project.vesting.startTime,
                    cliff: project.vesting.cliff,
                    duration: project.vesting.duration,
                    initialUnlock: project.vesting.initialUnlock
                };
                let { igo, vesting } = await createIGO(project.projectName, project.createdBy.wallet, igoSetUp, contractSetup, vestingSetup, project.funding.allocations)

                project.vesting = {
                    ...project.vesting,
                    address: vesting
                }
                project.igo = {
                    ...project.vesting,
                    address: igo
                }

                await project.save();
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
        .populate("chain")
        .exec((err, project) => {
            if (err) {
                return res.status(500).send({ message: err, status: "errors" });
            }

            if (!project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: "errors" });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.getProof = async (req, res) => {

    Investment
        .findOne({ project: req.query.projectId, address: req.query.address })
        .exec(async (err, investment) => {
            if (err) {
                return res.status(500).send({ message: err, status: "errors" });
            }

            if (!investment) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: "errors" });
            }

            Investment
                .find({ project: req.query.projectId })
                .exec(async (err, investments) => {

                    let leaves = generateLeaves(investments.map((item) => ({ address: item.address, amount: item.percent })))
                    let { root, proofs } = generateMerkleRootAndProof(leaves);

                    let amount = ethers.utils.parseEther(investment.amount)
                    let tier = await Tier.findOne({ minAmount: { $lt: amount }, maxAmount: { $gt: amount } })
                    console.log(root, tier.percent);


                    return res.status(200).send({
                        message: RES_MSG_SUCESS,
                        data: { root, proof: proofs[0], percent: tier.percent * PERCENT_DIVISOR },
                        status: RES_STATUS_SUCCESS,
                    });
                })
        })
}

exports.pushHash = async (req, res) => {

    Project.findOne({ _id: req.query.projectId })
        .exec((err, project) => {
            if (err) {
                console.log(err)
                return res.status(400).send({ message: err, status: "errors" });
            }

            if (!project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }
            project.rootHash = req.body.rootHash;
            project.status = PROJECT_STATUS_LOTTERY
            project.save(async (err, project) => {
                if (err) {
                    console.log(err)
                    return res.status(400).send({ message: err, status: "errors" });
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

    Project.updateOne({ _id: req.body._id }, req.body)
        .exec((err, project) => {
            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: "errors" });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.approve = async (req, res) => {

    Project.updateOne({ _id: req.query.projectId }, { enable: true })
        .exec(async (err, project) => {
            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: "errors" });
            }

            let owner = project.wallet;
            let name = project.projectName;
            let igoSetup = {
                igoVestingAddr: project.vesting.address,
                paymentTokenAddr: project.paymentToken.address,
                grandTotal: project.grandTotal,
                summedMaxTagCap: project.summedMaxTagCap
            }

            let contractSetup = {
                igoTokenAddr: project.token.address,
                totalTokenOnSale: project.totalTokenOnSale
            }

            let vestingSetup = {
                startTime: project.vesting.startTime,
                cliff: project.vesting.cliff,
                duration: project.vesting.duration,
                initialUnlock: project.vesting.initialUnlock
            }

            let allocations = project.allocations;

            await service.createIGO(name, owner, igoSetup, contractSetup, vestingSetup, allocations);

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.getSnapshot = async (req, res) => {

    Project.findOne({ _id: req.query.projectId })
        .exec((err, project) => {

            if (err) {
                console.log(err)
                return res.status(400).send({ message: err, status: "errors" });
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

    Investment.find({ project: req.query.projectId })
        .exec((err, investments) => {
            if (err) {
                console.log(err)
                return res.status(400).send({ message: err, status: "errors" });
            }

            if (!investments) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: investments,
                status: RES_STATUS_SUCCESS,
            });
        })

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
                    Investment.find({ project: req.query.projectId })
                        .exec((err, investments) => {
                            if (err) {
                                console.log(err)
                                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                            }

                            if (!investments) {
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
                                totalSfundUser: 0
                            }

                            for (let i = 0; i < investments.length; i++) {
                                snapshot.totalSfundUser += 1;
                                for (let j = tiers.length - 1; j >= 0; j--) {
                                    if (tiers[j].minAmount <= investments[i].amount && tiers[j].maxAmount >= investments[i].amount && tiers[j].duration < investments[i].duration) {
                                        snapshot.users[`tier${j}`] += 1;
                                        break;
                                    }
                                }
                            }

                            _project.snapshot = snapshot;
                            _project.status = PROJECT_STATUS_PROGRESS
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
