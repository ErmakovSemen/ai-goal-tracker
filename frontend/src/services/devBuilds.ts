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
  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/tags/${latestTag}`;
  const response = await fetch(url);
  if (!response.ok) {
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

export const fetchBuildList = async (): Promise<any[] | null> => {
  if (!DEV_BUILDS.listUrl) return null;
  const response = await fetch(DEV_BUILDS.listUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch build list: ${response.status}`);
  }
  return response.json();
};
