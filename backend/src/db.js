// Mock In-Memory Database for Authentication Explorer

export const db = {
  // Users: { username: { username, passwordHash, passkeys: [] } }
  users: new Map(),

  // Sessions: { sessionId: { username, createdAt, expiresAt } }
  sessions: new Map(),

  // JWT Refresh Tokens (in real apps, store token family/jti to prevent reuse)
  refreshTokens: new Set(),

  // WebAuthn challenges per user: { username: challenge }
  webauthnChallenges: new Map(),

  // WebAuthn credentials: { credentialIdBase64: { credentialID, publicKey, counter, transports, username } }
  webauthnCredentials: new Map(),

  // OAuth 2.0 Store
  oauth: {
    // Auth codes: { code: { clientId, redirectUri, username, scope, codeChallenge, expiresAt } }
    codes: new Map(),
    // Access tokens: { token: { username, scope, expiresAt } }
    accessTokens: new Map(),
    // Clients
    clients: new Map([
      ['client-explorer-id', {
        clientSecret: 'client-explorer-secret',
        redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:5173/auth/oauth/callback'
      }]
    ])
  }
};
