const apiKey = process.env.ASSEMBLYAI_API_KEY;
const base = process.env.PUBLIC_BASE_URL;
const secret = process.env.VOICE_POC_SHARED_SECRET;

if (!apiKey || !base || !secret || secret.length < 24) {
  console.error('Set ASSEMBLYAI_API_KEY, PUBLIC_BASE_URL, and a VOICE_POC_SHARED_SECRET of at least 24 characters.');
  process.exit(1);
}

let publicUrl;
try {
  publicUrl = new URL(base);
  if (publicUrl.protocol !== 'https:' || !publicUrl.hostname || publicUrl.pathname !== '/') throw new Error();
} catch {
  console.error('PUBLIC_BASE_URL must be a public HTTPS origin, without a path.');
  process.exit(1);
}

const definitions = [
  { role: 'witness', name: 'Mystery voice prototype - witness', voice: 'anna', model: 'mystery-poc-witness', prompt: 'You are a test witness. Speak only the exact response returned by the configured custom LLM endpoint. Keep turns brief.' },
  { role: 'detective', name: 'Mystery voice prototype - detective', voice: 'charles', model: 'mystery-poc-detective', prompt: 'You are a test detective. Speak only the exact response returned by the configured custom LLM endpoint. Keep turns brief.' },
];

const listResponse = await fetch('https://agents.assemblyai.com/v1/agents', {
  headers: { Authorization: `Bearer ${apiKey}` },
});
if (!listResponse.ok) {
  console.error(`Could not list existing test agents (${listResponse.status}).`);
  process.exit(1);
}
const listed = await listResponse.json();
const existingAgents = Array.isArray(listed) ? listed : listed.agents;
if (!Array.isArray(existingAgents)) {
  console.error('AssemblyAI returned an unexpected agent-list shape; stopping to avoid duplicate agents.');
  process.exit(1);
}

for (const character of definitions) {
  const existing = existingAgents.filter((agent) => agent.name === character.name)
    .sort((a, b) => Date.parse(b.created_at || b.createdAt || 0) - Date.parse(a.created_at || a.createdAt || 0))[0];
  const endpoint = existing
    ? `https://agents.assemblyai.com/v1/agents/${encodeURIComponent(existing.id)}`
    : 'https://agents.assemblyai.com/v1/agents';
  const response = await fetch(endpoint, {
    method: existing ? 'PUT' : 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: character.name,
      system_prompt: character.prompt,
      voice: { voice_id: character.voice },
      input: { turn_detection: { interrupt_response: true } },
      llm: [{ base_url: `${publicUrl.origin}/v1`, model: character.model, api_key: secret }],
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.id) {
    console.error(`Could not configure ${character.role} agent (${response.status}): ${data.detail || data.message || 'unknown error'}`);
    process.exit(1);
  }
  console.log(`${character.role}: ${data.id} (${character.voice}; ${existing ? 'updated' : 'created'})`);
}

console.log('Set VOICE_POC_WITNESS_AGENT_ID and VOICE_POC_DETECTIVE_AGENT_ID to the IDs above, then restart the prototype server.');
