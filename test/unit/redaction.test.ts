import * as assert from 'assert';
import { redactSecrets, containsSecret, redactEnvValue } from '../../src/utils/redaction';

describe('Redaction Utils', () => {
  describe('redactSecrets', () => {
    it('should redact password assignments', () => {
      const input = 'password=my_super_secret_123';
      const result = redactSecrets(input);
      assert.strictEqual(result, '[REDACTED]');
    });

    it('should redact API key assignments', () => {
      const input = 'api_key: sk-abc123def456ghi789';
      const result = redactSecrets(input);
      assert.strictEqual(result, '[REDACTED]');
    });

    it('should redact bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature';
      const result = redactSecrets(input);
      assert.ok(!result.includes('eyJhbGciOiJIUzI1NiJ9'));
    });

    it('should redact GitHub tokens', () => {
      const input = 'token: ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890';
      const result = redactSecrets(input);
      assert.ok(!result.includes('ghp_'));
    });

    it('should redact private keys', () => {
      const input = '-----BEGIN PRIVATE KEY-----\nMIIBVg==\n-----END PRIVATE KEY-----';
      const result = redactSecrets(input);
      assert.strictEqual(result, '[REDACTED]');
    });

    it('should not redact normal text', () => {
      const input = 'This is a normal description of a workflow';
      const result = redactSecrets(input);
      assert.strictEqual(result, input);
    });

    it('should handle empty strings', () => {
      assert.strictEqual(redactSecrets(''), '');
    });

    it('should handle multiple secrets in one string', () => {
      const input = 'password=secret1 and token=secret2';
      const result = redactSecrets(input);
      assert.ok(!result.includes('secret1'));
      assert.ok(!result.includes('secret2'));
    });
  });

  describe('containsSecret', () => {
    it('should detect passwords', () => {
      assert.strictEqual(containsSecret('password=abc'), true);
    });

    it('should detect tokens', () => {
      assert.strictEqual(containsSecret('token: abc123'), true);
    });

    it('should return false for normal text', () => {
      assert.strictEqual(containsSecret('hello world'), false);
    });
  });

  describe('redactEnvValue', () => {
    it('should redact the value portion of env lines', () => {
      const result = redactEnvValue('DATABASE_URL=postgresql://localhost:5432/db');
      assert.strictEqual(result, 'DATABASE_URL=[REDACTED]');
    });

    it('should handle lines without equals sign', () => {
      const result = redactEnvValue('JUST_A_KEY');
      assert.strictEqual(result, 'JUST_A_KEY');
    });

    it('should handle empty values', () => {
      const result = redactEnvValue('KEY=');
      assert.strictEqual(result, 'KEY=[REDACTED]');
    });
  });
});
