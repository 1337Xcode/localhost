#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Hidden Portfolio Setup ===${NC}"

# 1. Check Termux Environment
if [ -z "$TERMUX_VERSION" ]; then
    echo -e "${YELLOW}Warning: Not running in Termux environment.${NC}"
    echo "This script is optimized for Android/Termux."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. Install Dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pkg update -y
pkg install -y tor nginx nodejs-lts

# 3. Create Directory Structure
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p ~/hidden-portfolio/config
mkdir -p ~/hidden-portfolio/www
mkdir -p ~/hidden-portfolio/scripts
mkdir -p ~/hidden-portfolio/.dht
mkdir -p ~/hidden-portfolio/logs

# 4. Generate Placeholder Index if empty
if [ ! -f ~/hidden-portfolio/www/index.html ]; then
    echo "<html><body><h1>Hidden Portfolio Loading...</h1></body></html>" > ~/hidden-portfolio/www/index.html
fi

# 5. Set Permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chmod +x ~/hidden-portfolio/scripts/*.sh

# 6. Post-Install Instructions
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "To start the system, run:"
echo "  ~/hidden-portfolio/scripts/start.sh"
