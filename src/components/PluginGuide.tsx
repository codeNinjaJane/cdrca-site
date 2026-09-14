import React, { useState } from 'react';
import {
  Puzzle,
  Layers,
  Shield,
  FileCode,
  Terminal,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  BookOpen,
  FolderTree,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface PluginGuideProps {
  onBackToBrowse: () => void;
  onGoToDeveloper?: () => void;
}

export const PluginGuide: React.FC<PluginGuideProps> = ({
  onBackToBrowse,
  onGoToDeveloper,
}) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'structure' | 'permissions' | 'libraries' | 'tutorial'>('concepts');
  const [codeSnippetTab, setCodeSnippetTab] = useState<'manifest' | 'typescript'>('manifest');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const samplePluginManifest = `{
  "name": "quark-fx-engine",
  "version": "1.0.0",
  "description": "Particle acceleration and canvas physics plugin for Quark",
  "type": "plugin",
  "main": "dist/index.js",
  "license": "IOSL",
  "author": "ayyan",
  "permissions": {
    "fs": false,
    "network": false,
    "shell": false,
    "gpu": true,
    "eval": false
  },
  "uses": ["quark:ast-transform", "webgl:context"],
  "libraries": {
    "emitters": "dist/libraries/emitters.js",
    "forces": "dist/libraries/forces.js"
  }
}`;

  const samplePluginTypeScript = `// dist/index.ts - Transpiler Plugin Entrypoint
import type { PluginContext, ASTNode } from '@cdrca/transpiler';

export default function createPlugin(context: PluginContext) {
  return {
    name: 'quark-fx-engine',
    version: '1.0.0',
    transformAST(ast: ASTNode) {
      // AST visitor hooks run during compilation
      return ast;
    },
    getRuntimeHelpers() {
      return {
        initGPUForces: () => {
          console.log('[quark-fx-engine] Initializing WebGL acceleration');
        }
      };
    }
  };
}`;

  const sampleLibraryManifest = `{
  "name": "quark-feather-icons",
  "version": "1.0.0",
  "description": "Feather vector glyph presets for Quark transpiler animations",
  "type": "library",
  "main": "dist/bundle.js",
  "license": "IOSL",
  "author": "community-dev",
  "providesFor": {
    "plugin": "quark",
    "library": "icons"
  },
  "dependencies": {
    "quark": "^2.0.0"
  }
}`;

  const sampleLibraryCode = `// quark-feather-icons: provides @useLib quark.icons
export const icons = {
  play: 'M5 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6zm8 0h4v16h-4z',
  sparkle: 'M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z'
};

export default icons;`;

  return (
    <div id="plugin-guide-page" className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Back button & top crumbs */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBackToBrowse}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Registry Directory</span>
        </button>

        <span className="text-xs font-mono font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md">
          DOCS // CDRCA PLUGIN ARCHITECTURE
        </span>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
              <Puzzle className="w-3.5 h-3.5 text-amber-600" />
              <span>Transpiler Engine &amp; Extension System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Building Plugins &amp; Extension Libraries for CDRCA
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
              Learn how to build transpiler plugins, declare security permissions, bundle runtime modules, and create community libraries that extend existing plugins with <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono text-xs">@useLib</code>.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('tutorial')}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Quick Tutorial</span>
            </button>
            {onGoToDeveloper && (
              <button
                onClick={onGoToDeveloper}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold border border-stone-200 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-stone-600" />
                <span>Publish Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-px mb-8 overflow-x-auto text-sm font-medium">
        {[
          { id: 'concepts', label: '1. Core Concepts', icon: BookOpen },
          { id: 'structure', label: '2. Directory Structure', icon: FolderTree },
          { id: 'permissions', label: '3. Security Permissions', icon: Shield },
          { id: 'libraries', label: '4. Bundled vs. External Libs', icon: Layers },
          { id: 'tutorial', label: '5. Step-by-Step Tutorial', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3.5 inline-flex items-center gap-2 relative transition-colors whitespace-nowrap text-xs sm:text-sm cursor-pointer ${
                isActive
                  ? 'text-stone-900 font-bold border-b-2 border-stone-900'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Core Concepts */}
      {activeTab === 'concepts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              The Four Package Tiers in the CDRCA Ecosystem
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              CDRCA organizes code into four explicit tiers to maintain safety, separation of concerns, and clean transpilation boundaries:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-stone-200 text-stone-800 font-mono">
                    type: "package"
                  </span>
                  <span className="font-bold text-sm text-stone-900">Standard Packages</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Regular reusable animations, scenes, keyframes, and mathematical macros written in the CDRCA domain-specific language (<code className="font-mono bg-white px-1 py-0.5 rounded border border-stone-200">.cdrca</code>). They contain no native executable code.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 font-mono">
                    type: "plugin"
                  </span>
                  <span className="font-bold text-sm text-amber-950">Transpiler Plugins</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Compiler hooks and engines that transform CDRCA ASTs into targets like Canvas, WebGL, SVG, or React. Plugins must disclose security permissions (FS, Network, Shell, GPU, Eval).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-900 font-mono">
                    type: "library"
                  </span>
                  <span className="font-bold text-sm text-purple-950">Plugin Extension Libraries</span>
                </div>
                <p className="text-xs text-purple-900/90 leading-relaxed">
                  Community-created modular bundles that extend a specific plugin (such as Quark). In user code, they are referenced via <code className="font-mono bg-white px-1 py-0.5 rounded border border-purple-200">@useLib &lt;plugin&gt;.&lt;library&gt;</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-900 font-mono">
                    type: "app"
                  </span>
                  <span className="font-bold text-sm text-emerald-950">Standalone Applications</span>
                </div>
                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  Full standalone applications or interactive visualizers powered by CDRCA runtime engines. Ready to run and bundle out of the box.
                </p>
              </div>
            </div>
          </div>

          {/* Quick comparison box */}
          <div className="bg-stone-100/70 rounded-2xl border border-stone-200/80 p-5 space-y-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              When should you write a Plugin vs. a Library?
            </h3>
            <ul className="text-xs text-stone-700 space-y-1.5 list-disc pl-5">
              <li>
                <strong>Write a Plugin</strong> if you are creating an entirely new compilation target (e.g. Three.js renderer, Flutter exporter, Rust WASM backend), or introducing fundamental new AST syntax rules.
              </li>
              <li>
                <strong>Write a Library</strong> if you are adding new components, glyph sets, particle presets, or physics solvers for an <em>existing</em> plugin (e.g., creating vector icon packs or math helpers for the Quark plugin).
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Directory Structure */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              The Plugin Directory Layout
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              When using the CLI to scaffold a plugin via <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-semibold">cdrca plugin create &lt;name&gt;</code>, the following directory layout is generated:
            </p>

            <div className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs border border-stone-800 space-y-1 overflow-x-auto">
              <div className="text-stone-400">// Recommended Plugin Workspace Directory</div>
              <div>my-cdrca-plugin/</div>
              <div>├── <strong className="text-amber-300">cdrca.json</strong>          <span className="text-stone-400"># Required manifest (type: "plugin", permissions, libraries)</span></div>
              <div>├── package.json        <span className="text-stone-400"># NPM metadata for tooling</span></div>
              <div>├── tsconfig.json       <span className="text-stone-400"># TypeScript configuration</span></div>
              <div>├── src/</div>
              <div>│   ├── <strong className="text-emerald-300">index.ts</strong>        <span className="text-stone-400"># Main entry point (transforms AST, registers hooks)</span></div>
              <div>│   └── libraries/       <span className="text-stone-400"># Shipped bundled libraries</span></div>
              <div>│       ├── icons.ts     <span className="text-stone-400"># Provides @useLib &lt;plugin&gt;.icons</span></div>
              <div>│       └── math.ts      <span className="text-stone-400"># Provides @useLib &lt;plugin&gt;.math</span></div>
              <div>└── dist/               <span className="text-stone-400"># Compiled build outputs bundled during release</span></div>
            </div>

            {/* Code switcher */}
            <div className="pt-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCodeSnippetTab('manifest')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      codeSnippetTab === 'manifest'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    cdrca.json
                  </button>
                  <button
                    onClick={() => setCodeSnippetTab('typescript')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      codeSnippetTab === 'typescript'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    src/index.ts
                  </button>
                </div>

                <button
                  onClick={() =>
                    handleCopy(
                      codeSnippetTab === 'manifest' ? samplePluginManifest : samplePluginTypeScript,
                      codeSnippetTab
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium px-2 py-1 rounded hover:bg-stone-100 cursor-pointer"
                >
                  {copiedCodeId === codeSnippetTab ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCodeId === codeSnippetTab ? 'Copied' : 'Copy snippet'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                <code>
                  {codeSnippetTab === 'manifest' ? samplePluginManifest : samplePluginTypeScript}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security Permissions */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-stone-900">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold tracking-tight">
                Permission Disclosures &amp; Sandboxing
              </h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Because plugins can execute TypeScript or native transpilation code, the CDRCA CLI and Registry strictly enforce upfront, declarative permission disclosures.
            </p>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Why CDRCA Warns on Install</span>
              </div>
              <p className="leading-relaxed">
                Whenever a user runs <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950">cdrca install &lt;plugin&gt;</code>, the CLI scans the manifest's <code className="font-mono">permissions</code> block. If any sensitive permission is enabled, the CLI prompts the developer with an explicit disclosure confirmation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                {
                  perm: 'fs',
                  title: 'File System Access',
                  desc: 'Read or write files outside the local project build cache directory.',
                  safeUse: 'Only request if your plugin reads custom font assets or outputs raw files.',
                },
                {
                  perm: 'network',
                  title: 'Network & Sockets',
                  desc: 'Make HTTP requests or connect to remote WebSocket feeds.',
                  safeUse: 'Only request if fetching remote assets or live telemetry during rendering.',
                },
                {
                  perm: 'shell',
                  title: 'Shell Process Spawning',
                  desc: 'Execute bash commands or spawn child processes.',
                  safeUse: 'Rarely needed; only required if delegating to native system CLI binaries.',
                },
                {
                  perm: 'gpu',
                  title: 'Hardware Acceleration',
                  desc: 'Acquire WebGL, WebGPU, or Metal contexts for high-speed rasterization.',
                  safeUse: 'Standard for real-time 3D and heavy canvas rendering engines.',
                },
                {
                  perm: 'eval',
                  title: 'Dynamic Code Evaluation',
                  desc: 'Invoke dynamic Function() or eval() interpreters.',
                  safeUse: 'Avoid whenever possible; plugins should pre-compile all transforms.',
                },
              ].map((item) => (
                <div key={item.perm} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-stone-200 text-stone-900">
                      permissions.{item.perm}
                    </span>
                    <span className="text-xs font-semibold text-stone-800">{item.title}</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                  <p className="text-[11px] text-stone-500 italic">Guideline: {item.safeUse}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Bundled vs. External Libraries */}
      {activeTab === 'libraries' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-stone-900">
              <Layers className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold tracking-tight">
                Bundled Modules vs. External Plugin Libraries
              </h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Plugins can expose specialized functionality through the unified <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-800">@useLib &lt;plugin&gt;.&lt;library&gt;</code> syntax. There are two mechanisms for delivering libraries:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Option A: Bundled */}
              <div className="p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                    A
                  </span>
                  <h3 className="font-bold text-sm text-stone-900">
                    Bundled Libraries (Shipped by Plugin)
                  </h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  The plugin author ships these modules inside the plugin package. They are defined in the plugin's <code className="font-mono">cdrca.json</code> under the <code className="font-mono">libraries</code> object map:
                </p>
                <div className="p-3 bg-stone-900 text-stone-100 font-mono text-xs rounded-lg overflow-x-auto border border-stone-800">
                  <div className="text-stone-400">// In the plugin's cdrca.json:</div>
                  <div>"libraries": &#123;</div>
                  <div>  "icons": "dist/lib/icons.js",</div>
                  <div>  "particles": "dist/lib/particles.js"</div>
                  <div>&#125;</div>
                </div>
                <p className="text-xs text-stone-500">
                  Users automatically have access to <code className="font-mono">@useLib quark.icons</code> when installing the plugin.
                </p>
              </div>

              {/* Option B: External */}
              <div className="p-5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                    B
                  </span>
                  <h3 className="font-bold text-sm text-purple-950">
                    External Extension Libraries (By Anyone)
                  </h3>
                </div>
                <p className="text-xs text-purple-900/90 leading-relaxed">
                  Any community author can publish an independent package of <code className="font-mono">type: "library"</code> that attaches itself to an existing plugin via <code className="font-mono">providesFor</code>:
                </p>
                <div className="p-3 bg-stone-900 text-stone-100 font-mono text-xs rounded-lg overflow-x-auto border border-stone-800">
                  <div className="text-purple-300">// In the extension library's cdrca.json:</div>
                  <div>"type": "library",</div>
                  <div>"providesFor": &#123;</div>
                  <div>  "plugin": "quark",</div>
                  <div>  "library": "icons"</div>
                  <div>&#125;</div>
                </div>
                <p className="text-xs text-purple-900/80">
                  When users install this library, it automatically binds to the Quark plugin runtime as <code className="font-mono">@useLib quark.icons</code>!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Step-by-Step Tutorial */}
      {activeTab === 'tutorial' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                Tutorial: Building and Publishing an Extension Library
              </h2>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                In this walkthrough, we will build a community icon pack called <code className="font-mono font-bold text-stone-900">quark-feather-icons</code> that extends the built-in <code className="font-mono font-bold text-stone-900">quark</code> plugin with <code className="font-mono text-purple-900 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">@useLib quark.icons</code>.
              </p>
              <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2">
                <span>Toolchain prerequisite:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-stone-900 text-stone-100 px-2 py-1 rounded font-mono text-[11px]">npm install -g cdcra12</code>
                  <span className="text-stone-400">or</span>
                  <a
                    href="https://github.com/MrGrimJoe/cdrca-ready-for-the-real-world/actions"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-stone-800 hover:text-black underline inline-flex items-center gap-1"
                  >
                    <span>CI Actions Installer</span>
                    <ExternalLink className="w-3 h-3 text-stone-500" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-sm text-stone-900">
                  Initialize the Project Directory
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs flex items-center justify-between border border-stone-800">
                <span>mkdir quark-feather-icons &amp;&amp; cd quark-feather-icons</span>
                <button
                  onClick={() => handleCopy('mkdir quark-feather-icons && cd quark-feather-icons', 'cmd1')}
                  className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white"
                >
                  {copiedCodeId === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-sm text-stone-900">
                  Create <code className="font-mono">cdrca.json</code> Manifest
                </h3>
              </div>
              <p className="text-xs text-stone-600">
                Notice the <code className="font-mono font-semibold text-purple-900">providesFor</code> block pointing to <code className="font-mono">plugin: "quark"</code> and <code className="font-mono">library: "icons"</code>:
              </p>
              <div className="relative">
                <button
                  onClick={() => handleCopy(sampleLibraryManifest, 'manifest2')}
                  className="absolute top-3 right-3 p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white text-xs inline-flex items-center gap-1"
                >
                  {copiedCodeId === 'manifest2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                  <code>{sampleLibraryManifest}</code>
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="font-bold text-sm text-stone-900">
                  Implement Your Library Bundle
                </h3>
              </div>
              <p className="text-xs text-stone-600">
                Export the runtime objects or SVG shapes that the Quark transpiler expects:
              </p>
              <div className="relative">
                <button
                  onClick={() => handleCopy(sampleLibraryCode, 'code3')}
                  className="absolute top-3 right-3 p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white text-xs inline-flex items-center gap-1"
                >
                  {copiedCodeId === 'code3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                  <code>{sampleLibraryCode}</code>
                </pre>
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <h3 className="font-bold text-sm text-stone-900">
                  Publish to the CDRCA Registry
                </h3>
              </div>
              <p className="text-xs text-stone-600">
                Publish via the CLI or using the web publisher on this site:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <span className="font-bold text-stone-900 block">Method A: Via Terminal CLI</span>
                  <code className="font-mono bg-stone-900 text-stone-100 px-2 py-1 rounded block text-[11px]">
                    cdrca publish
                  </code>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <span className="font-bold text-stone-900 block">Method B: Developer Portal</span>
                  <p className="text-stone-600 text-[11px]">
                    Log in with GitHub in the Developer section and submit your manifest &amp; bundle.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-stone-900">
                  How Users Will Import Your Library
                </h3>
              </div>
              <p className="text-xs text-stone-600">
                In any CDRCA animation file, developers can now write:
              </p>
              <div className="p-3 rounded-xl bg-purple-950 text-purple-100 font-mono text-xs border border-purple-900 space-y-1">
                <div className="text-purple-400">// In user-script.cdrca:</div>
                <div className="text-purple-200 font-bold">@useLib quark.icons</div>
                <div className="text-purple-300">scene HeroAnimation &#123;</div>
                <div className="text-purple-300">  render Icon(quark.icons.sparkle)</div>
                <div className="text-purple-300">&#125;</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
