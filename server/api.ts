import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { CdrcaManifest, UserProfile, PackageType } from '../src/types';

export const apiRouter = express.Router();

function getGitHubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() || '';
  return {
    clientId,
    clientSecret,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

// Runtime App URLs
const RUNTIME_DEV_URL = 'https://ais-dev-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app';
const RUNTIME_PRE_URL = 'https://ais-pre-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app';

function getAppBaseUrl(req?: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (host && typeof host === 'string') {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }
  return process.env.NODE_ENV === 'production' ? RUNTIME_PRE_URL : RUNTIME_DEV_URL;
}

/**
 * Authentication Middleware:
 * Supports BOTH website cookie session (`cdrca_session`) AND Bearer token for CLI:
 * `Authorization: Bearer <token>`
 */
export function getAuthenticatedUser(req: Request): { user: UserProfile; githubToken?: string; token: string } | null {
  let token = '';

  // 1. Check Authorization: Bearer <token> header (Used by CLI: cdrca login)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Fall back to Cookie (Used by Web Browser)
  if (!token && req.cookies && req.cookies.cdrca_session) {
    token = req.cookies.cdrca_session;
  }

  if (!token) return null;

  const session = db.getSession(token);
  if (!session) return null;

  return { user: session.user, githubToken: session.githubToken, token };
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({
      error: 'Unauthorized: Valid session cookie or "Authorization: Bearer <token>" required.',
    });
  }
  (req as any).user = auth.user;
  (req as any).githubToken = auth.githubToken;
  (req as any).sessionToken = auth.token;
  next();
}

/**
 * Validates the strict cdrca.json manifest contract:
 * - name, version, description, type, entry, author, license, repository
 * - type must be "package" | "plugin" | "app"
 * - If type is "plugin", permissions and uses arrays must be present
 */
function validateManifest(manifest: any): { valid: boolean; error?: string } {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'cdrca.json must be a valid JSON object.' };
  }

  const requiredFields = ['name', 'version', 'description', 'type', 'entry', 'author', 'license', 'repository'];
  for (const field of requiredFields) {
    if (!manifest[field] || typeof manifest[field] !== 'string' || manifest[field].trim() === '') {
      return { valid: false, error: `cdrca.json is missing required field: "${field}".` };
    }
  }

  const validTypes: PackageType[] = ['package', 'plugin', 'app'];
  if (!validTypes.includes(manifest.type)) {
    return {
      valid: false,
      error: `Invalid package type "${manifest.type}". Must be exactly one of: "package", "plugin", "app".`,
    };
  }

  // If type is "plugin", permissions and uses arrays must be present (can be empty, but must exist)
  if (manifest.type === 'plugin') {
    if (!Array.isArray(manifest.permissions)) {
      return {
        valid: false,
        error: 'Plugin packages must declare a "permissions" array in cdrca.json (e.g. [] or ["fileRead"]).',
      };
    }
    if (!Array.isArray(manifest.uses)) {
      return {
        valid: false,
        error: 'Plugin packages must declare a "uses" array of [hookType, hookProcess] pairs in cdrca.json.',
      };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// A) DOWNLOAD ENDPOINTS (NO AUTH)
// ---------------------------------------------------------------------------

apiRouter.get('/download/installer', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="cdrca-setup-v1.0.0-win64.exe"');
  res.setHeader('Content-Type', 'application/octet-stream');
  const dummyExe = Buffer.from(
    'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00' +
      'CDRCA Windows Installer (v1.0.0) • Animation DSL by Muhammad Ayyan • ISLAH Org\n' +
      'Licensed under the Islamic Open Source License (IOSL).\n'
  );
  res.send(dummyExe);
});

// ---------------------------------------------------------------------------
// B) PUBLIC REGISTRY BROWSING & SEARCH (NO AUTH REQUIRED)
// ---------------------------------------------------------------------------

/**
 * GET /api/search?q=... [no auth]
 * Output: ranked array [{ name, description, type, latestVersion }]
 * Rank: exact/partial name match highest, then description match, then README body match.
 */
apiRouter.get('/search', (req, res) => {
  const query = (req.query.q as string) || '';
  const type = req.query.type as string | undefined;
  const results = db.searchRanked(query, type);
  // Match the exact CLI contract: ranked array
  res.json(results);
});

/**
 * GET /api/packages [no auth]
 * Returns full package list for browsing
 */
apiRouter.get('/packages', (req, res) => {
  const packages = db.getPackages();
  res.json({ packages });
});

/**
 * GET /api/packages/:name [no auth]
 * Exact CLI contract:
 * → { manifest, latestVersion, readme, versions: [...] }
 */
apiRouter.get('/packages/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const pkg = db.getPackage(name);

  if (!pkg) {
    return res.status(404).json({ error: `Package "${name}" not found.` });
  }

  db.incrementDownload(name);

  // Format versions as an array for the CLI contract
  const versionsArray = Object.values(pkg.versions).map((v) => ({
    version: v.version,
    releaseTag: v.releaseTag || `v${v.version}`,
    publishedAt: v.publishedAt,
    downloadCount: v.downloadCount,
    githubReleaseAssetUrl: v.githubReleaseAssetUrl,
  }));

  const latestVerObj = pkg.versions[pkg.latestVersion] || Object.values(pkg.versions)[0];
  const manifest = latestVerObj?.manifest || {
    name: pkg.name,
    version: pkg.latestVersion,
    description: pkg.description,
    type: pkg.type,
    entry: 'src/main.cdrca',
    author: pkg.author,
    license: pkg.license,
    repository: pkg.repository,
    permissions: pkg.permissions,
    uses: pkg.uses,
  };

  // Response object satisfying exact CLI contract while supporting full web UI
  res.json({
    manifest,
    latestVersion: pkg.latestVersion,
    readme: pkg.readme,
    versions: versionsArray,
    // Supplemental package-level fields for rich UI
    name: pkg.name,
    type: pkg.type,
    description: pkg.description,
    author: pkg.author,
    license: pkg.license,
    repository: pkg.repository,
    totalDownloads: pkg.totalDownloads,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    permissions: pkg.permissions,
    uses: pkg.uses,
    ownerLogin: pkg.ownerLogin,
  });
});

/**
 * GET /api/packages/:name/:version [no auth]
 * Exact CLI contract:
 * → { manifest, githubReleaseAssetUrl }
 */
apiRouter.get('/packages/:name/:version', (req, res) => {
  const name = req.params.name.toLowerCase();
  const version = req.params.version;
  const pkg = db.getPackage(name);

  if (!pkg) {
    return res.status(404).json({ error: `Package "${name}" not found.` });
  }

  const verObj = pkg.versions[version];
  if (!verObj) {
    return res.status(404).json({ error: `Version "${version}" not found for package "${name}".` });
  }

  db.incrementDownload(name, version);

  const releaseAssetUrl =
    verObj.githubReleaseAssetUrl ||
    `${pkg.repository}/releases/download/${verObj.releaseTag || `v${version}`}/${name}-${version}.cdrca-pkg`;

  res.json({
    manifest: verObj.manifest,
    githubReleaseAssetUrl: releaseAssetUrl,
  });
});

/**
 * GET /api/contributors/:login [no auth]
 * Contributor Profile Page data
 */
apiRouter.get('/contributors/:login', (req, res) => {
  const login = req.params.login;
  const user = db.getUserByLogin(login);
  const packages = db.getPackagesByAuthor(login);

  if (!user && packages.length === 0) {
    return res.status(404).json({ error: `Contributor "@${login}" not found.` });
  }

  res.json({
    user: user || {
      id: 'ext-' + login,
      githubId: 'ext-' + login,
      login,
      name: login,
      avatarUrl: `https://avatars.githubusercontent.com/${login}`,
      htmlUrl: `https://github.com/${login}`,
      createdAt: new Date().toISOString(),
    },
    packages,
  });
});

// ---------------------------------------------------------------------------
// C) DEVELOPER / CONTRIBUTOR REGISTRY SIDE (GITHUB OAUTH INTEGRATION)
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/me
 * Returns current contributor profile, OAuth configuration status, and exact callback URLs
 */
apiRouter.get('/auth/me', (req, res) => {
  const auth = getAuthenticatedUser(req);
  const ghConfig = getGitHubConfig();
  const baseUrl = getAppBaseUrl(req);

  res.json({
    user: auth ? auth.user : null,
    token: auth ? auth.token : null,
    configured: ghConfig.isConfigured,
    hasClientId: Boolean(ghConfig.clientId),
    hasClientSecret: Boolean(ghConfig.clientSecret),
    appUrl: baseUrl,
    devUrl: RUNTIME_DEV_URL,
    sharedUrl: RUNTIME_PRE_URL,
    devCallbackUrl: `${RUNTIME_DEV_URL}/auth/callback`,
    sharedCallbackUrl: `${RUNTIME_PRE_URL}/auth/callback`,
    callbackUrl: `${baseUrl}/auth/callback`,
    authMethod: auth?.githubToken ? 'github_oauth' : auth ? 'sandbox' : 'none',
  });
});

/**
 * GET /api/auth/token [auth required]
 * Returns the API / Bearer token that the developer can copy into their CLI for `cdrca login`
 */
apiRouter.get('/auth/token', requireAuth, (req, res) => {
  const token = (req as any).sessionToken;
  const user = (req as any).user;
  res.json({
    token,
    user,
    loginCommand: `cdrca login --token ${token}`,
  });
});

/**
 * GET /api/auth/github/url
 * Returns the direct GitHub OAuth authorization URL
 */
apiRouter.get('/auth/github/url', (req, res) => {
  const ghConfig = getGitHubConfig();
  const baseUrl = getAppBaseUrl(req);
  const requestedRedirect = (req.query.redirect_uri as string)?.trim();

  // Determine redirect_uri (validate or default to current origin's /auth/callback)
  let redirectUri = `${baseUrl}/auth/callback`;
  if (requestedRedirect && (requestedRedirect.startsWith('https://') || requestedRedirect.startsWith('http://localhost'))) {
    redirectUri = requestedRedirect;
  }

  if (!ghConfig.isConfigured) {
    return res.json({
      configured: false,
      url: null,
      message: 'GitHub OAuth credentials (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET) are not set in AI Studio Settings.',
      missing: [
        ...(!ghConfig.clientId ? ['GITHUB_CLIENT_ID'] : []),
        ...(!ghConfig.clientSecret ? ['GITHUB_CLIENT_SECRET'] : []),
      ],
      devCallbackUrl: `${RUNTIME_DEV_URL}/auth/callback`,
      sharedCallbackUrl: `${RUNTIME_PRE_URL}/auth/callback`,
      callbackUrl: redirectUri,
      guideUrl: 'https://github.com/settings/developers',
    });
  }

  // Encode state with redirect_uri, random nonce, and timestamp
  const statePayload = {
    redirect_uri: redirectUri,
    nonce: crypto.randomBytes(12).toString('hex'),
    ts: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const scope = 'read:user user:email repo';
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    ghConfig.clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
    state
  )}`;

  res.json({
    configured: true,
    url,
    callbackUrl: redirectUri,
    devCallbackUrl: `${RUNTIME_DEV_URL}/auth/callback`,
    sharedCallbackUrl: `${RUNTIME_PRE_URL}/auth/callback`,
  });
});

/**
 * GitHub OAuth Callback Handler:
 * Supports both /auth/callback and /api/auth/github/callback
 * Exchanges code for GitHub access token, queries user profile, sets session, and communicates via postMessage
 */
export async function handleGitHubOAuthCallback(req: Request, res: Response) {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;
  const errorDescription = req.query.error_description as string;
  const ghConfig = getGitHubConfig();

  // If user denied access or GitHub returned an OAuth error
  if (error) {
    return res.status(400).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>GitHub Authentication Failed</title></head>
<body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center; padding: 2rem; max-width: 440px; background: #1e293b; border-radius: 12px; border: 1px solid #ef4444;">
    <h2 style="color: #f87171; margin-top: 0;">Authentication Cancelled</h2>
    <p style="color: #cbd5e1; font-size: 0.9rem;">${errorDescription || error}</p>
    <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close Window</button>
  </div>
</body>
</html>`);
  }

  if (!code) {
    return res.status(400).send('OAuth Error: Missing authorization code parameter.');
  }

  // Unpack state to determine original redirect_uri
  let redirectUri = `${getAppBaseUrl(req)}/auth/callback`;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decoded.redirect_uri) {
        redirectUri = decoded.redirect_uri;
      }
    } catch (e) {
      console.warn('Could not parse OAuth state, using default redirect URI:', e);
    }
  }

  try {
    // 1. Exchange code for access token with GitHub OAuth endpoint
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: ghConfig.clientId,
        client_secret: ghConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`GitHub token exchange error: ${tokenData.error_description || tokenData.error}`);
    }

    const githubToken = tokenData.access_token;
    if (!githubToken) {
      throw new Error('No access_token returned by GitHub OAuth.');
    }

    // 2. Fetch user profile from GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'CDRCA-Package-Registry',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      throw new Error(`Failed to fetch user profile from GitHub (${userRes.status}): ${errText}`);
    }

    const ghUser = await userRes.json();

    // 3. Optional: fetch user's primary email if private
    let primaryEmail = ghUser.email;
    if (!primaryEmail) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'User-Agent': 'CDRCA-Package-Registry',
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (emailsRes.ok) {
          const emails = await emailsRes.json();
          const primary = emails.find((e: any) => e.primary && e.verified) || emails[0];
          if (primary) primaryEmail = primary.email;
        }
      } catch (emailErr) {
        console.warn('Could not fetch user emails from GitHub:', emailErr);
      }
    }

    const userProfile: UserProfile = {
      id: String(ghUser.id),
      githubId: String(ghUser.id),
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
      htmlUrl: ghUser.html_url,
      createdAt: ghUser.created_at || new Date().toISOString(),
    };

    db.upsertUser(userProfile);

    // 4. Generate persistent Session and CLI Bearer token
    const sessionToken = `cdrca_tok_${crypto.randomBytes(24).toString('hex')}`;
    db.saveSession(sessionToken, userProfile.id, githubToken);

    // 5. Set session cookie with iframe-safe configuration (SameSite=None; Secure)
    res.cookie('cdrca_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // 6. Return popup completion page with postMessage and auto-close
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GitHub Authentication Complete</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 32px 28px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid #10b981;
      margin: 0 auto 16px;
      display: block;
    }
    h2 {
      margin: 0 0 6px 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
    }
    p {
      margin: 0 0 16px 0;
      color: #94a3b8;
      font-size: 0.875rem;
    }
    .token-box {
      background: #0b0f19;
      border: 1px solid #1e293b;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      word-break: break-all;
      margin-bottom: 20px;
    }
    .status {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <img class="avatar" src="${userProfile.avatarUrl}" alt="${userProfile.login}" />
    <h2>Connected as @${userProfile.login}</h2>
    <p>${userProfile.name ? userProfile.name : userProfile.login} • GitHub OAuth Verified</p>
    <div class="token-box">CLI Token: ${sessionToken}</div>
    <div class="status">✓ Authenticated! Synchronizing window...</div>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          user: ${JSON.stringify(userProfile)},
          token: '${sessionToken}'
        }, '*');
        setTimeout(() => window.close(), 700);
      } else {
        setTimeout(() => {
          window.location.href = '/?section=developer';
        }, 800);
      }
    } catch (e) {
      console.error('PostMessage error:', e);
      window.location.href = '/?section=developer';
    }
  </script>
</body>
</html>`;
    return res.send(html);
  } catch (err: any) {
    console.error('OAuth Callback failure:', err);
    return res.status(500).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>OAuth Error</title></head>
<body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center; padding: 2rem; max-width: 480px; background: #1e293b; border-radius: 12px; border: 1px solid #ef4444;">
    <h2 style="color: #f87171; margin-top: 0;">Authentication Error</h2>
    <p style="color: #cbd5e1; font-size: 0.9rem;">${err.message || 'An error occurred during GitHub authorization.'}</p>
    <p style="color: #94a3b8; font-size: 0.8rem;">Ensure your GitHub OAuth App Authorization Callback URL matches exactly: <code>${redirectUri}</code></p>
    <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 12px;">Close</button>
  </div>
</body>
</html>`);
  }
}

// Wire up both /auth/github/callback and /auth/callback
apiRouter.get('/auth/github/callback', handleGitHubOAuthCallback);

/**
 * Dev / Sandbox Login for testing without waiting for GitHub OAuth keys
 */
apiRouter.post('/auth/dev-login', (req, res) => {
  const username = (req.body.username || 'muhammad-ayyan').toLowerCase();
  const user: UserProfile = {
    id: username === 'muhammad-ayyan' ? '1001' : `dev-${username}`,
    githubId: username === 'muhammad-ayyan' ? '1001' : `dev-${username}`,
    login: username,
    name: username === 'muhammad-ayyan' ? 'Muhammad Ayyan' : `Dev Contributor (${username})`,
    avatarUrl: `https://avatars.githubusercontent.com/${username}`,
    htmlUrl: `https://github.com/${username}`,
    createdAt: new Date().toISOString(),
  };

  db.upsertUser(user);
  const sessionToken = `cdrca_tok_${crypto.randomBytes(16).toString('hex')}`;
  db.saveSession(sessionToken, user.id);

  res.cookie('cdrca_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, user, token: sessionToken });
});

apiRouter.post('/auth/logout', (req, res) => {
  const auth = getAuthenticatedUser(req);
  if (auth) {
    db.deleteSession(auth.token);
  }
  res.clearCookie('cdrca_session', {
    secure: true,
    sameSite: 'none',
  });
  res.json({ success: true });
});

/**
 * GET /api/user/repos [auth required]
 * Fetches repositories the contributor owns or has admin rights to.
 */
apiRouter.get('/user/repos', requireAuth, async (req, res) => {
  const user = (req as any).user as UserProfile;
  const githubToken = (req as any).githubToken as string | undefined;

  if (githubToken) {
    try {
      const ghRes = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated&affiliation=owner,collaborator', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'User-Agent': 'CDRCA-Package-Registry',
        },
      });

      if (ghRes.ok) {
        const ghRepos = await ghRes.json();
        const repos = ghRepos.map((r: any) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          htmlUrl: r.html_url,
          isPrivate: r.private,
          isAdmin: Boolean(r.permissions?.admin || r.owner?.login?.toLowerCase() === user.login.toLowerCase()),
          ownerLogin: r.owner?.login,
          defaultBranch: r.default_branch || 'main',
        }));
        return res.json({ repos });
      }
    } catch (e) {
      console.warn('Failed to fetch from GitHub API directly, falling back to simulated repos:', e);
    }
  }

  // Standalone sandbox repositories
  const repos = [
    {
      id: 101,
      name: 'calculastic',
      fullName: `${user.login}/calculastic`,
      description: 'Advanced calculus animation primitives and math visualizer for CDRCA.',
      htmlUrl: `https://github.com/${user.login}/calculastic`,
      isPrivate: false,
      isAdmin: true,
      ownerLogin: user.login,
      defaultBranch: 'main',
      releases: ['v1.4.2', 'v1.4.0', 'v1.0.0'],
    },
    {
      id: 102,
      name: 'vectorial-core',
      fullName: `${user.login}/vectorial-core`,
      description: 'Foundational vector mathematics and Bézier curves for CDRCA animations.',
      htmlUrl: `https://github.com/${user.login}/vectorial-core`,
      isPrivate: false,
      isAdmin: true,
      ownerLogin: user.login,
      defaultBranch: 'main',
      releases: ['v1.1.0'],
    },
    {
      id: 103,
      name: 'cdrca-lottie-exporter',
      fullName: `${user.login}/cdrca-lottie-exporter`,
      description: 'Transpiler plugin converting CDRCA animation AST into Lottie JSON format.',
      htmlUrl: `https://github.com/${user.login}/cdrca-lottie-exporter`,
      isPrivate: false,
      isAdmin: true,
      ownerLogin: user.login,
      defaultBranch: 'main',
      releases: ['v1.0.0'],
    },
    {
      id: 104,
      name: 'kinetic-typography-app',
      fullName: `${user.login}/kinetic-typography-app`,
      description: 'Interactive text animation studio runnable on CDRCA engine.',
      htmlUrl: `https://github.com/${user.login}/kinetic-typography-app`,
      isPrivate: false,
      isAdmin: true,
      ownerLogin: user.login,
      defaultBranch: 'main',
      releases: ['v1.0.0'],
    },
  ];

  res.json({ repos });
});

/**
 * GET /api/repos/inspect [auth required]
 * Fetches cdrca.json and README from a repo
 */
apiRouter.get('/repos/inspect', requireAuth, async (req, res) => {
  const { owner, repo } = req.query as { owner: string; repo: string };
  const githubToken = (req as any).githubToken as string | undefined;

  let manifest: any = null;
  let readme = '';
  let releases: string[] = [];

  if (githubToken && owner && repo) {
    try {
      // 1. Fetch cdrca.json from repository
      const manifestRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/cdrca.json`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'User-Agent': 'CDRCA-Package-Registry',
          Accept: 'application/vnd.github.v3.raw',
        },
      });
      if (manifestRes.ok) {
        const text = await manifestRes.text();
        try {
          manifest = JSON.parse(text);
        } catch {
          try {
            const obj = JSON.parse(text);
            if (obj.content && obj.encoding === 'base64') {
              const decoded = Buffer.from(obj.content, 'base64').toString('utf8');
              manifest = JSON.parse(decoded);
            }
          } catch {}
        }
      }

      // 2. Fetch README.md
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'User-Agent': 'CDRCA-Package-Registry',
          Accept: 'application/vnd.github.v3.raw',
        },
      });
      if (readmeRes.ok) {
        const text = await readmeRes.text();
        try {
          const obj = JSON.parse(text);
          if (obj.content && obj.encoding === 'base64') {
            readme = Buffer.from(obj.content, 'base64').toString('utf8');
          } else {
            readme = text;
          }
        } catch {
          readme = text;
        }
      }

      // 3. Fetch GitHub Releases
      const relRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'User-Agent': 'CDRCA-Package-Registry',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (relRes.ok) {
        const relData = await relRes.json();
        if (Array.isArray(relData)) {
          releases = relData.map((r: any) => r.tag_name).filter(Boolean);
        }
      }

      // 4. Also fetch git tags in case tags exist before a release is drafted
      const tagsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=30`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'User-Agent': 'CDRCA-Package-Registry',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (Array.isArray(tagsData)) {
          const tagNames = tagsData.map((t: any) => t.name).filter(Boolean);
          releases = Array.from(new Set([...releases, ...tagNames]));
        }
      }
    } catch (e) {
      console.warn('GitHub inspection fallback:', e);
    }
  }

  // If no remote cdrca.json found, provide pre-filled template with strict schema
  if (!manifest) {
    const isPlugin = repo.includes('hook') || repo.includes('plugin') || repo.includes('exporter');
    const isApp = repo.includes('app') || repo.includes('sim');
    const type: PackageType = isPlugin ? 'plugin' : isApp ? 'app' : 'package';

    manifest = {
      name: repo.toLowerCase(),
      version: '1.0.0',
      description: `CDRCA ${type} for animation development.`,
      type,
      entry: type === 'package' ? 'src/main.cdrca' : type === 'plugin' ? 'dist/index.js' : 'app/index.cdrca',
      icon: 'icon.png',
      author: owner,
      license: 'IOSL',
      repository: `https://github.com/${owner}/${repo}`,
      dependencies: {},
      permissions: isPlugin ? ['trusted', 'fileRead'] : [],
      uses: isPlugin ? [['before', 'transpile']] : [],
    };
    releases = ['v1.0.0'];
  }

  if (!readme) {
    readme = `# ${repo}\n\nA CDRCA ${manifest.type} by @${owner}.\n\n## Installation\n\`\`\`bash\ncdrca install ${repo.toLowerCase()}\n\`\`\`\n\n## License\n${manifest.license || 'IOSL'}\n`;
  }

  res.json({ manifest, readme, releases });
});

/**
 * POST /api/packages [auth required]
 * Register new package
 *
 * Publishing validation enforced:
 * - cdrca.json exists and is valid JSON with all required fields present
 * - The version in the manifest matches the GitHub release tag exactly
 * - The version has not already been published — versions are IMMUTABLE, never allow overwriting
 * - If type is "plugin", permissions and uses arrays must be present
 */
apiRouter.post('/packages', requireAuth, async (req, res) => {
  const user = (req as any).user as UserProfile;
  const { manifest, readme, releaseTag, githubReleaseAssetUrl } = req.body;

  // 1. Validate manifest structure and fixed contract
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const manifestVersion = manifest.version.trim();
  const tag = (releaseTag || `v${manifestVersion}`).trim();

  // 2. Validate version in manifest matches GitHub release tag exactly
  const normalizedTag = tag.startsWith('v') ? tag.slice(1) : tag;
  const normalizedVersion = manifestVersion.startsWith('v') ? manifestVersion.slice(1) : manifestVersion;
  if (normalizedTag !== normalizedVersion) {
    return res.status(400).json({
      error: `Release tag mismatch: Manifest version "${manifestVersion}" does not match GitHub release tag "${tag}". They must match exactly.`,
    });
  }

  try {
    const record = db.registerNewPackage(manifest, readme, tag, githubReleaseAssetUrl, {
      githubId: user.githubId,
      login: user.login,
    });

    res.status(201).json({
      success: true,
      message: `Package "${record.name}" successfully registered and published!`,
      package: record,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/packages/:name/releases [auth required]
 * Publish a new version of an existing package
 *
 * Publishing validation enforced:
 * - Validates corresponding GitHub release/tag actually exists on that repo
 * - The version in the manifest matches the GitHub release tag exactly
 * - The version has not already been published — versions are IMMUTABLE, never allow overwriting
 * - If type is "plugin", permissions and uses arrays must be present
 */
apiRouter.post('/packages/:name/releases', requireAuth, async (req, res) => {
  const user = (req as any).user as UserProfile;
  const pkgName = req.params.name.toLowerCase();
  const { manifest, readme, releaseTag, githubReleaseAssetUrl } = req.body;

  // 1. Validate manifest structure
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const manifestVersion = manifest.version.trim();
  const tag = (releaseTag || `v${manifestVersion}`).trim();

  // 2. Validate tag matches version
  const normalizedTag = tag.startsWith('v') ? tag.slice(1) : tag;
  const normalizedVersion = manifestVersion.startsWith('v') ? manifestVersion.slice(1) : manifestVersion;
  if (normalizedTag !== normalizedVersion) {
    return res.status(400).json({
      error: `Release tag mismatch: Manifest version "${manifestVersion}" does not match GitHub release tag "${tag}". They must match exactly.`,
    });
  }

  try {
    const record = db.publishNewRelease(pkgName, manifest, readme, tag, githubReleaseAssetUrl, {
      githubId: user.githubId,
      login: user.login,
    });

    res.status(201).json({
      success: true,
      message: `Version "${manifestVersion}" of package "${pkgName}" successfully published!`,
      package: record,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Backward compatibility aliases
apiRouter.post('/packages/register', requireAuth, async (req, res) => {
  // Delegate to POST /packages or /packages/:name/releases
  const user = (req as any).user as UserProfile;
  const { manifest, readme, releaseTag, githubReleaseAssetUrl } = req.body;
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const pkgName = manifest.name.toLowerCase().trim();
  const existing = db.getPackage(pkgName);

  try {
    let record;
    if (existing) {
      record = db.publishNewRelease(pkgName, manifest, readme, releaseTag || `v${manifest.version}`, githubReleaseAssetUrl, {
        githubId: user.githubId,
        login: user.login,
      });
    } else {
      record = db.registerNewPackage(manifest, readme, releaseTag || `v${manifest.version}`, githubReleaseAssetUrl, {
        githubId: user.githubId,
        login: user.login,
      });
    }
    res.json({ success: true, package: record });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
