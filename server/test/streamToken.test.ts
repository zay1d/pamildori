import test from 'node:test'
import assert from 'node:assert/strict'
import { signStreamToken, verifyStreamToken } from '../src/auth/streamToken.ts'

const SECRET = 'stream-secret'
const ID = '11111111-2222-4333-8444-555555555555'

test('sign then verify succeeds for the same (track, user)', () => {
  const tok = signStreamToken(ID, 42, SECRET)
  assert.equal(verifyStreamToken(tok, ID, 42, SECRET), true)
})

test('fails for a different user (no IDOR via capability URL)', () => {
  const tok = signStreamToken(ID, 42, SECRET)
  assert.equal(verifyStreamToken(tok, ID, 99, SECRET), false)
})

test('fails for a different track', () => {
  const tok = signStreamToken(ID, 42, SECRET)
  assert.equal(verifyStreamToken(tok, '99999999-2222-4333-8444-555555555555', 42, SECRET), false)
})

test('fails for a tampered signature', () => {
  const tok = signStreamToken(ID, 42, SECRET)
  assert.equal(verifyStreamToken(tok.slice(0, -2) + 'xx', ID, 42, SECRET), false)
})

test('fails once expired', () => {
  const past = Date.now() - 10_000
  const tok = signStreamToken(ID, 42, SECRET, 1, past) // ttl 1s, issued 10s ago
  assert.equal(verifyStreamToken(tok, ID, 42, SECRET), false)
})

test('fails with the wrong secret', () => {
  const tok = signStreamToken(ID, 42, SECRET)
  assert.equal(verifyStreamToken(tok, ID, 42, 'other-secret'), false)
})
