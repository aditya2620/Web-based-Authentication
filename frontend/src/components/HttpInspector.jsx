import React from 'react';

export default function HttpInspector({ traffic }) {
  if (!traffic) {
    return (
      <div className="inspector-pane">
        <div className="inspector-header">
          <div className="inspector-title">
            <span>⚡ HTTP Traffic Inspector</span>
          </div>
        </div>
        <div className="traffic-placeholder">
          <div className="traffic-placeholder-icon">📡</div>
          <h3>Awaiting Traffic</h3>
          <p>Interact with the playground forms (Register, Login, Profile, etc.) to capture and inspect live HTTP request & response telemetry.</p>
        </div>
      </div>
    );
  }

  const { request, response } = traffic;
  const isSuccess = response.status >= 200 && response.status < 300;
  
  // Format JSON safely
  const formatJSON = (data) => {
    if (!data) return 'None';
    // Remove traffic telemetry from display to keep it clean
    const displayData = { ...data };
    delete displayData._traffic;
    if (Object.keys(displayData).length === 0) return '{}';
    return JSON.stringify(displayData, null, 2);
  };

  return (
    <div className="inspector-pane">
      <div className="inspector-header">
        <div className="inspector-title">
          <span>⚡ Live Capture</span>
        </div>
        <div>
          <span className={`req-res-badge status-${isSuccess ? '2xx' : '4xx'}`}>
            HTTP {response.status}
          </span>
        </div>
      </div>
      
      <div className="inspector-body">
        {/* REQUEST SECTION */}
        <div className="exchange-card">
          <h4 className="headers-section-title">
            <span className="req-res-badge req">Request</span>
            HTTP Transmit
          </h4>
          <div className="http-line">
            <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{request.method}</span>
            <span style={{ color: '#e2e8f0' }}>{request.url}</span>
          </div>
          
          <div className="headers-section-title">Headers</div>
          <div className="headers-table">
            {Object.entries(request.headers).map(([key, val]) => (
              <div className="header-row" key={key}>
                <div className="header-name">{key}</div>
                <div className="header-value">{val}</div>
              </div>
            ))}
          </div>

          {Object.keys(request.cookies || {}).length > 0 && (
            <>
              <div className="headers-section-title">Request Cookies</div>
              <div className="headers-table">
                {Object.entries(request.cookies).map(([key, val]) => (
                  <div className="header-row" key={key}>
                    <div className="header-name" style={{ color: '#fb923c' }}>{key}</div>
                    <div className="header-value">{val}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {request.body && Object.keys(request.body).length > 0 && (
            <>
              <div className="headers-section-title">Payload (JSON)</div>
              <pre className="console-box">{formatJSON(request.body)}</pre>
            </>
          )}
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '10px 0' }} />

        {/* RESPONSE SECTION */}
        <div className="exchange-card">
          <h4 className="headers-section-title">
            <span className="req-res-badge res">Response</span>
            HTTP Receive
          </h4>
          
          <div className="headers-section-title">Headers</div>
          <div className="headers-table">
            {Object.entries(response.headers).map(([key, val]) => (
              <div className="header-row" key={key}>
                <div className="header-name">{key}</div>
                <div className="header-value">{String(val)}</div>
              </div>
            ))}
          </div>

          {response.body && (
            <>
              <div className="headers-section-title">Body (JSON)</div>
              <pre className="console-box">{formatJSON(response.body)}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
