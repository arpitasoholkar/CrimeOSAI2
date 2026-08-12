 import multer from "multer";
import path from "path";


// =========================================================
// MULTER STORAGE CONFIGURATION
// =========================================================
//
// Multer needs to know:
//
// 1. WHERE should the uploaded file be stored?
// 2. WHAT should the saved file be called?
//

const storage = multer.diskStorage({
  // -------------------------------------------------------
  // FILE DESTINATION
  // -------------------------------------------------------
  //
  // Files will be stored inside:
  //
  // backend/uploads
  //

  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },


  // -------------------------------------------------------
  // FILE NAME
  // -------------------------------------------------------
  //
  // We add Date.now() so two uploaded files do not
  // accidentally overwrite each other.
  //
  // Example:
  //
  // CCTV.mp4
  //
  // becomes:
  //
  // 1784100000000-CCTV.mp4
  //

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname;

    cb(null, uniqueName);
  },
});


// =========================================================
// CREATE MULTER MIDDLEWARE
// =========================================================

const upload = multer({
  storage,
});


// =========================================================
// EXPORT
// =========================================================

export default upload;