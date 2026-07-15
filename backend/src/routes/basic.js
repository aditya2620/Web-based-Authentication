import { Router } from 'express';
import { db } from '../db.js';

export const basicRouter = Router();

// Middleware to parse and validate Basic Auth headers
export function basicAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Web Auth Explorer"');
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  // Extract and decode base64 credentials
  const base64Credentials = authHeader.split(' ')[1];
  const decoded = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = decoded.split(':');

  const user = db.users.get(username);
  if (!user || user.password !== password) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Web Auth Explorer"');
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Attach user object to request
  req.user = user;
  next();
}

// Register a new user
basicRouter.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (db.users.has(username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  db.users.set(username, { username, password, passkeys: [] });
  res.status(201).json({ message: 'User registered successfully for Basic Auth' });
});

// Protected route using Basic Auth
basicRouter.get('/profile', basicAuthMiddleware, (req, res) => {
  res.json({
    message: 'Successfully authenticated using Basic Auth!',
    user: {
      username: req.user.username
    }
  });
});
