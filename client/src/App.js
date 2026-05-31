import { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:5001/api";

// --- DASHBOARD COMPONENT ---
function Dashboard() {
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);
  const [lastInputSource, setLastInputSource] = useState("Waiting for scans...");
  const [scannerAStatus, setScannerAStatus] = useState("Ready");
  const [scannerBStatus, setScannerBStatus] = useState("Ready");
  
  const [manualA, setManualA] = useState("");
  const [manualB, setManualB] = useState("");

  const lastProcessedCode = useRef({ code: "", ts: 0 });
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("Disconnected");
  const hidBuffer = useRef("");
  const hidTimer = useRef(null);

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
  }, []);

  const handleManualAdd = async (column) => {
    const barcode = column === "A" ? manualA : manualB;
    if (!barcode) return;

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

  const handleClear = async () => {
    if (window.confirm("WARNING: This will delete ALL data from the database. Proceed?")) {
      try {
        await fetch(`${API_BASE_URL}/clear`, { method: "DELETE" });
        setAData([]);
        setBData([]);
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
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/products" style={{ textDecoration: "none", background: "#ff9800", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>📋 Products</Link>
          <Link to="/audit" style={{ textDecoration: "none", background: "#2e7d32", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>📦 Inventory Audit</Link>
          <Link to="/history" style={{ textDecoration: "none", background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>📜 View History</Link>
        </div>
      </div>

      {/* Status Banner */}
      <div style={{ marginBottom: 20, padding: "12px 18px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <span style={{ background: wsStatus === "Connected" ? "#e8f5e9" : "#ffebee", color: wsStatus === "Connected" ? "#2e7d32" : "#c62828", borderRadius: 5, padding: "2px 10px", fontSize: 13, fontWeight: 600 }}>Serial Server: {wsStatus}</span>
        <div style={{ color: "#ccc" }}>|</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={scannerAStatus} /><span style={{ fontWeight: 600, color: "#1565c0" }}>Scanner A</span></div>
        <div style={{ color: "#ccc" }}>|</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={scannerBStatus} /><span style={{ fontWeight: 600, color: "#6a1b9a" }}>Scanner B</span></div>
        <span style={{ color: "#888", marginLeft: "auto", fontSize: 13 }}>{lastInputSource}</span>
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
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchHistory = async () => {
    try {
      const historyResponse = await fetch(`${API_BASE_URL}/history`);
      const historyJson = await historyResponse.json();
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
    </div>
  );
}

// --- PRODUCT MANAGEMENT COMPONENT ---
function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    barcode: "",
    productName: "",
    mrp: "",
    physicalQuantity: ""
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching products:", err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.barcode.trim() || !formData.productName.trim()) {
      alert("Barcode and Product Name are required");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: formData.barcode,
          productName: formData.productName,
          mrp: parseInt(formData.mrp) || 0,
          physicalQuantity: parseInt(formData.physicalQuantity) || 0
        })
      });

      if (response.ok) {
        alert("Product saved successfully");
        setFormData({ barcode: "", productName: "", mrp: "", physicalQuantity: "" });
        setFormVisible(false);
        await fetchProducts();
      } else {
        alert("Failed to save product");
      }
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Error saving product");
    }
  };

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#f0f2f5", fontFamily: "Segoe UI, Tahoma, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#1a1a2e", fontWeight: 700 }}>📋 Product Master Data</h1>
        <Link to="/" style={{ textDecoration: "none", background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>⬅️ Back to Dashboard</Link>
      </div>

      {!formVisible && (
        <button
          onClick={() => setFormVisible(true)}
          style={{ marginBottom: 20, padding: "10px 16px", borderRadius: 6, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          ➕ Add New Product
        </button>
      )}

      {formVisible && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20, maxWidth: 600 }}>
          <h2 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>Add/Update Product</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Barcode *</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Enter barcode"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Product Name *</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="Enter product name"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>MRP</label>
                <input
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  placeholder="0"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Physical Quantity</label>
                <input
                  type="number"
                  value={formData.physicalQuantity}
                  onChange={(e) => setFormData({ ...formData, physicalQuantity: e.target.value })}
                  placeholder="0"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                style={{ flex: 1, padding: "10px", borderRadius: 5, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                💾 Save Product
              </button>
              <button
                type="button"
                onClick={() => setFormVisible(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 5, background: "#ccc", color: "#333", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>All Products</h2>
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p style={{ color: "#bbb" }}>No products added yet</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 700 }}>Barcode</th>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 700 }}>Product Name</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>MRP</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>Physical Qty</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontFamily: "monospace", fontWeight: 600 }}>{product.barcode}</td>
                  <td style={{ padding: 12 }}>{product.productName}</td>
                  <td style={{ textAlign: "center", padding: 12 }}>₹{product.mrp}</td>
                  <td style={{ textAlign: "center", padding: 12, fontWeight: 600 }}>{product.physicalQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- AUDIT SCANNING COMPONENT ---
function AuditScanning() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [scanCount, setScanCount] = useState({});
  const [totalScans, setTotalScans] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const inputRef = useRef(null);

  const startAudit = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/audit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName })
      });
      const data = await response.json();
      setSessionId(data.session._id);
      setSessionActive(true);
      setScanCount({});
      setTotalScans(0);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Error starting audit:", err);
      alert("Failed to start audit session");
    }
  };

  const handleScan = async () => {
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    try {
      const response = await fetch(`${API_BASE_URL}/audit/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, barcode })
      });
      const data = await response.json();

      // Update local state
      setScanCount((prev) => ({
        ...prev,
        [barcode]: (prev[barcode] || 0) + 1
      }));
      setTotalScans(totalScans + 1);
      setBarcodeInput("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Error recording scan:", err);
    }
  };

  const completeAudit = async () => {
    try {
      await fetch(`${API_BASE_URL}/audit/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      navigate("/reconciliation", { state: { sessionId } });
    } catch (err) {
      console.error("Error completing audit:", err);
      alert("Failed to complete audit");
    }
  };

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#f0f2f5", fontFamily: "Segoe UI, Tahoma, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#1a1a2e", fontWeight: 700 }}>📦 Inventory Audit - Barcode Scanning</h1>
        <Link to="/" style={{ textDecoration: "none", background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>⬅️ Back to Dashboard</Link>
      </div>

      {!sessionActive ? (
        <div style={{ background: "#fff", padding: 30, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", maxWidth: 500, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 20px", color: "#1a1a2e" }}>Start New Audit Session</h2>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#333" }}>Session Name</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Weekly Audit - May 30"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={startAudit}
            style={{ width: "100%", padding: "12px", borderRadius: 5, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 16 }}
          >
            🚀 Start Audit Session
          </button>
        </div>
      ) : (
        <div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <div>
                <h2 style={{ margin: 0, color: "#1a1a2e", fontSize: 18 }}>Active Audit Session</h2>
                <p style={{ margin: "6px 0 0", color: "#666", fontSize: 13 }}>{sessionName}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#2e7d32" }}>{totalScans}</div>
                <div style={{ fontSize: 13, color: "#666" }}>Total Scans</div>
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Scan barcode here..."
                autoFocus
                style={{ width: "100%", padding: "12px", borderRadius: 5, border: "2px solid #1565c0", fontSize: 16, boxSizing: "border-box" }}
              />
            </div>

            <button
              onClick={handleScan}
              style={{ width: "100%", padding: "10px", borderRadius: 5, background: "#1565c0", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, marginBottom: 20 }}
            >
              Record Scan
            </button>

            <hr style={{ border: "none", borderTop: "1px solid #eee", marginBottom: 20 }} />

            <h3 style={{ margin: "0 0 12px", color: "#1a1a2e", fontSize: 16 }}>Scanned Barcodes</h3>
            <div style={{maxHeight: 300, overflowY: "auto" }}>
              {Object.keys(scanCount).length === 0 ? (
                <p style={{ color: "#bbb", fontStyle: "italic" }}>No scans yet</p>
              ) : (
                Object.entries(scanCount).map(([barcode, count]) => (
                  <div key={barcode} style={{ padding: "10px", background: "#f5f9ff", borderRadius: 5, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{barcode}</span>
                    <span style={{ background: "#1565c0", color: "#fff", padding: "2px 8px", borderRadius: 3, fontWeight: 700, fontSize: 12 }}>×{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={completeAudit}
            style={{ width: "100%", padding: "12px", borderRadius: 5, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 16 }}
          >
            ✅ Complete Audit & View Report
          </button>
        </div>
      )}
    </div>
  );
}

// --- RECONCILIATION REPORT COMPONENT ---
function ReconciliationReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = location.state?.sessionId;
    if (!sessionId) {
      alert("No audit session selected");
      navigate("/audit");
      return;
    }

    const fetchReport = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/reconciliation/report/${sessionId}`);
        const data = await response.json();
        setReportData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching report:", err);
        setLoading(false);
      }
    };

    fetchReport();
  }, [location.state, navigate]);

  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading report...</div>;
  if (!reportData) return <div style={{ padding: 24, textAlign: "center" }}>No data available</div>;

  const { data, summary, sessionName, createdAt } = reportData;

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#f0f2f5", fontFamily: "Segoe UI, Tahoma, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, color: "#1a1a2e", fontWeight: 700 }}>📊 Inventory Reconciliation Report</h1>
          <p style={{ margin: "6px 0 0", color: "#666" }}>{sessionName} • {new Date(createdAt).toLocaleString()}</p>
        </div>
        <Link to="/audit" style={{ textDecoration: "none", background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 6, fontWeight: 600 }}>⬅️ New Audit</Link>
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 12, fontWeight: 700 }}>Barcode</th>
              <th style={{ textAlign: "left", padding: 12, fontWeight: 700 }}>Product Name</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>Phy Qty</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>MRP</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>Physical Amt</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>Sys Qty</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>System Amt</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700, color: data.some(d => d.diff !== 0) ? "#c62828" : "#2e7d32" }}>Diff</th>
              <th style={{ textAlign: "center", padding: 12, fontWeight: 700, color: data.some(d => d.diffAmt !== 0) ? "#c62828" : "#2e7d32" }}>Diff Amt</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const diffColor = item.diff === 0 ? "#2e7d32" : "#c62828";
              return (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontFamily: "monospace", fontWeight: 600 }}>{item.barcode}</td>
                  <td style={{ padding: 12 }}>{item.productName}</td>
                  <td style={{ textAlign: "center", padding: 12, fontWeight: 600 }}>{item.phyQty}</td>
                  <td style={{ textAlign: "center", padding: 12 }}>₹{item.mrp}</td>
                  <td style={{ textAlign: "center", padding: 12 }}>₹{item.phyAmt.toLocaleString()}</td>
                  <td style={{ textAlign: "center", padding: 12, fontWeight: 600 }}>{item.sysQty}</td>
                  <td style={{ textAlign: "center", padding: 12 }}>₹{item.sysAmt.toLocaleString()}</td>
                  <td style={{ textAlign: "center", padding: 12, fontWeight: 700, color: diffColor }}>{item.diff}</td>
                  <td style={{ textAlign: "center", padding: 12, fontWeight: 700, color: diffColor }}>₹{item.diffAmt.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f8f9fa", borderTop: "2px solid #ddd", fontWeight: 700 }}>
              <td colSpan="2" style={{ padding: 12 }}>TOTAL</td>
              <td style={{ textAlign: "center", padding: 12 }}>{summary.totalPhyQty}</td>
              <td style={{ textAlign: "center", padding: 12 }}>-</td>
              <td style={{ textAlign: "center", padding: 12 }}>₹{summary.totalPhyAmt.toLocaleString()}</td>
              <td style={{ textAlign: "center", padding: 12 }}>{summary.totalSysQty}</td>
              <td style={{ textAlign: "center", padding: 12 }}>₹{summary.totalSysAmt.toLocaleString()}</td>
              <td style={{ textAlign: "center", padding: 12, color: summary.totalDiffQty === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffQty}</td>
              <td style={{ textAlign: "center", padding: 12, color: summary.totalDiffAmt === 0 ? "#2e7d32" : "#c62828" }}>₹{summary.totalDiffAmt.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginTop: 20 }}>
        <h2 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div style={{ background: "#f5f9ff", padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Physical Qty</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1565c0" }}>{summary.totalPhyQty}</div>
          </div>
          <div style={{ background: "#f5f9ff", padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Physical Amount</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1565c0" }}>₹{summary.totalPhyAmt.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fdf5ff", padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total System Qty</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#6a1b9a" }}>{summary.totalSysQty}</div>
          </div>
          <div style={{ background: "#fdf5ff", padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total System Amount</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#6a1b9a" }}>₹{summary.totalSysAmt.toLocaleString()}</div>
          </div>
          <div style={{ background: summary.totalDiffQty === 0 ? "#e8f5e9" : "#ffebee", padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Diff Qty</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalDiffQty === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffQty}</div>
          </div>
          <div style={{ background: summary.totalDiffAmt === 0 ? "#e8f5e9" : "#ffebee", padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Diff Amount</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalDiffAmt === 0 ? "#2e7d32" : "#c62828" }}>₹{summary.totalDiffAmt.toLocaleString()}</div>
          </div>
        </div>
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
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/audit" element={<AuditScanning />} />
        <Route path="/reconciliation" element={<ReconciliationReport />} />
      </Routes>
    </Router>
  );
}

export default App;
