import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LogOut, Plus, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';

// Utility to generate a random License Key
const generateLicenseKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

function Dashboard({ user }) {
  const [licenses, setLicenses] = useState([]);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  useEffect(() => {
    // Listen to licenses collection
    const unsub = onSnapshot(collection(db, 'licenses'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLicenses(data);
    }, (error) => {
      console.error("Firestore error:", error);
      toast.error("Failed to load licenses");
    });

    return () => unsub();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    if (!newCustomerName || !newExpiry) return toast.error("Please fill all fields");

    const licenseKey = generateLicenseKey();
    try {
      await setDoc(doc(db, 'licenses', licenseKey), {
        licenseKey: licenseKey,
        machineId: "",
        active: true,
        expiryDate: newExpiry,
        customerName: newCustomerName,
        createdAt: new Date().toISOString(),
        lastVerifiedAt: null
      });
      toast.success("License created successfully!");
      setIsCreating(false);
      setNewCustomerName('');
      setNewExpiry('');
    } catch (error) {
      toast.error("Failed to create license: " + error.message);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'licenses', id), { active: !currentStatus });
      toast.success(`License ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error("Error updating status: " + error.message);
    }
  };

  const updateExpiry = async (id, newExpiryDate) => {
    if (!newExpiryDate) return;
    try {
      await updateDoc(doc(db, 'licenses', id), { expiryDate: newExpiryDate });
      toast.success("Expiry date updated successfully!");
    } catch (error) {
      toast.error("Error updating expiry date: " + error.message);
    }
  };

  const reassignMachine = async (id) => {
    if (!window.confirm("Are you sure you want to clear the machine ID? This will allow the license to be used on a new machine.")) return;
    try {
      await updateDoc(doc(db, 'licenses', id), { machineId: "" });
      toast.success("Machine ID cleared.");
    } catch (error) {
      toast.error("Error clearing machine ID: " + error.message);
    }
  };

  const deleteLicense = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this license?")) return;
    try {
      await deleteDoc(doc(db, 'licenses', id));
      toast.success("License deleted");
    } catch (error) {
      toast.error("Error deleting license: " + error.message);
    }
  };

  const filteredLicenses = licenses.filter(lic => 
    lic.licenseKey.toLowerCase().includes(search.toLowerCase()) || 
    lic.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0 }}>License Management</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Logged in as: {user.email}</p>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search by Key or Customer..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <button className="btn btn-primary" onClick={() => setIsCreating(!isCreating)}>
            <Plus size={16} /> Create License
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateLicense} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Customer Name</label>
              <input type="text" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Shop Name" required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Expiry Date</label>
              <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
          </form>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>License Key</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Machine ID</th>
                <th>Last Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLicenses.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8' }}>No licenses found.</td></tr>
              ) : (
                filteredLicenses.map(lic => (
                  <tr key={lic.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{lic.licenseKey}</td>
                    <td>{lic.customerName}</td>
                    <td>
                      <span className={lic.active ? 'badge badge-success' : 'badge badge-error'}>
                        {lic.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <input 
                        type="date" 
                        value={lic.expiryDate} 
                        onChange={e => updateExpiry(lic.id, e.target.value)}
                        style={{ 
                          padding: '6px 10px', 
                          borderRadius: '6px', 
                          border: '1px solid #cbd5e1', 
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          background: '#ffffff'
                        }} 
                      />
                    </td>
                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lic.machineId}>
                      {lic.machineId || <span style={{ color: '#94a3b8' }}>Unassigned</span>}
                    </td>
                    <td>{lic.lastVerifiedAt ? format(new Date(lic.lastVerifiedAt), 'PPp') : 'Never'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className={lic.active ? "btn btn-warning" : "btn btn-success"} 
                          onClick={() => toggleActive(lic.id, lic.active)}
                          title={lic.active ? "Disable License" : "Enable License"}
                        >
                          {lic.active ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => reassignMachine(lic.id)}
                          disabled={!lic.machineId}
                          title="Reassign Machine ID"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => deleteLicense(lic.id)}
                          title="Delete License"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
