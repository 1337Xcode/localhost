#!/bin/bash

TOR_CONFIG="$1"
NGINX_CONFIG="$2"

if [ -z "$TOR_CONFIG" ] || [ -z "$NGINX_CONFIG" ]; then
    echo "Usage: $0 <tor_config> <nginx_config>"
    exit 1
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

    sleep 60
done
