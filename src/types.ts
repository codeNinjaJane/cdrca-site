export type PackageType = 'package' | 'plugin' | 'app';

export interface CdrcaManifest {
  name: string;
  version: string;
  description: string;
  type: PackageType;
  entry: string;
  icon?: string;
  author: string;
  license: string;
  repository: string;
  dependencies?: Record<string, string>;
  permissions: string[];
  uses: [string, string][];
}

export interface PackageVersion {
  version: string;
  publishedAt: string;
  manifest: CdrcaManifest;
  readme?: string;
  downloadCount: number;
  releaseTag?: string;
  githubReleaseAssetUrl?: string;
}

export interface LibraryLinks {
  repository?: string;
  documentation?: string;
  demo?: string;
  homepage?: string;
  issues?: string;
}

export interface PackageRecord {
  name: string;
  type: PackageType;
  description: string;
  author: string;
  repository: string;
  license: string;
  latestVersion: string;
  versions: Record<string, PackageVersion>;
  totalDownloads: number;
  createdAt: string;
  updatedAt: string;
  readme: string;
  permissions: string[];
  uses: [string, string][];
  ownerGithubId: string;
  ownerLogin: string;
  links?: LibraryLinks;
  tags?: string[];
}

// Exact contract response shapes matching CLI spec
export interface PackageDetailApiResponse {
  manifest: CdrcaManifest;
  latestVersion: string;
  readme: string;
  versions: Array<{
    version: string;
    publishedAt: string;
    githubReleaseAssetUrl?: string;
  }>;
}

export interface PackageVersionApiResponse {
  manifest: CdrcaManifest;
  githubReleaseAssetUrl: string;
}

export interface SearchResultItem {
  name: string;
  description: string;
  type: PackageType;
  latestVersion: string;
  // Extended fields for rich UI rendering
  author?: string;
  license?: string;
  totalDownloads?: number;
  updatedAt?: string;
  permissions?: string[];
  uses?: [string, string][];
}

export interface UserProfile {
  id: string;
  githubId?: string;
  login: string;
  name: string;
  email?: string;
  avatarUrl: string;
  htmlUrl: string;
  provider?: 'github';
  role?: 'contributor' | 'maintainer' | 'core';
  bio?: string;
  links?: {
    github?: string;
    website?: string;
    docs?: string;
    twitter?: string;
  };
  publishedPackages?: string[];
  createdAt: string;
  lastLoginAt?: string;
  loginHistory?: Array<{
    timestamp: string;
    provider: string;
    userAgent?: string;
  }>;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  isPrivate: boolean;
  isAdmin: boolean;
  ownerLogin: string;
  defaultBranch: string;
  language?: string;
  stars?: number;
  forks?: number;
  updatedAt?: string;
  releases?: string[];
}
