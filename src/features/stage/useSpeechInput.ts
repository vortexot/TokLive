// Microfone do criador: transforma fala em texto com o reconhecimento de voz do navegador (Chrome e Edge).
// No Chrome, o áudio é enviado ao serviço de reconhecimento de voz do Google para virar texto.

import { useEffect, useRef, useState } from 'react';

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResultLike> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'O navegador bloqueou o microfone. Libere o acesso no cadeado da barra de endereço.',
  'service-not-allowed': 'O navegador bloqueou o reconhecimento de voz.',
  'no-speech': 'Não ouvi nada. Tente de novo, mais perto do microfone.',
  'audio-capture': 'Nenhum microfone encontrado.',
  network: 'O reconhecimento de voz precisa de internet.',
};

/** Ouve até a pessoa parar de falar e entrega o texto final em `onFinal`. */
export function useSpeechInput(onFinal: (text: string) => void) {
  const Ctor = recognitionCtor();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<RecognitionLike | null>(null);
  const handler = useRef(onFinal);
  handler.current = onFinal;

  useEffect(() => () => rec.current?.abort(), []);

  const start = () => {
    if (!Ctor || listening) return;
    setError(null);
    setInterim('');
    const r = new Ctor();
    r.lang = 'pt-BR';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let text = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) final += res[0].transcript;
        else text += res[0].transcript;
      }
      setInterim(text);
      if (final.trim()) {
        setInterim('');
        handler.current(final.trim());
      }
    };
    r.onerror = (e) => setError(ERRORS[e.error] ?? 'O reconhecimento de voz falhou. Tente de novo.');
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError('Não foi possível ligar o microfone.');
    }
  };

  const stop = () => rec.current?.stop();

  return { supported: Boolean(Ctor), listening, interim, error, start, stop };
}
