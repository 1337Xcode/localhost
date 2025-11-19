# Localhost

A production-grade, decentralized portfolio hosting system using Tor hidden service and Kademlia DHT-based P2P CDN.

## Features
- **Dynamic Configuration:** Automatically detects installation path.
- **Tor Hidden Service (v3):** Anonymous, secure hosting.
- **Kademlia DHT:** Distributed peer discovery.
- **P2P CDN:** WebRTC-based asset delivery.
- **Resource Optimized:** <150MB RAM, battery-aware.

## Prerequisites
- Android Device with Termux.
- Packages: `tor`, `nginx`, `nodejs-lts`.

## Installation

1.  **Copy Project:**
    Place the project folder anywhere in Termux (e.g., `~/localhost`).

2.  **Install Dependencies:**
    ```bash
    chmod +x scripts/*.sh
    ./scripts/install-deps.sh
    ```

## Usage

### Start
```bash
./scripts/start.sh
```
This will:
- Generate `nginx.conf` with correct paths.
- Start Tor and Nginx.
- Display your `.onion` address.

### Stop
```bash
./scripts/stop.sh
```

### Status
```bash
./scripts/status.sh
```

## Directory Structure
- `config/`: Config templates.
- `www/`: Static website (place your site build here).
- `scripts/`: Management scripts.
