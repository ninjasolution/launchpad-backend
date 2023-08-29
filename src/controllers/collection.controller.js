const db = require("../models");
const Collection = db.collection;

exports.list = (req, res) => {
    var options = {
        sort: { createdAt: -1 },
        page: req.query.page || 1,
        limit: req.query.limit || 10,
    };
    Collection.paginate({ createdBy: req.query.createdBy }, options, (err, collections) => {

        if (err) {
            return res.status(500).send({ message: err });
        }

        if (!collections) {
            return res.status(404).send({ message: "Collection Not found.", status: "errors" });
        }

        return res.status(200).send({ status: true, data: collections });
    })

}


