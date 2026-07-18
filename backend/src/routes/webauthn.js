import { Router } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import crypto from 'crypto';
import { db } from '../db.js';

export const webauthnRouter = Router();

// Relying Party (RP) Configuration
const RP_NAME = 'Web Auth Explorer';
const RP_ID = 'localhost';
const EXPECTED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper to convert Uint8Array/Buffer to Base64URL
function bufferToBase64URL(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 1. Registration - Step 1: Generate Registration Options
webauthnRouter.get('/register-options', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Create user in db if not exists
  let user = db.users.get(username);
  if (!user) {
    db.users.set(username, { username, password: '', passkeys: [] });
    user = db.users.get(username);
  }

  // Get user's existing passkeys to prevent registering the same authenticator twice
  const userPasskeys = Array.from(db.webauthnCredentials.values())
    .filter(cred => cred.username === username)
    .map(cred => ({
      id: cred.credentialID,
      type: 'public-key',
      transports: cred.transports,
    }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: bufferToBase64URL(Buffer.from(username)),
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    excludeCredentials: userPasskeys,
    authenticatorSelection: {
      residentKey: 'required', // Required for passkeys (usernameless login capability)
      userVerification: 'preferred', // Ask for PIN/Biometrics if available
      authenticatorAttachment: 'platform', // Restrict to platform authenticators (Touch ID, Windows Hello)
    },
  });

  // Save challenge in-memory to verify later
  db.webauthnChallenges.set(username, options.challenge);

  res.json(options);
});

// 2. Registration - Step 2: Verify Registration Response
webauthnRouter.post('/register-verification', async (req, res) => {
  const { username, credential } = req.body;

  if (!username || !credential) {
    return res.status(400).json({ error: 'Username and credential details are required' });
  }

  const expectedChallenge = db.webauthnChallenges.get(username);
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active challenge found for this user' });
  }

  // Clean challenge
  db.webauthnChallenges.delete(username);

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

      // Save credential details in DB
      db.webauthnCredentials.set(bufferToBase64URL(Buffer.from(credentialID)), {
        credentialID,
        publicKey: credentialPublicKey,
        counter,
        transports: credential.response.transports || [],
        username,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      });

      return res.json({ verified: true, message: 'Passkey registered successfully!' });
    }

    res.status(400).json({ verified: false, error: 'Failed to verify credential registration' });
  } catch (err) {
    console.error('Registration verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Authentication - Step 1: Generate Login Options
webauthnRouter.get('/login-options', async (req, res) => {
  const { username } = req.query;

  // For real passkeys, username can be optional (autofill), but we'll accept it here
  // to list specific credentials if the user types their username.
  let userPasskeys = [];
  if (username) {
    userPasskeys = Array.from(db.webauthnCredentials.values())
      .filter(cred => cred.username === username)
      .map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      }));
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: userPasskeys.length > 0 ? userPasskeys : undefined,
    userVerification: 'preferred',
  });

  // Store challenge (keying it to username or a temporary session token)
  // Since username might not be sent in autofill, we'll store it under a wildcard or
  // store it under the requested username. If username isn't sent, we can map it to a session token.
  // For simplicity, we require username in this playground.
  const targetUsername = username || 'anonymous_login';
  db.webauthnChallenges.set(targetUsername, options.challenge);

  res.json(options);
});

// 4. Authentication - Step 2: Verify Login Response
webauthnRouter.post('/login-verification', async (req, res) => {
  const { username, credential } = req.body;

  const targetUsername = username || 'anonymous_login';
  const expectedChallenge = db.webauthnChallenges.get(targetUsername);
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active challenge found for this login attempt' });
  }

  db.webauthnChallenges.delete(targetUsername);

  // Retrieve matching credential from DB
  const credentialIdB64 = credential.id;
  const dbCredential = db.webauthnCredentials.get(credentialIdB64);

  if (!dbCredential) {
    return res.status(400).json({ error: 'Credential not registered in DB' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: dbCredential.credentialID,
        credentialPublicKey: dbCredential.publicKey,
        counter: dbCredential.counter,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      // Update counter in DB to prevent replays
      dbCredential.counter = authenticationInfo.newCounter;

      // User logged in! Establish a session cookie.
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      db.sessions.set(sessionId, {
        username: dbCredential.username,
        createdAt: new Date(),
        expiresAt
      });

      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 3600000
      });

      return res.json({
        verified: true,
        message: 'Passkey login successful!',
        user: { username: dbCredential.username }
      });
    }

    res.status(400).json({ verified: false, error: 'Assertion validation failed' });
  } catch (err) {
    console.error('Authentication verification error:', err);
    res.status(500).json({ error: err.message });
  }
});
