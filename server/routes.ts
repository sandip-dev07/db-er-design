import type { Express } from "express";
import type { Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok' });
  });

  return httpServer;
}
