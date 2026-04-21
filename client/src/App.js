import { useEffect, useRef, useState } from "react";

const panelStyle = {
  flex: 1,
  minWidth: 280,
  border: "1px solid #d9d9d9",
  borderRadius: 8,
  padding: 16,
  background: "#fff",
};

function App() {
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);
  const [activeKeyboardTarget, setActiveKeyboardTarget] = useState("B");
  const [lastInputSource, setLastInputSource] = useState("Waiting for scans...");
  const activeTargetRef = useRef("B");
  const keyboardBufferRef = useRef("");
  const keyboardFlushTimerRef = useRef(null);

  useEffect(() => {
    activeTargetRef.current = activeKeyboardTarget;
  }, [activeKeyboardTarget]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    console.log("Connecting to WebSocket at ws://localhost:8080");

    ws.onopen = () => {
      console.log("WebSocket connection established.");
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    ws.onclose = (event) => {
      console.warn("WebSocket closed:", event.code, event.reason || "no reason");
    };
    ws.onmessage = (event) => {
      console.log("Raw message event:", event.data);
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.error("Invalid JSON packet:", event.data, err);
        return;
      }
      console.log("Received data:", data);

      if (data.type === "ws_connected") {
        console.log("Server hello received at", new Date(data.ts).toLocaleTimeString());
        return;
      }

      if (data.device === "A") {
        setAData((prev) => [...prev, data.value]);
        setLastInputSource("Serial Scanner A");
      } else if (data.device === "B") {
        setBData((prev) => [...prev, data.value]);
        setLastInputSource("Serial Scanner B");
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    const flushKeyboardScan = () => {
      const scannedValue = keyboardBufferRef.current.trim();
      keyboardBufferRef.current = "";
      if (!scannedValue) return;

      const target = activeTargetRef.current;
      console.log(`Keyboard-wedge scan -> ${target}:`, scannedValue);

      if (target === "A") {
        setAData((prev) => [...prev, scannedValue]);
        setLastInputSource("Keyboard (routed to Scanner A)");
      } else {
        setBData((prev) => [...prev, scannedValue]);
        setLastInputSource("Keyboard (routed to Scanner B)");
      }
    };

    const handleKeydown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      if (event.key === "F7") {
        setActiveKeyboardTarget("A");
        return;
      }
      if (event.key === "F8") {
        setActiveKeyboardTarget("B");
        return;
      }

      if (event.key === "Enter") {
        if (keyboardFlushTimerRef.current) {
          clearTimeout(keyboardFlushTimerRef.current);
        }
        flushKeyboardScan();
        return;
      }

      if (event.key === "Backspace") {
        keyboardBufferRef.current = keyboardBufferRef.current.slice(0, -1);
        return;
      }

      if (event.key.length !== 1) return;

      keyboardBufferRef.current += event.key;
      if (keyboardFlushTimerRef.current) {
        clearTimeout(keyboardFlushTimerRef.current);
      }
      keyboardFlushTimerRef.current = setTimeout(flushKeyboardScan, 100);
    };

    window.addEventListener("keydown", handleKeydown, true);
    return () => {
      window.removeEventListener("keydown", handleKeydown, true);
      if (keyboardFlushTimerRef.current) {
        clearTimeout(keyboardFlushTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        background: "#f4f6f8",
        fontFamily: "Segoe UI, Tahoma, sans-serif",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Barcode Scanner Dashboard</h1>
      <div style={{ marginBottom: 14, fontSize: 14 }}>
        <strong>HID Keyboard Mode:</strong> ON
      </div>
      <div style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span>Active keyboard target:</span>
        <button
          type="button"
          onClick={() => setActiveKeyboardTarget("A")}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #bbb",
            background: activeKeyboardTarget === "A" ? "#dcecff" : "#fff",
            cursor: "pointer",
          }}
        >
          Scanner A (F7)
        </button>
        <button
          type="button"
          onClick={() => setActiveKeyboardTarget("B")}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #bbb",
            background: activeKeyboardTarget === "B" ? "#dcecff" : "#fff",
            cursor: "pointer",
          }}
        >
          Scanner B (F8)
        </button>
        <span style={{ color: "#666" }}>Last input source: {lastInputSource}</span>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={panelStyle}>
          <h2>Scanner A</h2>
          {aData.length === 0 ? <p>No scans yet.</p> : aData.map((d, i) => <p key={`a-${i}`}>{d}</p>)}
        </div>

        <div style={panelStyle}>
          <h2>Scanner B</h2>
          {bData.length === 0 ? <p>No scans yet.</p> : bData.map((d, i) => <p key={`b-${i}`}>{d}</p>)}
        </div>
      </div>
    </div>
  );
}

export default App;
