// Project Integration — Convert Custom Requests to Marketplace Projects

import { CustomRequest } from "./customRequests";
import { Project, addProject } from "./mockProjects";

const FREE_ACCESS_KEY = "edunova_free_access";

// ─── Free Access Store ───
interface FreeAccessRecord {
  userEmail: string;
  projectId: string;
  grantedAt: string;
}

function getStore(): FreeAccessRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FREE_ACCESS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStore(records: FreeAccessRecord[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(FREE_ACCESS_KEY, JSON.stringify(records));
  }
}

export function grantFreeAccess(userEmail: string, projectId: string): void {
  const records = getStore();
  if (!records.some(r => r.userEmail === userEmail && r.projectId === projectId)) {
    records.push({ userEmail, projectId, grantedAt: new Date().toISOString() });
    saveStore(records);
  }
}

export function hasFreeAccess(userEmail: string, projectId: string): boolean {
  return getStore().some(r => r.userEmail === userEmail && r.projectId === projectId);
}

// ─── Convert Custom Request → Marketplace Project ───
export async function convertRequestToMarketplaceProject(
  request: CustomRequest,
  overrides?: {
    price?: number;
    category?: string;
    thumbnail?: string;
  }
): Promise<Project> {
  const newId = `cp-${Date.now().toString(36)}`;

  // Get the latest accepted offer or default to budget
  const latestOffer = request.negotiationHistory && request.negotiationHistory.length > 0
    ? request.negotiationHistory[request.negotiationHistory.length - 1]
    : null;
  const finalPrice = latestOffer ? latestOffer.price : request.budget;

  const newProject: Project = {
    id: newId,
    title: request.projectTitle,
    description: request.description,
    price: overrides?.price || finalPrice,
    rating: 5.0,
    reviewsCount: 0,
    category: (overrides?.category as Project["category"]) || "web",
    subCategoryIds: [],
    sellerName: "EduNova Team",
    thumbnail: overrides?.thumbnail || "/projects/custom-project.png",
    previewImages: [],
    createdAt: new Date().toISOString(),
    techStack: request.requiredTech ? request.requiredTech.split(",").map(s => s.trim()) : [],
    status: "approved",
    featured: "none",
    uploadedBy: "admin",
    // Extended fields
    fromCustomRequest: true,
    originalRequestId: request.id,
    originalRequesterEmail: request.userEmail,
    originalCustomPrice: finalPrice,
    // Add Google Drive demo URL if available
    demoVideoUrl: request.demoVideoUrl,
    driveUrl: request.driveUrl,
  };

  // Push into the live projects array using async addProject
  await addProject(newProject);

  // Grant free access to the original requester
  grantFreeAccess(request.userEmail, newId);

  return newProject;
}
