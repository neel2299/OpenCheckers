import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Check, GraduationCap, Heart, Palette, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { useGame } from '../state/GameContext';
import { Body, Button, C, Card, Heading, s } from '../components/ui';
import { THEMES } from '../components/Board';
import { FeedbackSettings } from '../components/FeedbackSettings';
import { Page } from '../components/mobile/Page';
import { useDonation } from '../support/DonationProvider';
import appConfig from '../../app.json';

export default function Settings() {
  const { preferences, setPreferences, openTutorial } = useGame();
  const donation = useDonation();
  return <Page>
    <Card style={{ backgroundColor: C.green, gap: 10 }}><Palette size={25} color={C.lime} /><Heading style={{ fontSize: 23, color: '#FFFFFF' }}>Your club, your style.</Heading><Body style={{ fontSize: 13, color: '#E2EBDD' }}>Make every sound your own. Choose backgrounds, board textures, and piece finishes, or import your own files.</Body><Button secondary icon={Palette} label="Open personalization" onPress={() => router.navigate('/personalize')}>Personalize your club</Button></Card>
    <Card><Heading style={{ fontSize: 19 }}>Board appearance</Heading><Body style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Choose a color theme.</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>{(Object.keys(THEMES) as (keyof typeof THEMES)[]).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`${key} board theme`} accessibilityState={{ checked: preferences.theme === key && !preferences.personalization.board.palette }} aria-checked={preferences.theme === key && !preferences.personalization.board.palette} onPress={() => setPreferences(current => ({ ...current, theme: key, personalization: { ...current.personalization, board: { ...current.personalization.board, palette: undefined } } }))} style={{ flex: 1, minWidth: 128, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: preferences.theme === key && !preferences.personalization.board.palette ? '#8DA77F' : C.line, backgroundColor: preferences.theme === key && !preferences.personalization.board.palette ? C.pale : C.paper }}>
        <View style={{ height: 56, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', borderRadius: 6 }}>{Array.from({ length: 16 }, (_, i) => <View key={i} style={{ width: '25%', height: '25%', backgroundColor: (Math.floor(i / 4) + i % 4) % 2 ? THEMES[key].dark : THEMES[key].light }} />)}</View>
        <View style={[s.between, { marginTop: 9, minHeight: 24 }]}><Text style={{ fontFamily: 'DM_600', textTransform: 'capitalize', fontSize: 12, color: C.ink }}>{key}</Text>{preferences.theme === key && !preferences.personalization.board.palette && <Check size={15} color={C.green} />}</View>
      </Pressable>)}</View>
    </Card>
    <Card><Heading style={{ fontSize: 19 }}>Playing aids</Heading>{[
      { key: 'hints' as const, title: 'Show legal moves', description: 'Highlight destinations when you select a piece.' },
      { key: 'numbers' as const, title: 'Number the squares', description: 'Add standard checkers numbers alongside coordinates. Moves always use coordinates.' },
    ].map(({ key, title, description }, i) => <View key={key} style={[s.between, { gap: 12, minHeight: 82, paddingTop: 12, paddingBottom: i ? 0 : 12, borderBottomWidth: i ? 0 : 1, borderColor: C.line }]}><View style={{ flex: 1 }}><Body style={{ fontFamily: 'DM_600' }}>{title}</Body><Body style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{description}</Body></View><Switch accessibilityLabel={title} value={preferences[key]} onValueChange={value => setPreferences(current => ({ ...current, [key]: value }))} trackColor={{ false: '#DDE2D5', true: '#6F8C5F' }} thumbColor="white" /></View>)}</Card>
    <FeedbackSettings />
    <Card>
      <Heading style={{ fontSize: 19 }}>Tutorial & analyser guide</Heading>
      <Body style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Review notation, variant rules, and how to read engine evaluations and principal variations.</Body>
      <Button secondary icon={GraduationCap} label="Replay app tutorial" onPress={openTutorial} style={{ marginTop: 14 }}>Open app tutorial</Button>
    </Card>
    <Card style={{ gap: 12 }}><Heading style={{ fontSize: 19 }}>Support the developer</Heading><Body style={{ color: C.muted, fontSize: 13 }}>Enjoying the club? An optional donation helps improve the app and add new features. Every feature is free.</Body><Button secondary icon={Heart} onPress={donation.open}>Donate to the developer</Button></Card>
    <Card><View style={{ flexDirection: 'row', gap: 10 }}><ShieldCheck size={20} color={C.green} /><View style={{ flex: 1 }}><Body style={{ fontFamily: 'DM_600', fontSize: 13 }}>Saved automatically on this device</Body><Body style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Your game, analysis, and settings stay on your phone. The engine works offline. No account needed. Ads are disabled and all features, including Royal Club, are available to everyone.</Body><Body style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>OpenCheckers · Version {appConfig.expo.version}</Body></View></View></Card>
  </Page>;
}
