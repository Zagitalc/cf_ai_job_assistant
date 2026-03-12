#!/usr/bin/env bash

set -euo pipefail

API_PORT=8787
FRONTEND_PORT=3000
API_PID=""

check_port_free() {
  local port="$1"
  if lsof -iTCP:"${port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port ${port} is already in use:"
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN
    return 1
  fi
}

wait_for_backend() {
  local retries=30
  local attempt=1
  while [ "${attempt}" -le "${retries}" ]; do
    if lsof -iTCP:"${API_PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  return 1
}

cleanup() {
  if [ -n "${API_PID}" ] && kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

check_port_free "${API_PORT}"
check_port_free "${FRONTEND_PORT}"

echo "Starting remote Worker API on port ${API_PORT}..."
npm --prefix worker run dev:remote &
API_PID=$!

echo "Waiting for remote Worker API to accept connections..."
if ! wait_for_backend; then
  echo "Remote Worker API did not start on port ${API_PORT} within 30 seconds."
  exit 1
fi

echo "Starting frontend on port ${FRONTEND_PORT}..."
export REACT_APP_AI_REVIEW_ENABLED=true
export REACT_APP_PDF_EXPORT_ENABLED=true
npm --prefix client start
