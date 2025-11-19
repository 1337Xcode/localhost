// Kademlia DHT Worker (Functional Implementation)

// Constants
const K = 20; // Bucket size
const ALPHA = 3; // Parallelism
const ID_LENGTH = 160; // Bits
const BUCKET_COUNT = ID_LENGTH;

// State
let nodeId = null;
const routingTable = Array.from({ length: BUCKET_COUNT }, () => []);
const storage = new Map();
const pendingRequests = new Map();

// --- Crypto Helpers ---

async function sha1(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const buf = await crypto.subtle.digest('SHA-1', data); // SHA-1 is 160 bits
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Distance Logic ---

function getBucketIndex(id1, id2) {
    // Find the first bit where they differ (XOR distance approximation)
    // We treat the hex string as a big integer.
    // For performance in JS, we compare character by character (nibble by nibble).
    // This is a simplification. A true bitwise XOR on 160 bits requires BigInt or typed arrays.

    // Simplified: Length of shared prefix in bits.
    // 1 hex char = 4 bits.
    let prefixLen = 0;
    for (let i = 0; i < id1.length; i++) {
        const v1 = parseInt(id1[i], 16);
        const v2 = parseInt(id2[i], 16);
        if (v1 === v2) {
            prefixLen += 4;
        } else {
            // Check bits within the nibble
            const xor = v1 ^ v2;
            if ((xor & 0x8) === 0) prefixLen++;
            else break;
            if ((xor & 0x4) === 0) prefixLen++;
            else break;
            if ((xor & 0x2) === 0) prefixLen++;
            else break;
            break;
        }
    }
    // Bucket index corresponds to distance. 
    // Distance 0 (same ID) -> Index -1 (or handle separately)
    // Max distance -> Index 0.
    // We map prefix length to bucket index: 159 - prefixLen
    return Math.max(0, Math.min(ID_LENGTH - 1, ID_LENGTH - 1 - prefixLen));
}

function distance(id1, id2) {
    // Lexicographical comparison of XOR distance is roughly equivalent 
    // to comparing the IDs directly if we rotate the space, but for sorting:
    // We just need to know which is "closer" to target.
    // We can use the shared prefix length as a proxy for distance (longer prefix = closer).
    // For exact sorting, we'd need BigInt XOR.

    let dist = 0n;
    const big1 = BigInt('0x' + id1);
    const big2 = BigInt('0x' + id2);
    return big1 ^ big2;
}

// --- Routing Table Management ---

function updateRoutingTable(peer) {
    if (!nodeId || peer.id === nodeId) return;

    const idx = getBucketIndex(nodeId, peer.id);
    const bucket = routingTable[idx];
    const existingIdx = bucket.findIndex(p => p.id === peer.id);

    if (existingIdx !== -1) {
        // Move to tail (most recently seen)
        const p = bucket.splice(existingIdx, 1)[0];
        p.lastSeen = Date.now();
        bucket.push(p);
    } else {
        if (bucket.length < K) {
            peer.lastSeen = Date.now();
            bucket.push(peer);
        } else {
            // Bucket full. 
            // Kademlia policy: Ping the least recently seen (head). 
            // If it responds, move to tail and drop new peer.
            // If it doesn't, evict it and add new peer.
            // For this implementation, we'll just evict the oldest (head) to keep it simple/functional
            // without complex async ping-wait logic blocking the update.
            bucket.shift();
            peer.lastSeen = Date.now();
            bucket.push(peer);
        }
    }

    // Notify main thread of peer count update
    const count = routingTable.reduce((acc, b) => acc + b.length, 0);
    self.postMessage({ type: 'stats', count });
}

function getClosestNodes(targetId, count = K) {
    // Gather all nodes
    const all = routingTable.flat();
    // Sort by distance to target
    all.sort((a, b) => {
        const dA = distance(a.id, targetId);
        const dB = distance(b.id, targetId);
        return (dA < dB) ? -1 : (dA > dB) ? 1 : 0;
    });
    return all.slice(0, count);
}

// --- Core Operations ---

async function init(onionAddress) {
    // Generate Node ID from onion address
    nodeId = await sha1(onionAddress);
    self.postMessage({ type: 'ready', nodeId });
}

// --- Message Handling ---

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    try {
        switch (type) {
            case 'init':
                await init(payload.onionAddress);
                break;

            case 'add_peer':
                updateRoutingTable(payload);
                break;

            case 'find_node':
                // Return K closest nodes
                const nodes = getClosestNodes(payload.targetId);
                self.postMessage({ type: 'response', id, result: { nodes } });
                break;

            case 'store':
                // Store value
                storage.set(payload.key, payload.value);
                // Auto-expire after 10 mins
                setTimeout(() => storage.delete(payload.key), 10 * 60 * 1000);
                break;

            case 'find_value':
                if (storage.has(payload.key)) {
                    self.postMessage({
                        type: 'response',
                        id,
                        result: { found: true, value: storage.get(payload.key) }
                    });
                } else {
                    // Return closest nodes so requester can query them
                    const closest = getClosestNodes(payload.key);
                    self.postMessage({
                        type: 'response',
                        id,
                        result: { found: false, nodes: closest }
                    });
                }
                break;

            case 'ping':
                self.postMessage({ type: 'pong', id });
                break;
        }
    } catch (err) {
        console.error('DHT Worker Error:', err);
    }
};
