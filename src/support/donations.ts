export const DONATION_URL = 'https://buymeacoffee.com/nitruspeed';
export const DONATION_LAUNCH_CHANCE = 0.25;
// Decoded from the developer-provided QR image; no amount is preselected.
export const UPI_DONATION_URI = 'upi://pay?pa=suhaas1@ptyes&pn=SUHAAS%20NEEL';
export const UPI_ID = 'suhaas1@ptyes';

export const shouldPromptForDonation = (random: () => number = Math.random): boolean => random() < DONATION_LAUNCH_CHANCE;

/** A device time-zone hint, without requesting location access or contacting a service. */
export const isIndiaTimeZone = (zone: string): boolean => zone === 'Asia/Calcutta' || zone === 'Asia/Kolkata';

export function deviceUsesIndiaTimeZone(): boolean {
  try { return isIndiaTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone); }
  catch { return false; }
}
