# NVIDIA notifier

Get notified as soon as an NVIDIA GeForce RTX Founders Edition is available for purchase.

## Requirements

- [Node.js](https://nodejs.org/)

## Installation

### Clone this repository

- `git clone https://github.com/ElegyD/nvidia-notifier.git`

### Install node packages

- `cd nvidia-notifier/`
- `npm install`
- (Optional): `npm install -g pm2`

### Setup environment variables

Create a `.env` file in the root directory for configuration.  
> Default values are shown below
```
INTERVAL=60         # Inverval in seconds to fetch NVIDIA API
LOCALE=de-de        # Locale used to fetch NVIDIA API
RTX_3090=false      # Enable/Disable RTX 3090
RTX_3080_TI=false   # Enable/Disable RTX 3080 Ti
RTX_3080=false      # Enable/Disable RTX 3080
RTX_3070_TI=false   # Enable/Disable RTX 3070 Ti
RTX_3070=false      # Enable/Disable RTX 3070
RTX_3060_TI=false   # Enable/Disable RTX 3060 Ti
DISCORD_TOKEN=      # Discord bot token
DISCORD_CHANNEL_ID= # Discord channel ID
DISCORD_ROLE_ID=    # Discord role ID
DISCORD_USER_IDS=   # Discord user IDs seperated by ';'
```

### Discord notifications

First enter your Discord bot token in the `.env` file

- For server channel messages:
    - Enter the channel ID and a optional role ID in the `.env` file
- For direct user messages:
    - Enter one or more user ID's seperated by `;` in the `.env` file

### Email notifications

To get notified by mail, the `nodemailer` module is used.

- Create a `nodemailer.json` file in the root directory and enter your transport options.  

Example setup for Gmail (with Google accounts that have 2FA enabled):

1. Create an App password [here](https://myaccount.google.com/apppasswords)
2. Create the `nodemailer.json` file in the root directory
    ```json
    {
        "service": "gmail",
        "auth": {
            "user": "youraddress@gmail.com",
            "pass": "yourapppassword"
        }
    }
    ```

For other providers see the nodemailer SMTP configuration [here](https://nodemailer.com/smtp/).

## Usage

Either:  
- Start with node:
    - `node index.js`
- Start with PM2 to run it in the background:
    - `pm2 start index.js`
