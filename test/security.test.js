import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.DATABASE_PROVIDER = 'memory';
const { default: app } = await import('../src/app.js');
const { connectDatabase, closeDatabase, db } = await import('../src/database/store.js');
before(async () => connectDatabase());
beforeEach(() => { for (const collection of Object.values(db)) collection.length = 0; });
after(async () => closeDatabase());

test('password reset is single-use and does not expose token hashes', async () => {
  const registered = await request(app).post('/api/v1/auth/register').send({ name: 'Reset User', email: 'reset@example.com', phone: '+234800000111', password: 'Password123!', role: 'rider' });
  assert.equal(registered.status, 201);
  const sent = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'reset@example.com' });
  assert.equal(sent.status, 202);
  const token = sent.body.data.developmentResetToken;
  assert.ok(token);
  assert.ok(!JSON.stringify(db.passwordResetTokens).includes(token));
  assert.equal((await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'NewPassword123!' })).status, 200);
  assert.equal((await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'OtherPassword123!' })).status, 400);
});

test('Paystack webhook rejects invalid signatures', async () => {
  const response = await request(app).post('/api/v1/payments/webhooks/paystack').send({ event: 'charge.success', data: { reference: 'ref' } });
  assert.ok([401, 503].includes(response.status));
});

test('document upload stores metadata without base64 payload', async () => {
  const registered = await request(app).post('/api/v1/auth/register').send({ name: 'Driver User', email: 'driver-upload@example.com', phone: '+234800000112', password: 'Password123!', role: 'driver' });
  const response = await request(app).post('/api/v1/drivers/verification/document').set('Authorization', `Bearer ${registered.body.data.accessToken}`).field('documentType', 'license').attach('document', Buffer.from('fake-image'), { filename: 'license.jpg', contentType: 'image/jpeg' });
  assert.equal(response.status, 202);
  assert.equal(Object.hasOwn(db.documents[0], 'contentBase64'), false);
});
