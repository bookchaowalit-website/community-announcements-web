import { NextResponse } from "next/server";
import { FILTERS, SEED, filterNotices, type Filter } from "@/lib/announcements";

// Stateless JSON-RPC MCP endpoint over the sample notices the board starts with. Notices pinned in a browser stay in
// that browser's localStorage, so this route never sees them, and it publishes nothing.

type RpcRequest = { id?: number | string | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };

const TOOLS = [
  {
    name: "list_notices",
    description: "List the sample notices, optionally by state (Published, Scheduled, Draft) and a search over headline, body and desk",
    inputSchema: { type: "object", properties: { status: { type: "string", enum: FILTERS }, query: { type: "string" } } },
  },
  {
    name: "get_notice",
    description: "Get one sample notice by id",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
];

class RpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

function callTool(name: string | undefined, args: Record<string, unknown> = {}) {
  switch (name) {
    case "list_notices": {
      const status = args.status ?? "All";
      if (!(FILTERS as unknown[]).includes(status)) throw new RpcError(-32602, `Unknown status: ${String(status)}`);
      return { notices: filterNotices(SEED, status as Filter, typeof args.query === "string" ? args.query : "") };
    }
    case "get_notice": {
      const notice = SEED.find((entry) => entry.id === args.id);
      if (!notice) throw new RpcError(-32602, `No notice with id ${String(args.id)}`);
      return { notice };
    }
    default:
      throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
  }
}

export async function POST(request: Request) {
  let id: RpcRequest["id"] = null;
  try {
    const body = (await request.json()) as RpcRequest;
    id = body.id ?? null;
    let result: unknown;
    switch (body.method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "Notice Desk", version: "1.0.0" },
        };
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call":
        result = callTool(body.params?.name, body.params?.arguments);
        break;
      default:
        throw new RpcError(-32601, `Unknown method: ${String(body.method)}`);
    }
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (error) {
    const code = error instanceof RpcError ? error.code : -32700;
    const message = error instanceof RpcError ? error.message : "Parse error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });
  }
}
