const { Router } = require('express');
const router = Router();

const {
    getPhotoById,
    getImageDownloadStreamByFilename,
    getThumbnailDownloadStreamByFilename
} = require('../models/photo')

router.get('/photos/:id.jpeg', async (req, res, next) => {
    try {
        if (!await containsPhoto(req.params.id)) {
            res.status(404).send({
                error: "Photo not found."
            })
            return
        }
        await downloadPhotoById(req.params.id, res)
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to fetch photo."
        })
    }
})

router.get('/photos/:id', async (req, res, next) => {
    const photo = await getPhotoById(req.params.id.split('.')[0]);
    // console.log(photo.filename);
    getImageDownloadStreamByFilename(photo.filename)
        .on('file', (file) => {
            res.status(200).type(file.metadata.contentType);
        })
        .on('error', (err) => {
            if (err.code === 'ENOENT') {
                next();
            } else {
                next(err);
            }
        })
        .pipe(res);
});

router.get('/thumb/:filename', (req, res, next) => {
    getThumbnailDownloadStreamByFilename(req.params.filename)
        .on('file', (file) => {
            res.status(200).type(file.metadata.contentType);
        })
        .on('error', (err) => {
            if (err.code === 'ENOENT') {
                next();
            } else {
                next(err);
            }
        })
        .pipe(res);
});

module.exports = router