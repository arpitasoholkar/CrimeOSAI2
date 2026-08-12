// src/db.js
//
// Connects to the SAME MongoDB used by crime-os-backend and
// crimeos-summary. The Case schema now lives in a single shared
// file (./models/Case.js) instead of being redefined here, so all
// three services stay in sync automatically.

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Case from "./models/Case.js";

export { Case };

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI); // must match HER variable name
  console.log("Connected to shared MongoDB (mongoose).");
}