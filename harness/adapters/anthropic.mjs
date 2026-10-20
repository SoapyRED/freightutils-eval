// Anthropic Messages API with tool use. A key that is not scoped to a workspace needs
// ANTHROPIC_WORKSPACE_ID (sent as anthropic-workspace-id); without it the provider is skipped.
import { secret, redactHeaders } from '../lib/env.mjs';

export const anthropic = {
  provider: 'anthropic',
  available: () => Boolean(secret('ANTHROPIC_API_KEY')),
  async ask({ model, system, user, tools, maxToolCalls, callTool, settings = {}, onRaw }) {
    const headers = { 'Content-Type': 'application/json', 'x-api-key': secret('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' };
    const ws = secret('ANTHROPIC_WORKSPACE_ID');
    if (ws) headers['anthropic-workspace-id'] = ws;
    const defs = tools ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })) : undefined;
    const usage = { input: 0, cachedInput: 0, output: 0 };
    const toolCalls = [];
    const messages = [{ role: 'user', content: user }];
    const t0 = Date.now();
    const url = 'https://api.anthropic.com/v1/messages';
    for (let turn = 0; turn <= maxToolCalls + 1; turn++) {
      const body = { model, system, messages, max_tokens: 4096, ...settings };
      if (defs) {
        body.tools = defs;
        if (toolCalls.length >= maxToolCalls) body.tool_choice = { type: 'none' };
      }
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
      usage.output += u.output_tokens || 0;
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
    return { answer: '', toolCalls, usage, latencyMs: Date.now() - t0, error: 'turn limit' };
  },
};
