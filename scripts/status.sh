#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

HOSTNAME_FILE="/data/data/com.termux/files/home/.tor/service/hostname"

echo -e "${GREEN}=== System Status ===${NC}"

# 1. Service Status
if pgrep -x "tor" > /dev/null; then
    echo -e "Tor:    ${GREEN}RUNNING${NC} (PID: $(pgrep -x tor))"
else
    echo -e "Tor:    ${RED}STOPPED${NC}"
fi

if pgrep -x "nginx" > /dev/null; then
    echo -e "Nginx:  ${GREEN}RUNNING${NC} (PID: $(pgrep -x nginx))"
else
    echo -e "Nginx:  ${RED}STOPPED${NC}"
fi

# 2. Onion Address
if [ -f "$HOSTNAME_FILE" ]; then
    echo -e "Onion:  ${GREEN}$(cat $HOSTNAME_FILE)${NC}"
else
    echo -e "Onion:  ${YELLOW}Not generated${NC}"
fi

# 3. Battery
BATTERY_INFO=$(termux-battery-status)
LEVEL=$(echo "$BATTERY_INFO" | grep percentage | cut -d: -f2 | tr -d ' ,')
STATUS=$(echo "$BATTERY_INFO" | grep status | cut -d: -f2 | tr -d ' ",')
echo -e "Battery: ${LEVEL}% ($STATUS)"

# 4. Memory Usage
echo -e "\n${YELLOW}Memory Usage:${NC}"
ps -o pid,rss,comm | grep -E "tor|nginx"
