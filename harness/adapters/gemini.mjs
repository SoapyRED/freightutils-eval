// Google Gemini generateContent with function declarations (JSON Schema via parametersJsonSchema).
import { secret, redactHeaders } from '../lib/env.mjs';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const gemini = {
  provider: 'google',
  available: () => Boolean(secret('GOOGLE_API_KEY')),
  async ask({ model, system, user, tools, maxToolCalls, callTool, settings = {}, onRaw }) {
    const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': secret('GOOGLE_API_KEY') };
    const decls = tools ? tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.inputSchema })) : null;
    // Gemini caches a repeated prefix implicitly (no explicit cache for this model); the tools and
    // the system instruction come first in every request, so the prefix is identical across calls.
    const usage = { input: 0, cachedInput: 0, cacheWrite: 0, output: 0 };
    const toolCalls = [];
    const contents = [{ role: 'user', parts: [{ text: user }] }];
    const t0 = Date.now();
    const url = `${BASE}/models/${model}:generateContent`;
    for (let turn = 0; turn <= maxToolCalls + 1; turn++) {
      const body = { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { ...settings } };
      if (decls) {
        body.tools = [{ functionDeclarations: decls }];
        body.toolConfig = { functionCallingConfig: { mode: toolCalls.length >= maxToolCalls ? 'NONE' : 'AUTO' } };
      }
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      onRaw?.({ request: { url, headers: redactHeaders(headers), body }, response: { status: res.status, body: json } });
      if (!res.ok) {
        const err = new Error(`google HTTP ${res.status}: ${json?.error?.message || ''}`.slice(0, 400));
        err.status = res.status;
        err.usage = usage;
        throw err;
      }
      const u = json.usageMetadata || {};
      usage.input += (u.promptTokenCount || 0) + (u.toolUsePromptTokenCount || 0);
      usage.cachedInput += u.cachedContentTokenCount || 0;
      usage.output += (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0);
      const content = json.candidates?.[0]?.content || { role: 'model', parts: [] };
      const parts = content.parts || [];
      const calls = parts.filter((p) => p.functionCall);
      if (!calls.length || !callTool) {
        const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
        return { answer: text, toolCalls, usage, latencyMs: Date.now() - t0, finishReason: json.candidates?.[0]?.finishReason };
      }
      // The model turn goes back verbatim: it carries the thought signatures.
      contents.push({ role: 'model', parts });
      const responses = [];
      for (const p of calls) {
        const { name, args = {}, id } = p.functionCall;
        let output;
        if (toolCalls.length >= maxToolCalls) output = 'Tool budget exhausted: answer now with the value only.';
        else output = await callTool(name, args);
        toolCalls.push({ name, arguments: args });
        responses.push({ functionResponse: { name, ...(id ? { id } : {}), response: { result: output } } });
      }
      contents.push({ role: 'user', parts: responses });
    }
    return { answer: '', toolCalls, usage, latencyMs: Date.now() - t0, error: 'turn limit' };
  },
};
