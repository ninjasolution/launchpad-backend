const { RPC, securityTokenAddr, permit2Addr, igoFactoryAddr, igoDeployerAddr } = require("../config");
const ERC20 = require("../abis/ERC20.json")
const IGOFactory = require("../abis/IGOFactory.json")
const IGODeployer = require("../abis/IGODeployer.json")
const FundingToken = require("../abis/FundingToken.json")
const IGO = require("../abis/IGO.json")
const IGOVesting = require("../abis/IGOVesting.json")
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");
const db = require("../models");
const { tiers } = require("../config/static.source");

require('dotenv').config();

class Service {

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(RPC)
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider)
        this.igoFactoryContract = new ethers.Contract(igoFactoryAddr, IGOFactory.abi, this.wallet)
        this.igoDeployerContract = new ethers.Contract(igoDeployerAddr, IGODeployer.abi, this.wallet)
    }

    async test() {
        let res = this.generateMerkleRootAndProof(this.generateAllocLeaves([{tagId: "tag1", account: "0x02fc14d01F4E073829276cc2f4f94Fb4EDe1e0c4", maxAllocation: "1034000", refundFee: 3, igoTokenPerPaymentToken: "45"}, {tagId: "tag1", account: "0x04E117247e2F29d0ff11B99b3df6BFb0FB2Ed2F0", maxAllocation: "1085000", refundFee: 3, igoTokenPerPaymentToken: "45"}]))
        console.log(res)
    }

    async createIGO(name, owner, _igoSetup, _contractSetup, _vestingSetup, _tags) {
        try {

            let igoSetUp = {
                "vestingContract": _igoSetup.paymentToken,
                "paymentToken": _igoSetup.paymentToken,
                "permit2": permit2Addr, // bsc
                "grandTotal": _igoSetup.grandTotal,
                "summedMaxTagCap": _igoSetup.summedMaxTagCap,
                "refundFeeDecimals": "2"
            };

            let contractSetup = {
                "paymentReceiver": owner,
                "admin": owner,
                "vestedToken": _contractSetup.igoToken,
                "platformFee": "10",
                "totalTokenOnSale": _contractSetup.totalTokenOnSale,
                "gracePeriod": "60",
                "decimals": _contractSetup.decimals
            };

            let vestingSetup = {
                "startTime": _vestingSetup.startTime,
                "cliff": _vestingSetup.cliff,
                "duration": _vestingSetup.duration,
                "initialUnlockPercent": _vestingSetup.initialUnlockPercent
            };

            let tags = []
            let tagIds = []

            for (let i = 0; i < _tags.length; i++) {

                tags.push({
                    "status": "0",
                    "merkleRoot": ethers.utils.formatBytes32String("merkleroot"),
                    "startAt": _tags[i].startAt,
                    "endAt": _tags[i].endAt,
                    "maxTagCap": this.customParse(_tags[i].maxCap.toString()),
                    "minAllocation": this.customParse(_tags[i].minAllocation.toString()),
                    "maxAllocation": this.customParse(_tags[i].maxAllocation.toString()),
                    "allocation": ethers.utils.parseEther(_tags[i].allocation.toString()),
                    "maxParticipants": _tags[i].maxParticipants
                });
                tagIds.push(_tags[i].title);
            }

            let igoArgs = [
                name,
                igoSetUp,
                tagIds,
                tags,
                contractSetup,
                vestingSetup
            ]

            let igoTx = await this.igoFactoryContract.createIGO(...igoArgs);

            const igoReceipt = await igoTx.wait();

            const event = igoReceipt.events[5];
            console.log(event);

            return {
                igo: event.args[0],
                vesting: event.args[1]
            }
        } catch (err) {
            console.log("err")
            return {
                igo: null,
                vesting: null
            }
        }

    }

    async getRootHash(address) {
        let igoContract = new ethers.Contract(address, FundingToken.abi, this.wallet)
        let hash = await igoContract.rootHash();
        console.log(hash)

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
        for(let i=tiers.length-1 ; i>=0 ; i--) {
          if(tiers[i].weight <= weight) {
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

