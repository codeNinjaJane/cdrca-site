import React, { useState } from 'react';
import { Edit3, CheckCircle2, Save, Globe, BookOpen, Github } from 'lucide-react';
import { UserProfile } from '../types';
import { updateContributorProfileInFirestore } from '../lib/firebase';

interface ContributorProfileEditorProps {
  currentUser: UserProfile;
  onProfileUpdated: (updatedUser: UserProfile) => void;
  onClose: () => void;
}

export const ContributorProfileEditor: React.FC<ContributorProfileEditorProps> = ({
  currentUser,
  onProfileUpdated,
  onClose,
}) => {
  const [editBio, setEditBio] = useState<string>(currentUser.bio || '');
  const [editWebsite, setEditWebsite] = useState<string>(currentUser.links?.website || '');
  const [editGithub, setEditGithub] = useState<string>(currentUser.links?.github || `https://github.com/${currentUser.login}`);
  const [editDocs, setEditDocs] = useState<string>(currentUser.links?.docs || '');
  const [editTwitter, setEditTwitter] = useState<string>(currentUser.links?.twitter || '');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);

  const handleSaveProfile = async () => {
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

      onProfileUpdated(updatedUser);
      setProfileSaveMsg('Contributor profile & links saved successfully!');
      setTimeout(() => {
        setProfileSaveMsg(null);
      }, 3500);
    } catch (e: any) {
      setProfileSaveMsg(`Failed to save: ${e.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-stone-800" />
          <h3 className="text-sm font-bold text-stone-900">
            Edit Contributor Profile &amp; External Links
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
        >
          Close
        </button>
      </div>

      {profileSaveMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{profileSaveMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="md:col-span-2">
          <label className="font-bold text-stone-700 block mb-1">Contributor Bio</label>
          <input
            type="text"
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="e.g. Core contributor building math animation shaders and DSL hooks"
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
          />
        </div>

        <div>
          <label className="font-bold text-stone-700 block mb-1">Portfolio or Website URL</label>
          <div className="relative">
            <input
              type="url"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
            />
            <Globe className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="font-bold text-stone-700 block mb-1">GitHub Profile URL</label>
          <div className="relative">
            <input
              type="url"
              value={editGithub}
              onChange={(e) => setEditGithub(e.target.value)}
              placeholder={`https://github.com/${currentUser.login}`}
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
            />
            <Github className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="font-bold text-stone-700 block mb-1">Documentation or Guides URL</label>
          <div className="relative">
            <input
              type="url"
              value={editDocs}
              onChange={(e) => setEditDocs(e.target.value)}
              placeholder="https://docs.example.com"
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
            />
            <BookOpen className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="font-bold text-stone-700 block mb-1">Twitter / Social Profile URL</label>
          <input
            type="url"
            value={editTwitter}
            onChange={(e) => setEditTwitter(e.target.value)}
            placeholder="https://x.com/username"
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-mono text-xs focus:ring-1 focus:ring-stone-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>
    </div>
  );
};
