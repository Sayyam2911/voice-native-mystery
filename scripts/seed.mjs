import { getStore } from '../server/store.mjs';
const store = await getStore();
console.log(`Validated and imported ${(await store.listCases()).length} case pack(s).`);
await store.client?.close();
