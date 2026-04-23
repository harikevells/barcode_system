import { useEffect, useRef, useState } from "react";

function App() {
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);
  const [lastInputSource, setLastInputSource] = useState("Waiting for scans...");
  const [scannerAStatus, setScannerAStatus] = useState("Ready");
  const [scannerBStatus, setScannerBStatus] = useState("Ready");

  const lastProcessedCode = useRef({ code: "", ts: 0 });
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("Disconnected");
  const [hidDetection, setHidDetection] = useState(null);
  const hidBuffer = useRef("");
  const hidTimer = useRef(null);

  useEffect(() => {
    const processScan = (scannedValue, source = "Serial") => {
      const code = scannedValue.trim();
      if (!code) return;

      // De-duplication: Ignore if exactly the same code was scanned in the last 300ms
      const nowTs = Date.now();
      if (lastProcessedCode.current.code === code && nowTs - lastProcessedCode.current.ts < 300) {
        console.log(`Ignoring duplicate scan: ${code} from ${source}`);
        return;
      }
      lastProcessedCode.current = { code, ts: nowTs };

      const timeStr = new Date().toLocaleTimeString();

      // Route by prefix: A%% → Column A, B%% → Column B
      if (code.toUpperCase().startsWith("A")) {
        setAData((prev) => [...prev, { value: code, ts: nowTs }]);
        setLastInputSource(`Scanner A → Column A (${source} @ ${timeStr})`);
        setScannerAStatus("Active");
      } else if (code.toUpperCase().startsWith("B")) {
        setBData((prev) => [...prev, { value: code, ts: nowTs }]);
        setLastInputSource(`Scanner B → Column B (${source} @ ${timeStr})`);
        setScannerBStatus("Active");
      } else {
        setLastInputSource(`⚠️ Unknown prefix from ${source}: ${code}`);
      }
    };

    const connectWS = () => {
      const ws = new WebSocket("ws://127.0.0.1:8080");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to Serial Server");
        setWsStatus("Connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.source === "serial") {
            processScan(data.value, `Serial:${data.port.split('\\').pop()}`);
          }
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
      };

      ws.onclose = () => {
        console.log("Disconnected from Serial Server. Retrying...");
        setWsStatus("Disconnected");
        setTimeout(connectWS, 2000);
      };
    };

    const handleKeydownDetection = (e) => {
      if (e.key.length === 1) {
        hidBuffer.current += e.key;
        if (hidTimer.current) clearTimeout(hidTimer.current);
        hidTimer.current = setTimeout(() => {
          if (hidBuffer.current.length > 3) {
            setHidDetection(`Detected HID scan: ${hidBuffer.current} (Ignored)`);
          }
          hidBuffer.current = "";
        }, 100);
      }
    };

    connectWS();
    window.addEventListener("keydown", handleKeydownDetection);

    return () => {
      window.removeEventListener("keydown", handleKeydownDetection);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleClear = () => {
    setAData([]);
    setBData([]);
    setLastInputSource("Waiting for scans...");
  };

  const StatusDot = ({ status }) => (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: status === "Active" ? "#2e7d32" : "#ff9800",
        marginRight: 6,
        verticalAlign: "middle",
        boxShadow: status === "Active" ? "0 0 6px #2e7d32" : "0 0 4px #ff9800",
      }}
    />
  );

  const panelStyle = {
    flex: 1,
    minWidth: 300,
    border: "1px solid #d9d9d9",
    borderRadius: 10,
    padding: 18,
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  };

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        background: "#f0f2f5",
        fontFamily: "Segoe UI, Tahoma, sans-serif",
      }}
    >
      <h1 style={{ marginTop: 0, color: "#1a1a2e", fontWeight: 700 }}>
        📡 Barcode Scanner Dashboard
      </h1>

      {/* Status Banner */}
      <div
        style={{
          marginBottom: 20,
          padding: "12px 18px",
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
          <span
            style={{
              background: wsStatus === "Connected" ? "#e8f5e9" : "#ffebee",
              color: wsStatus === "Connected" ? "#2e7d32" : "#c62828",
              borderRadius: 5,
              padding: "2px 10px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Serial Server: {wsStatus}
          </span>
        <div style={{ color: "#ccc" }}>|</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusDot status={scannerAStatus} />
          <span style={{ fontWeight: 600, color: "#1565c0" }}>Scanner A</span>
          <span
            style={{
              background: scannerAStatus === "Active" ? "#e8f5e9" : "#fff3e0",
              color: scannerAStatus === "Active" ? "#2e7d32" : "#e65100",
              borderRadius: 5,
              padding: "2px 10px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {scannerAStatus === "Active" ? "Active" : "Ready"}
          </span>
        </div>

        <div style={{ color: "#ccc" }}>|</div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusDot status={scannerBStatus} />
          <span style={{ fontWeight: 600, color: "#6a1b9a" }}>Scanner B</span>
          <span
            style={{
              background: scannerBStatus === "Active" ? "#e8f5e9" : "#fff3e0",
              color: scannerBStatus === "Active" ? "#2e7d32" : "#e65100",
              borderRadius: 5,
              padding: "2px 10px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {scannerBStatus === "Active" ? "Active" : "Ready"}
          </span>
        </div>

        <span style={{ color: "#888", marginLeft: "auto", fontSize: 13 }}>
          {lastInputSource}
        </span>

        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: "5px 14px",
            borderRadius: 6,
            border: "1px solid #c62828",
            background: "#fff",
            color: "#c62828",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Clear All
        </button>
      </div>

      {/* Info Banner */}
      <div
        style={{
          marginBottom: 20,
          padding: "10px 18px",
          background: "#fffde7",
          border: "1px solid #fff59d",
          borderRadius: 10,
          fontSize: 13,
          color: "#f57f17",
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span>
          🔒 <strong>Serial Mode Only:</strong> Keyboard/HID input is disabled. Ensure your scanner is in COM/Serial mode.
        </span>
        {hidDetection && (
          <span style={{ color: "#d32f2f", background: "#ffebee", padding: "2px 8px", borderRadius: 4, animation: "pulse 1s infinite" }}>
            ⚠️ {hidDetection}
          </span>
        )}
      </div>

      {/* Scan Columns */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 14px", color: "#1565c0", fontSize: 18 }}>
            Column A{" "}
            <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>
              ({aData.length} scan{aData.length !== 1 ? "s" : ""})
            </span>
            <span
              style={{
                float: "right",
                fontSize: 12,
                fontWeight: 500,
                color: scannerAStatus === "Active" ? "#2e7d32" : "#bbb",
              }}
            >
              {scannerAStatus === "Active" ? "🟢" : "🟡"} Scanner A
            </span>
          </h2>
          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", marginBottom: 12 }} />
          {aData.length === 0 ? (
            <p style={{ color: "#bbb", fontStyle: "italic" }}>No scans yet.</p>
          ) : (
            aData.map((d, i) => (
              <div
                key={`a-${i}`}
                style={{
                  margin: "4px 0",
                  padding: "6px 10px",
                  background: "#f5f9ff",
                  borderRadius: 5,
                  fontFamily: "monospace",
                  fontSize: 14,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong style={{ color: "#999", marginRight: 8 }}>{i + 1}.</strong>
                  {d.value}
                </span>
                <span style={{ fontSize: 11, color: "#bbb" }}>
                  {new Date(d.ts).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 14px", color: "#6a1b9a", fontSize: 18 }}>
            Column B{" "}
            <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>
              ({bData.length} scan{bData.length !== 1 ? "s" : ""})
            </span>
            <span
              style={{
                float: "right",
                fontSize: 12,
                fontWeight: 500,
                color: scannerBStatus === "Active" ? "#2e7d32" : "#bbb",
              }}
            >
              {scannerBStatus === "Active" ? "🟢" : "🟡"} Scanner B
            </span>
          </h2>
          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", marginBottom: 12 }} />
          {bData.length === 0 ? (
            <p style={{ color: "#bbb", fontStyle: "italic" }}>No scans yet.</p>
          ) : (
            bData.map((d, i) => (
              <div
                key={`b-${i}`}
                style={{
                  margin: "4px 0",
                  padding: "6px 10px",
                  background: "#fdf5ff",
                  borderRadius: 5,
                  fontFamily: "monospace",
                  fontSize: 14,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong style={{ color: "#999", marginRight: 8 }}>{i + 1}.</strong>
                  {d.value}
                </span>
                <span style={{ fontSize: 11, color: "#bbb" }}>
                  {new Date(d.ts).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
