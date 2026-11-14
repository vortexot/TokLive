// Voz do navegador (Web Speech API) para as falas dos bonecos.
// O áudio sai pelo alto-falante do computador: na LIVE, o OBS ou o TikTok LIVE Studio captura o som do Chrome.

import { useEffect, useState } from 'react';
import type { BonecoVoice } from '../../domain/bonecos';

export const CAN_SPEAK = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Vozes instaladas, com as de português primeiro. A lista chega depois do carregamento em alguns navegadores. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => (CAN_SPEAK ? window.speechSynthesis.getVoices() : []));
  useEffect(() => {
    if (!CAN_SPEAK) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);
  const pt = voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
  const rest = voices.filter((v) => !v.lang.toLowerCase().startsWith('pt'));
  return [...pt.sort((a, b) => Number(b.lang === 'pt-BR') - Number(a.lang === 'pt-BR')), ...rest];
}

/** Divide a fala em frases de até ~160 caracteres: o Chrome às vezes corta falas longas no meio. */
export function splitForSpeech(text: string, max = 160): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const out: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > max && current) {
      out.push(current.trim());
      current = '';
    }
    current += s;
  }
  if (current.trim()) out.push(current.trim());
  return out.length ? out : [text];
}

export interface SpeechHandle {
  done: Promise<void>;
  cancel(): void;
}

/**
 * Fala o texto com a voz do boneco. `done` termina quando a fala acaba, quando é cancelada ou, por segurança,
 * depois de um teto de tempo (o navegador às vezes não avisa o fim).
 */
export function speak(text: string, voice: BonecoVoice, limitMs: number): SpeechHandle {
  if (!CAN_SPEAK) return silent(limitMs);
  const synth = window.speechSynthesis;
  const chosen = voice.voiceURI ? synth.getVoices().find((v) => v.voiceURI === voice.voiceURI) : undefined;
  let finish!: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    clearTimeout(guard);
    finish();
  };
  const parts = splitForSpeech(text);
  synth.cancel();
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = chosen?.lang ?? 'pt-BR';
    if (chosen) u.voice = chosen;
    u.pitch = voice.pitch;
    u.rate = voice.rate;
    if (i === parts.length - 1) {
      u.onend = end;
      u.onerror = end;
    }
    synth.speak(u);
  });
  const guard = setTimeout(end, limitMs);
  return {
    done,
    cancel() {
      synth.cancel();
      end();
    },
  };
}

/** Sem voz: a fala dura o tempo estimado de leitura. */
export function silent(ms: number): SpeechHandle {
  let finish!: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  const timer = setTimeout(() => finish(), ms);
  return {
    done,
    cancel() {
      clearTimeout(timer);
      finish();
    },
  };
}

/** Atalho do formulário de boneco e do roteiro: fala e avisa no fim. Devolve a função que cancela. */
export function speakAloud(text: string, voice: BonecoVoice, onEnd: () => void = () => undefined): () => void {
  const handle = speak(text, voice, 30_000);
  let cancelled = false;
  void handle.done.then(() => {
    // Cancelar não conta como fim: quem cancelou já seguiu em frente.
    if (!cancelled) onEnd();
  });
  return () => {
    cancelled = true;
    handle.cancel();
  };
}
