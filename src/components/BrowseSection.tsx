import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Flame,
  Clock,
  Package as PkgIcon,
  Puzzle,
  PlaySquare,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Download,
} from 'lucide-react';
import { PackageRecord, PackageType } from '../types';
import { SecurityBadge } from './SecurityBadge';

interface BrowseSectionProps {
  onSelectPackage: (name: string) => void;
  onSelectContributor?: (login: string) => void;
  onSelectSection?: (section: 'download' | 'browse' | 'developer') => void;
}

export const BrowseSection: React.FC<BrowseSectionProps> = ({
  onSelectPackage,
  onSelectContributor,
  onSelectSection,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<'trending' | 'recent' | 'name'>('trending');
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [trending, setTrending] = useState<PackageRecord[]>([]);
  const [recent, setRecent] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedPkg, setCopiedPkg] = useState<string | null>(null);

  // Fetch directory data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const searchParams = new URLSearchParams({
      q: query,
      type: selectedType,
      sort: selectedSort,
    });

    fetch(`/api/search?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          const list: PackageRecord[] = Array.isArray(data) ? data : data.packages || [];
          setPackages(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Search error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query, selectedType, selectedSort]);

  // Fetch trending & recent feeds on mount
  useEffect(() => {
    fetch('/api/packages')
      .then((res) => res.json())
      .then((data) => {
        const all: PackageRecord[] = data.packages || (Array.isArray(data) ? data : []);
        const sortedTrending = [...all].sort((a, b) => b.totalDownloads - a.totalDownloads).slice(0, 3);
        const sortedRecent = [...all].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
        setTrending(sortedTrending);
        setRecent(sortedRecent);
      })
      .catch((err) => console.error('Error fetching feeds:', err));
  }, []);

  const handleCopyCmd = (e: React.MouseEvent, pkgName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`cdrca install ${pkgName}`);
    setCopiedPkg(pkgName);
    setTimeout(() => setCopiedPkg(null), 1800);
  };

  const getTypeIcon = (type: PackageType) => {
    switch (type) {
      case 'plugin':
        return <Puzzle className="w-3.5 h-3.5 text-amber-700" />;
      case 'app':
        return <PlaySquare className="w-3.5 h-3.5 text-emerald-700" />;
      default:
        return <PkgIcon className="w-3.5 h-3.5 text-stone-700" />;
    }
  };

  const getTypeBadgeClass = (type: PackageType) => {
    switch (type) {
      case 'plugin':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'app':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <div id="section-browse" className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header & Search Bar */}
      <div className="mb-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            CDRCA Package Directory
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Browse and install open community animations, mathematical packages, transpiler plugins, and standalone projects.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-packages"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                packages.length === 0 && trending.length === 0
                  ? "Registry is empty — nothing to search until someone adds something"
                  : "Search packages by name, author, keywords, or license..."
              }
              className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-stone-400 hover:text-stone-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Type Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'package', label: 'Packages (.cdrca)' },
                { id: 'plugin', label: 'Transpiler Plugins' },
                { id: 'app', label: 'Standalone Apps' },
              ].map((item) => (
                <button
                  key={item.id}
                  id={`filter-type-${item.id}`}
                  onClick={() => setSelectedType(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    selectedType === item.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-xs text-stone-500">Sort by:</span>
              <select
                id="select-sort-order"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-stone-400"
              >
                <option value="trending">Most Installs (Trending)</option>
                <option value="recent">Recently Updated</option>
                <option value="name">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Discovery Feeds (Only displayed when packages exist and not filtering) */}
      {!query && selectedType === 'all' && trending.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Trending Feed */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-600" />
                <h2 className="text-sm font-bold text-stone-900">Trending Packages</h2>
              </div>
              <span className="text-xs text-stone-500">Community Favorites</span>
            </div>
            <div className="space-y-2">
              {trending.slice(0, 3).map((item) => (
                <div
                  key={`trending-${item.name}`}
                  onClick={() => onSelectPackage(item.name)}
                  className="p-3 bg-white rounded-xl border border-stone-200 hover:border-stone-400 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900 truncate hover:underline">
                        {item.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getTypeBadgeClass(item.type)}`}>
                        {item.type}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">v{item.latestVersion}</span>
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">{item.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-mono">
                      {item.totalDownloads.toLocaleString()} installs
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Published Feed */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <h2 className="text-sm font-bold text-stone-900">Recently Updated</h2>
              </div>
              <span className="text-xs text-stone-500">Latest Versions</span>
            </div>
            <div className="space-y-2">
              {recent.slice(0, 3).map((item) => (
                <div
                  key={`recent-${item.name}`}
                  onClick={() => onSelectPackage(item.name)}
                  className="p-3 bg-white rounded-xl border border-stone-200 hover:border-stone-400 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900 truncate hover:underline">
                        {item.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getTypeBadgeClass(item.type)}`}>
                        {item.type}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">v{item.latestVersion}</span>
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">{item.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-stone-500">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Results Listing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-stone-700">
            {packages.length === 0 ? '0 libraries registered' : `${packages.length} librar${packages.length === 1 ? 'y' : 'ies'} available`}
          </h2>
          {packages.length > 0 && (
            <span className="text-xs text-stone-400">Click any library for README and details</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <div className="inline-block w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-2" />
            <p className="text-xs text-stone-500">Querying registry database...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-2xl border border-stone-200 p-8 space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              {query ? <Search className="w-6 h-6" /> : <PkgIcon className="w-6 h-6" />}
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-stone-900">
                {query
                  ? 'Nothing to search until someone adds something'
                  : 'No Libraries in the Registry Yet'}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                {query
                  ? `No libraries match "${query}". The registry currently does not have any libraries matching your search.`
                  : "The website currently doesn't have any libraries. There is nothing to search until someone adds something."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setSelectedType('all');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
              {onSelectSection && (
                <button
                  onClick={() => onSelectSection('developer')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Go to Dev Dashboard to Add a Library</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                id={`card-pkg-${pkg.name}`}
                onClick={() => onSelectPackage(pkg.name)}
                className="bg-white rounded-2xl border border-stone-200 hover:border-stone-400 p-5 sm:p-6 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
              >
                {/* Left info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-stone-900 group-hover:text-stone-950 underline-offset-2 group-hover:underline">
                      {pkg.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${getTypeBadgeClass(
                        pkg.type
                      )} whitespace-nowrap`}
                    >
                      {getTypeIcon(pkg.type)}
                      <span className="capitalize">{pkg.type}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
                      v{pkg.latestVersion}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-50 text-stone-600 border border-stone-200">
                      {pkg.license}
                    </span>
                  </div>

                  <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-stone-500 pt-1">
                    <span>
                      by{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectContributor?.(pkg.author);
                        }}
                        className="text-stone-800 hover:text-stone-950 font-bold hover:underline"
                      >
                        @{pkg.author}
                      </button>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="w-3 h-3 text-stone-400" />
                      <span>{pkg.totalDownloads.toLocaleString()} installs</span>
                    </span>
                    <span>•</span>
                    <span>Updated {new Date(pkg.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Plugin Security Badge Compact Preview */}
                  {pkg.type === 'plugin' && (
                    <div className="pt-1.5">
                      <SecurityBadge permissions={pkg.permissions} uses={pkg.uses} compact={true} />
                    </div>
                  )}
                </div>

                {/* Right quick install box */}
                <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div
                    onClick={(e) => handleCopyCmd(e, pkg.name)}
                    className="group/cmd inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-xs border border-stone-300 transition-colors"
                    title="Click to copy install command"
                  >
                    <span>cdrca install {pkg.name}</span>
                    {copiedPkg === pkg.name ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-stone-500 group-hover/cmd:text-stone-800 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-stone-500 hidden sm:block">Click card to view README</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
