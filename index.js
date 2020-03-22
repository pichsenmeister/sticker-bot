require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const axios = require("axios");
const oauth = require("./oauth");
const payloads = require("./payloads");
const store = require("./store");
const stickerView = require("./sticker");

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
const app = new App({
  authorize: oauth.authorize,
  receiver: expressReceiver,
  logLevel: "DEBUG"
});

const express = expressReceiver.app;

// ping function to keep glitch alive
express.get("/ping", (req, res) => {
  console.log("<3");
  return res.send("pong:pi-stickers");
});
// oauth urls
express.get("/install", oauth.install);
express.get("/redirect", oauth.redirect);

/**
slash command listener
/sticker - launches set chooser
/sticker set-name launches sticker view for that set
/sticker set-name/sticker-name posts back that sticker
**/
app.command("/stickers", async ({ command, body, context, ack }) => {
  ack();

  // check for parameters which can be used to preselect
  // sticker set or a sticker from a set
  if (command.text && command.text.length) {
    const params = command.text.split("/", 2);
    // only set is selected
    if (params.length === 1) {
      const set = await store.findSetByKey(command.text);
      // if set is found, just show sticker selection
      if (set)
        return stickerView.viewStickers(
          app,
          context,
          body,
          { value: set.id },
          "set:choose:command"
        );
    } else {
      // set + sticker key is selected
      const setName = params[0].trim();
      const set = await store.findSetByKey(setName);
      // only continue if set exists
      if (set) {
        const stickerName = params[1].trim();
        const sticker = await store.findStickerByKey(set.id, stickerName);
        // if sticker is found, send sticker immediately
        if (sticker) {
          const payload = payloads.messages.sendSticker({
            name: sticker.data().name,
            url: sticker.data().url,
            userId: body.user_id
          });

          return await axios.post(body.response_url, payload);
        } else {
          // just show current set if sticker is not found
          return stickerView.viewStickers(
            app,
            context,
            body,
            { value: set.id },
            "set:choose:command"
          );
        }
      }
    }
  }

  return await stickerView.viewSets(app, context, body);
});

/**
send a sticker shortcut
**/
app.shortcut("sticker:shortcut", async ({ ack, context, body }) => {
  ack();

  return await stickerView.viewSets(app, context, body, { shortcut: true });
});

/**
message action listener to respond to a message
**/
app.action(
  { callback_id: "sticker:respond" },
  async ({ ack, body, action, context }) => {
    ack();

    return await stickerView.viewSets(app, context, body);
  }
);

/**
action listener to create new set in modal
**/
app.action("set:create", async ({ ack, body, context }) => {
  ack();

  return app.client.views.open({
    token: context.botToken,
    trigger_id: body.trigger_id,
    view: payloads.modals.createSet()
  });
});

/**
action listener to edit a set in modal
**/
app.action("set:edit", async ({ ack, body, action, context }) => {
  ack();

  stickerView.viewStickers(app, context, body, action, "set:edit");
});

/**
action listener to view stickers of a set
**/
app.action("set:view", async ({ ack, body, action, context }) => {
  ack();

  stickerView.viewStickers(app, context, body, action, "set:view");
});

/**
action listener to add an existing set to that user
**/
app.action("set:add", async ({ ack, body, action, context }) => {
  ack();

  // make sure the app is installed on that team
  const team = await store.findTeam(body.team.id);
  // in case of EG or shared channels, check if team exists
  if (!team) {
    return app.client.views.open({
      token: context.botToken,
      trigger_id: body.trigger_id,
      view: payloads.modals.installPrompt({ team_id: body.team.id })
    });
  }

  const user = await getUser(context, body.user.id, body.team.id);
  await store.addSet(action.value, body.user.id);

  return await publishHomeView(context, user, body.user.id, body.team.id);
});

/**
action listener to remove a set from that user
**/
app.action("set:remove", async ({ ack, body, action, context }) => {
  ack();

  await store.removeSet(action.value, body.user.id);

  const user = await getUser(context, body.user.id, body.team.id);
  return await publishHomeView(context, user, body.user.id, body.team.id);
});

/**
action listener to view stickers of a set in a stacked modal, 
once a given sticker set was chosen in the current modal
**/
app.action("set:choose", async ({ ack, body, action, context }) => {
  ack();

  stickerView.viewStickers(app, context, body, action, "set:choose");
});

/**
action listener to delete a sticker set 
**/
app.action("set:delete", async ({ ack, body, action, context }) => {
  const set = await store.findSet(action.value);
  const user = await store.findUser(body.user.id);

  await app.client.chat.delete({
    token: context.botToken,
    channel: user.im,
    ts: set.ts
  });

  await store.deleteSet(action.value, body.user.id);

  ack();

  // update home view with remaining sticker sets
  return await publishHomeView(context, user, body.user.id, user.team_id);
});

/**
action listener to edit sticker (= edit name) in modal
**/
app.action("sticker:edit", async ({ ack, body, action, context }) => {
  ack();

  stickerView.editName(app, context, body, action);
});

/**
action listener to delete sticker in modal
**/
app.action("sticker:delete", async ({ ack, body, action, context }) => {
  const setId = action.value.split(":")[0];
  const id = action.value.split(":")[1];

  await store.deleteSticker(setId, id);

  let data = JSON.parse(body.view.private_metadata);

  // (app, context, body, viewId, setId, mode, newMetadata)
  await stickerView.updateStickers(
    app,
    context,
    body,
    body.view.id,
    setId,
    "set:edit",
    data
  );

  ack();
});

/**
action listener to select a sticker from modal to send to channel
**/
app.action("sticker:choose", async ({ ack, body, action, context }) => {
  ack();

  let data = JSON.parse(body.view.private_metadata);

  const setId = action.value.split(":")[0];
  const stickerId = action.value.split(":")[1];

  // if same sticker was already previously chosen, unselect current one
  if (data.setId === setId && data.stickerId === stickerId) {
    delete data.setId;
    delete data.stickerId;
  } else {
    data.setId = setId;
    data.stickerId = stickerId;
  }

  await stickerView.updateStickers(
    app,
    context,
    body,
    body.view.id,
    setId,
    "set:choose",
    data
  );
});

/**
view submission listener for creating a new set
**/
app.view("set:create", async ({ ack, body, view, context }) => {
  const teamId = body.user.team_id;
  const userId = body.user.id;

  const team = await store.findTeam(teamId);
  // in case of EG or shared channels, check if team exists
  if (!team) {
    return ack({
      response_action: "errors",
      errors: {
        name:
          "Can't find team. Please make sure Stickers is installed on your team."
      }
    });
  }

  // names have to be unique
  const set = await store.findSetByKey(view.state.values.name.data.value);
  if (set) {
    return ack({
      response_action: "errors",
      errors: {
        name: "This name is already taken. Please choose another unique name."
      }
    });
  }

  ack();

  const user = await getUser(context, userId, teamId);

  const name = view.state.values.name.data.value;
  let privacy = view.state.values.privacy.data.selected_option;
  privacy = (privacy && privacy.value) || "private";

  const setId = await store.saveSet(userId, {
    name: name,
    key: name.trim().toLowerCase(),
    privacy: privacy,
    user_id: userId,
    team_id: teamId
  });

  // update the home tab
  await publishHomeView(context, user, userId, teamId);

  // send message with new stickerset to DM and prompt to upload in thread
  const res = await app.client.chat.postMessage({
    token: context.botToken,
    channel: user.im,
    text: `Here\'s your new sticker set ${name}`,
    blocks: payloads.messages.stickerSet({
      name: name,
      setId: setId,
      privacy: privacy
    })
  });

  // update set with message id to identify uploaded images
  await store.updateSet(setId, { ts: res.message.ts });

  // send message in thread to "open thread"
  await app.client.chat.postMessage({
    token: context.botToken,
    channel: user.im,
    text:
      "Drop images here in thread to append them to this sticker set :point_down:\n\n_Use square images with at least 160x160px for optimal results._",
    thread_ts: res.message.ts
  });
});

/**
view submission listener to send a selected sticker back to channel / thread
**/
app.view("set:view", async ({ ack, body, view, context }) => {
  ack({
    response_action: "clear"
  });

  const data = JSON.parse(body.view.private_metadata);
  let responseUrl = data.response_url
  
  // initiated from shortcut, we need to parse
  // selected conversation and response_url from that submission
  if(data.shortcut) {
    // we only send 1 response_url for now
    responseUrl = body.response_urls[0].response_url
  }
  
  const sticker = await store.findSticker(data.setId, data.stickerId);
  const payload = payloads.messages.sendSticker({
    name: sticker.name,
    url: sticker.url,
    userId: body.user.id
  });
  // if message_ts is present, send back in thread
  if (data.message_ts) payload.thread_ts = data.message_ts;

  await axios.post(responseUrl, payload);
});

/**
view submission listener for updating a sticker's name
**/
app.view("sticker:edit", async ({ ack, body, view, context }) => {
  const data = JSON.parse(view.private_metadata);
  const name = view.state.values.name.data.value;

  if (name.indexOf("/") >= 0 || name.indexOf(":") >= 0) {
    return ack({
      response_action: "errors",
      errors: {
        name:
          "Invalid name. Please don't use any reserverd characters like / or :"
      }
    });
  }

  const sticker = await store.findStickerByKey(data.setId, name);
  if (sticker) {
    return ack({
      response_action: "errors",
      errors: {
        name:
          "This name already exists in this set. Please choose a different name."
      }
    });
  }

  await store.updateSticker(data.setId, data.id, {
    name: view.state.values.name.data.value,
    key: view.state.values.name.data.value.trim().toLowerCase()
  });

  await stickerView.updateStickers(
    app,
    context,
    body,
    view.previous_view_id,
    data.setId,
    "set:edit",
    data
  );
  ack();
});

/**
app home opened listener to 
- render CTAs and sticker sets in home tab
- send a welcome message in messages tab if applicable
**/
app.event("app_home_opened", async ({ event, body, context }) => {
  const user = await store.findUser(event.user);
  if (event.tab === "home") {
    return await publishHomeView(context, user, event.user, body.team_id);
  }

  if (event.tab === "messages") {
    // TODO
  }
});

/**
message listener - used for letting users upload images through DM space
**/
app.event("message", async ({ event, context, say }) => {
  const supportedTypes = ["image/png", "image/jpeg", "image/gif"];
  // ingore updated & deleted messages events
  if (
    event.subtype &&
    (event.subtype === "message_changed" || event.subtype === "message_deleted")
  ) {
    return;
  } else {
    const user = await store.findUser(event.user);

    const set = await store.findSetByTs(event.thread_ts || "");
    if (!set)
      return await app.client.chat.postEphemeral({
        token: context.botToken,
        channel: user.im,
        user: event.user,
        text: ":dizzy_face: No active set found. Please create a set first.",
        thread_ts: event.thread_ts
      });

    // if message doesn't contain images, send error message to user
    const invalidFormat =
      !event.files ||
      event.files.some(file => {
        return supportedTypes.indexOf(file.mimetype.toLowerCase()) < 0;
      });
    if (invalidFormat) {
      return await app.client.chat.postEphemeral({
        token: context.botToken,
        channel: user.im,
        user: event.user,
        text:
          ":dizzy_face: This file type is not supported. Please upload a file with a supported image type: `.jpg` `.png` `.gif`.",
        thread_ts: event.thread_ts
      });
    }

    // react with "upload" emoji to message
    await app.client.reactions.add({
      token: context.botToken,
      channel: user.im,
      name: "outbox_tray",
      timestamp: event.ts
    });

    // add 10 sec timeout before downloading from Slack since thumbs are not processed
    // at this point
    setTimeout(async () => {
      // download all files from Slack
      let files = event.files.map(async file => {
        // use thumb_160 to download, this is the size we want to use for sending
        let url =
          file.mimetype.toLowerCase() === "image/gif"
            ? file.thumb_360_gif
            : file.thumb_160;
        let blob = await axios({
          method: "GET",
          url: url,
          headers: {
            Authorization: `Bearer ${context.botToken}`
          },
          responseType: "arraybuffer"
        });
        file.blob = blob.data;
        return file;
      });

      // wait for all files to be downloaded before
      // storing on google cloud and database
      let blobs = await Promise.all(files);
      let stickers = blobs.map(file => {
        return store.addSticker(set.id, file);
      });
      await Promise.all(stickers);

      // remove "upload" emoji of message
      await app.client.reactions.remove({
        token: context.botToken,
        channel: user.im,
        name: "outbox_tray",
        timestamp: event.ts
      });

      // react with "checkmark" emoji to message
      await app.client.reactions.add({
        token: context.botToken,
        channel: user.im,
        name: "heavy_check_mark",
        timestamp: event.ts
      });
    }, 10000);
  }
});

/**
get user from store
if user doesn't exist in store, save user to store and open the DM channel
**/
const getUser = async (context, userId, teamId) => {
  let user = await store.findUser(userId);
  // create users is not stored, open IM with user and store info
  if (!user) {
    const im = await app.client.conversations.open({
      token: context.botToken,
      users: userId
    });
    user = await store.saveUser(userId, {
      team_id: teamId,
      im: im.channel.id
    });
  }
  return user;
};

/**
publish the home view with all sticker sets of that user
and all public sticker sets that user can add
**/
const publishHomeView = async (context, user, userId, teamId) => {
  const home = await stickerView.homeView(user, userId, teamId);

  return app.client.views.publish({
    token: context.botToken,
    user_id: userId,
    view: home
  });
};

app.error(error => {
  console.error(error);
});

// Start your app
(async () => {
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
