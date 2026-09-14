import fs from 'fs';
import path from 'path';
import { PackageRecord, UserProfile, CdrcaManifest, SearchResultItem } from '../src/types';

interface DatabaseSchema {
  packages: Record<string, PackageRecord>;
  users: Record<string, UserProfile>;
  sessions: Record<string, { userId: string; githubToken?: string; expiresAt: number }>;
  apiTokens: Record<string, { userId: string; createdAt: string }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'registry.json');

const INITIAL_PACKAGES: Record<string, PackageRecord> = {};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDatabase(): DatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = {
      packages: {},
      users: {},
      sessions: {},
      apiTokens: {},
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.packages) parsed.packages = {};
    if (!parsed.users) parsed.users = {};
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.apiTokens) parsed.apiTokens = {};
    return parsed;
  } catch (err) {
    console.error('Failed to read database, restoring backup:', err);
    return { packages: {}, users: {}, sessions: {}, apiTokens: {} };
  }
}

function saveDatabase(data: DatabaseSchema): void {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

export const db = {
  getPackages(): PackageRecord[] {
    const schema = loadDatabase();
    return Object.values(schema.packages);
  },

  getPackage(name: string): PackageRecord | null {
    const schema = loadDatabase();
    return schema.packages[name.toLowerCase()] || null;
  },

  getPackagesByAuthor(authorLogin: string): PackageRecord[] {
    const schema = loadDatabase();
    const loginLower = authorLogin.toLowerCase();
    return Object.values(schema.packages).filter(
      (p) => p.author.toLowerCase() === loginLower || p.ownerLogin.toLowerCase() === loginLower
    );
  },

  /**
   * Search packages with specified ranking rule:
   * "Rank: exact/partial name match highest, then description match, then README body match."
   * Returns ranked array: [{ name, description, type, latestVersion, ... }]
   */
  searchRanked(query: string, type?: string): SearchResultItem[] {
    const schema = loadDatabase();
    let all = Object.values(schema.packages);

    if (type && type !== 'all') {
      all = all.filter((pkg) => pkg.type === type);
    }

    const q = (query || '').toLowerCase().trim();

    if (!q) {
      // Default ranking: sorted by total downloads descending
      return all
        .sort((a, b) => b.totalDownloads - a.totalDownloads)
        .map((pkg) => ({
          name: pkg.name,
          description: pkg.description,
          type: pkg.type,
          latestVersion: pkg.latestVersion,
          author: pkg.author,
          license: pkg.license,
          totalDownloads: pkg.totalDownloads,
          updatedAt: pkg.updatedAt,
          permissions: pkg.permissions,
          uses: pkg.uses,
          providesFor: pkg.providesFor,
          libraries: pkg.libraries,
        }));
    }

    // Compute rank score per package
    const scored = all
      .map((pkg) => {
        let score = 0;
        const nameLower = pkg.name.toLowerCase();
        const descLower = pkg.description.toLowerCase();
        const readmeLower = (pkg.readme || '').toLowerCase();

        // 1. Exact name match highest
        if (nameLower === q) {
          score += 10000;
        } else if (nameLower.startsWith(q)) {
          score += 5000;
        } else if (nameLower.includes(q)) {
          score += 2000;
        }

        // 2. Description match
        if (descLower.includes(q)) {
          score += 500;
        }

        // 3. README body match
        if (readmeLower.includes(q)) {
          score += 100;
        }

        // Author or license exact/partial match bonus
        if (pkg.author.toLowerCase().includes(q) || (pkg.license && pkg.license.toLowerCase().includes(q))) {
          score += 150;
        }

        return { pkg, score };
      })
      .filter((item) => item.score > 0);

    // Sort by score DESC, tie-break by downloads
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.pkg.totalDownloads - a.pkg.totalDownloads;
    });

    return scored.map(({ pkg }) => ({
      name: pkg.name,
      description: pkg.description,
      type: pkg.type,
      latestVersion: pkg.latestVersion,
      author: pkg.author,
      license: pkg.license,
      totalDownloads: pkg.totalDownloads,
      updatedAt: pkg.updatedAt,
      permissions: pkg.permissions,
      uses: pkg.uses,
      providesFor: pkg.providesFor,
      libraries: pkg.libraries,
    }));
  },

  /**
   * Register a new package (POST /api/packages)
   */
  registerNewPackage(
    manifest: CdrcaManifest,
    readme: string,
    releaseTag: string,
    githubReleaseAssetUrl: string,
    owner: { githubId: string; login: string }
  ): PackageRecord {
    const schema = loadDatabase();
    const pkgName = manifest.name.toLowerCase().trim();
    const now = new Date().toISOString();

    if (schema.packages[pkgName]) {
      const existing = schema.packages[pkgName];
      if (existing.ownerLogin.toLowerCase() !== owner.login.toLowerCase()) {
        throw new Error(`Package "${pkgName}" is already registered by @${existing.ownerLogin}. You cannot overwrite it.`);
      }
      throw new Error(`Package "${pkgName}" already exists. To publish a new version, use POST /api/packages/${pkgName}/releases.`);
    }

    const record: PackageRecord = {
      name: pkgName,
      type: manifest.type,
      description: manifest.description,
      author: manifest.author || owner.login,
      repository: manifest.repository,
      license: manifest.license,
      latestVersion: manifest.version,
      totalDownloads: 0,
      createdAt: now,
      updatedAt: now,
      readme: readme || `# ${manifest.name}\n\n${manifest.description}\n`,
      permissions: manifest.permissions || [],
      uses: manifest.uses || [],
      providesFor: manifest.providesFor,
      libraries: manifest.libraries,
      ownerGithubId: owner.githubId,
      ownerLogin: owner.login,
      versions: {
        [manifest.version]: {
          version: manifest.version,
          releaseTag: releaseTag || `v${manifest.version}`,
          githubReleaseAssetUrl: githubReleaseAssetUrl || `${manifest.repository}/releases/download/${releaseTag || `v${manifest.version}`}/${pkgName}-${manifest.version}.cdrca-pkg`,
          publishedAt: now,
          downloadCount: 0,
          manifest,
          readme: readme || `# ${manifest.name}\n\n${manifest.description}\n`,
        },
      },
    };

    schema.packages[pkgName] = record;
    saveDatabase(schema);
    return record;
  },

  /**
   * Publish a new version of an existing package (POST /api/packages/:name/releases)
   * Enforces immutability: never allows overwriting an existing published version!
   */
  publishNewRelease(
    pkgName: string,
    manifest: CdrcaManifest,
    readme: string,
    releaseTag: string,
    githubReleaseAssetUrl: string,
    owner: { githubId: string; login: string }
  ): PackageRecord {
    const schema = loadDatabase();
    const nameKey = pkgName.toLowerCase().trim();
    const record = schema.packages[nameKey];

    if (!record) {
      throw new Error(`Package "${pkgName}" does not exist. Use POST /api/packages to register it first.`);
    }

    if (record.ownerLogin.toLowerCase() !== owner.login.toLowerCase() && record.ownerGithubId !== owner.githubId) {
      throw new Error(`Permission denied: Package "${pkgName}" is owned by @${record.ownerLogin}.`);
    }

    // IMMUTABILITY CHECK: The version has not already been published
    if (record.versions[manifest.version]) {
      throw new Error(
        `Version conflict: Version "${manifest.version}" of package "${pkgName}" has already been published. Versions are IMMUTABLE and cannot be overwritten.`
      );
    }

    const now = new Date().toISOString();
    record.latestVersion = manifest.version;
    record.updatedAt = now;
    record.description = manifest.description;
    record.type = manifest.type;
    record.license = manifest.license;
    record.repository = manifest.repository;
    record.permissions = manifest.permissions || [];
    record.uses = manifest.uses || [];
    record.providesFor = manifest.providesFor;
    record.libraries = manifest.libraries;
    if (readme) {
      record.readme = readme;
    }

    record.versions[manifest.version] = {
      version: manifest.version,
      releaseTag,
      githubReleaseAssetUrl: githubReleaseAssetUrl || `${record.repository}/releases/download/${releaseTag}/${record.name}-${manifest.version}.cdrca-pkg`,
      publishedAt: now,
      downloadCount: 0,
      manifest,
      readme: readme || record.readme,
    };

    saveDatabase(schema);
    return record;
  },

  incrementDownload(name: string, version?: string): void {
    const schema = loadDatabase();
    const pkg = schema.packages[name.toLowerCase()];
    if (pkg) {
      pkg.totalDownloads += 1;
      const ver = version || pkg.latestVersion;
      if (pkg.versions[ver]) {
        pkg.versions[ver].downloadCount += 1;
      }
      saveDatabase(schema);
    }
  },

  updatePackageLinks(name: string, links: any): PackageRecord | null {
    const schema = loadDatabase();
    const pkg = schema.packages[name.toLowerCase()];
    if (!pkg) return null;
    pkg.links = { ...(pkg.links || {}), ...links };
    pkg.updatedAt = new Date().toISOString();
    saveDatabase(schema);
    return pkg;
  },

  updatePackageReadme(name: string, readme: string): PackageRecord | null {
    const schema = loadDatabase();
    const pkg = schema.packages[name.toLowerCase()];
    if (!pkg) return null;
    pkg.readme = readme;
    pkg.updatedAt = new Date().toISOString();
    saveDatabase(schema);
    return pkg;
  },

  // User & Session management
  getAllUsers(): UserProfile[] {
    const schema = loadDatabase();
    return Object.values(schema.users);
  },

  upsertUser(user: UserProfile): void {
    const schema = loadDatabase();
    schema.users[user.id] = user;
    saveDatabase(schema);
  },

  getUser(id: string): UserProfile | null {
    const schema = loadDatabase();
    return schema.users[id] || null;
  },

  getUserByLogin(login: string): UserProfile | null {
    const schema = loadDatabase();
    const loginLower = login.toLowerCase();
    return Object.values(schema.users).find((u) => u.login.toLowerCase() === loginLower) || null;
  },

  saveSession(sessionId: string, userId: string, githubToken?: string, ttlMs: number = 30 * 24 * 60 * 60 * 1000): void {
    const schema = loadDatabase();
    schema.sessions[sessionId] = {
      userId,
      githubToken,
      expiresAt: Date.now() + ttlMs,
    };
    // Also save in apiTokens for CLI bearer token resolution
    schema.apiTokens[sessionId] = {
      userId,
      createdAt: new Date().toISOString(),
    };
    saveDatabase(schema);
  },

  getSession(sessionId: string): { user: UserProfile; githubToken?: string } | null {
    const schema = loadDatabase();
    const sess = schema.sessions[sessionId];
    if (!sess) {
      // Check if it's an apiToken
      const apiTok = schema.apiTokens[sessionId];
      if (apiTok) {
        const user = schema.users[apiTok.userId];
        if (user) return { user };
      }
      return null;
    }
    if (Date.now() > sess.expiresAt) {
      delete schema.sessions[sessionId];
      saveDatabase(schema);
      return null;
    }
    const user = schema.users[sess.userId];
    if (!user) return null;
    return { user, githubToken: sess.githubToken };
  },

  deleteSession(sessionId: string): void {
    const schema = loadDatabase();
    delete schema.sessions[sessionId];
    delete schema.apiTokens[sessionId];
    saveDatabase(schema);
  },
};
