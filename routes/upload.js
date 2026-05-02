const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'zerkalls', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}

// POST /api/upload
router.post('/', upload.array('images', 20), async (req, res) => {
  try {
    const results = await Promise.all(req.files.map((f) => uploadBuffer(f.buffer)));
    res.json({ filenames: results.map((r) => r.secure_url) });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/upload  (body: { url })
router.delete('/', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.json({ ok: true });
    // Extract public_id from Cloudinary URL
    const match = url.match(/\/zerkalls\/([^.]+)/);
    if (match) {
      await cloudinary.uploader.destroy(`zerkalls/${match[1]}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
