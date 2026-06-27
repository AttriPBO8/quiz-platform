/**
 * Simple device fingerprint utility for testing
 */
export class Fingerprint {
  async getVisitorId(): Promise<string> {
    // Simple fingerprint for development
    const components = [
      navigator.userAgent,
      navigator.language,
      window.screen.width,
      window.screen.height
    ];
    
    const fingerprint = components.join('|');
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  }
}