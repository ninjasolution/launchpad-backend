const { ethers } = require("ethers");
const { SignatureTransfer } = require("@uniswap/Permit2-sdk")
const db = require("../models");
const { PROJECT_STATUS_UPLOAD, RES_STATUS_SUCCESS, RES_MSG_SUCESS, RES_STATUS_FAIL, RES_MSG_DATA_NOT_FOUND, PROJECT_STATUS_PROGRESS, PROJECT_STATUS_LOTTERY, PERCENT_DIVISOR, PROJECT_VISIBLE_NOT_STARTED, TAG_TYPE_PUBLIC, PLATFORM_TYPE_STAKING_IDO, RES_MSG_FAIL, permit2Addr, securityTokenAddr, chainId } = require("../config");
const Project = db.project;
const WhiteList = db.whiteList;
const User = db.user;
const Transaction = db.transaction;
const Tier = db.tier;
const service = require("../service");
const { tiers } = require("../config/static.source");

exports.list = (req, res) => {
    var options = {
        sort: { createdAt: -1 },
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        populate: ["createdBy", "paymentCoin"]
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
    _project.status = PROJECT_STATUS_UPLOAD
    const project = new Project(req.body);
    project.save(async (err, _project) => {
        if (err) {
            console.log(err)
            return res.status(400).send({ message: err, status: RES_STATUS_FAIL });
        }

        Project
            .findOne({ _id: _project._id })
            .populate("paymentCoin")
            .populate("createdBy")
            .populate("chain")
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
        .populate("chain")
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

exports.getProof = async (req, res) => {

    let { projectId, userId, tagId } = req.params;
    if (!(projectId && userId && tagId)) {
        return res.status(200).send({ message: RES_STATUS_FAIL, data: {} });
    }

    Project.findOne({ _id: req.params.projectId })
        .exec((err, project) => {
            if (err) {
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            if (!project) {
                return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
            }

            let nonce = 1;
            let deadline = ethers.constants.MaxUint256
            const permit = {
                permitted: {
                    // token we are permitting to be transferred
                    token: securityTokenAddr,
                    // amount we are permitting to be transferred
                    amount: ethers.utils.parseEther(req.params.amount)
                },
                // who can transfer the tokens
                spender: project.igo.address,
                nonce,
                // signature deadline
                deadline
            };

            const { domain, types, values } = SignatureTransfer.getPermitData(permit, permit2Addr, chainId)

            User.findOne({ _id: req.params.userId })
                .exec((err, user) => {
                    if (err) {
                        return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                    }
                    if (!user) {
                        return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                    }
                    let tag = project.funding.tags.find((tag => tag.title == req.params.tagId));
                    if(!tag) return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                    if (tag.accessType == TAG_TYPE_PUBLIC) {
                        Transaction
                            .find({ platform: PLATFORM_TYPE_STAKING_IDO, user: req.userId })
                            .exec(async (err, transactions) => {

                                if (err) {
                                    return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                                }

                                if (!transactions) {
                                    return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                                }

                                let amount = transactions.reduce((sum, item) => {
                                    return sum + Number.parseFloat(item.amount)
                                }, 0);

                                let tier = await tiers.find(item => item.minAmount < amount && item.maxAmount < amount)
                                if(!tier) {
                                    return res.status(200).send({
                                        message: RES_MSG_SUCESS,
                                        data: { proof: "", tier: null, nonce: null, deadline: null, domain: null, types: null, values: null },
                                        status: RES_STATUS_SUCCESS,
                                    });
                                }
                                let allocation = {
                                    tagId: req.params.tagId,
                                    account: user.wallet,
                                    maxAllocation: ethers.utils.parseEther((project.token.totalSupply * tier.percent / 100).toString()).toString(),
                                    refundFee: 40,
                                    igoTokenPerPaymentToken: tag.price,
                                }
                                let allocations = [allocation, allocation]

                                // let leaves = generateLeaves(whiteLists.map((item) => ({ address: item.address, amount: item.percent })))
                                let leaves = service.generateAllocLeaves(allocations)
                                let { root, proofs } = service.generateMerkleRootAndProof(leaves);

                                return res.status(200).send({
                                    message: RES_MSG_SUCESS,
                                    data: { proof: proofs[0], allocation, tier, nonce, deadline, domain, types, values },
                                    status: RES_STATUS_SUCCESS,
                                });
                            })
                    } else {
                        WhiteList
                            .findOne({ project: req.params.projectId, address: user.wallet })
                            .exec(async (err, whiteList) => {

                                if (err) {
                                    return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
                                }

                                if (!whiteList) {
                                    return res.status(404).send({ message: RES_MSG_DATA_NOT_FOUND, status: RES_STATUS_FAIL });
                                }

                                let amount = whiteList.amount
                                let tier = await Tier.findOne({ minAmount: { $lt: amount }, maxAmount: { $gt: amount } })
                                let allocation = {
                                    tagId: req.params.tagId,
                                    account: user.wallet,
                                    maxAllocation: ethers.utils.parseEther(project.token.totalSupply * tier.percent / 100),
                                    refundFee: 40,
                                    igoTokenPerPaymentToken: tag.maxAllocation.price,
                                }
                                let allocations = [allocation, allocation]

                                // let leaves = generateLeaves(whiteLists.map((item) => ({ address: item.address, amount: item.percent })))
                                let leaves = service.generateLeaves(allocations)
                                let { root, proofs } = service.generateMerkleRootAndProof(leaves);

                                return res.status(200).send({
                                    message: RES_MSG_SUCESS,
                                    data: { root, proof: proofs[0], tier, nonce, deadline, domain, types, values },
                                    status: RES_STATUS_SUCCESS,
                                });
                            })
                    }

                })



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

    Project.updateOne({ _id: req.body._id }, req.body)
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

    Project.findOne({ _id: req.params.projectId })
        .exec(async (err, project) => {
            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            let newProject = project;
            newProject.funding.tags = project.funding.tags.map((item) => {
                if(item.title == req.body.title) {
                    return req.body
                }else return item;
            })
            newProject.curTag = req.body;
            newProject = await newProject.save()

            return res.status(200).send({
                message: RES_MSG_SUCESS,
                data: project,
                status: RES_STATUS_SUCCESS,
            });
        })

}

exports.approve = async (req, res) => {


    Project.findOne({ _id: req.query.projectId })
        .populate("paymentCoin")
        .populate("chain")
        .populate("createdBy")
        .exec(async (err, project) => {

            if (err) {
                console.log(err)
                return res.status(500).send({ message: err, status: RES_STATUS_FAIL });
            }

            let summedMaxTagCap = project.funding.tags.reduce((sum, item) => {
                return Number.parseInt(item.maxCap) + Number.parseInt(sum);
            }, 0)
            let igoSetUp = {
                igoVesting: project.paymentCoin.address,
                paymentToken: project.paymentCoin.address,
                grandTotal: ethers.utils.parseEther((10 * summedMaxTagCap).toString()),
                summedMaxTagCap: ethers.utils.parseEther((summedMaxTagCap * 2).toString())
            };

            let contractSetup = {
                igoToken: project.token.address,
                totalTokenOnSale: ethers.utils.parseEther(project.vesting.amountTotal?.toString()),
                decimals: project.token.decimals
            };

            let vestingSetup = {
                startTime: project.vesting.startAt,
                cliff: project.vesting.cliff * 3600 * 24,
                duration: project.vesting.duration * 3600 * 24,
                initialUnlockPercent: project.vesting.initialUnlockPercent
            };
            let { igo, vesting } = await service.createIGO(project.projectName, project.createdBy.wallet, igoSetUp, contractSetup, vestingSetup, project.funding.tags)

            if (!igo) {
                return res.status(500).send({
                    message: RES_MSG_FAIL,
                    status: RES_STATUS_FAIL,
                });
            }
            project.vesting = {
                ...project.vesting,
                address: vesting
            }
            project.igo = {
                ...project.igo,
                address: igo
            }
            project.enable = true;
            project.visible = PROJECT_VISIBLE_NOT_STARTED;
            project = await project.save();

            console.log(project)
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
                                console.log(err)
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
                                for (let j = tiers.length - 1; j >= 0; j--) {
                                    if (tiers[j].minAmount <= whiteLists[i].amount && tiers[j].maxAmount >= whiteLists[i].amount && tiers[j].duration < whiteLists[i].duration) {
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
