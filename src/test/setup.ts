import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom não tem WebGL: usa o fallback 2D da cena em todos os testes de interface.
vi.mock('../features/scene/webgl', () => ({ hasWebGL: () => false }));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
