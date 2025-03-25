#!/usr/bin/env node

/**
 * Script này tạo một phiên bản đơn giản của server chỉ phục vụ API - không có Vite hoặc client.
 * Được sử dụng cho việc triển khai trên Render.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Tạo dist directory nếu không tồn tại
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.mkdirSync(path.join(rootDir, 'dist'));
}

if (!fs.existsSync(path.join(rootDir, 'dist', 'public'))) {
  fs.mkdirSync(path.join(rootDir, 'dist', 'public'));
}

// Tạo một file server đơn giản không phụ thuộc vào vite
const serverCode = `import express from "express";
import cors from "cors";
import { Server } from "http";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cấu hình CORS cho production
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = isProduction 
  ? (process.env.ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()) 
  : ["http://localhost:5000"];

console.log("CORS configuration:", 
  "NODE_ENV=" + process.env.NODE_ENV, 
  "Allowed origins:", allowedOrigins
);

const app = express();
const server = new Server(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép gọi không có origin (như từ Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy không cho phép truy cập từ origin này.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware session
app.use(session({
  secret: process.env.SESSION_SECRET || "vocablearningsecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 tuần
  }
}));

// Serve static files
const distPath = path.resolve(__dirname, "public");
app.use(express.static(distPath));

// API routes
registerRoutes(app);

// 404 handler for API
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Đón tất cả các request khác và trả về index.html
app.use("*", (req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Khởi động server
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(\`Server is running on port \${PORT}\`);
});

// Khởi tạo user mặc định nếu chưa có
storage.createDefaultUser();

export default server;
`;

fs.writeFileSync(path.join(rootDir, 'dist', 'index.js'), serverCode);
console.log('✅ Created server-only version in dist/index.js');

// Tạo một file index.html đơn giản trong dist/public
fs.writeFileSync(
  path.join(rootDir, 'dist', 'public', 'index.html'),
  `<!DOCTYPE html>
<html>
<head>
  <title>Vocabulary Learning API</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; max-width: 650px; margin: 0 auto; }
    h1 { margin-bottom: 1rem; }
    p { margin-bottom: 1rem; line-height: 1.5; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Vocabulary Learning API</h1>
  <p>This is the API server for the Vocabulary Learning application.</p>
  <p>The API endpoints are available at <code>/api/*</code></p>
</body>
</html>`
);

console.log('✅ Created dist/public/index.html');
console.log('🚀 Server-only build completed successfully!');