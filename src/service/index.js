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

        // this.setRootHash("0x506A31614297d4eBA6Baf0021CBFD92aa82F4776", "0x77a1281e1dd2a9a567d1730233bf959665e5f8cbf8d5e5939e2f4c349dd7f8b2")
        // this.getRootHash("0x506A31614297d4eBA6Baf0021CBFD92aa82F4776", "0x77a1281e1dd2a9a567d1730233bf959665e5f8cbf8d5e5939e2f4c349dd7f8b2")
    }

    async setRootHash(address, hash) {
        this.fundingTokenContract = new ethers.Contract(address, FundingToken.abi, this.wallet)
        await this.fundingTokenContract.updateHash(hash);

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

    generateMerkleRootAndProof(leaves) {
        const tree = new MerkleTree(leaves, ethers.utils.keccak256, {
            sortPairs: true,
        });
        const root = tree.getHexRoot();
      
        const proofs = leaves.map(leave => tree.getHexProof(leave));
        
      
        return { root, proofs };
    }

    async recoverSignature(nonce, signature) {
        return await ethers.utils.verifyMessage(ethers.utils.hexlify(nonce), signature)
    }

    async createIGO(name, tagIds, tags) {


        let igoSetUp = {
            vestingContract: igoVestingAddr,
            paymentToken: securityTokenAddr,
            permit2: permit2Addr, // bsc
            grandTotal: this.eth(1000000),
            summedMaxTagCap: 0,
            refundFeeDecimals: 2
        }

        let contractSetup = {
            innovator: this.wallet.address,
            paymentReceiver: this.wallet.address,
            admin: this.wallet.address,
            vestedToken: igoTokenAddr,
            platformFee: 10,
            totalTokenOnSale: this.eth(1000000),
            gracePeriod: 60,
            decimals: 18
        }

        let vestingSetup = {
            startTime: 0,
            cliff: 10000,
            duration: 50000,
            initialUnlockPercent: 1
        };

        // let tagIds = ["phase-2"]

        // let tags = []

        let latestBlock = await ethers.providers.getDefaultProvider().getBlock("latest");
        let timestamp = latestBlock.timestamp;
        // tags.push({
        //     status: 0,
        //     merkleRoot: ethers.utils.formatBytes32String("merkleroot"),
        //     startAt: ethers.BigNumber.from(timestamp + 3600),
        //     endAt: ethers.BigNumber.from(timestamp + 3600 + 3600 * 24),
        //     maxTagCap: this.eth(100000)
        // });

        // approve the spending
        await this.igoFactoryContract.createIGO(
            name,
            igoSetUp,
            tagIds,
            tags,
            contractSetup,
            vestingSetup);

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

