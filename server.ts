import express, { Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api';
import { db } from './server/db';
import { UserProfile } from './src/types';

dotenv.config();

const PORT = 3000;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Mount API router
  app.use('/api', apiRouter);

  // GitHub OAuth Callback handlers (both /auth/callback and /api/auth/github/callback)
  const { handleGitHubOAuthCallback } = await import('./server/api');
  app.get(['/auth/callback', '/auth/callback/'], handleGitHubOAuthCallback);

  // Direct download handler for installer link
  app.get('/downloads/cdrca-setup-latest.exe', (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="cdrca-setup-v1.0.0-win64.exe"');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from('CDRCA Animation DSL Windows Installer Executable\nCanonical: https://github.com/Muhammad-Ayyan-no1/CDRCA-animation-dsl\nLicense: Islamic Open Source License (IOSL)\n'));
  });

  // Vite middleware in dev or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CDRCA Registry server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
