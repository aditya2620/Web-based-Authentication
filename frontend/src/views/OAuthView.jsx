import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function OAuthView({ apiCall, addLog }) {
  const [oauthToken, setOauthToken] = useState(localStorage.getItem('oauth_access_token') || '');
  const [userInfo, setUserInfo] = useState(null);
  const [consoleMsg, setConsoleMsg] = useState({ text: 'Awaiting actions...', type: '' });
  const [animState, setAnimState] = useState('');
  
  const CLIENT_ID = 'client-explorer-id';
  const CLIENT_SECRET = 'client-explorer-secret';
  const REDIRECT_URI = window.location.origin + '/auth/oauth/callback';

  // Check URL parameters for Authorization Code (OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code) {
      // Clear URL query parameters so they don't linger
      window.history.replaceState({}, document.title, window.location.pathname);
      
      exchangeCodeForToken(code);
    }
  }, []);

  const initiateOAuthRedirect = () => {
    const state = Math.random().toString(36).substring(7);
    const authUrl = `${API_BASE}/api/auth/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=profile&` +
      `state=${state}`;

    setConsoleMsg({ text: `Redirecting user to Authorization Server:\n${authUrl}`, type: 'info' });
    
    // Simulate flow and redirect
    setAnimState('req');
    setTimeout(() => {
      window.location.href = authUrl;
    }, 1000);
  };

  const exchangeCodeForToken = async (code) => {
    setConsoleMsg({ 
      text: `Captured Authorization Code from URL: "${code}"\n\nInitiating step 3: Exchanging authorization code for access token via backend POST /token...`, 
      type: 'info' 
    });
    setAnimState('req');

    try {
      // Exchanging authorization code for access token (This is typically done backend-to-backend for security)
      const response = await fetch(`${API_BASE}/api/auth/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        })
      });

      const data = await response.json();
      
      // Manually feed the http traffic monitor
      if (data._traffic && window.__setTraffic) {
        window.__setTraffic(data._traffic);
      }

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Token Exchange Error: ${data.error} - ${data.message || ''}`, type: 'error' });
      } else {
        const token = data.access_token;
        setOauthToken(token);
        localStorage.setItem('oauth_access_token', token);
        setConsoleMsg({ 
          text: `Success: Access Token issued!\nToken: "${token}"\n\nNow fetching user profile details from Resource Server /userinfo...`, 
          type: 'success' 
        });
        
        // Fetch User Info automatically
        fetchUserInfo(token);
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const fetchUserInfo = async (token = oauthToken) => {
    if (!token) {
      setConsoleMsg({ text: 'No OAuth token found. Please trigger login first.', type: 'error' });
      return;
    }

    setConsoleMsg({ text: 'Calling Resource Server /userinfo with Authorization header...', type: '' });
    setAnimState('req');

    try {
      const data = await apiCall(`${API_BASE}/api/auth/oauth/userinfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Failed to fetch UserInfo: ${data.error}`, type: 'error' });
        setUserInfo(null);
        clearOAuth();
      } else {
        setUserInfo(data);
        setConsoleMsg({ text: 'UserInfo loaded successfully from identity provider!', type: 'success' });
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network error: ${err.message}`, type: 'error' });
    }
  };

  const clearOAuth = () => {
    setOauthToken('');
    localStorage.removeItem('oauth_access_token');
    setUserInfo(null);
    setConsoleMsg({ text: 'OAuth tokens cleared locally. Session removed.', type: 'success' });
  };

  return (
    <div className="theory-container">
      {/* Visual Flow Diagram */}
      <div className="card">
        <h3 className="card-title">
          <span>🔄 Transmit Flow: OAuth 2.0 Authorization Code</span>
          <span className="card-title-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#7dd3fc', borderColor: 'rgba(14, 165, 233, 0.3)' }}>Delegated</span>
        </h3>
        <div className="flow-diagram-container">
          <div className="flow-actors">
            <div className="actor">
              <div className="actor-icon">💻</div>
              <div className="actor-name">Client App</div>
            </div>
            <div className="actor">
              <div className="actor-icon">🔒</div>
              <div className="actor-name">Auth Server</div>
            </div>
          </div>
          <div className="flow-channels">
            {animState === 'req' && <div className="data-packet animate-client-to-server"></div>}
            {animState === 'res' && <div className="data-packet animate-server-to-client" style={{ backgroundColor: 'var(--success)' }}></div>}
          </div>
          <div className="packet-label">
            {animState === 'req' && 'POST /token (code + secret)'}
            {animState === 'res' && 'JSON Body: { access_token }'}
            {animState === '' && 'Awaiting Network Activity'}
          </div>
        </div>
      </div>

      {/* Storage Visualizer */}
      <div className="card">
        <h3 className="card-title">📦 Client Storage Monitor</h3>
        <div className="storage-monitor">
          <div className="storage-badge" style={{ flex: 1.5 }}>
            <span className="storage-badge-title">LocalStorage: oauth_access_token</span>
            <span className={`storage-badge-value ${oauthToken ? 'active' : 'empty'}`}>
              {oauthToken ? `Bearer ${oauthToken}` : 'Empty'}
            </span>
          </div>
          <div className="storage-badge">
            <span className="storage-badge-title">Cookie Storage</span>
            <span className="storage-badge-value empty">None</span>
          </div>
        </div>
      </div>

      {/* Playground Console */}
      <div className="card">
        <h3 className="card-title">🎮 OAuth 2.0 Playground Console</h3>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          This playground runs a fully local OAuth 2.0 Authorization Server. Clicking "Login" will redirect your browser to the local Identity Provider login screen.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>CLIENT APP DETAILS</label>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              Client ID: <span style={{ color: '#fff' }}>{CLIENT_ID}</span><br />
              Client Secret: <span style={{ color: '#fff' }}>{CLIENT_SECRET}</span><br />
              Callback URI: <span style={{ color: '#fff' }}>{REDIRECT_URI}</span>
            </div>
          </div>
        </div>

        {!oauthToken ? (
          <button onClick={initiateOAuthRedirect} className="btn-primary">
            🔐 Log In with Simulated OAuth Provider
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => fetchUserInfo()} className="btn-secondary" style={{ flex: 1 }}>
              📡 Call Resource /userinfo
            </button>
            <button onClick={clearOAuth} className="btn-danger" style={{ flex: 1 }}>
              🗑️ Revoke Token & Reset
            </button>
          </div>
        )}

        {/* Console Box */}
        <div style={{ marginTop: '20px' }}>
          <label>Playground Log Output</label>
          <pre className={`console-box ${consoleMsg.type}`}>{consoleMsg.text}</pre>
        </div>

        {userInfo && (
          <div style={{ marginTop: '20px' }}>
            <label>UserInfo Response (/userinfo)</label>
            <pre className="console-box success">{JSON.stringify(userInfo, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Guide Details */}
      <div className="card">
        <h3 className="card-title">📖 Learning OAuth 2.0 & OIDC</h3>
        <div className="theory-block">
          <div className="theory-title">How the Authorization Code Flow Works</div>
          <div className="theory-desc" style={{ fontSize: '12.5px' }}>
            The Authorization Code flow is the secure, recommended flow for web applications:
            <ol style={{ paddingLeft: '20px', marginTop: '6px' }}>
              <li>**Redirect to Provider**: Client redirects browser to Authorization Server, passing client ID and request parameters.</li>
              <li>**User Consent**: User authenticates with the Provider and approves scope access.</li>
              <li>**Callback with Code**: Server redirects browser back to Client callback URI, passing an `authorization_code`.</li>
              <li>**Token Exchange**: Client backend exchanges the `authorization_code` and client secret for an `access_token` via POST.</li>
              <li>**Access Resource**: Client requests user details using the access token in headers.</li>
            </ol>
          </div>
        </div>

        <div className="pros-cons-grid" style={{ marginTop: '16px' }}>
          <div>
            <div className="theory-title" style={{ color: 'var(--success)' }}>Pros</div>
            <ul className="pro-list">
              <li>**Security**: Client credentials (secret) are never exposed to the browser.</li>
              <li>**Delegated Access**: Users can log in using trusted platforms (like Google, GitHub) without creating a new password.</li>
              <li>**Unified Auth**: The Authorization Server acts as a single source of identity.</li>
            </ul>
          </div>
          <div>
            <div className="theory-title" style={{ color: 'var(--error)' }}>Cons</div>
            <ul className="con-list">
              <li>**Complexity**: Multi-step flow involving redirects, codes, secrets, and backchannel requests.</li>
              <li>**Dependence**: Application is reliant on the availability and uptime of the identity provider.</li>
              <li>**Setup Overhead**: Requires registering clients and configuring callbacks with each provider.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
