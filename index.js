require('dotenv').config();

const https = require('https');
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
    'RTX 3090 Ti': process.env.RTX_3090_TI,
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
    process.exit();
}

const url = `https://api.nvidia.partners/edge/product/search?page=1&limit=9&locale=${locale}&category=GPU&gpu=${selectedGPUs}&manufacturer=NVIDIA`;
const urlsFEInventory = [
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT090T&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT090&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT080T&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT080&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT070T&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT070&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT060T&locale=${localeFEInventory}`
];
const options = {
    headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
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
 * NVGFT090T = NVIDIA GEFORCE RTX 3090 Ti
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

        var time = date.toISOString();

        if (process.env.RTX_3090_TI) {
            fetchFEInventory(urlsFEInventory[0], (listMap) => {
                var wasActiveNVGFT090T = currentFEInventory[`NVGFT090T_${localeFEInventory}`];
                var isActiveNVGFT090T = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3090 Ti';
                    if (is_active) {
                        isActiveNVGFT090T = true;
                        console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                        if (!wasActiveNVGFT090T) {
                            notify(productTitle, product_url);
                        }
                    } else {
                        console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
                    }
                }
                currentFEInventory[`NVGFT090T_${localeFEInventory}`] = isActiveNVGFT090T;
            });
        }

        if (process.env.RTX_3090) {
            fetchFEInventory(urlsFEInventory[1], (listMap) => {
                var wasActiveNVGFT090 = currentFEInventory[`NVGFT090_${localeFEInventory}`];
                var isActiveNVGFT090 = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3090';
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
                currentFEInventory[`NVGFT090_${localeFEInventory}`] = isActiveNVGFT090;
            });
        }

        if (process.env.RTX_3080_TI) {
            fetchFEInventory(urlsFEInventory[2], (listMap) => {
                var wasActiveNVGFT080T = currentFEInventory[`NVGFT080T_${localeFEInventory}`];
                var isActiveNVGFT080T = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3080 Ti';
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
                currentFEInventory[`NVGFT080T_${localeFEInventory}`] = isActiveNVGFT080T;
            });
        }

        if (process.env.RTX_3080) {
            fetchFEInventory(urlsFEInventory[3], (listMap) => {
                var wasActiveNVGFT080 = currentFEInventory[`NVGFT080_${localeFEInventory}`];
                var isActiveNVGFT080 = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3080';
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
                currentFEInventory[`NVGFT080_${localeFEInventory}`] = isActiveNVGFT080;
            });
        }

        if (process.env.RTX_3070_TI) {
            fetchFEInventory(urlsFEInventory[4], (listMap) => {
                var wasActiveNVGFT070T = currentFEInventory[`NVGFT070T_${localeFEInventory}`];
                var isActiveNVGFT070T = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3070 Ti';
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
                currentFEInventory[`NVGFT070T_${localeFEInventory}`] = isActiveNVGFT070T;
            });
        }

        if (process.env.RTX_3070) {
            fetchFEInventory(urlsFEInventory[5], (listMap) => {
                var wasActiveNVGFT070 = currentFEInventory[`NVGFT070_${localeFEInventory}`];
                var isActiveNVGFT070 = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3070';
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
                currentFEInventory[`NVGFT070_${localeFEInventory}`] = isActiveNVGFT070;
            });
        }

        if (process.env.RTX_3060_TI) {
            fetchFEInventory(urlsFEInventory[6], (listMap) => {
                var wasActiveNVGFT060T = currentFEInventory[`NVGFT060T_${localeFEInventory}`];
                var isActiveNVGFT060T = false;
                for (const product of listMap) {
                    var is_active = product['is_active'] === 'true';
                    var product_url = product['product_url'];
                    let productTitle = 'NVIDIA GEFORCE RTX 3060 Ti';
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
                currentFEInventory[`NVGFT060T_${localeFEInventory}`] = isActiveNVGFT060T;
            });
        }

        fetchProductDetails(products => {
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

function fetchFEInventory(url, callback) {
    https.get(url, options, res => {
        var buffer = [];

        res.on('data', data => {
            buffer.push(data);
        });
        res.on('end', () => {
            var body = Buffer.concat(buffer);
            var json = JSON.parse(body);
            if (json === null) {
                return;
            }
            var listMap = json['listMap'];
            callback(listMap);
        });
        res.on('error', e => {
            console.log(e);
        });
    }).on('error', error => {
        console.log(error);
    });
}

function fetchProductDetails(callback) {
    https.get(url, options, res => {
        var buffer = [];

        res.on('data', data => {
            buffer.push(data);
        });
        res.on('end', () => {
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
        res.on('error', e => {
            console.log(e);
        });
    }).on('error', error => {
        console.log(error);
    });
}
