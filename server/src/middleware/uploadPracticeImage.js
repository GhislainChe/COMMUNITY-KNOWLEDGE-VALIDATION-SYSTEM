const multer = require("multer");
const sharp = require("sharp");
const { cloudinary } = require("../config/cloudinary");

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp"];
  if (!ok.includes(file.mimetype)) return cb(new Error("Only JPG/PNG/WEBP allowed"));
  cb(null, true);
}

const uploadPracticeImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

async function processPracticeImageUpload(req, res, next) {
  if (!req.file) return next();

  try {
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const publicId = `practice_${Date.now()}_${Math.round(Math.random() * 1e9)}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "ckvs_practices",
          public_id: publicId,
          resource_type: "image",
          format: "jpg",
        },
        (err, uploaded) => {
          if (err) return reject(err);
          resolve(uploaded);
        },
      );

      stream.end(processedBuffer);
    });

    req.file.path = result.secure_url || result.url;
    req.file.filename = result.public_id;
    req.file.mimetype = "image/jpeg";

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadPracticeImage, processPracticeImageUpload };
