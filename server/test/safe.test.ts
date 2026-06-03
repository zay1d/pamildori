import test from 'node:test'
import assert from 'node:assert/strict'
import { extFor, safeStoredName, parseRange, isSafeId } from '../src/util/safe.ts'

const UUID = '11111111-2222-4333-8444-555555555555'

test('extFor maps mime and falls back to filename', () => {
  assert.equal(extFor('audio/mpeg', null), 'mp3')
  assert.equal(extFor('audio/mp4; codecs="mp4a"', null), 'm4a')
  assert.equal(extFor(null, 'song.FLAC'), 'flac')
  assert.equal(extFor('application/zip', 'evil.exe'), null)
  assert.equal(extFor(null, 'noext'), null)
})

test('safeStoredName only accepts a uuid + allow-listed ext', () => {
  assert.equal(safeStoredName(UUID, 'mp3'), `${UUID}.mp3`)
  assert.equal(safeStoredName(UUID, 'exe'), null)
})

test('safeStoredName blocks path traversal / injection ids', () => {
  assert.equal(safeStoredName('../../etc/passwd', 'mp3'), null)
  assert.equal(safeStoredName('..', 'mp3'), null)
  assert.equal(safeStoredName(UUID + '/../x', 'mp3'), null)
  assert.equal(isSafeId('a/b'), false)
  assert.equal(isSafeId(UUID), true)
})

test('parseRange handles normal, open-ended and suffix ranges', () => {
  assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99 })
  assert.deepEqual(parseRange('bytes=100-', 1000), { start: 100, end: 999 })
  assert.deepEqual(parseRange('bytes=-200', 1000), { start: 800, end: 999 })
})

test('parseRange rejects invalid / unsatisfiable ranges', () => {
  assert.equal(parseRange(undefined, 1000), null)
  assert.equal(parseRange('bytes=abc', 1000), null)
  assert.equal(parseRange('bytes=-', 1000), null)
  assert.equal(parseRange('bytes=500-100', 1000), null) // start > end
  assert.equal(parseRange('bytes=0-5000', 1000), null) // end >= size
  assert.equal(parseRange('items=0-1', 1000), null)
})
