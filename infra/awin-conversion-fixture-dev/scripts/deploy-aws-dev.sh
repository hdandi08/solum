#!/usr/bin/env bash
set -euo pipefail

EXPECTED_ACCOUNT='798470762256'
EXPECTED_REGION='eu-west-2'
STACK_NAME='solum-awin-conversion-fixture-dev'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

guard_aws_dev() {
  local account
  account="$(aws sts get-caller-identity --query Account --output text --region "$EXPECTED_REGION")"
  [[ "$account" == "$EXPECTED_ACCOUNT" ]] || { echo 'BLOCKED: unexpected AWS account' >&2; exit 1; }
  [[ "$EXPECTED_REGION" == 'eu-west-2' ]] || { echo 'BLOCKED: unexpected AWS region' >&2; exit 1; }
  [[ "$STACK_NAME" == *-dev ]] || { echo 'BLOCKED: stack is not development-only' >&2; exit 1; }
}

cd "$FIXTURE_DIR"
sam validate --template-file template.yaml --region "$EXPECTED_REGION"
sam build --template-file template.yaml
guard_aws_dev
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$EXPECTED_REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset
