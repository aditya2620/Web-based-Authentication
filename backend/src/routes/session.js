import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

export const sessionRouter = Router();

// Middleware to parse and validate Session Cookies
export function sessionAuthMiddleware(req, res, next) {
  const { sessionId } = req.cookies;

  if (!sessionId) {
    return res.status(401).json({ error: 'No session cookie provided (Unauthorized)' });
  }

  const session = db.sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Check expiration
  if (new Date() > new Date(session.expiresAt)) {
    db.sessions.delete(sessionId);
    res.clearCookie('sessionId');
    return res.status(401).json({ error: 'Session has expired' });
  }

  // Get user details
  const user = db.users.get(session.username);
  if (!user) {
    return res.status(401).json({ error: 'User associated with session not found' });
  }

  req.user = user;
  req.sessionId = sessionId;
  next();
}

// Register a new user
sessionRouter.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (db.users.has(username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  db.users.set(username, { username, password, passkeys: [] });
  res.status(201).json({ message: 'User registered successfully for Session Auth' });
});

// Login and establish session cookie
sessionRouter.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.users.get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Generate session ID
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour duration

  // Save session in DB
  db.sessions.set(sessionId, {
    username,
    createdAt: new Date(),
    expiresAt
  });

  // Set HTTP-Only Cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: true, // Prevents client-side JS from reading the cookie (protects from XSS)
    secure: false,  // Set to true in production over HTTPS
    sameSite: 'lax', // Mitigates CSRF
    maxAge: 3600000 // 1 hour
  });

  res.json({
    message: 'Logged in successfully! Session cookie has been set.',
    user: { username }
  });
});

// Fetch user profile (requires valid session cookie)
sessionRouter.get('/profile', sessionAuthMiddleware, (req, res) => {
  res.json({
    message: 'Successfully authenticated using Session Cookie!',
    user: {
      username: req.user.username
    },
    sessionDetails: db.sessions.get(req.sessionId)
  });
});

// Logout and destroy session
sessionRouter.post('/logout', sessionAuthMiddleware, (req, res) => {
  // Delete from memory DB
  db.sessions.delete(req.sessionId);
  
  // Clear the cookie
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });

  res.json({ message: 'Logged out successfully, session destroyed and cookie cleared.' });
});
