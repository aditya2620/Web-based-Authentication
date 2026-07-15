import React, { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function PasskeyView({ apiCall, addLog }) {
  const [username, setUsername] = useState('');
  
  const [profileData, setProfileData] = useState(null);
  const [consoleMsg, setConsoleMsg] = useState({ text: 'Awaiting actions...', type: '' });
  const [animState, setAnimState] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Read session active status from cookies (indirectly monitored by state)
  const [isSessionActive, setIsSessionActive] = useState(
    localStorage.getItem('session_is_active') === 'true'
  );

  const handleRegisterPasskey = async (e) => {
    e.preventDefault();
    if (!username) {
      setConsoleMsg({ text: 'Please enter a username first.', type: 'error' });
      return;
    }

    setConsoleMsg({ text: 'Requesting registration options from server...', type: '' });
    setAnimState('req');

    try {
      // 1. Fetch options from server
      const options = await apiCall(`http://localhost:5000/api/auth/webauthn/register-options?username=${encodeURIComponent(username)}`, {
        method: 'GET'
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (options.error) {
        setConsoleMsg({ text: `Options Generation Failed: ${options.error}`, type: 'error' });
        return;
      }

      setConsoleMsg({ text: 'Options received. Launching browser biometrics prompt (TouchID/FaceID/Windows Hello)...', type: 'info' });

      // 2. Trigger browser authenticator prompt
      let attestationResponse;
      try {
        attestationResponse = await startRegistration(options);
      } catch (promptErr) {
        console.error(promptErr);
        setConsoleMsg({ text: `Browser Prompt Cancelled or Failed: ${promptErr.message}`, type: 'error' });
        return;
      }

      setConsoleMsg({ text: 'Biometric signature verified by hardware. Sending attestation to server for verification...', type: 'info' });
      setAnimState('req');

      // 3. Send response back to server for verification
      const verifyResult = await apiCall('http://localhost:5000/api/auth/webauthn/register-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credential: attestationResponse })
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (verifyResult.error) {
        setConsoleMsg({ text: `Passkey Registration Failed: ${verifyResult.error}`, type: 'error' });
      } else {
        setConsoleMsg({ 
          text: `Success: ${verifyResult.message}\n\nPasskey registered! The server has saved your credential ID and public key. You can now login using biometrics without ever typing a password.`, 
          type: 'success' 
        });
        setIsRegistered(true);
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const handleLoginPasskey = async (e) => {
    e.preventDefault();
    if (!username) {
      setConsoleMsg({ text: 'Please enter a username to fetch credential choices.', type: 'error' });
      return;
    }

    setConsoleMsg({ text: 'Requesting authentication challenge from server...', type: '' });
    setAnimState('req');

    try {
      // 1. Fetch options from server
      const options = await apiCall(`http://localhost:5000/api/auth/webauthn/login-options?username=${encodeURIComponent(username)}`, {
        method: 'GET'
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (options.error) {
        setConsoleMsg({ text: `Options Generation Failed: ${options.error}`, type: 'error' });
        return;
      }

      setConsoleMsg({ text: 'Challenge received. Launching hardware authenticator assertion prompt...', type: 'info' });

      // 2. Trigger browser authenticator assertion prompt
      let assertionResponse;
      try {
        assertionResponse = await startAuthentication(options);
      } catch (promptErr) {
        console.error(promptErr);
        setConsoleMsg({ text: `Browser Prompt Cancelled or Failed: ${promptErr.message}`, type: 'error' });
        return;
      }

      setConsoleMsg({ text: 'Challenge signed. Sending assertion response to server for verification...', type: 'info' });
      setAnimState('req');

      // 3. Send response back to server for verification
      const verifyResult = await apiCall('http://localhost:5000/api/auth/webauthn/login-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credential: assertionResponse })
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (verifyResult.error) {
        setConsoleMsg({ text: `Passkey Authentication Failed: ${verifyResult.error}`, type: 'error' });
      } else {
        setConsoleMsg({ 
          text: `Success: ${verifyResult.message}\n\nPasskey verified! A session cookie has been established. Fetching profile...`, 
          type: 'success' 
        });
        setIsSessionActive(true);
        localStorage.setItem('session_is_active', 'true');
        
        // Auto-fetch profile
        fetchProfile();
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const fetchProfile = async () => {
    setConsoleMsg({ text: 'Fetching profile using session cookie...', type: '' });
    setAnimState('req');

    try {
      const data = await apiCall('http://localhost:5000/api/auth/session/profile', {
        method: 'GET'
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      if (data.error) {
        setConsoleMsg({ text: `Failed to fetch profile: ${data.error}`, type: 'error' });
        setProfileData(null);
        setIsSessionActive(false);
        localStorage.removeItem('session_is_active');
      } else {
        setProfileData(data);
        setConsoleMsg({ text: 'Successfully authenticated profile using WebAuthn session cookie!', type: 'success' });
      }
    } catch (err) {
      setAnimState('');
      setConsoleMsg({ text: `Network Error: ${err.message}`, type: 'error' });
    }
  };

  const handleLogout = async () => {
    setConsoleMsg({ text: 'Clearing session...', type: '' });
    setAnimState('req');

    try {
      await apiCall('http://localhost:5000/api/auth/session/logout', {
        method: 'POST'
      });

      setAnimState('res');
      setTimeout(() => setAnimState(''), 1000);

      setProfileData(null);
      setIsSessionActive(false);
      localStorage.removeItem('session_is_active');
      setConsoleMsg({ text: 'Logged out. Passkey session cleared.', type: 'success' });
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
          <span>🔄 Transmit Flow: WebAuthn / Passkeys</span>
          <span className="card-title-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.3)' }}>Asymmetric Cryptography</span>
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
            {animState === 'req' && 'Assertion: Signature(Challenge, Origin)'}
            {animState === 'res' && 'Options: Challenge + RP ID'}
            {animState === '' && 'Awaiting Network Activity'}
          </div>
        </div>
      </div>

      {/* Storage Visualizer */}
      <div className="card">
        <h3 className="card-title">📦 Client Storage Monitor</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Passkeys store the **private key** inside your device's hardware authenticator. JavaScript has **zero access** to the private key.
        </p>
        <div className="storage-monitor">
          <div className="storage-badge">
            <span className="storage-badge-title">Browser Cookie Jar</span>
            <span className={`storage-badge-value ${isSessionActive ? 'active' : 'empty'}`}>
              {isSessionActive ? '🍪 Cookie Active' : 'Empty'}
            </span>
          </div>
          <div className="storage-badge">
            <span className="storage-badge-title">Device Hardware</span>
            <span className="storage-badge-value active" style={{ color: 'var(--primary)' }}>
              🔑 Secure Enclave Keypair
            </span>
          </div>
        </div>
      </div>

      {/* Playground Console */}
      <div className="card">
        <h3 className="card-title">🎮 Passkey Playground Console</h3>
        
        <div className="form-group">
          <label>Enter Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            placeholder="Type username (e.g. aditya)"
            required 
          />
        </div>

        <div className="form-grid">
          <button onClick={handleRegisterPasskey} className="btn-secondary">
            🆕 1. Register Passkey
          </button>
          <button onClick={handleLoginPasskey} className="btn-primary">
            🔑 2. Login with Passkey
          </button>
        </div>

        {/* Console Box */}
        <div style={{ marginTop: '20px' }}>
          <label>Playground Log Output</label>
          <pre className={`console-box ${consoleMsg.type}`}>{consoleMsg.text}</pre>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={fetchProfile} className="btn-secondary" style={{ flex: 1 }} disabled={!isSessionActive}>
            📡 Profile (Session Cookie)
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
        <h3 className="card-title">📖 Learning Passkeys & WebAuthn</h3>
        <div className="theory-block">
          <div className="theory-title">Asymmetric Public Key Cryptography</div>
          <div className="theory-desc" style={{ fontSize: '12.5px' }}>
            Passkeys (built on the WebAuthn standard) replace shared secrets (passwords) with asymmetric keypairs:
            <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
              <li>**Private Key**: Created and stored securely inside the user's hardware device (Secure Enclave, YubiKey). It never leaves the device.</li>
              <li>**Public Key**: Registered on the application server.</li>
              <li>**Authentication**: The server sends a random `challenge`. The client prompts the user for biometrics (TouchID/FaceID) to unlock the private key, signs the challenge, and returns it. The server verifies it using the public key.</li>
            </ul>
          </div>
        </div>

        <div className="pros-cons-grid" style={{ marginTop: '16px' }}>
          <div>
            <div className="theory-title" style={{ color: 'var(--success)' }}>Pros</div>
            <ul className="pro-list">
              <li>**Phishing Resistant**: Authenticators bind credentials to the specific domain name (RP ID). The browser will never sign a challenge for `fake-domain.com`.</li>
              <li>**Zero Password Leaks**: Since passwords don't exist, a server database breach cannot leak credentials.</li>
              <li>**User Convenience**: One-touch biometric login, no typing required.</li>
            </ul>
          </div>
          <div>
            <div className="theory-title" style={{ color: 'var(--error)' }}>Cons</div>
            <ul className="con-list">
              <li>**Implementation complexity**: Requires handling complex binary encodings, buffer exchanges, and cryptographic assertions.</li>
              <li>**Device Lock-in**: Syncing keys across different platforms (Apple ecosystem vs. Android/Windows) can be tricky (though resolved by hybrid cloud keychain syncing).</li>
              <li>**Fallback systems**: Still requires design of secondary recovery auth mechanisms.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
