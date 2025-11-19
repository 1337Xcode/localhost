// P2P CDN Layer (Functional Implementation)

class P2PCDN {
    constructor() {
        this.dhtWorker = new Worker('dht-peer.js');
        this.peers = new Map(); // id -> { conn, channel }
        this.pendingRequests = new Map();
        this.reqId = 0;
        this.nodeId = null;

        // Stats
        this.totalRx = 0;
        this.totalTx = 0;
        this.lastUpdate = Date.now();

        // WebRTC Config
        this.rtcConfig = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };

        this.init();
    }

    init() {
        // 1. Initialize DHT
        const onionAddress = window.location.hostname || 'localhost-dev';

        this.dhtWorker.onmessage = (e) => this.handleWorkerMessage(e);
        this.dhtWorker.postMessage({ type: 'init', payload: { onionAddress } });

        // 2. Setup Global Fetch Interceptor
        window.p2pFetch = (url) => this.fetchAsset(url);

        // 3. Start Discovery Loop (Simulation/Keep-alive)
        this.startDiscoveryLoop();
    }

    handleWorkerMessage(e) {
        const { type, payload, id, result, count, nodeId } = e.data;

        switch (type) {
            case 'ready':
                this.nodeId = nodeId;
                this.updateDHTStatus('Active');
                console.log('DHT Ready:', nodeId);
                break;
            case 'stats':
                document.getElementById('peer-count').textContent = count;
                // If we have peers, ensure DHT status is Active
                if (count > 0) this.updateDHTStatus('Active');
                break;
            case 'response':
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.get(id)(result);
                    this.pendingRequests.delete(id);
                }
                break;
        }
    }

    updateDHTStatus(status) {
        const el = document.getElementById('dht-status');
        el.textContent = status;
        // Remove inline style to allow CSS/Dark Mode to handle color
        el.removeAttribute('style');
    }

    startDiscoveryLoop() {
        setInterval(() => {
            const peerCount = parseInt(document.getElementById('peer-count').textContent || '0');

            // If no peers, simulate scanning to show activity
            if (peerCount === 0) {
                const dhtStatus = document.getElementById('dht-status');
                if (dhtStatus.textContent === 'Active') {
                    dhtStatus.textContent = 'Scanning...';
                } else if (dhtStatus.textContent === 'Scanning...') {
                    dhtStatus.textContent = 'Active';
                }
            }

            // Update Network Stats Display
            this.updateNetworkUI();

        }, 3000);
    }

    // --- WebRTC Connection Logic ---

    async connectToPeer(peerId, offer = null) {
        if (this.peers.has(peerId)) return this.peers.get(peerId);

        const conn = new RTCPeerConnection(this.rtcConfig);
        const peerEntry = { conn, channel: null, id: peerId };
        this.peers.set(peerId, peerEntry);

        conn.onicecandidate = (e) => {
            if (e.candidate) {
                // In a real DHT, we'd relay this candidate via the DHT or a signaling path.
                console.log('ICE Candidate generated');
            }
        };

        if (offer) {
            // Answerer Mode
            await conn.setRemoteDescription(offer);
            const answer = await conn.createAnswer();
            await conn.setLocalDescription(answer);

            conn.ondatachannel = (e) => {
                this.setupDataChannel(e.channel, peerId);
            };

            return answer;
        } else {
            // Offerer Mode
            const channel = conn.createDataChannel('p2p-cdn');
            this.setupDataChannel(channel, peerId);

            const localOffer = await conn.createOffer();
            await conn.setLocalDescription(localOffer);

            return localOffer;
        }
    }

    setupDataChannel(channel, peerId) {
        const peer = this.peers.get(peerId);
        peer.channel = channel;

        channel.onopen = () => {
            console.log(`Channel open with ${peerId}`);
            this.updateNetworkUI();
        };

        channel.onmessage = (e) => {
            this.totalRx += e.data.byteLength || e.data.length || 0;
            this.handleDataMessage(peerId, e.data);
            this.updateNetworkUI();
        };

        // Track sent data (hook into send)
        const originalSend = channel.send.bind(channel);
        channel.send = (data) => {
            this.totalTx += data.byteLength || data.length || 0;
            originalSend(data);
            this.updateNetworkUI();
        };

        channel.onclose = () => {
            this.peers.delete(peerId);
            this.updateNetworkUI();
        };
    }

    handleDataMessage(peerId, data) {
        // Handle incoming chunks or requests
        if (typeof data === 'string') {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'request_chunk') {
                    this.serveChunk(peerId, msg.hash);
                }
            } catch (e) {
                // Not JSON, treat as raw data
            }
        } else {
            // Binary chunk received
            console.log(`Received chunk from ${peerId}, size: ${data.byteLength}`);
        }
    }

    updateNetworkUI() {
        const el = document.getElementById('p2p-stats');

        if (this.peers.size === 0) {
            el.textContent = 'Idle';
            return;
        }

        if (this.totalRx === 0 && this.totalTx === 0) {
            el.textContent = 'Connected';
            return;
        }

        // Format bytes
        const format = (b) => {
            if (b < 1024) return b + ' B';
            if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
            return (b / (1024 * 1024)).toFixed(1) + ' MB';
        };

        el.textContent = `Rx: ${format(this.totalRx)} | Tx: ${format(this.totalTx)}`;
    }

    // --- Asset Fetching ---

    async fetchAsset(url) {
        const hash = await this.sha1(url);

        // 1. Query DHT for peers who have this asset
        const dhtResult = await this.queryDHT('find_value', { key: hash });

        if (dhtResult.found) {
            return dhtResult.value;
        } else if (dhtResult.nodes && dhtResult.nodes.length > 0) {
            // Found peers, try to connect
            console.log('Found peers for asset:', dhtResult.nodes);
            return null;
        }

        return null; // Fallback to HTTP
    }

    queryDHT(type, payload) {
        return new Promise(resolve => {
            const id = this.reqId++;
            this.pendingRequests.set(id, resolve);
            this.dhtWorker.postMessage({ type, id, payload });
        });
    }

    async sha1(text) {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest('SHA-1', enc.encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    serveChunk(peerId, hash) {
        caches.match(hash).then(response => {
            if (response) {
                response.arrayBuffer().then(buffer => {
                    const peer = this.peers.get(peerId);
                    if (peer && peer.channel.readyState === 'open') {
                        peer.channel.send(buffer);
                    }
                });
            }
        });
    }
}

// Initialize
const p2p = new P2PCDN();