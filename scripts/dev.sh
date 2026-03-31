#!/bin/bash
# Development utility script for TaskPilot AI

set -e

function help() {
  echo "TaskPilot AI Development Utilities"
  echo ""
  echo "Usage: ./scripts/dev.sh [command]"
  echo ""
  echo "Commands:"
  echo "  setup     - Initial setup (install deps, build)"
  echo "  build     - Build TypeScript"
  echo "  clean     - Clean build artifacts and database"
  echo "  reset-db  - Delete database (fresh start)"
  echo "  dev       - Run in development mode"
  echo "  start     - Run production build"
  echo "  format    - Format code with Prettier"
  echo "  check     - Type check without build"
  echo "  help      - Show this help"
}

function setup() {
  echo "→ Installing dependencies..."
  npm install
  echo "→ Building project..."
  npm run build
  echo "✓ Setup complete!"
}

function build() {
  echo "→ Building TypeScript..."
  npm run build
  echo "✓ Build complete!"
}

function clean() {
  echo "→ Cleaning build artifacts..."
  rm -rf dist
  echo "→ Cleaning database..."
  rm -f artifacts/*.db artifacts/*.db-shm artifacts/*.db-wal
  echo "✓ Clean complete!"
}

function reset_db() {
  echo "→ Resetting database..."
  rm -f artifacts/*.db artifacts/*.db-shm artifacts/*.db-wal
  echo "✓ Database reset complete!"
}

function dev() {
  echo "→ Running in development mode..."
  npm run dev
}

function start() {
  echo "→ Running production build..."
  npm start
}

function format() {
  echo "→ Formatting code..."
  npm run format
  echo "✓ Format complete!"
}

function check() {
  echo "→ Type checking..."
  npm run check
  echo "✓ Type check passed!"
}

case "$1" in
  setup)
    setup
    ;;
  build)
    build
    ;;
  clean)
    clean
    ;;
  reset-db)
    reset_db
    ;;
  dev)
    dev
    ;;
  start)
    start
    ;;
  format)
    format
    ;;
  check)
    check
    ;;
  help|*)
    help
    ;;
esac
