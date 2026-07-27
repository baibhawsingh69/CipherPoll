// Browser-compatible WebSocket shim for isomorphic-ws / ws
const ws = typeof window !== 'undefined' ? window.WebSocket : null;

export default ws;
export const WebSocket = ws;
