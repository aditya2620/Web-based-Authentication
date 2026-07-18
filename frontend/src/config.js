// Configuration for Frontend API base URL
// Uses the VITE_API_URL environment variable if deployed, or defaults to localhost:5000 in development.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
