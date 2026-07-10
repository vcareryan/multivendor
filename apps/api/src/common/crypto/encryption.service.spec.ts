import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

function makeService(key: string): EncryptionService {
  const config = { get: () => key } as unknown as ConfigService<never, true>;
  return new EncryptionService(config);
}

describe('EncryptionService', () => {
  const svc = makeService('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'); // 64 hex

  it('round-trips a value through encrypt/decrypt', () => {
    const secret = 'rzp_live_ABC123-super-secret';
    const enc = svc.encrypt(secret);
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain(secret);
    expect(svc.decrypt(enc)).toBe(secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
  });

  it('returns null for empty/invalid ciphertext', () => {
    expect(svc.decrypt(null)).toBeNull();
    expect(svc.decrypt(undefined)).toBeNull();
    expect(svc.decrypt('not-a-valid-payload')).toBeNull();
  });

  it('fails to decrypt if the auth tag is tampered', () => {
    const enc = svc.encrypt('tamper-me');
    const parts = enc.split(':');
    parts[3] = Buffer.from('garbage').toString('base64');
    expect(() => svc.decrypt(parts.join(':'))).toThrow();
  });

  it('accepts a non-hex master key by hashing to 32 bytes', () => {
    const s2 = makeService('a short passphrase that is not hex');
    expect(s2.decrypt(s2.encrypt('hello'))).toBe('hello');
  });

  it('encryptOptional skips empty values', () => {
    expect(svc.encryptOptional('')).toBeNull();
    expect(svc.encryptOptional(null)).toBeNull();
    expect(svc.encryptOptional('x')).toMatch(/^v1:/);
  });

  it('masks secrets and hashes deterministically', () => {
    expect(EncryptionService.mask('supersecret')).toBe('••••cret');
    expect(EncryptionService.mask('ab')).toBe('••••');
    expect(EncryptionService.mask(null)).toBeNull();
    expect(EncryptionService.sha256('a')).toBe(EncryptionService.sha256('a'));
    expect(EncryptionService.sha256('a')).not.toBe(EncryptionService.sha256('b'));
  });

  it('safeEqual compares in constant time semantics', () => {
    expect(EncryptionService.safeEqual('abc', 'abc')).toBe(true);
    expect(EncryptionService.safeEqual('abc', 'abd')).toBe(false);
    expect(EncryptionService.safeEqual('abc', 'abcd')).toBe(false);
  });
});
