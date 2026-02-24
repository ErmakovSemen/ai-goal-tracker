import { DEV_BUILDS } from '../config/devBuilds';

export interface ReleaseAsset {
  name: string;
  url: string;
  size?: number;
}

export interface LatestRelease {
  tag: string;
  name: string;
  publishedAt: string;
  apk: ReleaseAsset | null;
  body?: string;
}

const pickApk = (assets: Array<{ name: string; browser_download_url: string; size?: number }>) => {
  const apk = assets.find(asset => asset.name.toLowerCase().endsWith('.apk'));
  if (!apk) return null;
  return {
    name: apk.name,
    url: apk.browser_download_url,
    size: apk.size,
  };
};

export const fetchLatestRelease = async (): Promise<LatestRelease> => {
  const { githubOwner, githubRepo, latestTag } = DEV_BUILDS;
  
  // First try to get release by tag if latestTag is specified
  if (latestTag && latestTag !== 'latest') {
    try {
      const tagUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/tags/${latestTag}`;
      const tagResponse = await fetch(tagUrl);
      if (tagResponse.ok) {
        const tagData = await tagResponse.json();
        return {
          tag: tagData.tag_name,
          name: tagData.name,
          publishedAt: tagData.published_at,
          apk: pickApk(tagData.assets || []),
          body: tagData.body || '',
        };
      }
    } catch (err) {
      console.warn(`Failed to fetch release by tag ${latestTag}, trying latest:`, err);
    }
  }
  
  // Fallback to latest release
  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/latest`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('No releases found. Please create a release with an APK asset in GitHub.');
    }
    throw new Error(`Failed to fetch latest release: ${response.status}`);
  }
  const data = await response.json();
  return {
    tag: data.tag_name,
    name: data.name,
    publishedAt: data.published_at,
    apk: pickApk(data.assets || []),
    body: data.body || '',
  };
};

/** Release item for the build picker (has APK) */
export interface ReleaseListItem {
  tag: string;
  name: string;
  publishedAt: string;
  apk: ReleaseAsset;
}

/** Fetch list of GitHub releases that have an APK asset (for in-app build picker) */
export const fetchReleasesList = async (): Promise<ReleaseListItem[]> => {
  const { githubOwner, githubRepo } = DEV_BUILDS;
  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases?per_page=30`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch releases: ${response.status}`);
  }
  const data: Array<{
    tag_name: string;
    name: string | null;
    published_at: string;
    assets: Array<{ name: string; browser_download_url: string; size?: number }>;
  }> = await response.json();
  const result: ReleaseListItem[] = [];
  for (const r of data) {
    const apk = pickApk(r.assets);
    if (apk) {
      result.push({
        tag: r.tag_name,
        name: r.name || r.tag_name,
        publishedAt: r.published_at,
        apk,
      });
    }
  }
  return result;
};

export const fetchBuildList = async (): Promise<any[] | null> => {
  if (!DEV_BUILDS.listUrl) return null;
  const response = await fetch(DEV_BUILDS.listUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch build list: ${response.status}`);
  }
  return response.json();
};
