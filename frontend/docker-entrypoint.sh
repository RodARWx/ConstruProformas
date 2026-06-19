#!/bin/sh
set -e

# Regenera env-config.js con variables del servicio (Railway/Docker) sin rebuild
node /app/scripts/write-env-config.mjs /app/dist

exec serve -s dist -l "tcp://0.0.0.0:${PORT:-3000}"
