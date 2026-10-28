// Anthropic Messages API with tool use. A key that is not scoped to a workspace needs
// ANTHROPIC_WORKSPACE_ID (sent as anthropic-workspace-id); without it the provider is skipped.
// webSearch (condition C): the provider's server-side web search tool instead of client tools.
// The searches run on Anthropic's side; a long turn can stop with pause_turn, and the paused
// assistant message is sent back unchanged to continue it.
import { secret, redactHeaders } from '../lib/env.mjs';

// Every URL a search returned (consulted) and every URL a citation points at (cited), from any
// depth of the content (dynamic filtering nests the search blocks inside code execution).
function collectUrls(node, out) {
  if (Array.isArray(node)) { for (const x of node) collectUrls(x, out); return; }
  if (!node || typeof node !== 'object') return;
  if (node.type === 'web_search_result' && node.url) out.consulted.push(node.url);
  if (node.type === 'web_search_result_location' && node.url) {
    out.cited.push(node.url);
    if (node.cited_text) out.citedText.push(node.cited_text);
  }
  // Dynamic filtering: the model reads only what its filter code prints. The URLs in plain stdout
  // are the pages that reached the model (read); encrypted stdout is counted, not readable.
  if (node.type === 'code_execution_result' && typeof node.stdout === 'string') {
    out.read.push(...(node.stdout.match(/https?:\/\/[^\s"'<>)\]]+/g) || []));
    out.readText.push(node.stdout);
  }
  if (node.type === 'encrypted_code_execution_result') out.encryptedOutputs++;
  for (const v of Object.values(node)) if (v && typeof v === 'object') collectUrls(v, out);
}

export const anthropic = {
  provider: 'anthropic',
  available: () => Boolean(secret('ANTHROPIC_API_KEY')),
  async ask({ model, system, user, tools, maxToolCalls, callTool, webSearch, settings = {}, onRaw }) {
    const headers = { 'Content-Type': 'application/json', 'x-api-key': secret('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' };
    const ws = secret('ANTHROPIC_WORKSPACE_ID');
    if (ws) headers['anthropic-workspace-id'] = ws;
    // Prompt caching: a breakpoint on the last tool definition and one on the system prompt, so
    // the tool list (about 45k tokens) is written to the cache once and read on every later call.
    const defs = tools ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })) : undefined;
    if (defs?.length) defs[defs.length - 1] = { ...defs[defs.length - 1], cache_control: { type: 'ephemeral' } };
    const systemBlocks = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
    const usage = { input: 0, cachedInput: 0, cacheWrite: 0, output: 0, searches: 0 };
    const toolCalls = [];
    const urls = { consulted: [], cited: [], citedText: [], read: [], readText: [], encryptedOutputs: 0 };
    const messages = [{ role: 'user', content: user }];
    const t0 = Date.now();
    const url = 'https://api.anthropic.com/v1/messages';
    for (let turn = 0; turn <= maxToolCalls + 1; turn++) {
      const body = { model, system: systemBlocks, messages, max_tokens: 16000, ...settings };
      if (defs) {
        body.tools = defs;
        if (toolCalls.length >= maxToolCalls) body.tool_choice = { type: 'none' };
      }
      // max_uses counts per request, so a pause_turn continuation gets only the searches left.
      if (webSearch) body.tools = [{ ...webSearch.tool, max_uses: Math.max(1, webSearch.maxUses - usage.searches) }];
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      onRaw?.({ request: { url, headers: redactHeaders(headers), body }, response: { status: res.status, body: json } });
      if (!res.ok) {
        const err = new Error(`anthropic HTTP ${res.status}: ${json?.error?.message || ''}`.slice(0, 400));
        err.status = res.status;
        err.usage = usage;
        throw err;
      }
      const u = json.usage || {};
      usage.input += (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      usage.cachedInput += u.cache_read_input_tokens || 0;
      usage.cacheWrite += u.cache_creation_input_tokens || 0;
      usage.output += u.output_tokens || 0;
      usage.searches += u.server_tool_use?.web_search_requests || 0;
      if (webSearch) {
        collectUrls(json.content || [], urls);
        if (json.stop_reason === 'pause_turn' && usage.searches < webSearch.maxUses) {
          messages.push({ role: 'assistant', content: json.content });
          continue;
        }
        // The answer is the text after the last search or code block: the model narrates
        // ("I'll search for…") before it searches.
        const content = json.content || [];
        let last = -1;
        content.forEach((c, i) => { if (c.type !== 'text') last = i; });
        const answer = content.slice(last + 1).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
        return { answer, toolCalls, usage, latencyMs: Date.now() - t0, urls, stopReason: json.stop_reason };
      }
      const calls = (json.content || []).filter((c) => c.type === 'tool_use');
      if (!calls.length || !callTool) {
        const text = (json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
        return { answer: text, toolCalls, usage, latencyMs: Date.now() - t0 };
      }
      messages.push({ role: 'assistant', content: json.content });
      const results = [];
      for (const c of calls) {
        let output;
        if (toolCalls.length >= maxToolCalls) output = 'Tool budget exhausted: answer now with the value only.';
        else output = await callTool(c.name, c.input || {});
        toolCalls.push({ name: c.name, arguments: c.input || {} });
        results.push({ type: 'tool_result', tool_use_id: c.id, content: output });
      }
      messages.push({ role: 'user', content: results });
    }
    return { answer: '', toolCalls, usage, latencyMs: Date.now() - t0, urls, error: 'turn limit' };
  },
};
