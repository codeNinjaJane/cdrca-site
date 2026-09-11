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
} from 'lucide-react';
import { PackageRecord, PackageType } from '../types';
import { SecurityBadge } from './SecurityBadge';

interface PackageDetailProps {
  packageName: string;
  onBack: () => void;
  onSelectPackage?: (name: string) => void;
  onSelectContributor?: (login: string) => void;
}

export const PackageDetail: React.FC<PackageDetailProps> = ({
  packageName,
  onBack,
  onSelectPackage,
  onSelectContributor,
}) => {
  const [pkg, setPkg] = useState<PackageRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedInstall, setCopiedInstall] = useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'readme' | 'versions' | 'manifest' | 'dependencies'>('readme');

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

  const handleCopyInstall = () => {
    if (!pkg) return;
    const cmd = `cdrca install ${pkg.name}`;
    navigator.clipboard.writeText(cmd);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
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
      </div>

      {/* PROMINENT PLUGIN SECURITY DISCLOSURE (REQUIRED BY SPEC IF TYPE === 'plugin') */}
      {isPlugin && (
        <div className="mb-6">
          <SecurityBadge permissions={pkg.permissions} uses={pkg.uses} />
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
      </div>
    </div>
  );
};
