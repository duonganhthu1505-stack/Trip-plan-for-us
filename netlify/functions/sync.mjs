import { getStore } from '@netlify/blobs';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const STORE = getStore('our-travel-planner-shared');
const DATA_KEY = 'shared-data';
const META_KEY = 'auth-meta';
const SALT = 'our-travel-planner-v1';
const INITIAL_PASSWORD_HASH = 'd86a5158f8e53fe840355c124261ba1ec0eaeaa58d107d0ebc832b5f13ae69c0';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const hashPassword = (password) => createHash('sha256').update(SALT + password).digest('hex');
const tokenFor = (hash) => {
  const payload = Buffer.from(JSON.stringify({ v: 1, iat: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', hash).update(payload).digest('base64url');
  return payload + '.' + sig;
};
function verifyToken(token, hash) {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return false;
    const expected = createHmac('sha256', hash).update(payload).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded?.v === 1 && Date.now() - Number(decoded.iat || 0) < 30 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}
async function getMeta() {
  const meta = await STORE.get(META_KEY, { type: 'json', consistency: 'strong' });
  if (meta?.passwordHash) return meta;
  const initial = { passwordHash: INITIAL_PASSWORD_HASH, initializedAt: new Date().toISOString() };
  await STORE.setJSON(META_KEY, initial);
  return initial;
}
async function getState() {
  const result = await STORE.getWithMetadata(DATA_KEY, { type: 'json', consistency: 'strong' });
  if (!result) return null;
  return { data: result.data, revision: Number(result.metadata?.revision || 1), etag: result.etag };
}
function authToken(req) {
  const value = req.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}
export default async function handler(req) {
  try {
    const meta = await getMeta();
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.action === 'login') {
        if (hashPassword(String(body.password || '')) !== meta.passwordHash) return json({ ok: false, error: 'INVALID_PASSWORD' }, 401);
        return json({ ok: true, token: tokenFor(meta.passwordHash) });
      }
      if (body.action === 'change-password') {
        if (!verifyToken(authToken(req), meta.passwordHash)) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
        const next = String(body.newPassword || '');
        if (next.length < 6) return json({ ok: false, error: 'PASSWORD_TOO_SHORT' }, 400);
        const nextHash = hashPassword(next);
        await STORE.setJSON(META_KEY, { ...meta, passwordHash: nextHash, changedAt: new Date().toISOString() });
        return json({ ok: true, token: tokenFor(nextHash) });
      }
      return json({ ok: false, error: 'UNKNOWN_ACTION' }, 400);
    }
    if (!verifyToken(authToken(req), meta.passwordHash)) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
    if (req.method === 'GET') return json({ ok: true, state: await getState() });
    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}));
      if (!body.data || typeof body.data !== 'object') return json({ ok: false, error: 'INVALID_DATA' }, 400);
      const current = await getState();
      const expectedRevision = Number(body.revision || 0);
      if (current && expectedRevision !== current.revision) return json({ ok: false, error: 'CONFLICT', state: current }, 409);
      const nextRevision = current ? current.revision + 1 : 1;
      const write = current
        ? await STORE.setJSON(DATA_KEY, body.data, { metadata: { revision: nextRevision, updatedAt: new Date().toISOString() }, onlyIfMatch: current.etag })
        : await STORE.setJSON(DATA_KEY, body.data, { metadata: { revision: 1, updatedAt: new Date().toISOString() }, onlyIfNew: true });
      if (!write.modified) return json({ ok: false, error: 'CONFLICT', state: await getState() }, 409);
      return json({ ok: true, revision: nextRevision });
    }
    return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  } catch (error) {
    console.error('shared sync error', error);
    return json({ ok: false, error: 'SERVER_ERROR' }, 500);
  }
}
