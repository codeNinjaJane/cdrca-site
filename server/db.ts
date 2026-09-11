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

const INITIAL_PACKAGES: Record<string, PackageRecord> = {
  calculastic: {
    name: 'calculastic',
    type: 'package',
    description: 'Advanced calculus animation library for parametric curves, derivatives, and vector field rendering.',
    author: 'muhammad-ayyan',
    repository: 'https://github.com/Muhammad-Ayyan-no1/calculastic',
    license: 'IOSL',
    latestVersion: '1.4.2',
    totalDownloads: 4820,
    createdAt: '2026-07-15T08:30:00.000Z',
    updatedAt: '2026-09-02T14:15:00.000Z',
    permissions: [],
    uses: [],
    ownerGithubId: '1001',
    ownerLogin: 'muhammad-ayyan',
    readme: `# calculastic

Advanced calculus animation primitives and math visualizer for the **CDRCA** animation DSL.

## Installation
\`\`\`bash
cdrca install calculastic
\`\`\`

## Quick Example in CDRCA
\`\`\`cdrca
import { ParametricCurve, VectorField } from "calculastic";

scene CalculusDemo {
  duration: 4s;
  fps: 60;
  
  grid = MathGrid({ step: 1.0, range: [-5, 5] });
  curve = ParametricCurve(t => [t, Math.sin(t) * Math.exp(-0.2 * t)], { t: [0, 4 * Math.PI] });
  
  animate(curve.draw(), 2.5s, easeInOutCubic);
}
\`\`\`

## License
Islamic Open Source License (IOSL). See LICENSE.md in canonical CDRCA repository.
`,
    versions: {
      '1.4.2': {
        version: '1.4.2',
        releaseTag: 'v1.4.2',
        githubReleaseAssetUrl: 'https://github.com/Muhammad-Ayyan-no1/calculastic/releases/download/v1.4.2/calculastic-1.4.2.cdrca-pkg',
        publishedAt: '2026-09-02T14:15:00.000Z',
        downloadCount: 1840,
        manifest: {
          name: 'calculastic',
          version: '1.4.2',
          description: 'Advanced calculus animation library',
          type: 'package',
          entry: 'src/main.cdrca',
          icon: 'icon.png',
          author: 'muhammad-ayyan',
          license: 'IOSL',
          repository: 'https://github.com/Muhammad-Ayyan-no1/calculastic',
          dependencies: { mathcore: '^3.1.0' },
          permissions: [],
          uses: [],
        },
      },
      '1.4.0': {
        version: '1.4.0',
        releaseTag: 'v1.4.0',
        githubReleaseAssetUrl: 'https://github.com/Muhammad-Ayyan-no1/calculastic/releases/download/v1.4.0/calculastic-1.4.0.cdrca-pkg',
        publishedAt: '2026-08-20T10:00:00.000Z',
        downloadCount: 1650,
        manifest: {
          name: 'calculastic',
          version: '1.4.0',
          description: 'Calculus animation library',
          type: 'package',
          entry: 'src/main.cdrca',
          author: 'muhammad-ayyan',
          license: 'IOSL',
          repository: 'https://github.com/Muhammad-Ayyan-no1/calculastic',
          dependencies: { mathcore: '^3.0.0' },
          permissions: [],
          uses: [],
        },
      },
      '1.0.0': {
        version: '1.0.0',
        releaseTag: 'v1.0.0',
        githubReleaseAssetUrl: 'https://github.com/Muhammad-Ayyan-no1/calculastic/releases/download/v1.0.0/calculastic-1.0.0.cdrca-pkg',
        publishedAt: '2026-07-15T08:30:00.000Z',
        downloadCount: 1330,
        manifest: {
          name: 'calculastic',
          version: '1.0.0',
          description: 'Initial release of calculastic for CDRCA',
          type: 'package',
          entry: 'src/main.cdrca',
          author: 'muhammad-ayyan',
          license: 'IOSL',
          repository: 'https://github.com/Muhammad-Ayyan-no1/calculastic',
          dependencies: {},
          permissions: [],
          uses: [],
        },
      },
    },
  },
  'gl-transpiler-hook': {
    name: 'gl-transpiler-hook',
    type: 'plugin',
    description: 'Hardware-accelerated shader compiler and AST transpiler pipeline plugin for high-performance CDRCA playback.',
    author: 'ayyan-core',
    repository: 'https://github.com/ISLAH-org/cdrca-gl-hook',
    license: 'IOSL',
    latestVersion: '2.1.0',
    totalDownloads: 3410,
    createdAt: '2026-07-28T12:00:00.000Z',
    updatedAt: '2026-09-05T19:30:00.000Z',
    permissions: ['trusted', 'fileRead', 'spawnProcess'],
    uses: [
      ['before', 'transpile'],
      ['after', 'emit'],
    ],
    ownerGithubId: '1002',
    ownerLogin: 'islah-core',
    readme: `# gl-transpiler-hook (CDRCA Transpiler Plugin)

A low-level plugin hook that attaches to the CDRCA transpilation pipeline to compile GLSL fragment shaders for smooth GPU rendering.

> ⚠️ **Security Notice**: This package is a CDRCA **Plugin**. It executes during the transpiler stage and requests permissions to read files and spawn background compiler tools.

## Permissions Requested
- \`trusted\`: Access to core transpiler context
- \`fileRead\`: Reads shader template files from disk
- \`spawnProcess\`: Spawns native glslangValidator to check shader syntax

## Pipeline Hooks Declared
- \`["before", "transpile"]\`: Intercepts raw .cdrca AST blocks
- \`["after", "emit"]\`: Post-processes the emitted JS animation bundle

## Installation
\`\`\`bash
cdrca install gl-transpiler-hook
\`\`\`

## License
Islamic Open Source License (IOSL).
`,
    versions: {
      '2.1.0': {
        version: '2.1.0',
        releaseTag: 'v2.1.0',
        githubReleaseAssetUrl: 'https://github.com/ISLAH-org/cdrca-gl-hook/releases/download/v2.1.0/gl-transpiler-hook-2.1.0.cdrca-pkg',
        publishedAt: '2026-09-05T19:30:00.000Z',
        downloadCount: 1950,
        manifest: {
          name: 'gl-transpiler-hook',
          version: '2.1.0',
          description: 'Hardware-accelerated shader compiler pipeline plugin',
          type: 'plugin',
          entry: 'dist/index.js',
          author: 'ayyan-core',
          license: 'IOSL',
          repository: 'https://github.com/ISLAH-org/cdrca-gl-hook',
          dependencies: {},
          permissions: ['trusted', 'fileRead', 'spawnProcess'],
          uses: [
            ['before', 'transpile'],
            ['after', 'emit'],
          ],
        },
      },
      '2.0.0': {
        version: '2.0.0',
        releaseTag: 'v2.0.0',
        githubReleaseAssetUrl: 'https://github.com/ISLAH-org/cdrca-gl-hook/releases/download/v2.0.0/gl-transpiler-hook-2.0.0.cdrca-pkg',
        publishedAt: '2026-08-10T16:00:00.000Z',
        downloadCount: 1460,
        manifest: {
          name: 'gl-transpiler-hook',
          version: '2.0.0',
          description: 'Initial pipeline plugin for GLSL rendering in CDRCA',
          type: 'plugin',
          entry: 'dist/index.js',
          author: 'ayyan-core',
          license: 'IOSL',
          repository: 'https://github.com/ISLAH-org/cdrca-gl-hook',
          dependencies: {},
          permissions: ['trusted', 'fileRead'],
          uses: [['before', 'transpile']],
        },
      },
    },
  },
  'pendulum-sim': {
    name: 'pendulum-sim',
    type: 'app',
    description: 'Full interactive double & triple pendulum chaotic motion simulator project created in CDRCA.',
    author: 'physics-dev',
    repository: 'https://github.com/islah-community/pendulum-sim',
    license: 'IOSL',
    latestVersion: '1.0.3',
    totalDownloads: 1980,
    createdAt: '2026-08-01T15:00:00.000Z',
    updatedAt: '2026-09-04T11:20:00.000Z',
    permissions: [],
    uses: [],
    ownerGithubId: '1003',
    ownerLogin: 'physics-dev',
    readme: `# pendulum-sim

A standalone CDRCA application simulating chaotic Lagrangian mechanics with real-time vector path tracing.

## Running the App
\`\`\`bash
cdrca install pendulum-sim
cdrca run pendulum-sim
\`\`\`

## Features
- RK4 integration of non-linear differential equations
- Trace color gradient fading over time
- Real-time parameter tweaking via sliders

## License
Islamic Open Source License (IOSL).
`,
    versions: {
      '1.0.3': {
        version: '1.0.3',
        releaseTag: 'v1.0.3',
        githubReleaseAssetUrl: 'https://github.com/islah-community/pendulum-sim/releases/download/v1.0.3/pendulum-sim-1.0.3.cdrca-pkg',
        publishedAt: '2026-09-04T11:20:00.000Z',
        downloadCount: 1120,
        manifest: {
          name: 'pendulum-sim',
          version: '1.0.3',
          description: 'Interactive multi-pendulum chaos animation app',
          type: 'app',
          entry: 'app/index.cdrca',
          author: 'physics-dev',
          license: 'IOSL',
          repository: 'https://github.com/islah-community/pendulum-sim',
          dependencies: { calculastic: '^1.4.0' },
          permissions: [],
          uses: [],
        },
      },
      '1.0.0': {
        version: '1.0.0',
        releaseTag: 'v1.0.0',
        githubReleaseAssetUrl: 'https://github.com/islah-community/pendulum-sim/releases/download/v1.0.0/pendulum-sim-1.0.0.cdrca-pkg',
        publishedAt: '2026-08-01T15:00:00.000Z',
        downloadCount: 860,
        manifest: {
          name: 'pendulum-sim',
          version: '1.0.0',
          description: 'Double pendulum chaotic motion simulator project in CDRCA',
          type: 'app',
          entry: 'app/index.cdrca',
          author: 'physics-dev',
          license: 'IOSL',
          repository: 'https://github.com/islah-community/pendulum-sim',
          dependencies: {},
          permissions: [],
          uses: [],
        },
      },
    },
  },
  'vectorial-core': {
    name: 'vectorial-core',
    type: 'package',
    description: 'Foundational 2D and 3D vector math primitives, quaternions, and Bézier curves for CDRCA animations.',
    author: 'muhammad-ayyan',
    repository: 'https://github.com/Muhammad-Ayyan-no1/vectorial-core',
    license: 'IOSL',
    latestVersion: '1.1.0',
    totalDownloads: 5120,
    createdAt: '2026-07-10T09:00:00.000Z',
    updatedAt: '2026-09-01T18:00:00.000Z',
    permissions: [],
    uses: [],
    ownerGithubId: '1001',
    ownerLogin: 'muhammad-ayyan',
    readme: `# vectorial-core

Essential vector mathematics and matrix transformation primitives for CDRCA scripts.

## Installation
\`\`\`bash
cdrca install vectorial-core
\`\`\`

## Features
- High performance Vec2, Vec3, Mat4 structs
- Catmull-Rom & Cubic Bézier interpolation
- Zero runtime dependencies

## License
Islamic Open Source License (IOSL).
`,
    versions: {
      '1.1.0': {
        version: '1.1.0',
        releaseTag: 'v1.1.0',
        githubReleaseAssetUrl: 'https://github.com/Muhammad-Ayyan-no1/vectorial-core/releases/download/v1.1.0/vectorial-core-1.1.0.cdrca-pkg',
        publishedAt: '2026-09-01T18:00:00.000Z',
        downloadCount: 2900,
        manifest: {
          name: 'vectorial-core',
          version: '1.1.0',
          description: 'Foundational vector math primitives for CDRCA',
          type: 'package',
          entry: 'lib/vectorial.cdrca',
          author: 'muhammad-ayyan',
          license: 'IOSL',
          repository: 'https://github.com/Muhammad-Ayyan-no1/vectorial-core',
          dependencies: {},
          permissions: [],
          uses: [],
        },
      },
    },
  },
  'mpd-streamer': {
    name: 'mpd-streamer',
    type: 'plugin',
    description: 'Direct high-throughput Motion Path Data (MPD) reader and writer plugin attaching to parse and render hooks.',
    author: 'motion-lab',
    repository: 'https://github.com/islah-org/mpd-streamer',
    license: 'Custom Commercial / IOSL Dual',
    latestVersion: '1.2.0',
    totalDownloads: 2310,
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-09-07T14:00:00.000Z',
    permissions: ['fileRead', 'fileWrite', 'mpdRead', 'mpdWrite'],
    uses: [
      ['on', 'parse'],
      ['before', 'render'],
    ],
    ownerGithubId: '1004',
    ownerLogin: 'motion-lab',
    readme: `# mpd-streamer (CDRCA Plugin)

Enables streaming serialization of CDRCA motion paths into binary \`.mpd\` cache files for immediate scrubbing.

> ⚠️ **Security Notice**: This is a CDRCA **Plugin**. It requests explicit permissions to read and write files on disk as well as manipulate MPD stream buffers.

## Permissions Requested
- \`fileRead\`: Load cached motion trajectory files
- \`fileWrite\`: Save exported motion path streams
- \`mpdRead\`: Access raw motion buffers in CDRCA memory
- \`mpdWrite\`: Inject computed coordinate frames

## Installation
\`\`\`bash
cdrca install mpd-streamer
\`\`\`

## License
Custom Commercial / IOSL Dual. Declared by author in cdrca.json.
`,
    versions: {
      '1.2.0': {
        version: '1.2.0',
        releaseTag: 'v1.2.0',
        githubReleaseAssetUrl: 'https://github.com/islah-org/mpd-streamer/releases/download/v1.2.0/mpd-streamer-1.2.0.cdrca-pkg',
        publishedAt: '2026-09-07T14:00:00.000Z',
        downloadCount: 1240,
        manifest: {
          name: 'mpd-streamer',
          version: '1.2.0',
          description: 'High-throughput Motion Path Data reader and writer plugin',
          type: 'plugin',
          entry: 'dist/mpd.js',
          author: 'motion-lab',
          license: 'Custom Commercial / IOSL Dual',
          repository: 'https://github.com/islah-org/mpd-streamer',
          dependencies: {},
          permissions: ['fileRead', 'fileWrite', 'mpdRead', 'mpdWrite'],
          uses: [
            ['on', 'parse'],
            ['before', 'render'],
          ],
        },
      },
    },
  },
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDatabase(): DatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = {
      packages: INITIAL_PACKAGES,
      users: {
        '1001': {
          id: '1001',
          githubId: '1001',
          login: 'muhammad-ayyan',
          name: 'Muhammad Ayyan',
          avatarUrl: 'https://avatars.githubusercontent.com/u/108926913?v=4',
          htmlUrl: 'https://github.com/Muhammad-Ayyan-no1',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      sessions: {},
      apiTokens: {
        cdrca_tok_muhammad_ayyan: {
          userId: '1001',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.packages) parsed.packages = INITIAL_PACKAGES;
    if (!parsed.users) parsed.users = {};
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.apiTokens) parsed.apiTokens = {};
    return parsed;
  } catch (err) {
    console.error('Failed to read database, restoring backup:', err);
    return { packages: INITIAL_PACKAGES, users: {}, sessions: {}, apiTokens: {} };
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
      totalDownloads: 1,
      createdAt: now,
      updatedAt: now,
      readme: readme || `# ${manifest.name}\n\n${manifest.description}\n`,
      permissions: manifest.permissions || [],
      uses: manifest.uses || [],
      ownerGithubId: owner.githubId,
      ownerLogin: owner.login,
      versions: {
        [manifest.version]: {
          version: manifest.version,
          releaseTag: releaseTag || `v${manifest.version}`,
          githubReleaseAssetUrl: githubReleaseAssetUrl || `${manifest.repository}/releases/download/${releaseTag || `v${manifest.version}`}/${pkgName}-${manifest.version}.cdrca-pkg`,
          publishedAt: now,
          downloadCount: 1,
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

  // User & Session management
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
