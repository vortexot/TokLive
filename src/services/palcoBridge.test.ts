import { describe, expect, it } from 'vitest';
import { cleanBridgeUrl, parseBridgeEvent } from './palcoBridge';

describe('ponte do palco no navegador', () => {
  it('aceita só eventos com formato conhecido', () => {
    expect(parseBridgeEvent('{"type":"follow","username":"lu","nickname":"Lu"}')).toEqual({ type: 'follow', username: 'lu', nickname: 'Lu' });
    expect(parseBridgeEvent('{"type":"gift","username":"lu","gift":"faisca","giftName":"Rose","diamonds":1}')).toMatchObject({ type: 'gift', giftName: 'Rose' });
    expect(parseBridgeEvent('{"type":"comment","username":"lu"}')).toBeNull();
    expect(parseBridgeEvent('{"type":"like","username":"lu","count":"5"}')).toBeNull();
    expect(parseBridgeEvent('{"type":"apagar-tudo"}')).toBeNull();
    expect(parseBridgeEvent('{"type":"follow","username":5}')).toBeNull();
    expect(parseBridgeEvent('não é json')).toBeNull();
  });

  it('limpa o endereço da ponte', () => {
    expect(cleanBridgeUrl(' http://localhost:8787/qualquer ')).toBe('http://localhost:8787');
    expect(cleanBridgeUrl('ftp://x')).toBeNull();
    expect(cleanBridgeUrl('localhost')).toBeNull();
  });
});
