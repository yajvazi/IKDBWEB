export function bytesToHuman(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];

  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }

  return `${Number.isInteger(value) ? value : value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export function remainingDataBytes(allocatedDataBytes: number, usedDataBytes: number): number {
  return Math.max(allocatedDataBytes - usedDataBytes, 0);
}
