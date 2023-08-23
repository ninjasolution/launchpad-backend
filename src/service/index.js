const { RPC, securityTokenAddr, igoVestingAddr, permit2Addr, igoTokenAddr, igoFactoryAddr, igoDeployerAddr } = require("../config");
const ERC20 = require("../abis/ERC20.json")
const IGOFactory = require("../abis/IGOFactory.json")
const IGODeployer = require("../abis/IGODeployer.json")
const FundingToken = require("../abis/FundingToken.json")
const IGO = require("../abis/IGO.json")
const IGOVesting = require("../abis/IGOVesting.json")
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

require('dotenv').config();

class Service {

    constructor() {

        const provider = new ethers.providers.JsonRpcProvider(RPC)
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        this.igoSecContract = new ethers.Contract(securityTokenAddr, ERC20.abi, this.wallet)

        this.igoTokenContract = new ethers.Contract(igoTokenAddr, ERC20.abi, this.wallet)

        this.igoFactoryContract = new ethers.Contract(igoFactoryAddr, IGOFactory.abi, this.wallet)

        this.igoDeployerContract = new ethers.Contract(igoDeployerAddr, IGODeployer.abi, this.wallet)

        let leaves = this.generateAllocLeaves([{
            tagId: "111",
            account: "0x04E117247e2F29d0ff11B99b3df6BFb0FB2Ed2F0",
            maxAllocation: "10000000000",
            refundFee: "23",
            igoTokenPerPaymentToken: "23"
        }, {
            tagId: "111",
            account: "0x04E117247e2F29d0ff11B99b3df6BFb0FB2Ed2F0",
            maxAllocation: "10000000000",
            refundFee: "23",
            igoTokenPerPaymentToken: "23"
        }])
        console.log(leaves)
        console.log(this.generateMerkleRootAndProof(leaves, 0))
        // this.setRootHash("0x506A31614297d4eBA6Baf0021CBFD92aa82F4776", "0x77a1281e1dd2a9a567d1730233bf959665e5f8cbf8d5e5939e2f4c349dd7f8b2")
    }

    async createIGO(name, owner, _igoSetup, _contractSetup, _vestingSetup, _allocations) {

        try {

            let igoSetUp = {
                vestingContract: _igoSetup.igoVestingAddr,
                paymentToken: _igoSetup.paymentTokenAddr,
                permit2: permit2Addr, // bsc
                grandTotal: this.eth(_igoSetup.grandTotal),
                summedMaxTagCap: _igoSetup.summedMaxTagCap,
                refundFeeDecimals: 2
            };

            let contractSetup = {
                innovator: owner,
                paymentReceiver: owner,
                admin: owner,
                vestedToken: _contractSetup.igoTokenAddr,
                platformFee: 10,
                totalTokenOnSale: this.eth(_contractSetup.totalTokenOnSale),
                gracePeriod: 60,
                decimals: _contractSetup.decimals
            };

            let vestingSetup = {
                startTime: _vestingSetup.startTime,
                cliff: _vestingSetup.cliff,
                duration: _vestingSetup.duration,
                initialUnlockPercent: _vestingSetup.initialUnlock
            };

            let tags = []
            let tagIds = []

            for (let i = 0; i < _allocations.length; i++) {

                tags.push({
                    status: 0,
                    merkleRoot: ethers.utils.formatBytes32String("merkleroot"),
                    startAt: ethers.BigNumber.from(_allocations[i].startTime),
                    endAt: ethers.BigNumber.from(_allocations[i].endTime),
                    maxTagCap: eth(_allocations[i].maxCap)
                });
                tagIds.push(_allocations.title);
            }

            let igoTx = await this.igoFactoryContract.createIGO(
                name,
                igoSetUp,
                tagIds,
                tags,
                contractSetup,
                vestingSetup);
            const igoReceipt = await igoTx.wait();

            const event = igoReceipt.events[5];
            console.log(event.args[1], event.args[2], "events");

            return {
                igo: event.args[1],
                vesting: event.args[2]
            }
        } catch {
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

