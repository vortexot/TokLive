// Worker da LIVE do TokArena. Roda em um servidor seu (não no navegador, nem no GitHub Pages).
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   EULER_SIGN_API_KEY=... (opcional) \
//   npx tsx worker/index.ts
//
// A chave service_role ignora a segurança por linha: ela só existe aqui, nunca no navegador nem em config.js.

import { createClient } from '@supabase/supabase-js';
import { createWorker, type Db } from './core';
import { createTikTokConnect } from './tiktok';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const db: Db = {
  async listConnections() {
    const { data, error } = await supabase.from('live_connections').select('workspace_id, handle, desired, status');
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  async setStatus(workspaceId, status, message) {
    await supabase.from('live_connections').update({ status, message }).eq('workspace_id', workspaceId);
  },
  async insertEvents(rows) {
    const { error } = await supabase.from('live_events').insert(rows);
    if (error) throw new Error(error.message);
  },
};

const worker = createWorker({
  db,
  connect: createTikTokConnect({ signApiKey: process.env.EULER_SIGN_API_KEY }),
  log: (m) => console.log(`[worker] ${m}`),
});

worker.run();
// Apaga eventos antigos de hora em hora para a tabela não crescer.
setInterval(() => void supabase.rpc('prune_live_events'), 3_600_000);
console.log('[worker] no ar');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void worker.stop().then(() => process.exit(0));
  });
}
