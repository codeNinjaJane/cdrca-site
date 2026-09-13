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
  Database,
  BookOpen,
  Globe,
  Edit3,
  Save,
  Link as LinkIcon,
  Search,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Code2,
  FolderGit2,
  Star,
  GitFork,
  Lock,
  Eye,
  Sliders,
  X,
  Download,
} from 'lucide-react';
import { UserProfile, GitHubRepoItem, CdrcaManifest, PackageType, PackageRecord, LibraryLinks } from '../types';
import { SecurityBadge } from './SecurityBadge';
import {
  signOutContributor,
  recordUserLoginInFirestore,
  updateContributorProfileInFirestore,
  savePackageToFirestore,
} from '../lib/firebase';
import {
  authFetch,
  getStoredToken,
  getStoredUser,
  persistUserSession,
  performLogout,
  clearStoredAuth,
} from '../lib/auth';
import { ContributorProfileEditor } from './ContributorProfileEditor';

interface DeveloperSectionProps {
  onPackagePublished: (name: string) => void;
  onSelectContributor?: (login: string) => void;
  currentUser?: UserProfile | null;
  onUserChange?: (user: UserProfile | null) => void;
}

export const DeveloperSection: React.FC<DeveloperSectionProps> = ({
  onPackagePublished,
  onSelectContributor,
  currentUser: propCurrentUser,
  onUserChange,
}) => {
  const [internalUser, setInternalUser] = useState<UserProfile | null>(() =>
    propCurrentUser !== undefined ? propCurrentUser : getStoredUser()
  );
  const currentUser = propCurrentUser !== undefined ? propCurrentUser : internalUser;
  const setCurrentUser = (user: UserProfile | null) => {
    setInternalUser(user);
    onUserChange?.(user);
  };

  const [cliToken, setCliToken] = useState<string>(() => getStoredToken() || '');
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(false);
  const [tokenLoginInput, setTokenLoginInput] = useState<string>('');
  const [loggingInToken, setLoggingInToken] = useState<boolean>(false);
  const [demoLoginName, setDemoLoginName] = useState<string>('');
  const [loggingInDemo, setLoggingInDemo] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Profile Editor state
  const [showProfileEditor, setShowProfileEditor] = useState<boolean>(false);
  const [editBio, setEditBio] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');
  const [editGithub, setEditGithub] = useState<string>('');
  const [editDocs, setEditDocs] = useState<string>('');
  const [editTwitter, setEditTwitter] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);

  // Library links for registration/metadata
  const [libraryLinks, setLibraryLinks] = useState<LibraryLinks>({
    repository: '',
    documentation: '',
    demo: '',
    homepage: '',
    issues: '',
  });

  // Contributor's published packages
  const [myPackages, setMyPackages] = useState<PackageRecord[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);

  // Add New Library Flow Modal / View state
  const [isAddingLibrary, setIsAddingLibrary] = useState<boolean>(false);
  const [addStep, setAddStep] = useState<'select_repo' | 'fill_form' | 'success'>('select_repo');
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>('');
  const [inspectingRepo, setInspectingRepo] = useState<boolean>(false);

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
  const [activeFormTab, setActiveFormTab] = useState<'details' | 'plugin' | 'readme' | 'manifest'>('details');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [justPublishedName, setJustPublishedName] = useState<string>('');

  // Setup modal & copy helpers
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
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
    authMethod: 'github_oauth',
    hasClientId: true,
    hasClientSecret: true,
  });

  // Load auth status and user
  const fetchAuth = () => {
    setLoadingAuth(true);
    const token = getStoredToken();
    const cachedUser = getStoredUser();
    if (cachedUser && !currentUser) {
      setCurrentUser(cachedUser);
    }
    if (token && !cliToken) {
      setCliToken(token);
    }

    authFetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          if (data.token) {
            setCliToken(data.token);
            persistUserSession(data.user, data.token);
          }
          setEditBio(data.user.bio || '');
          setEditWebsite(data.user.links?.website || '');
          setEditGithub(data.user.links?.github || data.user.htmlUrl || '');
          setEditDocs(data.user.links?.docs || '');
          setEditTwitter(data.user.links?.twitter || '');
        } else if (!data.user && token) {
          clearStoredAuth();
          setCurrentUser(null);
        }
        setLoadingAuth(false);
      })
      .catch((err) => {
        console.error('Error fetching auth:', err);
        setLoadingAuth(false);
      });

    authFetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        setAuthDetails((prev) => ({
          ...prev,
          authMethod: data.authMethod || 'github_oauth',
          hasClientId: data.hasClientId,
          hasClientSecret: data.hasClientSecret,
          devUrl: data.devUrl || prev.devUrl,
          sharedUrl: data.sharedUrl || prev.sharedUrl,
          devCallbackUrl: data.devCallbackUrl || prev.devCallbackUrl,
          sharedCallbackUrl: data.sharedCallbackUrl || prev.sharedCallbackUrl,
        }));
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAuth();

    // Listen for OAuth postMessage callback from popup window
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        const u = event.data.user;
        const tok = event.data.token;
        if (u && tok) {
          persistUserSession(u, tok);
          setCurrentUser(u);
          setCliToken(tok);
        }
        fetchAuth();
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Fetch user's repositories and published packages once authenticated
  const loadUserPackages = (userLogin: string) => {
    setLoadingPackages(true);
    authFetch(`/api/contributors/${encodeURIComponent(userLogin)}`)
      .then((res) => res.json())
      .then((data) => {
        setMyPackages(data.packages || []);
        setLoadingPackages(false);
      })
      .catch((e) => {
        console.warn('Could not fetch user packages:', e);
        setLoadingPackages(false);
      });
  };

  const loadUserRepos = () => {
    setLoadingRepos(true);
    authFetch('/api/user/repos')
      .then((res) => res.json())
      .then((data) => {
        setRepos(data.repos || []);
        setLoadingRepos(false);
      })
      .catch((err) => {
        console.error('Error fetching repos:', err);
        setLoadingRepos(false);
      });
  };

  useEffect(() => {
    if (currentUser) {
      loadUserRepos();
      loadUserPackages(currentUser.login);

      // Fetch CLI token
      authFetch('/api/auth/token')
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
    setLoginError(null);
    try {
      const res = await authFetch(
        `/api/auth/github/url?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`
      );
      const data = await res.json();

      if (!data.configured || !data.url) {
        setShowSetupModal(true);
        return;
      }

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

  // Sign in using Personal Access Token
  const handleTokenLogin = async (tokenVal: string) => {
    const trimmed = tokenVal.trim();
    if (!trimmed) {
      setLoginError('Please enter your GitHub Personal Access Token.');
      return;
    }
    setLoggingInToken(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/github-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Failed to authenticate token with GitHub.');
        return;
      }
      if (data.user && data.token) {
        await persistUserSession(data.user, data.token);
        setCurrentUser(data.user);
        setCliToken(data.token);
        setTokenLoginInput('');
      }
    } catch (e: any) {
      setLoginError(e.message || 'Error connecting to GitHub.');
    } finally {
      setLoggingInToken(false);
    }
  };

  // Sign in using GitHub username
  const handleUsernameLogin = async (usernameVal: string) => {
    const trimmed = usernameVal.trim();
    if (!trimmed) {
      setLoginError('Please enter your GitHub username.');
      return;
    }
    setLoggingInDemo(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'GitHub user was not found.');
        return;
      }
      if (data.user && data.token) {
        await persistUserSession(data.user, data.token);
        setCurrentUser(data.user);
        setCliToken(data.token);
        setDemoLoginName('');
      }
    } catch (e: any) {
      setLoginError(e.message || 'Error connecting to GitHub.');
    } finally {
      setLoggingInDemo(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await performLogout();
    setCurrentUser(null);
    setSelectedRepo(null);
    setCliToken('');
    setIsAddingLibrary(false);
  };

  const handleCopyCliToken = () => {
    if (!cliToken) return;
    navigator.clipboard.writeText(`cdrca login --token ${cliToken}`);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Start "Add New Library" flow
  const handleStartAddLibrary = () => {
    setIsAddingLibrary(true);
    setAddStep('select_repo');
    setSelectedRepo(null);
    setPublishStatus(null);
    if (repos.length === 0) {
      loadUserRepos();
    }
  };

  // Select a repo from GitHub and auto-populate form
  const handleSelectRepo = async (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    setPublishStatus(null);
    setInspectingRepo(true);

    try {
      const inspectRes = await authFetch(
        `/api/repos/inspect?owner=${encodeURIComponent(repo.ownerLogin)}&repo=${encodeURIComponent(repo.name)}`
      );
      if (inspectRes.ok) {
        const data = await inspectRes.json();
        if (data.manifest) {
          const cleanName = (data.manifest.name || repo.name).toLowerCase().replace(/[^a-z0-9-_]/g, '-');
          setManifest({
            ...data.manifest,
            name: cleanName,
            author: data.manifest.author || currentUser?.login || '',
            repository: data.manifest.repository || repo.htmlUrl,
            description: data.manifest.description || repo.description || `CDRCA library by @${currentUser?.login}`,
          });
          setSelectedReleaseTag(`v${data.manifest.version || '1.0.0'}`);
          setLibraryLinks({
            repository: data.manifest.repository || repo.htmlUrl,
            documentation: `${data.manifest.repository || repo.htmlUrl}#readme`,
            demo: `https://cdrca.dev/playground?pkg=${cleanName}`,
            homepage: data.manifest.repository || repo.htmlUrl,
            issues: `${data.manifest.repository || repo.htmlUrl}/issues`,
          });
        }
        if (data.readme) {
          setReadmeContent(data.readme);
        } else {
          setReadmeContent(
            `# ${repo.name}\n\n${repo.description || 'A CDRCA animation library.'}\n\n## Installation\n\`\`\`bash\ncdrca install ${repo.name.toLowerCase()}\n\`\`\`\n\n## License\nIslamic Open Source License (IOSL)\n`
          );
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
    } finally {
      setInspectingRepo(false);
      setAddStep('fill_form');
    }
  };

  // Toggle plugin permissions
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

  // Save profile to Firestore
  const handleSaveProfileToFirebase = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    setProfileSaveMsg(null);
    try {
      const updatedLinks = {
        website: editWebsite.trim(),
        github: editGithub.trim(),
        docs: editDocs.trim(),
        twitter: editTwitter.trim(),
      };
      await updateContributorProfileInFirestore(currentUser.id, {
        bio: editBio.trim(),
        links: updatedLinks,
      });
      const updatedUser: UserProfile = {
        ...currentUser,
        bio: editBio.trim(),
        links: updatedLinks,
      };
      setCurrentUser(updatedUser);
      setProfileSaveMsg('Contributor profile & links saved to Firestore!');
      setTimeout(() => setProfileSaveMsg(null), 3000);
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Publishing Library to Registry
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !currentUser) return;

    setPublishing(true);
    setPublishStatus(null);

    const versionTag = selectedReleaseTag.startsWith('v') ? selectedReleaseTag.slice(1) : selectedReleaseTag;
    const cleanManifest: CdrcaManifest = {
      ...manifest,
      name: manifest.name.trim().toLowerCase(),
      version: versionTag,
      author: manifest.author || currentUser.login,
      repository: manifest.repository || selectedRepo.htmlUrl,
    };

    try {
      const res = await authFetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest: cleanManifest,
          readme: readmeContent,
          releaseTag: selectedReleaseTag,
          githubReleaseAssetUrl: `${cleanManifest.repository}/releases/download/${selectedReleaseTag}/${cleanManifest.name}-${cleanManifest.version}.cdrca-pkg`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register library.');
      }

      // Persist package to Firestore
      if (data.package) {
        const fullPkgRecord: PackageRecord = {
          ...data.package,
          links: libraryLinks.repository
            ? libraryLinks
            : {
                repository: cleanManifest.repository,
                documentation: `${cleanManifest.repository}#readme`,
                demo: `https://cdrca.dev/playground?pkg=${cleanManifest.name}`,
                homepage: cleanManifest.repository,
                issues: `${cleanManifest.repository}/issues`,
              },
        };
        savePackageToFirestore(fullPkgRecord).catch((err) =>
          console.warn('Firestore package persistence notice:', err)
        );
      }

      setJustPublishedName(cleanManifest.name);
      setAddStep('success');
      loadUserPackages(currentUser.login);
    } catch (err: any) {
      setPublishStatus({
        type: 'error',
        message: err.message || 'An error occurred during publication.',
      });
    } finally {
      setPublishing(false);
    }
  };

  // Filter repos by search query
  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearchQuery.toLowerCase())) ||
      (r.language && r.language.toLowerCase().includes(repoSearchQuery.toLowerCase()))
  );

  // Total downloads calculated from all published packages
  const totalDownloads = myPackages.reduce((acc, p) => acc + (p.totalDownloads || 0), 0);

  // Loading state
  if (loadingAuth) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="inline-block w-8 h-8 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-stone-500">Checking developer authentication...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: NOT LOGGED IN - GITHUB AUTHENTICATION
  // =========================================================================
  if (!currentUser) {
    return (
      <div id="section-developer" className="max-w-2xl mx-auto py-10 px-4 sm:px-6 space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <KeyRound className="w-3.5 h-3.5 text-stone-600" />
            <span>Developer Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Developer Sign In
          </h1>
          <p className="text-sm text-stone-600 max-w-lg mx-auto">
            Log into your personal GitHub account to register packages, manage releases, and access your contributor dashboard.
          </p>
        </div>

        {/* Popup Blocker Alert */}
        {popupBlocked && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
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

        {/* Error Alert */}
        {loginError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Authentication Error</p>
              <p className="mt-1 text-rose-700">{loginError}</p>
            </div>
            <button
              onClick={() => setLoginError(null)}
              className="text-rose-500 hover:text-rose-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Sign In Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto shadow-xs">
              <Github className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-stone-900 pt-2">
              Authenticate Your GitHub Account
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Every contributor authenticates with their own GitHub credentials. The site remembers you across visits.
            </p>
          </div>

          {/* Option 1: Primary GitHub OAuth */}
          <div className="space-y-3">
            <button
              id="btn-github-oauth-signin"
              onClick={handleConnectGitHub}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs tracking-wide shadow-xs transition-all cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>Sign in with GitHub (OAuth 2.0)</span>
            </button>
            <p className="text-[11px] text-stone-400 text-center">
              Authorizes via official GitHub OAuth to inspect your own repositories & releases.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200" />
            <span className="flex-shrink mx-4 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Or Sign In Direct
            </span>
            <div className="flex-grow border-t border-stone-200" />
          </div>

          {/* Option 2: Personal Access Token (PAT) */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-stone-700" />
              <h3 className="text-xs font-bold text-stone-800">
                Sign In with Personal Access Token (PAT)
              </h3>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Have a GitHub PAT with <code className="bg-stone-200 px-1 py-0.5 rounded text-[10px]">repo</code> or <code className="bg-stone-200 px-1 py-0.5 rounded text-[10px]">read:user</code> scopes? Paste it below to log into your account directly.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTokenLogin(tokenLoginInput);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                id="input-github-pat"
                type="password"
                value={tokenLoginInput}
                onChange={(e) => setTokenLoginInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 flex-1"
              />
              <button
                id="btn-signin-pat"
                type="submit"
                disabled={loggingInToken || !tokenLoginInput.trim()}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
              >
                {loggingInToken ? 'Verifying...' : 'Sign in with Token'}
              </button>
            </form>
          </div>

          {/* Option 3: GitHub Handle Lookup */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-stone-700" />
              <h3 className="text-xs font-bold text-stone-800">
                Enter Your GitHub Username (Sandbox Mode)
              </h3>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Sign in with your public GitHub username to view your profile and test publishing packages.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUsernameLogin(demoLoginName);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                id="input-github-username"
                type="text"
                value={demoLoginName}
                onChange={(e) => setDemoLoginName(e.target.value)}
                placeholder="Enter your GitHub username (e.g. torvalds)"
                className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 flex-1"
              />
              <button
                id="btn-signin-username"
                type="submit"
                disabled={loggingInDemo || !demoLoginName.trim()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
              >
                {loggingInDemo ? 'Looking up...' : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Session Persistence & Security Badge */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-stone-500 border-t border-stone-100">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Automatic Session Persistence
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-stone-500" />
              Live Firestore & Local Registry
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED IN - DEVELOPER DASHBOARD ("DEV PAGE")
  // =========================================================================
  return (
    <div id="section-developer" className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* 1. DEVELOPER HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* User Avatar & Info */}
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.login}
              className="w-16 h-16 rounded-2xl border-2 border-stone-300 object-cover shadow-xs"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  {currentUser.name || currentUser.login}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                  @{currentUser.login}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  GitHub Authenticated
                </span>
              </div>
              <p className="text-xs text-stone-500 line-clamp-1 max-w-lg">
                {currentUser.bio || 'CDRCA Animation DSL contributor and package publisher.'}
              </p>
              <div className="flex items-center gap-3 text-xs text-stone-500 pt-0.5">
                <a
                  href={currentUser.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-stone-900 underline underline-offset-2 inline-flex items-center gap-1 font-medium"
                >
                  <Github className="w-3 h-3" />
                  <span>github.com/{currentUser.login}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                </a>
                {onSelectContributor && (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => onSelectContributor(currentUser.login)}
                      className="hover:text-stone-900 underline underline-offset-2 text-stone-600"
                    >
                      View Public Profile
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-add-new-library"
              onClick={handleStartAddLibrary}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add New Library</span>
            </button>

            <button
              onClick={() => setShowProfileEditor(!showProfileEditor)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-semibold transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>{showProfileEditor ? 'Close Profile' : 'Edit Profile'}</span>
            </button>

            <button
              id="btn-signout"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-stone-700 border border-stone-300 text-xs font-semibold transition-colors"
              title="Sign out of developer portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-stone-100">
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-500 block tracking-wider">
              Published Libraries
            </span>
            <div className="text-xl font-extrabold text-stone-900 mt-1 flex items-center gap-2">
              <Package className="w-4 h-4 text-stone-600" />
              <span>{myPackages.length}</span>
            </div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-500 block tracking-wider">
              Total Package Installs
            </span>
            <div className="text-xl font-extrabold text-stone-900 mt-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-stone-600" />
              <span>{totalDownloads.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-500 block tracking-wider">
              GitHub Repositories Available
            </span>
            <div className="text-xl font-extrabold text-stone-900 mt-1 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-stone-600" />
              <span>{repos.length}</span>
            </div>
          </div>
        </div>

        {/* Expandable Profile & Links Editor */}
        {showProfileEditor && (
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-5 space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-stone-900">
                  Contributor Profile &amp; Bio (Stored in Firestore: users/{currentUser.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileEditor(false)}
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                Close
              </button>
            </div>

            {profileSaveMsg && (
              <div className="p-3 rounded-lg bg-emerald-100 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSaveMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="font-bold text-stone-700 block mb-1">Contributor Bio</label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="e.g. Core contributor building math animation shaders and DSL hooks"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Portfolio or Website URL</label>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">GitHub Profile URL</label>
                <input
                  type="url"
                  value={editGithub}
                  onChange={(e) => setEditGithub(e.target.value)}
                  placeholder={`https://github.com/${currentUser.login}`}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveProfileToFirebase}
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. "ALL THEIR PREVIOUS STUFF": MY PUBLISHED LIBRARIES */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-stone-700" />
              <span>My Published Libraries ({myPackages.length})</span>
            </h2>
            <p className="text-xs text-stone-500">
              All libraries and packages registered under @{currentUser.login} in the CDRCA registry.
            </p>
          </div>

          <button
            onClick={handleStartAddLibrary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add New Library</span>
          </button>
        </div>

        {loadingPackages ? (
          <div className="py-8 text-center text-xs text-stone-500">
            <div className="inline-block w-5 h-5 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-2" />
            <p>Loading your packages...</p>
          </div>
        ) : myPackages.length === 0 ? (
          /* Empty State */
          <div className="text-center py-10 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 space-y-3">
            <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto">
              <Package className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-bold text-stone-900">No libraries published yet</h3>
              <p className="text-xs text-stone-500">
                You haven't registered any packages under @{currentUser.login}. Click below to pick one of your GitHub repositories and publish your first library!
              </p>
            </div>
            <button
              onClick={handleStartAddLibrary}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add New Library Now</span>
            </button>
          </div>
        ) : (
          /* Package Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPackages.map((pkg) => (
              <div
                key={pkg.name}
                className="bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl p-4 flex flex-col justify-between transition-colors text-xs space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm truncate">
                      {pkg.name}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                      {pkg.type}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                    v{pkg.latestVersion}
                  </div>
                  <p className="text-stone-600 line-clamp-2 mt-2 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500">
                  <span>{pkg.totalDownloads || 0} installs</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPackagePublished(pkg.name)}
                      className="font-bold text-stone-900 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. CLI AUTHENTICATION TOKEN */}
      {cliToken && (
        <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">
                CLI Authentication Token
              </h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-800 text-emerald-400 border border-stone-700">
              Active Bearer Token
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Use this bearer token to authenticate the standalone CDRCA CLI tool for command-line publishes:
          </p>
          <div className="flex items-center justify-between gap-3 p-3 bg-stone-950 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 overflow-x-auto">
            <span className="select-all truncate">cdrca login --token {cliToken}</span>
            <button
              onClick={handleCopyCliToken}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium inline-flex items-center gap-1 shrink-0 transition-colors"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToken ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. "ADD NEW LIBRARY" MODAL / WIZARD OVERLAY
          ===================================================================== */}
      {isAddingLibrary && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
                  <Github className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {addStep === 'select_repo'
                      ? 'Select a Repository on Your GitHub Account'
                      : addStep === 'fill_form'
                      ? 'Configure & Register Library'
                      : 'Library Published Successfully!'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {addStep === 'select_repo'
                      ? `Account: @${currentUser.login} • ${repos.length} repositories found`
                      : addStep === 'fill_form'
                      ? `Auto-extracted from ${selectedRepo?.fullName}`
                      : 'Package is now live on CDRCA Registry'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingLibrary(false)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* -------------------------------------------------------------
                  STEP 1: SELECT REPOSITORY FROM GITHUB ACCOUNT
                  ------------------------------------------------------------- */}
              {addStep === 'select_repo' && (
                <div className="space-y-4">
                  {/* Search and refresh toolbar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={repoSearchQuery}
                        onChange={(e) => setRepoSearchQuery(e.target.value)}
                        placeholder="Search your repositories by name, language, or description..."
                        className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={loadUserRepos}
                      disabled={loadingRepos}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-200 transition-colors"
                      title="Refresh repositories from GitHub"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>

                  {/* Repos list */}
                  {loadingRepos ? (
                    <div className="py-16 text-center text-xs text-stone-500 space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
                      <p>Fetching repositories from GitHub API for @{currentUser.login}...</p>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200 p-6">
                      No matching repositories found. Ensure your GitHub account has repositories or try refreshing.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                      {filteredRepos.map((repo) => (
                        <div
                          key={repo.id}
                          onClick={() => handleSelectRepo(repo)}
                          className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-400 cursor-pointer transition-all text-xs flex flex-col justify-between group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-bold text-stone-900 truncate group-hover:text-stone-950">
                                {repo.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {repo.isPrivate ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-600 flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    Private
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Public
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-stone-500 line-clamp-2 leading-relaxed">
                              {repo.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className="pt-2.5 mt-2 border-t border-stone-200/70 flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-medium text-stone-700">{repo.language || 'CDRCA'}</span>
                            <div className="flex items-center gap-2">
                              {repo.stars > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-500" />
                                  {repo.stars}
                                </span>
                              )}
                              <span className="font-semibold text-stone-800 group-hover:underline inline-flex items-center gap-0.5">
                                <span>Select</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 2: FORM AUTO-POPULATED FROM GITHUB REPO
                  ------------------------------------------------------------- */}
              {addStep === 'fill_form' && selectedRepo && (
                <form onSubmit={handlePublish} className="space-y-5">
                  {/* Inspection status badge */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Auto-populated from repository: <strong className="font-mono">{selectedRepo.fullName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddStep('select_repo')}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Choose Different Repo</span>
                    </button>
                  </div>

                  {/* Tab bar for form organization */}
                  <div className="flex items-center gap-1 border-b border-stone-200 pb-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('details')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        activeFormTab === 'details'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Package Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('plugin')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        activeFormTab === 'plugin'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Type &amp; Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('readme')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        activeFormTab === 'readme'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      README / Docs
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('manifest')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        activeFormTab === 'manifest'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      cdrca.json Preview
                    </button>
                  </div>

                  {/* TAB 1: DETAILS */}
                  {activeFormTab === 'details' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Library / Package Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={manifest.name}
                          onChange={(e) =>
                            setManifest({
                              ...manifest,
                              name: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                            })
                          }
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                        <p className="text-[11px] text-stone-400 mt-1">Lowercase letters, numbers, hyphens.</p>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Version &amp; Release Tag <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={selectedReleaseTag}
                          onChange={(e) => {
                            setSelectedReleaseTag(e.target.value);
                            setManifest({
                              ...manifest,
                              version: e.target.value.replace(/^v/, ''),
                            });
                          }}
                          placeholder="v1.0.0"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                        <p className="text-[11px] text-stone-400 mt-1">Immutable semantic version.</p>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold text-stone-700 block mb-1">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={manifest.description}
                          onChange={(e) => setManifest({ ...manifest, description: e.target.value })}
                          placeholder="Brief description of the animation package..."
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Author <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={manifest.author}
                          onChange={(e) => setManifest({ ...manifest, author: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          License <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={manifest.license}
                          onChange={(e) => setManifest({ ...manifest, license: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        >
                          <option value="IOSL">Islamic Open Source License (IOSL)</option>
                          <option value="MIT">MIT License</option>
                          <option value="Apache-2.0">Apache 2.0</option>
                          <option value="BSD-3-Clause">BSD 3-Clause</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold text-stone-700 block mb-1">
                          GitHub Repository URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          required
                          value={manifest.repository}
                          onChange={(e) => setManifest({ ...manifest, repository: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TYPE & PERMISSIONS */}
                  {activeFormTab === 'plugin' && (
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1.5">Package Type</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {(['package', 'plugin', 'app'] as PackageType[]).map((t) => (
                            <div
                              key={t}
                              onClick={() => {
                                const defaultEntry =
                                  t === 'package' ? 'src/main.cdrca' : t === 'plugin' ? 'dist/index.js' : 'app/index.cdrca';
                                setManifest({
                                  ...manifest,
                                  type: t,
                                  entry: defaultEntry,
                                  permissions: t === 'plugin' ? ['trusted', 'fileRead'] : [],
                                  uses: t === 'plugin' ? [['before', 'transpile']] : [],
                                });
                              }}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                manifest.type === t
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                  : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              <div className="font-bold capitalize">{t}</div>
                              <div
                                className={`text-[11px] mt-0.5 ${
                                  manifest.type === t ? 'text-stone-300' : 'text-stone-500'
                                }`}
                              >
                                {t === 'package'
                                  ? 'Reusable math primitives & curves'
                                  : t === 'plugin'
                                  ? 'Compiler hook or AST exporter'
                                  : 'Interactive animation applet'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Entry File</label>
                        <input
                          type="text"
                          required
                          value={manifest.entry}
                          onChange={(e) => setManifest({ ...manifest, entry: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                      </div>

                      {manifest.type === 'plugin' && (
                        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                          <label className="font-bold text-stone-800 block">Plugin Permissions</label>
                          <div className="flex flex-wrap gap-2">
                            {['trusted', 'fileRead', 'network', 'fileWrite'].map((p) => {
                              const active = manifest.permissions.includes(p);
                              return (
                                <button
                                  type="button"
                                  key={p}
                                  onClick={() => togglePermission(p)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                    active
                                      ? 'bg-stone-900 text-white border-stone-900'
                                      : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: README */}
                  {activeFormTab === 'readme' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-stone-700">README Content (Markdown)</label>
                        <span className="text-[11px] text-stone-400">Rendered on package detail page</span>
                      </div>
                      <textarea
                        rows={10}
                        value={readmeContent}
                        onChange={(e) => setReadmeContent(e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                      />
                    </div>
                  )}

                  {/* TAB 4: MANIFEST PREVIEW */}
                  {activeFormTab === 'manifest' && (
                    <div className="space-y-2 text-xs">
                      <span className="font-bold text-stone-700 block">Generated cdrca.json Contract:</span>
                      <pre className="p-3 bg-stone-950 text-stone-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64">
                        {JSON.stringify(manifest, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Publish Status Message */}
                  {publishStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        publishStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                          : 'bg-red-50 text-red-900 border border-red-300'
                      }`}
                    >
                      {publishStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{publishStatus.message}</span>
                    </div>
                  )}

                  {/* Submit buttons */}
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAddStep('select_repo')}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                    >
                      Back to Repos
                    </button>

                    <button
                      type="submit"
                      disabled={publishing}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
                    >
                      {publishing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-white rounded-full animate-spin" />
                          <span>Verifying &amp; Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Publish Library to Registry</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* -------------------------------------------------------------
                  STEP 3: PUBLISHED SUCCESS
                  ------------------------------------------------------------- */}
              {addStep === 'success' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-stone-900">
                      Library "{justPublishedName}" Published!
                    </h3>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Your package has been registered in the CDRCA registry and saved under @{currentUser.login}. Developers can now install it using the CLI:
                    </p>
                  </div>

                  <div className="p-3 bg-stone-900 text-emerald-400 rounded-xl font-mono text-xs max-w-sm mx-auto">
                    cdrca install {justPublishedName}
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingLibrary(false);
                        onPackagePublished(justPublishedName);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold"
                    >
                      <span>View in Registry</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingLibrary(false)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
