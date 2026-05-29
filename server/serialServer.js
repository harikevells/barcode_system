const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { WebSocketServer } = require("ws");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const WSS_PORT = 8080;
const API_PORT = 5000;

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

// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json());

let activeShelfData = null;

// Start new shelf
app.post("/api/shelf/start", async (req, res) => {
  const { shelfCode } = req.body;
  activeShelfData = { shelfCode, products: [] };
  console.log(`🆕 Started Shelf: ${shelfCode}`);
  res.json({ message: "Shelf started", shelfCode });
});

// Resume existing shelf
app.post("/api/shelf/resume", async (req, res) => {
  const { shelfCode } = req.body;
  try {
    const existing = await Shelf.findOne({ shelfCode }).sort({ createdAt: -1 });
    if (!existing) return res.status(404).json({ error: "Shelf not found" });
    
    activeShelfData = { 
      shelfCode: existing.shelfCode, 
      products: existing.products 
    };
    console.log(`🔄 Resumed Shelf: ${shelfCode}`);
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add scanned product
app.post("/api/scan", async (req, res) => {
  const { barcode } = req.body;
  if (!activeShelfData) {
    return res.status(400).json({ error: "No active shelf. Scan a shelf first." });
  }

  const product = { barcode, type: "scan", timestamp: new Date() };
  activeShelfData.products.push(product);
  
  // Persistence: We can save to DB on every scan to ensure no data loss
  // Or save when a new shelf starts. Requirement says "Save previous shelf data to MongoDB"
  // but also "Ensure no data loss during continuous scanning". 
  // I'll update the DB entry for the current shelf.
  
  try {
    await Shelf.findOneAndUpdate(
      { shelfCode: activeShelfData.shelfCode, createdAt: { $gte: new Date().setHours(0,0,0,0) } }, // Simple check for today's shelf or just the latest one
      { $push: { products: product } },
      { upsert: true, new: true }
    );
    res.json({ message: "Product added", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add manual product
app.post("/api/manual", async (req, res) => {
  const { barcode } = req.body;
  if (!activeShelfData) {
    return res.status(400).json({ error: "No active shelf. Scan a shelf first." });
  }

  const product = { barcode, type: "manual", timestamp: new Date() };
  activeShelfData.products.push(product);

  try {
    await Shelf.findOneAndUpdate(
      { shelfCode: activeShelfData.shelfCode },
      { $push: { products: product } },
      { upsert: true, new: true }
    );
    res.json({ message: "Manual product added", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function readBCScans() {
  const dbPath = path.join(__dirname, "..", "BC", "barcode_scans.db");

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });

    db.all("SELECT id, scanner_id, barcode, timestamp FROM scans ORDER BY id ASC", (err, rows) => {
      db.close((closeErr) => {
        if (err) return reject(err);
        if (closeErr) return reject(closeErr);
        resolve(rows || []);
      });
    });
  });
}

app.post("/api/sync-bc-db", async (req, res) => {
  try {
    const rows = await readBCScans();

    let synced = 0;
    for (const row of rows) {
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
    }

    res.json({ message: "BC database synced to MongoDB", count: synced });
  } catch (err) {
    console.error("❌ BC sync failed:", err);
    res.status(500).json({ error: err.message });
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
    // Optionally clear DB or just active session
    // activeShelfData = null;
    await Shelf.deleteMany({});
    res.json({ message: "Database cleared" });
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
