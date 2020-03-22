const payloads = require("./payloads");
const store = require("./store");

/**
main sticker view modal

depending on mode, it will add actions for that mode and user

- set:view view only stickers
- set:choose stickers with action button to choose & send via submit
- set:edit edit and delete sticker for set owner
**/
const viewStickers = async (app, context, body, action, mode) => {
  const set = await store.findSet(action.value);
  const stickers = await store.findStickersBySet(action.value);

  // get response_url from /commands to store in view metadata
  // if interaction is started from a modal, pass on response_url
  // for stacked modal
  let metadata = {};
  // pass on metadata to new view if applicable
  if (body.view && body.view.private_metadata) {
    try {
      metadata = JSON.parse(body.view.private_metadata);
    } catch (e) {}
  }
  // add response_url to metadata if applicable
  if (body.response_url) {
    metadata.response_url = body.response_url;
  }

  const modal = await renderViewModal(
    body.user && body.user.id || body.user_id,
    action.value,
    set,
    stickers,
    mode,
    metadata
  );


  switch (mode) {
    case "set:choose":
      // user has an open modal with list of sets to choose from
      return app.client.views.push({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: modal
      }); 
      
    case "set:choose:command":
      // set is chosen from command directly already, so open view with stickers 
      return app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: modal
      });  
    default:
      // this is the view sticker mode from e.g. app home or messages
      return app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: modal
      });
  }
};

const viewSets = async (app, context, body, metadata) => {
  metadata = metadata || {}
  // response_url doesn't exist for shortcuts
  // only add it if it exists
  if(body.response_url) metadata.response_url = body.response_url
  
  const sets = await store.findSetsByUserId(body.user && body.user.id || body.user_id);
  
  // add message_ts in case of message action
  if(body.message_ts) metadata.message_ts = body.message_ts
  const modal = payloads.modals.setsView({metadata});

  if (sets.length) {
    sets.forEach(set => {
      modal.blocks = modal.blocks.concat(
        payloads.modals.setChoose({
          setId: set.id,
          set: set.data()
        })
      );
    });
  } else {
    modal.blocks = modal.blocks.concat(
      payloads.utils.text(
        "You currently don't have any sticker sets ‾\\_(ツ)_/‾"
      )
    );
  }

  return app.client.views.open({
    token: context.botToken,
    trigger_id: body.trigger_id,
    view: modal
  });
};


const updateStickers = async (
  app,
  context,
  body,
  viewId,
  setId,
  mode,
  newMetadata
) => {
  const set = await store.findSet(setId);
  const stickers = await store.findStickersBySet(setId);
  let metadata =
    (body.view &&
      body.view.private_metadata &&
      JSON.parse(body.view.private_metadata)) ||
    {};
  metadata = Object.assign(metadata, newMetadata || {});
  const modal = await renderViewModal(
    body.user.id,
    setId,
    set,
    stickers,
    mode,
    metadata
  );

  return app.client.views.update({
    token: context.botToken,
    view_id: viewId,
    view: modal
  });
};

const editName = async (app, context, body, action) => {
  const setId = action.value.split(":")[0];
  const id = action.value.split(":")[1];
  const sticker = await store.findSticker(setId, id);
  const modal = payloads.modals.stickerEdit({
    name: sticker.name,
    url: sticker.url,
    id: id,
    setId: setId
  });
  
  return app.client.views.push({
    token: context.botToken,
    trigger_id: body.trigger_id,
    view: modal
  });
};

/**
default home view

depending on ownership and team, it will show
- own sticker sets with edit buttons
- sticker sets available in the team and public to view and add
**/
const homeView = async (user, userId, teamId) => {
  let home = payloads.home.home();
  let sets = [];
  let setIds = [];

  // add existing sticker sets if user is stored
  if (user) {
    sets = await store.findSetIdsByUserId(userId);
    setIds = sets.map(data => data.set_id);

    let promises = sets.map(async data => {
      let set = await store.findSet(data.set_id);
      return {
        id: data.set_id,
        set: set
      };
    });
    sets = await Promise.all(promises);
    if (sets.length) {
      home.blocks = home.blocks.concat(
        payloads.home.stickerHeader({ text: "Your stickers" })
      );
      sets.forEach(doc => {
        home.blocks = home.blocks.concat(
          payloads.home.stickerSet({ setId: doc.id, set: doc.set })
        );
        // if user is owner, show edit buttons
        if (doc.set.user_id === userId) {
          home.blocks.push(
            payloads.home.setEditButtons({ setId: doc.id, set: doc.set })
          );
        } else {
          // otherwise just show remove button
          home.blocks.push(
            payloads.home.setRemoveButtons({ setId: doc.id, set: doc.set })
          );
        }
      });
    }
  }

  // load available sets to view and add
  // either public or team privacy settings
  const availableSets = await store.findAvailableSets(teamId, setIds);
  if (availableSets.length) {
    // only add spacer if user has own sets as well
    if (sets.length) home.blocks.push(payloads.utils.spacer);

    home.blocks = home.blocks.concat(
      payloads.home.stickerHeader({ text: "Add stickers" })
    );
    availableSets.forEach(set => {
      home.blocks = home.blocks.concat(
        payloads.home.stickerSet({ setId: set.id, set: set.data() })
      );
      home.blocks.push(
        payloads.home.setAddButtons({ setId: set.id, set: set.data() })
      );
    });
  }

  return home;
};

const renderViewModal = (userId, setId, set, stickers, mode, metadata) => {
  const modal = payloads.modals.setView({ name: set.name, metadata: metadata });
  if (!stickers.length) {
    modal.blocks.push(
      payloads.utils.text(
        "There are currently no stickers in this set ‾\\_(ツ)_/‾"
      )
    );
  }

  if (mode.indexOf("set:choose") >= 0) {
    modal.submit = payloads.utils.submit("Send");
  }

  // add sticker component for each sticker
  stickers.forEach(sticker => {
    let data = sticker.data();
    // display the sticker
    modal.blocks.push(
      payloads.modals.stickerView({
        name: data.name,
        url: data.url
      })
    );
    // if user is owner and we are in edit mode, add edit & delete buttons
    if (set.user_id === userId && mode === "set:edit") {
      modal.blocks.push(
        payloads.modals.stickerEditButtons({
          setId: setId,
          id: sticker.id,
          name: data.name
        })
      );
    }

    // if in sending mode, add send buttons
    if (mode.indexOf("set:choose") >= 0) {
      // if sticker has been selected, show different button style & text
      if (metadata.setId === setId && metadata.stickerId === sticker.id) {
        modal.blocks.push(
          payloads.modals.stickerSelectedButtons({
            setId: setId,
            id: sticker.id,
            name: data.name
          })
        );
      } else {
        // show default button style & text for others
        modal.blocks.push(
          payloads.modals.stickerSendButtons({
            setId: setId,
            id: sticker.id,
            name: data.name
          })
        );
      }
    }

    modal.blocks.push(payloads.utils.divider);
  });
  
  // if launched from a shortcut, add a conversation select
  if(metadata.shortcut) {
    modal.blocks.push(payloads.modals.conversationsSelect)
  }

  return modal;
};

module.exports = {
  homeView,
  viewStickers,
  updateStickers,
  editName,
  viewSets
};
