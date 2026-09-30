import { getStore } from '../server/store.mjs';
let failed = false;
try {
  const store = await getStore();
  console.log(
    `Database: connected (${store.mode}); ${(await store.listCases()).length} case pack(s).`,
  );
  await store.client?.close();
} catch (e) {
  failed = true;
  console.log(`Database: ${e.code || e.name}. Check URI, credentials, and network access.`);
}
for (const [label, url, key] of [
  [
    'Dialogue',
    `${process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'}/models`,
    process.env.LLM_API_KEY,
  ],
  ['Voice', 'https://agents.assemblyai.com/v1/agents', process.env.ASSEMBLYAI_API_KEY],
]) {
  if (!key) {
    console.log(`${label}: key missing.`);
    failed = true;
    continue;
  }
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12000),
    });
    console.log(`${label}: HTTP ${r.status}.`);
    if (!r.ok) failed = true;
  } catch {
    console.log(`${label}: connection failed.`);
    failed = true;
  }
}
console.log(
  `Signing secret: ${process.env.APP_SECRET?.length >= 32 ? 'configured' : 'needs 32+ characters for deployment'}.`,
);
process.exitCode = failed ? 1 : 0;
