#!/usr/bin/env bash
# Run Ditto with full verbose logging, saved to logs/
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p logs

LOGFILE="logs/ditto-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to $LOGFILE"

LOG_LEVEL="${LOG_LEVEL:-verbose}" pnpm start:dev 2>&1 | tee "$LOGFILE"
