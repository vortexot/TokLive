// Camada de dados. Hoje é local (localStorage + dados sintéticos); a interface é assíncrona
// de propósito, para que um serviço real possa substituí-la sem mudar as páginas.

import type { DayPoint } from '../domain/session';
import { generateDataset, type DemoDataset } from './mockData';
import { clearAll, loadJson, saveJson } from './storage';

export class DataServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataServiceError';
  }
}

export interface StatisticsPayload {
  days: DayPoint[];
}

export interface DataService {
  loadDataset(): Promise<DemoDataset>;
  saveDataset(dataset: DemoDataset): void;
  resetDataset(): Promise<DemoDataset>;
  loadStatistics(rangeDays: 7 | 30): Promise<StatisticsPayload>;
  /** Faz a próxima leitura falhar (para demonstrar o estado de erro). */
  failNext(value: boolean): void;
}

const DATASET_KEY = 'dataset';

function isDataset(value: unknown): value is DemoDataset {
  const v = value as Partial<DemoDataset> | null;
  return !!v && v.version === 1 && Array.isArray(v.participants) && Array.isArray(v.history) && !!v.today;
}

export interface LocalServiceOptions {
  latencyMs?: number;
  now?: () => number;
}

export function createLocalDataService(options: LocalServiceOptions = {}): DataService {
  const latency = options.latencyMs ?? 240;
  const now = options.now ?? Date.now;
  let shouldFail = false;
  let cache: DemoDataset | null = null;

  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latency));
  const guard = () => {
    if (shouldFail) {
      shouldFail = false;
      throw new DataServiceError('Não foi possível carregar os dados da demonstração.');
    }
  };

  return {
    async loadDataset() {
      await wait();
      guard();
      const saved = loadJson<unknown>(DATASET_KEY);
      cache = isDataset(saved) ? saved : generateDataset(now());
      return cache;
    },
    saveDataset(dataset) {
      cache = dataset;
      saveJson(DATASET_KEY, dataset);
    },
    async resetDataset() {
      await wait();
      clearAll();
      cache = generateDataset(now(), `tokarena-demo-${now()}`);
      saveJson(DATASET_KEY, cache);
      return cache;
    },
    async loadStatistics(rangeDays) {
      await wait();
      guard();
      const dataset = cache ?? (isDataset(loadJson(DATASET_KEY)) ? (loadJson(DATASET_KEY) as DemoDataset) : generateDataset(now()));
      return { days: dataset.history.slice(-(rangeDays - 1)) };
    },
    failNext(value) {
      shouldFail = value;
    },
  };
}
