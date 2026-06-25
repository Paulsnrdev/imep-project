const cloudinary = require('cloudinary').v2;
const logger     = require('../utils/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Upload a file buffer to Cloudinary.
 * Returns the secure_url of the uploaded asset.
 */
const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });

logger.info('[Cloudinary] SDK configured');

module.exports = { cloudinary, uploadBuffer };
