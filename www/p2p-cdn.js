// P2P CDN Layer (Functional Implementation)

class P2PCDN {
    constructor() {
        this.dhtWorker = new Worker('dht-peer.js');
        this.peers = new Map(); // id -> { conn, channel }
        this.pendingRequests = new Map();
        this.reqId = 0;
        this.nodeId = null;

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

        // 2. Setup Global Fetch Interceptor (if needed, or just expose API)
        window.p2pFetch = (url) => this.fetchAsset(url);
    }

    handleWorkerMessage(e) {
        const { type, payload, id, result, count, nodeId } = e.data;

        switch (type) {
            case 'ready':
                this.nodeId = nodeId;
                document.getElementById('dht-status').textContent = 'Active';
                document.getElementById('dht-status').style.color = '#000';
                console.log('DHT Ready:', nodeId);
                break;
            case 'stats':
                document.getElementById('peer-count').textContent = count;
                break;
            case 'response':
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.get(id)(result);
                    this.pendingRequests.delete(id);
                }
                break;
        }
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
                // For this standalone demo, we assume direct connectivity or manual signaling.
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

            return answer; // Return answer to be sent back
        } else {
            // Offerer Mode
            const channel = conn.createDataChannel('p2p-cdn');
            this.setupDataChannel(channel, peerId);

            const localOffer = await conn.createOffer();
            await conn.setLocalDescription(localOffer);

            return localOffer; // Return offer to be sent
        }
    }

    setupDataChannel(channel, peerId) {
        const peer = this.peers.get(peerId);
        peer.channel = channel;

        channel.onopen = () => {
            console.log(`Channel open with ${peerId}`);
            document.getElementById('p2p-stats').textContent = 'Connected';
        };

        channel.onmessage = (e) => {
            this.handleDataMessage(peerId, e.data);
        };

        channel.onclose = () => {
            this.peers.delete(peerId);
        };
    }

    handleDataMessage(peerId, data) {
        // Handle incoming chunks or requests
        if (typeof data === 'string') {
            const msg = JSON.parse(data);
            if (msg.type === 'request_chunk') {
                // Serve chunk
                this.serveChunk(peerId, msg.hash);
            }
        } else {
            // Binary chunk received
            console.log(`Received chunk from ${peerId}, size: ${data.byteLength}`);
        }
    }

    // --- Asset Fetching ---

    async fetchAsset(url) {
        const hash = await this.sha1(url);

        // 1. Query DHT for peers who have this asset
        const dhtResult = await this.queryDHT('find_value', { key: hash });

        if (dhtResult.found) {
            // We found the data directly (small assets)
            return dhtResult.value;
        } else if (dhtResult.nodes && dhtResult.nodes.length > 0) {
            // We found peers who might have it
            // Try to connect to them (simplified: pick first)
            const targetPeer = dhtResult.nodes[0];
            // In a real scenario, we would initiate WebRTC here using the signaling info stored in the node record
            console.log('Found peers for asset:', dhtResult.nodes);
            return null; // Placeholder return until connection established
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
        // Logic to read from Cache API and send via WebRTC
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
