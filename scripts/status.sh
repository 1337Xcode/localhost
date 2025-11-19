#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOSTNAME_FILE="$PROJECT_ROOT/tor_data/service/hostname"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "=== Localhost Status ==="

# Check Tor
if pgrep -x "tor" > /dev/null; then
    echo -e "Tor:    ${GREEN}Running${NC}"
else
    echo -e "Tor:    ${RED}Stopped${NC}"
fi

# Check Nginx
if pgrep -x "nginx" > /dev/null; then
    echo -e "Nginx:  ${GREEN}Running${NC}"
else
    echo -e "Nginx:  ${RED}Stopped${NC}"
fi

# Show Onion Address
if [ -f "$HOSTNAME_FILE" ]; then
    ONION_ADDR=$(cat "$HOSTNAME_FILE")
    echo -e "Onion:  ${GREEN}${ONION_ADDR}${NC}"
else
    echo -e "Onion:  ${RED}Not Available${NC}"
fi
