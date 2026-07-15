import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const jwtRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'auth-explorer-access-token-secret-12345';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'auth-explorer-refresh-token-secret-67890';

// Middleware to parse and validate JWT in Authorization Header
export function jwtAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header (Bearer token required)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.get(decoded.username);
    if (!user) {
      return res.status(401).json({ error: 'User in token claims not found' });
    }
    req.user = user;
    req.tokenClaims = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token has expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

// Register a new user
jwtRouter.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (db.users.has(username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  db.users.set(username, { username, password, passkeys: [] });
  res.status(201).json({ message: 'User registered successfully for JWT Auth' });
});

// Login and issue JWT access & refresh tokens
jwtRouter.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.users.get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Create JWTs
  const accessToken = jwt.sign(
    { username, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1m' } // Short expiry to easily demonstrate refresh flows
  );

  const refreshToken = jwt.sign(
    { username },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token
  db.refreshTokens.add(refreshToken);

  res.json({
    message: 'Logged in successfully! Tokens issued.',
    accessToken,
    refreshToken,
    expiresIn: '1m', // 60 seconds
    user: { username }
  });
});

// Refresh Access Token using Refresh Token
jwtRouter.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  if (!db.refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token (revoked or doesn\'t exist)' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    
    // Issue a new access token
    const newAccessToken = jwt.sign(
      { username: decoded.username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '1m' }
    );

    res.json({
      message: 'Access token refreshed successfully.',
      accessToken: newAccessToken,
      expiresIn: '1m'
    });
  } catch (err) {
    db.refreshTokens.delete(refreshToken); // cleanup invalid token
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Protected route (requires valid JWT access token)
jwtRouter.get('/profile', jwtAuthMiddleware, (req, res) => {
  res.json({
    message: 'Successfully authenticated using JWT!',
    user: {
      username: req.user.username
    },
    tokenClaims: req.tokenClaims
  });
});

// Logout and revoke refresh token
jwtRouter.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.refreshTokens.delete(refreshToken);
  }
  res.json({ message: 'Logged out successfully, refresh token revoked (if provided).' });
});
