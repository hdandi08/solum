include .env.supabase

# ─── DATABASE MIGRATIONS ───────────────────────────────────────────────────────

db-push-prod:
	@echo "→ Pushing migrations to PROD ($(PROD_PROJECT_REF))"
	supabase db push --project-ref $(PROD_PROJECT_REF)

db-push-dev:
	@[ -n "$(DEV_PROJECT_REF)" ] || (echo "Error: DEV_PROJECT_REF not set in .env.supabase" && exit 1)
	@echo "→ Linking to DEV ($(DEV_PROJECT_REF))"
	supabase link --project-ref $(DEV_PROJECT_REF)
	@echo "→ Pushing migrations to DEV"
	supabase db push --yes
	@echo "→ Re-linking to PROD ($(PROD_PROJECT_REF))"
	supabase link --project-ref $(PROD_PROJECT_REF)

# ─── EDGE FUNCTIONS ────────────────────────────────────────────────────────────

FUNCTIONS = \
	cancel-subscription \
	check-customer \
	create-checkout-session \
	get-account \
	get-inventory-status \
	join-waitlist \
	stripe-webhook \
	update-address \
	update-customer

ADMIN_FUNCTIONS = \
	admin-adjust-stock \
	admin-confirm-delivery \
	admin-dashboard \
	admin-supplier-order

functions-deploy-prod:
	@echo "→ Deploying functions to PROD ($(PROD_PROJECT_REF))"
	@for fn in $(FUNCTIONS) $(ADMIN_FUNCTIONS); do \
		echo "  deploying $$fn..."; \
		supabase functions deploy $$fn --project-ref $(PROD_PROJECT_REF) --no-verify-jwt; \
	done
	@echo "✓ All functions deployed to prod"

functions-deploy-dev:
	@[ -n "$(DEV_PROJECT_REF)" ] || (echo "Error: DEV_PROJECT_REF not set in .env.supabase" && exit 1)
	@echo "→ Deploying functions to DEV ($(DEV_PROJECT_REF))"
	@for fn in $(FUNCTIONS) $(ADMIN_FUNCTIONS); do \
		echo "  deploying $$fn..."; \
		supabase functions deploy $$fn --project-ref $(DEV_PROJECT_REF) --no-verify-jwt; \
	done
	@echo "✓ All functions deployed to dev"

# ─── FULL DEPLOY (migrations + functions) ──────────────────────────────────────

deploy-prod: db-push-prod functions-deploy-prod
	@echo "✓ Full prod deploy complete"

deploy-dev: db-push-dev functions-deploy-dev
	@echo "✓ Full dev deploy complete"

# ─── SECRETS ───────────────────────────────────────────────────────────────────
# Usage: make secrets-list-prod / make secrets-list-dev
# Set secrets via: supabase secrets set KEY=value --project-ref <ref>

secrets-list-prod:
	supabase secrets list --project-ref $(PROD_PROJECT_REF)

secrets-list-dev:
	@[ -n "$(DEV_PROJECT_REF)" ] || (echo "Error: DEV_PROJECT_REF not set in .env.supabase" && exit 1)
	supabase secrets list --project-ref $(DEV_PROJECT_REF)

.PHONY: db-push-prod db-push-dev functions-deploy-prod functions-deploy-dev deploy-prod deploy-dev secrets-list-prod secrets-list-dev
