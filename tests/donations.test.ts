import assert from 'node:assert/strict';
import test from 'node:test';
import { DONATION_URL, isIndiaTimeZone, shouldPromptForDonation, UPI_DONATION_URI, UPI_ID } from '../src/support/donations.ts';

test('the launch donation prompt selects only the lower quarter of random rolls', () => {
  assert.equal(shouldPromptForDonation(() => 0), true);
  assert.equal(shouldPromptForDonation(() => 0.249999), true);
  assert.equal(shouldPromptForDonation(() => 0.25), false);
  assert.equal(shouldPromptForDonation(() => 0.999999), false);
});

test('both India timezone aliases select UPI, with international and unknown zones falling back', () => {
  assert.equal(isIndiaTimeZone('Asia/Kolkata'), true);
  assert.equal(isIndiaTimeZone('Asia/Calcutta'), true);
  for (const zone of ['Europe/London', 'Asia/Colombo', 'America/New_York', 'UTC', '']) assert.equal(isIndiaTimeZone(zone), false);
});

test('donation destinations match the supplied page and QR without specifying an amount', () => {
  assert.equal(DONATION_URL, 'https://buymeacoffee.com/nitruspeed');
  const uri = new URL(UPI_DONATION_URI);
  assert.equal(uri.protocol, 'upi:');
  assert.equal(uri.searchParams.get('pa'), UPI_ID);
  assert.equal(UPI_ID, 'suhaas1@ptyes');
  assert.doesNotMatch(UPI_ID, /\d{10}/);
  assert.equal(uri.searchParams.get('pn'), 'SUHAAS NEEL');
  assert.equal(uri.searchParams.has('am'), false);
});
