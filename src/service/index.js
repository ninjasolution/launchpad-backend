const { RPC, securityTokenAddr, igoVestingAddr, permit2Addr, igoTokenAddr, igoFactoryAddr, igoDeployerAddr } = require("../config");
const ERC20 = require("../abis/ERC20.json")
const IGOFactory = require("../abis/IGOFactory.json")
const IGODeployer = require("../abis/IGODeployer.json")
const FundingToken = require("../abis/FundingToken.json")
const IGO = require("../abis/IGO.json")
const IGOVesting = require("../abis/IGOVesting.json")
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");
const db = require("../models");

require('dotenv').config();

class Service {

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(RPC)
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider)
        this.igoFactoryContract = new ethers.Contract(igoFactoryAddr, IGOFactory.abi, this.wallet)
        this.igoSecContract = new ethers.Contract(securityTokenAddr, ERC20.abi, this.wallet)
        this.igoTokenContract = new ethers.Contract(igoTokenAddr, ERC20.abi, this.wallet)
        this.igoDeployerContract = new ethers.Contract(igoDeployerAddr, IGODeployer.abi, this.wallet)
        this.test()
    }

    async test() {

        let Project = db.project;
        Project.findOne({ _id: 14 })
            .populate("paymentCoin")
            .populate("chain")
            .populate("createdBy")
            .exec(async (err, project) => {


                let summedMaxTagCap = project.funding.tags.reduce((sum, item) => {
                    return Number.parseInt(item.maxCap) + Number.parseInt(sum);
                }, 0)
                let igoSetUp = {
                    igoVesting: project.paymentCoin.address,
                    paymentToken: project.paymentCoin.address,
                    grandTotal: ethers.utils.parseEther((10 + Number.parseInt(summedMaxTagCap)).toString()),
                    summedMaxTagCap: ethers.utils.parseEther((Number.parseInt(summedMaxTagCap) + 100).toString())
                };

                let contractSetup = {
                    igoToken: project.token.address,
                    totalTokenOnSale: ethers.utils.parseEther(project.vesting.amountTotal),
                    decimals: project.token.decimals
                };

                let vestingSetup = {
                    startTime: project.vesting.startAt,
                    cliff: project.vesting.cliff * 3600 * 24,
                    duration: project.vesting.duration * 3600 * 24,
                    initialUnlockPercent: project.vesting.initialUnlockPercent
                };
                let { igo, vesting } = await this.createIGO("project.projectName", project.createdBy.wallet, igoSetUp, contractSetup, vestingSetup, project.funding.tags)

                if (!igo) {
                    console.log("================")
                }
                project.vesting = {
                    ...project.vesting,
                    address: vesting
                }
                project.igo = {
                    ...project.igo,
                    address: igo
                }
                project = await project.save();


            })
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
                    "maxTagCap": ethers.utils.parseEther(_tags[i].maxCap.toString())
                });
                tagIds.push(_tags[i].title);
            }



            let igoArgs = [
                "name-122",
                igoSetUp,
                tagIds,
                tags,
                contractSetup,
                vestingSetup
            ]

            console.log(igoArgs)

            let args = [
                name,
                {
                    "vestingContract": igoSetUp.vestingContract,
                    "paymentToken": igoSetUp.paymentToken,
                    "permit2": permit2Addr,
                    "grandTotal": ethers.utils.parseEther("1000000"),
                    "summedMaxTagCap": ethers.utils.parseEther("100000"),
                    "refundFeeDecimals": '2'
                },
                ['First', 'Second'],
                [
                    {
                        status: '0',
                        merkleRoot: '0x6d65726b6c65726f6f7400000000000000000000000000000000000000000000',
                        startAt: 1692970715,
                        endAt: 1693057119,
                        maxTagCap: ethers.utils.parseEther("5000")
                    },
                    {
                        status: '0',
                        merkleRoot: '0x6d65726b6c65726f6f7400000000000000000000000000000000000000000000',
                        startAt: 1692970715,
                        endAt: 1693057119,
                        maxTagCap: ethers.utils.parseEther("5000")
                    }
                ],
                {
                    "paymentReceiver": '0x04E117247e2F29d0ff11B99b3df6BFb0FB2Ed2F0',
                    "admin": '0x04E117247e2F29d0ff11B99b3df6BFb0FB2Ed2F0',
                    "vestedToken": securityTokenAddr,
                    "platformFee": '10',
                    "totalTokenOnSale": ethers.utils.parseEther("500000"),
                    "gracePeriod": '60',
                    "decimals": '18'
                },
                {
                    "startTime": 1692970766,
                    "cliff": 864000,
                    "duration": 4320000,
                    "initialUnlockPercent": '12'
                }
            ];
            let igoTx = await this.igoFactoryContract.createIGO(...igoArgs);
            const igoReceipt = await igoTx.wait();

            const event = igoReceipt.events[5];
            console.log(event.args[1], event.args[2], "events");

            return {
                igo: event.args[1],
                vesting: event.args[2]
            }
        } catch (err) {
            console.log(err)
            return {
                igo: null,
                vesting: null
            }
        }

    }

    async getRootHash(address) {
        this.fundingTokenContract = new ethers.Contract(address, FundingToken.abi, this.wallet)
        let hash = await this.fundingTokenContract.rootHash();
        console.log(hash)

    }

    async setRootHash(address, hash) {
        this.fundingTokenContract = new ethers.Contract(address, FundingToken.abi, this.wallet)
        await this.fundingTokenContract.updateHash(hash);

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

    async recoverSignature(nonce, signature) {
        return await ethers.utils.verifyMessage(nonce.toString(), signature)
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


}

module.exports = new Service();

