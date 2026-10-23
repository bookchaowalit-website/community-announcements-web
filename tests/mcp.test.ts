import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id and lists the real tools", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" })).json();
    expect(body.id).toBe(7);
    expect(body.result.tools.map((t: { name: string }) => t.name)).toEqual(["list_notices", "get_notice"]);
  });

  it("list_notices filters the sample board", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_notices", arguments: { status: "Scheduled" } } });
    expect((await res.json()).result.notices.map((n: { id: string }) => n.id)).toEqual(["2"]);
    const search = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_notices", arguments: { query: "editorial" } } });
    expect((await search.json()).result.notices.map((n: { id: string }) => n.id)).toEqual(["3"]);
  });

  it("get_notice returns one notice and errors on an unknown id", async () => {
    const ok = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_notice", arguments: { id: "1" } } })).json();
    expect(ok.result.notice.title).toBe("The new project shelf is open");
    const res = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_notice", arguments: { id: "9" } } });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe(-32602);
    expect(body.id).toBe(4);
  });

  it("rejects a bad status, an unknown tool, an unknown method and a malformed body", async () => {
    expect((await (await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_notices", arguments: { status: "Live" } } })).json()).error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "publish_feed" } })).json()).error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 8, method: "nope" })).json()).error.code).toBe(-32601);
    const bad = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect((await bad.json()).error.code).toBe(-32700);
  });
});
