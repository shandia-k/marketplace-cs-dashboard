/**
 * tests/unit/security/brute-force-lockout.test.js
 * Security testing for brute-force rate-limiting and lockout protection
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Isolated simulation of the auth lockout algorithm
class LockoutManager {
  constructor(maxAttempts = 5, lockDurationMs = 15 * 60 * 1000) {
    this.attempts = new Map();
    this.maxAttempts = maxAttempts;
    this.lockDurationMs = lockDurationMs;
  }

  recordFailedAttempt(username, now = Date.now()) {
    const clean = String(username || '').toLowerCase().trim();
    const data = this.attempts.get(clean) || { count: 0, lockedUntil: 0 };

    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingMinutes = Math.ceil((data.lockedUntil - now) / 60000);
      return { isLocked: true, remainingMinutes };
    }

    data.count = (data.count || 0) + 1;
    if (data.count >= this.maxAttempts) {
      data.lockedUntil = now + this.lockDurationMs;
      data.count = 0;
      this.attempts.set(clean, data);
      return { isLocked: true, remainingMinutes: Math.ceil(this.lockDurationMs / 60000) };
    }

    this.attempts.set(clean, data);
    return { isLocked: false, remainingAttempts: this.maxAttempts - data.count };
  }

  isLocked(username, now = Date.now()) {
    const clean = String(username || '').toLowerCase().trim();
    const data = this.attempts.get(clean);
    if (!data || !data.lockedUntil) return false;
    return now < data.lockedUntil;
  }

  clearAttempts(username) {
    const clean = String(username || '').toLowerCase().trim();
    this.attempts.delete(clean);
  }
}

describe('Level 2: Security & Brute-force Lockout Tests', () => {
  let lockout;

  beforeEach(() => {
    lockout = new LockoutManager(5, 15 * 60 * 1000);
  });

  test('should allow attempts below threshold with decreasing remaining attempts count', () => {
    const res1 = lockout.recordFailedAttempt('cs_user1');
    assert.equal(res1.isLocked, false);
    assert.equal(res1.remainingAttempts, 4);

    const res2 = lockout.recordFailedAttempt('cs_user1');
    assert.equal(res2.isLocked, false);
    assert.equal(res2.remainingAttempts, 3);
  });

  test('should lock out account on 5th consecutive failure for 15 minutes', () => {
    const now = 1700000000000;
    lockout.recordFailedAttempt('cs_user2', now);
    lockout.recordFailedAttempt('cs_user2', now);
    lockout.recordFailedAttempt('cs_user2', now);
    lockout.recordFailedAttempt('cs_user2', now);
    const fifth = lockout.recordFailedAttempt('cs_user2', now);

    assert.equal(fifth.isLocked, true);
    assert.equal(fifth.remainingMinutes, 15);
    assert.equal(lockout.isLocked('cs_user2', now + 1000), true);
  });

  test('should unlock after lock duration expires', () => {
    const now = 1700000000000;
    for (let i = 0; i < 5; i++) {
      lockout.recordFailedAttempt('cs_user3', now);
    }
    assert.equal(lockout.isLocked('cs_user3', now + 1000), true);

    // 16 minutes later
    const future = now + (16 * 60 * 1000);
    assert.equal(lockout.isLocked('cs_user3', future), false);
  });

  test('should clear lockout history upon successful login/reset', () => {
    lockout.recordFailedAttempt('cs_user4');
    lockout.recordFailedAttempt('cs_user4');
    lockout.clearAttempts('cs_user4');

    assert.equal(lockout.isLocked('cs_user4'), false);
    const freshAttempt = lockout.recordFailedAttempt('cs_user4');
    assert.equal(freshAttempt.remainingAttempts, 4);
  });
});
