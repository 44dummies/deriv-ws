import assert from 'assert'
import { createSession, getSession, deleteSession } from '@/lib/server/session'

async function run() {
  console.log('Running session unit test...')
  const payload = { foo: 'bar' }
  const id = createSession(payload, 2) // 2 seconds TTL
  assert.ok(id, 'should return session id')
  const got = getSession(id)
  assert.deepStrictEqual(got, payload, 'retrieved payload should match')
  console.log('Sleeping 3s to verify expiry...')
  await new Promise((r) => setTimeout(r, 3000))
  const expired = getSession(id)
  assert.strictEqual(expired, null, 'session should be expired')
  // recreate and delete
  const id2 = createSession({ a: 1 }, 10)
  assert.ok(getSession(id2))
  const del = deleteSession(id2)
  assert.strictEqual(del, true)
  assert.strictEqual(getSession(id2), null)
  console.log('All session tests passed')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
