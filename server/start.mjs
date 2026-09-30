import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app.mjs';
const app = createApp();
app.use(express.static(resolve('dist')));
app.get('/{*path}', (req, res) => res.sendFile(resolve('dist/index.html')));
app.listen(Number(process.env.PORT || 4173), '127.0.0.1', () =>
  console.log('Casework: http://localhost:4173'),
);
