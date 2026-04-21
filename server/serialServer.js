const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket running on ws://localhost:8080");

// Change scanner COM ports here (e.g., COM3/COM4 on Windows or /dev/tty.* on macOS).
const scannerPorts = {
  A: "COM3",
  B: "COM4",
};

const send = (payload) => {
  const packet = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(packet);
    }
  });
};

const attachScanner = (device, portPath) => {
  const port = new SerialPort({ path: portPath, baudRate: 9600 });
  const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  port.on("open", () => {
    console.log(`Scanner ${device} connected on ${portPath}`);
  });

  port.on("error", (err) => {
    console.error(`Scanner ${device} serial error (${portPath}):`, err.message);
  });

  parser.on("data", (value) => {
    const scannedValue = String(value).trim();
    if (!scannedValue) return;

    console.log(`${device}:`, scannedValue);
    send({ device, value: scannedValue, ts: Date.now() });
  });
};

attachScanner("A", scannerPorts.A);
attachScanner("B", scannerPorts.B);

wss.on("connection", () => {
  console.log("Client connected to WebSocket");
});
