const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/practices"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext || ".jpg";
    cb(null, `practice_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp"];
  if (!ok.includes(file.mimetype)) return cb(new Error("Only JPG/PNG/WEBP allowed"));
  cb(null, true);
}

const uploadPracticeImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

module.exports = { uploadPracticeImage };
