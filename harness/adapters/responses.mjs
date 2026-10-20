// OpenAI Responses API shape. xAI serves the same shape at its own base URL.
import { secret, redactHeaders } from '../lib/env.mjs';

export function makeResponsesAdapter({ provider, baseUrl, envKey }) {
  return {
    provider,
    available: () => Boolean(secret(envKey)),
    async ask({ model, system, user, tools, maxToolCalls, callTool, settings = {}, onRaw }) {
      const key = secret(envKey);
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
      const fnTools = tools ? tools.map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: t.inputSchema, strict: false })) : undefined;
      const usage = { input: 0, cachedInput: 0, output: 0 };
      const toolCalls = [];
      let input = [{ role: 'system', content: system }, { role: 'user', content: user }];
      let previous = null;
      const t0 = Date.now();
      for (let turn = 0; turn <= maxToolCalls + 1; turn++) {
        const body = { model, input, ...settings };
        if (fnTools) body.tools = fnTools;
        if (previous) body.previous_response_id = previous;
        // Out of tool budget: the model must answer now.
        if (fnTools && toolCalls.length >= maxToolCalls) body.tool_choice = 'none';
        const res = await fetch(`${baseUrl}/responses`, { method: 'POST', headers, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        onRaw?.({ request: { url: `${baseUrl}/responses`, headers: redactHeaders(headers), body }, response: { status: res.status, body: json } });
        if (!res.ok) {
          const err = new Error(`${provider} HTTP ${res.status}: ${json?.error?.message || JSON.stringify(json?.error || json).slice(0, 300)}`.slice(0, 400));
          err.status = res.status;
          err.usage = usage;
          throw err;
        }
        const u = json.usage || {};
        usage.input += u.input_tokens || 0;
        usage.cachedInput += u.input_tokens_details?.cached_tokens || 0;
        usage.output += u.output_tokens || 0;
        previous = json.id;
        const calls = (json.output || []).filter((o) => o.type === 'function_call');
        if (!calls.length || !callTool) {
          const text = (json.output || [])
            .filter((o) => o.type === 'message')
            .flatMap((o) => o.content || [])
            .filter((c) => c.type === 'output_text')
            .map((c) => c.text)
            .join('')
            .trim();
          return { answer: text, toolCalls, usage, latencyMs: Date.now() - t0 };
        }
        input = [];
        for (const c of calls) {
          let args;
          try { args = JSON.parse(c.arguments || '{}'); } catch { args = {}; }
          let output;
          if (toolCalls.length >= maxToolCalls) output = 'Tool budget exhausted: answer now with the value only.';
          else output = await callTool(c.name, args);
          toolCalls.push({ name: c.name, arguments: args });
          input.push({ type: 'function_call_output', call_id: c.call_id, output });
        }
      }
      return { answer: '', toolCalls, usage, latencyMs: Date.now() - t0, error: 'turn limit' };
    },
  };
}
