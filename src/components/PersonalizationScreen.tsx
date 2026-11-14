import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, FolderOpen, ImagePlus, Play, RotateCcw, Upload, Volume2, X } from 'lucide-react-native';
import { useGame } from '../state/GameContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import type { FeedbackCue } from '../feedback/events';
import { createPosition } from '../game/engine';
import { BUILTIN_SOUNDS, SOUND_EVENTS, TEXTURES, THEMES, defaultPersonalization, isHexColor, personalizationAssets, type BoardSurface, type MediaAsset, type Personalization, type SoundChoice, type Texture } from '../personalization/model';
import { importMedia } from '../personalization/importMedia';
import { cleanUnusedMedia } from '../personalization/storage';
import { useMediaUri } from '../personalization/AssetsProvider';
import { TextureLayer, useBoardPalette } from '../personalization/Surfaces';
import { Board } from './Board';
import { RoyalClubReward } from './RoyalClubReward';
import { Sheet } from './mobile/Sheet';
import { Body, Button, C, Card, Heading, IconButton, Label, s } from './ui';

type ColorTarget = 'background' | 'dark' | 'light' | 'frame' | 'last' | 'white' | 'black';
const COLOR_LABELS: Record<ColorTarget, string> = { background: 'Background color', dark: 'Dark squares color', light: 'Light squares color', frame: 'Board frame color', last: 'Last move highlight', white: 'Ivory piece color', black: 'Coral piece color' };
const COLORS = ['#173D30', '#F3F5F1', '#FFF6E8', '#E4ECE6', '#E4EDF5', '#EEE7F4', '#F5E5DF', '#285740', '#779183', '#E7EBDA', '#A88668', '#CC785F', '#FAF6E9'];
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function TextureChoices({ label, value, select }: { label: string; value: Texture; select: (texture: Texture) => void }) {
  const choices: readonly Texture[] = [...TEXTURES, 'royal'];
  return <View style={{ gap: 9 }}><Label>{label}</Label><View style={styles.wrap}>{choices.map(texture => <Pressable key={texture} accessibilityRole="radio" accessibilityLabel={`${label} ${texture}`} accessibilityState={{ checked: value === texture }} aria-checked={value === texture} onPress={() => select(texture)} style={[styles.textureChoice, value === texture && styles.selected]}>
    <View style={styles.textureSample}><TextureLayer texture={texture} opacity={0.8} />{value === texture && <Check size={16} color={C.green} />}</View><Text style={styles.smallName}>{titleCase(texture)}</Text>
  </Pressable>)}</View></View>;
}
function LevelChoices({ label, value, select, zero = false }: { label: string; value: number; select: (value: number) => void; zero?: boolean }) {
  return <View style={{ gap: 8 }}><Label>{label}</Label><View style={styles.levels}>{(zero ? [0, 0.25, 0.5, 0.75, 1] : [0.25, 0.5, 0.75, 1]).map(level => <Pressable key={level} accessibilityRole="radio" accessibilityLabel={`${label} ${level * 100}%`} accessibilityState={{ checked: value === level }} aria-checked={value === level} onPress={() => select(level)} style={[styles.level, value === level && styles.selected]}><Text style={styles.smallName}>{level * 100}%</Text></Pressable>)}</View></View>;
}
function ColorRow({ target, value, edit }: { target: ColorTarget; value: string; edit: (target: ColorTarget) => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${COLOR_LABELS[target].toLowerCase()}`} onPress={() => edit(target)} style={styles.colorRow}><View style={[styles.swatch, { backgroundColor: value }]} /><View style={{ flex: 1 }}><Body style={{ fontFamily: 'DM_600', fontSize: 13 }}>{COLOR_LABELS[target]}</Body><Body style={styles.note}>{value.toUpperCase()}</Body></View><ChevronRight size={18} color={C.muted} /></Pressable>;
}
function ColorEditor({ target, value, apply, close }: { target: ColorTarget; value: string; apply: (color: string) => void; close: () => void }) {
  const [draft, setDraft] = useState(value);
  return <Sheet title={COLOR_LABELS[target]} subtitle="Choose a swatch or enter a six-digit hex color." onClose={close} footer={<Button disabled={!isHexColor(draft)} onPress={() => { apply(draft.toUpperCase()); close(); }}>Apply color</Button>}>
    <View style={[styles.colorPreview, { backgroundColor: isHexColor(draft) ? draft : value }]} />
    <View style={styles.wrap}>{COLORS.map(color => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`Color ${color}`} accessibilityState={{ checked: draft.toUpperCase() === color }} aria-checked={draft.toUpperCase() === color} onPress={() => setDraft(color)} style={[styles.swatchButton, { backgroundColor: color }, draft.toUpperCase() === color && { borderWidth: 3, borderColor: C.green }]} />)}</View>
    <Label>Hex color</Label><TextInput accessibilityLabel="Hex color" value={draft} onChangeText={setDraft} autoCapitalize="characters" autoCorrect={false} maxLength={7} style={styles.input} placeholder="#285740" />
    {!isHexColor(draft) && <Body style={styles.note}>Use # followed by six letters or numbers from 0–9 and A–F.</Body>}
  </Sheet>;
}
function ImportControl({ label, asset, audio = false, busy, choose, remove }: { label: string; asset?: MediaAsset; audio?: boolean; busy: boolean; choose: () => void; remove: () => void }) {
  const uri = useMediaUri(asset);
  return <View style={styles.importControl}>
    <View style={{ flex: 1, gap: 3 }}><Text style={styles.smallName}>{label}</Text><Body numberOfLines={2} style={styles.note}>{asset ? asset.name : audio ? 'Use a short audio clip of your own' : 'Choose an image from your files'}</Body>{asset && uri === null && <Body style={[styles.note, { color: '#A34F3D' }]}>File unavailable. Using the club default.</Body>}</View>
    <IconButton icon={asset ? Upload : audio ? FolderOpen : ImagePlus} label={`${asset ? 'Replace' : 'Import'} ${label}`} onPress={choose} disabled={busy} />
    {asset && <IconButton icon={X} label={`Remove ${label}`} onPress={remove} disabled={busy} />}
  </View>;
}
function soundName(choice: SoundChoice): string {
  if (choice.source === 'mute' || choice.volume === 0) return 'Muted';
  if (choice.source === 'custom') return choice.asset?.name ?? 'Custom sound';
  return choice.source === 'default' ? 'Club default' : `${BUILTIN_SOUNDS.find(sound => sound.id === choice.source)?.name ?? 'Club'} sound`;
}

export function PersonalizationScreen() {
  const { preferences, setPreferences, storageError, flushStorage } = useGame();
  const { preview, stop } = useFeedback();
  useEffect(() => () => stop(), [stop]);
  const personal = preferences.personalization;
  const palette = useBoardPalette();
  const [tab, setTab] = useState<'appearance' | 'sounds' | 'files'>('appearance');
  const [section, setSection] = useState<'background' | 'board' | 'pieces'>('background');
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [soundTarget, setSoundTarget] = useState<FeedbackCue | null>(null);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [flipped, setFlipped] = useState(false);
  const { width } = useWindowDimensions();
  const previewPosition = useMemo(() => createPosition('english'), []);
  const assets = useMemo(() => personalizationAssets(personal), [personal]);
  const update = (change: (current: Personalization) => Personalization) => setPreferences(current => ({ ...current, personalization: change(current.personalization) }));
  const chooseFile = async (label: string, kind: MediaAsset['kind'], apply: (asset: MediaAsset) => void, imageSize = 512) => {
    if (busy) return;
    setBusy(label); setMessage('');
    try { const asset = await importMedia(kind, imageSize); if (asset) { apply(asset); setMessage(`${label} saved.`); } }
    catch (error) { setMessage(error instanceof Error ? error.message : 'This file could not be imported. Please try another file.'); }
    finally { setBusy(null); }
  };
  const setSound = (cue: FeedbackCue, change: Partial<SoundChoice>) => update(current => ({ ...current, sounds: { ...current.sounds, [cue]: { ...current.sounds[cue], ...change } } }));
  const previewSound = async (cue: FeedbackCue) => {
    const choice = personal.sounds[cue];
    if (!preferences.sound || preferences.volume === 0) setMessage('Enable sound effects and raise the master volume to preview.');
    else if (choice.source === 'mute' || choice.volume === 0) setMessage('This event is muted. Choose a sound and raise its volume to preview.');
    else {
      setMessage('Preparing sound…');
      const result = await preview(cue);
      if (result === 'played') setMessage(`Playing ${SOUND_EVENTS.find(event => event.id === cue)?.name.toLowerCase()} sound.`);
      else if (result === 'unavailable') setMessage('This sound could not be played. Try choosing another sound or importing it again.');
      else setMessage('');
    }
  };
  const colorValue = (target: ColorTarget) => target === 'background' ? personal.background.color : target === 'white' || target === 'black' ? personal.pieces[target] : palette[target];
  const applyColor = (target: ColorTarget, color: string) => setPreferences(current => {
    const p = current.personalization;
    const next = target === 'background' ? { ...p, background: { ...p.background, color } } : target === 'white' || target === 'black' ? { ...p, pieces: { ...p.pieces, [target]: color } } : { ...p, board: { ...p.board, palette: { ...(p.board.palette ?? THEMES[current.theme]), [target]: color } } };
    return { ...current, personalization: next };
  });
  const currentSound = soundTarget ? personal.sounds[soundTarget] : null;
  const soundTitle = SOUND_EVENTS.find(event => event.id === soundTarget)?.name ?? '';
  const closeSound = () => { stop(); setSoundTarget(null); };

  return <View style={{ flex: 1 }}>
    <View style={styles.header}><IconButton icon={ArrowLeft} label="Back to Settings" onPress={() => { stop(); router.navigate('/settings'); }} /><View style={{ flex: 1 }}><Heading style={{ fontSize: 22 }}>Personalization</Heading><Body style={styles.note}>Your club, your style. Saved automatically.</Body></View></View>
    <View style={styles.tabs}>{(['appearance', 'sounds', 'files'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`Personalization ${titleCase(item)}`} accessibilityState={{ selected: tab === item }} aria-selected={tab === item} onPress={() => { stop(); setTab(item); setMessage(''); }} style={[styles.tab, tab === item && styles.selected]}><Text style={styles.smallName}>{titleCase(item)}</Text></Pressable>)}</View>
    {(!!message || !!busy || storageError) && <View accessibilityLiveRegion="polite" style={styles.message}>{busy && <ActivityIndicator size="small" color={C.green} />}<Body style={{ fontSize: 12, flex: 1 }}>{busy ? `Importing ${busy.toLowerCase()}…` : storageError ? 'Your latest choices could not be saved on this device.' : message}</Body></View>}
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
      {tab === 'appearance' && <>
        <Card style={styles.preview}><View style={s.between}><Label>LIVE PREVIEW</Label><Button secondary label="Flip personalization preview" onPress={() => setFlipped(value => !value)} style={{ minHeight: 44 }}>Flip</Button></View><View style={{ alignSelf: 'center' }}><Board position={previewPosition} width={Math.min(300, width - 68)} flipped={flipped} selected={null} destinations={[]} disabled onSquare={() => {}} /></View><Body style={[styles.note, { textAlign: 'center' }]}>Your finish appears on every play, analysis, and puzzle board.</Body></Card>
        <View style={styles.levels}>{(['background', 'board', 'pieces'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`Customize ${item}`} accessibilityState={{ selected: section === item }} aria-selected={section === item} onPress={() => setSection(item)} style={[styles.tab, section === item && styles.selected]}><Text style={styles.smallName}>{item === 'background' ? 'Room' : titleCase(item)}</Text></Pressable>)}</View>
        {section === 'background' && <Card style={styles.section}><Heading style={styles.heading}>Set the scene</Heading><Body style={styles.note}>Choose a backdrop, add a texture, or use a photo of your own.</Body>
          <View style={styles.wrap}>{COLORS.slice(0, 6).map(color => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`Background ${color}`} accessibilityState={{ checked: personal.background.color === color }} aria-checked={personal.background.color === color} onPress={() => update(p => ({ ...p, background: { ...p.background, color } }))} style={[styles.swatchButton, { backgroundColor: color }, personal.background.color === color && styles.selected]} />)}</View>
          <ColorRow target="background" value={personal.background.color} edit={setColorTarget} />
          <TextureChoices label="Background texture" value={personal.background.texture} select={texture => update(p => ({ ...p, background: { ...p.background, texture } }))} />
          <ImportControl label="Background image" asset={personal.background.image} busy={!!busy} choose={() => { void chooseFile('Background image', 'image', image => update(p => ({ ...p, background: { ...p.background, image } })), 1536); }} remove={() => update(p => ({ ...p, background: { ...p.background, image: undefined } }))} />
          {personal.background.image && <LevelChoices label="Background image strength" value={personal.background.imageOpacity} zero select={imageOpacity => update(p => ({ ...p, background: { ...p.background, imageOpacity } }))} />}
          <Button secondary icon={RotateCcw} disabled={!!busy} onPress={() => update(p => ({ ...p, background: defaultPersonalization().background }))}>Reset background</Button>
        </Card>}
        {section === 'board' && <Card style={styles.section}><RoyalClubReward /><Heading style={styles.heading}>A board that feels like home</Heading><Label>Color presets</Label><View style={styles.wrap}>{Object.entries(THEMES).map(([key, theme]) => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`Personalization ${key} board`} accessibilityState={{ checked: preferences.theme === key && !personal.board.palette }} aria-checked={preferences.theme === key && !personal.board.palette} onPress={() => setPreferences(current => ({ ...current, theme: key as typeof preferences.theme, personalization: { ...current.personalization, board: { ...current.personalization.board, palette: undefined } } }))} style={[styles.preset, preferences.theme === key && !personal.board.palette && styles.selected]}><View style={{ height: 24, flexDirection: 'row', borderRadius: 5, overflow: 'hidden' }}><View style={{ flex: 1, backgroundColor: theme.dark }} /><View style={{ flex: 1, backgroundColor: theme.light }} /></View><Text style={[styles.smallName, { marginTop: 6 }]}>{titleCase(key)}</Text></Pressable>)}</View>
          {(['dark', 'light', 'frame', 'last'] as const).map(target => <ColorRow key={target} target={target} value={palette[target]} edit={setColorTarget} />)}
          <TextureChoices label="Board texture" value={personal.board.texture} select={texture => update(p => ({ ...p, board: { ...p.board, texture } }))} />
          <LevelChoices label="Board texture strength" value={personal.board.textureOpacity} select={textureOpacity => update(p => ({ ...p, board: { ...p.board, textureOpacity } }))} />
          <Body style={styles.note}>Replace each surface with your own image. Imported textures take priority over the built-in finish.</Body>
          {(['dark', 'light', 'frame'] as BoardSurface[]).map(surface => <ImportControl key={surface} label={`${surface === 'frame' ? 'Frame' : titleCase(surface) + ' squares'} texture`} asset={personal.board.images[surface]} busy={!!busy} choose={() => { void chooseFile(`${titleCase(surface)} texture`, 'image', image => update(p => ({ ...p, board: { ...p.board, images: { ...p.board.images, [surface]: image } } }))); }} remove={() => update(p => ({ ...p, board: { ...p.board, images: { ...p.board.images, [surface]: undefined } } }))} />)}
          <Button secondary icon={RotateCcw} disabled={!!busy} onPress={() => setPreferences(p => ({ ...p, theme: 'sage', personalization: { ...p.personalization, board: defaultPersonalization().board } }))}>Reset board</Button>
        </Card>}
        {section === 'pieces' && <Card style={styles.section}><Heading style={styles.heading}>Give your pieces character</Heading><Body style={styles.note}>Keep the two colors distinct so captures and kings are easy to read.</Body>
          <ColorRow target="white" value={personal.pieces.white} edit={setColorTarget} /><ColorRow target="black" value={personal.pieces.black} edit={setColorTarget} />
          <TextureChoices label="Piece texture" value={personal.pieces.texture} select={texture => update(p => ({ ...p, pieces: { ...p.pieces, texture } }))} />
          {(['white', 'black'] as const).map(side => <ImportControl key={side} label={`${side === 'white' ? 'Ivory' : 'Coral'} piece image`} asset={personal.pieces.images[side]} busy={!!busy} choose={() => { void chooseFile(`${side === 'white' ? 'Ivory' : 'Coral'} piece image`, 'image', image => update(p => ({ ...p, pieces: { ...p.pieces, images: { ...p.pieces.images, [side]: image } } })), 256); }} remove={() => update(p => ({ ...p, pieces: { ...p.pieces, images: { ...p.pieces.images, [side]: undefined } } }))} />)}
          <Button secondary icon={RotateCcw} disabled={!!busy} onPress={() => update(p => ({ ...p, pieces: defaultPersonalization().pieces }))}>Reset pieces</Button>
        </Card>}
      </>}
      {tab === 'sounds' && <>
        <Card style={styles.section}><View style={s.between}><View style={{ flex: 1 }}><Heading style={styles.heading}>Master audio</Heading><Body style={styles.note}>Individual sounds follow this volume and switch.</Body></View><Switch accessibilityLabel="Personalization sound effects" value={preferences.sound} onValueChange={sound => setPreferences(p => ({ ...p, sound }))} trackColor={{ false: C.line, true: C.green }} /></View><LevelChoices label="Master volume" value={preferences.volume} select={volume => setPreferences(p => ({ ...p, volume }))} /></Card>
        <Card style={styles.section}><Heading style={styles.heading}>Every moment, your sound</Heading><Body style={styles.note}>Replace any event, choose a club sound, or mute it. Audio imports can be up to 15 seconds and 5 MB.</Body>
          {SOUND_EVENTS.map(event => <View key={event.id} style={styles.soundRow}><Pressable accessibilityRole="button" accessibilityLabel={`Customize ${event.name} sound`} onPress={() => { stop(); setSoundTarget(event.id); }} style={styles.soundButton}><View style={styles.soundIcon}><Volume2 size={20} color={C.green} /></View><View style={{ flex: 1 }}><Text style={styles.smallName}>{event.name}</Text><Body numberOfLines={1} style={styles.note}>{soundName(personal.sounds[event.id])}</Body></View><ChevronRight size={17} color={C.muted} /></Pressable><IconButton icon={Play} label={`Preview ${event.name} sound`} disabled={!preferences.sound || personal.sounds[event.id].source === 'mute' || personal.sounds[event.id].volume === 0} onPress={() => previewSound(event.id)} /></View>)}
          <Button secondary icon={RotateCcw} disabled={!!busy} onPress={() => { stop(); update(p => ({ ...p, sounds: defaultPersonalization().sounds })); }}>Reset sound choices</Button>
        </Card>
      </>}
      {tab === 'files' && <>
        <Card style={styles.section}><FolderOpen size={26} color={C.green} /><Heading style={styles.heading}>Your imported files</Heading><Body style={styles.note}>{assets.length} saved {assets.length === 1 ? 'file' : 'files'} · {(assets.reduce((sum, asset) => sum + asset.bytes, 0) / 1024 / 1024).toFixed(1)} MB</Body><Body style={styles.note}>Imports stay on this device and work offline. Removing a picture or choosing a new sound keeps the rest of your setup.</Body>{assets.map(asset => <View key={asset.id} style={styles.fileRow}><Text numberOfLines={2} style={[styles.smallName, { flex: 1 }]}>{asset.name}</Text><Label>{asset.kind === 'image' ? 'Image' : 'Audio'}</Label></View>)}
          <Button secondary icon={FolderOpen} disabled={!!busy || storageError} onPress={() => { setBusy('Unused files'); void flushStorage().then(() => cleanUnusedMedia(assets.map(asset => asset.id))).then(count => setMessage(`Removed ${count} unused ${count === 1 ? 'import' : 'imports'}.`)).catch(() => setMessage('Could not clean up imported files. Please try again.')).finally(() => setBusy(null)); }}>Remove unused imports</Button>
        </Card>
        <Card style={styles.section}><Heading style={styles.heading}>A fresh canvas</Heading><Body style={styles.note}>Restore the club’s original room, board, pieces, and sound choices.</Body><Button secondary icon={RotateCcw} disabled={!!busy} onPress={() => setReset(true)}>Reset all personalization</Button></Card>
      </>}
    </ScrollView>
    {colorTarget && <ColorEditor key={colorTarget} target={colorTarget} value={colorValue(colorTarget)} apply={color => applyColor(colorTarget, color)} close={() => setColorTarget(null)} />}
    {soundTarget && currentSound && <Sheet title={`${soundTitle} sound`} subtitle={SOUND_EVENTS.find(event => event.id === soundTarget)?.description} onClose={closeSound} tall footer={<View style={styles.row}><Button secondary icon={Play} label={`Preview selected ${soundTitle} sound`} onPress={() => previewSound(soundTarget)} style={{ flex: 1 }} disabled={!preferences.sound || currentSound.source === 'mute' || currentSound.volume === 0}>Preview</Button><Button onPress={closeSound} style={{ flex: 1 }}>Done</Button></View>}>
      <View style={styles.row}>{(['default', 'mute'] as const).map(source => <Pressable key={source} accessibilityRole="radio" accessibilityLabel={`${soundTitle} sound ${source}`} accessibilityState={{ checked: currentSound.source === source }} aria-checked={currentSound.source === source} onPress={() => { stop(); setSound(soundTarget, { source }); }} style={[styles.option, { flex: 1 }, currentSound.source === source && styles.selected]}><Text style={styles.smallName}>{source === 'default' ? 'Event default' : 'Mute event'}</Text></Pressable>)}</View>
      <LevelChoices label={`${soundTitle} volume`} value={currentSound.volume} zero select={volume => setSound(soundTarget, { volume })} />
      <Label>CLUB SOUND LIBRARY</Label><View style={styles.wrap}>{BUILTIN_SOUNDS.map(sound => <Pressable key={sound.id} accessibilityRole="radio" accessibilityLabel={`Use ${sound.name} for ${soundTitle}`} accessibilityState={{ checked: currentSound.source === sound.id }} aria-checked={currentSound.source === sound.id} onPress={() => { stop(); setSound(soundTarget, { source: sound.id }); }} style={[styles.option, styles.half, currentSound.source === sound.id && styles.selected]}><Text style={styles.smallName}>{sound.name}</Text>{currentSound.source === sound.id && <Check size={16} color={C.green} />}</Pressable>)}</View>
      <Label>YOUR OWN SOUND</Label><ImportControl audio label={`${soundTitle} audio`} asset={currentSound.asset} busy={!!busy} choose={() => { void chooseFile(`${soundTitle} audio`, 'audio', asset => setSound(soundTarget, { source: 'custom', asset })); }} remove={() => setSound(soundTarget, { asset: undefined, source: currentSound.source === 'custom' ? 'default' : currentSound.source })} />
      {currentSound.asset && <Pressable accessibilityRole="radio" accessibilityLabel={`Use imported ${soundTitle} audio`} accessibilityState={{ checked: currentSound.source === 'custom' }} aria-checked={currentSound.source === 'custom'} onPress={() => setSound(soundTarget, { source: 'custom' })} style={[styles.option, currentSound.source === 'custom' && styles.selected]}><Text style={styles.smallName}>Use imported audio</Text>{currentSound.source === 'custom' && <Check size={16} color={C.green} />}</Pressable>}
      <Body style={styles.note}>MP3, M4A, WAV, OGG, or AAC · up to 15 seconds and 5 MB. Sounds stop when the app goes into the background.</Body>
      {!!busy && <ActivityIndicator color={C.green} />}{!!message && <Body style={styles.note}>{message}</Body>}
    </Sheet>}
    {reset && <Sheet title="Reset personalization?" subtitle="Restore the original appearance and sound choices." onClose={() => setReset(false)} footer={<View style={styles.row}><Button secondary onPress={() => setReset(false)} style={{ flex: 1 }}>Cancel</Button><Button onPress={() => { stop(); setPreferences(p => ({ ...p, theme: 'sage', personalization: defaultPersonalization() })); setReset(false); setMessage('Original appearance and sound choices restored.'); }} style={{ flex: 1 }}>Restore defaults</Button></View>}><Body>You can also reset just the background, board, pieces, or sounds in their own sections.</Body></Sheet>}
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10, backgroundColor: C.paper },
  tabs: { flexDirection: 'row', backgroundColor: C.paper, paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  selected: { backgroundColor: C.pale, borderColor: '#91AC84' },
  page: { padding: 16, paddingBottom: 28, gap: 16, width: '100%', maxWidth: 740, alignSelf: 'center' },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.pale },
  preview: { gap: 12, padding: 16 },
  section: { gap: 14 }, heading: { fontSize: 19, lineHeight: 25 }, note: { fontSize: 12, lineHeight: 18, color: C.muted }, smallName: { fontFamily: 'DM_600', fontSize: 12, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levels: { flexDirection: 'row', gap: 5 }, level: { flex: 1, minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 }, swatch: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.line }, swatchButton: { width: 44, height: 44, borderRadius: 11, borderWidth: 2, borderColor: C.line }, colorPreview: { height: 90, borderRadius: 14, borderWidth: 1, borderColor: C.line },
  textureChoice: { minWidth: 52, flex: 1, gap: 6, alignItems: 'center', padding: 6, borderWidth: 1, borderColor: C.line, borderRadius: 10 }, textureSample: { width: 36, height: 36, borderRadius: 7, backgroundColor: '#D6C8AF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#91AC84', borderRadius: 10, paddingHorizontal: 14, fontFamily: 'DM_600', fontSize: 16, color: C.ink, backgroundColor: C.paper },
  importControl: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, padding: 10, backgroundColor: C.soft, minHeight: 66 },
  preset: { flexGrow: 1, width: '45%', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line },
  soundRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.line, paddingVertical: 3 }, soundButton: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 }, soundIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: C.line, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, half: { width: '47%', flexGrow: 1 }, fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderBottomWidth: 1, borderColor: C.line },
});
