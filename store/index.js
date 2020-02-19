const admin = require('firebase-admin')
const serviceAccount = require('./pi-stickers-firebase-adminsdk-bantd-a2fcb76d51.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pi-stickers.firebaseio.com',
    storageBucket: 'pi-stickers.appspot.com'
})

const db = admin.firestore()
const storage = admin.storage().bucket()
console.log(storage)

const addSticker = async (setId, context) => {
    let storageRef = storage.ref()
    let ref = storageRef.child(`${setId}/${file.name}`)
    let snapshot = await ref.put(context.file.blob)
    console.log(snapshot)


    // const set = await findSet(setId)
    // set.stickers = set.stickers || {}
    // set.stickers[context.name] = context.sticker

    // await updateSet(setId, set)
}

const findTeam = async (id) => {
    const doc = await db.collection('teams').doc(id).get()
    if (doc.exists) return doc.data()
    return false
}

const findUser = async (id) => {
    const doc = await db.collection('users').doc(id).get()
    if (doc.exists) return doc.data()
    return false
}

const findSet = async (id) => {
    const doc = await db.collection('stickers').doc(id).get()
    if (doc.exists) return doc.data()
    return false
}

const findSetByTs = async (ts) => {
    const snapshot = await db.collection('stickers').where('ts', '==', ts).get()
    console.log(snapshot.docs)
    if (!snapshot.docs.length) return false
    return snapshot.docs[0]
}

const saveSet = async (userId, context) => {
    let ref = await db.collection('stickers').add(context)

    const user = await findUser(userId)
    user.stickers = user.stickers || []
    user.stickers.push(ref.id)
    await saveUser(userId, user)
    return ref.id
}

const saveTeam = async (id, context) => {
    if (!context) throw new Error('no_team_data')

    await db.collection('teams').doc(id).set(context)
}

const saveUser = async (id, context) => {
    if (!context) throw new Error('no_user_data')
    await db.collection('users').doc(id).set(context)
    return context
}

const updateSet = async (setId, context) => {
    await db.collection('stickers').doc(setId).set(context, { merge: true })
}

module.exports = {
    saveSet,
    saveUser,
    saveTeam,
    findTeam,
    findUser,
    findSet,
    findSetByTs,
    updateSet,
    addSticker
}
