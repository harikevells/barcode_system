import { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Select from "react-select";
import { BarChartIcon, ClipboardIcon, BoxIcon, ScrollIcon, FileIcon, PlusIcon, DownloadIcon, TrendingDownIcon, UploadIcon, ArrowLeftIcon, SearchIcon, FolderIcon, TrashIcon, LockIcon, EyeIcon, EyeOffIcon } from "./icons";


const API_BASE_URL = "http://localhost:5001/api";

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');
  * {
    font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  body {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
    color: #1e293b;
  }
  input, button, select, table {
    font-family: inherit;
  }
  .card {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.02);
    border: 1px solid #f1f5f9;
    padding: 24px;
    margin-bottom: 24px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    text-decoration: none;
  }
  .btn-primary {
    background: #1565c0;
    color: white;
  }
  .btn-primary:hover {
    background: #0d47a1;
  }
  .btn-secondary {
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
  }
  .btn-secondary:hover {
    background: #f1f5f9;
  }
  .btn-success {
    background: #2e7d32;
    color: white;
  }
  .btn-success:hover {
    background: #1b5e20;
  }
  .btn-danger {
    background: #c62828;
    color: white;
  }
  .btn-danger:hover {
    background: #b71c1c;
  }
  .table-modern {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  .table-modern th {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
    padding: 14px 16px;
    border-bottom: 2px solid #e2e8f0;
    text-align: left;
  }
  .table-modern td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  .table-modern tr:hover td {
    background: #f8fafc;
  }
`;


// --- LOGIN COMPONENT ---
function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const envUser = process.env.REACT_APP_ADMIN_USERNAME || "admin";
    const envPass = process.env.REACT_APP_ADMIN_PASSWORD || "password";

    if (username === envUser && password === envPass) {
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fcf2f6', position: 'relative' }}>
      {/* Top Right Logo */}
      <div style={{ position: 'absolute', top: '40px', right: '50px', zIndex: 10 }}>
        <h2 style={{ fontFamily: "'Righteous', cursive", margin: 0, fontSize: '48px', color: '#1a1a2e', letterSpacing: '1px' }}>
          Multi <span style={{ color: '#00b14f' }}>scanner app</span>
        </h2>
      </div>

      {/* Left Form Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>Let's Get Started</h1>
          <p style={{ color: '#8892b0', fontSize: '14px', marginBottom: '40px' }}>Sign into continue to Application</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8892b0', marginBottom: '8px' }}>User Name</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8892b0', marginBottom: '8px' }}>Pass Word</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', boxSizing: 'border-box', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <label style={{ fontSize: '12px', color: '#8892b0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#0ea5e9' }} /> Remember Me
              </label>
              <a href="#" style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><LockIcon size={14} /> Forgot Password?</a>
            </div>

            <button type="submit" style={{ width: '100%', maxWidth: '200px', padding: '14px', background: '#00b14f', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', margin: '0 auto', display: 'block' }}>
              Sign in
            </button>
          </form>
        </div>
      </div>

      {/* Right Illustration Panel */}
      <div style={{ flex: 1, background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img src="/login-bg.png" alt="Warehouse Illustration" style={{ maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain' }} />
      </div>
    </div>
  );
}


// --- GLOBAL HEADER COMPONENT ---
function Header() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: "Dashboard", path: "/", icon: <BarChartIcon size={18} /> },
    { label: "Products", path: "/products", icon: <ClipboardIcon size={18} /> },
    { label: "Inventory Audit", path: "/audit-history", icon: <BoxIcon size={18} /> }
  ];

  return (
    <header style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#ffffff",
      padding: "16px 32px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
      borderBottom: "1px solid #eaeaea",
      marginBottom: "24px",
      fontFamily: "'Outfit', 'Segoe UI', sans-serif"
    }}>
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2 style={{ fontFamily: "'Righteous', cursive", margin: 0, fontSize: '24px', color: '#1a1a2e', letterSpacing: '0.5px' }}>
          Multi <span style={{ color: '#00b14f' }}>scanner app</span>
        </h2>
      </div>

      {/* Center: Nav Pills */}
      <nav style={{
        display: "flex",
        background: "#f4f6fa",
        padding: "6px",
        borderRadius: "30px",
        gap: "4px",
        border: "1px solid #e2e8f0"
      }}>
        {navItems.map((item) => {
          const isActive = path === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "20px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
                color: isActive ? "#ffffff" : "#64748b",
                background: isActive ? "linear-gradient(135deg, #ec407a 0%, #e91e63 100%)" : "transparent",
                boxShadow: isActive ? "0 4px 12px rgba(233, 30, 99, 0.2)" : "none",
                transition: "all 0.2s ease-in-out"
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          to="/logs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid #cbd5e1",
            background: path === "/logs" ? "#f1f5f9" : "#ffffff",
            color: "#334155",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s ease-in-out",
            boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.borderColor = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            if (path !== "/logs") {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }
          }}
        >
          <span><ClipboardIcon size={16} color="#64748b" /></span>
          <span>Logs</span>
        </Link>

        <button
          onClick={() => {
            localStorage.removeItem('auth');
            window.location.reload();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            background: "#fee2e2",
            color: "#b91c1c",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fee2e2" }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

// --- EXCEL PARSER HELPER ---
const parseExcelFile = async (file, expectedType) => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheets found in the Excel file.");

  const rows = [];
  let headerRow = null;
  let colMap = {};

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowData = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      let val = cell.value;
      if (val && typeof val === 'object' && val.result !== undefined) {
        val = val.result;
      }
      rowData[colNumber] = val;
    });

    if (rowNumber === 1) {
      headerRow = rowData;
      headerRow.forEach((h, index) => {
        if (!h) return;
        const cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanHeader.includes("barcode") || cleanHeader.includes("code")) {
          colMap.barcode = index;
        } else if (cleanHeader.includes("productname") || cleanHeader.includes("name") || cleanHeader.includes("item")) {
          colMap.productName = index;
        } else if (cleanHeader.includes("mrp") || cleanHeader.includes("price") || cleanHeader.includes("rate")) {
          colMap.mrp = index;
        } else if (cleanHeader.includes("qty") || cleanHeader.includes("quantity") || cleanHeader.includes("physicalqty") || cleanHeader.includes("stock") || cleanHeader.includes("count") || cleanHeader.includes("sold")) {
          colMap.quantity = index;
        }
      });
    } else {
      const barcode = colMap.barcode !== undefined ? String(rowData[colMap.barcode] || "").trim() : undefined;
      const productName = colMap.productName !== undefined ? String(rowData[colMap.productName] || "").trim() : undefined;
      const mrp = colMap.mrp !== undefined ? parseFloat(rowData[colMap.mrp]) || 0 : undefined;
      const quantity = colMap.quantity !== undefined ? parseInt(rowData[colMap.quantity]) || 0 : undefined;

      if (productName || barcode) {
        rows.push({ barcode, productName, mrp, physicalQuantity: quantity, quantity });
      }
    }
  });

  return rows;
};

// --- DASHBOARD COMPONENT ---
function Dashboard() {
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);
  const [lastInputSource, setLastInputSource] = useState("Waiting for scans...");
  const [scannerAStatus, setScannerAStatus] = useState("Ready");
  const [scannerBStatus, setScannerBStatus] = useState("Ready");

  const [manualA, setManualA] = useState("");
  const [manualB, setManualB] = useState("");

  const lastProcessedCodes = useRef({});
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

      // De-duplication: Ignore if exactly the same code was scanned in the last 2000ms
      const nowTs = Date.now();
      if (lastProcessedCodes.current[code] && nowTs - lastProcessedCodes.current[code] < 2000) {
        console.log(`Ignoring duplicate scan: ${code} from ${source}`);
        return;
      }
      lastProcessedCodes.current[code] = nowTs;

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
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}>📡 Barcode Scanner Dashboard</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Monitor scans and check hardware connections live.</p>
          </div>
        </div>

        {/* Status Banner */}
        <div style={{ marginBottom: 24, padding: "16px 24px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ background: wsStatus === "Connected" ? "#e2f0d9" : "#fce8e6", color: wsStatus === "Connected" ? "#2e7d32" : "#c62828", borderRadius: "12px", padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>Serial Server: {wsStatus}</span>
          <div style={{ color: "#e2e8f0" }}>|</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={scannerAStatus} /><span style={{ fontWeight: 700, color: "#1565c0" }}>Scanner A</span></div>
          <div style={{ color: "#e2e8f0" }}>|</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot status={scannerBStatus} /><span style={{ fontWeight: 700, color: "#6a1b9a" }}>Scanner B</span></div>
          <span style={{ color: "#64748b", marginLeft: "auto", fontSize: 13, fontWeight: 500 }}>{lastInputSource}</span>
          <button onClick={handleClear} className="btn btn-danger" style={{ padding: "6px 14px", fontSize: 13, borderRadius: "8px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrashIcon size={16} /> CLEAR DB</span></button>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ ...panelStyle, border: "1px solid #f1f5f9", borderRadius: "16px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 14px", color: "#1565c0", fontSize: 18, fontWeight: 700 }}>Column A <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>({aData.length} scans)</span></h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input type="text" value={manualA} onChange={(e) => setManualA(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualAdd("A")} placeholder="Manual entry for A..." style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
              <button onClick={() => handleManualAdd("A")} className="btn btn-primary" style={{ padding: "10px 16px", borderRadius: 8 }}>Add</button>
            </div>
            <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", marginBottom: 16 }} />
            {aData.length === 0 ? <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>No scans yet.</p> : aData.map((d, i) => (
              <div key={`a-${i}`} style={{ margin: "6px 0", padding: "10px 14px", background: "#f5f9ff", borderRadius: 8, fontFamily: "monospace", fontSize: 14, display: "flex", justifyContent: "space-between", border: "1px solid #e0efff" }}>
                <span><strong style={{ color: "#94a3b8", marginRight: 8 }}>{i + 1}.</strong>{d.value}</span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{new Date(d.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>

          <div style={{ ...panelStyle, border: "1px solid #f1f5f9", borderRadius: "16px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 14px", color: "#6a1b9a", fontSize: 18, fontWeight: 700 }}>Column B <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>({bData.length} scans)</span></h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input type="text" value={manualB} onChange={(e) => setManualB(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualAdd("B")} placeholder="Manual entry for B..." style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
              <button onClick={() => handleManualAdd("B")} className="btn" style={{ padding: "10px 16px", borderRadius: 8, background: "#6a1b9a", color: "white" }}>Add</button>
            </div>
            <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", marginBottom: 16 }} />
            {bData.length === 0 ? <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>No scans yet.</p> : bData.map((d, i) => (
              <div key={`b-${i}`} style={{ margin: "6px 0", padding: "10px 14px", background: "#fdf5ff", borderRadius: 8, fontFamily: "monospace", fontSize: 14, display: "flex", justifyContent: "space-between", border: "1px solid #fae8ff" }}>
                <span><strong style={{ color: "#94a3b8", marginRight: 8 }}>{i + 1}.</strong>{d.value}</span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{new Date(d.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- LIVE AUDIT (formerly HISTORY) COMPONENT ---
function RackHistory() {
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState(null);
  const [sessionScans, setSessionScans] = useState([]);

  const [selectedBarcodes, setSelectedBarcodes] = useState([]);

  const [manualA, setManualA] = useState("");
  const [manualB, setManualB] = useState("");

  const [showEndModal, setShowEndModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [auditName, setAuditName] = useState("");

  const activeSessionRef = useRef(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8080");
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "serial") {
          const currentSession = activeSessionRef.current;
          if (currentSession && currentSession.status === "active") {
            const scannerChar = data.value.charAt(0).toUpperCase();
            const col = scannerChar === 'A' ? 1 : scannerChar === 'B' ? 2 : 0;
            fetch(`${API_BASE_URL}/audit-sessions/${currentSession._id}/scan`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ barcode: data.value, scanner: String(col) })
            });
            setSessionScans(prev => [...prev, { barcode: data.value, timestamp: new Date(), scanner: String(col) }]);
          }
        }
      } catch (e) { }
    };
    return () => ws.close();
  }, []);

  const handleStartAudit = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/audit-sessions`, { method: "POST" });
      const data = await res.json();
      setActiveSession(data.session);
      setSessionScans([]);
    } catch (err) {
      console.error(err);
      alert("Failed to start audit.");
    }
  };

  const handleManualAdd = async (column) => {
    if (!activeSession) {
      alert("Please start an audit session first to scan barcodes.");
      return;
    }
    const barcode = column === "A" ? manualA : manualB;
    if (!barcode.trim()) return;

    if (!barcode.toUpperCase().startsWith(column)) {
      alert(`Manual entry for Column ${column} must start with "${column}"!`);
      return;
    }

    const colNum = column === "A" ? 1 : 2;

    try {
      await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, scanner: String(colNum) })
      });
      setSessionScans(prev => [...prev, { barcode, timestamp: new Date(), scanner: String(colNum) }]);
      if (column === "A") setManualA(""); else setManualB("");
    } catch (err) {
      console.error("Error adding manual barcode:", err);
      alert("Failed to add barcode.");
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear all scanned barcodes in the current session?")) {
      setSessionScans([]);
    }
  };

  const handleEndAuditClick = () => {
    setShowEndModal(true);
  };

  const handleConfirmSave = async () => {
    try {
      await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}/end`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: true, name: auditName })
      });
      setShowSaveModal(false);
      setActiveSession(null);
      setSessionScans([]);
      setAuditName("");
      alert("Audit saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save audit.");
    }
  };

  const barcodeOptions = Array.from(new Set(sessionScans.map(item => item.barcode)))
    .map(barcode => ({ value: barcode, label: barcode }));

  const filteredData = sessionScans.filter((item) => {
    if (selectedBarcodes.length > 0) {
      if (!selectedBarcodes.some(b => b.value === item.barcode)) return false;
    }
    return true;
  });

  const getScannerNumber = (barcode) => {
    if (!barcode) return null;
    const char = barcode.charAt(0).toUpperCase();
    if (char >= 'A' && char <= 'H') {
      return char.charCodeAt(0) - 64;
    }
    return null;
  };

  const scannersToShow = [1, 2];

  const scansByScanner = scannersToShow.map(num =>
    filteredData.filter(item => getScannerNumber(item.barcode) === num)
  );
  const maxRows = Math.max(...scansByScanner.map(arr => arr.length), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ScrollIcon size={28} /> Live Audit</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Start a new audit session to begin scanning.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/audit-history" className="btn btn-secondary" style={{ borderRadius: "20px", background: "#f1f5f9", color: "#334155", padding: "8px 16px", textDecoration: "none", fontWeight: 600 }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardIcon size={16} /> View Audit History</span></Link>
            {/* <Link to="/" className="btn btn-secondary" style={{ borderRadius: "20px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to Dashboard</span></Link> */}
          </div>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 15, alignItems: "center", flex: 1 }}>
              <div style={{ minWidth: 250 }}>
                <Select
                  isMulti
                  options={barcodeOptions}
                  value={selectedBarcodes}
                  onChange={setSelectedBarcodes}
                  placeholder="Search Barcode"
                  styles={{ control: (base) => ({ ...base, minHeight: 38, borderRadius: 5 }) }}
                />
              </div>
              <button onClick={handleClearHistory} style={{ background: "#d32f2f", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrashIcon size={16} /> Clear Scan History</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleStartAudit}
                disabled={activeSession !== null}
                style={{
                  background: activeSession ? "#a5d6a7" : "linear-gradient(180deg, #66bb6a 0%, #43a047 100%)",
                  color: "#fff", border: "none", padding: "10px 20px", borderRadius: 20, cursor: activeSession ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15
                }}
              >
                Start Audit
              </button>
              <button
                onClick={handleEndAuditClick}
                disabled={!activeSession}
                style={{
                  background: !activeSession ? "#ef9a9a" : "linear-gradient(180deg, #ef5350 0%, #d32f2f 100%)",
                  color: "#fff", border: "none", padding: "10px 20px", borderRadius: 20, cursor: !activeSession ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15
                }}
              >
                End Audit
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                {scannersToShow.map(num => {
                  const col = String.fromCharCode(64 + num);
                  const manualVal = col === "A" ? manualA : manualB;
                  const setManual = col === "A" ? setManualA : setManualB;
                  const accentColor = num === 1 ? "#1565c0" : "#6a1b9a";
                  return (
                    <th key={num} style={{ textAlign: "left", padding: "10px 12px", width: "50%" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: accentColor }}>Scanner {num}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="text"
                            value={manualVal}
                            onChange={e => setManual(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleManualAdd(col)}
                            placeholder={`Manual entry for ${col}...`}
                            disabled={!activeSession}
                            style={{
                              flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${accentColor}40`,
                              fontSize: 13, outline: "none", background: !activeSession ? "#f1f5f9" : "#fff", fontFamily: "monospace"
                            }}
                          />
                          <button
                            onClick={() => handleManualAdd(col)}
                            disabled={!activeSession}
                            style={{
                              padding: "7px 14px", borderRadius: 8, background: !activeSession ? "#94a3b8" : accentColor,
                              color: "#fff", border: "none", cursor: !activeSession ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {maxRows === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                    {!activeSession ? "Click 'Start Audit' to begin scanning." : "Ready to scan... awaiting barcodes."}
                  </td>
                </tr>
              )}
              {Array.from({ length: maxRows }).map((_, rowIndex) => (
                <tr key={rowIndex} style={{ borderBottom: "1px solid #eee" }}>
                  {scannersToShow.map((num, colIdx) => {
                    const item = scansByScanner[colIdx][rowIndex];
                    const color = num === 1 ? "#1565c0" : "#6a1b9a";
                    return (
                      <td key={num} style={{ padding: 12 }}>
                        {item && (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14, color }}>
                              {item.barcode}
                            </span>
                            <span style={{ fontSize: 11, color: "#888", fontWeight: 400, marginTop: 4 }}>
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {showEndModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 30, width: 400, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", position: "relative" }}>
            <button onClick={() => setShowEndModal(false)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#ef5350" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef5350"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>
            </button>
            <h2 style={{ margin: "20px 0 30px", fontSize: 22, color: "#1a1a2e" }}>Do You Want To Save?</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              <button onClick={() => { setShowEndModal(false); setShowSaveModal(true); }} style={{ background: "#00b050", color: "#fff", border: "none", padding: "10px 40px", borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 600 }}>Yes</button>
              <button onClick={() => setShowEndModal(false)} style={{ background: "#f04e4e", color: "#fff", border: "none", padding: "10px 40px", borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 600 }}>No</button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 450, overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#1f295c", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 500, textAlign: "center", flex: 1 }}>Save As</h3>
              <button onClick={() => setShowSaveModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>
              </button>
            </div>
            <div style={{ padding: 30 }}>
              <label style={{ display: "block", marginBottom: 10, fontSize: 16, color: "#333", fontWeight: 500 }}>List Name</label>
              <input type="text" value={auditName} onChange={e => setAuditName(e.target.value)} placeholder="List 1" style={{ width: "100%", padding: "12px 15px", borderRadius: 6, border: "1px solid #e0e0e0", fontSize: 16, background: "#f8f9fa", boxSizing: "border-box", marginBottom: 30 }} />
              <div style={{ textAlign: "center" }}>
                <button onClick={handleConfirmSave} style={{ background: "#00b050", color: "#fff", border: "none", padding: "10px 40px", borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 600 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- AUDIT HISTORY COMPONENT ---
function AuditHistory() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/audit-sessions`)
      .then(res => res.json())
      .then(data => {
        setAudits(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this audit?")) {
      await fetch(`${API_BASE_URL}/audit-sessions/${id}`, { method: 'DELETE' });
      setAudits(audits.filter(a => a._id !== id));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FolderIcon size={28} /> Audit History</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>View all previously saved audits.</p>
          </div>
          <Link to="/" className="btn btn-secondary" style={{ borderRadius: "20px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to Live Audit</span></Link>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {loading ? <p>Loading...</p> : audits.length === 0 ? <p>No saved audits found.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: 12, color: "#334155" }}>Audit Name</th>
                  <th style={{ padding: 12, color: "#334155" }}>Start Time</th>
                  <th style={{ padding: 12, color: "#334155" }}>End Time</th>
                  <th style={{ padding: 12, color: "#334155" }}>Total Items</th>
                  <th style={{ padding: 12, color: "#334155" }}>Status</th>
                  <th style={{ padding: 12, textAlign: "center", color: "#334155" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(audit => (
                  <tr key={audit._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontWeight: 600, color: "#1565c0" }}>{audit.name || audit.auditId}</td>
                    <td style={{ padding: 12, color: "#475569" }}>{new Date(audit.startTime).toLocaleString()}</td>
                    <td style={{ padding: 12, color: "#475569" }}>{audit.endTime ? new Date(audit.endTime).toLocaleString() : "-"}</td>
                    <td style={{ padding: 12, fontWeight: 600, color: "#0f172a" }}>{audit.totalScannedItems}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                        {audit.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <Link to="/audit-details" state={{ id: audit._id }} style={{ background: "#e0f2fe", color: "#0284c7", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "none", marginRight: 8, display: "inline-block" }}>View</Link>
                      <Link to="/audit" state={{ auditId: audit._id }} style={{ background: "#fef08a", color: "#854d0e", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "none", marginRight: 8, display: "inline-block" }}>Compare</Link>
                      <button onClick={() => handleDelete(audit._id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AUDIT DETAILS COMPONENT ---
function AuditDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location.state?.id) {
      navigate('/audit-history');
      return;
    }
    fetch(`${API_BASE_URL}/audit-sessions/${location.state.id}`)
      .then(res => res.json())
      .then(data => {
        setAudit(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [location, navigate]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading audit details...</div>;
  if (!audit) return <div style={{ padding: 40, textAlign: "center" }}>Audit not found.</div>;

  const scans = audit.scans || [];

  const getScannerNumber = (barcode) => {
    if (!barcode) return null;
    const char = barcode.charAt(0).toUpperCase();
    if (char >= 'A' && char <= 'H') return char.charCodeAt(0) - 64;
    return null;
  };

  const scannersToShow = [1, 2];
  const scansByScanner = scannersToShow.map(num =>
    scans.filter(item => getScannerNumber(item.barcode) === num)
  );
  const maxRows = Math.max(...scansByScanner.map(arr => arr.length), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><SearchIcon size={28} /> Audit Details: {audit.name || audit.auditId}</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              Started: {new Date(audit.startTime).toLocaleString()} | Ended: {audit.endTime ? new Date(audit.endTime).toLocaleString() : "N/A"}
            </p>
          </div>
          <Link to="/audit-history" className="btn btn-secondary" style={{ borderRadius: "20px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to History</span></Link>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                {scannersToShow.map(num => {
                  const accentColor = num === 1 ? "#1565c0" : "#6a1b9a";
                  return (
                    <th key={num} style={{ textAlign: "left", padding: "12px", width: "50%" }}>
                      <span style={{ fontWeight: 700, color: accentColor }}>Scanner {num} ({scansByScanner[num - 1].length} items)</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {maxRows === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                    No scans recorded in this session.
                  </td>
                </tr>
              )}
              {Array.from({ length: maxRows }).map((_, rowIndex) => (
                <tr key={rowIndex} style={{ borderBottom: "1px solid #eee" }}>
                  {scannersToShow.map((num, colIdx) => {
                    const item = scansByScanner[colIdx][rowIndex];
                    const color = num === 1 ? "#1565c0" : "#6a1b9a";
                    return (
                      <td key={num} style={{ padding: 12 }}>
                        {item && (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14, color }}>
                              {item.barcode}
                            </span>
                            <span style={{ fontSize: 11, color: "#888", fontWeight: 400, marginTop: 4 }}>
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- PRODUCT MANAGEMENT COMPONENT ---
function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    barcode: "",
    productName: "",
    mrp: "",
    physicalQuantity: ""
  });

  const importProductsRef = useRef(null);
  const importSalesRef = useRef(null);

  const handleImportProducts = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "products");

      const response = await fetch(`${API_BASE_URL}/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsedRows })
      });

      const resData = await response.json();
      if (response.ok) {
        alert(resData.message || "Products imported successfully!");
        await fetchProducts();
      } else {
        alert(resData.error || "Failed to import products.");
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleImportSales = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "sales");

      const response = await fetch(`${API_BASE_URL}/sales/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: parsedRows })
      });

      const resData = await response.json();
      if (response.ok) {
        let alertMsg = resData.message || "Sales imported successfully!";
        if (resData.warnings && resData.warnings.length > 0) {
          alertMsg += "\n\nWarnings:\n" + resData.warnings.join("\n");
        }
        alert(alertMsg);
        await fetchProducts();
      } else {
        alert(resData.error || "Failed to import sales.");
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleExportProducts = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Products Inventory");

      const headers = ["Barcode", "Product Name", "MRP (₹)", "Physical Qty"];
      sheet.addRow(headers);

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E7D32" } // Green background
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      products.forEach(p => {
        sheet.addRow([
          p.barcode,
          p.productName,
          p.mrp,
          p.physicalQuantity
        ]);
      });

      sheet.columns.forEach((column) => {
        column.width = 15;
      });
      sheet.getColumn(2).width = 30; // Make Product Name wider

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Product_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error exporting products list: " + err.message);
    }
  };

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
          mrp: parseFloat(formData.mrp) || 0,
          physicalQuantity: parseInt(formData.physicalQuantity) || 0
        })
      });

      if (response.ok) {
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

  const handleEdit = (product) => {
    setFormData({
      barcode: product.barcode,
      productName: product.productName,
      mrp: product.mrp,
      physicalQuantity: product.physicalQuantity
    });
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchProducts();
      } else {
        alert("Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Error deleting product");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ClipboardIcon size={28} /> Product Master Data</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Manage your products, import from Excel, and export data.</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {!formVisible && (
            <button
              onClick={() => setFormVisible(true)}
              className="btn btn-success"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PlusIcon size={16} /> Add New Product</span>
            </button>
          )}

          <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            ref={importProductsRef}
            onChange={handleImportProducts}
          />
          <button
            className="btn btn-primary"
            onClick={() => importProductsRef.current.click()}
            disabled={loading}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadIcon size={16} /> Import Products</span>
          </button>

          <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            ref={importSalesRef}
            onChange={handleImportSales}
          />
          <button
            className="btn"
            style={{ background: "#f59e0b", color: "#fff" }}
            onClick={() => importSalesRef.current.click()}
            disabled={loading}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDownIcon size={16} /> Import Sales</span>
          </button>

          <button
            className="btn"
            style={{ background: "#2e7d32", color: "#fff" }}
            onClick={handleExportProducts}
            disabled={loading || products.length === 0}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadIcon size={16} /> Export Excel</span>
          </button>
        </div>

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: "#1a1a2e" }}>All Products</h2>
            <div style={{ width: '400px' }}>
              <Select
                isMulti
                options={products.map(p => ({ value: p.barcode, label: `${p.barcode} - ${p.productName}` }))}
                value={selectedBarcodes}
                onChange={setSelectedBarcodes}
                placeholder="Search and select barcodes..."
                styles={{
                  control: (base) => ({ ...base, borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '14px' })
                }}
              />
            </div>
          </div>
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
                  <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(selectedBarcodes.length > 0 ? products.filter(p => selectedBarcodes.find(sel => sel.value === p.barcode)) : products).map((product) => (
                  <tr key={product._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontFamily: "monospace", fontWeight: 600 }}>{product.barcode}</td>
                    <td style={{ padding: 12 }}>{product.productName}</td>
                    <td style={{ textAlign: "center", padding: 12 }}>₹{product.mrp}</td>
                    <td style={{ textAlign: "center", padding: 12, fontWeight: 600 }}>{product.physicalQuantity}</td>
                    <td style={{ textAlign: "center", padding: 12 }}>
                      <button
                        onClick={() => handleEdit(product)}
                        style={{ background: "#e0f2fe", color: "#0284c7", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 8 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AUDIT SCANNING COMPONENT ---
function AuditScanning() {
  const navigate = useNavigate();
  const location = useLocation();
  const compareAuditId = location.state?.auditId;
  const [scanCount, setScanCount] = useState({});
  const [totalScans, setTotalScans] = useState(0);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [auditTitle, setAuditTitle] = useState("Global Audit Dashboard");

  // Fetch all master products so we can display them during the audit
  useEffect(() => {
    fetch(`${API_BASE_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Error fetching products:", err));

    if (compareAuditId) {
      fetch(`${API_BASE_URL}/audit-sessions/${compareAuditId}`)
        .then(res => res.json())
        .then(data => {
          setAuditTitle(`Audit Comparison: ${data.name || data.auditId}`);
          const counts = {};
          let total = 0;
          (data.scans || []).forEach(scan => {
            counts[scan.barcode] = (counts[scan.barcode] || 0) + 1;
            total++;
          });
          setScanCount(counts);
          setTotalScans(total);
        })
        .catch(err => console.error("Error fetching session:", err));
    } else {
      // Fetch live grand totals
      fetch(`${API_BASE_URL}/audit/totals`)
        .then(res => res.json())
        .then(data => {
          setScanCount(data);
          const total = Object.values(data).reduce((acc, val) => acc + val, 0);
          setTotalScans(total);
        })
        .catch(err => console.error("Error fetching totals:", err));
    }
  }, [compareAuditId]);

  useEffect(() => {
    if (compareAuditId) return; // Do not connect WS if we are just comparing an old session
    const ws = new WebSocket("ws://127.0.0.1:8080");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "serial") {
          handleScan(data.value, false); // Hardware scan, do NOT hit API from UI
        }
      } catch (e) { }
    };
    return () => ws.close();
  }, [compareAuditId]);

  const handleScan = async (scannedCode, isManual = false) => {
    const code = (typeof scannedCode === 'string' ? scannedCode : "").trim();
    if (!code) return;

    if (isManual) {
      try {
        await fetch(`${API_BASE_URL}/barcode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: code, scanner: "Web UI" })
        });
      } catch (err) {
        console.error("Error recording manual scan:", err);
      }
    }

    setScanCount((prev) => ({
      ...prev,
      [code]: (prev[code] || 0) + 1
    }));
    setTotalScans((prev) => prev + 1);
  };

  const handleRecordSelected = async () => {
    if (selectedProducts.size === 0) return;

    // Process all selected products manually
    for (const barcode of selectedProducts) {
      await handleScan(barcode, true);
    }

    // Clear selection after recording
    setSelectedProducts(new Set());
  };

  const toggleSelection = (barcode) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) newSet.delete(barcode);
      else newSet.add(barcode);
      return newSet;
    });
  };

  const completeAudit = () => {
    navigate("/reconciliation");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BoxIcon size={28} /> Inventory Audit - Barcode Scanning</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Scan barcodes to verify inventory levels.</p>
          </div>
        </div>

        <div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <div>
                <h2 style={{ margin: 0, color: "#1a1a2e", fontSize: 18 }}>{auditTitle}</h2>
                <p style={{ margin: "6px 0 0", color: "#666", fontSize: 13 }}>{compareAuditId ? "Comparing historical audit counts vs master products" : "Live running totals from all scanners"}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#2e7d32" }}>{totalScans}</div>
                <div style={{ fontSize: 13, color: "#666" }}>Total Scans (All Time)</div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #eee", marginBottom: 20 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#1a1a2e", fontSize: 16 }}>Audit Progress</h3>
              <button
                onClick={handleRecordSelected}
                disabled={selectedProducts.size === 0}
                style={{
                  padding: "8px 16px", borderRadius: 5, background: selectedProducts.size > 0 ? "#1565c0" : "#ccc",
                  color: "#fff", border: "none", cursor: selectedProducts.size > 0 ? "pointer" : "not-allowed",
                  fontWeight: 600, fontSize: 13
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadIcon size={16} /> Record Selected Scans ({selectedProducts.size})</span>
              </button>
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", width: "40px", textAlign: "center" }}>☑️</th>
                    <th style={{ padding: "10px 12px" }}>Product Name</th>
                    <th style={{ padding: "10px 12px" }}>Barcode</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Expected (Phy)</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Scanned (Sys)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && Object.keys(scanCount).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" }}>No products in master data. Start scanning!</td>
                    </tr>
                  ) : null}

                  {products.map(p => {
                    const scanned = scanCount[p.barcode] || 0;
                    const isComplete = scanned === p.physicalQuantity;
                    const isOver = scanned > p.physicalQuantity;
                    const isSelected = selectedProducts.has(p.barcode);

                    return (
                      <tr key={p.barcode} onClick={() => toggleSelection(p.barcode)} style={{ borderBottom: "1px solid #eee", background: isSelected ? "#e3f2fd" : isComplete ? "#e8f5e9" : isOver ? "#ffebee" : "#fff", cursor: "pointer" }}>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <input type="checkbox" checked={isSelected} readOnly style={{ cursor: "pointer", width: 16, height: 16 }} />
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#333" }}>
                          {isComplete && <span style={{ marginRight: 8 }}>✅</span>}
                          {isOver && <span style={{ marginRight: 8 }}>⚠️</span>}
                          {p.productName}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#666" }}>{p.barcode}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#555" }}>{p.physicalQuantity}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: scanned > 0 ? (isOver ? "#c62828" : "#2e7d32") : "#bbb", fontSize: 16 }}>
                          {scanned > 0 ? scanned : "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Unknown Barcodes (Scanned but not in Master Data) */}
                  {Object.entries(scanCount).filter(([barcode]) => !products.some(p => p.barcode === barcode)).map(([barcode, count]) => (
                    <tr key={barcode} style={{ borderBottom: "1px solid #eee", background: "#fff3e0" }}>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>-</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#e65100" }}>⚠️ Unknown Product</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#666" }}>{barcode}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#999" }}>?</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#e65100", fontSize: 16 }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={completeAudit}
            style={{ width: "100%", padding: "12px", borderRadius: 5, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 16 }}
          >
            ✅ Complete Audit & View Report
          </button>
        </div>
      </div>
    </div>
  );
}

// --- RECONCILIATION REPORT COMPONENT ---
function ReconciliationReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/reconciliation/report`);
        const data = await response.json();
        setReportData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching report:", err);
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading report...</div>;
  if (!reportData || !reportData.data) return <div style={{ padding: 24, textAlign: "center" }}>No data available</div>;

  const { data, summary } = reportData;

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    // 1. Create a sheet with a specific name
    const sheet = workbook.addWorksheet("Reconciliation Report");

    // 2. Define headers and add them to the sheet
    const headers = [
      "Barcode", "Product Name", "Physical Qty", "MRP",
      "Physical Amt", "System Qty", "System Amt", "Diff Qty", "Diff Amt"
    ];
    sheet.addRow(headers);

    // 3. Format the header row (Bold + Background Color)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White font
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1565C0" } // Blue background
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // 4. Map data rows
    data.forEach(item => {
      sheet.addRow([
        item.barcode,
        item.productName,
        item.phyQty,
        item.mrp,
        item.phyAmt,
        item.sysQty,
        item.sysAmt,
        item.diff,
        item.diffAmt
      ]);
    });

    // 5. Add a blank row and then the Summary row
    sheet.addRow([]);
    const summaryRow = sheet.addRow([
      "TOTAL", "", summary.totalPhyQty, "", summary.totalPhyAmt,
      summary.totalSysQty, summary.totalSysAmt, summary.totalDiffQty, summary.totalDiffAmt
    ]);

    // Format Summary row
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8F9FA" } // Light grey background
    };

    // Auto-fit columns roughly
    sheet.columns.forEach((column) => {
      column.width = 15;
    });
    sheet.getColumn(2).width = 30; // Product Name wider

    // 6. Generate Excel file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BarChartIcon size={28} /> Global Inventory Reconciliation</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Running totals vs Master Data • {new Date().toLocaleString()}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={exportToExcel}
              className="btn btn-success"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadIcon size={16} /> Export to Excel</span>
            </button>
            <Link to="/audit" className="btn btn-primary" style={{ borderRadius: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to Audit</span></Link>
          </div>
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
                    <td style={{ textAlign: "center", padding: 12, fontWeight: 700, color: diffColor }}>{item.diff > 0 ? '+' : ''}{item.diff}</td>
                    <td style={{ textAlign: "center", padding: 12, fontWeight: 700, color: diffColor }}>{item.diffAmt > 0 ? '+' : ''}₹{Math.abs(item.diffAmt).toLocaleString()}</td>
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
                <td style={{ textAlign: "center", padding: 12, color: summary.totalDiffQty === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffQty > 0 ? '+' : ''}{summary.totalDiffQty}</td>
                <td style={{ textAlign: "center", padding: 12, color: summary.totalDiffAmt === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffAmt > 0 ? '+' : ''}₹{Math.abs(summary.totalDiffAmt).toLocaleString()}</td>
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
              <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalDiffQty === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffQty > 0 ? '+' : ''}{summary.totalDiffQty}</div>
            </div>
            <div style={{ background: summary.totalDiffAmt === 0 ? "#e8f5e9" : "#ffebee", padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Diff Amount</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalDiffAmt === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffAmt > 0 ? '+' : ''}₹{Math.abs(summary.totalDiffAmt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ACTIVITY LOGS COMPONENT ---
function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`);
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ClipboardIcon size={28} /> Activity Logs</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Audit trail of all system modifications.</p>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <p>Loading logs...</p>
          ) : logs.length === 0 ? (
            <p style={{ color: "#bbb" }}>No activity logs found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Product Name</th>
                    <th>Barcode</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: log.action.includes("CREATE") || log.action.includes("IMPORT") ? "#dcfce7" :
                            log.action.includes("DELETE") || log.action.includes("SALES") ? "#fee2e2" : "#e0e7ff",
                          color: log.action.includes("CREATE") || log.action.includes("IMPORT") ? "#166534" :
                            log.action.includes("DELETE") || log.action.includes("SALES") ? "#991b1b" : "#3730a3"
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.productName}</td>
                      <td style={{ fontFamily: "monospace" }}>{log.barcode}</td>
                      <td style={{ color: "#64748b", fontSize: "13px" }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP WITH ROUTING ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('auth') === 'true');

  const handleLogin = () => {
    localStorage.setItem('auth', 'true');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <>
        <style>{globalStyles}</style>
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <Router>
      <style>{globalStyles}</style>
      <Routes>
        <Route path="/" element={<RackHistory />} />
        <Route path="/audit-history" element={<AuditHistory />} />
        <Route path="/audit-details" element={<AuditDetails />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/audit" element={<AuditScanning />} />
        <Route path="/reconciliation" element={<ReconciliationReport />} />
        <Route path="/logs" element={<ActivityLogs />} />
      </Routes>
    </Router>
  );
}

export default App;
