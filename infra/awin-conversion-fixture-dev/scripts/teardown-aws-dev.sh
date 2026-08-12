#!/usr/bin/env bash
set -euo pipefail

EXPECTED_ACCOUNT='798470762256'
EXPECTED_REGION='eu-west-2'
STACK_NAME='solum-awin-conversion-fixture-dev'

account="$(aws sts get-caller-identity --query Account --output text --region "$EXPECTED_REGION")"
[[ "$account" == "$EXPECTED_ACCOUNT" ]] || { echo 'BLOCKED: unexpected AWS account' >&2; exit 1; }
[[ "$EXPECTED_REGION" == 'eu-west-2' ]] || { echo 'BLOCKED: unexpected AWS region' >&2; exit 1; }
[[ "$STACK_NAME" == *-dev ]] || { echo 'BLOCKED: stack is not development-only' >&2; exit 1; }

aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$EXPECTED_REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$EXPECTED_REGION"
