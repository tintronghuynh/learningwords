import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cấu hình CORS cho production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5000', 'https://benevolent-sopapilla-c9c9e9.netlify.app'];

// Log thông tin CORS khi khởi động
console.log(`CORS configuration: NODE_ENV=${process.env.NODE_ENV}, Allowed origins:`, allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Cho phép requests không có origin (như mobile apps hoặc curl requests)
    if (!origin) return callback(null, true);
    
    // Cho phép tất cả các origins trong môi trường phát triển
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Kiểm tra nếu origin nằm trong danh sách được phép
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log rejected origins để dễ debug
      console.warn(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Thêm middleware để set headers bảo mật
app.use((req, res, next) => {
  // Thêm các headers bảo mật
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Trong môi trường production, thêm các headers bảo mật bổ sung
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Utility function để kiểm tra có phải là thời điểm đầu ngày không (00:00 - 00:05)
function isStartOfDay(): boolean {
  const now = new Date();
  return now.getHours() === 0 && now.getMinutes() < 5;
}

// Utility function thực hiện daily reset
async function performDailyReset() {
  try {
    log("Performing daily vocabulary reset operations...");
    
    // 1. Reset unstudied words to level 1 first
    const resetCount = await storage.resetUnstudiedWordsLevel();
    log(`Reset ${resetCount} unstudied words to level 1`);
    
    // 2. Reset studiedToday flag for all words
    await storage.resetWordStudiedToday();
    log("Reset studiedToday flag for all words");
  } catch (error) {
    console.error("Error during daily reset:", error);
  }
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Thiết lập công việc định kỳ hàng ngày
  // 1. Reset ngay khi server khởi động nếu đang ở đầu ngày
  if (isStartOfDay()) {
    await performDailyReset();
  }
  
  // 2. Kiểm tra và reset định kỳ mỗi giờ
  // Sẽ chỉ thực hiện reset nếu đang ở đầu ngày (00:00 - 00:05)
  setInterval(async () => {
    if (isStartOfDay()) {
      await performDailyReset();
    }
  }, 60 * 60 * 1000); // Mỗi giờ kiểm tra một lần

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
