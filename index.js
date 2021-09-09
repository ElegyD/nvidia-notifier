require('dotenv').config();

const https = require('https');
const zlib = require('zlib');
const nodemailer = require('nodemailer');
const transport = require('./nodemailer.json');
const {JWT} = require('google-auth-library');
const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
if (process.env.DISCORD_TOKEN) {
    client.login(process.env.DISCORD_TOKEN)
        .catch(error => {
            console.log(error);
        });
}

client.on('ready', () => {

});

const interval = Math.max(1, Number(process.env.INTERVAL) || 60) * 1000
const locale = process.env.LOCALE || 'de-de';
const localeFEInventory = process.env.LOCALE_FEINVENTORY || 'DE';
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
const urlFEInventory = `https://api.store.nvidia.com/partner/v1/feinventory?skus=${localeFEInventory}~NVGFT070~NVGFT080~NVGFT090~NVLKR30S~NSHRMT01~NVGFT060T~187&locale=${localeFEInventory}`
const options = {
    headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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

/**
 * NVGFT090_DE = NVIDIA GEFORCE RTX 3090
 * NVGFT080T_DE = NVIDIA GEFORCE RTX 3080 Ti
 * NVGFT080_DE = NVIDIA GEFORCE RTX 3080
 * NVGFT070T_DE = NVIDIA GEFORCE RTX 3070 Ti
 * NVGFT070_DE = NVIDIA GEFORCE RTX 3070
 * NVGFT060T_DE = NVIDIA GEFORCE RTX 3060 Ti
 */
var currentFEInventory = {};

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
        fetchFEInventory(listMap => {
            var time = new Date().toISOString();
            var wasActiveNVGFT090_DE = currentFEInventory['NVGFT090_DE'];
            var wasActiveNVGFT080T_DE = currentFEInventory['NVGFT080T_DE'];
            var wasActiveNVGFT080_DE = currentFEInventory['NVGFT080_DE'];
            var wasActiveNVGFT070T_DE = currentFEInventory['NVGFT070T_DE'];
            var wasActiveNVGFT070_DE = currentFEInventory['NVGFT070_DE'];
            var wasActiveNVGFT060T_DE = currentFEInventory['NVGFT060T_DE'];
            var isActiveNVGFT090_DE = false;
            var isActiveNVGFT080T_DE = false;
            var isActiveNVGFT080_DE = false;
            var isActiveNVGFT070T_DE = false;
            var isActiveNVGFT070_DE = false;
            var isActiveNVGFT060T_DE = false;
            for (const product of listMap) {
                var is_active = product['is_active'] === 'true';
                var fe_sku = product['fe_sku'];
                var product_url = product['product_url'];
                switch (fe_sku) {
                    case 'NVGFT090_DE': {
                        let productTitle = 'NVIDIA GEFORCE RTX 3090';
                        if (process.env.RTX_3090 === 'true') {
                            if (is_active) {
                                isActiveNVGFT090_DE = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT090_DE) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case 'NVGFT080T_DE': {
                        let productTitle = 'NVIDIA GEFORCE RTX 3080 Ti';
                        if (process.env.RTX_3080_TI === 'true') {
                            if (is_active) {
                                isActiveNVGFT080T_DE = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT080T_DE) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case 'NVGFT080_DE': {
                        let productTitle = 'NVIDIA GEFORCE RTX 3080';
                        if (process.env.RTX_3080 === 'true') {
                            if (is_active) {
                                isActiveNVGFT080_DE = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT080_DE) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case 'NVGFT070T_DE': {
                        let productTitle = 'NVIDIA GEFORCE RTX 3070 Ti';
                        if (process.env.RTX_3070_TI === 'true') {
                            if (is_active) {
                                isActiveNVGFT070T_DE = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT070T_DE) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case 'NVGFT070_DE': {
                        let productTitle = 'NVIDIA GEFORCE RTX 3070';
                        if (process.env.RTX_3070 === 'true') {
                            if (is_active) {
                                isActiveNVGFT070_DE = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT070_DE) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case 'NVGFT060T_DE': {
                        let productTitle = 'NVIDIA GEFORCE RTX 3060 Ti';
                        if (process.env.RTX_3060_TI === 'true') {
                            if (is_active) {
                                isActiveNVGFT060T_DE = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT060T_DE) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                }
            }
            currentFEInventory['NVGFT090_DE'] = isActiveNVGFT090_DE;
            currentFEInventory['NVGFT080T_DE'] = isActiveNVGFT080T_DE;
            currentFEInventory['NVGFT080_DE'] = isActiveNVGFT080_DE;
            currentFEInventory['NVGFT070T_DE'] = isActiveNVGFT070T_DE;
            currentFEInventory['NVGFT070_DE'] = isActiveNVGFT070_DE;
            currentFEInventory['NVGFT060T_DE'] = isActiveNVGFT060T_DE;
        });

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
                                notify(productTitle, purchaseLink);
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

function notify(productTitle, purchaseLink) {
    sendMail(productTitle, purchaseLink);
    sendDiscordMessage(productTitle, purchaseLink);
    sendFCMNotification(productTitle, purchaseLink);
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

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

async function sendDiscordMessage(productTitle, purchaseLink) {
    // Channel notification
    if (process.env.DISCORD_CHANNEL_ID) {
        var message = `${productTitle} - Available at ${purchaseLink}`;
        if (process.env.DISCORD_ROLE_ID) {
            message = `<@&${process.env.DISCORD_ROLE_ID}> ` + message;
        }
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID)
        channel.send(message);
    }

    // User notification
    if (process.env.DISCORD_USER_IDS) {
        var userIds = process.env.DISCORD_USER_IDS.split(';');
        for (const userId of userIds) {
            const user = await client.users.fetch(userId);
            user.send(`${productTitle} - Available at ${purchaseLink}`);
        }
    }
}

function sendFCMNotification(productTitle, purchaseLink) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return;
    }

    getAccessToken()
        .then(accessToken => {
            const data = JSON.stringify({
                "message": {
                    "topic": "nvidia-notifier",
                    /*"notification": {
                        "title": productTitle,
                        "body": purchaseLink
                    },*/
                    "data": {
                        "productTitle": productTitle,
                        "purchaseLink": purchaseLink
                    },
                    /*"webpush": {
                        "fcm_options": {
                            "link": purchaseLink
                        }
                    }*/
                }
            });

            const projectId = require(process.env.GOOGLE_APPLICATION_CREDENTIALS).project_id;
            
            const options = {
                hostname: 'fcm.googleapis.com',
                port: 443,
                path: `/v1/projects/${projectId}/messages:send?access_token=${accessToken}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };
        
            const req = https.request(options, res => {
                console.log(`statusCode: ${res.statusCode}`);
        
                res.on('data', d => {
                    process.stdout.write(d);
                });
            });
        
            req.on('error', error => {
                console.error(error);
            });
        
            req.write(data);
            req.end();
        })
        .catch(err => console.error(err));
}

function getAccessToken() {
    return new Promise(function(resolve, reject) {
        const key = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        const jwtClient = new JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        );
        jwtClient.authorize(function(err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

function fetchFEInventory(callback) {
    https.get(urlFEInventory, options, res => {
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
            var listMap = json['listMap'];
            callback(listMap);
        });
    }).on('error', error => {
        console.log(error);
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
