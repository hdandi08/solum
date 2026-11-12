import { campaignMetadata } from '../../../supabase/functions/_shared/campaignAttribution.mjs';
const KEY = 'solum_campaign_attribution_v1';
export function captureCampaignAttribution() {
  let saved = {};
  let landing = {};
  try { saved = campaignMetadata(JSON.parse(sessionStorage.getItem(KEY) || '{}')); } catch { /* Storage is optional. */ }
  try { landing = campaignMetadata(Object.fromEntries(new URLSearchParams(window.location.search))); } catch { /* Non-browser caller. */ }
  const current = Object.keys(landing).length ? landing : saved;
  try { sessionStorage.setItem(KEY, JSON.stringify(current)); } catch { /* URL is still preserved. */ }
  return current;
}
