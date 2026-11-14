import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGame } from '../state/GameContext';
import { personalizationAssets, type MediaAsset } from './model';
import { releaseUnusedMedia, resolveMedia } from './storage';

const AssetsContext = createContext<Record<string, string | null>>({});
export function PersonalizationAssetsProvider({ children }: { children: ReactNode }) {
  const { preferences } = useGame();
  const assets = useMemo(() => personalizationAssets(preferences.personalization), [preferences.personalization]);
  const [uris, setUris] = useState<Record<string, string | null>>({});
  useEffect(() => {
    let live = true;
    void Promise.all(assets.map(async asset => [asset.id, await resolveMedia(asset).catch(() => null)] as const)).then(entries => {
      if (live) { setUris(Object.fromEntries(entries)); releaseUnusedMedia(assets.map(asset => asset.id)); }
    });
    return () => { live = false; };
  }, [assets]);
  return <AssetsContext.Provider value={uris}>{children}</AssetsContext.Provider>;
}
export function useMediaUri(asset?: MediaAsset): string | null | undefined {
  const uris = useContext(AssetsContext);
  return asset ? uris[asset.id] : undefined;
}
