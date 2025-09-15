export class EventBus {
  constructor() { this._handlers = new Map(); }
  on(type, cb) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(cb);
    return () => this.off(type, cb);
  }
  off(type, cb) { this._handlers.get(type)?.delete(cb); }
  emit(type, payload) { this._handlers.get(type)?.forEach(cb => { try { cb(payload); } catch {} }); }
}
