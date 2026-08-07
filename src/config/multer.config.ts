import multer from "multer";
const storage = multer.memoryStorage();

export const upload = multer({
  storage,

  limits: {
    fileSize: 250 * 1024 * 1024, // 1000 MB
  },

  fileFilter(req, file, cb) {
    cb(null, true);
  },
});
