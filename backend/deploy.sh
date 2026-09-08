#!/bin/bash
# ─── Script de déploiement SMS Marketing API ────────────────────
# Usage:
#   ./deploy.sh              → déploie en production
#   ./deploy.sh staging      → déploie en staging
#   ./deploy.sh guided       → premier déploiement (interactif)

set -e

ENV="${1:-production}"
STACK_NAME="sms-marketing-api"

echo "╔══════════════════════════════════════════════╗"
echo "║  SMS Marketing API — Déploiement Lambda     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Environnement : $ENV"
echo "  Région        : eu-west-2"
echo ""

# Vérifier que SAM CLI est installé
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI n'est pas installé."
    echo "   → brew install aws-sam-cli"
    exit 1
fi

# Vérifier les credentials AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Credentials AWS non configurées."
    echo "   → aws configure"
    exit 1
fi

echo "🔍 Validation du template..."
sam validate --lint

echo ""
echo "🔨 Build..."
sam build

echo ""
if [ "$ENV" = "guided" ]; then
    echo "🚀 Déploiement guidé (premier déploiement)..."
    sam deploy --guided
elif [ "$ENV" = "staging" ]; then
    echo "🚀 Déploiement en STAGING..."
    sam deploy --config-env staging
else
    echo "🚀 Déploiement en PRODUCTION..."
    sam deploy
fi

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "📋 Outputs :"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs" \
    --output table \
    --region eu-west-2 2>/dev/null || echo "   (utiliser 'aws cloudformation describe-stacks' pour voir les outputs)"
