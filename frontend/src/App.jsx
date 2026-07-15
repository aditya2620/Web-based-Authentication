import React, { useState, useEffect } from 'react';
import HttpInspector from './components/HttpInspector';
import BasicView from './views/BasicView';
import SessionView from './views/SessionView';
import JwtView from './views/JwtView';
import OAuthView from './views/OAuthView';
import PasskeyView from './views/PasskeyView';

export default function App() {
  const [activeTab, setActiveTab] = useState('basic');
  const [traffic, setTraffic] = useState(null);

  // Automatically check if there is an OAuth callback in the URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      setActiveTab('oauth');
    }
  }, []);

  // Expose setTraffic globally so sub-components can manual log traffic if using raw fetch
  useEffect(() => {
    window.__setTraffic = setTraffic;
    return () => {
      window.__setTraffic = null;
    };
  }, []);

  // Custom fetch wrapper that automatically captures and extracts HTTP traffic log metadata
  const apiCall = async (url, options = {}) => {
    // Add credentials: 'include' for cookie support across ports 5173 -> 5000
    const finalOptions = {
      ...options,
      credentials: options.credentials || 'include',
    };

    try {
      const response = await fetch(url, finalOptions);
      const data = await response.json();

      // If the backend has attached traffic telemetry, log it to the inspector
      if (data._traffic) {
        setTraffic(data._traffic);
      }

      return data;
    } catch (err) {
      console.error('API Call Error:', err);
      throw err;
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Auth' },
    { id: 'session', label: 'Session Cookie' },
    { id: 'jwt', label: 'JWT Stateless' },
    { id: 'oauth', label: 'OAuth 2.0 / OIDC' },
    { id: 'passkey', label: 'Passkeys / WebAuthn' }
  ];

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">🔑</div>
          <div className="logo-text">Web Authentication Explorer</div>
        </div>
        
        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Backend: <span style={{ color: 'var(--success)' }}>Online</span>
        </div>
      </header>

      {/* Main split grid */}
      <main className="dashboard-grid">
        <section className="content-pane">
          {activeTab === 'basic' && <BasicView apiCall={apiCall} />}
          {activeTab === 'session' && <SessionView apiCall={apiCall} />}
          {activeTab === 'jwt' && <JwtView apiCall={apiCall} />}
          {activeTab === 'oauth' && <OAuthView apiCall={apiCall} />}
          {activeTab === 'passkey' && <PasskeyView apiCall={apiCall} />}
        </section>

        <section className="inspector-pane">
          <HttpInspector traffic={traffic} />
        </section>
      </main>
    </div>
  );
}
