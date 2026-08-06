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
  if (lastScan && (now - lastScan) < 500) {
    return true; // Ignore if scanned within 500ms (hardware bounce)
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
  .then(() => console.log("📦 Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const shelfSchema = new mongoose.Schema({
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
  rowId: { type: Number, unique: true, index: true },
  scannerId: Number,
  barcode: String,
  timestamp: Date,
  syncedAt: { type: Date, default: Date.now },
  source: { type: String, default: "BC" }
}, { timestamps: true });

const BCScan = mongoose.model("BCScan", bcScanSchema);

// --- Product Master Schema ---
const productSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true, index: true },
  productName: String,
  mrp: { type: Number, default: 0 },
  physicalQuantity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model("Product", productSchema);

// --- Activity Log Schema ---
const activityLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true },
  productName: { type: String, default: "N/A" },
  barcode: { type: String, default: "" },
  previousValue: { type: String, default: "N/A" },
  updatedValue: { type: String, default: "N/A" },
  details: { type: String, default: "" },
  actionType: { type: String, required: true } // "Product Import", "Sales Import", "Manual Update", "Deletion"
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

// Helper function to log actions
async function logActivity(action, productName, previousValue, updatedValue, actionType, barcode = "", details = "") {
  try {
    const log = new ActivityLog({
      action,
      productName: productName || "N/A",
      barcode: barcode || "",
      previousValue: previousValue !== undefined && previousValue !== null ? String(previousValue) : "N/A",
      updatedValue: updatedValue !== undefined && updatedValue !== null ? String(updatedValue) : "N/A",
      details: details || (previousValue !== undefined && previousValue !== null && updatedValue !== undefined && updatedValue !== null ? `Qty: ${previousValue} → ${updatedValue}` : ""),
      actionType
    });
    await log.save();
  } catch (err) {
    console.error("❌ Failed to log activity:", err);
  }
}


// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json());

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

  if (isDuplicateScan(barcode)) {
    return res.status(200).json({ message: "Ignored duplicate scan" });
  }

  try {
    // Store scan in BCScan collection
    const bcScan = new BCScan({
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

// Endpoint for Python Raspberry Pi script
app.post("/api/barcode", async (req, res) => {
  // Python script might send {"barcode": "...", "scanner": "..."}
  const barcode = req.body.barcode || req.body.data || Object.keys(req.body)[0];
  const scannerId = req.body.scanner || req.body.scannerId || "Pi";

  if (isDuplicateScan(barcode)) {
    return res.status(200).json({ message: "Ignored duplicate scan" });
  }

  try {
    // 1. Save to MongoDB so it shows up in Rack History!
    const bcScan = new BCScan({
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
    const history = await BCScan.find().sort({ timestamp: -1, createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all data
app.get("/api/shelves", async (req, res) => {
  try {
    const shelves = await Shelf.find().sort({ createdAt: -1 });
    res.json(shelves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear DB or Session
app.delete("/api/clear", async (req, res) => {
  try {
    // 1. Clear MongoDB Collections
    await Shelf.deleteMany({});
    await BCScan.deleteMany({});

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

// ========== INVENTORY RECONCILIATION ENDPOINTS ==========

// Create or update a product
app.post("/api/products", async (req, res) => {
  try {
    const { barcode, productName, mrp, physicalQuantity } = req.body;
    
    // Find existing product to log details
    const existingProduct = await Product.findOne({ barcode });
    const isNew = !existingProduct;
    const previousQty = existingProduct ? existingProduct.physicalQuantity : "N/A";
    
    const product = await Product.findOneAndUpdate(
      { barcode },
      {
        barcode,
        productName,
        mrp,
        physicalQuantity,
        updatedAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    // Log the manual update/creation
    const action = isNew ? "PRODUCT_CREATE" : "PRODUCT_UPDATE";
    await logActivity(action, productName, previousQty, physicalQuantity, "Manual Update", barcode);
    
    res.json({ message: "Product saved", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product by barcode
app.get("/api/products/:barcode", async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
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
    await logActivity("PRODUCT_DELETE", product.productName, product.physicalQuantity, "Deleted", "Deletion", product.barcode);
    
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all activity logs
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
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

    let processedCount = 0;
    for (const item of products) {
      const { barcode, productName, mrp, physicalQuantity } = item;
      if (!productName) continue; // Skip rows without product name

      // Search by barcode if available, else search by product name
      let product = null;
      if (barcode) {
        product = await Product.findOne({ barcode });
      } else {
        product = await Product.findOne({ productName });
      }

      const finalBarcode = barcode || product?.barcode || "GEN_" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const finalMRP = mrp !== undefined ? mrp : (product?.mrp || 0);
      const finalQty = physicalQuantity !== undefined ? physicalQuantity : 0;

      if (product) {
        const previousQty = product.physicalQuantity;
        // Update product
        product.productName = productName;
        product.mrp = finalMRP;
        product.physicalQuantity = finalQty;
        product.updatedAt = new Date();
        await product.save();

        await logActivity(
          "PRODUCT_IMPORT_UPDATE",
          productName,
          previousQty,
          finalQty,
          "Product Import",
          finalBarcode
        );
      } else {
        // Create product
        const newProduct = new Product({
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
          finalBarcode
        );
      }
      processedCount++;
    }

    res.json({ message: `Successfully imported/updated ${processedCount} products.`, count: processedCount });
  } catch (err) {
    console.error("Error in bulk product import:", err);
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

    let processedCount = 0;
    const warnings = [];

    for (const item of sales) {
      const { barcode, productName, quantity } = item;
      const soldQty = parseInt(quantity) || 0;
      if (soldQty <= 0) continue; // Skip invalid quantities

      let product = null;
      if (barcode) {
        product = await Product.findOne({ barcode });
      }
      if (!product && productName) {
        product = await Product.findOne({ productName });
      }

      if (product) {
        const previousQty = product.physicalQuantity || 0;
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
          `Sold: ${soldQty} units`
        );
        processedCount++;
      } else {
        const identifier = barcode || productName || "Unknown Product";
        warnings.push(`Product '${identifier}' not found in master data.`);
      }
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

// Get total scans for all barcodes
app.get("/api/audit/totals", async (req, res) => {
  try {
    const totals = await BCScan.aggregate([
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
    // 1. Get totals from BCScan
    const totals = await BCScan.aggregate([
      { $group: { _id: "$barcode", count: { $sum: 1 } } }
    ]);
    const scanCountMap = {};
    totals.forEach(t => {
      scanCountMap[t._id] = t.count;
    });

    // 2. Build reconciliation data by iterating over all Products
    const reconciliationData = [];
    let totalPhyQty = 0;
    let totalPhyAmt = 0;
    let totalSysQty = 0;
    let totalSysAmt = 0;
    let totalDiffQty = 0;
    let totalDiffAmt = 0;
    
    const products = await Product.find({});
    
    for (const product of products) {
      const phyQty = product.physicalQuantity || 0;
      const sysQty = scanCountMap[product.barcode] || 0;
      const mrp = product.mrp || 0;
      
      const phyAmt = phyQty * mrp;
      const sysAmt = sysQty * mrp;
      const diff = sysQty - phyQty;
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
    for (const [barcode, sysQty] of Object.entries(scanCountMap)) {
      if (!knownBarcodes.has(barcode)) {
        reconciliationData.push({
          barcode: barcode,
          productName: "Unknown Product",
          phyQty: 0,
          mrp: 0,
          phyAmt: 0,
          sysQty,
          sysAmt: 0,
          diff: sysQty,
          diffAmt: 0
        });
        totalSysQty += sysQty;
        totalDiffQty += sysQty;
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
  auditId: { type: String, required: true, unique: true },
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
    const session = new AuditSession({ auditId, status: "active" });
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

// End / Save an audit session
app.put("/api/audit-sessions/:id/end", async (req, res) => {
  try {
    const { save, name } = req.body;
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    session.endTime = new Date();
    session.status = save ? "saved" : "discarded";
    session.name = name || session.auditId;
    session.totalScannedItems = session.scans.length;
    await session.save();
    res.json({ message: save ? "Audit saved successfully" : "Audit discarded", session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all saved audit sessions
app.get("/api/audit-sessions", async (req, res) => {
  try {
    const sessions = await AuditSession.find({ status: "saved" })
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

wss.on("connection", (ws) => {
  console.log("🔌 Client connected");
  clients.add(ws);
  ws.on("close", () => {
    console.log("❌ Client disconnected");
    clients.delete(ws);
  });
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
    setTimeout(() => {
      if (!port.isOpen) {
        console.log(`🔄 Retrying port ${path}...`);
        port.open((err) => { if (err) console.error(err.message); });
      }
    }, 5000);
  });

  parser.on("data", (data) => {
    const cleanData = data.toString().trim();
    if (cleanData) {
      console.log(`📡 [${path}] Scanned: ${cleanData}`);
      broadcast({
        source: "serial",
        port: path,
        value: cleanData,
        timestamp: Date.now()
      });
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
