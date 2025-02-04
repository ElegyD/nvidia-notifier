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
INTERVAL=60                     # Inverval in seconds to fetch NVIDIA API
LOCALE=de-de                    # Locale used to fetch NVIDIA API (language & country code lowercase)
LOCALE_FEINVENTORY=DE           # Locale used to fetch NVIDIA API (country code uppercase)
RTX_5090=false                  # Enable/Disable RTX 5090
RTX_5080=false                  # Enable/Disable RTX 5080
DAYS=                           # Weekdays comma seperated (0=su, 1=mo, …) (e.g. 1,2,3,4,5 for mo-fr)
HOURS=                          # Hours dash seperated (0-23) (e.g. 10-19)
DISCORD_TOKEN=                  # Discord bot token
DISCORD_CHANNEL_ID=             # Discord channel ID
DISCORD_ROLE_ID=                # Discord role ID
DISCORD_USER_IDS=               # Discord user IDs seperated by ';'
GOOGLE_APPLICATION_CREDENTIALS= # Google service account JSON file for FCM notifications
```

### Discord notifications

First enter your Discord bot token in the `.env` file

- For server channel messages:
    - Enter the channel ID and a optional role ID in the `.env` file
- For direct user messages:
    - Enter one or more user ID's seperated by `;` in the `.env` file

### Firebase Cloud Messaging notifications

1. Create a project in [Firebase](https://console.firebase.google.com/)
2. Generate and download the [service account JSON file](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk) by clicking on 'Generate New Private Key'
3. Move the file to the project dir and set the `GOOGLE_APPLICATION_CREDENTIALS` variable in the `.env` file like so:  
    ```
    GOOGLE_APPLICATION_CREDENTIALS="./nvidia-notifier-firebase-adminsdk.json"
    ```
4. Create an app and set up Firebase and FCM
5. Subscribe the client app to the `nvidia-notifier` topic
    - The purchase link is included as a key/value pair in the notification data. Key `purchaseLink`.

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
