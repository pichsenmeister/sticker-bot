require('dotenv').config()
const { App, ExpressReceiver } = require('@slack/bolt')
const axios = require('axios')
const oauth = require('./oauth')
const payloads = require('./payloads')
const store = require('./store')

const expressReceiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET
})
const app = new App({
    authorize: oauth.authorize,
    receiver: expressReceiver,
    logLevel: 'DEBUG'
});

const express = expressReceiver.app

express.get('/install', oauth.install)
express.get('/redirect', oauth.redirect)

app.command('/stickers', async ({ command, body, context, ack, say, respond }) => {
    ack()

    respond({ text: 'ok', response_type: 'in_channel' })
})

app.action('set:create', async ({ ack, body, context }) => {
    ack()

    return app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: payloads.modals.createSet()
    })
})

app.action('set:view', async ({ ack, body, action, context }) => {
    ack()

    console.log(action.value)
    const set = await store.findSetByTs(action.value)
    const stickers = set.data()
    const modal = payloads.modals.viewSet({ name: stickers.name })
    for (key in stickers.stickers) {
        console.log(key)
        console.log(stickers.stickers)
        modal.blocks.push(payloads.modals.viewSticker({
            key: key,
            thumb: stickers.stickers[key].permalink_public
        }))
    }

    console.log(JSON.stringify(modal))

    return app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: modal
    })
})

app.view('set:create', async ({ ack, body, view, context }) => {
    const teamId = body.user.team_id
    const userId = body.user.id

    const team = await store.findTeam(teamId)
    if (!team) ack({
        response_action: 'errors',
        errors: {
            name: 'Can\'t find team. Please make sure Stickers is installed on your team.'
        }
    })
    let user = await store.findUser(userId)
    if (!user) {
        const im = await app.client.conversations.open({
            token: context.botToken,
            users: userId
        })
        user = await store.saveUser(userId, {
            team_id: teamId,
            im: im.channel.id
        })
    }

    const name = view.state.values.name.value.value
    let public = view.state.values.public.value.selected_options
    public = (public && public.length && public[0].value === 'public') || false

    const setId = await store.saveSet(userId, { name: name, public: public, user_id: userId, team_id: teamId })

    ack()

    const res = await app.client.chat.postMessage({
        token: context.botToken,
        channel: user.im,
        text: `Here\'s your new sticker set ${context.name}`,
        blocks: payloads.messages.stickerSet({
            name: name,
            setId: setId,
            privacy: public ? ':globe_with_meridians: Public' : ':lock: Private'
        })
    })

    await store.updateSet(setId, { ts: res.message.ts })

    await app.client.chat.postMessage({
        token: context.botToken,
        channel: user.im,
        text: 'Drop images here in thread to append them to this sticker set :point_down:',
        thread_ts: res.message.ts
    })
})

app.event('app_home_opened', async ({ event, context }) => {
    console.log(event)
    const user = await store.findUser(event.user)
    if (event.tab === 'home') {
        let home = payloads.home.home()
        let stickers = []
        if (user) {
            stickers = user.stickers || []
            console.log(user.stickers)
            let promises = stickers.map(sticker => {
                return store.findSet(sticker)
            })
            stickers = await Promise.all(promises)
            if (stickers.length) home.blocks = home.blocks.concat(payloads.home.stickerHeader())
            console.log(stickers)
            stickers.forEach(sticker => {
                home.blocks = home.blocks.concat(payloads.home.stickerSet({ sticker: sticker }))
            })
        }
        console.log(home)
        return app.client.views.publish({
            token: context.botToken,
            user_id: event.user,
            view: home
        })
    }

    if (event.tab === 'messages') {

    }
})

app.event('message', async ({ event, context }) => {
    console.log(event)
    if (event.subtype && event.subtype === 'message_changed') {
        return
    } else {
        const user = await store.findUser(event.user)
        if (!event.files) {
            await app.client.chat.postEphemeral({
                token: context.botToken,
                channel: user.im,
                user: event.user,
                text: 'This is not an image. Please upload an image.',
                thread_ts: event.thread_ts
            })
        }

        const set = await store.findSetByTs(event.thread_ts)

        await app.client.reactions.add({
            token: context.botToken,
            channel: user.im,
            name: 'outbox_tray',
            timestamp: event.ts
        })

        let promises = event.files.map(async file => {
            let url = file.url_private_download
            let blob = await axios({
                method: 'GET',
                url: url,
                headers: {
                    Authorization: `Bearer ${context.botToken}`
                },
                responseType: 'arraybuffer'
            })
            file.blob = blob.data
            return file
        })

        let blobs = await Promise.all(promises)

        promises = blobs.map(file => {
            return store.addSticker(set.id, {
                name: file.name.split('.')[0],
                file: file
            })
        })
        await Promise.all(promises)

        await app.client.reactions.remove({
            token: context.botToken,
            channel: user.im,
            name: 'outbox_tray',
            timestamp: event.ts
        })

        await app.client.reactions.add({
            token: context.botToken,
            channel: user.im,
            name: 'heavy_check_mark',
            timestamp: event.ts
        })
    }
})

app.error(error => {
    console.error(error);
});

// Start your app
(async () => {
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();