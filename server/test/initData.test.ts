import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { validateInitData } from '../src/auth/initData.ts'

const TOKEN = '123456:TEST-bot-token'

function build(fields: Record<string, string>, token = TOKEN): string {
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest()
  const dcs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')
  const hash = crypto.createHmac('sha256', secret).update(dcs).digest('hex')
  const usp = new URLSearchParams(fields)
  usp.set('hash', hash)
  return usp.toString()
}

const now = Math.floor(Date.now() / 1000)
const user = JSON.stringify({ id: 42, first_name: 'Ada', username: 'ada' })

test('accepts valid initData and parses the user', () => {
  const data = build({ auth_date: String(now), query_id: 'AAE', user })
  const r = validateInitData(data, TOKEN)
  assert.equal(r.ok, true)
  assert.equal(r.user?.id, 42)
  assert.equal(r.user?.username, 'ada')
})

test('rejects a tampered hash', () => {
  const data = build({ auth_date: String(now), user })
  const broken = data.replace(/hash=[a-f0-9]+/, 'hash=' + '0'.repeat(64))
  assert.equal(validateInitData(broken, TOKEN).ok, false)
})

test('rejects a tampered field after signing (user id swap)', () => {
  const data = build({ auth_date: String(now), user })
  const forged = data.replace(encodeURIComponent('"id":42'), encodeURIComponent('"id":99'))
  const r = validateInitData(forged, TOKEN)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'bad_hash')
})

test('rejects a wrong bot token', () => {
  const data = build({ auth_date: String(now), user })
  assert.equal(validateInitData(data, 'someone-elses-token').ok, false)
})

test('rejects expired initData', () => {
  const data = build({ auth_date: String(now - 100000), user })
  const r = validateInitData(data, TOKEN, 3600)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'expired')
})

test('rejects future-dated initData beyond skew', () => {
  const data = build({ auth_date: String(now + 1000), user })
  assert.equal(validateInitData(data, TOKEN).reason, 'future')
})

test('rejects missing hash / empty / no user', () => {
  assert.equal(validateInitData('', TOKEN).reason, 'empty')
  assert.equal(validateInitData('auth_date=1&user=%7B%7D', TOKEN).reason, 'no_hash')
  const noUser = build({ auth_date: String(now) })
  assert.equal(validateInitData(noUser, TOKEN).reason, 'no_user')
})
