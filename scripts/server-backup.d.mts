export function inspectDatabase(filename: string): {
  bytes: number;
  schema: string;
};
export function createBackup(
  sourcePath: string,
  destinationPath: string,
): Promise<{ path: string; bytes: number }>;
export function restoreBackup(
  sourcePath: string,
  targetPath: string,
  stopped?: boolean,
): Promise<{ restored: string; safetyPath: string }>;
