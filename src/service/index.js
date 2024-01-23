const { RPC, igoFactoryAddr, igoDeployerAddr, stakingAddr, farmingAddr, TX_TYPE_LOCK, PLATFORM_TYPE_STAKING_IDO, PAYMENT_METHOD_CRYPTO, TX_STATUS_SUCCESS, chainId, PROJECT_VISIBLE_OPENED, PLATFORM_TYPE_FARMING_IDO, securityTokenAddr, utilityTokenAddr, PROJECT_STATUS_COMPLETED, PROJECT_STATUS_IGO_DEPLOYED, PROJECT_STATUS_VESTING_DEPLOYED, PROJECT_STATUS_IGO_INITIALIZED, PROJECT_STATUS_VESTING_INITIALIZED, PROJECT_STATUS_VESTING_OWNERSHIP, PROJECT_STATUS_PENDING, PROJECT_STATUS_IGO_UPDATE_TAGS, PROJECT_STATUS_IGO_GRANT_ROLE, PROJECT_STATUS_UPLOAD, PROJECT_VISIBLE_NOT_STARTED } = require("../config");
const ERC20 = require("../abis/ERC20.json")
const IGOFactory = require("../abis/IGOFactory.json")
const IGODeployer = require("../abis/IGODeployer.json")
const FundingToken = require("../abis/FundingToken.json")
const IGO = require("../abis/IGO.json")
const IGOVesting = require("../abis/IGOVesting.json")
const Staking = require("../abis/Staking.json")
const Farming = require("../abis/YieldFarming.json")
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");
const { tiers } = require("../config/static.source");
const db = require("../models");
const Transaction = db.transaction;
const Project = db.project;
const User = db.user;

require('dotenv').config();

class Service {

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(RPC)
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider)
        this.igoFactoryContract = new ethers.Contract(igoFactoryAddr, IGOFactory.abi, this.wallet)
        this.igoDeployerContract = new ethers.Contract(igoDeployerAddr, IGODeployer.abi, this.wallet)
        this.farmingContract = new ethers.Contract(farmingAddr, Farming.abi, this.wallet)

        this.detectStakingEvent(stakingAddr)
        Project.find({ visible: PROJECT_VISIBLE_OPENED }, (err, projects) => {
            if (!err) {
                projects.forEach(item => {
                    if (item?.staking?.address) {
                        this.detectStakingEvent(item?.staking?.address)
                    }
                })
            }
        })

    }

    async detectStakingEvent(address) {
        this.stakingContract = new ethers.Contract(address, Staking.abi, this.wallet)
        this.stakingContract.on("Staked", async (...events) => {

            try {

                let project = await Project.findOne({ "staking.address": address });
                let projectId = 0;
                let decimals = 10000;
                if (project) {
                    projectId = project?._id;
                    decimals = project?.token?.decimals
                }

                let args = events[4].args;
                let user = await User.findOne({ "wallet": args?.staker });
                const transaction = new Transaction({
                    type: TX_TYPE_LOCK,
                    platform: PLATFORM_TYPE_STAKING_IDO,
                    project: projectId,
                    amount: args?.stakedAmount.toString() / decimals,
                    coin: args?.token,
                    paymentMethod: PAYMENT_METHOD_CRYPTO,
                    chainId: chainId,
                    status: TX_STATUS_SUCCESS,
                    duration: args?.duration,
                    hash: events[4].blockHash,
                    user: user?._id,
                })
                await transaction.save();

                let transactions = await Transaction
                    .aggregate([{
                        $match: { "user": user?._id, platform: PLATFORM_TYPE_STAKING_IDO, type: TX_TYPE_LOCK }
                    },
                    {
                        $group: { _id: "$duration", amount: { $sum: '$amount' } }
                    }
                    ]).exec()

                let tier = this.getTier(transactions.map(item => ({ duration: item._id, amount: item.amount })))
                let investment = 0;
                transactions.forEach(item => {
                    investment += item.amount;
                })

                await User.updateOne({ _id: user?._id }, { tier })
            } catch (err) {
                console.log(err)
            }


        });

    }



    async createIGOTest() {
        try {

            const IGOContract = new ethers.ContractFactory(IGO.abi, IGO.bytecode, this.wallet)
            const igo = await IGOContract.deploy(this.wallet.address)
            console.log("IGO deployed to:", igo.address);

            const VestingContract = new ethers.ContractFactory(IGOVesting.abi, IGOVesting.bytecode, this.wallet)
            const vesting = await VestingContract.deploy("IGO Vesting")
            console.log("IGOVesting deployed to:", vesting.address);

            let blockTimestamp = (await this.provider.getBlock("latest")).timestamp;
            blockTimestamp = Number.parseInt(blockTimestamp)

            let igoSetUp = {
                "vestingContract": vesting.address,
                "paymentToken": securityTokenAddr,
                "grandTotal": "1000000000",
                "summedMaxTagCap": "10000000000",
                "refundFeeDecimals": 2
            };

            let contractSetup = {
                "paymentReceiver": this.wallet.address,
                "admin": this.wallet.address,
                "vestedToken": utilityTokenAddr,
                "platformFee": 10,
                "totalTokenOnSale": "10000000",
                "gracePeriod": 60,
                "decimals": 18
            };

            let vestingSetup = {
                "startTime": blockTimestamp + 3600,
                "cliff": "432000",
                "duration": "4320000",
                "initialUnlockPercent": 10
            };

            let tags = []
            let tagIds = ["Private"]

            for (let i = 0; i < tagIds.length; i++) {

                tags.push({
                    "status": "0",
                    "merkleRoot": ethers.utils.formatBytes32String("he"),
                    "startAt": blockTimestamp + 3600,
                    "endAt": blockTimestamp + 103600,
                    "maxTagCap": this.customParse("10"),
                    "minAllocation": this.customParse("10"),
                    "maxAllocation": this.customParse("100"),
                    "allocation": ethers.utils.parseEther("100"),
                    "maxParticipants": 12
                });
            }

            let igoArgs = [
                "AAE3eAA",
                igoSetUp,
                tagIds,
                tags,
                contractSetup,
                vestingSetup
            ]
            let gasPrice = (await this.provider.getFeeData()).gasPrice.toString() * 2;
            gasPrice = gasPrice.toString() * 2;

            await igo.initialize(this.wallet.address, igoSetUp, [], [], { gasPrice, gasLimit: 15000000 });
            await vesting.initializeCrowdfunding(
                contractSetup,
                vestingSetup,
                { gasPrice, gasLimit: 15000000 }
            );
            await vesting.transferOwnership(igo.address, { gasPrice, gasLimit: 15000000 });
            console.log("is setup")
            await igo.updateGrandTotal("10000000000", { gasPrice, gasLimit: 15000000 });
            console.log("is updated grand total")
            await igo.updateSetTags(tagIds, tags, { gasPrice, gasLimit: 15000000 });
            console.log("is updated tags")
            await igo.grantRole(await igo.DEFAULT_ADMIN_ROLE(), contractSetup.admin, { gasPrice, gasLimit: 15000000 });
            console.log(await igo.setUp())


            // let igoTx = await this.igoFactoryContract.createIGO(...igoArgs, { gasLimit: 15000000 });
            // const igoReceipt = await igoTx.wait();
            // console.log(igoReceipt)            
            // const event = igoReceipt.events[igoReceipt.events.length - 1];
            // let igoAddr = event.args[1];
            // let vestingAddr = "0x3F5E0718BC5a07B4aEf107f6BDc865f6F2E6C565";
            // // let igoAddr = "0x2073e2aA7bEe41FCA9394D1e3bF66ce62B380ac4";
            // let igoContract = new ethers.Contract(igoAddr, IGO.abi, this.wallet)

            // console.log("started", await igoContract.setUp(), await igoContract.tagIds())
            // await igoContract.updateGrandTotal("100000000", { gasLimit: 15000000 });
            // console.log("updated Grand Total")
            // await igoContract.updateSetTags(tagIds, tags, { gasLimit: 15000000 });
            // console.log(await igoContract.tagIds())
            console.log("Ready")

            return {
                igo: igo.address,
                // vesting: event.args[2]
            }
        } catch (err) {
            console.log(err)

        }

    }

    async createIGO(project, name, owner, _igoSetup, _contractSetup, _vestingSetup, _tagIds, _tags, status) {
        try {

            var igo, vesting;
            let gasPrice = (await this.provider.getFeeData()).gasPrice.toString() * 2;
            gasPrice = gasPrice.toString() * 2;

            const deployIGO = async () => {
                try {
                    const IGOContract = new ethers.ContractFactory(IGO.abi, IGO.bytecode, this.wallet)
                    igo = await IGOContract.deploy(this.wallet.address)
                    console.log("IGO deployed to:", igo.address);
                    project.igo = {
                        ...project.igo,
                        address: igo.address
                    }
                    project.status = PROJECT_STATUS_IGO_DEPLOYED

                    return deployVesting()
                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            const deployVesting = async () => {
                try {
                    const VestingContract = new ethers.ContractFactory(IGOVesting.abi, IGOVesting.bytecode, this.wallet)
                    vesting = await VestingContract.deploy(name)
                    console.log("IGOVesting deployed to:", vesting.address);
                    project.vesting = {
                        ...project.vesting,
                        address: vesting.address
                    }
                    project.status = PROJECT_STATUS_VESTING_DEPLOYED

                    return igoInitialize();

                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            const igoInitialize = async () => {

                try {

                    let igoSetUp = {
                        ..._igoSetup,
                        "vestingContract": vesting.address,
                    };

                    const gasEstimate = await igo.estimateGas.initialize(igoSetUp, [], []);
                    // Add a buffer to the gas estimate (20% buffer in this example)
                    let gasLimit = gasEstimate.mul(120).div(100);

                    // Set a minimum gas limit (e.g., 21,000 for a simple transfer)
                    const minGasLimit = ethers.BigNumber.from('21000');
                    if (gasLimit.lt(minGasLimit)) {
                        gasLimit = minGasLimit;
                    }
                    await igo.initialize(this.wallet.address, igoSetUp, [], [], { gasPrice, gasLimit });
                    project.status = PROJECT_STATUS_IGO_INITIALIZED

                    return vestingInitialize()
                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            const vestingInitialize = async () => {

                try {
                    const gasEstimate = await vesting.estimateGas.initializeCrowdfunding(
                        _contractSetup,
                        _vestingSetup);
                    // Add a buffer to the gas estimate (20% buffer in this example)
                    let gasLimit = gasEstimate.mul(120).div(100);

                    // Set a minimum gas limit (e.g., 21,000 for a simple transfer)
                    const minGasLimit = ethers.BigNumber.from('21000');
                    if (gasLimit.lt(minGasLimit)) {
                        gasLimit = minGasLimit;
                    }
                    await vesting.initializeCrowdfunding(
                        _contractSetup,
                        _vestingSetup,
                        { gasPrice, gasLimit }
                    );
                    project.status = PROJECT_STATUS_VESTING_INITIALIZED
                    return vestingOwnership()
                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            const vestingOwnership = async () => {

                try {

                    const gasEstimate = await vesting.estimateGas.transferOwnership(igo.address);
                    // Add a buffer to the gas estimate (20% buffer in this example)
                    let gasLimit = gasEstimate.mul(120).div(100);

                    // Set a minimum gas limit (e.g., 21,000 for a simple transfer)
                    const minGasLimit = ethers.BigNumber.from('21000');
                    if (gasLimit.lt(minGasLimit)) {
                        gasLimit = minGasLimit;
                    }
                    await vesting.transferOwnership(igo.address, { gasPrice, gasLimit: gasLimit });
                    project.status = PROJECT_STATUS_VESTING_OWNERSHIP
                    console.log("is setup")

                    return igoSetTags()
                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            const igoSetTags = async () => {

                try {
                    
                    await igo.updateSetTags(_tagIds, _tags, { gasPrice, gasLimit: "150000" });
                    project.status = PROJECT_STATUS_IGO_UPDATE_TAGS
                    console.log("is updated tags")

                    return igoGrantRole();
                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            const igoGrantRole = async () => {

                try {

                    const roleId = await igo.DEFAULT_ADMIN_ROLE();
                    const gasEstimate = await igo.estimateGas.grantRole(roleId, _contractSetup.admin);
                    // Add a buffer to the gas estimate (20% buffer in this example)
                    let gasLimit = gasEstimate.mul(120).div(100);

                    // Set a minimum gas limit (e.g., 21,000 for a simple transfer)
                    const minGasLimit = ethers.BigNumber.from('21000');
                    if (gasLimit.lt(minGasLimit)) {
                        gasLimit = minGasLimit;
                    }
                    await igo.grantRole(await igo.DEFAULT_ADMIN_ROLE(), _contractSetup.admin, { gasPrice, gasLimit });
                    project.status = PROJECT_STATUS_IGO_GRANT_ROLE
                    console.log(await igo.setUp())
                    project.enable = true;
                    project.visible = PROJECT_VISIBLE_NOT_STARTED;
                    return await project.save();
                } catch (err) {
                    console.log(err)
                    return await project.save();
                }
            }

            if (project.status == PROJECT_STATUS_IGO_DEPLOYED) {
                const IGOContract = new ethers.ContractFactory(IGO.abi, IGO.bytecode, this.wallet)
                igo = await IGOContract.attach(project.igo.address)
            } else if (project.status !== PROJECT_STATUS_PENDING) {
                const IGOContract = new ethers.ContractFactory(IGO.abi, IGO.bytecode, this.wallet)
                igo = await IGOContract.attach(project.igo.address)

                const VestingContract = new ethers.ContractFactory(IGOVesting.abi, IGOVesting.bytecode, this.wallet)
                vesting = await VestingContract.attach(project.vesting.address)
            }

            switch (project.status) {
                case PROJECT_STATUS_PENDING:
                    return deployIGO();
                case PROJECT_STATUS_IGO_DEPLOYED:
                    console.log(PROJECT_STATUS_IGO_DEPLOYED)
                    return deployVesting();
                case PROJECT_STATUS_VESTING_DEPLOYED:
                    return igoInitialize();
                case PROJECT_STATUS_IGO_INITIALIZED:
                    return vestingInitialize();
                case PROJECT_STATUS_VESTING_INITIALIZED:
                    return vestingOwnership();
                case PROJECT_STATUS_VESTING_OWNERSHIP:
                    return igoSetTags();
                case PROJECT_STATUS_IGO_UPDATE_TAGS:
                    return igoGrantRole();
                case PROJECT_STATUS_IGO_GRANT_ROLE:
                    return project;
                default:
                    return project;
            }

            // let igoTx = await this.igoFactoryContract.createIGO(...igoArgs, { gasPrice: 20000000000 });
            // const igoReceipt = await igoTx.wait();
            // const event = igoReceipt.events[6];
            // let igoAddr = event.args[1];
            // let vestingAddr = event.args[2];
            // let igoContract = new ethers.Contract(igoAddr, IGO.abi, this.wallet)
            // await igoContract.updateGrandTotal(_igoSetup.grandTotal, { gasPrice });
            // await igoContract.updateSetTags(tagIds, tags, { gasPrice });
            // console.log("Ready")            

            // return {
            //     igo: igoAddr,
            //     vesting: event.args[2]
            // }
        } catch (err) {
            console.log(err)
            return await project.save();
        }

    }

    async getRootHash(address) {
        let igoContract = new ethers.Contract(address, FundingToken.abi, this.wallet)
        return await igoContract.rootHash();

    }

    async setRootHash(address, hash) {
        let igoContract = new ethers.Contract(address, IGO.abi, this.wallet)
        await igoContract.updateHash(hash);

    }

    getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateLeaves(inputs) {
        return inputs.map((x) =>
            ethers.utils.solidityKeccak256(
                ["address", "uint256"],
                [x.address, x.amount.toString()]
            )
        );
    }

    generateAllocLeaves(allocations) {

        let rawEncoded;
        let leaves = [];
        let length = allocations.length;
        for (let i = 0; i < length; ++i) {
            rawEncoded = ethers.utils.defaultAbiCoder.encode(
                [
                    'Allocation(string tagId, address account, uint256 maxAllocation, uint256 refundFee, uint256 igoTokenPerPaymentToken)',
                ],
                [
                    [
                        allocations[i].tagId,
                        allocations[i].account,
                        allocations[i].maxAllocation,
                        allocations[i].refundFee,
                        allocations[i].igoTokenPerPaymentToken,
                    ],
                ]
            );
            leaves.push(ethers.utils.keccak256(rawEncoded));
        }
        return leaves;
    }


    generateMerkleRootAndProof(leaves) {
        const tree = new MerkleTree(leaves, ethers.utils.keccak256, {
            sortPairs: true,
        });
        const root = tree.getHexRoot();

        const proofs = leaves.map(leave => tree.getHexProof(leave));

        return { root, proofs };
    }

    async recoverSignature(nonce = "", signature = "") {
        return await ethers.utils.verifyMessage(nonce.toString(), signature)
    }

    getTier(transactions) {
        let weight = 0;
        for (let i = 0; i < transactions.length; i++) {
            let _tier = tiers.find(tier => tier.duration == transactions[i].duration && tier.minAmount <= transactions[i].amount && tier.maxAmount >= transactions[i].amount)
            if (_tier) {
                weight += _tier.weight;
            }
        }

        let tier = {};
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (tiers[i].weight <= weight) {
                tier = tiers[i];
                break;
            }
        }

        return tier;
    }


    async getIGODetail(from, count) {
        let result = await this.igoFactoryContract.getIgosDetails(0, 1);
        const IGOContract = new ethers.Contract(result.igos[0].igo, IGO.abi, this.wallet);
        const VestingContract = new ethers.Contract(result.igos[0].vesting, IGOVesting.abi, this.wallet);

        console.log(await VestingContract.owner())
    }

    eth(amount) {
        return ethers.utils.parseEther(amount.toString());
    }

    customParse(amount, decimals = 4) {
        if (!amount) return 0;
        return amount * Math.pow(10, decimals);
    }

    customFormat(amount, decimals = 4) {
        if (!amount) return 0;
        return amount / Math.pow(10, decimals);
    }


}

module.exports = new Service();

