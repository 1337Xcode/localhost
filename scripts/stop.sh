#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TOR_DATA_DIR="$PROJECT_ROOT/tor_data"
NGINX_DATA_DIR="$PROJECT_ROOT/nginx_data"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Localhost Services...${NC}"

# Stop Monitor
pkill -f "monitor.sh" || true

# Stop Nginx
if [ -f "$NGINX_DATA_DIR/nginx.pid" ]; then
    kill $(cat "$NGINX_DATA_DIR/nginx.pid") 2>/dev/null || true
fi
pkill -x nginx || true

# Stop Tor
pkill -x tor || true

echo -e "${GREEN}Services Stopped.${NC}"
