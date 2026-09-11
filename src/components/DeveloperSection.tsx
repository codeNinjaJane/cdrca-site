import React, { useState, useEffect } from 'react';
import {
  Github,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  FileCode,
  Upload,
  Layers,
  Sparkles,
  Info,
  LogOut,
  UserCheck,
  Terminal,
  Copy,
  Check,
  Package,
  History,
} from 'lucide-react';
import { UserProfile, GitHubRepoItem, CdrcaManifest, PackageType, PackageRecord } from '../types';
import { SecurityBadge } from './SecurityBadge';

interface DeveloperSectionProps {
  onPackagePublished: (name: string) => void;
  onSelectContributor?: (login: string) => void;
}

export const DeveloperSection: React.FC<DeveloperSectionProps> = ({
  onPackagePublished,
  onSelectContributor,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cliToken, setCliToken] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [callbackUrl, setCallbackUrl] = useState<string>('');
  const [appUrl, setAppUrl] = useState<string>('');
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Contributor's published packages
  const [myPackages, setMyPackages] = useState<PackageRecord[]>([]);

  // Repos state
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [availableReleases, setAvailableReleases] = useState<string[]>([]);
  const [selectedReleaseTag, setSelectedReleaseTag] = useState<string>('v1.0.0');

  // Manifest editor state
  const [manifest, setManifest] = useState<CdrcaManifest>({
    name: '',
    version: '1.0.0',
    description: '',
    type: 'package',
    entry: 'src/main.cdrca',
    icon: 'icon.png',
    author: '',
    license: 'IOSL',
    repository: '',
    dependencies: {},
    permissions: [],
    uses: [],
  });

  const [readmeContent, setReadmeContent] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New hook input fields for plugins
  const [newHookTiming, setNewHookTiming] = useState<string>('before');
  const [newHookStage, setNewHookStage] = useState<string>('transpile');
  const [customPermissionInput, setCustomPermissionInput] = useState<string>('');
  const [newDepKey, setNewDepKey] = useState<string>('');
  const [newDepVal, setNewDepVal] = useState<string>('^1.0.0');

  // Setup modal & copy helpers
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [authDetails, setAuthDetails] = useState<{
    devUrl: string;
    sharedUrl: string;
    devCallbackUrl: string;
    sharedCallbackUrl: string;
    authMethod: string;
    hasClientId: boolean;
    hasClientSecret: boolean;
  }>({
    devUrl: 'https://ais-dev-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app',
    sharedUrl: 'https://ais-pre-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app',
    devCallbackUrl: 'https://ais-dev-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app/auth/callback',
    sharedCallbackUrl: 'https://ais-pre-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app/auth/callback',
    authMethod: 'none',
    hasClientId: false,
    hasClientSecret: false,
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Load auth status
  const fetchAuth = () => {
    setLoadingAuth(true);
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setCurrentUser(data.user);
        if (data.token) {
          setCliToken(data.token);
        }
        setIsConfigured(Boolean(data.configured));
        setCallbackUrl(data.callbackUrl || '');
        setAppUrl(data.appUrl || '');
        setAuthDetails({
          devUrl: data.devUrl || 'https://ais-dev-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app',
          sharedUrl: data.sharedUrl || 'https://ais-pre-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app',
          devCallbackUrl: data.devCallbackUrl || 'https://ais-dev-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app/auth/callback',
          sharedCallbackUrl: data.sharedCallbackUrl || 'https://ais-pre-2lhvcfb237pkxbmnjj4od6-388732444541.asia-southeast1.run.app/auth/callback',
          authMethod: data.authMethod || (data.user ? 'sandbox' : 'none'),
          hasClientId: Boolean(data.hasClientId),
          hasClientSecret: Boolean(data.hasClientSecret),
        });
        setLoadingAuth(false);
      })
      .catch((err) => {
        console.error('Error checking auth:', err);
        setLoadingAuth(false);
      });
  };

  useEffect(() => {
    fetchAuth();

    // Listen for postMessage from OAuth popup (with origin validation)
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          setCliToken(event.data.token);
        }
        if (event.data.user) {
          setCurrentUser(event.data.user);
        }
        setShowSetupModal(false);
        setPopupBlocked(false);
        fetchAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch repositories and author packages once authenticated
  useEffect(() => {
    if (currentUser) {
      setLoadingRepos(true);
      fetch('/api/user/repos')
        .then((res) => res.json())
        .then((data) => {
          setRepos(data.repos || []);
          setLoadingRepos(false);
        })
        .catch((err) => {
          console.error('Error fetching repos:', err);
          setLoadingRepos(false);
        });

      // Fetch user's existing published packages
      fetch(`/api/contributors/${encodeURIComponent(currentUser.login)}`)
        .then((res) => res.json())
        .then((data) => {
          setMyPackages(data.packages || []);
        })
        .catch((e) => console.warn('Could not fetch user packages:', e));

      // Fetch CLI token if not yet loaded
      fetch('/api/auth/token')
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setCliToken(data.token);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Handle GitHub OAuth popup trigger
  const handleConnectGitHub = async () => {
    setPopupBlocked(false);
    try {
      const res = await fetch(`/api/auth/github/url?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`);
      const data = await res.json();

      if (!data.configured || !data.url) {
        // Show setup modal explaining credentials
        setShowSetupModal(true);
        return;
      }

      // Open OAuth provider URL directly in popup per oauth-integration skill
      const popup = window.open(
        data.url,
        'github_oauth_popup',
        'width=620,height=750,menubar=no,toolbar=no,status=no,location=yes,resizable=yes,scrollbars=yes'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setPopupBlocked(true);
      }
    } catch (e) {
      console.error('OAuth initiation failed:', e);
      setShowSetupModal(true);
    }
  };

  // Sandbox login for immediate testing
  const handleSandboxLogin = async (username: string = 'muhammad-ayyan') => {
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        if (data.token) setCliToken(data.token);
        fetchAuth();
      }
    } catch (e) {
      console.error('Sandbox login error:', e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setSelectedRepo(null);
    setCliToken('');
  };

  const handleCopyCliToken = () => {
    if (!cliToken) return;
    navigator.clipboard.writeText(`cdrca login --token ${cliToken}`);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Select a repo and inspect / populate cdrca.json
  const handleSelectRepo = async (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    setPublishStatus(null);

    // Verify ownership/admin
    if (!repo.isAdmin && repo.ownerLogin.toLowerCase() !== currentUser?.login.toLowerCase()) {
      setPublishStatus({
        type: 'error',
        message: `Permission check failed: You must have administrative ownership of "${repo.fullName}" to register it.`,
      });
      return;
    }

    try {
      const inspectRes = await fetch(
        `/api/repos/inspect?owner=${encodeURIComponent(repo.ownerLogin)}&repo=${encodeURIComponent(repo.name)}`
      );
      if (inspectRes.ok) {
        const data = await inspectRes.json();
        if (data.manifest) {
          setManifest({
            ...data.manifest,
            author: data.manifest.author || currentUser?.login || '',
            repository: data.manifest.repository || repo.htmlUrl,
          });
          setSelectedReleaseTag(`v${data.manifest.version}`);
        }
        if (data.readme) {
          setReadmeContent(data.readme);
        }
        if (data.releases && data.releases.length > 0) {
          setAvailableReleases(data.releases);
          setSelectedReleaseTag(data.releases[0]);
        } else {
          setAvailableReleases([`v${data.manifest?.version || '1.0.0'}`]);
          setSelectedReleaseTag(`v${data.manifest?.version || '1.0.0'}`);
        }
      }
    } catch (e) {
      console.error('Inspect repo failed:', e);
    }
  };

  // Permission toggle for plugins
  const togglePermission = (perm: string) => {
    const current = [...manifest.permissions];
    const index = current.indexOf(perm);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(perm);
    }
    setManifest({ ...manifest, permissions: current });
  };

  const addCustomPermission = () => {
    const clean = customPermissionInput.trim();
    if (!clean) return;
    if (!manifest.permissions.includes(clean)) {
      setManifest({ ...manifest, permissions: [...manifest.permissions, clean] });
    }
    setCustomPermissionInput('');
  };

  // Pipeline hook manipulation
  const addHook = () => {
    if (!newHookTiming || !newHookStage) return;
    const pair: [string, string] = [newHookTiming.trim(), newHookStage.trim()];
    setManifest({
      ...manifest,
      uses: [...manifest.uses, pair],
    });
  };

  const removeHook = (index: number) => {
    const next = [...manifest.uses];
    next.splice(index, 1);
    setManifest({ ...manifest, uses: next });
  };

  // Dependency manipulation
  const addDependency = () => {
    const key = newDepKey.trim();
    const val = newDepVal.trim();
    if (!key) return;
    setManifest({
      ...manifest,
      dependencies: {
        ...(manifest.dependencies || {}),
        [key]: val,
      },
    });
    setNewDepKey('');
  };

  const removeDependency = (key: string) => {
    const next = { ...(manifest.dependencies || {}) };
    delete next[key];
    setManifest({ ...manifest, dependencies: next });
  };

  // Publish submission
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setPublishStatus(null);

    // Strict validation: version in manifest must match GitHub release tag
    const cleanVersion = manifest.version.trim().replace(/^v/, '');
    const cleanTag = selectedReleaseTag.trim().replace(/^v/, '');

    if (cleanVersion !== cleanTag) {
      setPublishing(false);
      setPublishStatus({
        type: 'error',
        message: `Version mismatch: The version in cdrca.json ("${manifest.version}") must match the GitHub release tag ("${selectedReleaseTag}").`,
      });
      return;
    }

    try {
      // Determine if package already exists
      const existing = myPackages.find((p) => p.name.toLowerCase() === manifest.name.toLowerCase());
      const endpoint = existing ? `/api/packages/${manifest.name}/releases` : '/api/packages';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          readme: readmeContent,
          releaseTag: selectedReleaseTag,
          githubReleaseAssetUrl: `${manifest.repository}/releases/download/${selectedReleaseTag}/${manifest.name}-${manifest.version}.cdrca-pkg`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish package');
      }

      setPublishStatus({
        type: 'success',
        message: `Package "${manifest.name}" v${manifest.version} successfully published to the CDRCA registry!`,
      });
      onPackagePublished(manifest.name);
    } catch (err: any) {
      setPublishStatus({
        type: 'error',
        message: err.message || 'An error occurred during publication.',
      });
    } finally {
      setPublishing(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-block w-8 h-8 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-3" />
        <p className="text-xs text-stone-500">Checking contributor session...</p>
      </div>
    );
  }

  return (
    <div id="section-developer" className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 mb-3">
          <KeyRound className="w-3.5 h-3.5 text-stone-600" />
          <span>Contributor &amp; Developer Registry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
          Publish to CDRCA Registry
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Sign in with GitHub to verify repository ownership, enforce version immutability, parse your <code className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded text-stone-800">cdrca.json</code> manifest contract, and issue CLI authentication tokens.
        </p>
      </div>

      {/* Popup Blocker Alert */}
      {popupBlocked && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Browser Popup Blocked</p>
            <p className="mt-1 text-amber-700">
              Your browser blocked the GitHub authorization window. Please allow popups for this site, or{' '}
              <button onClick={handleConnectGitHub} className="underline font-bold text-amber-900 hover:text-amber-950">
                click here to try again
              </button>
              .
            </p>
          </div>
        </div>
      )}

      {/* STATE 1: NOT LOGGED IN */}
      {!currentUser && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Sign In Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Github className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3 border">
              {isConfigured ? (
                <span className="text-emerald-700 bg-emerald-50 border-emerald-200 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  GitHub OAuth Configured &amp; Active
                </span>
              ) : (
                <span className="text-amber-700 bg-amber-50 border-amber-200 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  OAuth Secrets Pending in Settings
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-stone-900">Sign in with GitHub</h2>
            <p className="text-sm text-stone-600 mt-2 mb-6 max-w-md mx-auto">
              Contributors authenticate with GitHub to verify repository ownership before registering packages, checking manifest contracts, and publishing releases.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-signin-github"
                onClick={handleConnectGitHub}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 font-semibold text-sm transition-colors shadow-xs"
              >
                <Github className="w-4 h-4" />
                <span>Continue with GitHub</span>
              </button>

              <button
                id="btn-sandbox-signin"
                onClick={() => handleSandboxLogin('ayyan-contributor')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-sm border border-stone-300 transition-colors"
                title="Instant test mode without setting up GitHub OAuth app keys"
              >
                <UserCheck className="w-4 h-4 text-stone-600" />
                <span>Test as Sandbox Contributor</span>
              </button>
            </div>
          </div>

          {/* GitHub OAuth Setup Instructions Card */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 text-xs text-stone-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                <Info className="w-4 h-4 text-stone-600" />
                <span>GitHub OAuth Configuration Guide</span>
              </div>
              <button
                onClick={fetchAuth}
                className="text-[11px] font-medium text-stone-600 hover:text-stone-900 underline"
              >
                Refresh Status
              </button>
            </div>

            <p className="text-stone-600 leading-relaxed">
              To connect real GitHub repositories, configure an OAuth App in GitHub and add credentials in AI Studio:
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <div className="font-semibold text-stone-800 mb-1">
                  1. Create OAuth App on GitHub
                </div>
                <p className="text-stone-500 mb-2">
                  Visit <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="underline text-stone-900 font-medium inline-flex items-center gap-0.5">GitHub Developer Settings <ExternalLink className="w-3 h-3" /></a> and click <strong>New OAuth App</strong>.
                </p>
              </div>

              {/* Step 2: URLs */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                <div className="font-semibold text-stone-800">
                  2. Set OAuth Application URLs
                </div>

                <div>
                  <div className="text-[11px] text-stone-500 mb-1">Homepage URL:</div>
                  <div className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200 font-mono text-[11px] text-stone-800">
                    <span className="truncate mr-2">{authDetails.devUrl}</span>
                    <button
                      onClick={() => copyToClipboard(authDetails.devUrl, 'devUrl')}
                      className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 shrink-0 font-sans text-[11px]"
                    >
                      {copiedItem === 'devUrl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedItem === 'devUrl' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-stone-500 mb-1">Authorization callback URL (Development):</div>
                  <div className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200 font-mono text-[11px] text-stone-800">
                    <span className="truncate mr-2">{authDetails.devCallbackUrl}</span>
                    <button
                      onClick={() => copyToClipboard(authDetails.devCallbackUrl, 'devCallback')}
                      className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 shrink-0 font-sans text-[11px]"
                    >
                      {copiedItem === 'devCallback' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedItem === 'devCallback' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-stone-500 mb-1">Authorization callback URL (Shared/Deployed):</div>
                  <div className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200 font-mono text-[11px] text-stone-800">
                    <span className="truncate mr-2">{authDetails.sharedCallbackUrl}</span>
                    <button
                      onClick={() => copyToClipboard(authDetails.sharedCallbackUrl, 'sharedCallback')}
                      className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 shrink-0 font-sans text-[11px]"
                    >
                      {copiedItem === 'sharedCallback' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedItem === 'sharedCallback' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <div className="font-semibold text-stone-800 mb-1">
                  3. Add Credentials in AI Studio Settings
                </div>
                <p className="text-stone-600 leading-relaxed">
                  In Google AI Studio, click the <strong>Settings (gear icon)</strong> in the top header, and add:
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span className="text-stone-800">GITHUB_CLIENT_ID</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold ${authDetails.hasClientId ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                      {authDetails.hasClientId ? 'Set' : 'Pending'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span className="text-stone-800">GITHUB_CLIENT_SECRET</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold ${authDetails.hasClientSecret ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                      {authDetails.hasClientSecret ? 'Set' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 pt-1">
              Note: You can test the complete repository inspection, manifest validation, version immutability, and publishing workflow right now using <strong>Test as Sandbox Contributor</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal Dialog */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-stone-700" />
                  <span>GitHub OAuth Credentials Required</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Configure your GitHub OAuth credentials in AI Studio Settings to sign in with your GitHub account.
                </p>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2 text-stone-700">
              <p className="font-semibold text-stone-900">How to configure:</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-stone-600">
                <li>
                  Open <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="underline text-stone-900 font-medium">GitHub Developer Settings</a> and create an OAuth App.
                </li>
                <li>
                  Set <strong>Homepage URL</strong>:
                  <div className="flex items-center justify-between p-1.5 my-1 rounded bg-white border font-mono text-[11px]">
                    <span className="truncate mr-2">{authDetails.devUrl}</span>
                    <button
                      onClick={() => copyToClipboard(authDetails.devUrl, 'modalDevUrl')}
                      className="text-stone-600 hover:text-stone-900 shrink-0 font-sans"
                    >
                      {copiedItem === 'modalDevUrl' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </li>
                <li>
                  Set <strong>Authorization callback URL</strong>:
                  <div className="flex items-center justify-between p-1.5 my-1 rounded bg-white border font-mono text-[11px]">
                    <span className="truncate mr-2">{authDetails.devCallbackUrl}</span>
                    <button
                      onClick={() => copyToClipboard(authDetails.devCallbackUrl, 'modalCallback')}
                      className="text-stone-600 hover:text-stone-900 shrink-0 font-sans"
                    >
                      {copiedItem === 'modalCallback' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </li>
                <li>
                  Click the <strong>Settings (gear icon)</strong> in AI Studio and add:
                  <div className="mt-1 font-mono text-[11px] text-stone-800 space-y-1">
                    <div className="p-1.5 bg-white rounded border">GITHUB_CLIENT_ID = &lt;your_client_id&gt;</div>
                    <div className="p-1.5 bg-white rounded border">GITHUB_CLIENT_SECRET = &lt;your_client_secret&gt;</div>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSetupModal(false);
                  handleSandboxLogin('ayyan-contributor');
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors"
              >
                Use Sandbox Contributor Instead
              </button>
              <button
                onClick={() => {
                  fetchAuth();
                  setShowSetupModal(false);
                }}
                className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors"
              >
                I've Added Secrets / Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: AUTHENTICATED */}
      {currentUser && (
        <div className="space-y-8">
          {/* Contributor Profile Header */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.login}
                className="w-12 h-12 rounded-full border-2 border-stone-200 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-stone-900">{currentUser.name}</h2>
                  <span className="text-xs text-stone-500 font-mono">@{currentUser.login}</span>
                  {authDetails.authMethod === 'github_oauth' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      GitHub Live OAuth
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 inline-flex items-center gap-1">
                      Sandbox Mode
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authenticated Contributor</span>
                  <span>•</span>
                  {onSelectContributor && (
                    <button
                      onClick={() => onSelectContributor(currentUser.login)}
                      className="hover:text-stone-800 underline underline-offset-2"
                    >
                      View Profile Page
                    </button>
                  )}
                  <span>•</span>
                  <a
                    href={currentUser.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-stone-800 underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    <span>GitHub Profile</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </a>
                  {authDetails.authMethod !== 'github_oauth' && (
                    <>
                      <span>•</span>
                      <button
                        onClick={handleConnectGitHub}
                        className="text-stone-700 hover:text-stone-950 font-medium underline inline-flex items-center gap-1"
                      >
                        <Github className="w-3 h-3" />
                        <span>Switch to Real GitHub Account</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-signout"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* CLI Login Token Card */}
          {cliToken && (
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">
                    CDRCA CLI Authentication Token
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-800 text-emerald-400 border border-stone-700">
                  Active Bearer Token
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Use this session token to authenticate the standalone CDRCA CLI tool for command-line publishes and private registry queries:
              </p>
              <div className="flex items-center justify-between gap-3 p-3 bg-stone-950 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 overflow-x-auto">
                <span className="select-all truncate">cdrca login --token {cliToken}</span>
                <button
                  onClick={handleCopyCliToken}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium inline-flex items-center gap-1 shrink-0 transition-colors"
                  title="Copy command"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* My Published Packages */}
          {myPackages.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-stone-600" />
                <span>My Published Packages ({myPackages.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myPackages.map((p) => (
                  <div
                    key={p.name}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span className="font-mono">{p.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 uppercase">{p.type}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">v{p.latestVersion}</div>
                      <p className="text-stone-600 line-clamp-2 mt-1">{p.description}</p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between">
                      <span>{p.totalDownloads} installs</span>
                      <button
                        type="button"
                        onClick={() => onPackagePublished(p.name)}
                        className="text-stone-900 font-bold hover:underline"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: SELECT REPOSITORY */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Step 1: Select Your GitHub Repository
                </h3>
                <p className="text-xs text-stone-500">
                  Only repositories you own or administer can be published to prevent unauthorized takeovers.
                </p>
              </div>
              <span className="text-xs font-medium text-stone-500">
                {repos.length} repos available
              </span>
            </div>

            {loadingRepos ? (
              <div className="py-8 text-center text-xs text-stone-500">
                <div className="inline-block w-5 h-5 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-2" />
                <p>Loading your repositories...</p>
              </div>
            ) : repos.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-xl text-center text-xs text-stone-500">
                No repositories found. Ensure your GitHub account has public or private repositories.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                {repos.map((r) => {
                  const isSelected = selectedRepo?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRepo(r)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <div className="font-bold truncate flex items-center justify-between">
                        <span className="truncate">{r.name}</span>
                        {r.isAdmin && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isSelected ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 line-clamp-2 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                        {r.description || 'No description provided.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: MANIFEST & REGISTRATION FORM */}
          {selectedRepo && (
            <form
              onSubmit={handlePublish}
              className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="border-b border-stone-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Step 2: Manifest &amp; Package Metadata (<code className="font-mono text-sm text-stone-700">cdrca.json</code>)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Enforcing version immutability and fixed schema contract for <strong className="text-stone-800">{selectedRepo.fullName}</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ownership Verified</span>
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {publishStatus && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                    publishStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-red-50 text-red-900 border border-red-300'
                  }`}
                >
                  {publishStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">{publishStatus.message}</span>
                </div>
              )}

              {/* Release Tag Matching Field */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-stone-600" />
                    <span>GitHub Release Tag (Must match manifest version exactly) *</span>
                  </label>
                  <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Versions are IMMUTABLE
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    value={selectedReleaseTag}
                    onChange={(e) => {
                      setSelectedReleaseTag(e.target.value);
                      // Sync manifest version automatically
                      const stripped = e.target.value.replace(/^v/, '');
                      setManifest((prev) => ({ ...prev, version: stripped }));
                    }}
                    className="w-48 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                    placeholder="v1.0.0"
                  />
                  <span className="text-stone-500">
                    Manifest version: <code className="font-mono bg-stone-200 px-1.5 py-0.5 rounded">{manifest.version}</code>
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  The registry checks that this GitHub release tag exists and that version <code className="font-mono">{manifest.version}</code> has not been published previously.
                </p>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {/* Package Name */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={manifest.name}
                    onChange={(e) => setManifest({ ...manifest, name: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
                    placeholder="e.g. calculastic"
                  />
                </div>

                {/* Version */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Semver Version *
                  </label>
                  <input
                    type="text"
                    required
                    value={manifest.version}
                    onChange={(e) => {
                      setManifest({ ...manifest, version: e.target.value });
                      setSelectedReleaseTag(`v${e.target.value.replace(/^v/, '')}`);
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
                    placeholder="1.0.0"
                  />
                </div>

                {/* Type Selection */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Package Type * (Strict Contract)
                  </label>
                  <select
                    value={manifest.type}
                    onChange={(e) => setManifest({ ...manifest, type: e.target.value as PackageType })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs font-semibold focus:ring-1 focus:ring-stone-400"
                  >
                    <option value="package">package (Reusable .cdrca library)</option>
                    <option value="plugin">plugin (Transpiler AST / hook module)</option>
                    <option value="app">app (Standalone runnable CDRCA project)</option>
                  </select>
                </div>

                {/* Entry file */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Entry Path *
                  </label>
                  <input
                    type="text"
                    required
                    value={manifest.entry}
                    onChange={(e) => setManifest({ ...manifest, entry: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
                    placeholder="src/main.cdrca or dist/index.js"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Author String *
                  </label>
                  <input
                    type="text"
                    required
                    value={manifest.author}
                    onChange={(e) => setManifest({ ...manifest, author: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
                    placeholder="author name or handle"
                  />
                </div>

                {/* License */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    License * (Declared verbatim)
                  </label>
                  <input
                    type="text"
                    required
                    value={manifest.license}
                    onChange={(e) => setManifest({ ...manifest, license: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs font-medium focus:ring-1 focus:ring-stone-400 focus:bg-white"
                    placeholder="IOSL or custom license declared by repo"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Never defaulted to MIT. Stores declared string.
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-xs">
                  Package Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manifest.description}
                  onChange={(e) => setManifest({ ...manifest, description: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
                  placeholder="Describe your animation library, plugin capabilities, or app..."
                />
              </div>

              {/* SPECIAL SECTION FOR PLUGINS: PERMISSIONS & USES */}
              {manifest.type === 'plugin' && (
                <div className="p-5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-800" />
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Plugin Security Declarations (permissions &amp; uses)
                    </h4>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Plugins hook into CDRCA's compiler pipeline. Declare all system capabilities and hooks your plugin requires. These are stored verbatim in <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">cdrca.json</code> and displayed prominently to users.
                  </p>

                  {/* Standard Permissions Checkboxes */}
                  <div>
                    <label className="font-bold text-stone-800 text-xs block mb-2">
                      Declared System Permissions:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        'trusted',
                        'trusted_sys',
                        'spawnProcess',
                        'fileRead',
                        'fileWrite',
                        'mpdRead',
                        'mpdWrite',
                        'embedded',
                      ].map((perm) => {
                        const isChecked = manifest.permissions.includes(perm);
                        return (
                          <label
                            key={perm}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold'
                                : 'bg-white border-stone-200 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm)}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span className="font-mono text-[11px]">{perm}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Custom permission adder */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <input
                        type="text"
                        value={customPermissionInput}
                        onChange={(e) => setCustomPermissionInput(e.target.value)}
                        placeholder="Add custom permission string..."
                        className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-800"
                      />
                      <button
                        type="button"
                        onClick={addCustomPermission}
                        className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-900"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Pipeline Hooks (uses) */}
                  <div className="pt-3 border-t border-amber-200">
                    <label className="font-bold text-stone-800 text-xs block mb-1">
                      Transpiler Pipeline Hooks (uses):
                    </label>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {manifest.uses.map(([timing, stage], idx) => (
                        <span
                          key={`${timing}-${stage}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-stone-900 border border-amber-300 font-mono text-xs"
                        >
                          <strong>{timing}</strong> → {stage}
                          <button
                            type="button"
                            onClick={() => removeHook(idx)}
                            className="text-stone-400 hover:text-red-600 ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={newHookTiming}
                        onChange={(e) => setNewHookTiming(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
                      >
                        <option value="before">before</option>
                        <option value="after">after</option>
                        <option value="on">on</option>
                      </select>
                      <input
                        type="text"
                        value={newHookStage}
                        onChange={(e) => setNewHookStage(e.target.value)}
                        placeholder="stage (e.g. transpile, parse, render, emit)"
                        className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-800"
                      />
                      <button
                        type="button"
                        onClick={addHook}
                        className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-900"
                      >
                        Add Hook
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dependencies Map */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-xs">
                  CDRCA Dependencies
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(manifest.dependencies || {}).map(([dName, dVer]) => (
                    <span
                      key={dName}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 border border-stone-300 font-mono text-xs text-stone-800"
                    >
                      <span>{dName}: {dVer}</span>
                      <button
                        type="button"
                        onClick={() => removeDependency(dName)}
                        className="text-stone-400 hover:text-red-600"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDepKey}
                    onChange={(e) => setNewDepKey(e.target.value)}
                    placeholder="Package name (e.g. mathcore)"
                    className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800"
                  />
                  <input
                    type="text"
                    value={newDepVal}
                    onChange={(e) => setNewDepVal(e.target.value)}
                    placeholder="^1.0.0"
                    className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 w-24"
                  />
                  <button
                    type="button"
                    onClick={addDependency}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold"
                  >
                    Add Dep
                  </button>
                </div>
              </div>

              {/* README editor */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-xs">
                  Package README (Markdown)
                </label>
                <textarea
                  rows={6}
                  value={readmeContent}
                  onChange={(e) => setReadmeContent(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white leading-relaxed"
                  placeholder="# My Package&#10;&#10;Documentation, usage examples, and license terms."
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-publish"
                  type="submit"
                  disabled={publishing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>{publishing ? 'Publishing Package...' : 'Publish to Registry'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
