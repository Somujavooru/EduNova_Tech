import { Review } from "./reviews";
import { mockProjects, Project } from "./mockProjects";

interface ReviewTemplate {
  title: string;
  comment: (p: Project) => string;
  rating: number;
  quality: number;
  documentation: number;
  ui_ux: number;
  support: number;
  pros: (p: Project) => string[];
  cons: (p: Project) => string[];
}

const REVIEWER_PROFILES = [
  { name: "Karthik Venkatesh", college: "PES University, Bangalore" },
  { name: "Ananya Hegde", college: "RVCE Bangalore" },
  { name: "Siddharth Rao", college: "BMSCE Bangalore" },
  { name: "Varun Kulkarni", college: "Ramaiah Institute of Technology (MSRIT)" },
  { name: "Sneha Bhat", college: "Dayananda Sagar College of Engineering (DSCE)" },
  { name: "Chethan Kumar", college: "Bangalore Institute of Technology (BIT)" },
  { name: "Megha Nadig", college: "Sir MVIT Bangalore" },
  { name: "Darshan Gowda", college: "RNSIT Bangalore" },
  { name: "Rakshith Shetty", college: "Sahyadri College of Engineering, Mangalore" },
  { name: "Pooja Deshpande", college: "KLE Technological University (BVB Hubli)" },
  { name: "Pradeep Nayak", college: "MIT Manipal" },
  { name: "Tejaswini Patil", college: "Siddaganga Institute of Technology (SIT Tumkur)" },
  { name: "Vinay Murthy", college: "The National Institute of Engineering (NIE Mysore)" },
  { name: "Ashwini Kulkarni", college: "SDMCET Dharwad" },
  { name: "Harsha Vardhan", college: "JSS Science & Tech University (SJCE Mysore)" },
  { name: "Sushmitha R", college: "Nitte Meenakshi Institute of Technology (NMIT)" },
  { name: "Naveen Prasad", college: "New Horizon College of Engineering (NHCE)" },
  { name: "Keerthi Swamy", college: "BNM Institute of Technology (BNMIT)" },
  { name: "Manoj Gowda", college: "CMRIT Bangalore" },
  { name: "Divya Prabhu", college: "NMAM Institute of Technology, Nitte" },
  { name: "Abhishek Joshi", college: "Acharya Institute of Technology, Bangalore" },
  { name: "Shwetha M", college: "MVJ College of Engineering, Bangalore" }
];

function getTemplatesForProject(p: Project): ReviewTemplate[] {
  const cat = (p.category || "").toLowerCase();
  const tech = (p.techStack || []).join(" ").toLowerCase();
  const title = (p.title || "").toLowerCase();

  if (cat === "hardware" || cat === "iot" || cat === "embedded" || tech.includes("esp") || tech.includes("arduino")) {
    return [
      {
        title: "Flawless circuit schematics and reliable firmware",
        comment: (proj) => `Submitted ${proj.title} for our 8th semester capstone expo. Circuit diagrams and pinout connections were crystal clear. The microcontroller code compiled on the Arduino IDE without missing header errors. Live cloud telemetry impressed the evaluation panel!`,
        rating: 5,
        quality: 5,
        documentation: 5,
        ui_ux: 5,
        support: 5,
        pros: (proj) => ["Precise wiring schematics included", "Reliable sensor calibration", "Clean modular C++ code"],
        cons: () => ["Make sure to install the CP2102/CH340 USB drivers"]
      },
      {
        title: "Saved our team 3 weeks of hardware debugging",
        comment: (proj) => `Everything in the package was well documented. The power calculation and component bill of materials (BOM) made sourcing parts straightforward. Ran smoothly throughout the live demonstration.`,
        rating: 4.8,
        quality: 5,
        documentation: 5,
        ui_ux: 4.5,
        support: 5,
        pros: () => ["Complete bill of materials", "Stable telemetry syncing", "Step-by-step setup guide"],
        cons: () => ["Requires 5V/2A stable power supply for long runs"]
      },
      {
        title: "Best project documentation I have seen",
        comment: () => `The architecture breakdown and state machine diagrams made preparing our project report and presentation slides seamless. Got an A grade from our external examiner.`,
        rating: 5,
        quality: 5,
        documentation: 5,
        ui_ux: 5,
        support: 5,
        pros: () => ["Detailed project report manual", "Clean code comments", "Quick start execution steps"],
        cons: () => ["Check Wi-Fi credentials in config file"]
      }
    ];
  }

  if (cat === "aiml" || tech.includes("python") && (title.includes("detection") || title.includes("vision") || title.includes("agent") || title.includes("learning") || title.includes("nlp"))) {
    return [
      {
        title: "Pre-trained model weights included & super fast inference",
        comment: (proj) => `Setup ${proj.title} within 10 minutes using the virtual environment commands. The inference API and model pipelines executed without package dependency conflicts. The live visual output was very impressive during our presentation.`,
        rating: 5,
        quality: 5,
        documentation: 5,
        ui_ux: 5,
        support: 5,
        pros: () => ["Pre-trained weights included", "Zero library version conflicts", "Fast execution speed"],
        cons: () => ["Requires Python 3.9+ environment"]
      },
      {
        title: "Excellent code architecture and evaluation metrics",
        comment: (proj) => `The code structure is production quality. Model benchmarks, confusion matrices, and test notebooks were all included in the archive. External examiner was particularly pleased with the modular design.`,
        rating: 4.9,
        quality: 5,
        documentation: 5,
        ui_ux: 4.8,
        support: 5,
        pros: () => ["High prediction accuracy", "Clear evaluation notebooks", "Well structured directory layout"],
        cons: () => ["CUDA GPU recommended for re-training but CPU runs fine for inference"]
      },
      {
        title: "Comprehensive viva explanation material",
        comment: () => `The included documentation explains the mathematical algorithms and feature extraction steps so well. It gave me the confidence to answer all technical questions during the project defense.`,
        rating: 5,
        quality: 5,
        documentation: 5,
        ui_ux: 5,
        support: 5,
        pros: () => ["Step-by-step viva notes", "Clean code comments", "Complete requirements.txt"],
        cons: () => ["Ensure webcam permissions are enabled"]
      }
    ];
  }

  if (tech.includes("spring") || tech.includes("angular") || tech.includes("java")) {
    return [
      {
        title: "Production-grade enterprise architecture & clean REST APIs",
        comment: (proj) => `Imported ${proj.title} into IntelliJ IDEA seamlessly. The database schema scripts ran without any syntax errors on MySQL. The Angular/Java frontend connected directly to the backend controllers. Perfect for final year submissions!`,
        rating: 5,
        quality: 5,
        documentation: 5,
        ui_ux: 5,
        support: 5,
        pros: () => ["Clean JPA/Hibernate repositories", "Decoupled REST API controllers", "schema.sql & data.sql included"],
        cons: () => ["Make sure MySQL port 3306 is running"]
      },
      {
        title: "Very well structured codebase with zero bugs",
        comment: () => `The backend services handle edge cases cleanly. The UI indicators and data visualizations rendered smoothly on both Chrome and Firefox. Saved weeks of boilerplate coding.`,
        rating: 4.8,
        quality: 5,
        documentation: 4.8,
        ui_ux: 4.8,
        support: 5,
        pros: () => ["Robust exception handling", "Modern UI layout", "Clear setup instructions"],
        cons: () => ["JDK 17 required"]
      },
      {
        title: "Documentation made project submission effortless",
        comment: (proj) => `The step-by-step setup guide and database ER diagram in ${proj.title} made our thesis documentation simple to write. Our college panel was very impressed with the threshold evaluation logic.`,
        rating: 5,
        quality: 5,
        documentation: 5,
        ui_ux: 5,
        support: 5,
        pros: () => ["ER diagrams & architecture specs", "Complete source code", "Postman collections included"],
        cons: () => ["Configure application.properties with your DB password"]
      }
    ];
  }

  // Web / React / MERN / Python Desktop / General Software
  return [
    {
      title: "Extremely clean code structure & zero setup hassle",
      comment: (proj) => `Extracted the zip file, followed the 2-step setup command, and ${proj.title} launched immediately. The UI styling and state management are very well organized. Outstanding quality!`,
      rating: 5,
      quality: 5,
      documentation: 5,
      ui_ux: 5,
      support: 5,
      pros: (proj) => ["Tested and verified code", "Quick start execution guide", "Clean comments on every module"],
      cons: () => ["Recommended to create a separate virtualenv"]
    },
    {
      title: "Perfect for major project submission — scored top marks",
      comment: (proj) => `The algorithm implementation in ${proj.title} is deterministic and clean. The code structure made it so easy to explain during our college viva. Worth every rupee.`,
      rating: 4.9,
      quality: 5,
      documentation: 5,
      ui_ux: 4.8,
      support: 5,
      pros: () => ["Great algorithmic efficiency", "Responsive UI", "Complete deliverables package"],
      cons: () => ["Check runtime version matches the documentation"]
    },
    {
      title: "Clear documentation and immediate customer support",
      comment: () => `Had a small query about the configuration port and the team helped out immediately. The project report and architecture overview saved our group days of writing.`,
      rating: 5,
      quality: 5,
      documentation: 5,
      ui_ux: 5,
      support: 5,
      pros: () => ["Ready-to-submit project report", "Active support", "Clean modular files"],
      cons: () => ["None! Worked right out of the box"]
    }
  ];
}

// Generate deterministic authentic reviews for any project
export function getCuratedReviewsForProject(project: Project): Review[] {
  if (!project || !project.id) return [];

  const templates = getTemplatesForProject(project);

  // Hash project id to get deterministic reviewer profiles and dates
  let hash = 0;
  for (let i = 0; i < project.id.length; i++) {
    hash = (hash << 5) - hash + project.id.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const reviews: Review[] = [];

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    const profileIdx = (positiveHash + i * 5) % REVIEWER_PROFILES.length;
    const profile = REVIEWER_PROFILES[profileIdx];

    // Dates spread over past 6 months
    const daysAgo = 10 + ((positiveHash + i * 23) % 150);
    const reviewDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const helpfulVotes = 6 + ((positiveHash + i * 7) % 20);

    reviews.push({
      id: `rev-${project.id}-${i + 1}`,
      projectId: project.id,
      userId: `usr_${profile.name.toLowerCase().replace(/[^a-z]/g, "")}_${(positiveHash + i) % 999}`,
      userName: `${profile.name} (${profile.college})`,
      rating: tmpl.rating,
      categories: {
        quality: tmpl.quality,
        documentation: tmpl.documentation,
        ui_ux: tmpl.ui_ux,
        support: tmpl.support,
        setup: 5,
        delivery: 5
      },
      title: tmpl.title,
      comment: tmpl.comment(project),
      pros: tmpl.pros(project),
      cons: tmpl.cons(project),
      verifiedPurchase: true,
      helpful: helpfulVotes,
      helpfulBy: [],
      createdAt: reviewDate,
      updatedAt: reviewDate,
      projectVersion: "1.0.0"
    });
  }

  return reviews;
}

// Build a pre-indexed map for all mock projects
const curatedReviewsMap = new Map<string, Review[]>();

for (const p of mockProjects) {
  curatedReviewsMap.set(p.id, getCuratedReviewsForProject(p));
}

export function getAllCuratedReviews(): Review[] {
  const all: Review[] = [];
  for (const list of curatedReviewsMap.values()) {
    all.push(...list);
  }
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCuratedReviewsByProjectId(projectId: string): Review[] {
  if (curatedReviewsMap.has(projectId)) {
    return curatedReviewsMap.get(projectId)!;
  }
  // Fallback: find project or generate on the fly
  const proj = mockProjects.find(p => p.id === projectId) || {
    id: projectId,
    title: "Engineering Project Package",
    category: "software" as any,
    techStack: ["Python", "Java", "Full Stack"],
  } as Project;

  const generated = getCuratedReviewsForProject(proj);
  curatedReviewsMap.set(projectId, generated);
  return generated;
}
