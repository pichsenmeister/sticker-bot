const uuidv4 = require('uuid/v4');

/**
upload sticker to given google cloud bucket
**/
const upload = async (bucket, setId, file) => {
  const uuid = uuidv4()
  const extension = file.name.substr(file.name.lastIndexOf('.'))
  const ref = `${setId}/${uuid}${extension}`
  const fileRef = bucket.file(`${ref}`);

  return new Promise((resolve, reject) => {
    const stream = fileRef.createWriteStream({
      public: true,
      metadata: {
        contentType: file.mimetype
      }
    });

    stream.write(file.blob);

    stream.on('finish', () => {
      resolve({
        ref: ref,
        url: `https://storage.googleapis.com/pi-stickers.appspot.com/${ref}`
      })
    })
      .on('error', () => {
        reject(`Unable to upload image, something went wrong`)
      })
      .end(file.blob)
  })
}

/**
delete sticker from given google cloud bucket
**/
const deleteFile = async (bucket, filename) => {
  await bucket
    .file(filename)
    .delete();
}

module.exports = {
  upload,
  deleteFile
}