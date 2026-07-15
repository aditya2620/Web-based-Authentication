# Walkthrough: Web Authentication Explorer

We have successfully built the **Web Authentication Explorer**, a comprehensive educational dashboard for learning and demonstrating five distinct web authentication methodologies. 

Both the Node.js/Express backend (port 5000) and the React/Vite frontend (port 5173) are fully configured, dependencies are installed, and the servers are currently running on your system!

## File Changes & Structure

Here is a summary of the files implemented:

- **Backend (`/backend`)**:
  - [`package.json`](file:///d:/Auths/backend/package.json): Set up Express, CORS, cookie parsing, JWT, and `@simplewebauthn/server` for passkeys.
  - [`src/server.js`](file:///d:/Auths/backend/src/server.js): The core Express server config. Integrates a custom **HTTP Traffic Capture Middleware** which intercepts JSON responses to inject request/response headers and cookies for display on the client.
  - [`src/db.js`](file:///d:/Auths/backend/src/db.js): Mock in-memory database representing storage for users, session cookies, OAuth auth codes, access tokens, and WebAuthn registered credentials.
  - [`src/routes/basic.js`](file:///d:/Auths/backend/src/routes/basic.js): Implements Basic Access Authentication checking `Authorization: Basic <base64>` header, with standard `WWW-Authenticate` response on failure.
  - [`src/routes/session.js`](file:///d:/Auths/backend/src/routes/session.js): Implements Cookie-Session authentication, creating sessions and writing secure, `HttpOnly`, `SameSite=Lax` cookies to prevent XSS and mitigate CSRF.
  - [`src/routes/jwt.js`](file:///d:/Auths/backend/src/routes/jwt.js): Implements JWT token authentication using brief 1-minute Access Tokens (to demonstrate rotation) and Refresh Tokens.
  - [`src/routes/oauth.js`](file:///d:/Auths/backend/src/routes/oauth.js): Simulates a local OAuth 2.0 Authorization Server that renders a stylized consent screen, performs authorization redirects, issues auth codes, and exchanges them for tokens.
  - [`src/routes/webauthn.js`](file:///d:/Auths/backend/src/routes/webauthn.js): Implements FIDO2/WebAuthn Passkey registration options and verification routes using `@simplewebauthn/server`.

- **Frontend (`/frontend`)**:
  - [`index.html`](file:///d:/Auths/frontend/index.html): Custom Title configuration.
  - [`src/index.css`](file:///d:/Auths/frontend/src/index.css): Premium design system styled with custom HSL properties, glowing active badges, responsive card layouts, and transaction flow animations.
  - [`src/App.jsx`](file:///d:/Auths/frontend/src/App.jsx): Entry component containing tab coordinates and the custom `apiCall` telemetry hook that routes network captures into the inspector.
  - [`src/components/HttpInspector.jsx`](file:///d:/Auths/frontend/src/components/HttpInspector.jsx): Visualizes request/response HTTP methods, headers, cookies, and JSON payloads.
  - View panels for each type:
    - [`BasicView.jsx`](file:///d:/Auths/frontend/src/views/BasicView.jsx)
    - [`SessionView.jsx`](file:///d:/Auths/frontend/src/views/SessionView.jsx)
    - [`JwtView.jsx`](file:///d:/Auths/frontend/src/views/JwtView.jsx)
    - [`OAuthView.jsx`](file:///d:/Auths/frontend/src/views/OAuthView.jsx)
    - [`PasskeyView.jsx`](file:///d:/Auths/frontend/src/views/PasskeyView.jsx)

---

## Verification & Interactive Steps

Since browser automation is restricted in this environment, please open your browser and navigate to the application to explore the authentication playground:

### 🔗 **Dashboard Link**: [http://localhost:5173/](http://localhost:5173/)

Here is how you can verify each flow:

### 1. Basic Auth Tab
1. Register a user in the **1. Register User** form.
2. In **2. Login (Encode Headers)**, enter credentials and click **Encode & Save Credentials**.
3. Notice that credentials are saved in `LocalStorage` as Base64.
4. Click **Fetch Protected Profile**; the inspector on the right will capture the request, showing the raw `Authorization: Basic <base64>` header transmitted.

### 2. Session Cookie Tab
1. Register and click **Login & Set Cookie**.
2. Observe the inspector log. The response headers include `set-cookie: sessionId=...; HttpOnly; SameSite=Lax`.
3. Look at the **Client Storage Monitor**: JavaScript cannot read the cookie because of `HttpOnly`, but the browser stores it.
4. Click **Fetch Profile**; you will see the browser automatically appended the `Cookie: sessionId=...` header.
5. Click **Clear Cookie (Logout)**; the server clears the cookie, destroying the session.

### 3. JWT Stateless Tab
1. Register and Login. The server issues a short 1-minute `accessToken` and a `refreshToken`.
2. Notice the live countdown timer on the `accessToken` in the storage monitor.
3. Click **Profile (Bearer Auth)**. You'll see the request header contains `Authorization: Bearer <token>`.
4. Wait 1 minute for the token to expire, then click **Profile** again. The request will fail with a `401 Unauthorized (TOKEN_EXPIRED)`. 
5. The application will instantly trigger a POST to `/refresh` with the `refreshToken`, receive a new access token, update the storage monitor, and retry the profile request successfully, illustrating silent token rotation!

### 4. OAuth 2.0 / OIDC Tab
1. Click **Log In with Simulated OAuth Provider**.
2. The browser will redirect to the mock provider login page on port 5000.
3. Fill in any credentials (e.g. `oauth_user`, `pass123`) and click **Approve & Authorize**.
4. The server redirects back to the callback page. The app automatically:
   - Captures the authorization code from URL parameters.
   - Triggers a POST to `/token` with the client ID, secret, and code.
   - Stores the retrieved `access_token`.
   - Calls `/userinfo` resource server endpoint to pull the final user details.
   - Captures all intermediate API traffic in the HTTP Inspector!

### 5. Passkeys / WebAuthn Tab
1. Type a username (e.g., `aditya`) and click **1. Register Passkey**.
2. Your browser will prompt you natively for Windows Hello, PIN, or biometric key. Unlock your device.
3. The public key is registered in the DB.
4. Click **2. Login with Passkey**. The browser prompts you again for biometrics, verifies the challenge signature, and establishes a secure cookie session!
