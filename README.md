# Web Authentication Explorer

An interactive, premium-designed educational dashboard for learning, testing, and visualizing the five primary types of web authentication.

This project implements a unified Node.js (Express) backend and a React (Vite) frontend to demonstrate how credentials, headers, and cookies cross the network boundary, complete with a live HTTP Traffic Inspector.

---

## 🔑 Authentication Mechanisms Implemented

### 1. Basic Authentication
- **How it works:** Encodes `username:password` in Base64 and attaches it as `Authorization: Basic <credentials>` on every request.
- **Key Concepts:** Stateless client-side caching, lack of native logout, and exposure risks over unencrypted HTTP.

### 2. Session Cookie Authentication
- **How it works:** Stateful authentication. The server creates a session in memory/DB and sets a secure `sessionId` cookie in the client browser.
- **Key Concepts:** Cookie security attributes (`HttpOnly` to prevent XSS theft, `Secure` for HTTPS, and `SameSite` to mitigate CSRF).

### 3. JWT Stateless Authentication
- **How it works:** Stateless token authentication. The server issues a short-lived Access Token and a long-lived Refresh Token stored in the browser.
- **Key Concepts:** Cryptographic token verification, access vs. refresh tokens, and silent token rotation.

### 4. OAuth 2.0 / OpenID Connect (OIDC)
- **How it works:** Delegated authorization. The browser redirects to a simulated authorization server, gathers consent, captures the authorization code, exchanges it backend-to-backend for a token, and queries the user info resource.
- **Key Concepts:** 3-legged authorization code flow, clients, authorization servers, resource servers, and scopes.

### 5. Passkeys (WebAuthn)
- **How it works:** Passwordless public-key cryptography. The browser communicates with a local hardware authenticator (TouchID, FaceID, PIN) to sign a cryptographic challenge.
- **Key Concepts:** Credential registration (attestation), login assertions, phishing resistance, and hardware-level security.

---

## 🛠️ Project Structure

```
d:/Auths/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── basic.js        # Basic Auth router
│   │   │   ├── session.js      # Session-Cookie router
│   │   │   ├── jwt.js          # JWT stateless token router
│   │   │   ├── oauth.js        # Simulated OAuth server router
│   │   │   └── webauthn.js     # Passkey/WebAuthn router
│   │   ├── db.js               # Mock database
│   │   └── server.js           # Server configuration & HTTP capture middleware
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── HttpInspector.jsx  # Telemetry log viewer
    │   ├── views/
    │   │   ├── BasicView.jsx
    │   │   ├── SessionView.jsx
    │   │   ├── JwtView.jsx
    │   │   ├── OAuthView.jsx
    │   │   └── PasskeyView.jsx
    │   ├── App.jsx             # Tab switching & custom fetch hook
    │   └── index.css           # Premium dark-mode design system
    ├── index.html
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A modern browser supporting WebAuthn (Chrome, Safari, Edge, Firefox)

### Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Auths
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server (Port 5000):**
   ```bash
   cd backend
   npm start
   ```

2. **Start the Frontend Development Server (Port 5173):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open the browser:**
   Navigate to [http://localhost:5173](http://localhost:5173) to begin exploring the interactive playground!

---

## 🎮 How to Test the Flows

The application features a split-screen design. Use the left column to interact with the auth playground, and look at the **HTTP Traffic Inspector** on the right side to watch live telemetry capture.

### 1. Basic Auth Tab
1. In the **1. Register User** form, enter a username and password, then click **Register**.
2. Under **2. Login (Encode Headers)**, log in with the same credentials.
3. Observe the logs: notice how credentials are encoded in Base64 and stored in LocalStorage.
4. Click **Fetch Protected Profile**; the Inspector captures and displays the raw `Authorization: Basic <base64_string>` header.

### 2. Session Cookie Tab
1. Register and login using the forms.
2. Look at the Inspector's Response headers: you'll see a `set-cookie: sessionId=...; HttpOnly; SameSite=Lax` header.
3. Check the **Client Storage Monitor**: JavaScript cannot access the session cookie due to `HttpOnly`.
4. Click **Fetch Profile**: the browser automatically appends the `Cookie` header behind the scenes.
5. Click **Clear Cookie (Logout)** to delete the session from the server and clear the cookie.

### 3. JWT Stateless Tab
1. Register and log in. The server issues a short-lived `accessToken` (valid for 1 minute to demonstrate rotation) and a `refreshToken` (valid for 7 days).
2. Monitor the active countdown in the storage monitor.
3. Click **Profile (Bearer Auth)** to fetch the user profile with the header `Authorization: Bearer <token>`.
4. Wait 1 minute for the timer to expire. Click **Profile** again; the first request returns a `401 Unauthorized (TOKEN_EXPIRED)`. The client intercepts this, calls the `/refresh` endpoint automatically, updates the tokens, and retries the profile fetch silently.

### 4. OAuth 2.0 / OIDC Tab
1. Click **Log In with Simulated OAuth Provider**. You will be redirected to the provider page on port 5000.
2. Sign in with any credentials (e.g. `oauth_user`, `pass123`) and click **Approve & Authorize**.
3. The server redirects back to the callback page, and the application automatically:
   - Captures the authorization code from URL parameters.
   - Exchanges it for an access token via a POST request to `/token`.
   - Queries the `/userinfo` endpoint with the token to fetch the profile.
   - Captures all intermediate API traffic in the HTTP Inspector!

### 5. Passkeys / WebAuthn Tab
1. Enter a username (e.g. `user123`) and click **1. Register Passkey**.
2. Your browser will prompt you natively for biometric credentials (TouchID, FaceID, Windows Hello, or PIN).
3. Once registered, click **2. Login with Passkey**. Unlock your authenticator again.
4. The server validates the cryptographic challenge and sets a session cookie.
