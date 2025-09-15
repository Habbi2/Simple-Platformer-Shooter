import { createClient } from '@supabase/supabase-js';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const offline = !SUPA_URL || !SUPA_KEY;
if (typeof document !== 'undefined') {
  const el = document.getElementById('offline-banner');
  if (el) el.classList.toggle('hidden', !offline);
}

const supabase = offline ? null : createClient(SUPA_URL, SUPA_KEY, { realtime: { params: { eventsPerSecond: 16 } } });

let channel = null;

export function connect(room = 'lobby', me = {}) {
  if (offline) {
    console.warn('Supabase not configured; running offline');
    return fakeNet();
  }

  const key = me.id || crypto.randomUUID();
  channel = supabase.channel(`room:${room}`, { config: { presence: { key } } });

  const listeners = { onPresence: () => {}, onMessage: () => {} };
  const presenceCache = new Map(); // id -> presence object
  let lastBroadcastAt = 0;
  let lastPresenceAt = 0;
  // Keep a local copy of the presence payload so updates don't drop fields
  let presence = {
    id: key,
    name: me.name || 'guest',
    color: me.color || '#4ade80',
    x: me.x ?? 0,
    y: me.y ?? 0,
    vx: 0,
    vy: 0
  };

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const players = Object.values(state).flat();
    // refresh cache
    presenceCache.clear();
    players.forEach(p => presenceCache.set(p.id, p));
    listeners.onPresence(players);
  });

  channel.on('broadcast', { event: 'game' }, ({ payload }) => {
    listeners.onMessage(payload);
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(presence);
    }
  });

  return {
    onPresence(cb) { listeners.onPresence = cb; },
    onMessage(cb) { listeners.onMessage = cb; },
    getPresence(id) { return presenceCache.get(id); },
    send(msg) {
      const now = Date.now();
      // simple client-side rate limit (~15 msg/s) for non-critical messages
      const critical = msg && (msg.t === 'hit' || msg.t === 'dead' || msg.t === 'round');
      if (!critical && (now - lastBroadcastAt < 66)) return;
      lastBroadcastAt = now;
      channel?.send({ type: 'broadcast', event: 'game', payload: msg });
    },
    updatePresence(partial) {
      presence = { ...presence, ...partial };
      const now = Date.now();
      // send presence at most ~1/s
      if (now - lastPresenceAt < 800) return;
      lastPresenceAt = now;
      channel?.track(presence);
    },
    disconnect() { try { channel?.unsubscribe(); } catch {} channel = null; },
    offline
  };
}

function fakeNet() {
  const listeners = { onPresence: () => {}, onMessage: () => {} };
  const players = [];
  return {
    onPresence(cb) { listeners.onPresence = cb; cb(players); },
    onMessage(cb) { listeners.onMessage = cb; },
    send(msg) { /* no-op */ },
    updatePresence() { /* no-op */ },
    disconnect() {},
    offline: true
  };
}
