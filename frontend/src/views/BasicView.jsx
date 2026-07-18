import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function BasicView({ apiCall, addLog }) {
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Credentials stored in memory (Base64 string)
  const [storedCredentials, setStoredCredentials] = useState(
    localStorage.getItem('basic_auth_credentials') || ''
  );
  
  const [profileData, setProfileData] = useState(null);
  const [consoleMsg, setConsoleMsg] = useState({ text: 'Awaiting actions...', type: '' });
  const [animState, setAnimState] = useState(''); // 'req' or 'res' or ''

  const handleRegister = async (e) => {
    e.preventDefault();
    setConsoleMsg({ text: 'Registering...', type: '' });
    try {
      const data = await apiCall(`${API_BASE}/api/auth/basic/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, password: regPassword })
      });

      if (data.error) {
        setConsoleMsg({ text: `Registration Error: ${data.error}`, type: 'error' });
      } else {
        setConsoleMsg({ text: `Success: ${data.message}. You can now login.`, type: 'success' });
      }
    } catch (err) {
      setConsoleMsg({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate flow animation
    setAnimState('req');
    setTimeout(() => {
      // Basic Auth uses Base64 encoding: btoa(username:password)
      const credString = `${loginUsername}:${loginPassword}`;
      const base64 = btoa(credString);
      
      setStoredCredentials(base64);
      localStorage.setItem('basic_auth_credentials', base64);
      
      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);
      
      setConsoleMsg({ 
        text: `Login simulation complete.\nCredentials stored in LocalStorage as Base64: "${base64}"\n(In Basic Auth, the server does not issue a token; the client simply starts sending this header.)`, 
        type: 'success' 
      });
      // Trigger a profile fetch automatically to test
      fetchProfile(base64);
    }, 1200);
  };

  const fetchProfile = async (creds = storedCredentials) => {
    if (!creds) {
      setConsoleMsg({ text: 'No credentials stored. Please login first.', type: 'error' });
      return;
    }

    setAnimState('req');
    try {
      const data = await apiCall(`${API_BASE}/api/auth/basic/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${creds}`
        }
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Profile Fetch Failed: ${data.error}`, type: 'error' });
        setProfileData(null);
      } else {
        setProfileData(data);
        setConsoleMsg({ text: 'Profile loaded successfully!', type: 'success' });
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const handleLogout = () => {
    setStoredCredentials('');
    localStorage.removeItem('basic_auth_credentials');
    setProfileData(null);
    setConsoleMsg({ 
      text: 'Credentials removed from browser storage. Basic Auth logout is purely client-side as the server is completely stateless and does not track sessions.', 
      type: 'success' 
    });
  };

  return (
    <div className="theory-container">
      {/* Visual Flow Diagram */}
      <div className="card">
        <h3 className="card-title">
          <span>🔄 Transmit Flow: Basic Authentication</span>
          <span className="card-title-badge">Stateless</span>
        </h3>
        <div className="flow-diagram-container">
          <div className="flow-actors">
            <div className="actor">
              <div className="actor-icon">💻</div>
              <div className="actor-name">Client</div>
            </div>
            <div className="actor">
              <div className="actor-icon">🖥️</div>
              <div className="actor-name">Server</div>
            </div>
          </div>
          <div className="flow-channels">
            {animState === 'req' && <div className="data-packet animate-client-to-server"></div>}
            {animState === 'res' && <div className="data-packet animate-server-to-client" style={{ backgroundColor: 'var(--success)' }}></div>}
          </div>
          <div className="packet-label">
            {animState === 'req' && 'Authorization: Basic Base64(U:P)'}
            {animState === 'res' && 'HTTP 200 OK / 401 Unauthorized'}
            {animState === '' && 'Awaiting Network Activity'}
          </div>
        </div>
      </div>

      {/* Storage Visualizer */}
      <div className="card">
        <h3 className="card-title">📦 Client Storage Monitor</h3>
        <div className="storage-monitor">
          <div className="storage-badge">
            <span className="storage-badge-title">Cookie Storage</span>
            <span className="storage-badge-value empty">None Set</span>
          </div>
          <div className="storage-badge">
            <span className="storage-badge-title">LocalStorage (basic_auth_credentials)</span>
            <span className={`storage-badge-value ${storedCredentials ? 'active' : 'empty'}`}>
              {storedCredentials ? `Basic ${storedCredentials}` : 'Empty'}
            </span>
          </div>
        </div>
      </div>

      {/* Playground Console */}
      <div className="card">
        <h3 className="card-title">🎮 Auth Playground Console</h3>
        <div className="form-grid">
          {/* Register */}
          <form onSubmit={handleRegister} style={{ borderRight: '1px solid var(--border)', paddingRight: '16px' }}>
            <h4 style={{ marginBottom: '12px', color: '#fff' }}>1. Register User</h4>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-secondary" style={{ width: '100%' }}>Register</button>
          </form>

          {/* Login */}
          <form onSubmit={handleLogin} style={{ paddingLeft: '8px' }}>
            <h4 style={{ marginBottom: '12px', color: '#fff' }}>2. Login (Encode Headers)</h4>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Encode & Save Credentials</button>
          </form>
        </div>

        {/* Console Box */}
        <div style={{ marginTop: '20px' }}>
          <label>Playground Log Output</label>
          <pre className={`console-box ${consoleMsg.type}`}>{consoleMsg.text}</pre>
        </div>

        {/* Profile fetch / Logout */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={() => fetchProfile()} className="btn-secondary" style={{ flex: 1 }} disabled={!storedCredentials}>
            📡 Fetch Protected Profile
          </button>
          <button onClick={handleLogout} className="btn-danger" style={{ flex: 1 }} disabled={!storedCredentials}>
            🗑️ Clear Credentials (Logout)
          </button>
        </div>

        {profileData && (
          <div style={{ marginTop: '20px' }}>
            <label>Protected Profile Response</label>
            <pre className="console-box success">{JSON.stringify(profileData, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Guide Details */}
      <div className="card">
        <h3 className="card-title">📖 Learning Basic Authentication</h3>
        <div className="theory-block">
          <div className="theory-title">How it works</div>
          <div className="theory-desc">
            Basic authentication is the simplest protocol defined in the HTTP specification. The client gathers the username and password, joins them with a colon (`username:password`), encodes this string in Base64 format, and places it in the `Authorization` header of every request:
            <br />
            <code>Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=</code>
          </div>
        </div>

        <div className="pros-cons-grid" style={{ marginTop: '16px' }}>
          <div>
            <div className="theory-title" style={{ color: 'var(--success)' }}>Pros</div>
            <ul className="pro-list">
              <li>Extremely simple to implement</li>
              <li>Supported natively by all browsers out-of-the-box</li>
              <li>Completely stateless - no database query needed if using signed/fixed credentials</li>
            </ul>
          </div>
          <div>
            <div className="theory-title" style={{ color: 'var(--error)' }}>Cons</div>
            <ul className="con-list">
              <li>**Insecure without HTTPS:** Credentials are encoded in Base64 (which is easily decoded) rather than encrypted.</li>
              <li>**No Native Logout:** Browsers cache basic auth credentials indefinitely until closed, making logout implementation difficult.</li>
              <li>**Poor User Experience:** If using the browser's native login window, it cannot be styled.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
