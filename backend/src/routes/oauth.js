import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

export const oauthRouter = Router();

// 1. Authorization Endpoint - GET /authorize
// Renders a consent page. In a real OAuth flow, this is hosted by the Identity Provider.
oauthRouter.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;

  // Validate client
  const client = db.oauth.clients.get(client_id);
  if (!client) {
    return res.status(400).send('OAuth Error: Invalid client_id');
  }

  if (redirect_uri !== client.redirectUri) {
    return res.status(400).send('OAuth Error: Redirect URI mismatch');
  }

  if (response_type !== 'code') {
    return res.status(400).send('OAuth Error: Only authorization code flow ("code") is supported');
  }

  // Render a clean, stylized consent screen using standard HTML/CSS.
  // Using modern styling matching our project's premium design aesthetics.
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authorize App</title>
      <style>
        :root {
          --bg: #0d0f12;
          --panel: #161a22;
          --border: #222a36;
          --text: #f0f3f6;
          --text-muted: #8b949e;
          --primary: #4f46e5;
          --primary-hover: #6366f1;
          --danger: #ef4444;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background-color: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 32px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }
        h2 {
          margin-top: 0;
          font-size: 24px;
          font-weight: 600;
          text-align: center;
        }
        p {
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.5;
          text-align: center;
          margin-bottom: 24px;
        }
        .client-info {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px dashed var(--border);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 24px;
          text-align: center;
        }
        .client-name {
          color: var(--primary-hover);
          font-weight: bold;
        }
        .form-group {
          margin-bottom: 16px;
        }
        label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          color: var(--text-muted);
        }
        input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background-color: #0b0d11;
          color: var(--text);
          font-size: 14px;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .scope-badge {
          display: inline-block;
          background: rgba(79, 70, 229, 0.15);
          border: 1px solid rgba(79, 70, 229, 0.3);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #a5b4fc;
          font-family: monospace;
          margin-top: 4px;
        }
        .actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        button {
          flex: 1;
          padding: 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        .btn-approve {
          background-color: var(--primary);
          color: #ffffff;
        }
        .btn-approve:hover {
          background-color: var(--primary-hover);
        }
        .btn-deny {
          background-color: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .btn-deny:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Authorize Access</h2>
        <div class="client-info">
          The application <span class="client-name">Web Auth Explorer (Client ID: ${client_id})</span> wants to access your account.
        </div>
        <p>Requested Scope: <br><span class="scope-badge">${scope || 'profile'}</span></p>
        
        <form action="/api/auth/oauth/approve" method="POST">
          <!-- Pass query parameters to POST -->
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="scope" value="${scope || 'profile'}">
          <input type="hidden" name="state" value="${state || ''}">
          
          <div class="form-group">
            <label for="username">OAuth Provider Username</label>
            <input type="text" id="username" name="username" placeholder="Enter username" required>
          </div>
          
          <div class="form-group">
            <label for="password">OAuth Provider Password</label>
            <input type="password" id="password" name="password" placeholder="Enter password" required>
          </div>
          
          <div class="actions">
            <button type="button" class="btn-deny" onclick="window.location.href='${redirect_uri}?error=access_denied&state=${state || ''}'">Deny</button>
            <button type="submit" class="btn-approve">Approve & Authorize</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// 2. Form Submission Endpoint - POST /approve
// Validates credentials and generates the Auth Code, then redirects back to the client callback url.
oauthRouter.post('/approve', (req, res) => {
  const { client_id, redirect_uri, scope, state, username, password } = req.body;

  // Validate client
  const client = db.oauth.clients.get(client_id);
  if (!client || redirect_uri !== client.redirectUri) {
    return res.status(400).send('OAuth Error: Client credentials/URI mismatch');
  }

  // Authenticate user against mock DB
  // First register user if they don't exist, just for ease of learning
  let user = db.users.get(username);
  if (!user) {
    // Auto-register user for OAuth provider just to prevent friction
    db.users.set(username, { username, password, passkeys: [] });
    user = db.users.get(username);
  } else if (user.password !== password) {
    return res.send(`
      <div style="background:#161a22; color:#f0f3f6; padding:20px; font-family:sans-serif; text-align:center; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <h3>Authentication Failed</h3>
        <p>Invalid credentials for the user.</p>
        <button onclick="window.history.back()" style="padding:10px 20px; background:#4f46e5; border:none; color:white; border-radius:5px; cursor:pointer;">Try Again</button>
      </div>
    `);
  }

  // Generate an authorization code
  const code = crypto.randomBytes(16).toString('hex');
  
  // Store authorization code (expires in 5 minutes)
  db.oauth.codes.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    username,
    scope,
    expiresAt: Date.now() + 300000 // 5 mins
  });

  // Redirect client back with code and state
  res.redirect(`${redirect_uri}?code=${code}&state=${state || ''}`);
});

// 3. Token Exchange Endpoint - POST /token
// Client application sends Authorization Code to exchange for Access Token.
oauthRouter.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  // Validate Client Credentials
  const client = db.oauth.clients.get(client_id);
  if (!client) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  // Check secret
  if (client.clientSecret !== client_secret) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  // Validate Authorization Code
  const codeRecord = db.oauth.codes.get(code);
  if (!codeRecord) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Code not found' });
  }

  if (Date.now() > codeRecord.expiresAt) {
    db.oauth.codes.delete(code);
    return res.status(400).json({ error: 'invalid_grant', message: 'Code expired' });
  }

  if (codeRecord.clientId !== client_id || codeRecord.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Parameters mismatch' });
  }

  // Burn code (single-use guarantee)
  db.oauth.codes.delete(code);

  // Generate Access Token (simulated)
  const accessToken = `oauth_access_token_${crypto.randomBytes(24).toString('hex')}`;
  
  db.oauth.accessTokens.set(accessToken, {
    username: codeRecord.username,
    scope: codeRecord.scope,
    expiresAt: Date.now() + 3600000 // 1 hour
  });

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: codeRecord.scope
  });
});

// 4. Resource Owner Info Endpoint - GET /userinfo
// Client calls this with Bearer token to get user profile details.
oauthRouter.get('/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token', message: 'Bearer access token required' });
  }

  const token = authHeader.split(' ')[1];
  const tokenRecord = db.oauth.accessTokens.get(token);

  if (!tokenRecord) {
    return res.status(401).json({ error: 'invalid_token', message: 'Access token not found or expired' });
  }

  if (Date.now() > tokenRecord.expiresAt) {
    db.oauth.accessTokens.delete(token);
    return res.status(401).json({ error: 'invalid_token', message: 'Access token expired' });
  }

  res.json({
    sub: tokenRecord.username, // Subject ID
    username: tokenRecord.username,
    scope: tokenRecord.scope,
    identity_provider: 'Simulated OAuth Service',
    authorized_at: new Date().toISOString()
  });
});
