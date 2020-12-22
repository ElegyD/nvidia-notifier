require('dotenv').config();

const https = require('https');
const nodemailer = require('nodemailer');
const transport = require('./nodemailer.json');

const interval = Math.max(1, Number(process.env.INTERVAL) || 60) * 1000
const locale = process.env.LOCALE || 'de-de';
const gpus = {
    'RTX 3090': process.env.RTX_3090,
    'RTX 3080': process.env.RTX_3080,
    'RTX 3070': process.env.RTX_3070,
    'RTX 3060 Ti': process.env.RTX_3060_TI
};
const selectedGPUs = Object.keys(gpus).filter(key => gpus[key] === 'true').join();

const url = `https://api.nvidia.partners/edge/product/search?page=1&limit=9&locale=${locale}&category=GPU&gpu=${selectedGPUs}&manufacturer=NVIDIA&manufacturer_filter=NVIDIA~2,ASUS~7,EVGA~10,GAINWARD~0,GIGABYTE~6,MSI~2,PNY~4,ZOTAC~3`;
const options = {};

var purchaseLinks = new Set();

// Fetch once to get current purchase links
fetchProductDetails(products => {
    for (const productDetails of products) {
        for (const retailer of productDetails['retailers']) {
            var purchaseLink = retailer['purchaseLink'];
            purchaseLinks.add(purchaseLink);
        }
    }

    setupFinished();
});

function setupFinished() {
    setInterval(() => {
        fetchProductDetails(products => {
            var time = new Date().toLocaleTimeString();
            for (const productDetails of products) {
                var productTitle = productDetails['productTitle'];
                //var productPrice = productDetails['productPrice'];
                var retailers = productDetails['retailers'];
                if (retailers.length == 0) {
                    console.log(`${time}: ${productTitle} - NO retailers`);
                } else {
                    for (const retailer of retailers) {
                        var purchaseLink = retailer['purchaseLink'];
                        if (purchaseLinks.has(purchaseLink)) {
                            console.log(`${time}: ${productTitle} - OLD purchaseLink ${purchaseLink}`);
                        } else {
                            console.log(`${time}: ${productTitle} - NEW purchaseLink ${purchaseLink}`);
                            purchaseLinks.add(purchaseLink);
                            sendMail(productTitle, purchaseLink);
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
        res.on('data', data => {
            var json = JSON.parse(data);
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
