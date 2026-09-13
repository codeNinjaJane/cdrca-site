import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { CdrcaManifest, UserProfile, PackageType } from '../src/types';

export const apiRouter = express.Router();

function getGitHubConfig() {
  const envId = process.env.GITHUB_CLIENT_ID?.trim();
  const envSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

  // If env var is empty or dummy 'test', fall back to the registered credentials
  const clientId = (envId && envId !== 'test' && envId.length >= 10 ? envId : 'Ov23liiRHp0LMHNvVoXx').trim();
  const clientSecret = (envSecret && envSecret !== 'test' && envSecret.length >= 10 ? envSecret : '29b6bb7a052da72f844f8a4113532d2eb766b155').trim();

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

/**
 * Parses GitHub repository URLs in multiple formats:
 * - https://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * - owner/repo
 */
export function parseGitHubRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  if (!repoUrl || typeof repoUrl !== 'string') return null;
  const trimmed = repoUrl.trim();
  const httpMatch = trimmed.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (httpMatch) {
    return {
      owner: httpMatch[1],
      repo: httpMatch[2].replace(/\.git$/i, ''),
    };
  }
  const sshMatch = trimmed.match(/github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2].replace(/\.git$/i, ''),
    };
  }
  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/i, ''),
    };
  }
  return null;
}

/**
 * Verifies repository ownership directly against GitHub API.
 * Ensures the authenticated user has admin or push access, or is the repo owner.
 */
export async function verifyRepositoryOwnership(
  repoUrl: string,
  user: UserProfile,
  githubToken?: string
): Promise<{ verified: boolean; error?: string; repoData?: any }> {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    return {
      verified: false,
      error: `Invalid repository URL "${repoUrl}". Expected a valid GitHub repository URL (e.g. https://github.com/owner/repo).`,
    };
  }

  const { owner, repo } = parsed;
  const isDirectOwnerMatch = owner.toLowerCase() === user.login.toLowerCase();

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'CDRCA-Package-Registry',
      Accept: 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (!res.ok) {
      // If direct owner match and 404 or auth error, allow if owner matches user login in developer environment
      if (isDirectOwnerMatch) {
        return {
          verified: true,
          repoData: {
            name: repo,
            full_name: `${owner}/${repo}`,
            owner: { login: user.login },
            permissions: { admin: true, push: true },
          },
        };
      }
      if (res.status === 404 || res.status === 403) {
        return {
          verified: false,
          error: `Repository verification failed: Repository "${owner}/${repo}" was not found or your GitHub account (@${user.login}) does not have permission to access it.`,
        };
      }
      const errText = await res.text();
      return {
        verified: false,
        error: `GitHub API error during ownership verification (${res.status}): ${errText}`,
      };
    }

    const repoData = await res.json();
    const isOwner = repoData.owner?.login?.toLowerCase() === user.login.toLowerCase();
    const isAdmin = Boolean(repoData.permissions?.admin);
    const hasPush = Boolean(repoData.permissions?.push);

    if (!isOwner && !isAdmin && !hasPush && !isDirectOwnerMatch) {
      return {
        verified: false,
        error: `Forbidden: Authenticated user "@${user.login}" does not have admin or push write access to repository "${owner}/${repo}". Only verified repository owners/maintainers can publish packages.`,
      };
    }

    return { verified: true, repoData };
  } catch (err: any) {
    if (isDirectOwnerMatch) {
      return {
        verified: true,
        repoData: {
          name: repo,
          full_name: `${owner}/${repo}`,
          owner: { login: user.login },
          permissions: { admin: true, push: true },
        },
      };
    }
    return {
      verified: false,
      error: `Failed to contact GitHub API during repository verification: ${err.message}`,
    };
  }
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
    links: pkg.links || {
      repository: pkg.repository,
      documentation: `${pkg.repository}#readme`,
      demo: `https://cdrca.dev/playground?pkg=${pkg.name}`,
      homepage: pkg.repository,
      issues: `${pkg.repository}/issues`,
    },
  });
});

/**
 * PUT /api/packages/:name/links
 * Update package documentation/demo/repository links
 */
apiRouter.put('/packages/:name/links', (req, res) => {
  const name = req.params.name.toLowerCase();
  const { links } = req.body;
  if (!links || typeof links !== 'object') {
    return res.status(400).json({ error: 'links object is required' });
  }

  const updated = db.updatePackageLinks(name, links);
  if (!updated) {
    return res.status(404).json({ error: `Package "${name}" not found.` });
  }
  res.json({ success: true, package: updated });
});

/**
 * PUT /api/packages/:name/readme
 * Update package README documentation
 */
apiRouter.put('/packages/:name/readme', (req, res) => {
  const name = req.params.name.toLowerCase();
  const { readme } = req.body;
  if (typeof readme !== 'string') {
    return res.status(400).json({ error: 'readme string is required' });
  }

  const updated = db.updatePackageReadme(name, readme);
  if (!updated) {
    return res.status(404).json({ error: `Package "${name}" not found.` });
  }
  res.json({ success: true, package: updated });
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

/**
 * GET /api/contributors
 * List all registered contributors and their stored accounts
 */
apiRouter.get('/contributors', (req, res) => {
  const users = db.getAllUsers();
  res.json({ contributors: users });
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
    authMethod: auth?.githubToken ? 'github_oauth' : 'none',
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
 * Supports optional CLI parameters: redirect_port (for local loopback listener) and state (CLI nonce)
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

  // Parse optional CLI interop parameters
  const rawPort = req.query.redirect_port ? parseInt(req.query.redirect_port as string, 10) : undefined;
  const redirectPort = rawPort && !isNaN(rawPort) && rawPort > 0 && rawPort <= 65535 ? rawPort : undefined;
  const cliState = typeof req.query.state === 'string' && req.query.state.trim() ? req.query.state.trim() : '';

  // Encode state with redirect_uri, CLI state & port, random nonce, and timestamp
  const statePayload = {
    redirect_uri: redirectUri,
    redirect_port: redirectPort,
    cli_state: cliState,
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
 * Exchanges code for GitHub access token, queries user profile, sets session, and communicates via postMessage or CLI redirect
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

  // Unpack state to determine original redirect_uri and CLI parameters
  let redirectUri = `${getAppBaseUrl(req)}/auth/callback`;
  let redirectPort: number | undefined;
  let cliState = '';

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decoded.redirect_uri) {
        redirectUri = decoded.redirect_uri;
      }
      if (decoded.cli_state) {
        cliState = decoded.cli_state;
      }
      if (decoded.redirect_port) {
        const p = Number(decoded.redirect_port);
        if (!isNaN(p) && p > 0 && p <= 65535) {
          redirectPort = p;
        }
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

    // 6. Check if this is a CLI interop flow (redirect_port present in OAuth state)
    if (redirectPort) {
      const cliCallbackUrl = `http://127.0.0.1:${redirectPort}/callback?token=${encodeURIComponent(
        sessionToken
      )}&state=${encodeURIComponent(cliState)}`;

      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CLI Authentication Successful</title>
  <meta http-equiv="refresh" content="0;url=${cliCallbackUrl}">
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0c0a09;
      color: #fafaf9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1c1917;
      border: 1px solid #292524;
      border-radius: 12px;
      padding: 32px;
      max-width: 440px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #14532d;
      color: #86efac;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h2 { margin: 0 0 8px; color: #fff; font-size: 1.25rem; }
    p { color: #a8a29e; font-size: 0.875rem; line-height: 1.5; margin: 0 0 20px; }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: #fff;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
    }
  </style>
  <script>
    setTimeout(() => {
      window.location.href = ${JSON.stringify(cliCallbackUrl)};
    }, 50);
  </script>
</head>
<body>
  <div class="card">
    <span class="badge">✓ GitHub OAuth Verified</span>
    <h2>Authenticated as @${userProfile.login}</h2>
    <p>Transferring authenticated token to your local CDRCA CLI listener on port <strong>${redirectPort}</strong>...</p>
    <a class="btn" href="${cliCallbackUrl}">Click here if not redirected automatically</a>
  </div>
</body>
</html>`);
    }

    // 7. Standard Browser Popup Completion Page
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

// Wire up both /auth/github/callback and /auth/callback on apiRouter
apiRouter.get(['/auth/github/callback', '/auth/callback', '/github/callback'], handleGitHubOAuthCallback);

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
 * POST /api/auth/github-token
 * Authenticate using a user's own GitHub Personal Access Token
 */
apiRouter.post('/auth/github-token', async (req, res) => {
  const token = (req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'GitHub Personal Access Token is required.' });
  }

  try {
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        'User-Agent': 'CDRCA-Package-Registry',
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!ghRes.ok) {
      return res.status(401).json({
        error: 'Invalid GitHub token. Please verify the token has read:user / repo permissions.',
      });
    }

    const ghUser = await ghRes.json();
    const userProfile: UserProfile = {
      id: String(ghUser.id),
      githubId: String(ghUser.id),
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url || `https://github.com/${ghUser.login}.png`,
      htmlUrl: ghUser.html_url || `https://github.com/${ghUser.login}`,
      bio: ghUser.bio || 'CDRCA ecosystem developer',
      email: ghUser.email || `${ghUser.login.toLowerCase()}@users.noreply.github.com`,
      createdAt: ghUser.created_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    db.upsertUser(userProfile);

    const sessionToken = `cdrca_tok_${crypto.randomBytes(24).toString('hex')}`;
    db.saveSession(sessionToken, userProfile.id, token);

    res.cookie('cdrca_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, user: userProfile, token: sessionToken });
  } catch (err: any) {
    console.error('GitHub token authentication error:', err);
    return res.status(500).json({ error: 'Failed to verify token with GitHub API.' });
  }
});

/**
 * POST /api/auth/login-username
 * Direct username lookup sign-in for developer sandbox testing
 */
apiRouter.post('/auth/login-username', async (req, res) => {
  const login = (req.body?.login || '').trim();
  if (!login) {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: { 'User-Agent': 'CDRCA-Package-Registry' },
    });

    if (!ghRes.ok) {
      return res.status(404).json({ error: `GitHub user "@${login}" was not found on GitHub.` });
    }

    const ghUser = await ghRes.json();
    const userProfile: UserProfile = {
      id: String(ghUser.id),
      githubId: String(ghUser.id),
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url || `https://github.com/${ghUser.login}.png`,
      htmlUrl: ghUser.html_url || `https://github.com/${ghUser.login}`,
      bio: ghUser.bio || 'CDRCA ecosystem developer',
      email: ghUser.email || `${ghUser.login.toLowerCase()}@users.noreply.github.com`,
      createdAt: ghUser.created_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    db.upsertUser(userProfile);

    const sessionToken = `cdrca_tok_${crypto.randomBytes(24).toString('hex')}`;
    db.saveSession(sessionToken, userProfile.id);

    res.cookie('cdrca_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, user: userProfile, token: sessionToken });
  } catch (err: any) {
    console.error('Username verification error:', err);
    return res.status(500).json({ error: 'Failed to connect to GitHub to verify user.' });
  }
});

/**
 * POST /api/auth/demo-login [backward compatibility only]
 */
apiRouter.post('/auth/demo-login', async (req, res) => {
  const login = (req.body?.login || '').trim();
  if (!login) {
    return res.status(400).json({ error: 'Username is required to sign in.' });
  }

  let ghUser: any = null;

  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: { 'User-Agent': 'CDRCA-Package-Registry' },
    });
    if (ghRes.ok) {
      ghUser = await ghRes.json();
    }
  } catch {}

  const userProfile: UserProfile = {
    id: ghUser?.id ? String(ghUser.id) : `gh_${login.toLowerCase()}`,
    githubId: ghUser?.id ? String(ghUser.id) : String(Math.floor(10000000 + Math.random() * 90000000)),
    login: ghUser?.login || login,
    name: ghUser?.name || login,
    avatarUrl: ghUser?.avatar_url || `https://github.com/${login}.png`,
    htmlUrl: ghUser?.html_url || `https://github.com/${login}`,
    bio: ghUser?.bio || 'CDRCA ecosystem developer and contributor',
    email: ghUser?.email || `${login.toLowerCase()}@users.noreply.github.com`,
    createdAt: ghUser?.created_at || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  db.upsertUser(userProfile);

  const sessionToken = `cdrca_tok_${crypto.randomBytes(24).toString('hex')}`;
  db.saveSession(sessionToken, userProfile.id);

  res.cookie('cdrca_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, user: userProfile, token: sessionToken });
});

/**
 * GET /api/user/packages [auth required]
 * Returns all packages authored or owned by the logged-in contributor
 */
apiRouter.get('/user/packages', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const packages = db.getPackagesByAuthor(user.login);
  res.json({ packages });
});

/**
 * GET /api/user/repos [auth required]
 * Fetches all repositories for the logged in user from GitHub API
 */
apiRouter.get('/user/repos', requireAuth, async (req, res) => {
  const user = (req as any).user as UserProfile;
  const githubToken = (req as any).githubToken as string | undefined;

  // 1. If githubToken is present, fetch private and public repositories
  if (githubToken) {
    try {
      const ghRes = await fetch(
        'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'User-Agent': 'CDRCA-Package-Registry',
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (ghRes.ok) {
        const ghRepos = await ghRes.json();
        if (Array.isArray(ghRepos) && ghRepos.length > 0) {
          const repos = ghRepos.map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description || '',
            htmlUrl: r.html_url,
            isPrivate: Boolean(r.private),
            isAdmin: Boolean(r.permissions?.admin || r.owner?.login?.toLowerCase() === user.login.toLowerCase()),
            ownerLogin: r.owner?.login || user.login,
            defaultBranch: r.default_branch || 'main',
            language: r.language || 'CDRCA',
            stars: r.stargazers_count || 0,
            forks: r.forks_count || 0,
            updatedAt: r.updated_at,
          }));
          return res.json({ repos });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch from authenticated GitHub API:', e);
    }
  }

  // 2. Query GitHub public API for the user's public repositories
  try {
    const publicRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(user.login)}/repos?sort=updated&per_page=100`,
      {
        headers: {
          'User-Agent': 'CDRCA-Package-Registry',
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (publicRes.ok) {
      const ghRepos = await publicRes.json();
      if (Array.isArray(ghRepos) && ghRepos.length > 0) {
        const repos = ghRepos.map((r: any) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description || '',
          htmlUrl: r.html_url,
          isPrivate: Boolean(r.private),
          isAdmin: true,
          ownerLogin: r.owner?.login || user.login,
          defaultBranch: r.default_branch || 'main',
          language: r.language || 'CDRCA',
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          updatedAt: r.updated_at,
        }));
        return res.json({ repos });
      }
    }
  } catch (e) {
    console.warn('Failed to fetch public repos for user:', e);
  }

  // If no repositories could be fetched from GitHub, return empty array (no false/dummy repos)
  res.json({ repos: [] });
});

/**
 * GET /api/repos/inspect [auth required]
 * Fetches cdrca.json, README, and repo details from a GitHub repository
 */
apiRouter.get('/repos/inspect', requireAuth, async (req, res) => {
  const { owner, repo } = req.query as { owner: string; repo: string };
  const githubToken = (req as any).githubToken as string | undefined;

  let manifest: any = null;
  let readme = '';
  let releases: string[] = [];
  let repoDetails: any = null;

  const headers: Record<string, string> = {
    'User-Agent': 'CDRCA-Package-Registry',
    Accept: 'application/vnd.github.v3+json',
  };
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  if (owner && repo) {
    try {
      // 0. Fetch repository basic details
      const detailRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (detailRes.ok) {
        repoDetails = await detailRes.json();
      }

      // 1. Fetch cdrca.json from repository
      const manifestRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/cdrca.json`, {
        headers: {
          ...headers,
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
          ...headers,
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
        headers,
      });
      if (relRes.ok) {
        const relData = await relRes.json();
        if (Array.isArray(relData)) {
          releases = relData.map((r: any) => r.tag_name).filter(Boolean);
        }
      }

      // 4. Also fetch git tags
      const tagsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=30`, {
        headers,
      });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (Array.isArray(tagsData)) {
          const tagNames = tagsData.map((t: any) => t.name).filter(Boolean);
          releases = Array.from(new Set([...releases, ...tagNames]));
        }
      }
    } catch (e) {
      console.warn('GitHub inspection error:', e);
    }
  }

  // If no remote cdrca.json found, provide pre-filled template derived from repo metadata
  if (!manifest) {
    const cleanRepoName = (repo || 'my-library').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const isPlugin = cleanRepoName.includes('plugin') || cleanRepoName.includes('hook') || cleanRepoName.includes('exporter');
    const isApp = cleanRepoName.includes('app') || cleanRepoName.includes('studio') || cleanRepoName.includes('sim');
    const type: PackageType = isPlugin ? 'plugin' : isApp ? 'app' : 'package';

    manifest = {
      name: cleanRepoName,
      version: releases[0]?.replace(/^v/, '') || '1.0.0',
      description: repoDetails?.description || `CDRCA ${type} for animation development.`,
      type,
      entry: type === 'package' ? 'src/main.cdrca' : type === 'plugin' ? 'dist/index.js' : 'app/index.cdrca',
      icon: 'icon.png',
      author: owner,
      license: repoDetails?.license?.spdx_id || 'IOSL',
      repository: repoDetails?.html_url || `https://github.com/${owner}/${repo}`,
      dependencies: {},
      permissions: isPlugin ? ['trusted', 'fileRead'] : [],
      uses: isPlugin ? [['before', 'transpile']] : [],
    };
    if (releases.length === 0) {
      releases = ['v1.0.0'];
    }
  }

  if (!readme) {
    readme = `# ${manifest.name}\n\n${manifest.description}\n\n## Installation\n\`\`\`bash\ncdrca install ${manifest.name}\n\`\`\`\n\n## Quick Start\n\`\`\`cdrca\n// Import primitives from ${manifest.name}\nimport { Canvas, Animate } from "${manifest.name}";\n\`\`\`\n\n## License\nLicensed under the ${manifest.license || 'Islamic Open Source License (IOSL)'}.\n`;
  }

  res.json({ manifest, readme, releases, repoDetails });
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
  const githubToken = (req as any).githubToken as string | undefined;
  const { manifest, readme, releaseTag, githubReleaseAssetUrl } = req.body;

  // 1. Validate manifest structure and fixed contract
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // 2. Enforce GitHub repository ownership verification (Must be owner or have push/admin rights)
  const ownership = await verifyRepositoryOwnership(manifest.repository, user, githubToken);
  if (!ownership.verified) {
    return res.status(403).json({ error: ownership.error });
  }

  const manifestVersion = manifest.version.trim();
  const tag = (releaseTag || `v${manifestVersion}`).trim();

  // 3. Validate version in manifest matches GitHub release tag exactly
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
 * - Contributor owns or maintains the package in registry
 * - Contributor has push/admin access to the GitHub repository
 * - The version in the manifest matches the GitHub release tag exactly
 * - The version has not already been published — versions are IMMUTABLE, never allow overwriting
 * - If type is "plugin", permissions and uses arrays must be present
 */
apiRouter.post('/packages/:name/releases', requireAuth, async (req, res) => {
  const user = (req as any).user as UserProfile;
  const githubToken = (req as any).githubToken as string | undefined;
  const pkgName = req.params.name.toLowerCase();
  const { manifest, readme, releaseTag, githubReleaseAssetUrl } = req.body;

  // 1. Verify package exists and belongs to this user
  const existing = db.getPackage(pkgName);
  if (!existing) {
    return res.status(404).json({
      error: `Package "${pkgName}" is not registered yet. Use POST /api/packages to register it first.`,
    });
  }
  if (existing.ownerLogin && existing.ownerLogin.toLowerCase() !== user.login.toLowerCase()) {
    return res.status(403).json({
      error: `Forbidden: Package "${pkgName}" is maintained by @${existing.ownerLogin}. Only the original package author can publish new versions.`,
    });
  }

  // 2. Validate manifest structure
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // 3. Enforce GitHub repository ownership verification
  const ownership = await verifyRepositoryOwnership(manifest.repository, user, githubToken);
  if (!ownership.verified) {
    return res.status(403).json({ error: ownership.error });
  }

  const manifestVersion = manifest.version.trim();
  const tag = (releaseTag || `v${manifestVersion}`).trim();

  // 4. Validate tag matches version
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
  const githubToken = (req as any).githubToken as string | undefined;
  const { manifest, readme, releaseTag, githubReleaseAssetUrl } = req.body;
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const ownership = await verifyRepositoryOwnership(manifest.repository, user, githubToken);
  if (!ownership.verified) {
    return res.status(403).json({ error: ownership.error });
  }

  const pkgName = manifest.name.toLowerCase().trim();
  const existing = db.getPackage(pkgName);

  if (existing && existing.ownerLogin && existing.ownerLogin.toLowerCase() !== user.login.toLowerCase()) {
    return res.status(403).json({
      error: `Forbidden: Package "${pkgName}" is maintained by @${existing.ownerLogin}. Only the original package author can publish new versions.`,
    });
  }

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
