// Explicit DEV-only campaign activation. Never uses the CLI-linked project.
// Signing secret is retained in DEV Vault and passed through a private env file.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHmac, randomBytes } from "node:crypto";
import { DEV_PROJECT, devQuery } from "./dev-db.mjs";
const target = [
  "--region",
  "eu-west-2",
  "--app-id",
  "d3pa095gzazg3c",
  "--branch-name",
  "dev",
];
const campaign = "black-friday-2026", endsAt = "2026-12-01T00:00:00Z";
let stage = "validation";
async function main() {
  if (DEV_PROJECT !== "rodvvmfzkyjsqbufkjbc" || process.argv.length !== 2) {
    throw Error("DEV guard");
  }
  const branch = JSON.parse(
    execFileSync("aws", [
      "amplify",
      "get-branch",
      ...target,
      "--query",
      "branch.{arn:branchArn,vars:environmentVariables}",
      "--output",
      "json",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
  );
  if (!branch.arn?.includes(":798470762256:apps/d3pa095gzazg3c/branches/dev")) {
    throw Error("DEV branch/account guard");
  }
  const vars = branch.vars ?? {};
  if (
    vars.VITE_SUPABASE_URL !== `https://${DEV_PROJECT}.supabase.co` ||
    !vars.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
    vars.VITE_MULTI_KIT_CHECKOUT_ENABLED !== "true"
  ) throw Error("DEV/test/multi-kit configuration guard");
  const campaigns = await devQuery(
    `select id,ends_at,now()<ends_at as active_window from public.meta_promo_campaigns where id='${campaign}'`,
  );
  if (
    campaigns.length !== 1 ||
    Date.parse(campaigns[0].ends_at) !== Date.parse(endsAt) ||
    campaigns[0].active_window !== true
  ) throw Error("Campaign deadline guard");
  stage = "DEV Vault";
  const name = "meta_promo_entry_secret_dev";
  const records = await devQuery(
    `select decrypted_secret from vault.decrypted_secrets where name='${name}'`,
  );
  if (records.length > 1) throw Error("Duplicate DEV signing secret");
  const secret = records[0]?.decrypted_secret ??
    randomBytes(32).toString("hex");
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    throw Error("DEV signing secret format guard");
  }
  if (!records.length) {
    await devQuery(
      `select vault.create_secret('${secret}','${name}','SOLUM DEV-only Meta campaign destination HMAC')`,
    );
  }
  const dir = await mkdtemp(join(tmpdir(), "solum-meta-promo-dev-"));
  try {
    stage = "DEV edge flags";
    const envFile = join(dir, "supabase.env");
    await writeFile(
      envFile,
      `META_PROMO_ENTRY_SECRET=${secret}\nMETA_PROMO_ENABLED=true\n`,
      { mode: 0o600 },
    );
    execFileSync("supabase", [
      "secrets",
      "set",
      "--env-file",
      envFile,
      "--project-ref",
      DEV_PROJECT,
      "--profile",
      "supabase",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    stage = "DEV branch flag";
    const branchFile = join(dir, "amplify.json");
    await writeFile(
      branchFile,
      JSON.stringify({ ...vars, VITE_META_PROMO_ENABLED: "true" }),
      { mode: 0o600 },
    );
    execFileSync("aws", [
      "amplify",
      "update-branch",
      ...target,
      "--environment-variables",
      `file://${branchFile}`,
      "--query",
      "branch.branchName",
      "--output",
      "text",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    stage = "DEV campaign activation";
    await devQuery(
      `update public.meta_promo_campaigns set starts_at=case when enabled then starts_at else now() end,enabled=true where id='${campaign}' and ends_at='${endsAt}'::timestamptz`,
    );
    // Public destination signature only; the private key is never displayed.
    const signature = createHmac("sha256", secret).update(
      `${campaign}:${endsAt}`,
    ).digest("hex");
    const url = new URL("https://dev.d3pa095gzazg3c.amplifyapp.com/");
    url.search = new URLSearchParams({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "black_friday_2026",
      offer_entry: signature,
    }).toString();
    console.log(
      "Enabled Meta campaign on DEV only. Signing uses lowercase HMAC-SHA256 hex; other branch variables were preserved.",
    );
    console.log(url.toString());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
try {
  await main();
} catch {
  console.error(
    `DEV promo configuration failed during ${stage}; provider details withheld to protect credentials.`,
  );
  process.exitCode = 1;
}
