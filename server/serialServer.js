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

// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json());

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
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
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
