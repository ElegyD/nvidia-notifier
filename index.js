require('dotenv').config();

const https = require('https');
const zlib = require('zlib');
const nodemailer = require('nodemailer');
const transport = require('./nodemailer.json');

const interval = Math.max(1, Number(process.env.INTERVAL) || 60) * 1000
const locale = process.env.LOCALE || 'de-de';
const gpus = {
    'RTX 3090': process.env.RTX_3090,
    'RTX 3080 Ti': process.env.RTX_3080_TI,
    'RTX 3080': process.env.RTX_3080,
    'RTX 3070 Ti': process.env.RTX_3070_TI,
    'RTX 3070': process.env.RTX_3070,
    'RTX 3060 Ti': process.env.RTX_3060_TI
};
const selectedGPUs = Object.keys(gpus).filter(key => gpus[key] === 'true').map(key => encodeURI(key)).join();
if (selectedGPUs.length == 0) {
    console.log('No GPUs selected. Enable at least one GPU in your .env file.');
    return;
}

const url = `https://api.nvidia.partners/edge/product/search?page=1&limit=9&locale=${locale}&category=GPU&gpu=${selectedGPUs}&manufacturer=NVIDIA`;
const options = {
    headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
    }
};

/**
 * Available types:
 * 
 * 29: "Check Availability"
 * 76: "Buy Now"
 * 75: "Buy Now"
 * 77: "Customized & Buy"
 * 80: "Out Of Stock"
 */
var currentTypes = {};

// Fetch once to get current availability
fetchProductDetails(products => {
    for (const productDetails of products) {
        var gpu = productDetails['gpu'];
        currentTypes[gpu] = {};
        for (const retailer of productDetails['retailers']) {
            //var isAvailable = retailer['isAvailable'];
            //var partnerId = retailer['partnerId'];
            //var storeId = retailer['storeId'];
            var retailerName = retailer['retailerName'];
            var type = retailer['type'];
            currentTypes[gpu][retailerName] = type;
        }
    }

    setupFinished();
});

function setupFinished() {
    setInterval(() => {
        fetchProductDetails(products => {
            var time = new Date().toISOString();
            for (const productDetails of products) {
                var productTitle = productDetails['productTitle'];
                //var productPrice = productDetails['productPrice'];
                var gpu = productDetails['gpu'];
                var prdStatus = productDetails['prdStatus'];
                if (prdStatus !== "out_of_stock") {
                    console.log(`${time}: [${productTitle}] - prdStatus not "out_of_stock": ${prdStatus}`);
                }
                var retailers = productDetails['retailers'];
                if (retailers.length == 0) {
                    console.log(`${time}: [${productTitle}] - No retailers`);
                    currentTypes[gpu] = {};
                } else {
                    var retailerNames = [];
                    for (const retailer of retailers) {
                        //var isAvailable = retailer['isAvailable'];
                        var purchaseLink = retailer['purchaseLink'];
                        //var partnerId = retailer['partnerId'];
                        //var storeId = retailer['storeId'];
                        var retailerName = retailer['retailerName'];
                        var type = retailer['type'];
                        retailerNames.push(retailerName);
                        if (type !== 80) {
                            console.log(`${time}: [${productTitle}] [${retailerName}] - Available at ${purchaseLink}`);
                            var wasAvailable = retailerName in currentTypes[gpu] && currentTypes[gpu][retailerName] !== 80;
                            if (!wasAvailable) {
                                sendMail(productTitle, purchaseLink);
                            }
                        } else {
                            console.log(`${time}: [${productTitle}] [${retailerName}] - Out of stock`);
                        }
                        currentTypes[gpu][retailerName] = type;
                    }
                    for (const retailerName in currentTypes[gpu]) {
                        if (!retailerNames.includes(retailerName)) {
                            delete currentTypes[gpu][retailerName];
                        }
                    }
                }
            }
        });
    }, interval);
}

function sendMail(productTitle, purchaseLink) {
    if (!Object.keys(transport).length) {
        return;
    }

    var transporter = nodemailer.createTransport(transport);

    var mailOptions = {
        from: transport.auth.user,
        to: transport.auth.user,
        subject: productTitle,
        text: purchaseLink
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function fetchProductDetails(callback) {
    https.get(url, options, res => {
        var gunzip = zlib.createGunzip();
        res.pipe(gunzip);

        var body = "";

        gunzip.on('data', data => {
            body += data.toString();
        });

        gunzip.on('end', () => {
            var json = JSON.parse(body);
            if (json === null) {
                return;
            }
            var searchedProducts = json['searchedProducts'];
            var featuredProduct = searchedProducts['featuredProduct'];
            var productDetails = searchedProducts['productDetails'];
            var products = [];
            products.push(featuredProduct);
            for (const product of productDetails) {
                products.push(product);
            }
            callback(products);
        });
    }).on('error', error => {
        console.log(error);
    });
}
