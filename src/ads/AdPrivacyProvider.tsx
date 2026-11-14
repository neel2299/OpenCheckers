import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../state/GameContext';
import { ADS_AVAILABLE, currentAdPrivacy, prepareRewardedAds, refreshAdPrivacy, showAdPrivacy } from './backend';

type PrivacyContext = { required: boolean; busy: boolean; message: string; prepare: (active: () => boolean) => Promise<void>; open: () => Promise<void> };
const Context = createContext<PrivacyContext>({ required: false, busy: false, message: '', prepare: async () => {}, open: async () => {} });
export function AdPrivacyProvider({ children }: { children: ReactNode }) {
  const { ready } = useGame();
  const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!ready || !ADS_AVAILABLE) return;
    let active = true;
    // Refresh UMP every launch without initializing or loading an ad.
    void refreshAdPrivacy().then(info => { if (active) setRequired(info.required); }).catch(() => {});
    return () => { active = false; };
  }, [ready]);
  const prepare = useCallback(async (active: () => boolean) => {
    try { setRequired((await prepareRewardedAds(active)).required); }
    finally { void currentAdPrivacy().then(info => setRequired(info.required)).catch(() => {}); }
  }, []);
  const open = useCallback(async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { setRequired((await showAdPrivacy()).required); }
    catch { setMessage('Privacy choices could not be opened. Please try again later.'); }
    finally { setBusy(false); }
  }, [busy]);
  return <Context.Provider value={{ required, busy, message, prepare, open }}>{children}</Context.Provider>;
}
export const useAdPrivacy = () => useContext(Context);
