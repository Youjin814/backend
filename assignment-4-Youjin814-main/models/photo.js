
const { ObjectId, GridFSBucket } = require('mongodb');
const { getDbReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');
const fs = require('fs');

const PhotoSchema = {
  businessId: { required: true },
  caption: { required: false }
};
exports.PhotoSchema = PhotoSchema;

async function uploadNewThumbnailFromPhoto(photoId) {
    try {
      const photo = await getDownloadedPhotoFileById(photoId, `/tmp/${photoId}.jpg`);
      const transformedFilePath = await transformPhotoToPixels(photo, 100, 100);
      const photoMetadata = await getPhotoById(photoId);
  
      const db = getDbReference();
      const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });
      const metadata = {
        contentType: 'image/jpeg',
      };
  
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStreamWithId(
          new ObjectId(photoId),
          photoMetadata.filename,
          {
            chunkSizeBytes: 512,
            metadata: metadata,
          }
        );
  
        fs.createReadStream(transformedFilePath)
          .pipe(uploadStream)
          .on('error', (err) => {
            reject(err);
          })
          .on('finish', (result) => {
            resolve(result._id);
          });
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  

function removeUploadedFile(photo) {
  return new Promise((resolve, reject) => {
    fs.unlink(photo.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
exports.removeUploadedFile = removeUploadedFile;

async function insertNewPhoto(photo) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });

  const metadata = {
    contentType: photo.contentType,
    caption: photo.caption,
    businessId: photo.businessId,
    thumbnail_id: null
  };

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(photo.filename, { metadata: metadata });

    fs.createReadStream(photo.path)
      .pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', (result) => {
        resolve(result._id);
      });
  });
}
exports.insertNewPhoto = insertNewPhoto;

async function getPhotoById(id) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });

  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}
exports.getPhotoById = getPhotoById;

function getImageDownloadStreamByFilename(filename) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });

  return bucket.openDownloadStreamByName(filename);
}
exports.getImageDownloadStreamByFilename = getImageDownloadStreamByFilename;

function getThumbnailDownloadStreamByFilename(filename) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'thumbnail' });

  return bucket.openDownloadStreamByName(filename);
}
exports.getThumbnailDownloadStreamByFilename = getThumbnailDownloadStreamByFilename;
