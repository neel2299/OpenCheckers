import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createAudioPlayer } from 'expo-audio';
import { validateImport, type MediaAsset } from './model';
import { mediaBytes, saveMedia } from './storage';

async function validateAudio(uri: string): Promise<void> {
  const player = createAudioPlayer(uri, { updateInterval: 100 });
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let subscription: { remove: () => void } | undefined;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true; clearTimeout(timer); subscription?.remove();
        if (error) reject(error); else resolve();
      };
      const check = () => {
        if (player.isLoaded) finish(!Number.isFinite(player.duration) || player.duration > 15 || player.duration <= 0 ? new Error('Use a sound clip between 0 and 15 seconds long.') : undefined);
      };
      const timer = setTimeout(() => finish(new Error('This sound could not be opened. Try an MP3 or WAV clip.')), 12_000);
      subscription = player.addListener('playbackStatusUpdate', check);
      check();
    });
  } finally { player.remove(); }
}

/** Copy imports into durable app storage; never persist picker cache or blob URLs. */
export async function importMedia(kind: MediaAsset['kind'], imageSize = 1536): Promise<MediaAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: kind === 'image' ? ['image/jpeg', 'image/png', 'image/webp'] : ['audio/*'], copyToCacheDirectory: true, multiple: false, base64: false });
  if (result.canceled || !result.assets.length) return null;
  const selected = result.assets[0];
  let uri = selected.uri;
  try {
    const bytes = selected.size ?? selected.file?.size ?? await mediaBytes(selected.uri);
    const extension = validateImport(selected.name, kind, bytes);
    const imageFormat = extension === 'jpg' ? SaveFormat.JPEG : SaveFormat.PNG;
    if (kind === 'image') {
      const context = ImageManipulator.manipulate(uri, { maxWidth: imageSize, maxHeight: imageSize });
      try {
        const image = await context.renderAsync();
        try {
          const saved = await image.saveAsync({ format: imageFormat, compress: 0.85 });
          uri = saved.uri;
        } finally { image.release(); }
      } finally { context.release(); }
    } else await validateAudio(uri);
    const asset: MediaAsset = {
      id: `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${kind === 'image' ? imageFormat === SaveFormat.JPEG ? 'jpg' : 'png' : extension}`,
      kind, name: selected.name.slice(0, 120), bytes,
    };
    const storedBytes = await saveMedia(uri, asset);
    return { ...asset, bytes: storedBytes };
  } finally {
    if (Platform.OS === 'web') {
      if (selected.uri.startsWith('blob:')) URL.revokeObjectURL(selected.uri);
      if (uri !== selected.uri && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
    }
  }
}
