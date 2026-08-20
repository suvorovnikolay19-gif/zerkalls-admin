require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('../db/pool');
const productsRouter = require('../routes/products');
const uploadRouter = require('../routes/upload');
const attributesRouter = require('../routes/attributes');
const mirrorClassesRouter = require('../routes/mirror-classes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/attributes', attributesRouter);
app.use('/api/mirror-classes', mirrorClassesRouter);

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return app(req, res);
};
