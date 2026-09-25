const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = 3000;

// Configure where uploaded files temporarily go
const upload = multer({ dest: 'uploads/' });

// Serve our frontend files (HTML/CSS/JS) from the 'public' folder
app.use(express.static('public'));

// This is the main endpoint: browser sends a file here, we send back counts
app.post('/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();

    let text = '';

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;

    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;

    } else if (ext === '.txt') {
      text = fs.readFileSync(filePath, 'utf8');

    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file type. Please upload a .pdf, .docx, or .txt file.' });
    }

    fs.unlinkSync(filePath);

    // --- Counting logic ---
    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    const words = (text.trim().match(/\S+/g) || []).length;
    const lines = text.split('\n').filter(line => line.trim() !== '').length;

    res.json({
      letters,
      words,
      lines,
      charactersWithSpaces: text.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process the file' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});