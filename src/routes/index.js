const express = require("express");
const router = express.Router();
const middlewares = require("../middleware");
const stripPaymentController = require("../controllers/StripPayment.controller");
const PayPalPaymentController = require("../controllers/PaypalPayment.controller");
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");
const cryptoPaymentController = require("../controllers/cryptoPayment.controller");
const collectionController = require("../controllers/collection.controller");
const nftController = require("../controllers/nft.controller");
const fileController = require("../controllers/file.controller");
const cryptoController = require("../controllers/crypto.controller");
const projectController = require("../controllers/project.controller");
const adminController = require("../controllers/admin.controller");
const chainController = require("../controllers/chain.controller");
const coinController = require("../controllers/coin.controller");
const countryController = require("../controllers/country.controller");
const transactionController = require("../controllers/transaction.controller");

router.post("/auth/signup", [middlewares.verifySignUp.checkRolesExisted], authController.signup)
router.post("/auth/signin", authController.signin)
router.post("/auth/signout", authController.signout)
router.get("/auth/verifyEmail/:id/:token", authController.verifyEmail)
router.get("/auth/verifyPhoneNumber/:id/:token", authController.verifyPhoneNumber)
router.post("/auth/forgot", authController.forgot)
router.get("/auth/requestEmailVerify", middlewares.authJwt.verifyToken, authController.requestEmailVerify)
router.get("/auth/requestPhoneVerify", middlewares.authJwt.verifyToken, authController.requestPhoneVerify)
router.get("/auth/rest/:token", authController.reset)
router.put("/auth/rest", authController.changePassword)

router.put("/super-admin/approve", userController.approve);
router.post("/admin/create", authController.signup);
router.get("/admin/get-nonce/:address", userController.getUserNonce);
router.get("/admin/single/:id([0-9]+)", [middlewares.authJwt.verifyToken, middlewares.authJwt.isAdmin], userController.getUser);
router.put("/admin/edit", middlewares.authJwt.verifyToken, userController.update);
router.get("/admin/gen-snapshot", middlewares.authJwt.verifyToken, projectController.genSnapshot);
router.get("/admin/get-whitelisted-user", middlewares.authJwt.verifyToken, projectController.getWhiteList);
router.get("/admin/get-snapshot-data", middlewares.authJwt.verifyToken, projectController.getSnapshot);

router.get("/admin/list", [middlewares.authJwt.verifyToken, middlewares.authJwt.isAdmin], userController.getUnApprovedAdmins);
router.post("/admin/upload-social-raffle", [middlewares.authJwt.verifyToken, middlewares.authJwt.isAdmin], fileController.uploadCVS, fileController.csvUploader);

router.get("/user", middlewares.authJwt.verifyToken, userController.allUsers);
router.get("/user/check-verification", middlewares.authJwt.verifyToken, userController.checkVerification);
router.delete("/user/:id([0-9]+)", [middlewares.authJwt.verifyToken, middlewares.authJwt.isAdmin], userController.delete);
router.get("/dashboard", [middlewares.authJwt.verifyToken], userController.dashboard);
router.get("/payment-info", [middlewares.authJwt.verifyToken], userController.getpaymentinfo);
router.post("/withdraw", [middlewares.authJwt.verifyToken], userController.withdraw);

//Avatar
router.get("/avatar/:fileName", fileController.getFile);
router.delete("/avatar/:fileName", middlewares.authJwt.isAdmin, fileController.delete);


//Collection
router.get("/collection/list", collectionController.list)

//Country
router.get("/country/list", countryController.list)

//Project
router.get("/project/list", projectController.list)
router.post("/project/create", middlewares.authJwt.verifyToken, projectController.create)
router.put("/project", middlewares.authJwt.verifyToken, projectController.update)
router.put("/project/approve", middlewares.authJwt.verifyToken, projectController.approve)
router.put("/project/hash", middlewares.authJwt.verifyToken, projectController.pushHash)
router.get("/project", projectController.get)
router.put("/project/visible", projectController.setVisible)
router.get("/project/get-proof/:projectId/:tagId/:amount/:userId",  projectController.getProof)
router.put("/project/tag/:projectId/:tagId", middlewares.authJwt.verifyToken, projectController.updateTag)

//Transaction
router.post("/transaction", middlewares.authJwt.verifyToken, transactionController.create)


//Chain
router.post("/chain/create", middlewares.authJwt.verifyToken, chainController.create)
router.get("/chain/list", chainController.list)

//Coin
router.post("/coin/create", middlewares.authJwt.verifyToken, coinController.create)
router.get("/coin/list", coinController.list)

//NFT
router.get("/nft/list", nftController.list)

//Crypto Payment
router.post("/crypto/payment", middlewares.authJwt.verifyToken, cryptoPaymentController.payment)

//Strip Payment
router.get("/stripe", middlewares.authJwt.verifyToken, stripPaymentController.index);
router.post("/stripe/payment", middlewares.authJwt.verifyToken, stripPaymentController.payment);

// Paypal Payment
router.post("/paypal/payment", middlewares.authJwt.verifyToken, PayPalPaymentController.payment);

router.get("/top/:page/:limit", middlewares.authJwt.verifyToken, cryptoController.top);
router.get("/currencies/:coin", middlewares.authJwt.verifyToken, cryptoController.currencies)
router.get("/currency/gainers", cryptoController.topGainers)

router.get("/admin/db/drop", [middlewares.authJwt.verifyToken, middlewares.authJwt.isAdmin], adminController.drop)

module.exports = router;
