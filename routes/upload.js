const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// POST /api/upload  (multipart: field "images", up to 20 files)
router.post('/', upload.array('images', 20), (req, res) => {
  const filenames = req.files.map((f) => f.filename);
  res.json({ filenames });
});

// DELETE /api/upload/:filename
router.delete('/:filename', (req, res) => {
  const filepath = path.join(UPLOAD_DIR, path.basename(req.params.filename));
  fs.unlink(filepath, (err) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Failed to delete file' });
    }
    res.json({ ok: true });
  });
});

module.exports = router;
