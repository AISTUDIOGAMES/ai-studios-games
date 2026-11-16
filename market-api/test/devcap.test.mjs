import test from 'node:test'; import assert from 'node:assert/strict';
import {checkDevCap} from '../scripts/check-dev-cap.mjs';
const mk = held => async (_u, init) => { const {method} = JSON.parse(init.body); return {json: async () => ({result: method === 'getTokenSupply' ? {value: {amount: '1000000000000000'}} : {value: [{account: {data: {parsed: {info: {tokenAmount: {amount: held}}}}}}]}})}; };
test('teto de 3%: 3,00% passa, 3,01% falha, 0% passa', async () => {
  const base = {rpcUrl: 'x', mint: 'm', devWallet: 'd'};
  assert.equal((await checkDevCap({...base, fetchFn: mk('30000000000000')})).ok, true);
  assert.equal((await checkDevCap({...base, fetchFn: mk('30100000000000')})).ok, false);
  assert.equal((await checkDevCap({...base, fetchFn: mk('0')})).percent, '0.00');
});
