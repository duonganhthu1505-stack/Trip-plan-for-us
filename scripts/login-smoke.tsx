/**
 * Login screen smoke test — `npx tsx scripts/login-smoke.tsx`
 *
 * Renders the login screen to static HTML and checks the promises that matter
 * for syncing, so a future edit cannot quietly remove them again:
 *   1. there IS a Google sign-in button (the only path that unlocks the shared
 *      cloud data, and the only way both phones can show the same thing),
 *   2. the email path is still described as device-local instead of looking like
 *      a real cloud login,
 *   3. the one-time-login promise ("chỉ cần đăng nhập 1 lần") is on screen.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { Login } from '../src/components/Login';

const html = renderToString(
  <Login
    allowedEmails={['duonganhthu1505@gmail.com', 'tuanank1511@gmail.com']}
    onLoginSuccess={() => {}}
    onOfflineMode={() => {}}
    onGoogleLogin={() => {}}
  />
);

const checks: Record<string, boolean> = {
  'google sign-in button exists': html.includes('login-google-btn'),
  'google button is labelled': html.includes('Đăng nhập bằng Google'),
  'google mark is drawn': html.includes('<svg'),
  'one-time login promise shown': html.includes('1 lần'),
  'email path explained as local-only': html.includes('không đồng bộ'),
  'email input still available': html.includes('login-email-input'),
  'email submit renamed to device-only': html.includes('Xem trên máy này'),
  'admin email still shown': html.includes('duonganhthu1505@gmail.com'),
};

let fail = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log(ok ? 'PASS' : 'FAIL', '-', name);
  if (!ok) fail++;
}
console.log('html length:', html.length);
process.exit(fail ? 1 : 0);
