#!/bin/sh
set -eu
cd /workspace
if [ -z "${TYPESAFE_API_KEY:-}" ] && [ -f /workspace/.secrets/typesafe.key ]; then
  TYPESAFE_API_KEY=$(tr -d '\n' < /workspace/.secrets/typesafe.key)
  export TYPESAFE_API_KEY
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
