let fallbackSequence = 0;

/**
 * 登録データ用の UUID。randomUUID がないブラウザーや HTTP 接続にも対応する。
 * 最終フォールバックは暗号学的な乱数ではないため、認証・トークンには使わない。
 */
export function createEntityId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
    // 古い環境では乱数に日時・連番も混ぜ、続けて作成した ID の衝突を避ける。
    let entropy = Date.now() + fallbackSequence++;
    for (let index = 0; index < 8; index += 1) {
      bytes[index] ^= entropy % 256;
      entropy = Math.floor(entropy / 256);
    }
  }

  // RFC 4122 UUID v4 のバージョンとバリアントを固定する。
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
