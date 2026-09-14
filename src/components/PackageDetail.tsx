import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  ExternalLink,
  Package as PkgIcon,
  Puzzle,
  PlaySquare,
  Clock,
  Tag,
  Shield,
  FileCode,
  Layers,
  History,
  AlertTriangle,
  Database,
  Globe,
  BookOpen,
  Edit3,
  Save,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { PackageRecord, PackageType, LibraryLinks, SearchResultItem } from '../types';
import { SecurityBadge } from './SecurityBadge';
import {
  updateLibraryLinksInFirestore,
  updateLibraryReadmeInFirestore,
} from '../lib/firebase';

interface PackageDetailProps {
  packageName: string;
  onBack: () => void;
  onSelectPackage?: (name: string) => void;
  onSelectContributor?: (login: string) => void;
  onSelectSection?: (section: 'download' | 'browse' | 'developer' | 'guide') => void;
}

export const PackageDetail: React.FC<PackageDetailProps> = ({
  packageName,
  onBack,
  onSelectPackage,
  onSelectContributor,
  onSelectSection,
}) => {
  const [pkg, setPkg] = useState<PackageRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedInstall, setCopiedInstall] = useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'readme' | 'versions' | 'manifest' | 'dependencies' | 'firestore'>('readme');
  const [extendingLibraries, setExtendingLibraries] = useState<SearchResultItem[]>([]);
  const [loadingLibraries, setLoadingLibraries] = useState<boolean>(false);

  // Interactive Library Links & Readme editor (persisting to Firestore)
  const [isEditingMetadata, setIsEditingMetadata] = useState<boolean>(false);
  const [editDocUrl, setEditDocUrl] = useState<string>('');
  const [editDemoUrl, setEditDemoUrl] = useState<string>('');
  const [editHomepageUrl, setEditHomepageUrl] = useState<string>('');
  const [editIssuesUrl, setEditIssuesUrl] = useState<string>('');
  const [editReadmeText, setEditReadmeText] = useState<string>('');
  const [isSavingMetadata, setIsSavingMetadata] = useState<boolean>(false);
  const [metadataSaveStatus, setMetadataSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/packages/${encodeURIComponent(packageName)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Package "${packageName}" not found`);
        }
        return res.json();
      })
      .then((data: PackageRecord) => {
        if (isMounted) {
          setPkg(data);
          setSelectedVersion(data.latestVersion);
          setEditDocUrl(data.links?.documentation || '');
          setEditDemoUrl(data.links?.demo || '');
          setEditHomepageUrl(data.links?.homepage || '');
          setEditIssuesUrl(data.links?.issues || '');
          setEditReadmeText(data.readme || '');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [packageName]);

  // Query published library packages that extend this plugin
  useEffect(() => {
    if (pkg?.type === 'plugin' && pkg.name) {
      setLoadingLibraries(true);
      fetch('/api/search?type=library')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const libs = Array.isArray(data) ? data : [];
          const matches = libs.filter(
            (lib: SearchResultItem) =>
              lib.providesFor?.plugin?.toLowerCase() === pkg.name.toLowerCase()
          );
          setExtendingLibraries(matches);
          setLoadingLibraries(false);
        })
        .catch((err) => {
          console.warn('Failed to load extending libraries:', err);
          setLoadingLibraries(false);
        });
    } else {
      setExtendingLibraries([]);
    }
  }, [pkg?.name, pkg?.type]);

  const handleCopyInstall = () => {
    if (!pkg) return;
    const cmd = `cdrca install ${pkg.name}`;
    navigator.clipboard.writeText(cmd);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const handleSaveLibraryMetadata = async () => {
    if (!pkg) return;
    setIsSavingMetadata(true);
    setMetadataSaveStatus(null);
    try {
      const updatedLinks: LibraryLinks = {
        repository: pkg.repository,
        documentation: editDocUrl.trim(),
        demo: editDemoUrl.trim(),
        homepage: editHomepageUrl.trim(),
        issues: editIssuesUrl.trim(),
      };

      // 1. Update Firestore links & readme
      await updateLibraryLinksInFirestore(pkg.name, updatedLinks);
      if (editReadmeText !== pkg.readme) {
        await updateLibraryReadmeInFirestore(pkg.name, editReadmeText);
      }

      setPkg((prev) =>
        prev
          ? {
              ...prev,
              links: updatedLinks,
              readme: editReadmeText,
            }
          : null
      );
      setMetadataSaveStatus('Library metadata & README saved to Firestore successfully!');
      setTimeout(() => {
        setMetadataSaveStatus(null);
        setIsEditingMetadata(false);
      }, 2500);
    } catch (e: any) {
      setMetadataSaveStatus(`Error saving to Firestore: ${e.message}`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="inline-block w-8 h-8 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4" />
        <p className="text-sm text-stone-600">Loading package details...</p>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to packages
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-red-900">Package Not Found</h2>
          <p className="text-sm text-red-700 mt-1">{error || 'Unable to find package record.'}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800"
          >
            Return to Registry
          </button>
        </div>
      </div>
    );
  }

  const currentVerData = pkg.versions[selectedVersion] || pkg.versions[pkg.latestVersion];
  const manifest = currentVerData?.manifest;
  const isPlugin = pkg.type === 'plugin';

  const getTypeIcon = (type: PackageType) => {
    switch (type) {
      case 'plugin':
        return <Puzzle className="w-4 h-4" />;
      case 'app':
        return <PlaySquare className="w-4 h-4" />;
      case 'library':
        return <Layers className="w-4 h-4" />;
      default:
        return <PkgIcon className="w-4 h-4" />;
    }
  };

  const getTypeBadgeClass = (type: PackageType) => {
    switch (type) {
      case 'plugin':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'app':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'library':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <div id="package-detail-view" className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          id="btn-back-to-browse"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library Directory</span>
        </button>
      </div>

      {/* Package Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getTypeBadgeClass(
                  pkg.type
                )} whitespace-nowrap`}
              >
                {getTypeIcon(pkg.type)}
                <span className="capitalize">{pkg.type}</span>
              </span>

              {/* Library Type Context: "Extends <plugin> as @useLib <plugin>.<library>" */}
              {pkg.type === 'library' && (pkg.providesFor || manifest?.providesFor) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    Extends <strong className="font-bold text-purple-900 underline decoration-purple-300">{(pkg.providesFor || manifest?.providesFor)?.plugin}</strong> as{' '}
                    <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-950 font-bold">
                      @useLib {(pkg.providesFor || manifest?.providesFor)?.plugin}.{(pkg.providesFor || manifest?.providesFor)?.library}
                    </code>
                  </span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                <Tag className="w-3 h-3 text-stone-500" />
                <span>v{pkg.latestVersion}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-50 text-stone-700 border border-stone-200">
                <Shield className="w-3 h-3 text-stone-500" />
                <span>{pkg.license}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {pkg.name}
            </h1>

            <p className="text-base text-stone-600 leading-relaxed max-w-3xl">
              {pkg.description}
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-stone-500 pt-1">
              <span>
                By{' '}
                <button
                  type="button"
                  onClick={() => onSelectContributor?.(pkg.author)}
                  className="font-bold text-stone-900 hover:text-stone-950 underline underline-offset-2"
                >
                  @{pkg.author}
                </button>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                <span>{pkg.totalDownloads.toLocaleString()} installs</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Updated {new Date(pkg.updatedAt).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          {/* Install Command & Action Box */}
          <div className="w-full md:w-80 shrink-0 bg-stone-50 p-4 rounded-xl border border-stone-200/90 space-y-3">
            <label className="text-xs font-semibold text-stone-700 block">
              CLI Install Command
            </label>
            <div className="flex items-center justify-between p-2.5 bg-stone-900 text-stone-100 rounded-lg font-mono text-xs border border-stone-800">
              <span className="truncate select-all mr-2">cdrca install {pkg.name}</span>
              <button
                id="btn-copy-install-cmd"
                onClick={handleCopyInstall}
                className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition-colors shrink-0"
                title="Copy install command"
                type="button"
              >
                {copiedInstall ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-500 leading-tight">
              Run this in your terminal with the CDRCA CLI installed. No account or login required.
            </p>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <a
                id="link-pkg-repo"
                href={pkg.repository}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-950 font-medium underline underline-offset-2"
              >
                <span>View Source Repo</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>

              <a
                id="btn-direct-download-manifest"
                href={`/api/packages/${pkg.name}/download`}
                download
                className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
                title="Download package payload"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Payload</span>
              </a>
            </div>
          </div>
        </div>

        {/* Library Links & Resources Bar (Stored in Firebase Firestore) */}
        <div className="mt-6 pt-6 border-t border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-stone-700" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Library Links &amp; Resources (Firestore)
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono px-1.5 py-0.5 rounded">
                packages/{pkg.name}/links
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              {pkg.links?.documentation ? (
                <a
                  href={pkg.links.documentation}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium transition-colors border border-stone-200"
                >
                  <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                  <span>Documentation Guide</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              ) : null}

              {pkg.links?.demo ? (
                <a
                  href={pkg.links.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 font-medium transition-colors border border-amber-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Interactive Playground Demo</span>
                  <ExternalLink className="w-3 h-3 text-amber-500" />
                </a>
              ) : null}

              {pkg.links?.issues ? (
                <a
                  href={pkg.links.issues}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium transition-colors border border-stone-200"
                >
                  <span>Issues &amp; Tracker</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              ) : null}

              {pkg.links?.homepage ? (
                <a
                  href={pkg.links.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium transition-colors border border-stone-200"
                >
                  <Globe className="w-3.5 h-3.5 text-stone-600" />
                  <span>Project Homepage</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingMetadata(!isEditingMetadata)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white shadow-xs shrink-0 self-start md:self-auto transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingMetadata ? 'Close Editor' : 'Edit Links & Readme'}</span>
          </button>
        </div>

        {/* Inline Firestore Metadata & Readme Editor */}
        {isEditingMetadata && (
          <div className="mt-4 p-5 bg-stone-50 border border-stone-300 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-stone-900 uppercase">
                  Update Library Links &amp; README in Firebase Firestore
                </h4>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">
                Real-time Firestore Synchronized
              </span>
            </div>

            {metadataSaveStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs flex items-center gap-2 border border-emerald-300">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{metadataSaveStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Documentation URL</label>
                <input
                  type="url"
                  value={editDocUrl}
                  onChange={(e) => setEditDocUrl(e.target.value)}
                  placeholder="https://cdrca.dev/docs/your-lib"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Playground / Demo URL</label>
                <input
                  type="url"
                  value={editDemoUrl}
                  onChange={(e) => setEditDemoUrl(e.target.value)}
                  placeholder="https://cdrca.dev/playground?pkg=..."
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Homepage URL</label>
                <input
                  type="url"
                  value={editHomepageUrl}
                  onChange={(e) => setEditHomepageUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Issues URL</label>
                <input
                  type="url"
                  value={editIssuesUrl}
                  onChange={(e) => setEditIssuesUrl(e.target.value)}
                  placeholder="https://github.com/org/repo/issues"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-stone-700 block mb-1">README Content (Markdown)</label>
                <textarea
                  rows={6}
                  value={editReadmeText}
                  onChange={(e) => setEditReadmeText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400"
                  placeholder="# Library README documentation..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingMetadata(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLibraryMetadata}
                disabled={isSavingMetadata}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingMetadata ? 'Saving to Firestore...' : 'Save to Firestore'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PROMINENT PLUGIN SECURITY DISCLOSURE (REQUIRED BY SPEC IF TYPE === 'plugin') */}
      {isPlugin && (
        <div className="mb-6">
          <SecurityBadge permissions={pkg.permissions} uses={pkg.uses} />
        </div>
      )}

      {/* LIBRARIES EXTENDING THIS PLUGIN (REQUIRED BY SPEC IF TYPE === 'plugin') */}
      {isPlugin && (
        <div className="mb-6 bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <h3 className="text-base font-bold text-stone-900 tracking-tight">
                  Libraries Extending This Plugin
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  {extendingLibraries.length}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Published packages extending <strong className="font-semibold text-stone-900">{pkg.name}</strong> with custom runtime bundles imported via <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono">@useLib {pkg.name}.&lt;library&gt;</code>.
              </p>
            </div>
          </div>

          {loadingLibraries ? (
            <div className="p-8 text-center text-xs text-stone-500 font-medium">
              Scanning registry for compatible extension libraries...
            </div>
          ) : extendingLibraries.length === 0 ? (
            <div className="p-6 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center space-y-3">
              <p className="text-xs text-stone-600 font-medium">
                No external libraries published for <strong className="font-semibold text-stone-900">{pkg.name}</strong> yet.
              </p>
              <p className="text-[11px] text-stone-500">
                Want to build an extension? Create a library package that specifies <code className="font-mono bg-stone-200 px-1.5 py-0.5 rounded text-stone-800">providesFor.plugin: "{pkg.name}"</code> in its <code className="font-mono text-stone-700">cdrca.json</code>.
              </p>
              {onSelectSection && (
                <div className="pt-1">
                  <button
                    onClick={() => onSelectSection('guide')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-900 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                    <span>Read the Build an Extension Library Guide</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {extendingLibraries.map((lib) => (
                <div
                  key={lib.name}
                  onClick={() => onSelectPackage?.(lib.name)}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-stone-900 group-hover:text-purple-700 transition-colors">
                        {lib.name}
                      </span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                        v{lib.latestVersion}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {lib.description}
                    </p>
                    {lib.providesFor?.library && (
                      <div className="pt-1">
                        <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 block truncate">
                          @useLib {pkg.name}.{lib.providesFor.library}
                        </code>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                    <span>By @{lib.author || 'contributor'}</span>
                    <span className="group-hover:text-purple-700 font-semibold inline-flex items-center gap-1">
                      View details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shipped internal bundled libraries if any */}
          {(pkg.libraries || manifest?.libraries) && Object.keys(pkg.libraries || manifest?.libraries || {}).length > 0 && (
            <div className="mt-5 pt-4 border-t border-stone-100 space-y-2">
              <span className="text-xs font-semibold text-stone-700 block">
                Internal Bundled Modules Shipped with Plugin:
              </span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pkg.libraries || manifest?.libraries || {}).map(([name, bundlePath]) => (
                  <div key={name} className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs font-mono text-stone-800 flex items-center gap-1.5">
                    <span className="font-bold text-stone-900">@{pkg.name}.{name}</span>
                    <span className="text-stone-400">→</span>
                    <span className="text-stone-600">{bundlePath}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 mb-6 text-sm font-medium">
        <button
          id="tab-readme"
          onClick={() => setActiveTab('readme')}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === 'readme'
              ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <FileCode className="w-4 h-4" />
            <span>Readme</span>
          </span>
        </button>

        <button
          id="tab-versions"
          onClick={() => setActiveTab('versions')}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === 'versions'
              ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <History className="w-4 h-4" />
            <span>Versions ({Object.keys(pkg.versions).length})</span>
          </span>
        </button>

        <button
          id="tab-manifest"
          onClick={() => setActiveTab('manifest')}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === 'manifest'
              ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>cdrca.json</span>
          </span>
        </button>

        <button
          id="tab-dependencies"
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === 'dependencies'
              ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <PkgIcon className="w-4 h-4" />
            <span>Dependencies ({Object.keys(manifest?.dependencies || {}).length})</span>
          </span>
        </button>

        <button
          id="tab-firestore"
          onClick={() => setActiveTab('firestore')}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === 'firestore'
              ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Firestore Document</span>
          </span>
        </button>
      </div>

      {/* Tab Content Areas */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        {activeTab === 'readme' && (
          <div className="prose prose-stone max-w-none text-stone-800">
            {pkg.readme ? (
              <div className="markdown-body">
                <ReactMarkdown>{pkg.readme}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-stone-500 italic">No README provided for this package.</p>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-stone-900 mb-2">Version History</h3>
            <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden">
              {Object.values(pkg.versions)
                .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                .map((ver) => (
                  <div
                    key={ver.version}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-stone-900">{ver.version}</span>
                        {ver.version === pkg.latestVersion && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            latest
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 mt-1 flex items-center gap-3">
                        <span>Published on {new Date(ver.publishedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{ver.downloadCount} installs</span>
                        <span>•</span>
                        <span className="font-mono text-stone-600">entry: {ver.manifest?.entry || 'src/main.cdrca'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/packages/${pkg.name}/${ver.version}/download`}
                        download
                        className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'manifest' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Official Manifest Contract</h3>
                <p className="text-xs text-stone-500">
                  Fixed cdrca.json schema stored verbatim from repository root
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(manifest || {}, null, 2));
                  setCopiedInstall(true);
                  setTimeout(() => setCopiedInstall(false), 2000);
                }}
                className="px-2.5 py-1 text-xs border border-stone-300 rounded-md hover:bg-stone-100 text-stone-700 inline-flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy JSON</span>
              </button>
            </div>
            <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
              {JSON.stringify(manifest || {}, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Declared Dependencies</h3>
            {manifest?.dependencies && Object.keys(manifest.dependencies).length > 0 ? (
              <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden">
                {Object.entries(manifest.dependencies).map(([depName, depVersion]) => (
                  <div
                    key={depName}
                    className="p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="font-semibold text-stone-900">{depName}</span>
                      <span className="text-xs text-stone-500">{depVersion}</span>
                    </div>
                    {onSelectPackage && (
                      <button
                        onClick={() => onSelectPackage(depName)}
                        className="text-xs text-stone-700 hover:text-stone-950 font-medium underline underline-offset-2"
                      >
                        Inspect package
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 italic">This package has zero declared dependencies.</p>
            )}
          </div>
        )}

        {activeTab === 'firestore' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Cloud Firestore Document Model</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Live data record stored in Firebase Firestore collection <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">packages/{pkg.name}</code>.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Synced</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Collection &amp; Doc</span>
                <span className="font-mono text-stone-900 font-semibold truncate block mt-0.5">
                  packages/{pkg.name}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Package Author</span>
                <span className="font-semibold text-stone-900 block mt-0.5">
                  @{pkg.author}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Stored License</span>
                <span className="font-semibold text-stone-900 block mt-0.5">
                  {pkg.license}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Last Firestore Sync</span>
                <span className="font-mono text-stone-900 block mt-0.5">
                  {new Date(pkg.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-stone-700">Firestore Raw Document Payload:</span>
                <span className="text-[10px] font-mono text-stone-500">JSON representation</span>
              </div>
              <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                {JSON.stringify(
                  {
                    name: pkg.name,
                    author: pkg.author,
                    type: pkg.type,
                    license: pkg.license,
                    description: pkg.description,
                    repository: pkg.repository,
                    latestVersion: pkg.latestVersion,
                    totalDownloads: pkg.totalDownloads,
                    updatedAt: pkg.updatedAt,
                    links: pkg.links || {},
                    readme: `${(pkg.readme || '').slice(0, 120)}... (${(pkg.readme || '').length} bytes)`,
                    versions: Object.keys(pkg.versions),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
