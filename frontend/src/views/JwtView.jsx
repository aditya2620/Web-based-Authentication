import React, { useState, useEffect } from 'react';

export default function JwtView({ apiCall }) {
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [accessToken, setAccessToken] = useState(localStorage.getItem('jwt_access_token') || '');
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('jwt_refresh_token') || '');
  
  const [profileData, setProfileData] = useState(null);
  const [consoleMsg, setConsoleMsg] = useState({ text: 'Awaiting actions...', type: '' });
  const [animState, setAnimState] = useState('');

  // Expiration countdown
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setTimeLeft(0);
      return;
    }
    
    // Set mock countdown for 60 seconds on login or reset
    // For simplicity, we just count down 60 seconds in UI
    setTimeLeft(60);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [accessToken]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setConsoleMsg({ text: 'Registering...', type: '' });
    try {
      const data = await apiCall('http://localhost:5000/api/auth/jwt/register', {
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
      const data = await apiCall('http://localhost:5000/api/auth/jwt/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Login Error: ${data.error}`, type: 'error' });
        clearTokens();
      } else {
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem('jwt_access_token', data.accessToken);
        localStorage.setItem('jwt_refresh_token', data.refreshToken);
        
        setConsoleMsg({ 
          text: `Success: Logged in!\n\nAccess Token issued (valid for 1 minute to demonstrate refresh rotation).\nRefresh Token issued (valid for 7 days).\nBoth tokens saved to browser LocalStorage.`, 
          type: 'success' 
        });
        
        // Auto fetch profile
        fetchProfile(data.accessToken);
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  const clearTokens = () => {
    setAccessToken('');
    setRefreshToken('');
    localStorage.removeItem('jwt_access_token');
    localStorage.removeItem('jwt_refresh_token');
    setProfileData(null);
  };

  const fetchProfile = async (tokenToUse = accessToken) => {
    if (!tokenToUse) {
      setConsoleMsg({ text: 'No access token found. Please login first.', type: 'error' });
      return;
    }

    setConsoleMsg({ text: 'Fetching profile with Authorization header...', type: '' });
    setAnimState('req');

    try {
      const response = await fetch('http://localhost:5000/api/auth/jwt/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });
      const data = await response.json();
      
      // Update Traffic logs in App.jsx manually since we used raw fetch here to catch the response code
      if (data._traffic && window.__setTraffic) {
        window.__setTraffic(data._traffic);
      }

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
        setConsoleMsg({ 
          text: `Access Token Expired (401 Unauthorized).\nTriggering automatic Refresh Token rotation flow...`, 
          type: 'error' 
        });
        // Auto refresh
        handleRefresh();
      } else if (data.error) {
        setConsoleMsg({ text: `Profile Fetch Failed: ${data.error}`, type: 'error' });
        setProfileData(null);
      } else {
        setProfileData(data);
        setConsoleMsg({ text: 'Successfully authenticated using stateless Bearer JWT!', type: 'success' });
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const handleRefresh = async () => {
    if (!refreshToken) {
      setConsoleMsg({ text: 'No refresh token available to rotate.', type: 'error' });
      return;
    }

    setConsoleMsg({ text: 'Calling /refresh endpoint with refresh token...', type: '' });
    setAnimState('req');

    try {
      const data = await apiCall('http://localhost:5000/api/auth/jwt/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Refresh Failed: ${data.error}. Your session has completely expired, please log in again.`, type: 'error' });
        clearTokens();
      } else {
        setAccessToken(data.accessToken);
        localStorage.setItem('jwt_access_token', data.accessToken);
        setConsoleMsg({ 
          text: `Token Rotated successfully!\nNew Access Token issued: "${data.accessToken.substring(0, 30)}..."\nNow retrying the protected profile request...`, 
          type: 'success' 
        });
        // Auto retry profile fetch with new token
        setTimeout(() => fetchProfile(data.accessToken), 1200);
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const handleLogout = async () => {
    setConsoleMsg({ text: 'Logging out and revoking token...', type: '' });
    setAnimState('req');

    try {
      await apiCall('http://localhost:5000/api/auth/jwt/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      clearTokens();
      setConsoleMsg({ text: 'Tokens removed from local storage and refresh token blacklisted on the server.', type: 'success' });
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
          <span>🔄 Transmit Flow: JWT Token-Based Auth</span>
          <span className="card-title-badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.3)' }}>Stateless</span>
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
            {animState === 'req' && 'Authorization: Bearer header.payload.signature'}
            {animState === 'res' && 'JSON Body: { accessToken, refreshToken }'}
            {animState === '' && 'Awaiting Network Activity'}
          </div>
        </div>
      </div>

      {/* Storage Visualizer */}
      <div className="card">
        <h3 className="card-title">📦 Client Storage Monitor</h3>
        <div className="storage-monitor">
          <div className="storage-badge" style={{ flex: 1.5 }}>
            <span className="storage-badge-title">LocalStorage: jwt_access_token</span>
            {accessToken ? (
              <div className="token-container">
                <span className="token-text" style={{ color: '#c084fc' }}>{accessToken}</span>
                {timeLeft > 0 ? (
                  <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--warning)', fontWeight: 'bold' }}>
                    ⌛ {timeLeft}s
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--error)', fontWeight: 'bold' }}>
                    ❌ Expired
                  </span>
                )}
              </div>
            ) : (
              <span className="storage-badge-value empty">Empty</span>
            )}
          </div>
          <div className="storage-badge">
            <span className="storage-badge-title">LocalStorage: jwt_refresh_token</span>
            {refreshToken ? (
              <div className="token-container">
                <span className="token-text" style={{ color: '#fb7185' }}>{refreshToken}</span>
              </div>
            ) : (
              <span className="storage-badge-value empty">Empty</span>
            )}
          </div>
        </div>
      </div>

      {/* Playground Console */}
      <div className="card">
        <h3 className="card-title">🎮 JWT Auth Playground Console</h3>
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
            <h4 style={{ marginBottom: '12px', color: '#fff' }}>2. Login (Acquire Tokens)</h4>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Login & Issue Tokens</button>
          </form>
        </div>

        {/* Console Box */}
        <div style={{ marginTop: '20px' }}>
          <label>Playground Log Output</label>
          <pre className={`console-box ${consoleMsg.type}`}>{consoleMsg.text}</pre>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button onClick={() => fetchProfile()} className="btn-secondary" style={{ flex: 1 }} disabled={!accessToken}>
            📡 Profile (Bearer Auth)
          </button>
          <button onClick={handleRefresh} className="btn-secondary" style={{ flex: 1 }} disabled={!refreshToken}>
            🔄 Rotate Token (/refresh)
          </button>
          <button onClick={handleLogout} className="btn-danger" style={{ flex: 1 }} disabled={!accessToken}>
            🗑️ Logout & Revoke
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
        <h3 className="card-title">📖 Learning JWT stateless tokens</h3>
        <div className="theory-block">
          <div className="theory-title">How it works</div>
          <div className="theory-desc">
            Token-based authentication is **stateless**. When a user logs in, the server signs a cryptographically secure token (JWT) and returns it. The server does not store the token.
            Instead, the client stores it (often in LocalStorage or an HttpOnly cookie) and attaches it manually in the headers on subsequent requests:
            <br />
            <code>Authorization: Bearer &lt;header&gt;.&lt;payload&gt;.&lt;signature&gt;</code>
            <br />
            The server validates the signature mathematically. Since it doesn't lookup a session database, it's highly performant and horizontally scalable.
          </div>
        </div>

        <div className="theory-block" style={{ marginTop: '16px', borderColor: 'var(--info)' }}>
          <div className="theory-title" style={{ color: 'var(--info)' }}>Access Tokens vs. Refresh Tokens</div>
          <div className="theory-desc" style={{ fontSize: '12.5px' }}>
            To balance security and user experience, token systems employ two tokens:
            <ul>
              <li>**Access Token (short-lived, e.g., 15 mins)**: Used for daily operations, attached to every API request. If stolen, it expires quickly.</li>
              <li>**Refresh Token (long-lived, e.g., 7-30 days)**: Stored securely and only sent to the `/refresh` endpoint to get a *new* access token when the current one expires. Can be blacklisted/revoked on the server.</li>
            </ul>
          </div>
        </div>

        <div className="pros-cons-grid" style={{ marginTop: '16px' }}>
          <div>
            <div className="theory-title" style={{ color: 'var(--success)' }}>Pros</div>
            <ul className="pro-list">
              <li>100% Stateless: Extremely scalable, no database query per request.</li>
              <li>Decoupled APIs: Single token can authenticate requests across different domains / microservices.</li>
              <li>Mobile Friendly: Works perfectly on Native iOS/Android platforms which lack cookie support.</li>
            </ul>
          </div>
          <div>
            <div className="theory-title" style={{ color: 'var(--error)' }}>Cons</div>
            <ul className="con-list">
              <li>**Difficulty revoking access:** Since the server doesn't check database sessions, an active access token cannot be easily revoked until it expires (unless using a blacklist).</li>
              <li>**Token Size:** JWTs can be large since they hold claims, increasing network bandwidth.</li>
              <li>**XSS vulnerability:** If stored in LocalStorage, they can be stolen by malicious scripts via Cross-Site Scripting (XSS).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
