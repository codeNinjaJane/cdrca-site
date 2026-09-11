import React, { useState, useEffect } from 'react';
import { UserProfile, PackageRecord } from '../types';
import { SecurityBadge } from './SecurityBadge';
import {
  Github,
  Package,
  Calendar,
  Download,
  ExternalLink,
  ArrowLeft,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ContributorProfileProps {
  login: string;
  onBack: () => void;
  onSelectPackage: (packageName: string) => void;
}

export const ContributorProfile: React.FC<ContributorProfileProps> = ({
  login,
  onBack,
  onSelectPackage,
}) => {
  const [profile, setProfile] = useState<{ user: UserProfile; packages: PackageRecord[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/contributors/${encodeURIComponent(login)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Contributor @${login} not found.`);
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load contributor profile.');
        setLoading(false);
      });
  }, [login]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-block w-8 h-8 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-3" />
        <p className="text-xs text-stone-500">Loading contributor profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-900 text-xs">
          <p className="font-bold mb-1">Contributor Error</p>
          <p>{error || 'Unable to retrieve contributor profile.'}</p>
        </div>
      </div>
    );
  }

  const { user, packages } = profile;
  const totalDownloads = packages.reduce((acc, p) => acc + (p.totalDownloads || 0), 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to registry</span>
      </button>

      {/* Contributor Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={user.avatarUrl}
              alt={user.login}
              className="w-16 h-16 rounded-full border-2 border-stone-200 shadow-xs"
            />
            <div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">{user.name}</h1>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono mt-0.5">
                <span>@{user.login}</span>
                <span>•</span>
                <span>CDRCA Contributor</span>
              </div>
            </div>
          </div>

          <a
            href={user.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shadow-xs transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Profile</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-stone-100 text-xs">
          <div>
            <span className="text-stone-500 block">Published Packages</span>
            <span className="text-base font-bold text-stone-900 font-mono mt-0.5 block">
              {packages.length}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">Total Downloads</span>
            <span className="text-base font-bold text-stone-900 font-mono mt-0.5 block">
              {totalDownloads.toLocaleString()}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-stone-500 block">Primary License</span>
            <span className="text-base font-bold text-stone-900 font-mono mt-0.5 block">
              IOSL
            </span>
          </div>
        </div>
      </div>

      {/* Packages by this Contributor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">
            Packages by @{user.login} ({packages.length})
          </h2>
        </div>

        {packages.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center text-xs text-stone-500">
            No published packages found for this contributor.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                onClick={() => onSelectPackage(pkg.name)}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-stone-400 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-stone-950 font-mono">
                        {pkg.name}
                      </span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                        v{pkg.latestVersion}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        pkg.type === 'plugin'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : pkg.type === 'app'
                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      {pkg.type}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
                    {pkg.description}
                  </p>

                  {/* Plugin permission notice */}
                  {pkg.type === 'plugin' && pkg.permissions && pkg.permissions.length > 0 && (
                    <div className="mb-3">
                      <SecurityBadge permissions={pkg.permissions} uses={pkg.uses} compact />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Download className="w-3 h-3 text-stone-400" />
                    <span>{pkg.totalDownloads.toLocaleString()}</span>
                  </span>
                  <span className="font-mono">{pkg.license}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
