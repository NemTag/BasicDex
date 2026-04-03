#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Pokédex — Build & Deploy Script
# ─────────────────────────────────────────────
# Usage:
#   ./deploy.sh              Build only (output to dist/)
#   ./deploy.sh --target gh  Deploy to GitHub Pages
#   ./deploy.sh --target s3  Deploy to AWS S3
#   ./deploy.sh --fresh      Re-download CSVs before building
# ─────────────────────────────────────────────

TARGET=""
FRESH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
      ;;
    --fresh)
      FRESH=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./deploy.sh [--target gh|s3] [--fresh]"
      exit 1
      ;;
  esac
done

# ─── Preflight checks ───

echo "══════════════════════════════════════"
echo "  Pokédex Deploy"
echo "══════════════════════════════════════"
echo ""

command -v node >/dev/null 2>&1 || { echo "✗ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "✗ npm is required but not installed."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "✗ Node.js 18+ required. Found: $(node -v)"
  exit 1
fi

echo "✓ Node $(node -v) detected"
echo ""

# ─── Install dependencies ───

echo "→ Installing dependencies..."
npm ci --silent
echo "✓ Dependencies installed"
echo ""

# ─── Build local database ───

CSV_DIR="data/csv"
JSON_DIR="data/json"

if [ "$FRESH" = true ] || [ ! -d "$CSV_DIR" ] || [ -z "$(ls -A "$CSV_DIR" 2>/dev/null)" ]; then
  echo "→ Downloading CSV files from PokeAPI..."
  node data/download.js
  echo ""
fi

if [ "$FRESH" = true ] || [ ! -d "$JSON_DIR" ] || [ -z "$(ls -A "$JSON_DIR" 2>/dev/null)" ]; then
  echo "→ Building JSON from CSV data..."
  node data/build.js
  echo ""
fi

echo "✓ Local database ready"
echo ""

# ─── Build Vue app ───

echo "→ Building production bundle..."
npm run build
echo "✓ Build complete → dist/"
echo ""

# ─── Deploy ───

case "$TARGET" in

  gh)
    # GitHub Pages
    echo "→ Deploying to GitHub Pages..."

    command -v git >/dev/null 2>&1 || { echo "✗ git is required for GitHub Pages deploy."; exit 1; }

    cd dist

    git init
    git checkout -b gh-pages
    git add -A
    git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"

    REMOTE=$(cd .. && git remote get-url origin 2>/dev/null || echo "")

    if [ -z "$REMOTE" ]; then
      echo "✗ No git remote found. Push manually:"
      echo "  cd dist && git remote add origin <repo-url> && git push -f origin gh-pages"
      exit 1
    fi

    git push -f "$REMOTE" gh-pages

    cd ..
    echo "✓ Deployed to GitHub Pages"
    echo "  Make sure GitHub Pages is set to serve from the gh-pages branch."
    ;;

  s3)
    # AWS S3
    echo "→ Deploying to AWS S3..."

    command -v aws >/dev/null 2>&1 || { echo "✗ AWS CLI is required for S3 deploy."; exit 1; }

    if [ -z "${S3_BUCKET:-}" ]; then
      echo "✗ S3_BUCKET environment variable is not set."
      echo "  Usage: S3_BUCKET=my-bucket ./deploy.sh --target s3"
      exit 1
    fi

    aws s3 sync dist/ "s3://${S3_BUCKET}" \
      --delete \
      --cache-control "public, max-age=31536000, immutable" \
      --exclude "index.html"

    aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
      --cache-control "public, max-age=0, must-revalidate"

    echo "✓ Deployed to s3://${S3_BUCKET}"

    if [ -n "${CF_DISTRIBUTION_ID:-}" ]; then
      echo "→ Invalidating CloudFront cache..."
      aws cloudfront create-invalidation \
        --distribution-id "$CF_DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text
      echo "✓ CloudFront invalidation created"
    fi
    ;;

  "")
    echo "══════════════════════════════════════"
    echo "  Build complete. No deploy target set."
    echo ""
    echo "  Preview locally:"
    echo "    npx vite preview"
    echo ""
    echo "  Deploy options:"
    echo "    ./deploy.sh --target gh    GitHub Pages"
    echo "    ./deploy.sh --target s3    AWS S3"
    echo "══════════════════════════════════════"
    ;;

  *)
    echo "✗ Unknown target: $TARGET"
    echo "  Supported targets: gh, s3"
    exit 1
    ;;

esac