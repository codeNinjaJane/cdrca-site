import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadSection } from './components/DownloadSection';
import { BrowseSection } from './components/BrowseSection';
import { PackageDetail } from './components/PackageDetail';
import { DeveloperSection } from './components/DeveloperSection';
import { ContributorProfile } from './components/ContributorProfile';
import { PluginGuide } from './components/PluginGuide';
import { UserProfile } from './types';
import { getStoredUser, syncCurrentUser } from './lib/auth';
import { ExternalLink, Shield } from 'lucide-react';

export default function App() {
  const [currentSection, setCurrentSection] = useState<'download' | 'browse' | 'developer' | 'guide'>('browse');
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null);
  const [selectedContributorLogin, setSelectedContributorLogin] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());

  // Sync with URL query parameters and restore auth session on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sec = params.get('section');
    const pkg = params.get('package');
    const author = params.get('author');

    if (author) {
      setSelectedContributorLogin(author);
      setCurrentSection('browse');
    } else if (pkg) {
      setSelectedPackageName(pkg);
      setCurrentSection('browse');
    } else if (sec === 'download' || sec === 'browse' || sec === 'developer' || sec === 'guide') {
      setCurrentSection(sec);
    }

    // Check & synchronize user session with server & Firestore
    syncCurrentUser()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch((err) => console.warn('Could not sync user session:', err));
  }, []);

  const handleSelectSection = (section: 'download' | 'browse' | 'developer' | 'guide') => {
    setCurrentSection(section);
    setSelectedPackageName(null);
    setSelectedContributorLogin(null);
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    url.searchParams.delete('package');
    url.searchParams.delete('author');
    window.history.pushState({}, '', url.toString());
  };

  const handleSelectPackage = (packageName: string) => {
    setSelectedPackageName(packageName);
    setSelectedContributorLogin(null);
    const url = new URL(window.location.href);
    url.searchParams.set('package', packageName);
    url.searchParams.delete('author');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectContributor = (login: string) => {
    setSelectedContributorLogin(login);
    setSelectedPackageName(null);
    const url = new URL(window.location.href);
    url.searchParams.set('author', login);
    url.searchParams.delete('package');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBrowse = () => {
    setSelectedPackageName(null);
    setSelectedContributorLogin(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('package');
    url.searchParams.delete('author');
    url.searchParams.set('section', 'browse');
    window.history.pushState({}, '', url.toString());
  };

  const handlePackagePublished = (pkgName: string) => {
    // Navigate directly to the newly published package page in Section B
    setSelectedPackageName(pkgName);
    setSelectedContributorLogin(null);
    setCurrentSection('browse');
    const url = new URL(window.location.href);
    url.searchParams.set('package', pkgName);
    url.searchParams.delete('author');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-stone-200">
      {/* Top Navigation */}
      <Navbar
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {selectedContributorLogin ? (
          <ContributorProfile
            login={selectedContributorLogin}
            onBack={handleBackToBrowse}
            onSelectPackage={handleSelectPackage}
          />
        ) : selectedPackageName ? (
          <PackageDetail
            packageName={selectedPackageName}
            onBack={handleBackToBrowse}
            onSelectPackage={handleSelectPackage}
            onSelectContributor={handleSelectContributor}
            onSelectSection={handleSelectSection}
          />
        ) : (
          <>
            {currentSection === 'download' && <DownloadSection />}
            {currentSection === 'browse' && (
              <BrowseSection
                onSelectPackage={handleSelectPackage}
                onSelectContributor={handleSelectContributor}
                onSelectSection={handleSelectSection}
              />
            )}
            {currentSection === 'developer' && (
              <DeveloperSection
                currentUser={currentUser}
                onUserChange={setCurrentUser}
                onPackagePublished={handlePackagePublished}
                onSelectContributor={handleSelectContributor}
                onSelectSection={handleSelectSection}
              />
            )}
            {currentSection === 'guide' && (
              <PluginGuide
                onBackToBrowse={handleBackToBrowse}
                onGoToDeveloper={() => handleSelectSection('developer')}
              />
            )}
          </>
        )}
      </main>

      {/* Site Footer */}
      <footer className="border-t border-stone-200 bg-white py-10 mt-16 text-xs text-stone-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="font-extrabold text-sm text-stone-900">CDRCA Registry</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                  v1.0.0
                </span>
              </div>
              <p className="text-stone-500">
                Created by <strong>Muhammad Ayyan</strong>. Distributed under the <strong>Islamic Open Source License (IOSL)</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
              <button
                onClick={() => handleSelectSection('download')}
                className="hover:text-stone-950 transition-colors"
              >
                Download
              </button>
              <span>•</span>
              <button
                onClick={() => handleSelectSection('browse')}
                className="hover:text-stone-950 transition-colors"
              >
                Browse Libraries
              </button>
              <span>•</span>
              <button
                onClick={() => handleSelectSection('developer')}
                className="hover:text-stone-950 transition-colors"
              >
                Publish
              </button>
              <span>•</span>
              <button
                onClick={() => handleSelectSection('guide')}
                className="hover:text-stone-950 transition-colors"
              >
                Build a Plugin Guide
              </button>
              <span>•</span>
              <a
                href="https://github.com/Muhammad-Ayyan-no1/CDRCA-animation-dsl/blob/main/LICENSE.md"
                target="_blank"
                rel="noreferrer"
                className="hover:text-stone-950 underline underline-offset-2 inline-flex items-center gap-1"
              >
                <Shield className="w-3 h-3 text-stone-500" />
                <span>IOSL License</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
