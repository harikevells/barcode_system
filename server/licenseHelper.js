const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, updateDoc } = require("firebase/firestore");
const { machineIdSync } = require("node-machine-id");
const CryptoJS = require("crypto-js");
const fs = require("fs");
const path = require("path");

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

const ENCRYPTION_SECRET = "super-secret-local-encryption-key-for-license";
const LOCAL_CACHE_FILE = path.join(__dirname, "license.cache");
const OFFLINE_GRACE_PERIOD_DAYS = 7;

// --- IN-MEMORY CACHE ---
// Stores the last license check result so Firebase is NOT called on every API request.
// Firebase is only re-checked every 10 minutes.
const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let memoryCache = {
  result: null,
  timestamp: 0
};

const getCachedStatus = () => {
  const now = Date.now();
  if (memoryCache.result && (now - memoryCache.timestamp) < MEMORY_CACHE_TTL_MS) {
    return memoryCache.result;
  }
  return null;
};

const setCachedStatus = (result) => {
  memoryCache.result = result;
  memoryCache.timestamp = Date.now();
};

// Call this to force a fresh Firebase check (e.g. after activation)
const clearMemoryCache = () => {
  memoryCache = { result: null, timestamp: 0 };
};

const validateLicenseOffline = () => {
  if (!fs.existsSync(LOCAL_CACHE_FILE)) {
    return { valid: false, message: "License not verified. Please connect to the internet." };
  }

  try {
    const encryptedData = fs.readFileSync(LOCAL_CACHE_FILE, 'utf8');
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (decryptedData.machineId !== machineIdSync()) {
      return { valid: false, message: "Machine ID Mismatch" };
    }

    const lastVerified = new Date(decryptedData.lastVerifiedAt);
    const today = new Date();
    const diffTime = Math.abs(today - lastVerified);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > OFFLINE_GRACE_PERIOD_DAYS) {
      return { valid: false, message: `Offline limit exceeded (${OFFLINE_GRACE_PERIOD_DAYS} days).` };
    }

    return { valid: true, message: "Verified Offline", offlineMode: true, license: decryptedData.key };
  } catch (error) {
    console.error("Offline validation error:", error);
    return { valid: false, message: "Corrupted license data." };
  }
};

const saveOfflineCache = (key) => {
  const data = {
    key: key,
    machineId: machineIdSync(),
    lastVerifiedAt: new Date().toISOString()
  };
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_SECRET).toString();
  fs.writeFileSync(LOCAL_CACHE_FILE, encrypted, 'utf8');
};

const validateLicenseOnline = async (key) => {
  try {
    const docRef = doc(db, "licenses", key);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { valid: false, message: "Invalid License Key" };
    }

    const licenseData = docSnap.data();
    const currentMachineId = machineIdSync();

    if (!licenseData.active) return { valid: false, message: "License Deactivated" };

    if (new Date() > new Date(licenseData.expiryDate)) {
      return { valid: false, message: "License Expired" };
    }

    if (!licenseData.machineId || licenseData.machineId === "") {
      await updateDoc(docRef, { machineId: currentMachineId, lastVerifiedAt: new Date().toISOString() });
    } else if (licenseData.machineId !== currentMachineId) {
      return { valid: false, message: "License already in use on another machine" };
    } else {
      await updateDoc(docRef, { lastVerifiedAt: new Date().toISOString() });
    }

    saveOfflineCache(key);
    const result = { valid: true, message: "License Validated Successfully" };
    setCachedStatus(result);
    return result;

  } catch (error) {
    console.error("Online validation error:", error.message);
    // Fall back to offline check — also cache the result
    const offlineResult = validateLicenseOffline();
    if (offlineResult.valid) setCachedStatus(offlineResult);
    return offlineResult;
  }
};

const checkCurrentLicenseStatus = async () => {
  // 1. Return cached result immediately if still fresh (avoids Firebase on every API call)
  const cached = getCachedStatus();
  if (cached) {
    return cached;
  }

  // 2. No valid cache — read local file to get the license key
  if (!fs.existsSync(LOCAL_CACHE_FILE)) {
    return { valid: false, message: "No license found" };
  }

  try {
    const encryptedData = fs.readFileSync(LOCAL_CACHE_FILE, 'utf8');
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // 3. Validate online and cache the result
    return await validateLicenseOnline(decryptedData.key);
  } catch(e) {
    return { valid: false, message: "Invalid local license file" };
  }
};

module.exports = {
  validateLicenseOnline,
  checkCurrentLicenseStatus,
  validateLicenseOffline,
  clearMemoryCache
};
