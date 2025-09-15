export function nowMs() { return Date.now(); }

export function throttle(fn, hz) {
  const interval = 1000 / hz;
  let last = 0;
  return (...args) => {
    const t = nowMs();
    if (t - last >= interval) {
      last = t;
      fn(...args);
    }
  };
}

export function seededColorFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 80% 60%)`;
}

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
