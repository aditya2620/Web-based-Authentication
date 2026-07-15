import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import routes
import { basicRouter } from './routes/basic.js';
import { sessionRouter } from './routes/session.js';
import { jwtRouter } from './routes/jwt.js';
import { oauthRouter } from './routes/oauth.js';
import { webauthnRouter } from './routes/webauthn.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for credentials (cookies)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Traffic Logger Middleware
// Overcepts res.json to attach request/response headers for visual feedback
app.use((req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Read headers as they are currently
    const requestHeaders = { ...req.headers };
    
    // We want to capture response headers, but some headers are only finalized
    // during the transmission. res.getHeaders() returns current headers.
    const responseHeaders = { ...res.getHeaders() };
    
    const traffic = {
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: requestHeaders,
        cookies: req.cookies || {},
        body: req.body
      },
      response: {
        status: res.statusCode,
        headers: responseHeaders,
        body: data
      }
    };
    
    // Inject the traffic telemetry into the response JSON
    let payload = data;
    if (data && typeof data === 'object') {
      payload = { ...data, _traffic: traffic };
    } else {
      payload = { data, _traffic: traffic };
    }
    
    return originalJson.call(this, payload);
  };
  
  next();
});

// Mount auth routes
app.use('/api/auth/basic', basicRouter);
app.use('/api/auth/session', sessionRouter);
app.use('/api/auth/jwt', jwtRouter);
app.use('/api/auth/oauth', oauthRouter);
app.use('/api/auth/webauthn', webauthnRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
