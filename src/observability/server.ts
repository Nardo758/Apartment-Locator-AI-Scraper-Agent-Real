import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { getMetrics } from "./metrics";
import process from "node:process";

export interface MetricsServerOptions {
  port?: number;
  enabled?: boolean;
}

let server: http.Server | null = null;

export function startMetricsServer(
  opts: MetricsServerOptions = { port: 9090, enabled: true },
) {
  const { port = 9090, enabled = true } = opts;
  if (!enabled) return server;
  if (server) return server;

  server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = req.url || "/";
        if (url === "/metrics") {
          const metrics = await getMetrics();
          res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
          res.end(metrics);
          return;
        }

        if (url === "/health" || url === "/ready") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
          return;
        }

        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("internal error");
      }
    },
  );

  server.listen(port);

  // Graceful shutdown
  const shutdown = async () => {
    if (!server) return;
    try {
      server.close();
    } catch (e) {
      // ignore
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

export function stopMetricsServer() {
  if (!server) return;
  try {
    server.close();
  } catch (e) {}
  server = null;
}
