/**
 * License Validation Module for Node.js / Electron Backend
 * 
 * Dependencies required:
 * npm install firebase node-machine-id crypto-js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { machineIdSync } from "node-machine-id";
import CryptoJS from "crypto-js";
import fs from "fs";
import path from "path";

// IMPORTANT: Replace this with your actual Firebase config
// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_PROJECT_ID.appspot.com",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };
const firebaseConfig = {
  apiKey: "AIzaSyALQTpaezE79HZvFyF9dq_tsMoXZGERPXE",
  authDomain: "multiscannerapp.firebaseapp.com",
  projectId: "multiscannerapp",
  storageBucket: "multiscannerapp.firebasestorage.app",
  messagingSenderId: "823770924584",
  appId: "1:823770924584:web:671611814f1cd29742571d",
  measurementId: "G-LHSSHGG0G4"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Encryption key for local verification cache
const ENCRYPTION_SECRET = "super-secret-local-encryption-key-for-license";
const LOCAL_CACHE_FILE = path.join(process.cwd(), "license.cache");

// Config
const OFFLINE_GRACE_PERIOD_DAYS = 7;

/**
 * Validates a given license key online.
 * @param {string} key - The license key entered by user
 */
export const validateLicenseOnline = async (key) => {
  try {
    const docRef = doc(db, "licenses", key);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { valid: false, message: "Invalid License Key" };
    }

    const licenseData = docSnap.data();
    const currentMachineId = machineIdSync();

    // 1. Check Active Status
    if (!licenseData.active) {
      return { valid: false, message: "License Deactivated" };
    }

    // 2. Check Expiry
    const today = new Date();
    const expiryDate = new Date(licenseData.expiryDate);
    if (today > expiryDate) {
      return { valid: false, message: "License Expired" };
    }

    // 3. Machine ID Check & Binding
    if (!licenseData.machineId || licenseData.machineId === "") {
      // First Login: Bind this machine
      await updateDoc(docRef, {
        machineId: currentMachineId,
        lastVerifiedAt: new Date().toISOString()
      });
    } else if (licenseData.machineId !== currentMachineId) {
      // Subsequent Login: Mismatch
      return { valid: false, message: "License already in use on another machine" };
    } else {
      // Subsequent Login: Match, update verification time
      await updateDoc(docRef, {
        lastVerifiedAt: new Date().toISOString()
      });
    }

    // If all checks pass, save offline cache
    saveOfflineCache(key);

    return { valid: true, message: "License Validated Successfully", license: licenseData };

  } catch (error) {
    console.error("Online validation error:", error);
    // If online check fails due to network error, fallback to offline check
    return validateLicenseOffline(key);
  }
};

/**
 * Validates license using local encrypted cache.
 * Used automatically when offline validation fails.
 */
export const validateLicenseOffline = (key) => {
  if (!fs.existsSync(LOCAL_CACHE_FILE)) {
    return { valid: false, message: "Network Error: Please connect to the internet to verify your license." };
  }

  try {
    const encryptedData = fs.readFileSync(LOCAL_CACHE_FILE, 'utf8');
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // Check if the cached key matches
    if (decryptedData.key !== key) {
      return { valid: false, message: "License Key Mismatch" };
    }

    // Verify machine ID
    if (decryptedData.machineId !== machineIdSync()) {
      return { valid: false, message: "Machine ID Mismatch" };
    }

    // Check 7-day grace period
    const lastVerified = new Date(decryptedData.lastVerifiedAt);
    const today = new Date();
    const diffTime = Math.abs(today - lastVerified);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > OFFLINE_GRACE_PERIOD_DAYS) {
      return { valid: false, message: `Offline limit exceeded (${OFFLINE_GRACE_PERIOD_DAYS} days). Please connect to the internet to reverify.` };
    }

    return { valid: true, message: "Verified Offline (Grace Period Active)", offlineMode: true };

  } catch (error) {
    console.error("Offline validation error:", error);
    return { valid: false, message: "Corrupted license data. Please connect to the internet." };
  }
};

/**
 * Saves validation result securely for offline use.
 */
const saveOfflineCache = (key) => {
  const data = {
    key: key,
    machineId: machineIdSync(),
    lastVerifiedAt: new Date().toISOString()
  };

  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_SECRET).toString();
  fs.writeFileSync(LOCAL_CACHE_FILE, encrypted, 'utf8');
};
