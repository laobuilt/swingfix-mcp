import "dotenv/config";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { SwingFixClient } from "./swingfix.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const MANIFEST = {
  name: "SwingFix AI",
  version: "1.0.0",
  description: "AI-powered golf swing analysis. Submit a swing image URL and receive scored metrics, detected flaws, and personalised drill recommendations.",
  endpoint: `${process.env.MCP_PUBLIC_URL ?? `http://localhost:${PORT}`}/mcp`,
  tools: [
    { name: "analyze_golf_swing", description: "Analyse a golf swing image and return score, metrics, flaws, and coaching summary." },
    { name: "get_swing_history", description: "Retrieve a golfer's past swing analyses." },
  ],
};

function buildServer(client: SwingFixClient): McpServer {
  const server = new McpServer({ name: "swingfix-ai", version: "1.0.0" });

  server.tool(
    "analyze_golf_swing",
    "Analyse a golf swing image URL. Returns an overall score (0-100), swing metrics (plane, tempo, hip rotation, head position), detected flaws, strengths, coaching summary, and top drill recommendation.",
    {
      image_url: z.string().url().describe("Publicly accessible URL of the golf swing image"),
      user_id: z.string().describe("SwingFix user ID"),
      club_type: z.enum(["driver", "iron", "wedge", "putter", "hybrid", "wood"]).optional().describe("Club used"),
    },
    async ({ image_url, user_id, club_type }) => {
      const analysis = await client.analyzeSwing(image_url, user_id, club_type);
      return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
    }
  );

  server.tool(
    "get_swing_history",
    "Get a golfer's past swing analyses, sorted most-recent first.",
    {
      user_id: z.string().describe("SwingFix user ID"),
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Number of analyses to return"),
    },
    async ({ user_id, limit }) => {
      const history = await client.getHistory(user_id, limit);
      return { content: [{ type: "text", text: JSON.stringify(history, null, 2) }] };
    }
  );

  return server;
}

async function main() {
  const client = new SwingFixClient();
  const app = createMcpExpressApp({ host: "0.0.0.0" });

  app.get("/agents", (_req, res) => res.json(MANIFEST));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/mcp", async (req, res) => {
    const server = buildServer(client);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/mcp", async (req, res) => {
    const server = buildServer(client);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(PORT, () => {
    console.error(`SwingFix MCP running on port ${PORT}`);
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
