const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { WebSocketServer } = require("ws");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const WSS_PORT = 8080;
const API_PORT = 5001;

// Simple memory cache for backend de-duplication (prevents MongoDB flooding)
const recentScans = new Map();
function isDuplicateScan(barcode) {
  const now = Date.now();
  const lastScan = recentScans.get(barcode);
  if (lastScan && (now - lastScan) < 200) {
    return true; // Ignore only within 200ms (hardware bounce protection)
  }
  recentScans.set(barcode, now);

  // Cleanup old entries to prevent memory leak
  if (recentScans.size > 1000) {
    const cutoff = now - 5000;
    for (const [key, timestamp] of recentScans.entries()) {
      if (timestamp < cutoff) recentScans.delete(key);
    }
  }
  return false;
}

// --- MongoDB Setup ---
mongoose.connect("mongodb://127.0.0.1:27017/barcodeDB")
  .then(() => {
    console.log("📦 Connected to MongoDB");
    Product.collection.dropIndex("barcode_1").catch(() => {});
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, default: "" },
  description: { type: String, default: "" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const Shop = mongoose.model("Shop", shopSchema);

const shelfSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  shelfCode: String,
  createdAt: { type: Date, default: Date.now },
  products: [
    {
      barcode: String,
      type: { type: String, enum: ["scan", "manual"] },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

const Shelf = mongoose.model("Shelf", shelfSchema);

const bcScanSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  rowId: { type: Number, index: true },
  scannerId: Number,
  barcode: String,
  timestamp: Date,
  syncedAt: { type: Date, default: Date.now },
  source: { type: String, default: "BC" }
}, { timestamps: true });

const BCScan = mongoose.model("BCScan", bcScanSchema);

// --- Product Master Schema ---
const productSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  barcode: { type: String, required: true, index: true },
  productName: String,
  mrp: { type: Number, default: 0 },
  physicalQuantity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
// Add compound unique index
productSchema.index({ shopId: 1, barcode: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);

// --- Activity Log Schema ---
const activityLogSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true },
  productName: { type: String, default: "N/A" },
  barcode: { type: String, default: "" },
  previousValue: { type: String, default: "N/A" },
  updatedValue: { type: String, default: "N/A" },
  details: { type: String, default: "" },
  actionType: { type: String, required: true },
  importSessionId: { type: String, default: "" },  // groups all logs for a single import run
  mrp: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 }
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

// ImportSession model to store session metadata like notes
const importSessionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  importSessionId: { type: String, required: true },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ImportSession = mongoose.model("ImportSession", importSessionSchema);

// Helper function to log actions
async function logActivity(action, productName, previousValue, updatedValue, actionType, barcode = "", details = "", importSessionId = "", mrp = 0, quantity = 0, shopId) {
  try {
    const log = new ActivityLog({
      shopId: shopId,
      action,
      productName: productName || "N/A",
      barcode: barcode || "",
      previousValue: previousValue !== undefined && previousValue !== null ? String(previousValue) : "N/A",
      updatedValue: updatedValue !== undefined && updatedValue !== null ? String(updatedValue) : "N/A",
      details: details || (previousValue !== undefined && previousValue !== null && updatedValue !== undefined && updatedValue !== null ? `Qty: ${previousValue} → ${updatedValue}` : ""),
      actionType,
      importSessionId,
      mrp,
      quantity
    });
    await log.save();
  } catch (err) {
    console.error("❌ Failed to log activity:", err);
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidStockInwardRow(item = {}) {
  const barcode = normalizeText(item.barcode);
  const productName = normalizeText(item.productName);
  const mrp = normalizeNumber(item.mrp ?? item.price ?? item.rate);
  const quantity = Number.parseInt(item.physicalQuantity ?? item.quantity ?? item.qty ?? 0, 10);

  return Boolean(barcode && productName && mrp !== null && Number.isFinite(quantity));
}

async function findBarcodeMatch(barcode, shopId) {
  const cleanBarcode = normalizeText(barcode);
  if (!cleanBarcode) return [];

  return Product.find({
    shopId: shopId,
    barcode: { $regex: `^${escapeRegex(cleanBarcode)}$`, $options: "i" }
  });
}

async function createUniqueBarcode(baseBarcode, shopId) {
  const candidateBase = normalizeText(baseBarcode) || `GEN_${Date.now()}`;
  let candidate = candidateBase;
  let suffix = 1;

  while (await Product.findOne({ shopId: shopId, barcode: { $regex: `^${escapeRegex(candidate)}$`, $options: "i" } })) {
    candidate = `${candidateBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function resolveReceivedStockTarget(item, shopId) {
  const barcode = normalizeText(item.barcode);
  const productName = normalizeText(item.productName);
  const mrp = normalizeNumber(item.mrp ?? item.price ?? item.rate);

  if (!barcode) return { action: "skip" };

  const exactBarcodes = await findBarcodeMatch(barcode, shopId);
  if (exactBarcodes.length === 0) {
    return { action: "create" };
  }

  // 1. Try exact match (barcode + name + mrp)
  let matched = exactBarcodes.find((product) => {
    const sameName = normalizeText(product.productName) === productName;
    const sameMrp = Number(product.mrp) === Number(mrp);
    return sameName && sameMrp;
  });

  // 2. Fallback to existing product with same barcode to prevent duplicate key error
  if (!matched && exactBarcodes.length > 0) {
    matched = exactBarcodes[0];
  }

  if (matched) {
    return { action: "update", product: matched };
  }

  return { action: "create" };
}


// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Global Cache-Control Prevention Middleware
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

const { checkCurrentLicenseStatus, validateLicenseOnline, clearMemoryCache } = require("./licenseHelper");

// License Endpoints
app.get("/api/license/status", async (req, res) => {
  const status = await checkCurrentLicenseStatus();
  res.json(status);
});

app.post("/api/license/activate", async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false, message: "Key required" });
  clearMemoryCache(); // Force a fresh Firebase check on next request after activation
  const status = await validateLicenseOnline(key);
  res.json(status);
});


// --- SHOP ENDPOINTS ---
app.get("/api/shops", async (req, res) => {
  try {
    // 1. Sort by name ascending (1)
    const shops = await Shop.find({ active: true }).sort({ name: 1 });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for duplicate check (ignores spaces, case, checks name only)
async function isDuplicateShop(name, excludeId = null) {
  const normName = (name || "").replace(/\s+/g, "").toLowerCase();

  const shops = await Shop.find({ active: true });
  for (const s of shops) {
    if (excludeId && s._id.toString() === excludeId.toString()) continue;
    const sName = (s.name || "").replace(/\s+/g, "").toLowerCase();
    if (sName === normName) {
      return true;
    }
  }
  return false;
}

app.post("/api/shops", async (req, res) => {
  try {
    if (await isDuplicateShop(req.body.name)) {
      return res.status(400).json({ error: "A shop with this name already exists." });
    }
    const shop = new Shop(req.body);
    await shop.save();
    res.json({ message: "Shop created", shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/shops/:id", async (req, res) => {
  try {
    if (req.body.name !== undefined) {
      if (await isDuplicateShop(req.body.name, req.params.id)) {
        return res.status(400).json({ error: "A shop with this name already exists." });
      }
    }
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Shop updated", shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    res.json({ message: "Shop soft deleted", shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shop middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.path.startsWith('/api/license') || req.path.startsWith('/api/shops') || req.path.startsWith('/api/barcode') || req.path.startsWith('/api/scanners/count')) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    const shopId = req.headers['x-shop-id'];
    if (!shopId) {
      return res.status(400).json({ error: "SHOP_REQUIRED", message: "Shop ID is required in headers." });
    }
    req.shopId = shopId;
  }
  next();
});


// Global License Guard Middleware
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS' || req.path.startsWith('/api/license')) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    const status = await checkCurrentLicenseStatus();
    if (!status.valid) {
      return res.status(403).json({ error: "LICENSE_REQUIRED", message: status.message });
    }
  }
  next();
});

// Add scanned product
app.post("/api/scan", async (req, res) => {
  const { barcode } = req.body;

  try {
    const activeSession = await mongoose.model("AuditSession").findOne({ status: "active" });
    if (!activeSession) {
      console.log(`⏩ Scan ignored (no active audit session): "${barcode}"`);
      return res.status(400).json({ error: "NO_ACTIVE_AUDIT", message: "No active audit session. Scan ignored." });
    }
  } catch (err) {
    console.error("Error checking active audit session:", err);
    return res.status(500).json({ error: "Database error checking audit status" });
  }

  if (isDuplicateScan(barcode)) {
    return res.status(200).json({ message: "Ignored duplicate scan" });
  }

  try {
    // Store scan in BCScan collection
    const bcScan = new BCScan({
      shopId: req.shopId,
      rowId: Date.now() + Math.floor(Math.random() * 1000),
      barcode: barcode,
      timestamp: new Date(),
      source: "web"
    });
    await bcScan.save();

    // Broadcast to Live Dashboard
    broadcast({
      source: "serial",
      port: "Web/API",
      value: barcode,
      timestamp: Date.now()
    });

    res.json({ message: "Product added", product: bcScan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let activeScannersCount = 0;
const activeRaspberryPis = new Map();

// Helper to broadcast active scanners count
function updateActiveScannersCount() {
  const newCount = activeRaspberryPis.size;
  if (activeScannersCount !== newCount) {
    activeScannersCount = newCount;
    console.log(`📡 Updated Active Scanners Count: ${activeScannersCount} (Auto-detected real count)`);
    broadcast({
      source: "system",
      activeScannersCount: activeScannersCount
    });
  }
}

// Cleanup interval to remove inactive Raspberry Pis (15 seconds timeout)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [scannerId, lastSeen] of activeRaspberryPis.entries()) {
    if (now - lastSeen > 15000) {
      activeRaspberryPis.delete(scannerId);
      changed = true;
      console.log(`📡 Scanner ${scannerId} disconnected (timeout).`);
    }
  }
  if (changed) {
    updateActiveScannersCount();
  }
}, 5000);

app.get("/api/scanners/count", (req, res) => {
  res.json({ count: activeScannersCount });
});

app.post("/api/scanners/count", (req, res) => {
  const { count } = req.body;
  if (count !== undefined && !isNaN(count)) {
    activeScannersCount = parseInt(count);
    console.log(`📡 Updated Active Scanners Count: ${activeScannersCount} (Manual override)`);
    broadcast({
      source: "system",
      activeScannersCount: activeScannersCount
    });
  }
  res.json({ success: true, count: activeScannersCount });
});

// Endpoint for Raspberry Pi Heartbeat
app.post("/api/scanners/ping", (req, res) => {
  const scannerId = req.body.scanner || req.body.scannerId || req.body.scanner_id || "1";
  activeRaspberryPis.set(String(scannerId), Date.now());
  updateActiveScannersCount();
  res.json({ success: true, activeScannersCount });
});

// Endpoint for Python Raspberry Pi script
app.post("/api/barcode", async (req, res) => {
  // Python script might send {"barcode": "...", "scanner": "..."}
  const barcode = req.body.barcode || req.body.data || Object.keys(req.body)[0];
  const scannerId = req.body.scanner || req.body.scannerId || req.body.scanner_id || "1";

  console.log(`📥 /api/barcode received: barcode="${barcode}" scanner="${scannerId}" from ${req.ip}`);

  let activeSession = null;
  try {
    activeSession = await mongoose.model("AuditSession").findOne({ status: "active" });
    if (!activeSession) {
      console.log(`⏩ Scan ignored (no active audit session): "${barcode}"`);
      return res.status(400).json({ error: "NO_ACTIVE_AUDIT", message: "No active audit session. Scan ignored." });
    }
  } catch (err) {
    console.error("Error checking active audit session:", err);
    return res.status(500).json({ error: "Database error checking audit status" });
  }


  if (!isNaN(scannerId)) {
    activeRaspberryPis.set(String(scannerId), Date.now());
    updateActiveScannersCount();
  }

  if (isDuplicateScan(barcode)) {
    console.log(`⏩ Duplicate scan ignored: "${barcode}"`);
    return res.status(200).json({ message: "Ignored duplicate scan" });
  }

  try {
    // 1. Save to MongoDB so it shows up in Rack History!
    const bcScan = new BCScan({
      shopId: activeSession.shopId,
      rowId: Date.now() + Math.floor(Math.random() * 1000),
      scannerId: isNaN(scannerId) ? null : parseInt(scannerId),
      barcode: barcode,
      timestamp: new Date(),
      source: "API"
    });
    await bcScan.save();

    // 2. Broadcast directly to React WebSocket so the UI updates LIVE!
    broadcast({
      source: "serial",
      port: `RaspberryPi (Scanner ${scannerId})`,
      value: barcode,
      timestamp: Date.now()
    });

    console.log(`✅ Broadcasted: "${barcode}" to ${clients.size} WebSocket client(s)`);
    res.json({ success: true, message: "Saved and Broadcasted" });
  } catch (err) {
    console.error("Error in /api/barcode:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add manual product
app.post("/api/manual", async (req, res) => {
  const { barcode } = req.body;

  try {
    // Store manual entry in BCScan collection
    const bcScan = new BCScan({
      shopId: req.shopId,
      rowId: Date.now() + Math.floor(Math.random() * 1000),
      barcode: barcode,
      timestamp: new Date(),
      source: "manual"
    });
    await bcScan.save();
    res.json({ message: "Manual product added", product: bcScan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function readBCScans() {
  const dbPath = path.join(__dirname, "..", "BC", "barcode_scans.db");

  return new Promise((resolve, reject) => {
    try {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("❌ SQLite connection error:", err);
          return reject(err);
        }

        db.serialize(() => {
          db.all("SELECT id, scanner_id, barcode, timestamp FROM scans ORDER BY id ASC", (err, rows) => {
            db.close((closeErr) => {
              if (err) {
                console.error("❌ Query error:", err);
                return reject(err);
              }
              if (closeErr) {
                console.error("❌ Close error:", closeErr);
                return reject(closeErr);
              }
              console.log(`✅ Read ${rows?.length || 0} scans from BC database`);
              resolve(rows || []);
            });
          });
        });
      });
    } catch (err) {
      console.error("❌ Unexpected error in readBCScans:", err);
      reject(err);
    }
  });
}

app.post("/api/sync-bc-db", async (req, res) => {
  try {
    console.log("📤 Starting BC database sync...");
    const rows = await readBCScans();

    let synced = 0;
    for (const row of rows) {
      try {
        await BCScan.updateOne(
          { rowId: row.id },
          {
            $set: {
              scannerId: row.scanner_id,
              barcode: row.barcode,
              timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
              syncedAt: new Date(),
              source: "BC"
            }
          },
          { upsert: true }
        );
        synced += 1;
      } catch (updateErr) {
        console.error(`❌ Failed to sync row ${row.id}:`, updateErr);
      }
    }

    console.log(`✅ Synced ${synced} records to MongoDB`);
    res.json({ message: `BC database synced to MongoDB (${synced} records)`, count: synced });
  } catch (err) {
    console.error("❌ BC sync failed:", err);
    res.status(500).json({ error: err.message || "Failed to sync BC database" });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const history = await BCScan.find({ shopId: req.shopId }).sort({ timestamp: -1, createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all data
app.get("/api/shelves", async (req, res) => {
  try {
    const shelves = await Shelf.find({ shopId: req.shopId }).sort({ createdAt: -1 });
    res.json(shelves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear DB or Session
app.delete("/api/clear", async (req, res) => {
  try {
    // 1. Clear MongoDB Collections
    await Shelf.deleteMany({ shopId: req.shopId });
    await BCScan.deleteMany({ shopId: req.shopId });

    // 2. Clear Local SQLite Database (if it exists on this machine)
    const dbPath = path.join(__dirname, "..", "BC", "barcode_scans.db");
    const db = new sqlite3.Database(dbPath, (err) => {
      if (!err) {
        db.run("DELETE FROM scans", (deleteErr) => {
          if (deleteErr) console.error("❌ Failed to clear SQLite DB:", deleteErr);
          else console.log("🗑️ SQLite DB Cleared");
          db.close();
        });
      }
    });

    res.json({ message: "All databases (MongoDB & SQLite) cleared completely" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear ALL Databases (including Products, ActivityLogs, AuditSessions)
app.delete("/api/clear-all", async (req, res) => {
  try {
    // 1. Clear MongoDB Collections
    await Shelf.deleteMany({ shopId: req.shopId });
    await BCScan.deleteMany({ shopId: req.shopId });
    await Product.deleteMany({ shopId: req.shopId });
    await ActivityLog.deleteMany({ shopId: req.shopId });
    await AuditSession.deleteMany({ shopId: req.shopId });
    await ImportSession.deleteMany({ shopId: req.shopId });

    // 2. Clear Local SQLite Database (if it exists on this machine)
    const dbPath = path.join(__dirname, "..", "BC", "barcode_scans.db");
    const db = new sqlite3.Database(dbPath, (err) => {
      if (!err) {
        db.run("DELETE FROM scans", (deleteErr) => {
          if (deleteErr) console.error("❌ Failed to clear SQLite DB:", deleteErr);
          else console.log("🗑️ SQLite DB Cleared");
          db.close();
        });
      }
    });

    res.json({ message: "All databases (MongoDB & SQLite) cleared completely, including Products and Logs" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== INVENTORY RECONCILIATION ENDPOINTS ==========

// Create or update a product
app.post("/api/products", async (req, res) => {
  try {
    const { barcode, productName, mrp, physicalQuantity } = req.body;
    const cleanBarcode = barcode ? String(barcode).trim() : "";
    const cleanName = productName ? String(productName).trim() : "";

    // Search by barcode first (case-insensitive), fallback to product name (case-insensitive)
    let product = null;
    if (cleanBarcode) {
      product = await Product.findOne({ shopId: req.shopId, barcode: new RegExp("^" + cleanBarcode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") });
    }
    if (!product && cleanName) {
      product = await Product.findOne({ shopId: req.shopId, productName: new RegExp("^" + cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") });
    }

    const isNew = !product;
    const previousQty = product ? product.physicalQuantity : 0;

    if (product) {
      // Update existing product
      product.productName = productName;
      if (cleanBarcode) product.barcode = cleanBarcode;
      product.mrp = mrp;
      product.physicalQuantity = physicalQuantity;
      product.updatedAt = new Date();
      await product.save();
    } else {
      // Create new product
      product = new Product({
        shopId: req.shopId,
        barcode: cleanBarcode || "GEN_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        productName,
        mrp,
        physicalQuantity
      });
      await product.save();
    }

    // Log the manual update/creation
    const action = isNew ? "PRODUCT_CREATE" : "PRODUCT_UPDATE";
    const sessionId = "MANUAL_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    await logActivity(
      action,
      productName,
      previousQty,
      physicalQuantity,
      isNew ? "Manual Create" : "Manual Update",
      product.barcode,
      isNew ? `Created manually with Qty: ${physicalQuantity}` : `Updated manually: Qty ${previousQty} → ${physicalQuantity}`,
      sessionId,
      mrp,
      physicalQuantity,
      req.shopId
    );

    res.json({ message: "Product saved", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({ shopId: req.shopId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product by barcode
app.get("/api/products/:barcode", async (req, res) => {
  try {
    const product = await Product.findOne({ shopId: req.shopId, barcode: req.params.barcode });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  try {
    // Find product before deleting to log details
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    // Log the deletion
    await logActivity("PRODUCT_DELETE", product.productName, product.physicalQuantity, "Deleted", "Deletion", product.barcode, "Deleted product", "", 0, 0, req.shopId);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all activity logs
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await ActivityLog.find({ shopId: req.shopId }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get import session groups (for accordion log UI)
app.get("/api/import-sessions", async (req, res) => {
  try {
    // Fetch ALL logs matching these actions
    const importActions = ["PRODUCT_IMPORT_UPDATE", "PRODUCT_IMPORT_CREATE", "SALES_IMPORT", "STOCK_RECEIVED_UPDATE", "STOCK_RECEIVED_CREATE", "PRODUCT_CREATE", "PRODUCT_UPDATE", "TESTER_DAMAGE_IMPORT", "SHRINKAGE_IMPORT"];
    const logs = await ActivityLog.find({
      shopId: req.shopId,
      action: { $in: importActions }
    }).sort({ timestamp: -1 });

    const sessionsMap = {};
    const legacySessions = []; // list of sessions created dynamically for legacy logs

    for (const log of logs) {
      const sid = log.importSessionId;
      const logType = log.action.startsWith("SALES") ? "Sales Import" :
        log.action.startsWith("STOCK") ? "Received Stock Import" :
          log.action === "TESTER_DAMAGE_IMPORT" ? "Tester/ Damage" :
            log.action === "SHRINKAGE_IMPORT" ? "Shrinkage" :
              (log.action === "PRODUCT_CREATE" || log.action === "PRODUCT_UPDATE") ? "Manual Entry" : "Product Import";

      // Parse quantity for legacy logs if not set
      let qty = log.quantity;
      if (qty === undefined || qty === null || qty === 0) {
        if (log.action.startsWith("SALES") || log.action === "TESTER_DAMAGE_IMPORT" || log.action === "SHRINKAGE_IMPORT") {
          const match = String(log.details || "").match(/(?:Sold|Removed|Qty):\s*(\d+)/i);
          if (match) {
            qty = parseInt(match[1]);
          } else {
            const prev = parseInt(log.previousValue);
            const upd = parseInt(log.updatedValue);
            qty = (!isNaN(prev) && !isNaN(upd)) ? Math.abs(prev - upd) : 0;
          }
        } else {
          const upd = parseInt(log.updatedValue);
          qty = !isNaN(upd) ? upd : 0;
        }
      }

      const parsedMRP = log.mrp || 0;

      if (sid) {
        // Log has session ID: Group normally
        if (!sessionsMap[sid]) {
          sessionsMap[sid] = {
            importSessionId: sid,
            timestamp: log.timestamp,
            importType: logType,
            products: []
          };
        }
        sessionsMap[sid].products.push({
          timestamp: log.timestamp,
          productName: log.productName,
          barcode: log.barcode,
          mrp: parsedMRP,
          quantity: qty,
          action: log.action,
          details: log.details,
          previousValue: log.previousValue,
          updatedValue: log.updatedValue
        });
      } else {
        // Legacy log without session ID: group by timestamp proximity (within 5 seconds) and type
        const logTime = new Date(log.timestamp).getTime();
        let targetSession = legacySessions.find(s =>
          s.importType === logType &&
          Math.abs(new Date(s.timestamp).getTime() - logTime) <= 5000
        );

        if (!targetSession) {
          const newSid = "LEGACY_" + logTime + "_" + Math.floor(Math.random() * 1000);
          targetSession = {
            importSessionId: newSid,
            timestamp: log.timestamp,
            importType: logType,
            products: []
          };
          legacySessions.push(targetSession);
        }

        targetSession.products.push({
          timestamp: log.timestamp,
          productName: log.productName,
          barcode: log.barcode,
          mrp: parsedMRP,
          quantity: qty,
          action: log.action,
          details: log.details,
          previousValue: log.previousValue,
          updatedValue: log.updatedValue
        });
      }
    }

    // Merge sessionsMap and legacySessions
    const allSessions = [
      ...Object.values(sessionsMap),
      ...legacySessions
    ];

    // Sort all sessions by timestamp descending
    allSessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Load notes for each session from ImportSession collection
    for (const session of allSessions) {
      const sessionDoc = await ImportSession.findOne({ shopId: req.shopId, importSessionId: session.importSessionId });
      if (sessionDoc) {
        session.notes = sessionDoc.notes || "";
      }
    }

    res.json(allSessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save notes for an import session
app.put("/api/import-sessions/:sessionId/note", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }

    // Limit notes to 30 characters
    const truncatedNotes = String(notes || "").substring(0, 30);

    let session = await ImportSession.findOne({ shopId: req.shopId, importSessionId: sessionId });
    if (!session) {
      session = new ImportSession({
        shopId: req.shopId,
        importSessionId: sessionId,
        notes: truncatedNotes
      });
    } else {
      session.notes = truncatedNotes;
      session.updatedAt = new Date();
    }

    await session.save();
    res.json({ message: "Note saved successfully.", notes: truncatedNotes });
  } catch (err) {
    console.error("Error saving note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get notes for an import session
app.get("/api/import-sessions/:sessionId/note", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ImportSession.findOne({ shopId: req.shopId, importSessionId: sessionId });
    res.json({ notes: session?.notes || "" });
  } catch (err) {
    console.error("Error retrieving note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import Products
app.post("/api/products/import", async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid body. 'products' array is required." });
    }
    const sessionId = "PROD_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    let processedCount = 0;
    for (const item of products) {
      const { barcode, productName, mrp, physicalQuantity } = item;
      if (!productName) continue; // Skip rows without product name

      const cleanBarcode = barcode ? String(barcode).trim() : "";
      const cleanName = productName ? String(productName).trim() : "";

      const finalBarcode = cleanBarcode || "GEN_" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const finalMRP = mrp !== undefined ? mrp : 0;
      const finalQty = physicalQuantity !== undefined ? physicalQuantity : 0;

      try {
        let product = null;

        // 1. Try to find and update by exact barcode match
        if (cleanBarcode) {
          product = await Product.findOneAndUpdate(
            { shopId: req.shopId, barcode: cleanBarcode },
            { $set: { productName, mrp: finalMRP, physicalQuantity: finalQty, updatedAt: new Date() } },
            { new: false } // return the original document
          );
        }

        // 2. If not found by barcode, try by exact name (if no barcode was provided)
        if (!product && !cleanBarcode && cleanName) {
          product = await Product.findOneAndUpdate(
            { shopId: req.shopId, productName: new RegExp("^" + cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") },
            { $set: { productName, mrp: finalMRP, physicalQuantity: finalQty, updatedAt: new Date() } },
            { new: false }
          );
        }

        if (product) {
          // Successfully updated an existing product
          await logActivity(
            "PRODUCT_IMPORT_UPDATE",
            productName,
            product.physicalQuantity,
            finalQty,
            "Product Import",
            product.barcode,
            "",
            sessionId,
            finalMRP,
            finalQty,
            req.shopId
          );
        } else {
          // Product doesn't exist, try to create it
          const newProduct = new Product({
            shopId: req.shopId,
            barcode: finalBarcode,
            productName,
            mrp: finalMRP,
            physicalQuantity: finalQty
          });
          await newProduct.save();

          await logActivity(
            "PRODUCT_IMPORT_CREATE",
            productName,
            "N/A",
            finalQty,
            "Product Import",
            finalBarcode,
            "",
            sessionId,
            finalMRP,
            finalQty,
            req.shopId
          );
        }
        processedCount++;
      } catch (err) {
        console.warn(`⏩ Skipped item ${cleanBarcode || cleanName} due to error:`, err.message);
        // Automatically skip on duplicate key or other insertion errors
      }
    }

    res.json({ message: `Successfully imported/updated ${processedCount} products.`, count: processedCount });
  } catch (err) {
    console.error("Error in bulk product import:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk Received Stock Import (Adds stock to existing products or creates new products)
app.post("/api/products/received-stock", async (req, res) => {
  try {
    const { products } = req.body || {};
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid body. 'products' array is required." });
    }

    const filteredProducts = products.filter((item) => {
      const bc = normalizeText(item.barcode);
      return bc && bc.toLowerCase() !== "total";
    });

    const invalidRows = filteredProducts.filter((item) => !isValidStockInwardRow(item));
    if (invalidRows.length > 0) {
      return res.status(400).json({
        error: "Unable to Run",
        message: "Barcode, Product Name, MRP and Quantity are required for all valid rows before running Stock Inward."
      });
    }

    const sessionId = "STOCK_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    let updatedCount = 0;
    let createdCount = 0;

    for (const item of filteredProducts) {
      const barcode = normalizeText(item.barcode);
      const productName = normalizeText(item.productName);
      const receivedQty = Number.parseInt(item.physicalQuantity ?? item.quantity ?? item.qty ?? 0, 10) || 0;
      const mrp = normalizeNumber(item.mrp ?? item.price ?? item.rate);

      const target = await resolveReceivedStockTarget(item, req.shopId);

      if (target.action === "update" && target.product) {
        const previousQty = Number(target.product.physicalQuantity) || 0;
        const newQty = previousQty + receivedQty;
        const finalMRP = mrp !== null ? mrp : Number(target.product.mrp) || 0;

        target.product.productName = productName;
        target.product.mrp = finalMRP;
        target.product.physicalQuantity = newQty;
        target.product.updatedAt = new Date();

        await target.product.save();
        updatedCount++;

        await logActivity(
          "STOCK_RECEIVED_UPDATE",
          target.product.productName,
          previousQty,
          newQty,
          `Received Stock (+${receivedQty})`,
          target.product.barcode,
          "",
          sessionId,
          finalMRP,
          receivedQty,
          req.shopId
        );
      } else {
        const finalBarcode = await createUniqueBarcode(barcode || `GEN_${Date.now()}`, req.shopId);
        const finalName = productName || `Item ${finalBarcode}`;
        const finalMRP = mrp !== null ? mrp : 0;

        const newProduct = new Product({
          shopId: req.shopId,
          barcode: finalBarcode,
          productName: finalName,
          mrp: finalMRP,
          physicalQuantity: receivedQty
        });

        await newProduct.save();
        createdCount++;

        await logActivity(
          "STOCK_RECEIVED_CREATE",
          finalName,
          0,
          receivedQty,
          `Received Stock New (+${receivedQty})`,
          finalBarcode,
          "",
          sessionId,
          finalMRP,
          receivedQty,
          req.shopId
        );
      }
    }

    const totalCount = updatedCount + createdCount;
    res.json({
      message: `Successfully processed Received Stock for ${totalCount} items (${updatedCount} updated, ${createdCount} newly added).`,
      updatedCount,
      createdCount,
      count: totalCount
    });
  } catch (err) {
    console.error("Error in received stock import:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import Sales
app.post("/api/sales/import", async (req, res) => {
  try {
    const { sales } = req.body;
    if (!Array.isArray(sales)) {
      return res.status(400).json({ error: "Invalid body. 'sales' array is required." });
    }

    const sessionId = "SALES_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    let processedCount = 0;
    const warnings = [];

    for (const item of sales) {
      const barcode = normalizeText(item.barcode);
      const productName = normalizeText(item.productName);
      const soldQty = Number.parseInt(item.quantity ?? item.physicalQuantity ?? item.qty ?? 0, 10) || 0;
      if (soldQty <= 0) continue;
      if (!barcode) {
        warnings.push(`Skipped row without barcode: ${productName || "Unknown Product"}`);
        continue;
      }

      const matches = await findBarcodeMatch(barcode, req.shopId);
      if (matches.length !== 1) {
        warnings.push(`Barcode '${barcode}' was skipped because it was not uniquely found in master data (${matches.length} matches).`);
        continue;
      }

      const product = matches[0];
      const previousQty = Number(product.physicalQuantity) || 0;
      const newQty = Math.max(0, previousQty - soldQty);

      product.physicalQuantity = newQty;
      product.updatedAt = new Date();
      await product.save();

      await logActivity(
        "SALES_IMPORT",
        product.productName,
        previousQty,
        newQty,
        "Sales Import",
        product.barcode,
        `Sold: ${soldQty} units`,
        sessionId,
        product.mrp,
        soldQty,
        req.shopId
      );
      processedCount++;
    }

    res.json({
      message: `Processed ${processedCount} sales transactions.`,
      count: processedCount,
      warnings
    });
  } catch (err) {
    console.error("Error in sales import:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import Tester/Damage
app.post("/api/tester-damage/import", async (req, res) => {
  try {
    const { testerDamage } = req.body;
    if (!Array.isArray(testerDamage)) {
      return res.status(400).json({ error: "Invalid body. 'testerDamage' array is required." });
    }

    const sessionId = "TESTER_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    let processedCount = 0;
    const warnings = [];

    for (const item of testerDamage) {
      const barcode = normalizeText(item.barcode);
      const productName = normalizeText(item.productName);
      const removeQty = Number.parseInt(item.quantity ?? item.physicalQuantity ?? item.qty ?? 0, 10) || 0;
      if (removeQty <= 0) continue;
      if (!barcode) {
        warnings.push(`Skipped row without barcode: ${productName || "Unknown Product"}`);
        continue;
      }

      const matches = await findBarcodeMatch(barcode, req.shopId);
      if (matches.length !== 1) {
        warnings.push(`Barcode '${barcode}' was skipped because it was not uniquely found in master data (${matches.length} matches).`);
        continue;
      }

      const product = matches[0];
      const previousQty = Number(product.physicalQuantity) || 0;
      const newQty = Math.max(0, previousQty - removeQty);

      product.physicalQuantity = newQty;
      product.updatedAt = new Date();
      await product.save();

      await logActivity(
        "TESTER_DAMAGE_IMPORT",
        product.productName,
        previousQty,
        newQty,
        "Tester/ Damage",
        product.barcode,
        `Removed: ${removeQty} units (Tester/Damage)`,
        sessionId,
        product.mrp,
        removeQty,
        req.shopId
      );
      processedCount++;
    }

    res.json({
      message: `Processed ${processedCount} tester/damage records.`,
      count: processedCount,
      warnings
    });
  } catch (err) {
    console.error("Error in tester/damage import:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import Shrinkage
app.post("/api/shrinkage/import", async (req, res) => {
  try {
    const { shrinkage } = req.body;
    if (!Array.isArray(shrinkage)) {
      return res.status(400).json({ error: "Invalid body. 'shrinkage' array is required." });
    }

    const sessionId = "SHRINK_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    let processedCount = 0;
    const warnings = [];

    for (const item of shrinkage) {
      const barcode = normalizeText(item.barcode);
      const productName = normalizeText(item.productName);
      const removeQty = Number.parseInt(item.quantity ?? item.physicalQuantity ?? item.qty ?? 0, 10) || 0;
      if (removeQty <= 0) continue;
      if (!barcode) {
        warnings.push(`Skipped row without barcode: ${productName || "Unknown Product"}`);
        continue;
      }

      const matches = await findBarcodeMatch(barcode, req.shopId);
      if (matches.length !== 1) {
        warnings.push(`Barcode '${barcode}' was skipped because it was not uniquely found in master data (${matches.length} matches).`);
        continue;
      }

      const product = matches[0];
      const previousQty = Number(product.physicalQuantity) || 0;
      const newQty = Math.max(0, previousQty - removeQty);

      product.physicalQuantity = newQty;
      product.updatedAt = new Date();
      await product.save();

      await logActivity(
        "SHRINKAGE_IMPORT",
        product.productName,
        previousQty,
        newQty,
        "Shrinkage",
        product.barcode,
        `Removed: ${removeQty} units (Shrinkage)`,
        sessionId,
        product.mrp,
        removeQty,
        req.shopId
      );
      processedCount++;
    }

    res.json({
      message: `Processed ${processedCount} shrinkage records.`,
      count: processedCount,
      warnings
    });
  } catch (err) {
    console.error("Error in shrinkage import:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get total scans for all barcodes
app.get("/api/audit/totals", async (req, res) => {
  try {
    const totals = await BCScan.aggregate([{ $match: { shopId: req.shopId } },
    { $group: { _id: "$barcode", count: { $sum: 1 } } }
    ]);
    const scanCountMap = {};
    totals.forEach(t => {
      scanCountMap[t._id] = t.count;
    });
    res.json(scanCountMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get global reconciliation report
app.get("/api/reconciliation/report", async (req, res) => {
  try {
    const { barcodes, auditId } = req.query;
    let barcodeFilter = null;
    if (barcodes) {
      barcodeFilter = barcodes.split(",").map(b => b.trim()).filter(Boolean);
    }

    const scanCountMap = {};

    if (auditId) {
      // Get totals from specific Audit Session
      const session = await AuditSession.findById(auditId);
      if (session && session.scans) {
        session.scans.forEach(scan => {
          if (!barcodeFilter || barcodeFilter.includes(scan.barcode)) {
            scanCountMap[scan.barcode] = (scanCountMap[scan.barcode] || 0) + 1;
          }
        });
      }
    } else {
      // 1. Get totals from BCScan for the current shop
      const matchStage = { $match: { shopId: req.shopId } };
      if (barcodeFilter) {
        matchStage.$match.barcode = { $in: barcodeFilter };
      }

      const totals = await BCScan.aggregate([
        matchStage,
        { $group: { _id: "$barcode", count: { $sum: 1 } } }
      ]);
      totals.forEach(t => {
        scanCountMap[t._id] = t.count;
      });
    }

    // 2. Build reconciliation data by iterating over all Products
    const reconciliationData = [];
    let totalPhyQty = 0;
    let totalPhyAmt = 0;
    let totalSysQty = 0;
    let totalSysAmt = 0;
    let totalDiffQty = 0;
    let totalDiffAmt = 0;

    const productQuery = barcodeFilter ? { shopId: req.shopId, barcode: { $in: barcodeFilter } } : { shopId: req.shopId };
    const products = await Product.find(productQuery);

    for (const product of products) {
      const sysQty = product.physicalQuantity || 0; // The count imported from Excel (Master Data)
      const phyQty = scanCountMap[product.barcode] || 0; // The live count from scanners
      const mrp = product.mrp || 0;

      const phyAmt = phyQty * mrp;
      const sysAmt = sysQty * mrp;
      const diff = phyQty - sysQty;
      const diffAmt = diff * mrp;

      reconciliationData.push({
        barcode: product.barcode,
        productName: product.productName,
        phyQty,
        mrp,
        phyAmt,
        sysQty,
        sysAmt,
        diff,
        diffAmt
      });

      totalPhyQty += phyQty;
      totalPhyAmt += phyAmt;
      totalSysQty += sysQty;
      totalSysAmt += sysAmt;
      totalDiffQty += diff;
      totalDiffAmt += diffAmt;
    }

    // Add any unknown scanned barcodes that aren't in Product DB
    const knownBarcodes = new Set(products.map(p => p.barcode));
    for (const [barcode, scanCount] of Object.entries(scanCountMap)) {
      if (!knownBarcodes.has(barcode)) {
        if (barcodeFilter && !barcodeFilter.includes(barcode)) {
          continue;
        }

        const phyQty = scanCount; // Scanner count is Physical
        const sysQty = 0;         // Unknown in system
        const diff = phyQty - sysQty;

        reconciliationData.push({
          barcode: barcode,
          productName: "Unknown Product",
          phyQty: phyQty,
          mrp: 0,
          phyAmt: 0,
          sysQty: sysQty,
          sysAmt: 0,
          diff: diff,
          diffAmt: 0
        });

        totalPhyQty += phyQty;
        totalDiffQty += diff;
      }
    }

    res.json({
      data: reconciliationData,
      summary: {
        totalPhyQty,
        totalPhyAmt,
        totalSysQty,
        totalSysAmt,
        totalDiffQty,
        totalDiffAmt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== AUDIT SESSION ENDPOINTS ==========

// --- Audit Session Schema ---
const auditSessionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  auditId: { type: String, required: true },
  name: { type: String, default: "" },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  status: { type: String, enum: ["active", "saved", "discarded"], default: "active" },
  scans: [{ barcode: String, timestamp: Date, scanner: String }],
  totalScannedItems: { type: Number, default: 0 }
});

const AuditSession = mongoose.model("AuditSession", auditSessionSchema);

// Start a new audit session
app.post("/api/audit-sessions", async (req, res) => {
  try {
    const auditId = "AUDIT-" + Date.now();
    const session = new AuditSession({ shopId: req.shopId, auditId, status: "active" });
    await session.save();
    res.json({ message: "Audit session started", session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a scan to an active session (called when auditActive)
app.post("/api/audit-sessions/:id/scan", async (req, res) => {
  try {
    const { barcode, scanner } = req.body;
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status !== "active") return res.status(400).json({ error: "Session is not active" });
    session.scans.push({ barcode, timestamp: new Date(), scanner: scanner || "unknown" });
    session.totalScannedItems = session.scans.length;
    await session.save();
    res.json({ message: "Scan recorded", totalScannedItems: session.totalScannedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific scan from an active audit session
app.delete("/api/audit-sessions/:id/scan", async (req, res) => {
  try {
    const { barcode } = req.body;
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (barcode) {
      const idx = session.scans.findIndex(s => s.barcode === barcode);
      if (idx !== -1) session.scans.splice(idx, 1);
    }

    session.totalScannedItems = session.scans.length;
    await session.save();
    res.json({ message: "Scan deleted successfully", totalScannedItems: session.totalScannedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// End / Save an audit session
app.put("/api/audit-sessions/:id/end", async (req, res) => {
  try {
    const { save, name, scans, startTime, endTime } = req.body;
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (startTime) session.startTime = new Date(startTime);
    session.endTime = endTime ? new Date(endTime) : new Date();
    session.status = save ? "saved" : "discarded";
    session.name = name || session.auditId;
    if (scans && Array.isArray(scans)) {
      session.scans = scans.map(scan => ({
        barcode: scan.barcode,
        timestamp: scan.timestamp ? new Date(scan.timestamp) : new Date(),
        scanner: scan.scanner || "1"
      }));
    }
    session.totalScannedItems = session.scans.length;
    await session.save();
    res.json({ message: save ? "Audit saved successfully" : "Audit discarded", session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update scans of a saved or active audit session
app.put("/api/audit-sessions/:id/scans", async (req, res) => {
  try {
    const { scans } = req.body;
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (scans && Array.isArray(scans)) {
      session.scans = scans;
      session.totalScannedItems = session.scans.length;
      await session.save();
    }
    res.json({ message: "Audit session scans updated", session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get currently active audit session
app.get("/api/audit-sessions/active/current", async (req, res) => {
  try {
    const session = await AuditSession.findOne({ shopId: req.shopId, status: "active" }).sort({ startTime: -1 });
    res.json({ session: session || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all saved audit sessions
app.get("/api/audit-sessions", async (req, res) => {
  try {
    const sessions = await AuditSession.find({ shopId: req.shopId, status: "saved" })
      .sort({ startTime: -1 })
      .select("-scans"); // Exclude scan data for list view (performance)
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single audit session with full scan details
app.get("/api/audit-sessions/:id", async (req, res) => {
  try {
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an audit session
app.delete("/api/audit-sessions/:id", async (req, res) => {
  try {
    await AuditSession.findByIdAndDelete(req.params.id);
    res.json({ message: "Audit session deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(API_PORT, () => {
  console.log(`🌐 API Server running on http://localhost:${API_PORT}`);
});


// --- WebSocket Setup ---
const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`🚀 Serial WebSocket Server running on ws://localhost:${WSS_PORT}`);

const clients = new Set();

function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", (ws) => {
  console.log("🔌 Client connected");
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  clients.add(ws);
  
  // Send current active scanners count to newly connected client
  ws.send(JSON.stringify({
    source: "system",
    activeScannersCount: activeScannersCount
  }));

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    clients.delete(ws);
  });
});

// Ping clients every 30s to keep connections alive and prevent idle timeouts
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(interval);
});

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Function to initialize serial ports
async function initSerialPorts() {
  try {
    const ports = await SerialPort.list();
    console.log("🔍 Available ports:", ports.map(p => p.path).join(", ") || "None found");

    ports.forEach((portInfo) => {
      console.log(`🔌 Attempting to open port: ${portInfo.path}`);
      openPort(portInfo.path);
    });
  } catch (err) {
    console.error("❌ Error listing ports:", err);
  }
}

function openPort(path) {
  const port = new SerialPort({
    path: path,
    baudRate: 9600,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r' }));

  port.on("open", () => {
    console.log(`✅ Port Opened: ${path}`);
  });

  port.on("error", (err) => {
    console.error(`❌ Port Error (${path}):`, err.message);
    if (err.message.includes("Permission denied") || err.message.includes("Access denied")) {
      console.warn(`🚫 Skipping retries for ${path} due to permission issues.`);
      return;
    }
    setTimeout(() => {
      if (!port.isOpen) {
        console.log(`🔄 Retrying port ${path}...`);
        port.open((err) => { if (err) console.error(err.message); });
      }
    }, 5000);
  });

  parser.on("data", async (data) => {
    const cleanData = data.toString().trim();
    if (cleanData) {
      try {
        const activeSession = await mongoose.model("AuditSession").findOne({ status: "active" });
        if (!activeSession) {
          console.log(`📡 [${path}] Scanned: ${cleanData} (Ignored - No active audit session)`);
          return;
        }
        console.log(`📡 [${path}] Scanned: ${cleanData}`);
        broadcast({
          source: "serial",
          port: path,
          value: cleanData,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("Error checking active session for serial scan:", err);
      }
    }
  });

  port.on("close", () => {
    console.log(`⚠️ Port Closed: ${path}`);
    setTimeout(() => {
      console.log(`🔄 Re-opening port ${path}...`);
      port.open((err) => { if (err) console.error(err.message); });
    }, 2000);
  });

  port.open((err) => {
    if (err) {
      console.error(`❌ Initial open failed (${path}):`, err.message);
    }
  });
}

initSerialPorts();
