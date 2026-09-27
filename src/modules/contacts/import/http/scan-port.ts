import { config } from "../../../../config/index.js";

export interface ScanResult {
  clean: boolean;
  reason?: string;
}

export interface ScanPort {
  scan(key: string): Promise<ScanResult>;
}

export class NoopScanner implements ScanPort {
  async scan(_key: string): Promise<ScanResult> {
    return { clean: true };
  }
}

export function avScanEnabled(env?: NodeJS.ProcessEnv): boolean {
  if (env) {
    return env.IMPORT_AV_SCAN_ENABLED === "1" || env.IMPORT_AV_SCAN_ENABLED === "true";
  }
  return config.import.avScanEnabled;
}
