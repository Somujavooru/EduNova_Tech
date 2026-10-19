export interface Report {
  id: string;
  type: "plagiarism" | "spam" | "inappropriate" | "fake_account" | "other";
  targetTitle: string;
  targetType: "project" | "user";
  reportedBy: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

let reports: Report[] = [];

export const getAllReports = (): Report[] => {
  return [...reports];
};

export const updateReportStatus = (id: string, status: Report["status"]): Report | undefined => {
  const index = reports.findIndex(r => r.id === id);
  if (index !== -1) {
    reports[index] = { ...reports[index], status };
    return reports[index];
  }
  return undefined;
};
