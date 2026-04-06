#!/bin/bash
# One-time setup for SOLUM nightly e2e test infrastructure
# Run this once from your local machine: bash infra/e2e-setup.sh
# Requires AWS CLI configured for account 798470762256, region eu-west-2

set -euo pipefail

REGION="eu-west-2"
ACCOUNT_ID="798470762256"
BUCKET_NAME="solum-test-reports"
SNS_TOPIC_NAME="solum-e2e-alerts"
CODEBUILD_PROJECT="solum-e2e"
GITHUB_REPO="https://github.com/hdandi08/solum"

echo "=== SOLUM E2E Infrastructure Setup ==="
echo ""

# ── 1. SSM Parameters ──────────────────────────────────────────────────────
echo "→ Creating SSM parameters..."

aws ssm put-parameter \
  --name "/solum/test/user-email" \
  --value "harsha@bysolum.com" \
  --type "String" \
  --region $REGION \
  --overwrite

aws ssm put-parameter \
  --name "/solum/test/dev-base-url" \
  --value "https://dev.d3pa095gzazg3c.amplifyapp.com" \
  --type "String" \
  --region $REGION \
  --overwrite

aws ssm put-parameter \
  --name "/solum/test/supabase-url" \
  --value "https://rodvvmfzkyjsqbufkjbc.supabase.co" \
  --type "String" \
  --region $REGION \
  --overwrite

# Prompt for secrets — never hardcode
read -rsp "Enter SolumDB-DEV service role key: " DEV_SERVICE_KEY
echo ""
aws ssm put-parameter \
  --name "/solum/test/supabase-service-role-key" \
  --value "$DEV_SERVICE_KEY" \
  --type "SecureString" \
  --region $REGION \
  --overwrite

echo "✓ SSM parameters stored"

# ── 2. S3 bucket for reports ───────────────────────────────────────────────
echo "→ Creating S3 bucket..."

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION 2>/dev/null || true

# 30-day lifecycle
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-old-reports",
      "Status": "Enabled",
      "Expiration": { "Days": 30 },
      "Filter": { "Prefix": "reports/" }
    }]
  }'

echo "✓ S3 bucket: $BUCKET_NAME"

# ── 3. SNS topic ────────────────────────────────────────────────────────────
echo "→ Creating SNS topic..."

SNS_TOPIC_ARN=$(aws sns create-topic \
  --name $SNS_TOPIC_NAME \
  --region $REGION \
  --query TopicArn --output text)

aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint "harsha@bysolum.com" \
  --region $REGION > /dev/null

echo "✓ SNS topic: $SNS_TOPIC_ARN"
echo "  ⚠ Check harsha@bysolum.com to confirm the SNS subscription"

# ── 4. IAM role for CodeBuild ───────────────────────────────────────────────
echo "→ Creating IAM role..."

aws iam create-role \
  --role-name solum-codebuild-e2e \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "codebuild.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || true

aws iam put-role-policy \
  --role-name solum-codebuild-e2e \
  --policy-name solum-e2e-policy \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"ssm:GetParameter\",\"ssm:GetParameters\"],
        \"Resource\": \"arn:aws:ssm:$REGION:$ACCOUNT_ID:parameter/solum/test/*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"s3:PutObject\",\"s3:DeleteObject\",\"s3:ListBucket\"],
        \"Resource\": [
          \"arn:aws:s3:::$BUCKET_NAME\",
          \"arn:aws:s3:::$BUCKET_NAME/*\"
        ]
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": \"sns:Publish\",
        \"Resource\": \"$SNS_TOPIC_ARN\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],
        \"Resource\": \"arn:aws:logs:$REGION:$ACCOUNT_ID:log-group:/aws/codebuild/$CODEBUILD_PROJECT:*\"
      }
    ]
  }"

echo "✓ IAM role: solum-codebuild-e2e"

# ── 5. CodeBuild project ────────────────────────────────────────────────────
echo "→ Creating CodeBuild project..."

aws codebuild create-project \
  --name $CODEBUILD_PROJECT \
  --region $REGION \
  --source "{
    \"type\": \"GITHUB\",
    \"location\": \"$GITHUB_REPO\",
    \"buildspec\": \"buildspec.yml\"
  }" \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --environment "{
    \"type\": \"LINUX_CONTAINER\",
    \"image\": \"aws/codebuild/standard:7.0\",
    \"computeType\": \"BUILD_GENERAL1_SMALL\",
    \"environmentVariables\": [
      {\"name\": \"REPORT_BUCKET\", \"value\": \"$BUCKET_NAME\"},
      {\"name\": \"SNS_TOPIC_ARN\",  \"value\": \"$SNS_TOPIC_ARN\"}
    ]
  }" \
  --service-role "arn:aws:iam::$ACCOUNT_ID:role/solum-codebuild-e2e" 2>/dev/null || \
aws codebuild update-project \
  --name $CODEBUILD_PROJECT \
  --region $REGION \
  --environment "{
    \"type\": \"LINUX_CONTAINER\",
    \"image\": \"aws/codebuild/standard:7.0\",
    \"computeType\": \"BUILD_GENERAL1_SMALL\",
    \"environmentVariables\": [
      {\"name\": \"REPORT_BUCKET\", \"value\": \"$BUCKET_NAME\"},
      {\"name\": \"SNS_TOPIC_ARN\",  \"value\": \"$SNS_TOPIC_ARN\"}
    ]
  }"

echo "✓ CodeBuild project: $CODEBUILD_PROJECT"

# ── 6. EventBridge Scheduler (10pm nightly) ────────────────────────────────
echo "→ Creating EventBridge Scheduler..."

# Scheduler needs its own role to trigger CodeBuild
aws iam create-role \
  --role-name solum-scheduler-e2e \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "scheduler.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || true

aws iam put-role-policy \
  --role-name solum-scheduler-e2e \
  --policy-name trigger-codebuild \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": \"codebuild:StartBuild\",
      \"Resource\": \"arn:aws:codebuild:$REGION:$ACCOUNT_ID:project/$CODEBUILD_PROJECT\"
    }]
  }"

aws scheduler create-schedule \
  --name solum-e2e-nightly \
  --region $REGION \
  --schedule-expression "cron(0 22 * * ? *)" \
  --schedule-expression-timezone "Europe/London" \
  --target "{
    \"Arn\": \"arn:aws:codebuild:$REGION:$ACCOUNT_ID:project/$CODEBUILD_PROJECT\",
    \"RoleArn\": \"arn:aws:iam::$ACCOUNT_ID:role/solum-scheduler-e2e\",
    \"Input\": \"{}\"
  }" \
  --flexible-time-window '{"Mode": "OFF"}' 2>/dev/null || echo "  (scheduler already exists)"

echo "✓ EventBridge Scheduler: 10pm nightly (Europe/London)"
echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Confirm SNS subscription email at harsha@bysolum.com"
echo "  2. Connect GitHub to CodeBuild in the console (one-time OAuth):"
echo "     https://$REGION.console.aws.amazon.com/codesuite/codebuild/projects/$CODEBUILD_PROJECT/edit"
echo "  3. Run a manual test: aws codebuild start-build --project-name $CODEBUILD_PROJECT --region $REGION"
