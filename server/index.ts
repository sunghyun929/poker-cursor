import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { MemoryMonitor } from "./utils/memoryMonitor";
import { setupConnectionStability } from "./middleware/connectionStability";

const app = express();

// Setup connection stability middleware first
setupConnectionStability(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Render 배포를 위한 설정
const PORT = process.env.PORT || 5000;

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

(async () => {
  // Start memory monitoring for Render's 512MB limit
  MemoryMonitor.startMonitoring();
  
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

  // Use PORT environment variable for production, default to 5000 for development
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`Memory monitoring enabled for 512MB limit`);
  });

  // Graceful shutdown for Render
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    MemoryMonitor.stopMonitoring();
    server.close();
  });

  process.on('SIGINT', () => {
    log('SIGINT received, shutting down gracefully');
    MemoryMonitor.stopMonitoring();
    server.close();
  });
})();
