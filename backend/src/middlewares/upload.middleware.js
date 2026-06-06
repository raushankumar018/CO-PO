/**
 * src/middlewares/upload.middleware.js
 * Multer configuration for secure file uploading.
 * restrains upload types to PDF and saves files dynamically based on content.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper function to verify/create upload subdirectories dynamically
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Config storage engines
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/';
    
    // Choose destination directory based on field name
    if (file.fieldname === 'syllabus') {
      dest = 'uploads/syllabus';
    } else if (/question/i.test(file.fieldname)) {
      dest = 'uploads/questionPapers';
    }
    
    ensureDirectoryExists(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Append timestamp and random number to prevent filename collisions
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter to restrict uploads to PDF only
const fileFilter = (req, file, cb) => {
  const filetypes = /pdf/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  
  cb(new Error('Only PDF documents (.pdf) are allowed!'), false);
};

// Export pre-configured multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB file size limit
  }
});
