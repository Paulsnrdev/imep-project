const multer        = require('multer');
const { uploadBuffer } = require('../config/cloudinary');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE       = 5 * 1024 * 1024; // 5 MB

const imageFilter = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and WebP images are allowed.'), false);
  }
};

// Keep file in memory; we stream it to Cloudinary in the next step
const memStorage = multer.memoryStorage();

const multerBase = multer({
  storage:    memStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: MAX_IMAGE_SIZE },
});

/**
 * Wraps a multer single-field call with:
 *   1. Error handling for multer validation failures
 *   2. Cloudinary upload — attaches `req.file.cloudinaryUrl` on success
 */
const wrapUpload = (fieldName, folder) => (req, res, next) => {
  multerBase.single(fieldName)(req, res, async (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: err.message });
    }

    if (!req.file) return next(); // no file uploaded — route handler decides if required

    try {
      req.file.cloudinaryUrl = await uploadBuffer(req.file.buffer, {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      next();
    } catch (uploadErr) {
      return res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
    }
  });
};

const uploadProfilePhoto = wrapUpload('profilePhoto', 'imep/profiles');
const uploadWeeklyImage  = wrapUpload('weeklyImage',  'imep/logbook');

module.exports = { uploadProfilePhoto, uploadWeeklyImage };
