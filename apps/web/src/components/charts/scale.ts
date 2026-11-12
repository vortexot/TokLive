/** Escala com passos "redondos" (1, 2, 2.5, 5 × 10ⁿ): o eixo nunca mostra 625 ou 1,9 mil. */
export function niceScale(maxValue: number, target = 4): { max: number; step: number; ticks: number[] } {
  const safe = Math.max(maxValue, 1);
  const raw = safe / target;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const step = nice * exp;
  const max = Math.ceil(safe / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return { max, step, ticks: out };
}
