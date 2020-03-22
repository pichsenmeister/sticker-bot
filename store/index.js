const admin = require("firebase-admin");
const storage = require("./storage");

if (process.env.GLITCH) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY)),
    databaseURL: "https://pi-stickers.firebaseio.com",
    storageBucket: "pi-stickers.appspot.com"
  });
} else {
  const serviceAccount = require("./pi-stickers-firebase-adminsdk-bantd-a2fcb76d51.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pi-stickers.firebaseio.com",
    storageBucket: "pi-stickers.appspot.com"
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const addSticker = async (setId, file) => {
  let url = await storage.upload(bucket, setId, file);

  await db
    .collection("sets")
    .doc(setId)
    .collection("stickers")
    .add({
      url: url.url,
      name: file.name.split(".")[0],
      key: file.name.split(".")[0].toLowerCase(),
      file_id: file.id,
      permalink: file.permalink,
      ref: url.ref
    });
};

const findTeam = async id => {
  const doc = await db
    .collection("teams")
    .doc(id)
    .get();
  if (doc.exists) return doc.data();
  return false;
};

const findUser = async id => {
  const doc = await db
    .collection("users")
    .doc(id)
    .get();
  if (doc.exists) return doc.data();
  return false;
};

const findSet = async id => {
  const doc = await db
    .collection("sets")
    .doc(id)
    .get();
  if (doc.exists) return doc.data();
  return false;
};

const findSetByKey = async key => {
  const snapshot = await db
    .collection("sets")
    .where("key", "==", key.trim().toLowerCase())
    .get();
  if (snapshot.docs.length) return snapshot.docs[0]
  return false;
};

const findSetByTs = async ts => {
  const snapshot = await db
    .collection("sets")
    .where("ts", "==", ts)
    .get();
  if (!snapshot.docs.length) return false;
  return snapshot.docs[0];
};

const saveSet = async (userId, context) => {
  let ref = await db.collection("sets").add(context);

  await addSet(ref.id, userId)

  return ref.id;
};

const addSet = async (setId, userId) => {
  let doc = await db.collection("sets").doc(setId).get()
  let installs = doc.data().installs || 0
  installs++
  await updateSet(setId, {installs})
  await db.collection("users_sets").add({
    set_id: setId,
    user_id: userId
  });
}

const removeSet = async (setId, userId) => {
  let doc = await db.collection("sets").doc(setId).get()
  let installs = doc.data().installs || 0
  if(installs > 1) installs--
  await updateSet(setId, {installs})
  
  const snapshot = await db
    .collection("users_sets")
    .where("user_id", "==", userId)
    .where("set_id", "==", setId)
    .get();
  
  const promises = snapshot.docs.map(async doc => {
    return await doc.ref.delete()
  });
  return Promise.all(promises);
}

const findSetsByUserId = async userId => {
  const snapshot = await db
    .collection("users_sets")
    .where("user_id", "==", userId)
    .get();
  const promises = snapshot.docs.map(async doc => {
    return await db
      .collection("sets")
      .doc(doc.data().set_id)
      .get();
  });
  return Promise.all(promises);
};

const findSetIdsByUserId = async userId => {
  const snapshot = await db
    .collection("users_sets")
    .where("user_id", "==", userId)
    .get();
  return snapshot.docs.map(doc => doc.data());
};

const findStickersBySet = async id => {
  const snapshot = await db
    .collection("sets")
    .doc(id)
    .collection("stickers")
    .get();
  return snapshot.docs;
};

const findAvailableSets = async (teamId, existingSets) => {
  const docs = [];

  // load all public stickers
  const publicSnapshot = await db
    .collection("sets")
    .where("privacy", "==", "public")
    .get();
  publicSnapshot.docs.forEach(doc => {
    if (existingSets.indexOf(doc.id) < 0) {
      docs.push(doc);
      existingSets.push(doc.id);
    }
  });

  // load all team stickers
  const teamSnapshot = await db
    .collection("sets")
    .where("privacy", "==", "team")
    .where("team_id", "==", teamId)
    .get();
  teamSnapshot.docs.forEach(doc => {
    if (existingSets.indexOf(doc.id) < 0) {
      docs.push(doc);
      existingSets.push(doc.id);
    }
  });

  return docs;
};

const findSticker = async (setId, id) => {
  const doc = await db
    .collection("sets")
    .doc(setId)
    .collection("stickers")
    .doc(id)
    .get();
  if (doc.exists) return doc.data();
  return false;
};

const findStickerByKey = async (setId, key) => {
  const snapshot = await db
    .collection("sets")
    .doc(setId)
    .collection("stickers")
    .where("key", "==", key.trim().toLowerCase())
    .get();
  if (snapshot.docs.length) return snapshot.docs[0];
  return false;
};

const saveTeam = async (id, context) => {
  if (!context) throw new Error("no_team_data");

  await db
    .collection("teams")
    .doc(id)
    .set(context);
};

const saveUser = async (id, context) => {
  if (!context) throw new Error("no_user_data");
  await db
    .collection("users")
    .doc(id)
    .set(context);
  return context;
};

const updateSet = async (setId, context) => {
  await db
    .collection("sets")
    .doc(setId)
    .set(context, { merge: true });
};

const updateSticker = async (setId, id, context) => {
  await db
    .collection("sets")
    .doc(setId)
    .collection("stickers")
    .doc(id)
    .set(context, { merge: true });
};

const updateUser = async (userId, context) => {
  await db
    .collection("users")
    .doc(userId)
    .set(context, { merge: true });
};

const deleteSticker = async (setId, id) => {
  await db
    .collection("sets")
    .doc(setId)
    .collection("stickers")
    .doc(id)
    .delete();
};

const deleteSet = async (setId, userId) => {
  // delete all stickers in this set
  const snapshot = await db
    .collection("sets")
    .doc(setId)
    .collection("stickers")
    .get();
  const promises = snapshot.docs.map(async doc => {
    await storage.deleteFile(bucket, doc.data().ref);
    return await doc.ref.delete();
  });

  // delete set
  await Promise.all(promises);
  await db
    .collection("sets")
    .doc(setId)
    .delete();

  // delete references
  const setSnapshot = await db
    .collection("users_sets")
    .where("user_id", "==", userId)
    .where("set_id", "==", setId)
    .get();
  const setPromises = setSnapshot.docs.map(async doc => {
    return await doc.ref.delete();
  });
  await Promise.all(setPromises);
};

module.exports = {
  saveSet,
  addSet,
  removeSet,
  saveUser,
  saveTeam,
  findTeam,
  findUser,
  findSet,
  findSetByKey,
  findSetByTs,
  findSetsByUserId,
  findSetIdsByUserId,
  findAvailableSets,
  findStickersBySet,
  findSticker,
  findStickerByKey,
  updateSet,
  updateSticker,
  updateUser,
  addSticker,
  deleteSticker,
  deleteSet
};
