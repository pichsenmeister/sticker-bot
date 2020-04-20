# Stickers for Slack

[Install Stickers for Slack](https://slack.com/oauth/v2/authorize?client_id=567034155908.943035455044&scope=chat:write,commands,im:history,im:write,reactions:write,files:read)

This app uses the [Bolt for Slack](https://slack.dev/bolt/concepts) framework and Google Firebase.

## Slack app configuration


1. Create an [app](https://api.slack.com/apps) on Slack
2. Enable `Home Tab` and `Messages Tab` in `App Home`
3. Enable `Interactivity & Shortcuts` and enter your `Request url`
4. Add shortcuts
  - `Send a sticker` of type `Global` and callback ID `sticker:shortcut`
  - `Reply with sticker` of type `Message` and callback ID `sticker:respond`
5. Add a Slash command `/stickers`
6. Enable `Event Subscription`
  - Subscribe to `Bot Events`: `app_home_opened`, `message.im`
7. Add `Bot Token Scopes` in `OAuth & Permissions`
  - `chat:write`
  - `commands`
  - `files:read`
  - `im:history`
  - `im:write`
  - `reactions:write`
8. Enable distribution under `Manage Distribution` and enter your `Redirect url`

## Firebase configuration

1. Create a new [Firebase project](https://console.firebase.google.com)
2. Enable `Firestore`
3. Enable `Storage`
4. Create a `Service Account` under `Project Settings`

## Run the app

1. Install dependencies via `npm` or `yarn`
2. Create a `.env` file and with following keys
  - `SLACK_SIGNING_SECRET=<your Slack app's signing secret>`
  - `SLACK_CLIENT_ID=<your Slack app's client id>`
  - `SLACK_CLIENT_SECRET=<your Slack app's client secret>`
  - `SLACK_REDIRECT_URL=<your redirect url>`
  - `SLACK_API_URL=https://slack.com/api`
  - `FIREBASE_SERVICE_ACCOUNT=<path to your firebase service account key>`
  - `FIREBASE_STORAGE=<your firebase storage bucket>`
  - `FIREBASE_DATABASE=<your firstore url>`
