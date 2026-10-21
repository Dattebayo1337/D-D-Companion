export function rotateBackup(
  source: string,
  directory: string,
  kind?: string,
  keep?: number,
): Promise<{ path: string; bytes: number }>;
