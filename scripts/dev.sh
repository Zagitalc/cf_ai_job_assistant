#!/usr/bin/env bash

set -euo pipefail

BACKEND_PORT=4000
FRONTEND_PORT=3000
BACKEND_PID=""

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
    if lsof -iTCP:"${BACKEND_PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  return 1
}

cleanup() {
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

check_port_free "${BACKEND_PORT}"
check_port_free "${FRONTEND_PORT}"

echo "Starting backend on port ${BACKEND_PORT}..."
npm --prefix server start &
BACKEND_PID=$!

echo "Waiting for backend to accept connections..."
if ! wait_for_backend; then
  echo "Backend did not start on port ${BACKEND_PORT} within 30 seconds."
  exit 1
fi

echo "Starting frontend on port ${FRONTEND_PORT}..."
npm --prefix client start
