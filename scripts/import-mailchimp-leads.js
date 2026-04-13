/**
 * Import Mailchimp subscriber CSV into Supabase leads table.
 *
 * Usage:
 *   node scripts/import-mailchimp-leads.js path/to/mailchimp_export.csv
 *
 * Setup:
 *   npm install @supabase/supabase-js csv-parse dotenv  (run from repo root)
 *
 * The script expects the standard Mailchimp export CSV which has headers like:
 *   Email Address, First Name, Last Name, ...
 *
 * Existing emails are skipped (no duplicates inserted).
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-mailchimp-leads.js <path-to-csv>');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // use service role to bypass RLS for bulk insert
);

const raw = fs.readFileSync(path.resolve(csvPath), 'utf8');
const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

console.log(`Found ${records.length} records in CSV`);

// Fetch existing waitlist emails to avoid duplicates
const { data: existing } = await supabase
  .from('leads')
  .select('email')
  .eq('checkout_status', 'waitlist');

const existingEmails = new Set((existing || []).map(r => r.email.toLowerCase()));
console.log(`${existingEmails.size} waitlist emails already in DB`);

const toInsert = records
  .filter(row => {
    const email = (row['Email Address'] || row['email'] || '').toLowerCase().trim();
    return email && !existingEmails.has(email);
  })
  .map(row => ({
    email: (row['Email Address'] || row['email'] || '').toLowerCase().trim(),
    first_name: row['First Name'] || row['first_name'] || null,
    last_name: row['Last Name'] || row['last_name'] || null,
    checkout_status: 'waitlist',
    source: 'mailchimp_import',
  }));

console.log(`Inserting ${toInsert.length} new records (${records.length - toInsert.length} skipped as duplicates)`);

if (toInsert.length === 0) {
  console.log('Nothing to insert.');
  process.exit(0);
}

// Insert in batches of 100
const BATCH = 100;
let inserted = 0;
for (let i = 0; i < toInsert.length; i += BATCH) {
  const batch = toInsert.slice(i, i + BATCH);
  const { error } = await supabase.from('leads').insert(batch);
  if (error) {
    console.error(`Batch ${i / BATCH + 1} failed:`, error.message);
  } else {
    inserted += batch.length;
    process.stdout.write(`\rInserted ${inserted}/${toInsert.length}...`);
  }
}

console.log(`\nDone. ${inserted} records imported successfully.`);
