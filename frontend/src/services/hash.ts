export const sha256 = async (text: string): Promise<string> => {
  if (!text) return '';

  if (!window.crypto?.subtle) {
    throw new Error('SHA-256 is not available in this environment');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

