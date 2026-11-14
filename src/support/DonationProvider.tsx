import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { Coffee, Copy, Heart, QrCode } from 'lucide-react-native';
import { useGame } from '../state/GameContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import { Sheet } from '../components/mobile/Sheet';
import { Body, Button, C } from '../components/ui';
import { deviceUsesIndiaTimeZone, DONATION_URL, shouldPromptForDonation, UPI_DONATION_URI, UPI_ID } from './donations';

const Context = createContext<{ open: () => void; visible: boolean }>({ open: () => {}, visible: false });

export function DonationProvider({ children }: { children: ReactNode }) {
  const { ready, tutorialOpen } = useGame();
  const { stop } = useFeedback();
  const [requested, setRequested] = useState(shouldPromptForDonation);
  const [showUpi, setShowUpi] = useState(deviceUsesIndiaTimeZone);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const visible = requested && ready && !tutorialOpen;
  const open = useCallback(() => { setShowUpi(deviceUsesIndiaTimeZone()); setError(''); setCopied(false); setRequested(true); }, []);
  const close = () => setRequested(false);
  const openUrl = (url: string) => {
    setError('');
    // Keep the web game open while the donor visits the external payment page.
    if (Platform.OS === 'web') { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    void Linking.openURL(url).catch(() => setError(url === UPI_DONATION_URI ? 'Could not open a UPI app. Scan the QR code or copy the UPI ID instead.' : 'Could not open the donation page. Check your connection and try again.'));
  };
  const useUpiApp = showUpi && Platform.OS !== 'web';
  useEffect(() => { if (visible) stop(); }, [visible, stop]);

  return <Context.Provider value={{ open, visible }}>
    {children}
    {visible && <Sheet title="Support the developer" subtitle="Help OpenCheckers keep improving." onClose={close} tall={showUpi} footer={<View style={{ gap: 8 }}>
      <Button icon={useUpiApp ? QrCode : Coffee} onPress={() => openUrl(useUpiApp ? UPI_DONATION_URI : DONATION_URL)}>{useUpiApp ? 'Donate with a UPI app' : 'Donate with Buy Me a Coffee'}</Button>
      <Button secondary onPress={close}>Maybe later</Button>
    </View>}>
      {showUpi ? <Body>Support the developer and help improve OpenCheckers. Every feature is free, and donations are optional.</Body> : <>
        <View style={styles.icon}><Heart size={30} color={C.green} /></View>
        <Body>If you enjoy playing, please consider a donation to the developer. Your support helps improve the app, fix bugs, and add new features.</Body>
        <Body style={styles.note}>Every feature is free. Donations are completely optional. Thank you for playing!</Body>
      </>}
      {showUpi && <View style={styles.upi}>
        <Body style={{ fontFamily: 'DM_700' }}>Donate with UPI</Body>
        <Image testID="donation-upi-qr" accessibilityLabel="Developer donation UPI QR code" source={require('../../assets/donation-upi.jpg')} resizeMode="contain" style={styles.qr} />
        <Body style={[styles.note, { textAlign: 'center' }]}>Scan this QR code with your UPI app, or take a screenshot and import it in your UPI app.</Body>
        <Body style={styles.note}>{UPI_ID}</Body>
        <Button secondary icon={Copy} onPress={() => { void Clipboard.setStringAsync(UPI_ID).then(() => setCopied(true)).catch(() => setError('Could not copy the UPI ID. You can enter the ID shown above in your UPI app.')); }}>{copied ? 'UPI ID copied' : 'Copy UPI ID'}</Button>
        {useUpiApp && <Button secondary icon={Coffee} onPress={() => openUrl(DONATION_URL)}>Use Buy Me a Coffee instead</Button>}
      </View>}
      <Button secondary icon={showUpi ? Coffee : QrCode} onPress={() => { setShowUpi(value => !value); setError(''); }}>{showUpi ? 'Hide UPI QR code' : 'Donate with UPI instead'}</Button>
      {!!error && <Body style={{ color: '#A34F3D' }}>{error}</Body>}
    </Sheet>}
  </Context.Provider>;
}

export const useDonation = () => useContext(Context);
const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, lineHeight: 18, color: C.muted },
  upi: { alignItems: 'center', gap: 10 },
  qr: { width: 240, height: 237, maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 12 },
});
