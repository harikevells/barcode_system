const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { WebSocketServer } = require("ws");

const WSS_PORT = 8080;
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
      // Skip internal/unlikely ports if necessary, but here we'll try to open everything that looks like a USB serial device
      if (portInfo.vendorId || portInfo.productId) {
        openPort(portInfo.path);
      }
    });
  } catch (err) {
    console.error("❌ Error listing ports:", err);
  }
}

function openPort(path) {
  const port = new SerialPort({
    path: path,
    baudRate: 9600, // Standard for most scanners
    autoOpen: false,
  });

  // Handle both \r\n and \r or \n as delimiters
  const parser = port.pipe(new ReadlineParser({ delimiter: /\r?\n|\r/ }));

  port.on("open", () => {
    console.log(`✅ Port Opened: ${path}`);
  });

  port.on("error", (err) => {
    console.error(`❌ Port Error (${path}):`, err.message);
    // Retry logic
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

  // Explicitly log raw data for debugging
  port.on("data", (data) => {
    console.log(`📦 RAW [${path}]: ${data.toString()}`);
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

// Periodically check for new ports
setInterval(async () => {
  const ports = await SerialPort.list();
  // Only try to open ports that aren't already managed could be added here
  // For simplicity, we just list them or let the initial setup handle it
}, 10000);
