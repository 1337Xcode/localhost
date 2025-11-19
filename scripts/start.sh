#!/bin/bash
set -e

# 1. Dynamic Path Detection
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/config"
WWW_DIR="$PROJECT_ROOT/www"

# Local Data Directories (Self-Contained)
TOR_DATA_DIR="$PROJECT_ROOT/tor_data"
NGINX_DATA_DIR="$PROJECT_ROOT/nginx_data"
HIDDEN_SERVICE_DIR="$TOR_DATA_DIR/service"
HOSTNAME_FILE="$HIDDEN_SERVICE_DIR/hostname"

# Config Files (Generated/Used)
NGINX_CONFIG="$CONFIG_DIR/nginx.conf"
TOR_CONFIG="$CONFIG_DIR/torrc"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Starting Localhost Portfolio ===${NC}"
echo -e "Project Root: ${YELLOW}$PROJECT_ROOT${NC}"

# 2. Prepare Directories
mkdir -p "$TOR_DATA_DIR"
mkdir -p "$NGINX_DATA_DIR"
mkdir -p "$HIDDEN_SERVICE_DIR"
chmod 700 "$TOR_DATA_DIR"
chmod 700 "$HIDDEN_SERVICE_DIR"

# 3. Handle MIME Types
MIME_TYPES="$CONFIG_DIR/mime.types"
if [ ! -f "$MIME_TYPES" ]; then
    echo -e "${YELLOW}Generating mime.types...${NC}"
    cat > "$MIME_TYPES" <<EOF
types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    image/gif                             gif;
    image/jpeg                            jpeg jpg;
    application/javascript                js;
    application/atom+xml                  atom;
    application/rss+xml                   rss;
    text/mathml                           mml;
    text/plain                            txt;
    text/vnd.sun.j2me.app-descriptor      jad;
    text/vnd.wap.wml                      wml;
    text/x-component                      htc;
    image/png                             png;
    image/svg+xml                         svg svgz;
    image/tiff                            tif tiff;
    image/vnd.wap.wbmp                    wbmp;
    image/webp                            webp;
    image/x-icon                          ico;
    image/x-jng                           jng;
    image/x-ms-bmp                        bmp;
    application/font-woff                 woff;
    application/java-archive              jar war ear;
    application/json                      json;
    application/mac-binhex40              hqx;
    application/msword                    doc;
    application/pdf                       pdf;
    application/postscript                ps eps ai;
    application/rtf                       rtf;
    application/vnd.apple.mpegurl         m3u8;
    application/vnd.google-earth.kml+xml  kml;
    application/vnd.google-earth.kmz      kmz;
    application/vnd.ms-excel              xls;
    application/vnd.ms-fontobject         eot;
    application/vnd.ms-powerpoint         ppt;
    application/vnd.oasis.opendocument.graphics odg;
    application/vnd.oasis.opendocument.presentation odp;
    application/vnd.oasis.opendocument.spreadsheet ods;
    application/vnd.oasis.opendocument.text odt;
    application/vnd.openxmlformats-officedocument.presentationml.presentation pptx;
    application/vnd.openxmlformats-officedocument.spreadsheetml.sheet xlsx;
    application/vnd.openxmlformats-officedocument.wordprocessingml.document docx;
    application/vnd.wap.wmlc              wmlc;
    application/x-7z-compressed           7z;
    application/x-cocoa                   cco;
    application/x-java-archive-diff       jardiff;
    application/x-java-jnlp-file          jnlp;
    application/x-makeself                run;
    application/x-perl                    pl pm;
    application/x-pilot                   prc pdb;
    application/x-rar-compressed          rar;
    application/x-redhat-package-manager  rpm;
    application/x-sea                     sea;
    application/x-shockwave-flash         swf;
    application/x-stuffit                 sit;
    application/x-tcl                     tcl tk;
    application/x-x509-ca-cert            der pem crt;
    application/x-xpinstall               xpi;
    application/xhtml+xml                 xhtml;
    application/xspf+xml                  xspf;
    application/zip                       zip;
    application/octet-stream              bin exe dll;
    application/octet-stream              deb;
    application/octet-stream              dmg;
    application/octet-stream              iso img;
    application/octet-stream              msi msp msm;
    audio/midi                            mid midi kar;
    audio/mpeg                            mp3;
    audio/ogg                             ogg;
    audio/x-m4a                           m4a;
    audio/x-realaudio                     ra;
    video/3gpp                            3gpp 3gp;
    video/mp2t                            ts;
    video/mp4                             mp4;
    video/mpeg                            mpeg mpg;
    video/quicktime                       mov;
    video/webm                            webm;
    video/x-flv                           flv;
    video/x-m4v                           m4v;
    video/x-mng                           mng;
    video/x-ms-asf                        asx asf;
    video/x-ms-wmv                        wmv;
    video/x-msvideo                       avi;
}
EOF
fi

# 4. Generate Tor Config
echo -e "${YELLOW}Configuring Tor...${NC}"
cat > "$TOR_CONFIG" <<EOF
# Auto-generated Tor Config
DataDirectory $TOR_DATA_DIR
HiddenServiceDir $HIDDEN_SERVICE_DIR
HiddenServicePort 80 127.0.0.1:8080
HiddenServiceVersion 3

# Performance & Resource Tuning
HiddenServiceNumIntroductionPoints 3
NumEntryGuards 4
CircuitBuildTimeout 30
HiddenServiceMaxStreams 10

# Security
SafeLogging 1
ExitPolicy reject *:*
AvoidDiskWrites 1

# Logging
Log notice stdout
EOF

# 5. Generate Nginx Config
echo -e "${YELLOW}Configuring Nginx...${NC}"
cat > "$NGINX_CONFIG" <<EOF
# Auto-generated Nginx Config
worker_processes 1;
pid $NGINX_DATA_DIR/nginx.pid;
error_log $NGINX_DATA_DIR/error.log warn;

events {
    worker_connections 128;
}

http {
    include $MIME_TYPES;
    default_type application/octet-stream;
    
    # Temp Paths (Self-contained)
    client_body_temp_path $NGINX_DATA_DIR/client_body_temp;
    proxy_temp_path       $NGINX_DATA_DIR/proxy_temp;
    fastcgi_temp_path     $NGINX_DATA_DIR/fastcgi_temp;
    uwsgi_temp_path       $NGINX_DATA_DIR/uwsgi_temp;
    scgi_temp_path        $NGINX_DATA_DIR/scgi_temp;

    sendfile on;
    keepalive_timeout 65;
    gzip on;
    
    access_log off;

    server {
        listen 127.0.0.1:8080;
        root $WWW_DIR;
        index index.html;
        
        location / {
            try_files \$uri \$uri/ =404;
        }
    }
}
EOF

# 6. Start Tor
if pgrep -x "tor" > /dev/null; then
    echo -e "${YELLOW}Stopping existing Tor process...${NC}"
    pkill -x tor
    sleep 2
fi

echo -e "${YELLOW}Starting Tor...${NC}"
tor -f "$TOR_CONFIG" > "$TOR_DATA_DIR/tor.log" 2>&1 &
TOR_PID=$!

echo -n "Waiting for onion address..."
count=0
while [ ! -f "$HOSTNAME_FILE" ]; do
    if ! ps -p $TOR_PID > /dev/null 2>&1; then
        echo -e "\n${RED}Error: Tor process died unexpectedly.${NC}"
        echo -e "${RED}Last 20 lines of log:${NC}"
        tail -n 20 "$TOR_DATA_DIR/tor.log"
        exit 1
    fi
    sleep 1
    echo -n "."
    count=$((count+1))
    if [ $count -ge 60 ]; then
        echo -e "\n${RED}Error: Timed out waiting for onion address.${NC}"
        echo -e "${RED}Last 20 lines of log:${NC}"
        tail -n 20 "$TOR_DATA_DIR/tor.log"
        pkill -x tor || true
        exit 1
    fi
done
echo " Done."

# 7. Start Nginx
if ! pgrep -x "nginx" > /dev/null; then
    echo -e "${YELLOW}Starting Nginx...${NC}"
    # Ensure temp dirs exist
    mkdir -p "$NGINX_DATA_DIR/client_body_temp"
    mkdir -p "$NGINX_DATA_DIR/proxy_temp"
    mkdir -p "$NGINX_DATA_DIR/fastcgi_temp"
    mkdir -p "$NGINX_DATA_DIR/uwsgi_temp"
    mkdir -p "$NGINX_DATA_DIR/scgi_temp"
    
    nginx -c "$NGINX_CONFIG"
else
    echo -e "${YELLOW}Nginx is already running.${NC}"
fi

# 8. Start Monitor
echo -e "${YELLOW}Starting Monitor...${NC}"
pkill -f "monitor.sh" || true
nohup "$SCRIPT_DIR/monitor.sh" "$TOR_CONFIG" "$NGINX_CONFIG" > /dev/null 2>&1 &

# 9. Display Status
ONION_ADDR=$(cat "$HOSTNAME_FILE")
echo -e "\n${GREEN}=== LOCALHOST ONLINE ===${NC}"
echo -e "Onion Address: ${GREEN}${ONION_ADDR}${NC}"
echo -e "Local Access:  http://127.0.0.1:8080"
