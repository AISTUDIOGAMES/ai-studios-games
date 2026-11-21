import { defineConfig, type Plugin } from "vite";

/** Serves /api/owl-ai during `npm run dev` with the same handler Vercel uses in production. */
function owlAiDev(): Plugin {
  return {
    name: "owl-ai-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/owl-ai", async (req, res) => {
        let raw = "";
        for await (const chunk of req) raw += chunk;
        try { (req as any).body = raw ? JSON.parse(raw) : {}; } catch { (req as any).body = {}; }
        try {
          const mod = await server.ssrLoadModule("/api/owl-ai.js");
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(String(err));
          if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: "server" })); }
        }
      });
    },
  };
}

export default defineConfig({ plugins: [owlAiDev()] });
