import React from 'react';
import { Download, Search, KeyRound, Sparkles, ExternalLink, Code2, BookOpen } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentSection: 'download' | 'browse' | 'developer' | 'guide';
  onSelectSection: (section: 'download' | 'browse' | 'developer' | 'guide') => void;
  currentUser: UserProfile | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentSection, onSelectSection, currentUser }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => onSelectSection('download')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-sm tracking-wider shadow-xs group-hover:bg-stone-800 transition-colors">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-stone-900">
                CDRCA
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                Registry
              </span>
            </div>
            <div className="text-[11px] text-stone-500 hidden sm:block">
              Animation DSL Ecosystem • Muhammad Ayyan
            </div>
          </div>
        </div>

        {/* THREE Distinct Sections Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Section A */}
          <button
            id="nav-section-download"
            onClick={() => onSelectSection('download')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              currentSection === 'download'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Download</span>
          </button>

          {/* Section B */}
          <button
            id="nav-section-browse"
            onClick={() => onSelectSection('browse')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              currentSection === 'browse'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Explore Libraries</span>
          </button>

          {/* Section C */}
          <button
            id="nav-section-developer"
            onClick={() => onSelectSection('developer')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              currentSection === 'developer'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{currentUser ? 'Dev Dashboard' : 'Developer'}</span>
          </button>

          {/* Section D: Plugin Guide */}
          <button
            id="nav-section-guide"
            onClick={() => onSelectSection('guide')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              currentSection === 'guide'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Build a Plugin</span>
          </button>
        </nav>

        {/* User / Contributor indicator or GitHub link */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser ? (
            <div
              onClick={() => onSelectSection('developer')}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-stone-100 border border-stone-200 cursor-pointer hover:bg-stone-200 transition-colors"
              title="Contributor dashboard"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.login}
                className="w-6 h-6 rounded-full border border-stone-300"
              />
              <span className="text-xs font-semibold text-stone-800 font-mono hidden md:inline">
                @{currentUser.login}
              </span>
            </div>
          ) : (
            <a
              href="https://github.com/Muhammad-Ayyan-no1/CDRCA-animation-dsl"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Source</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
