const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "ckvs_practices",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: `practice_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
  }),
});

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp"];
  if (!ok.includes(file.mimetype)) return cb(new Error("Only JPG/PNG/WEBP allowed"));
  cb(null, true);
}

const uploadPracticeImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

module.exports = { uploadPracticeImage };
