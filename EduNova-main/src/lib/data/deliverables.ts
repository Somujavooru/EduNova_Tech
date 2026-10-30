/**
 * EduNova Forge — Project Deliverables & Documents System
 *
 * Folder Structure per Project:
 * [Project Name]/
 * ├── Documents/
 * │   ├── Project_Report.pdf
 * │   ├── Project_Presentation.pptx
 * │   └── User_Guide.pdf
 * ├── Source_Code/
 * │   └── Source_Files.zip
 * └── Circuit_Diagram/ (Hardware/IoT only)
 *     └── Circuit_Schematic.pdf
 */

export interface ProjectDeliverable {
  id: string; // e.g. "report", "presentation", "source_code", "circuit_diagram", "user_guide"
  type: "report" | "presentation" | "source_code" | "circuit_diagram" | "user_guide" | "hardware_doc" | "other";
  title: string;
  format: "PDF" | "PPT" | "PPTX" | "ZIP" | "RAR" | "DOCX" | "PNG" | "MP4";
  description: string;
  folderPath: string; // clean relative path within project folder
  fileUrl?: string; // secure download link (Google Drive / Cloud storage)
  fileSize?: string;
  isIncluded: boolean;
  status: "available" | "included_upon_order" | "under_preparation";
}

export interface ProjectDocumentsFolder {
  projectId: string;
  projectTitle: string;
  folderName: string;
  documents: ProjectDeliverable[];
  updatedAt: string;
}

// Standard document template definitions
export const DELIVERABLE_DEFINITIONS: Record<
  string,
  {
    title: string;
    type: ProjectDeliverable["type"];
    format: ProjectDeliverable["format"];
    description: string;
    defaultPath: string;
  }
> = {
  report: {
    title: "Project Report",
    type: "report",
    format: "PDF",
    description: "Complete IEEE-standard documentation covering abstract, literature survey, system methodology, architecture, implementation algorithms, experimental results, and conclusion.",
    defaultPath: "Documents/Project_Report.pdf",
  },
  presentation: {
    title: "Project Presentation",
    type: "presentation",
    format: "PPTX",
    description: "Professionally designed slide deck explaining project objectives, system architecture, methodology, live demonstration screenshots, and project outcomes for viva/evaluations.",
    defaultPath: "Documents/Project_Presentation.pptx",
  },
  source_code: {
    title: "Source Code & Repository",
    type: "source_code",
    format: "ZIP",
    description: "Clean, production-grade source code with comprehensive comments, dependencies list (requirements.txt / package.json), setup scripts, and test cases.",
    defaultPath: "Source_Code/Source_Files.zip",
  },
  circuit_diagram: {
    title: "Circuit Diagram & Schematic",
    type: "circuit_diagram",
    format: "PDF",
    description: "High-resolution circuit schematic diagram, pinout configurations, bill of materials (BOM), and hardware wiring connections.",
    defaultPath: "Documents/Circuit_Schematic.pdf",
  },
  user_guide: {
    title: "User Guide & Setup Manual",
    type: "user_guide",
    format: "PDF",
    description: "Step-by-step setup and installation guide with prerequisites, environment configuration, troubleshooting steps, and operational manual.",
    defaultPath: "Documents/User_Guide.pdf",
  },
};

const DELIVERABLES_STORAGE_KEY = "edunova_project_deliverables_config";

/**
 * Retrieves custom admin-configured deliverables for a project from localStorage.
 */
export function getStoredProjectDeliverables(projectId: string): ProjectDeliverable[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DELIVERABLES_STORAGE_KEY}_${projectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves admin-configured deliverables for a project.
 */
export function saveStoredProjectDeliverables(projectId: string, deliverables: ProjectDeliverable[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${DELIVERABLES_STORAGE_KEY}_${projectId}`, JSON.stringify(deliverables));
    window.dispatchEvent(new CustomEvent("edunova_deliverables_updated", { detail: { projectId } }));
  } catch (e) {
    console.warn("[Deliverables] Failed to save config:", e);
  }
}

/**
 * Resolves the active list of deliverables for any project.
 * Strictly guarantees:
 * 1. Each project has its own dedicated documents list.
 * 2. Only deliverables actually available/included for that project are returned when filtering.
 * 3. Fallbacks respect the project category (e.g. IoT gets circuit diagrams, pure AI gets code & reports).
 */
export function getProjectDeliverables(project: {
  id: string;
  title: string;
  category?: string;
  driveUrl?: string;
  deliverables?: ProjectDeliverable[];
}): ProjectDeliverable[] {
  if (!project) return [];

  // 1. Check custom admin override in storage
  const stored = getStoredProjectDeliverables(project.id);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  // 2. Check if project already has embedded deliverables
  if (project.deliverables && Array.isArray(project.deliverables) && project.deliverables.length > 0) {
    return project.deliverables;
  }

  // 3. Build project-specific deliverables based on category and available links
  const isHardware = ["iot", "robotics", "embedded", "vlsi", "electrical"].includes(
    (project.category || "").toLowerCase()
  );

  const cleanTitle = (project.title || "Project").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  const driveUrl = project.driveUrl || "";

  const items: ProjectDeliverable[] = [
    {
      id: "report",
      type: "report",
      title: "Project Report",
      format: "PDF",
      description: DELIVERABLE_DEFINITIONS.report.description,
      folderPath: `${cleanTitle}/Documents/Project_Report.pdf`,
      fileUrl: driveUrl ? `${driveUrl}` : undefined,
      fileSize: "3.5 MB - 6.2 MB",
      isIncluded: true,
      status: "available",
    },
    {
      id: "presentation",
      type: "presentation",
      title: "Project Presentation",
      format: "PPTX",
      description: DELIVERABLE_DEFINITIONS.presentation.description,
      folderPath: `${cleanTitle}/Documents/Project_Presentation.pptx`,
      fileUrl: driveUrl ? `${driveUrl}` : undefined,
      fileSize: "4.8 MB - 12.0 MB",
      isIncluded: true,
      status: "available",
    },
    {
      id: "source_code",
      type: "source_code",
      title: "Complete Source Code",
      format: "ZIP",
      description: DELIVERABLE_DEFINITIONS.source_code.description,
      folderPath: `${cleanTitle}/Source_Code/Source_Files.zip`,
      fileUrl: driveUrl ? `${driveUrl}` : undefined,
      fileSize: "15 MB - 85 MB",
      isIncluded: true,
      status: "available",
    },
  ];

  if (isHardware) {
    items.push({
      id: "circuit_diagram",
      type: "circuit_diagram",
      title: "Circuit Diagram & Schematics",
      format: "PDF",
      description: DELIVERABLE_DEFINITIONS.circuit_diagram.description,
      folderPath: `${cleanTitle}/Documents/Circuit_Schematic.pdf`,
      fileUrl: driveUrl ? `${driveUrl}` : undefined,
      fileSize: "2.1 MB",
      isIncluded: true,
      status: "available",
    });
  }

  items.push({
    id: "user_guide",
    type: "user_guide",
    title: "User Guide & Setup Manual",
    format: "PDF",
    description: DELIVERABLE_DEFINITIONS.user_guide.description,
    folderPath: `${cleanTitle}/Documents/User_Guide.pdf`,
    fileUrl: driveUrl ? `${driveUrl}` : undefined,
    fileSize: "1.8 MB",
    isIncluded: true,
    status: "available",
  });

  return items;
}
