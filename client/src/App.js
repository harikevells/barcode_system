import { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:5000/api";

// --- DASHBOARD COMPONENT ---
function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);
  const [lastInputSource, setLastInputSource] = useState("Waiting for scans...");
  const [scannerAStatus, setScannerAStatus] = useState("Ready");
  const [scannerBStatus, setScannerBStatus] = useState("Ready");
  
  const [activeShelf, setActiveShelf] = useState(null);
  const [manualA, setManualA] = useState("");
  const [manualB, setManualB] = useState("");

  const lastProcessedCode = useRef({ code: "", ts: 0 });
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("Disconnected");
  const hidBuffer = useRef("");
  const hidTimer = useRef(null);

  // Handle Resuming Rack from History
  useEffect(() => {
    if (location.state && location.state.resumeRack) {
      const rack = location.state.resumeRack;
      setActiveShelf(rack.shelfCode);
      
      // Sort products into columns
      const a = [];
      const b = [];
      rack.products.forEach(p => {
        if (p.barcode.toUpperCase().startsWith("A")) a.push({ value: p.barcode, ts: p.timestamp });
        else if (p.barcode.toUpperCase().startsWith("B")) b.push({ value: p.barcode, ts: p.timestamp });
      });
      setAData(a);
      setBData(b);
      setLastInputSource(`🔄 Resumed Rack: ${rack.shelfCode}`);
      
      // Tell backend to set this as active
      fetch(`${API_BASE_URL}/shelf/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelfCode: rack.shelfCode })
      });

      // Clear state so we don't re-run on every render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const processScan = async (scannedValue, source = "Serial") => {
      const code = scannedValue.trim();
      if (!code) return;

      // --- STRICT VALIDATION ---
      if (code.length > 20) {
        console.warn(`Blocked long scan (${code.length} chars): ${code}`);
        setLastInputSource(`⚠️ Blocked: Scan too long (${source})`);
        return;
      }

      const upperCode = code.toUpperCase();
      
      const isShelf = /^[A-Z]{2}/.test(upperCode);

      if (isShelf) {
        try {
          await fetch(`${API_BASE_URL}/shelf/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shelfCode: code })
          });
          setActiveShelf(code);
          setAData([]); 
          setBData([]);
          setLastInputSource(`🆕 Shelf Started: ${code} (${source})`);
          return;
        } catch (err) {
          console.error("Error starting shelf:", err);
        }
      }

      const hasA = upperCode.includes("A");
      const hasB = upperCode.includes("B");
      const aIndex = upperCode.indexOf("A");
      const bIndex = upperCode.indexOf("B");

      if ((hasA && hasB) || (hasA && aIndex > 0) || (hasB && bIndex > 0)) {
        console.error("Concatenated scan detected:", code);
        alert("Overlapping/Concatenated scans detected! Please scan again.");
        setLastInputSource(`⚠️ Blocked: Concatenated scan (${source})`);
        return;
      }

      if (!activeShelf) {
        console.warn("Product scanned but no shelf active:", code);
        setLastInputSource(`⚠️ No Active Shelf! Scan shelf first (${source})`);
        return;
      }

      if (!upperCode.startsWith("A") && !upperCode.startsWith("B")) {
        console.warn("Invalid product scan (no A/B prefix):", code);
        setLastInputSource(`⚠️ Blocked: Missing A/B prefix (${source})`);
        return;
      }

      const nowTs = Date.now();
      if (lastProcessedCode.current.code === code && nowTs - lastProcessedCode.current.ts < 300) {
        return;
      }
      lastProcessedCode.current = { code, ts: nowTs };

      try {
        await fetch(`${API_BASE_URL}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: code })
        });
      } catch (err) {
        console.error("Error saving scan:", err);
      }

      const timeStr = new Date().toLocaleTimeString();

      if (upperCode.startsWith("A")) {
        setAData((prev) => [...prev, { value: code, ts: nowTs }]);
        setLastInputSource(`Scanner A → Column A (${source} @ ${timeStr})`);
        setScannerAStatus("Active");
      } else if (upperCode.startsWith("B")) {
        setBData((prev) => [...prev, { value: code, ts: nowTs }]);
        setLastInputSource(`Scanner B → Column B (${source} @ ${timeStr})`);
        setScannerBStatus("Active");
      }
    };

    const connectWS = () => {
      const ws = new WebSocket("ws://127.0.0.1:8080");
      wsRef.current = ws;
      ws.onopen = () => setWsStatus("Connected");
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
      ws.onclose = () => {
        setWsStatus("Disconnected");
        setTimeout(connectWS, 2000);
      };
    };

    const handleKeydownDetection = (e) => {
      if (e.key === "Enter" && hidBuffer.current.length > 3) {
        if (hidTimer.current) clearTimeout(hidTimer.current);
        const code = hidBuffer.current;
        hidBuffer.current = "";
        processScan(code, "Keyboard/HID");
        return;
      }

      if (e.key.length === 1) {
        if (document.activeElement.tagName === "INPUT") return;
        hidBuffer.current += e.key;
        if (hidTimer.current) clearTimeout(hidTimer.current);
        hidTimer.current = setTimeout(() => {
          if (hidBuffer.current.length > 3) {
            processScan(hidBuffer.current, "Keyboard/HID");
          }
          hidBuffer.current = "";
        }, 50); 
      }
    };

    connectWS();
    window.addEventListener("keydown", handleKeydownDetection);
    return () => {
      window.removeEventListener("keydown", handleKeydownDetection);
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeShelf]);

  const handleManualAdd = async (column) => {
    const barcode = column === "A" ? manualA : manualB;
    if (!barcode) return;
    if (!activeShelf) {
      alert("Please scan a shelf first!");
      return;
    }

    if (!barcode.toUpperCase().startsWith(column)) {
      alert(`Manual entry for Column ${column} must start with "${column}"!`);
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode })
      });
      
      const nowTs = Date.now();
      if (column === "A") {
        setAData((prev) => [...prev, { value: barcode, ts: nowTs }]);
        setManualA("");
      } else {
        setBData((prev) => [...prev, { value: barcode, ts: nowTs }]);
        setManualB("");
      }
      setLastInputSource(`Manual → Column ${column}: ${barcode}`);
    } catch (err) {
      console.error("Error adding manual barcode:", err);
    }
  };

  const handleSaveRack = () => {
    if (!activeShelf) {
      alert("No active shelf to save!");
      return;
    }
    if (window.confirm(`Finalize and Save Rack ${activeShelf}?`)) {
      setActiveShelf(null);
      setAData([]);
      setBData([]);
      setLastInputSource(`Rack ${activeShelf} finalized and saved to database.`);
    }
  };

  const handleClear = async () => {
    if (window.confirm("WARNING: This will delete ALL data from the database. Proceed?")) {
      try {
        await fetch(`${API_BASE_URL}/clear`, { method: "DELETE" });
        setAData([]);
        setBData([]);
        setActiveShelf(null);
        setLastInputSource("Database and UI Cleared.");
      } catch (err) {
        console.error("Error clearing data:", err);
      }
    }
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
    <div style={{ padding: 24, minHeight: "100vh", background: "#f0f2f5", fontFamily: "Segoe UI, Tahoma, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#1a1a2e", fontWeight: 700 }}>📡 Barcode Scanner Dashboard</h1>
        <Link to="/history" style={{ textDecoration: "none", background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>📜 View History</Link>
      </div>

      {/* Status Banner */}
      <div style={{ marginBottom: 20, padding: "12px 18px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <span style={{ background: wsStatus === "Connected" ? "#e8f5e9" : "#ffebee", color: wsStatus === "Connected" ? "#2e7d32" : "#c62828", borderRadius: 5, padding: "2px 10px", fontSize: 13, fontWeight: 600 }}>Serial Server: {wsStatus}</span>
        <div style={{ color: "#ccc" }}>|</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
           <span style={{ fontWeight: 600, color: "#e65100" }}>Active Rack:</span>
           <span style={{ background: activeShelf ? "#fff3e0" : "#f5f5f5", color: activeShelf ? "#e65100" : "#999", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{activeShelf || "None (Scan Rack)"}</span>
        </div>
        <div style={{ color: "#ccc" }}>|</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={scannerAStatus} /><span style={{ fontWeight: 600, color: "#1565c0" }}>Scanner A</span></div>
        <div style={{ color: "#ccc" }}>|</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={scannerBStatus} /><span style={{ fontWeight: 600, color: "#6a1b9a" }}>Scanner B</span></div>
        <span style={{ color: "#888", marginLeft: "auto", fontSize: 13 }}>{lastInputSource}</span>
        
        {activeShelf && (
          <button onClick={handleSaveRack} style={{ padding: "6px 16px", borderRadius: 6, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>💾 SAVE & FINISH</button>
        )}
        <button onClick={handleClear} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #c62828", background: "#fff", color: "#c62828", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>🗑️ CLEAR DB</button>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 14px", color: "#1565c0", fontSize: 18 }}>Column A <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({aData.length} scans)</span></h2>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input type="text" value={manualA} onChange={(e) => setManualA(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualAdd("A")} placeholder="Manual entry for A..." style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid #ddd", fontSize: 13 }} />
            <button onClick={() => handleManualAdd("A")} style={{ padding: "5px 12px", borderRadius: 5, background: "#1565c0", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Add</button>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", marginBottom: 12 }} />
          {aData.length === 0 ? <p style={{ color: "#bbb", fontStyle: "italic" }}>No scans yet.</p> : aData.map((d, i) => (
            <div key={`a-${i}`} style={{ margin: "4px 0", padding: "6px 10px", background: "#f5f9ff", borderRadius: 5, fontFamily: "monospace", fontSize: 14, display: "flex", justifyContent: "space-between" }}>
              <span><strong style={{ color: "#999", marginRight: 8 }}>{i + 1}.</strong>{d.value}</span>
              <span style={{ fontSize: 11, color: "#bbb" }}>{new Date(d.ts).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>

        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 14px", color: "#6a1b9a", fontSize: 18 }}>Column B <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({bData.length} scans)</span></h2>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input type="text" value={manualB} onChange={(e) => setManualB(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualAdd("B")} placeholder="Manual entry for B..." style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid #ddd", fontSize: 13 }} />
            <button onClick={() => handleManualAdd("B")} style={{ padding: "5px 12px", borderRadius: 5, background: "#6a1b9a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Add</button>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", marginBottom: 12 }} />
          {bData.length === 0 ? <p style={{ color: "#bbb", fontStyle: "italic" }}>No scans yet.</p> : bData.map((d, i) => (
            <div key={`b-${i}`} style={{ margin: "4px 0", padding: "6px 10px", background: "#fdf5ff", borderRadius: 5, fontFamily: "monospace", fontSize: 14, display: "flex", justifyContent: "space-between" }}>
              <span><strong style={{ color: "#999", marginRight: 8 }}>{i + 1}.</strong>{d.value}</span>
              <span style={{ fontSize: 11, color: "#bbb" }}>{new Date(d.ts).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- HISTORY COMPONENT ---
function RackHistory() {
  const navigate = useNavigate();
  const [shelves, setShelves] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchHistory = async () => {
    try {
      const [shelvesResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/shelves`),
        fetch(`${API_BASE_URL}/history`)
      ]);

      const shelvesData = await shelvesResponse.json();
      const historyJson = await historyResponse.json();

      setShelves(shelvesData);
      setHistoryData(historyJson);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching history data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSyncBC = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sync-bc-db`, { method: "POST" });
      const result = await response.json();
      alert(result.message || "Sync complete");
      await fetchHistory();
    } catch (err) {
      console.error("Error syncing BC DB:", err);
      alert("Failed to sync BC DB to MongoDB.");
    } finally {
      setSyncing(false);
    }
  };

  const handleResume = (shelf) => {
    navigate("/", { state: { resumeRack: shelf } });
  };

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#f0f2f5", fontFamily: "Segoe UI, Tahoma, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#1a1a2e", fontWeight: 700 }}>📜 Rack History</h1>
        <Link to="/" style={{ textDecoration: "none", background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>⬅️ Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", color: "#1a1a2e", fontSize: 18 }}>Sync & View</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 13 }}>Sync the BC SQLite scans into MongoDB and review the latest data list.</p>
        </div>
        <button
          onClick={handleSyncBC}
          disabled={syncing}
          style={{ background: syncing ? "#90caf9" : "#1565c0", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: syncing ? "not-allowed" : "pointer", fontWeight: 700 }}
        >
          {syncing ? "Syncing..." : "Sync BC DB → MongoDB"}
        </button>
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 10px", color: "#1565c0", fontSize: 18 }}>BC Scan History (MongoDB)</h2>
        {loading ? <p>Loading history...</p> : historyData.length === 0 ? <p>No synced BC scan data found yet.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: 12 }}>Scanner</th>
                <th style={{ textAlign: "left", padding: 12 }}>Barcode</th>
                <th style={{ textAlign: "left", padding: 12 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((item) => (
                <tr key={item._id || `${item.rowId}-${item.timestamp}`} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600, color: "#1565c0" }}>{item.scannerId ?? "BC"}</td>
                  <td style={{ padding: 12, fontFamily: "monospace" }}>{item.barcode}</td>
                  <td style={{ padding: 12 }}>{new Date(item.timestamp || item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 style={{ margin: "0 0 10px", color: "#e65100", fontSize: 18 }}>Rack History</h2>
        {loading ? <p>Loading racks...</p> : shelves.length === 0 ? <p>No racks found in database.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: 12 }}>Rack Code</th>
                <th style={{ textAlign: "left", padding: 12 }}>Scan Date</th>
                <th style={{ textAlign: "left", padding: 12 }}>Total Products</th>
                <th style={{ textAlign: "left", padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shelves.map((shelf) => (
                <tr key={shelf._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 700, color: "#e65100" }}>{shelf.shelfCode}</td>
                  <td style={{ padding: 12 }}>{new Date(shelf.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 12 }}>{shelf.products?.length || 0} items</td>
                  <td style={{ padding: 12 }}>
                    <button onClick={() => handleResume(shelf)} style={{ background: "#1565c0", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Resume / View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- MAIN APP WITH ROUTING ---
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<RackHistory />} />
      </Routes>
    </Router>
  );
}

export default App;
