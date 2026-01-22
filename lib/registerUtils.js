import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const ensureDirectories = () => {
  const directories = [
    path.join(process.cwd(), 'tmp'),
    path.join(process.cwd(), 'public', 'licenses')
  ];
  directories.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
};

export const saveFile = async (file, folder = 'uploads') => {
  if (!file || !file.filepath) throw new Error('Invalid file object');
  if (!file.mimetype.startsWith('image/')) throw new Error('Only image files are allowed');

  const stats = fs.statSync(file.filepath);
  if (stats.size > MAX_FILE_SIZE) throw new Error('File size exceeds 5MB limit');

  const uploadDir = path.join(process.cwd(), 'public', folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const sanitizedFilename = file.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${sanitizedFilename}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    await fs.promises.copyFile(file.filepath, filePath);
    return `/${folder}/${fileName}`;
  } catch (error) {
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
    throw error;
  } finally {
    if (fs.existsSync(file.filepath)) await fs.promises.unlink(file.filepath);
  }
};

export const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE, multiples: false, keepExtensions: true,
      uploadDir: path.join(process.cwd(), 'tmp'),
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        if (files) Object.values(files).flat().forEach(file => { if (file && file.filepath && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath); });
        return reject(err);
      }

      const normalizedFields = {};
      for (const key in fields) { normalizedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key]; }

      resolve({ fields: normalizedFields, files });
    });
  });
};
