const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const config = require('../../config');
const AppError = require('../utils/AppError');

// Optional AWS S3 configuration
let s3 = null;
if (config.aws && config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.region && config.aws.s3BucketName) {
  s3 = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

// Ensure local upload directory exists if falling back to local
const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!s3 && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    return cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
  cb(null, true);
};

// Configure storage engine (S3 or local disk)
let storage;

if (s3) {
  storage = multerS3({
    s3: s3,
    bucket: config.aws.s3BucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    // acl: 'public-read', // If you want files to be public. For KYC, they should be private, but for ease of demo we might need to view them or we can generate pre-signed URLs.
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const ext = file.mimetype.split('/')[1];
      cb(null, `kyc-${req.user.id}-${Date.now()}.${ext}`);
    }
  });
} else {
  // Fallback to local storage
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split('/')[1];
      cb(null, `kyc-${req.user.id}-${Date.now()}.${ext}`);
    }
  });
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  }
});

module.exports = upload;
