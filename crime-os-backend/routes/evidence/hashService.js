
import crypto from "crypto";
import fs from "fs";



// =========================================================
// CALCULATE SHA-256 FILE HASH
// =========================================================
//
// Input:
//
// uploads/1784102345678-evidence.jpg
//
// Output:
//
// Example:
//
// 8a1f3c9d7e2b4a6f...
//
// The hash acts like a fingerprint of the file.
//

const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    // Create a SHA-256 hash calculator.
    const hash = crypto.createHash("sha256");

    // Read the file as a stream.
    //
    // This is better than loading the complete file
    // into memory, especially for large evidence files.
    const fileStream = fs.createReadStream(filePath);


    // -----------------------------------------------------
    // FILE READ ERROR
    // -----------------------------------------------------

    fileStream.on("error", (error) => {
      reject(error);
    });


    // -----------------------------------------------------
    // READ FILE DATA
    // -----------------------------------------------------
    //
    // Every chunk of the file is passed into the
    // SHA-256 calculator.
    //

    fileStream.on("data", (chunk) => {
      hash.update(chunk);
    });


    // -----------------------------------------------------
    // FILE FINISHED
    // -----------------------------------------------------
    //
    // digest("hex") gives us the final hash as a
    // hexadecimal string.
    //

    fileStream.on("end", () => {
      const fileHash = hash.digest("hex");

      resolve(fileHash);
    });
  });
};


// =========================================================
// EXPORT
// =========================================================

export {
  calculateFileHash,
};