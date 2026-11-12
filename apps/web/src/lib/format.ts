const nf = new Intl.NumberFormat('pt-BR');
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (n: number) => nf.format(Math.round(n));
export const formatCompact = (n: number) => compact.format(n);

/** 83.4 → "01:23.4" (placar de tempo) */
export function formatClock(seconds: number, tenths = false): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const whole = String(Math.floor(rest)).padStart(2, '0');
  return `${String(m).padStart(2, '0')}:${whole}${tenths ? `.${Math.floor((rest % 1) * 10)}` : ''}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

export const formatDate = (ms: number) => dateFmt.format(ms);
export const formatDateTime = (ms: number) => dateTimeFmt.format(ms);
export const formatDay = (ms: number) => dayFmt.format(ms);

export function timeAgo(now: number, at: number): string {
  const diff = Math.max(0, now - at);
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'agora';
  if (s < 60) return `há ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
