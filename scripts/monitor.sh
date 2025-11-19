#!/bin/bash

# Accept config paths as arguments
TOR_CONFIG="$1"
NGINX_CONFIG="$2"

# Fallback if not provided (should not happen if started via start.sh)
if [ -z "$TOR_CONFIG" ] || [ -z "$NGINX_CONFIG" ]; then
    # Try to guess based on script location
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    TOR_CONFIG="$PROJECT_ROOT/config/torrc"
    NGINX_CONFIG="$PROJECT_ROOT/config/nginx.conf"
fi

while true; do
    # 1. Check Tor
    if ! pgrep -x "tor" > /dev/null; then
        tor -f "$TOR_CONFIG" > /dev/null 2>&1 &
    fi

    # 2. Check Nginx
    if ! pgrep -x "nginx" > /dev/null; then
        nginx -c "$NGINX_CONFIG"
    fi

    # 3. Check Battery
    # Only if termux-battery-status is available
    if command -v termux-battery-status &> /dev/null; then
        BATTERY_INFO=$(termux-battery-status)
        BATTERY_LEVEL=$(echo "$BATTERY_INFO" | grep percentage | cut -d: -f2 | tr -d ' ,')
        
        if [ ! -z "$BATTERY_LEVEL" ] && [ "$BATTERY_LEVEL" -lt 15 ]; then
            touch /tmp/dht-suspend
        else
            rm -f /tmp/dht-suspend
        fi
    fi

    sleep 60
done
