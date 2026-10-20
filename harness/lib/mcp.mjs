// Minimal client for the hosted FreightUtils MCP (streamable HTTP, JSON-RPC over POST).
import { freightutilsKey } from './env.mjs';

export const MCP_URL = process.env.FREIGHTUTILS_MCP_URL || 'https://www.freightutils.com/api/mcp/mcp';
export const SITE = process.env.FREIGHTUTILS_SITE || 'https://www.freightutils.com';

let rpcId = 0;

function parseRpc(text, contentType) {
  if (contentType.includes('event-stream')) {
    const datas = text.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
    for (const d of datas.reverse()) {
      try {
        const j = JSON.parse(d);
        if (j && j.jsonrpc) return j;
      } catch { /* keep looking */ }
    }
    throw new Error('MCP: no JSON-RPC message in event stream');
  }
  return JSON.parse(text);
}

export async function mcpRpc(method, params = {}) {
  const key = freightutilsKey();
  if (!key) throw new Error('MCP: no FreightUtils API key available');
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'X-API-Key': key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MCP ${method}: HTTP ${res.status}`);
  const msg = parseRpc(text, res.headers.get('content-type') || '');
  if (msg.error) throw new Error(`MCP ${method}: ${msg.error.message}`);
  return msg.result;
}

export async function listTools() {
  const r = await mcpRpc('tools/list');
  return r.tools;
}

export async function callTool(name, args) {
  return mcpRpc('tools/call', { name, arguments: args });
}

// Keyed GET against the site's REST API.
export async function siteGet(path, query = {}) {
  const key = freightutilsKey();
  const url = new URL(path, SITE);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Accept: 'application/json', 'X-API-Key': key } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function sitePost(path, payload) {
  const key = freightutilsKey();
  const res = await fetch(new URL(path, SITE), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}
