import React, { useState, useEffect } from 'react';
import { getActiveShop, setActiveShop, API_BASE_URL } from './App'; // Assuming we export these

export function ShopDropdown({ onShopChange }) {
  const [shops, setShops] = useState([]);
  const [active, setActive] = useState(getActiveShop());
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingShop, setPendingShop] = useState(null);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/shops`); // The wrapper will add shop header if needed, but not required for this endpoint
      if (res.ok) {
        const data = await res.json();
        setShops(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelect = (e) => {
    const val = e.target.value;
    if (val === 'manage') {
      setShowManager(true);
      e.target.value = active || ""; // reset
      return;
    }
    if (val !== active) {
      setPendingShop(val);
      setShowConfirm(true);
    }
  };

  const confirmSwitch = () => {
    setActiveShop(pendingShop);
    setActive(pendingShop);
    setShowConfirm(false);
    if (onShopChange) onShopChange(pendingShop);
    window.location.reload(); // Reload to clear all states
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <select 
        value={active || ""} 
        onChange={handleSelect}
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      >
        <option value="" disabled>Select Shop</option>
        {shops.map(s => <option key={s._id} value={s._id}>{s.name}{s.location ? ` - ${s.location}` : ''}</option>)}
        <option value="manage">-- Manage Shops --</option>
      </select>

      {showConfirm && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '300px' }}>
            <h3>Switch Shop?</h3>
            <p>You are about to switch to a different shop. Unsaved data may be lost.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <button onClick={confirmSwitch} style={{ background: '#1565c0', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showManager && <ShopManagerModal onClose={() => { setShowManager(false); fetchShops(); }} />}
    </div>
  );
}

export function ShopManagerModal({ onClose }) {
  const [shops, setShops] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/shops`);
      if (res.ok) {
        const data = await res.json();
        setShops(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching shops in manager:", err);
    }
  };

  const saveShop = async () => {
    if (!name) return;

    const normName = name.replace(/\s+/g, '').toLowerCase();
    
    const isDuplicate = shops.some(s => {
      if (editId && s._id === editId) return false;
      const sName = (s.name || '').replace(/\s+/g, '').toLowerCase();
      return sName === normName;
    });

    if (isDuplicate) {
      alert("Error: A shop with this name already exists.");
      return;
    }

    try {
      const isEdit = !!editId;
      const url = isEdit ? `${API_BASE_URL}/shops/${editId}` : `${API_BASE_URL}/shops`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Error: ${errData.error || res.statusText}`);
        return;
      }
      setName(''); setLocation(''); setEditId(null);
      fetchShops();
    } catch (err) {
      console.error("Error saving shop:", err);
      alert("Network error: Could not save shop.");
    }
  };

  const handleEdit = (shop) => {
    setName(shop.name);
    setLocation(shop.location || '');
    setEditId(shop._id);
  };


  const deleteShop = async (id) => {
    if (window.confirm("Delete this shop?")) {
      try {
        const res = await fetch(`${API_BASE_URL}/shops/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Failed to delete shop");
        fetchShops();
      } catch (err) {
        console.error("Error deleting shop:", err);
        alert("Failed to delete shop.");
      }
    }
  };

  return (
    <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '700px', maxWidth: '90vw' }}>
        <h2>Manage Shops</h2>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input placeholder="Shop Name" value={name} onChange={e=>setName(e.target.value)} style={{flex: 1, padding: '8px'}} />
          <input placeholder="Location (Optional)" value={location} onChange={e=>setLocation(e.target.value)} style={{flex: 1, padding: '8px'}} />
          <button onClick={saveShop} style={{ background: editId ? '#f59e0b' : '#00b14f', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer' }}>
            {editId ? 'Update Shop' : 'Add Shop'}
          </button>
          {editId && <button onClick={() => { setName(''); setLocation(''); setEditId(null); }} style={{ background: '#64748b', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
          {shops.map(s => (
            <li key={s._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <span><strong>{s.name}</strong> {s.location && `(${s.location})`}</span>
              <div>
                <button onClick={() => handleEdit(s)} style={{ color: '#1565c0', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: '10px' }}>Edit</button>
                <button onClick={() => deleteShop(s._id)} style={{ color: 'red', background: 'transparent', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={onClose} style={{ background: '#1565c0', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function ShopSelectorModal({ onSelected }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/shops`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setShops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const select = (id) => {
    setActiveShop(id);
    onSelected();
  };

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading shops...</div>;

  return (
    <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: '#fcf2f6', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{marginTop: 0}}>Select a Shop</h2>
        {shops.length === 0 ? (
          <div>
            <p style={{color: '#666', marginBottom: '20px'}}>No shops exist yet. You need to create a shop before continuing.</p>
            <button onClick={() => setShowManager(true)} style={{ background: '#1565c0', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Create Shop</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
              {shops.map(s => (
                <button key={s._id} onClick={() => select(s._id)} style={{ padding: '12px', textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>
                  <strong>{s.name}</strong>
                  {s.location && <div style={{ fontSize: '12px', color: '#64748b' }}>{s.location}</div>}
                </button>
              ))}
            </div>
            <button onClick={() => setShowManager(true)} style={{ background: 'transparent', color: '#1565c0', border: '1px solid #1565c0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Manage Shops</button>
          </div>
        )}
      </div>
      {showManager && <ShopManagerModal onClose={() => { setShowManager(false); fetchShops(); }} />}
    </div>
  );
}
