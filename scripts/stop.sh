#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Localhost services...${NC}"

# 1. Stop Monitor
pkill -f "monitor.sh" || true

# 2. Stop Nginx
if pgrep -x "nginx" > /dev/null; then
    echo "Stopping Nginx..."
    kill -TERM $(pgrep -x nginx)
    # Wait for it to die
    sleep 1
    if pgrep -x "nginx" > /dev/null; then
        kill -9 $(pgrep -x nginx)
    fi
fi

# 3. Stop Tor
if pgrep -x "tor" > /dev/null; then
    echo "Stopping Tor..."
    kill -TERM $(pgrep -x tor)
fi

# 4. Release Wake Lock
echo "Releasing wake lock..."
termux-wake-unlock

# 5. Cleanup
rm -f /tmp/dht-suspend

echo -e "${GREEN}Services stopped.${NC}"
