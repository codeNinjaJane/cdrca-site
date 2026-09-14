import React, { useState } from 'react';
import { Download, Copy, Check, ExternalLink, Terminal, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';

export const DownloadSection: React.FC = () => {
  const [copiedNpm, setCopiedNpm] = useState(false);
  const [copiedGlobal, setCopiedGlobal] = useState(false);

  const handleCopy = (text: string, type: 'npm' | 'global') => {
    navigator.clipboard.writeText(text);
    if (type === 'npm') {
      setCopiedNpm(true);
      setTimeout(() => setCopiedNpm(false), 2000);
    } else {
      setCopiedGlobal(true);
      setTimeout(() => setCopiedGlobal(false), 2000);
    }
  };

  return (
    <div id="section-download" className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* Hero Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-stone-600" />
          <span>Standalone Animation DSL &amp; Runtime</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Download &amp; Install CDRCA
        </h1>
        <p className="mt-3 text-lg text-stone-600 max-w-2xl mx-auto">
          Get the standalone compiler, runtime CLI, and desktop installer for CDRCA — the JavaScript-based animation Domain-Specific Language designed by Muhammad Ayyan.
        </p>
      </div>

      {/* Main Download Actions Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-b border-stone-100">
          {/* Desktop Installer via GitHub Actions */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stone-100 text-stone-800 border border-stone-200">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Desktop Installer</h2>
              <p className="text-sm text-stone-600 mt-1">
                Download the standalone desktop installer, compiler binary, and preview runtime from automated CI workflow builds.
              </p>
            </div>
            <div className="space-y-2">
              <a
                id="btn-download-installer"
                href="https://github.com/MrGrimJoe/cdrca-ready-for-the-real-world/actions"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 font-medium text-sm transition-colors shadow-xs w-full sm:w-auto cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Fetch Installer from Actions</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </a>
              <div className="text-xs text-stone-500">
                Latest artifacts available under the workflow runs on{' '}
                <a
                  href="https://github.com/MrGrimJoe/cdrca-ready-for-the-real-world/actions"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-stone-800 underline hover:text-black"
                >
                  MrGrimJoe / cdrca-ready-for-the-real-world
                </a>
              </div>
            </div>
          </div>

          {/* NPM Package Command */}
          <div className="space-y-4 bg-stone-50 p-6 rounded-xl border border-stone-200/80">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-stone-700" />
              <h3 className="text-sm font-semibold text-stone-900">Install via npm</h3>
            </div>
            <p className="text-xs text-stone-600">
              Add the CDRCA package to any Node.js project or pipeline:
            </p>
            <div className="relative flex items-center justify-between p-3 bg-stone-900 text-stone-100 rounded-lg font-mono text-sm border border-stone-800">
              <span className="select-all">npm install cdcra12</span>
              <button
                id="btn-copy-npm-install"
                onClick={() => handleCopy('npm install cdcra12', 'npm')}
                className="ml-3 p-1.5 rounded-md hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                title="Copy command"
                type="button"
              >
                {copiedNpm ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Global CLI alternative */}
            <div className="pt-2 border-t border-stone-200">
              <span className="text-xs text-stone-500 block mb-1.5">Or install globally for system-wide CLI usage:</span>
              <div className="flex items-center justify-between p-2.5 bg-white text-stone-800 rounded-md font-mono text-xs border border-stone-300">
                <span className="select-all">npm install -g cdcra12</span>
                <button
                  id="btn-copy-global-install"
                  onClick={() => handleCopy('npm install -g cdcra12', 'global')}
                  className="p-1 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors"
                  title="Copy global command"
                  type="button"
                >
                  {copiedGlobal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Informational Footer Strip */}
        <div className="bg-stone-50 px-6 sm:px-8 py-4 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Language extension:</span>
            <code className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-900 font-mono">.cdrca</code>
          </div>
          <div>No account or login required for downloading or running CDRCA locally.</div>
        </div>
      </div>

      {/* About CDRCA & Licensing Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* About CDRCA */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <BookOpen className="w-5 h-5 text-stone-700" />
            <h2 className="text-base font-bold text-stone-900">About the DSL</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed mb-4">
            CDRCA is a JavaScript-based animation Domain-Specific Language conceived and created by <strong>Muhammad Ayyan</strong>. It features a declarative scene graph syntax that compiles directly into high-fps rendering instructions.
          </p>
          <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
            <div className="text-stone-500 font-medium">Official Repositories &amp; Builds:</div>
            <div className="flex flex-col gap-1.5">
              <a
                id="link-grimjoe-repo"
                href="https://github.com/MrGrimJoe/cdrca-ready-for-the-real-world"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-stone-800 hover:text-stone-950 underline underline-offset-2 font-medium"
              >
                <span>MrGrimJoe / cdrca-ready-for-the-real-world (CI &amp; Installer Actions)</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
              <a
                id="link-canonical-repo"
                href="https://github.com/Muhammad-Ayyan-no1/CDRCA-animation-dsl"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-stone-800 hover:text-stone-950 underline underline-offset-2 font-medium"
              >
                <span>Muhammad-Ayyan-no1 / CDRCA-animation-dsl</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
              <a
                id="link-islah-repo"
                href="https://github.com/ISLAH-org/CDRCA"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-stone-800 hover:text-stone-950 underline underline-offset-2 font-medium"
              >
                <span>ISLAH-org / CDRCA</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
            </div>
          </div>
        </div>

        {/* License Details */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldCheck className="w-5 h-5 text-stone-700" />
            <h2 className="text-base font-bold text-stone-900">License Information</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed mb-4">
            CDRCA is distributed under a custom <strong>Islamic Open Source License (IOSL)</strong>, defined directly in the project repository's <code className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded text-stone-800">LICENSE.md</code>.
          </p>
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-stone-800 mb-4 leading-relaxed">
            CDRCA is <em>not</em> MIT, Apache, or a standard OSI license. Review the full terms in the repository before redistributing or embedding.
          </div>
          <div>
            <a
              id="link-full-iosl-license"
              href="https://github.com/Muhammad-Ayyan-no1/CDRCA-animation-dsl/blob/main/LICENSE.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold border border-stone-300 transition-colors"
            >
              <span>View Full IOSL License Text</span>
              <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
            </a>
          </div>
        </div>
      </div>

      {/* Syntax Sample */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="text-xs text-stone-400 font-mono ml-2">quickstart.cdrca</span>
          </div>
          <span className="text-xs text-stone-400">CDRCA Source Syntax</span>
        </div>
        <pre className="font-mono text-xs sm:text-sm text-stone-300 overflow-x-auto p-2 leading-relaxed">
{`// CDRCA Animation DSL Example
scene VectorPulse {
  duration: 4.0s;
  fps: 60;
  background: "#0c0a09";

  // Declarative geometric shapes
  poly = RegularPolygon({ sides: 6, radius: 120, stroke: "#38bdf8", strokeWidth: 3 });
  
  // Animation trajectory with physics easing
  animate(poly.rotation, from: 0deg, to: 360deg, duration: 4.0s, ease: easeInOutQuad);
  animate(poly.scale, [1.0, 1.25, 1.0], duration: 2.0s, repeat: 2);
}`}
        </pre>
      </div>
    </div>
  );
};
