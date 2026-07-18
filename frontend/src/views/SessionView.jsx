import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function SessionView({ apiCall }) {
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [profileData, setProfileData] = useState(null);
  const [consoleMsg, setConsoleMsg] = useState({ text: 'Awaiting actions...', type: '' });
  const [animState, setAnimState] = useState('');
  
  // Since HttpOnly cookies cannot be read by JS, we store loggedInState in React state
  // based on successful API responses, demonstrating why JS cannot steal HttpOnly cookies.
  const [isSessionActive, setIsSessionActive] = useState(
    localStorage.getItem('session_is_active') === 'true'
  );

  const handleRegister = async (e) => {
    e.preventDefault();
    setConsoleMsg({ text: 'Registering...', type: '' });
    try {
      const data = await apiCall(`${API_BASE}/api/auth/session/register`, {
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setConsoleMsg({ text: 'Logging in...', type: '' });
    setAnimState('req');
    
    try {
      // NOTE: We must pass credentials: 'include' to allow cookies to be saved in a cross-origin setting
      const data = await apiCall(`${API_BASE}/api/auth/session/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Login Error: ${data.error}`, type: 'error' });
        setIsSessionActive(false);
        localStorage.removeItem('session_is_active');
      } else {
        setConsoleMsg({ 
          text: `Success: ${data.message}\n\nNotice: An HTTP-Only cookie named 'sessionId' was sent in the response headers. Your browser has stored it securely in its cookie jar. Because it is 'HttpOnly', React cannot read it via document.cookie, protecting it from cross-site scripting (XSS)!`, 
          type: 'success' 
        });
        setIsSessionActive(true);
        localStorage.setItem('session_is_active', 'true');
        // Fetch profile
        fetchProfile();
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  const fetchProfile = async () => {
    setConsoleMsg({ text: 'Fetching profile...', type: '' });
    setAnimState('req');

    try {
      const data = await apiCall(`${API_BASE}/api/auth/session/profile`, {
        method: 'GET'
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Failed to fetch profile: ${data.error}\n(If you logged in, make sure third-party cookies are allowed or credentials are included.)`, type: 'error' });
        setProfileData(null);
        setIsSessionActive(false);
        localStorage.removeItem('session_is_active');
      } else {
        setProfileData(data);
        setConsoleMsg({ text: 'Successfully authenticated using Cookie Session ID!', type: 'success' });
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const handleLogout = async () => {
    setConsoleMsg({ text: 'Logging out...', type: '' });
    setAnimState('req');

    try {
      const data = await apiCall(`${API_BASE}/api/auth/session/logout`, {
        method: 'POST'
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      setProfileData(null);
      setIsSessionActive(false);
      localStorage.removeItem('session_is_active');
      setConsoleMsg({ text: 'Session destroyed. Cookie cleared.', type: 'success' });
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Logout error: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="theory-container">
      {/* Visual Flow Diagram */}
      <div className="card">
        <h3 className="card-title">
          <span>🔄 Transmit Flow: Session-Based (Cookie) Auth</span>
          <span className="card-title-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.3)' }}>Stateful</span>
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
            {animState === 'req' && 'Cookie: sessionId=uuid-1234'}
            {animState === 'res' && 'Set-Cookie: sessionId=uuid-1234; HttpOnly'}
            {animState === '' && 'Awaiting Network Activity'}
          </div>
        </div>
      </div>

      {/* Storage Visualizer */}
      <div className="card">
        <h3 className="card-title">📦 Client Storage Monitor</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Notice how the Cookie store is managed by the browser. If active, the browser sends the session cookie automatically on requests to port 5000.
        </p>
        <div className="storage-monitor">
          <div className="storage-badge">
            <span className="storage-badge-title">Browser Cookie Jar (sessionId)</span>
            <span className={`storage-badge-value ${isSessionActive ? 'active' : 'empty'}`}>
              {isSessionActive ? '🍪 Set (HttpOnly - Hidden from JavaScript)' : 'Empty / Cleared'}
            </span>
          </div>
          <div className="storage-badge">
            <span className="storage-badge-title">LocalStorage</span>
            <span className="storage-badge-value empty">None stored</span>
          </div>
        </div>
      </div>

      {/* Playground Console */}
      <div className="card">
        <h3 className="card-title">🎮 Session Auth Playground Console</h3>
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
            <h4 style={{ marginBottom: '12px', color: '#fff' }}>2. Login (Acquire Cookie)</h4>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Login & Set Cookie</button>
          </form>
        </div>

        {/* Console Box */}
        <div style={{ marginTop: '20px' }}>
          <label>Playground Log Output</label>
          <pre className={`console-box ${consoleMsg.type}`}>{consoleMsg.text}</pre>
        </div>

        {/* Profile fetch / Logout */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={fetchProfile} className="btn-secondary" style={{ flex: 1 }} disabled={!isSessionActive}>
            📡 Fetch Profile (Auto-sends Cookies)
          </button>
          <button onClick={handleLogout} className="btn-danger" style={{ flex: 1 }} disabled={!isSessionActive}>
            🗑️ Clear Cookie (Logout)
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
        <h3 className="card-title">📖 Learning Session-based Cookie Authentication</h3>
        <div className="theory-block">
          <div className="theory-title">How it works</div>
          <div className="theory-desc">
            Session-based authentication is **stateful**. When a user logs in, the server creates a unique session record in memory/database. It returns a `sessionId` to the client in a `Set-Cookie` response header.
            The browser stores this cookie and **automatically attaches it** to every subsequent request to that domain. The server reads the cookie and queries the session store to authorize the user.
          </div>
        </div>

        <div className="theory-block" style={{ marginTop: '16px', borderColor: 'var(--warning)' }}>
          <div className="theory-title" style={{ color: 'var(--warning)' }}>Crucial Security Flags for Cookies</div>
          <div className="theory-desc" style={{ fontSize: '12.5px' }}>
            To secure session cookies, they must be configured with:
            <ul>
              <li>**`HttpOnly`**: Blocks client-side scripts (React/JS) from reading `document.cookie`. This makes cookies highly resilient to XSS (Cross-Site Scripting) token theft.</li>
              <li>**`Secure`**: Directs the browser to only transmit the cookie over encrypted (HTTPS) connections.</li>
              <li>**`SameSite=Lax/Strict`**: Mitigates CSRF (Cross-Site Request Forgery) attacks by ensuring the cookie is not sent along with cross-site requests (e.g., clicking malicious external links).</li>
            </ul>
          </div>
        </div>

        <div className="pros-cons-grid" style={{ marginTop: '16px' }}>
          <div>
            <div className="theory-title" style={{ color: 'var(--success)' }}>Pros</div>
            <ul className="pro-list">
              <li>Excellent security: `HttpOnly` completely locks out scripts from stealing the session token</li>
              <li>Easy revocation: The server can invalidate a session instantly by deleting it from the DB</li>
              <li>Native browser support: No complex front-end storage handling is required</li>
            </ul>
          </div>
          <div>
            <div className="theory-title" style={{ color: 'var(--error)' }}>Cons</div>
            <ul className="con-list">
              <li>**Scalability bottleneck:** Stateful storage requires DB hits or cache queries on every single request.</li>
              <li>**CORS issues:** Managing cookies across multiple subdomains/ports requires careful setup.</li>
              <li>**CSRF risk:** Because cookies are sent automatically, sites are vulnerable to CSRF if `SameSite` flags are misconfigured.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
