import fs from 'fs';
import path from 'path';

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Build public URL based on request host
    const host = req.get('host');
    const protocol = req.protocol;
    const publicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.status(201).json({ data: { url: publicUrl, filename: req.file.filename } });
  } catch (err) {
    console.error('Upload failed', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

export default { uploadFile };
