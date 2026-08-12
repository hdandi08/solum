// deno-lint-ignore-file no-import-prefix -- Match the repository's pinned Deno test dependency.
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyPublisher,
  inferNominalCommissionPence,
  normalizeCommissionGroupCode,
  normalizePublisherCategory,
} from "./awinPublisherPolicy.ts";
import sql from "../../migrations/20260813000001_awin_commission_policy.sql" with {
  type: "text",
};

Deno.test("accepts dynamic uppercase AWIN group codes", () => {
  assertEquals(normalizeCommissionGroupCode("DEFAULT"), "DEFAULT");
  assertEquals(
    normalizeCommissionGroupCode("KIT_RITUAL_2027"),
    "KIT_RITUAL_2027",
  );
  assertThrows(() => normalizeCommissionGroupCode("premium"), TypeError);
  assertThrows(() => normalizeCommissionGroupCode("BAD-CODE"), TypeError);
});

Deno.test("protects all three verified Skimlinks publisher IDs", () => {
  for (const publisherId of [78888, 181013, 2573975]) {
    assertEquals(classifyPublisher({ publisherId, publisherName: "renamed" }), {
      category: "subnetwork",
      retainProtected: true,
      commercialTier: "externally_managed",
      rateSource: "skimlinks_managed",
    });
  }
});

Deno.test("category never grants a premium commercial tier", () => {
  assertEquals(
    classifyPublisher({
      publisherId: 900001,
      publisherName: "Editorial Example",
      primaryType: "Editorial Content",
    }),
    {
      category: "editorial",
      retainProtected: false,
      commercialTier: "standard",
      rateSource: "awin_assignment",
    },
  );
  assertEquals(normalizePublisherCategory("Influencers"), "creator");
});

Deno.test("infers percentage and fixed commission from rate-set/group values", () => {
  assertEquals(
    inferNominalCommissionPence({
      commissionablePence: 7083,
      commissionType: "percentage",
      rateBps: 1000,
    }),
    708,
  );
  assertEquals(
    inferNominalCommissionPence({
      commissionablePence: 7083,
      commissionType: "fixed",
      fixedAmountPence: 1500,
    }),
    1500,
  );
  assertEquals(
    inferNominalCommissionPence({
      commissionablePence: 7083,
      commissionType: null,
    }),
    null,
  );
});

Deno.test("migration creates and secures the normalized AWIN policy tables", () => {
  for (
    const table of [
      "awin_commission_groups",
      "awin_commission_rate_sets",
      "awin_commission_rate_values",
      "awin_publishers",
      "awin_publisher_rate_assignments",
    ]
  ) {
    assertEquals(sql.includes(`create table public.${table}`), true);
  }
  assertEquals(
    sql.includes("check (code ~ '^[A-Z0-9_]{1,50}$')"),
    true,
  );
  assertEquals(
    sql.includes(
      "revoke all on table public.awin_publishers from public, anon, authenticated",
    ),
    true,
  );
  assertEquals(
    sql.includes(
      "grant select, insert, update, delete on table public.awin_publishers to service_role",
    ),
    true,
  );
});
