import { createServer } from 'vite';
import { createApp } from './app.mjs';
const app = createApp();
const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
app.use(vite.middlewares);
app.listen(Number(process.env.PORT || 4173), '127.0.0.1', () =>
  console.log('Casework: http://localhost:4173'),
);
