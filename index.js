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
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Cache-Control': 'no-cache'
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
 * NVGFT090 = NVIDIA GEFORCE RTX 3090
 * NVGFT080T = NVIDIA GEFORCE RTX 3080 Ti
 * NVGFT080 = NVIDIA GEFORCE RTX 3080
 * NVGFT070T = NVIDIA GEFORCE RTX 3070 Ti
 * NVGFT070 = NVIDIA GEFORCE RTX 3070
 * NVGFT060T = NVIDIA GEFORCE RTX 3060 Ti
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
        var date = new Date();
        if (process.env.DAYS) {
            var days = process.env.DAYS.split(',').map(x => parseInt(x));
            if (!days.includes(date.getDay())) {
                return;
            }
        }
        if (process.env.HOURS) {
            var hours = process.env.HOURS.split('-').map(x => parseInt(x));
            var hour = date.getHours();
            if (hours.length == 2 && (hour < hours[0] || hour >= hours[1])) {
                return;
            }
        }

        fetchFEInventory(listMap => {
            var time = new Date().toISOString();
            var wasActiveNVGFT090 = currentFEInventory[`NVGFT090_${localeFEInventory}`];
            var wasActiveNVGFT080T = currentFEInventory[`NVGFT080T_${localeFEInventory}`];
            var wasActiveNVGFT080 = currentFEInventory[`NVGFT080_${localeFEInventory}`];
            var wasActiveNVGFT070T = currentFEInventory[`NVGFT070T_${localeFEInventory}`];
            var wasActiveNVGFT070 = currentFEInventory[`NVGFT070_${localeFEInventory}`];
            var wasActiveNVGFT060T = currentFEInventory[`NVGFT060T_${localeFEInventory}`];
            var isActiveNVGFT090 = false;
            var isActiveNVGFT080T = false;
            var isActiveNVGFT080 = false;
            var isActiveNVGFT070T = false;
            var isActiveNVGFT070 = false;
            var isActiveNVGFT060T = false;
            for (const product of listMap) {
                var is_active = product['is_active'] === 'true';
                var fe_sku = product['fe_sku'];
                var product_url = product['product_url'];
                switch (fe_sku) {
                    case `NVGFT090_${localeFEInventory}`: {
                        let productTitle = 'NVIDIA GEFORCE RTX 3090';
                        if (process.env.RTX_3090 === 'true') {
                            if (is_active) {
                                isActiveNVGFT090 = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT090) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case `NVGFT080T_${localeFEInventory}`: {
                        let productTitle = 'NVIDIA GEFORCE RTX 3080 Ti';
                        if (process.env.RTX_3080_TI === 'true') {
                            if (is_active) {
                                isActiveNVGFT080T = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT080T) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case `NVGFT080_${localeFEInventory}`: {
                        let productTitle = 'NVIDIA GEFORCE RTX 3080';
                        if (process.env.RTX_3080 === 'true') {
                            if (is_active) {
                                isActiveNVGFT080 = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT080) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case `NVGFT070T_${localeFEInventory}`: {
                        let productTitle = 'NVIDIA GEFORCE RTX 3070 Ti';
                        if (process.env.RTX_3070_TI === 'true') {
                            if (is_active) {
                                isActiveNVGFT070T = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT070T) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case `NVGFT070_${localeFEInventory}`: {
                        let productTitle = 'NVIDIA GEFORCE RTX 3070';
                        if (process.env.RTX_3070 === 'true') {
                            if (is_active) {
                                isActiveNVGFT070 = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT070) {
                                    notify(productTitle, product_url);
                                }
                            } else {
                                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                            }
                        }
                        break;
                    }
                    case `NVGFT060T_${localeFEInventory}`: {
                        let productTitle = 'NVIDIA GEFORCE RTX 3060 Ti';
                        if (process.env.RTX_3060_TI === 'true') {
                            if (is_active) {
                                isActiveNVGFT060T = true;
                                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                                if (!wasActiveNVGFT060T) {
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
            currentFEInventory[`NVGFT090_${localeFEInventory}`] = isActiveNVGFT090;
            currentFEInventory[`NVGFT080T_${localeFEInventory}`] = isActiveNVGFT080T;
            currentFEInventory[`NVGFT080_${localeFEInventory}`] = isActiveNVGFT080;
            currentFEInventory[`NVGFT070T_${localeFEInventory}`] = isActiveNVGFT070T;
            currentFEInventory[`NVGFT070_${localeFEInventory}`] = isActiveNVGFT070;
            currentFEInventory[`NVGFT060T_${localeFEInventory}`] = isActiveNVGFT060T;
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
                    "android": {
                        "priority": "high"
                    }
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

        var buffer = [];

        gunzip.on('data', data => {
            buffer.push(data);
        });
        gunzip.on('end', () => {
            var body = Buffer.concat(buffer);
            var json = JSON.parse(body);
            if (json === null) {
                return;
            }
            var listMap = json['listMap'];
            callback(listMap);
        });
        gunzip.on('error', e => {
            console.log(e);
        });
    }).on('error', error => {
        console.log(error);
    });
}

function fetchProductDetails(callback) {
    https.get(url, options, res => {
        var gunzip = zlib.createGunzip();
        res.pipe(gunzip);

        var buffer = [];

        gunzip.on('data', data => {
            buffer.push(data);
        });
        gunzip.on('end', () => {
            var body = Buffer.concat(buffer);
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
        gunzip.on('error', e => {
            console.log(e);
        });
    }).on('error', error => {
        console.log(error);
    });
}
