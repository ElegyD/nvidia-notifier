import 'dotenv/config';

import nodemailer from 'nodemailer';
import { JWT } from 'google-auth-library';
const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
import { Client, GatewayIntentBits } from 'discord.js';
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
if (process.env.DISCORD_TOKEN) {
    await client.login(process.env.DISCORD_TOKEN);
}

const interval = Math.max(1, Number(process.env.INTERVAL) || 60) * 1000
const locale = process.env.LOCALE || 'de-de';
const localeFEInventory = process.env.LOCALE_FEINVENTORY || 'DE';
const gpus = {
    'RTX 5090': process.env.RTX_5090,
    'RTX 5080': process.env.RTX_5080
};
const selectedGPUs = Object.keys(gpus).filter(key => gpus[key] === 'true').map(key => encodeURI(key)).join();
if (selectedGPUs.length === 0) {
    console.log('No GPUs selected. Enable at least one GPU in your .env file.');
    process.exit();
}

const url = `https://api.nvidia.partners/edge/product/search?page=1&limit=9&locale=${locale}&category=GPU&gpu=${selectedGPUs}&manufacturer=NVIDIA`;
const urlsFEInventory = [
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT590&locale=${localeFEInventory}`,
    `https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT580&locale=${localeFEInventory}`
];
const options = {
    headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
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
let currentTypes = {};

/**
 * NVGFT590 = NVIDIA GEFORCE RTX 5090
 * NVGFT580 = NVIDIA GEFORCE RTX 5080
 */
let currentFEInventory = {};

// Fetch once to get current availability
fetchProducts(false);
setInterval(() => {
    fetchProducts(true);
}, interval);

async function fetchProducts(sendNotification) {
    const date = new Date();
    if (process.env.DAYS) {
        const days = process.env.DAYS.split(',').map(x => parseInt(x));
        if (!days.includes(date.getDay())) {
            return;
        }
    }
    if (process.env.HOURS) {
        const hours = process.env.HOURS.split('-').map(x => parseInt(x));
        const hour = date.getHours();
        if (hours.length === 2 && (hour < hours[0] || hour >= hours[1])) {
            return;
        }
    }

    const time = date.toISOString();

    if (process.env.RTX_5090) {
        const listMap = await fetchFEInventory(urlsFEInventory[0]);
        const wasActiveNVGFT590 = currentFEInventory[`NVGFT590_${localeFEInventory}`];
        let isActiveNVGFT590 = false;
        for (const product of listMap) {
            const is_active = product['is_active'] === 'true';
            const product_url = product['product_url'];
            const productTitle = 'NVIDIA GEFORCE RTX 5090';
            if (is_active) {
                isActiveNVGFT590 = true;
                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                if (!wasActiveNVGFT590 && sendNotification) {
                    notify(productTitle, product_url);
                }
            } else {
                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
            }
        }
        currentFEInventory[`NVGFT590_${localeFEInventory}`] = isActiveNVGFT590;
    }

    if (process.env.RTX_5080) {
        const listMap = await fetchFEInventory(urlsFEInventory[1]);
        const wasActiveNVGFT580 = currentFEInventory[`NVGFT580_${localeFEInventory}`];
        let isActiveNVGFT580 = false;
        for (const product of listMap) {
            const is_active = product['is_active'] === 'true';
            const product_url = product['product_url'];
            const productTitle = 'NVIDIA GEFORCE RTX 5080';
            if (is_active) {
                isActiveNVGFT580 = true;
                console.log(`${time}: [${productTitle}] [FEInventory] - Available at ${product_url}`);
                if (!wasActiveNVGFT580 && sendNotification) {
                    notify(productTitle, product_url);
                }
            } else {
                console.log(`${time}: [${productTitle}] [FEInventory] - Out of stock`);
            }
        }
        currentFEInventory[`NVGFT580_${localeFEInventory}`] = isActiveNVGFT580;
    }

    const products = await fetchProductDetails();
    for (const productDetails of products) {
        const productTitle = productDetails['productTitle'];
        //const productPrice = productDetails['productPrice'];
        const gpu = productDetails['gpu'];
        const prdStatus = productDetails['prdStatus'];
        if (prdStatus !== "out_of_stock") {
            console.log(`${time}: [${productTitle}] - prdStatus not "out_of_stock": ${prdStatus}`);
        }
        const retailers = productDetails['retailers'];
        const retailerNames = [];
        for (const retailer of retailers) {
            //const isAvailable = retailer['isAvailable'];
            const purchaseLink = retailer['purchaseLink'];
            //const partnerId = retailer['partnerId'];
            //const storeId = retailer['storeId'];
            const retailerName = retailer['retailerName'];
            const type = retailer['type'];
            retailerNames.push(retailerName);
            if (type !== 80) {
                console.log(`${time}: [${productTitle}] [${retailerName}] - Available at ${purchaseLink}`);
                const wasAvailable = retailerName in currentTypes[gpu] && currentTypes[gpu][retailerName] !== 80;
                if (!wasAvailable && sendNotification) {
                    notify(productTitle, purchaseLink);
                }
            } else {
                console.log(`${time}: [${productTitle}] [${retailerName}] - Out of stock`);
            }
            if (!currentTypes[gpu]) {
                currentTypes[gpu] = {};
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

function notify(productTitle, purchaseLink) {
    sendMail(productTitle, purchaseLink);
    sendDiscordMessage(productTitle, purchaseLink);
    sendFCMNotification(productTitle, purchaseLink);
}

async function sendMail(productTitle, purchaseLink) {
    try {
        const json = await import('./nodemailer.json', { with: { type: 'json' } });
        if (!json) {
            return;
        }

        const transport = json.default;
        const transporter = nodemailer.createTransport(transport);

        const mailOptions = {
            from: transport.auth.user,
            to: transport.auth.user,
            subject: productTitle,
            text: purchaseLink
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: ' + info.response);
        } catch (error) {
            console.log(error);
        }
    } catch (error) {
        console.log('No nodemailer.json found:', error.message);
    }
}

async function sendDiscordMessage(productTitle, purchaseLink) {
    // Channel notification
    if (process.env.DISCORD_CHANNEL_ID) {
        let message = `${productTitle} - Available at ${purchaseLink}`;
        if (process.env.DISCORD_ROLE_ID) {
            message = `<@&${process.env.DISCORD_ROLE_ID}> ` + message;
        }
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID)
        channel.send(message);
    }

    // User notification
    if (process.env.DISCORD_USER_IDS) {
        const userIds = process.env.DISCORD_USER_IDS.split(';');
        for (const userId of userIds) {
            const user = await client.users.fetch(userId);
            user.send(`${productTitle} - Available at ${purchaseLink}`);
        }
    }
}

async function sendFCMNotification(productTitle, purchaseLink) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return;
    }

    const accessToken = await getAccessToken();
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

    const json = await import(process.env.GOOGLE_APPLICATION_CREDENTIALS, { with: { type: 'json' } });
    const projectId = json.default.project_id;

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send?access_token=${accessToken}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        body: data
    });
    console.log(await response.text());
}

async function getAccessToken() {
    const json = await import(process.env.GOOGLE_APPLICATION_CREDENTIALS, { with: { type: 'json' } });
    const key = json.default;
    const jwtClient = new JWT(
        key.client_email,
        null,
        key.private_key,
        SCOPES,
        null
    );
    const credentials = await jwtClient.authorize()
    return credentials.access_token;
}

async function fetchFEInventory(url) {
    const response = await fetch(url, options);
    const json = await response.json();
    return json['listMap'];
}

async function fetchProductDetails() {
    const response = await fetch(url, options);
    const json = await response.json();
    const searchedProducts = json['searchedProducts'];
    const featuredProduct = searchedProducts['featuredProduct'];
    const productDetails = searchedProducts['productDetails'];
    const products = [];
    if (featuredProduct) {
        products.push(featuredProduct);
    }
    for (const product of productDetails) {
        products.push(product);
    }
    return products;
}
