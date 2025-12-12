// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection (For Analytics)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Schema to track how much space you saved users
const LogSchema = new mongoose.Schema({
  originalName: String,
  originalSize: Number,
  compressedSize: Number,
  date: { type: Date, default: Date.now }
});
const LogModel = mongoose.model("CompressorLog", LogSchema);

// 2. Multer (The Gatekeeper) - Store in RAM, not Disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 3. The API Endpoint
app.post('/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image' });
    }

    // Capture original size
    const originalSize = req.file.size;

    // --- THE BRAIN: SHARP PROCESSING ---
    // Converts to WebP (Google's highly compressed format) with 50% quality
    const compressedBuffer = await sharp(req.file.buffer)
      .webp({ quality: 50 }) 
      .toBuffer();

    const compressedSize = compressedBuffer.length;

    // Save stats to DB (Optional, but good for portfolio)
    await LogModel.create({
      originalName: req.file.originalname,
      originalSize: originalSize,
      compressedSize: compressedSize
    });

    // Send the binary data back to the frontend
    res.set('Content-Type', 'image/webp');
    res.send(compressedBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Compression failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));