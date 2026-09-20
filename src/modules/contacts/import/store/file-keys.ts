export function sourceObjectKey(
  organizationId: string,
  accountId: string,
  jobId: string,
  extension: "csv" | "xlsx",
): string {
  return `uploads/${organizationId}/${accountId}/${jobId}/source.${extension}`;
}

export function uploadObjectKey(
  organizationId: string,
  accountId: string,
  jobId: string,
  fileName: string,
): string {
  return `uploads/${organizationId}/${accountId}/${jobId}/${fileName}`;
}

export function errorReportKey(jobId: string): string {
  return `reports/${jobId}/errors.csv`;
}

export function workspaceFromIds(
  organizationId: string,
  accountId: string,
): { organizationId: string; accountId: string } {
  return { organizationId, accountId };
}
