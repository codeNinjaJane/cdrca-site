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

  // Direct download handler for installer link - redirects to latest release asset
  app.get(['/downloads/cdrca-setup-latest.exe', '/download/installer'], (req, res) => {
    res.redirect('https://github.com/MrGrimJoe/cdrca-ready-for-the-real-world/releases/download/v0.2.0/cdrca-installer.exe');
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
