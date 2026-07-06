// Pure validation for the public /creators application form.
export const NICHE_OPTIONS = ['grooming', 'fitness', 'lifestyle', 'couples', 'everyday'];
export const DEAL_OPTIONS = ['ugc', 'affiliate', 'partnership'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateApplication(form) {
  const f = form || {};
  const errors = {};
  if (!f.name || !String(f.name).trim()) errors.name = 'Your name is required.';
  if (!f.email || !EMAIL_RE.test(String(f.email).trim())) errors.email = 'A valid email is required.';
  if (!f.instagram_handle || !String(f.instagram_handle).trim()) errors.instagram_handle = 'Your Instagram handle is required.';
  if (!f.portfolio_url || !String(f.portfolio_url).trim()) errors.portfolio_url = 'A link to your content is required.';
  const fc = String(f.follower_count ?? '').replace(/[,\s]/g, '');
  if (!fc || !/^\d+$/.test(fc)) errors.follower_count = 'Enter your follower count as a number.';
  if (!f.niche || !NICHE_OPTIONS.includes(f.niche)) errors.niche = 'Pick your niche.';
  return { valid: Object.keys(errors).length === 0, errors };
}
