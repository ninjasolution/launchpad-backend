const axios = require('axios').default;

const requestopts = {
    convert: "USD",
    headers: {
      "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY,
    },
  };
exports.top = (req, res) => {
    let page = req.params.page;
    let limit = req.params.limit;
    axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=${(page - 1) * limit + 1}&limit=${limit}`,requestopts)
    .then(function (response) {
        res.json(response.data);
    })
    .catch(function (error) {
        res.json(error);
    });
}

exports.currencies = (req, res) => {
    let coin = req.params.coin;
    axios.get(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${coin}`,
        requestopts
    )
    .then(function (response) {
        res.json(response.data);
    })
    .catch(function (error) {
        res.json(error);
    });
}

exports.topGainers = (req, res) => {
    axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/gainers-losers?start=1&limit=10`,requestopts)
    .then(function (response) {
        res.json(response.data);
    })
    .catch(function (error) {
        res.json(error);
    });
}