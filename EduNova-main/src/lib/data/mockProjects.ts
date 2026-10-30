import { CategoryKey } from "./categories";
import { pdfCatalogProjects } from "./pdfCatalog";

export interface Project {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  reviewsCount: number;
  category: CategoryKey;
  subCategoryIds: string[];
  sellerName: string;
  thumbnail: string;
  previewImages: string[];
  createdAt: string;
  techStack: string[];
  status: "pending" | "approved" | "rejected";
  featured: "none" | "trending" | "featured" | "recommended" | "banner";
  uploadedBy: string;
  // Marketplace integration (optional)
  fromCustomRequest?: boolean;
  originalRequestId?: string;
  originalRequesterEmail?: string;
  originalCustomPrice?: number;
  // Delivery & Demo
  driveUrl?: string;
  demoVideoUrl?: string;
  finalDeliverables?: string[];
  deliverables?: import("./deliverables").ProjectDeliverable[];
  githubUrl?: string;
  readyToDownload?: boolean;

  // Rich Technical Details
  architectureOverview?: string;
  featuresList?: string[];
  projectStructure?: {
    layer: string;
    items: string[];
  }[];
  howItWorks?: string[];
  gettingStarted?: {
    title: string;
    command?: string;
    details?: string;
  }[];
  commonIssues?: {
    issue: string;
    solution: string;
  }[];
  futureImprovements?: string[];
}

/**
 * Determines whether a catalog project is ready for instant download (Buy & Download)
 * or requires a custom build on order (Order Project with 25% advance milestone).
 */
export function isProjectReadyToDownload(project?: Partial<Project> | null): boolean {
  if (!project) return false;
  if (typeof project.readyToDownload === "boolean") {
    return project.readyToDownload;
  }
  if (project.driveUrl && project.driveUrl.trim().length > 0) {
    return true;
  }
  return false;
}

let projectsData: Project[] = [
  ...pdfCatalogProjects,
  {
    id: "proj-predictive-maintenance",
    title: "Predictive Maintenance Lite",
    description: "A full-stack web application for monitoring assets and predicting maintenance needs using threshold-based evaluation. Built with a modern industrial UI and real-time data visualization.",
    price: 3299,
    rating: 4.9,
    reviewsCount: 35,
    category: "web",
    subCategoryIds: ["web-fullstack", "web-java"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/predictive-maintenance.jpg",
    previewImages: ["/projects/predictive-maintenance.jpg"],
    createdAt: "2024-05-12T10:00:00Z",
    techStack: [
      "Spring Boot (Java)",
      "Angular 17",
      "MySQL",
      "Hibernate / JPA",
      "REST APIs",
      "Angular Material",
      "ng2-charts"
    ],
    status: "approved",
    featured: "banner",
    uploadedBy: "Somujavooru",
    readyToDownload: true,
    driveUrl: "https://drive.google.com/drive/folders/edunova-demo-predictive-maintenance",
    finalDeliverables: [
      "Spring Boot Backend Source Code",
      "Angular 17 Industrial UI Code",
      "MySQL schema.sql & data.sql Scripts",
      "Postman API Collection",
      "Step-by-Step Installation Manual"
    ],
    architectureOverview: "A decoupled enterprise architecture connecting physical IoT sensor telemetry to a Spring Boot reactive processing pipeline and an Angular 17 industrial dashboard. Ingests high-frequency sensor readings, runs real-time threshold algorithms, and preemptively generates work orders before equipment failure occurs.",
    featuresList: [
      "Real-time asset monitoring and status indicators (including NEEDS_ATTENTION & CRITICAL)",
      "Interactive data visualization with real-time machine degradation charts (ng2-charts)",
      "Threshold-based anomaly detection evaluated on sensor streams",
      "Automatic maintenance ticket generation upon threshold exceedance",
      "Comprehensive maintenance ticket lifecycle management and workflow tracking",
      "Production-ready REST API integration with CORS enabled for Angular frontend",
      "Sleek dark industrial UI theme designed with Angular Material components"
    ],
    projectStructure: [
      {
        layer: "🔙 Backend (Spring Boot 3 + Java)",
        items: [
          "Entities: Asset, Sensor, Reading, Threshold, MaintenanceTicket",
          "Repositories: Spring Data JPA repositories with custom JPQL queries",
          "Services: MaintenanceService (threshold evaluation engine), ReadingService",
          "Controllers: AssetController, ReadingController, ThresholdController, TicketController",
          "DTOs: OpenCountDto, ThresholdDto, HealthStatusDto",
          "Configuration: CORS enabled for Angular frontend (localhost:4200)",
          "Database Scripts: schema.sql (DDL tables), data.sql (seed assets & thresholds)"
        ]
      },
      {
        layer: "🎨 Frontend (Angular 17 + Angular Material)",
        items: [
          "Components: Asset List, Reading Chart, Threshold Form, Ticket Panel",
          "Services: AssetService, ReadingService, ThresholdService, TicketService",
          "Models: Asset, Reading, Threshold, Ticket, OpenCountDto, Page",
          "UI Features: Dark industrial theme, status indicators (NEEDS_ATTENTION, CRITICAL), responsive charts"
        ]
      }
    ],
    howItWorks: [
      "1. Sensor readings (vibration, temperature, oil pressure) are stored in the MySQL database.",
      "2. Specific operational thresholds (warning, critical) are defined for each registered industrial asset.",
      "3. MaintenanceService continuously evaluates incoming readings against asset thresholds in real-time.",
      "4. If thresholds are exceeded → an automated high-priority maintenance ticket is instantly created.",
      "5. The Angular UI renders live status alerts, degradation curves, and ticket dispatch boards for plant engineers."
    ],
    gettingStarted: [
      {
        title: "1. Database Setup",
        command: "CREATE DATABASE predictive_maintenance;\n-- In backend/src/main/resources/application.properties:\nspring.datasource.username=root\nspring.datasource.password=YOUR_PASSWORD",
        details: "Initialize MySQL on port 3306 and configure connection credentials."
      },
      {
        title: "2. Run Backend (Spring Boot)",
        command: "cd backend\nmvn clean install\nmvn spring-boot:run",
        details: "Spring Boot server starts on http://localhost:8080 with auto-loaded schema and seed data."
      },
      {
        title: "3. Run Frontend (Angular 17)",
        command: "cd frontend\nnpm install\nng serve",
        details: "Angular application is served at http://localhost:4200 with proxy routing."
      }
    ],
    commonIssues: [
      {
        issue: "MySQL Access Denied (Error 1045)",
        solution: "ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword'; FLUSH PRIVILEGES; Verify application.properties password."
      },
      {
        issue: "Port Already in Use (8080 or 4200)",
        solution: "Set 'server.port=8081' in application.properties or run 'ng serve --port 4201'."
      }
    ],
    futureImprovements: [
      "Machine learning-based remaining useful life (RUL) prediction model",
      "Real-time event streaming pipeline with Apache Kafka and WebSockets",
      "Multi-tenant authentication & role management (Plant Admin vs Field Technician)",
      "Cloud deployment containerization (Docker Compose & Kubernetes manifests)"
    ]
  },
  {
    id: "proj-solar-agri-robot",
    title: "Solar-Based Agriculture Robot",
    description: "IoT-based solar-powered autonomous agriculture rover utilizing ESP8266 and Firebase for automated seed planting, pesticide spraying, grass trimming, and obstacle avoidance.",
    price: 3499,
    rating: 5.0,
    reviewsCount: 42,
    category: "iot",
    subCategoryIds: ["iot-agri", "hw-esp32", "hw-sensors", "rob-rover"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/solar-agri-robot.jpg",
    previewImages: ["/projects/solar-agri-robot.jpg"],
    createdAt: "2024-04-16T14:37:00Z",
    techStack: ["ESP8266", "Firebase", "C++", "Solar Power", "Ultrasonic Sensors", "Robotics"],
    status: "approved",
    featured: "trending",
    uploadedBy: "Somujavooru",
    readyToDownload: false,
    finalDeliverables: [
      "ESP8266 Microcontroller Code",
      "Circuit Diagram & Schematics",
      "Firebase Realtime DB Rules",
      "Chassis 3D Assembly Manual"
    ],
    architectureOverview: "Autonomous agritech rover designed for field navigation without fossil fuels. Uses solar harvesting to charge onboard lithium-ion cells while an ESP8266 microchip coordinates ultrasonic collision avoidance, DC motor drive trains, seed distribution servos, and liquid fertilizer pump relays.",
    featuresList: [
      "100% solar powered with integrated MPPT charge management circuit",
      "Real-time bidirectional synchronization with Firebase Realtime Database",
      "Automated seed drilling and precision metering mechanism",
      "Pressurized liquid pesticide sprayer with motorized nozzle control",
      "High-speed rotating weed/grass trimmer attachment",
      "Ultrasonic HC-SR04 obstacle detection and autonomous path recalculation"
    ],
    projectStructure: [
      {
        layer: "🤖 Hardware & Embedded (C++ / Arduino IDE)",
        items: [
          "Microcontroller: NodeMCU ESP8266 with 802.11 b/g/n Wi-Fi",
          "Power System: 12V 20W Monocrystalline Solar Panel + 3S Li-ion BMS",
          "Actuators: 4x High-torque Geared DC Motors (L298N Driver), Micro Servos",
          "Sensors: HC-SR04 Ultrasonic Distance, Soil Moisture Probe, Battery Voltage Divider"
        ]
      },
      {
        layer: "☁️ Cloud & Telemetry (Firebase)",
        items: [
          "Firebase Realtime Database: JSON tree for coordinates, battery %, and motor commands",
          "Mobile App Web Dashboard: Real-time telemetry monitoring and manual override joystick"
        ]
      }
    ],
    howItWorks: [
      "1. Solar panels feed energy into the onboard battery bank via the charging circuit.",
      "2. The robot boots into autonomous agricultural grid patrol mode.",
      "3. Ultrasonic sensors continually scan forward 180° for terrain obstacles.",
      "4. Relays trigger seed dispensing at calibrated distance intervals.",
      "5. All operations and battery telemetry stream in real time to the Firebase Cloud console."
    ],
    gettingStarted: [
      {
        title: "1. Hardware Wiring & Calibration",
        details: "Wire ESP8266 pins to L298N motor driver according to included schematic. Connect ultrasonic sensor trigger to D5 and echo to D6."
      },
      {
        title: "2. Firmware Flashing",
        command: "// In Arduino IDE:\n// Open 'Solar_Agri_Robot.ino'\n// Set WiFi SSID and Firebase Secret Key\n// Board: NodeMCU 1.0 (ESP-12E Module) -> Click Upload",
        details: "Upload the C++ sketch using a standard Micro-USB cable at 115200 baud."
      }
    ],
    futureImprovements: [
      "GPS waypoint navigation with RTK centimeter-level positioning",
      "AI computer vision weed detection camera to spray only weeds, not crops"
    ]
  },
  {
    id: "proj-ai-skill-agent",
    title: "AI-Powered Skill Assessment Agent",
    description: "An autonomous AI agent designed to evaluate candidate skill levels, conduct automated technical interviews, and synthesize comprehensive proficiency benchmarks with actionable feedback.",
    price: 2999,
    rating: 4.9,
    reviewsCount: 38,
    category: "aiml",
    subCategoryIds: ["ai-ml", "ai-nlp", "ai-auto"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/skill-assessment-agent.jpg",
    previewImages: ["/projects/skill-assessment-agent.jpg"],
    createdAt: "2024-04-26T19:33:00Z",
    techStack: ["Python", "LangChain", "OpenAI", "NLP", "FastAPI"],
    status: "approved",
    featured: "featured",
    uploadedBy: "Somujavooru",
    readyToDownload: false,
    finalDeliverables: [
      "Full Python Source Code",
      "Agent Architecture Documentation",
      "Sample Benchmark Datasets",
      "Quickstart Setup Guide"
    ],
    architectureOverview: "Agentic AI workflow utilizing LangChain and large language models to conduct dynamic adaptive technical interviews, evaluate code snippets, and benchmark candidates against industry engineering standards.",
    featuresList: [
      "Adaptive technical assessment agent that adjusts question difficulty dynamically",
      "Automated code review and algorithmic efficiency scoring with AST analysis",
      "Candidate proficiency radar chart generation across 6 core skill dimensions",
      "Comprehensive evaluation PDF report generation with actionable study recommendations",
      "FastAPI backend with streaming evaluation responses"
    ],
    projectStructure: [
      {
        layer: "🤖 Agentic Core (Python + LangChain)",
        items: [
          "agent/skill_evaluator.py: Autonomous LangChain agent coordinating prompt chains",
          "evaluation/rubric.py: Scoring matrices and benchmarking rubrics",
          "prompts/interviewer.py: Specialized interview prompts by engineering role",
          "api/app.py: FastAPI server with WebSocket support for live interactive interviews"
        ]
      }
    ],
    howItWorks: [
      "1. Recruiter or candidate selects target skill domain and target seniority level.",
      "2. Agent generates contextual questions and evaluates candidate responses.",
      "3. The agent analyzes correctness, logic depth, and edge-case handling.",
      "4. Synthesizes a benchmark score with detailed improvement points and generates study roadmaps."
    ],
    gettingStarted: [
      {
        title: "1. Setup & Environment Variables",
        command: "# Extract purchased project archive\nunzip ai-powered-skill-assessment-agent.zip\ncd AI-Powered-Skill-Assessment-Agent\npip install -r requirements.txt\n# Set OPENAI_API_KEY=your_key in .env",
        details: "Requires Python 3.10+ and an OpenAI API key."
      },
      {
        title: "2. Run Assessment Agent",
        command: "uvicorn app:app --reload --port 8000",
        details: "Open http://localhost:8000/docs to interact with the assessment endpoints."
      }
    ],
    futureImprovements: [
      "Live voice conversational interview capability with Whisper AI and TTS",
      "Real-time IDE sandbox execution for interactive coding challenges"
    ]
  },
  {
    id: "proj-esp32-cam-display",
    title: "ESP32-CAM Face Recognition & TFT Display",
    description: "Edge computing embedded vision system featuring ESP32-CAM for real-time face detection, identity verification, and visual output on a connected SPI TFT screen.",
    price: 2999,
    rating: 4.9,
    reviewsCount: 34,
    category: "embedded",
    subCategoryIds: ["emb-esp32", "ai-cv", "hw-sensors"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/esp32-cam-display.jpg",
    previewImages: ["/projects/esp32-cam-display.jpg"],
    createdAt: "2024-06-20T12:00:00Z",
    techStack: ["ESP32-CAM", "C++", "OpenCV", "SPI TFT Display", "Edge AI"],
    status: "approved",
    featured: "recommended",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["ESP-WHO / Camera Code", "TFT SPI Graphic Driver Code", "Circuit Wiring Diagram", "Model Weights"]
  },
  {
    id: "proj-hospital-appointment",
    title: "Government Hospital Appointment Management",
    description: "Comprehensive OPD appointment booking, doctor allocation, and patient queue management web application designed to reduce crowding and optimize hospital efficiency.",
    price: 3299,
    rating: 4.8,
    reviewsCount: 31,
    category: "web",
    subCategoryIds: ["web-fullstack", "web-react", "web-mern"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/hospital-appointment.jpg",
    previewImages: ["/projects/hospital-appointment.jpg"],
    createdAt: "2024-04-16T20:00:00Z",
    techStack: ["HTML5", "CSS3", "JavaScript", "PHP", "MySQL", "Bootstrap"],
    status: "approved",
    featured: "recommended",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["Frontend & Backend Source Code", "Database Schema SQL Dump", "Admin & Doctor Dashboard", "Installation Guide"]
  },
  {
    id: "proj-gas-leakage",
    title: "LPG Gas Leakage Detection System",
    description: "Smart safety alert system using MQ-2 gas sensor and microcontroller to instantly detect hazardous gas leaks, trigger high-decibel alarms, and notify users via SMS.",
    price: 3299,
    rating: 4.9,
    reviewsCount: 29,
    category: "hardware",
    subCategoryIds: ["hw-sensors", "hw-arduino", "iot-home", "emb-smart"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/gas-leakage.jpg",
    previewImages: ["/projects/gas-leakage.jpg"],
    createdAt: "2024-03-25T11:00:00Z",
    techStack: ["Arduino", "MQ-2 Gas Sensor", "GSM Module", "C++", "Buzzer", "LCD Display"],
    status: "approved",
    featured: "none",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["Arduino C++ Firmware", "Wiring Schematic Diagram", "Component Bill of Materials (BOM)", "Project Report"]
  },
  {
    id: "proj-esp32-ota",
    title: "ESP32 OTA Wireless Firmware Update System",
    description: "Robust Over-The-Air firmware updater for ESP32 systems allowing seamless wireless flashing, version rollback, and device telemetry via Web UI without physical cables.",
    price: 3299,
    rating: 4.8,
    reviewsCount: 24,
    category: "embedded",
    subCategoryIds: ["emb-esp32", "hw-esp32", "iot-industrial"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/esp32-ota.jpg",
    previewImages: ["/projects/esp32-ota.jpg"],
    createdAt: "2024-06-18T05:00:00Z",
    techStack: ["ESP32", "C++", "WiFi OTA", "AsyncWebServer", "Embedded Systems"],
    status: "approved",
    featured: "none",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["ESP32 Firmware Source", "Embedded Web Interface", "Partition Table Config", "Flash Instructions"]
  },
  {
    id: "proj-social-publisher",
    title: "Automated Social Media Publisher",
    description: "Autonomous content scheduler and broadcasting engine that distributes social posts, images, and updates across multiple network APIs with queue management and error retries.",
    price: 2999,
    rating: 4.7,
    reviewsCount: 21,
    category: "web",
    subCategoryIds: ["web-fullstack", "web-mern"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/social-publisher.jpg",
    previewImages: ["/projects/social-publisher.jpg"],
    createdAt: "2024-05-08T18:50:00Z",
    techStack: ["Node.js", "Express", "REST APIs", "OAuth 2.0", "Cron Automation"],
    status: "approved",
    featured: "none",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["Node.js Backend Engine", "API Webhook Handlers", "Scheduler Configs", "Environment Setup Docs"]
  },
  {
    id: "proj-food-health",
    title: "Food & Health Tracker App",
    description: "Personalized nutrition and daily wellness tracking web application offering meal logging, caloric breakdown analytics, macro charts, and curated dietary advice.",
    price: 3299,
    rating: 4.7,
    reviewsCount: 26,
    category: "web",
    subCategoryIds: ["web-react", "web-fullstack"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/food-health.jpg",
    previewImages: ["/projects/food-health.jpg"],
    createdAt: "2024-04-27T10:50:00Z",
    techStack: ["JavaScript", "React", "Node.js", "Tailwind CSS", "Nutrition API"],
    status: "approved",
    featured: "none",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["React Frontend Source", "REST API Backend", "Nutrition Database Config", "Deployment Guide"]
  },
  {
    id: "proj-somu-portfolio",
    title: "Modern Developer Portfolio",
    description: "Modern responsive developer portfolio with animated UI elements, interactive project showcase modals, dark aesthetic theme, and direct contact integration.",
    price: 2999,
    rating: 4.9,
    reviewsCount: 17,
    category: "web",
    subCategoryIds: ["web-react", "web-fullstack"],
    sellerName: "Somashekhar Javooru",
    thumbnail: "/projects/developer-portfolio.jpg",
    previewImages: ["/projects/developer-portfolio.jpg"],
    createdAt: "2024-04-30T22:00:00Z",
    techStack: ["HTML5", "CSS3", "JavaScript", "Tailwind CSS", "Responsive Design"],
    status: "approved",
    featured: "none",
    uploadedBy: "Somujavooru",
    finalDeliverables: ["Complete Responsive Source Code", "Interactive Animation Assets", "Deployment Ready Setup"]
  },
  {
    id: "p1",
    title: "Smart Home Automation Hub",
    description: "A complete IoT based smart home hub using ESP32, React, and MQTT. Includes real-time monitoring, device control, and automated scheduling.",
    price: 3299,
    rating: 4.8,
    reviewsCount: 34,
    category: "iot",
    subCategoryIds: ["iot-home", "hw-esp32"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/smart-home.png",
    previewImages: ["/projects/smart-home.png"],
    createdAt: "2024-04-10T10:00:00Z",
    techStack: ["ESP32", "React", "MQTT", "Node.js"],
    status: "approved",
    featured: "banner",
    uploadedBy: "user_1"
  },
  {
    id: "p2",
    title: "AI Face Recognition System",
    description: "Python-based computer vision project for real-time face detection and recognition using deep learning models with high accuracy.",
    price: 2999,
    rating: 4.9,
    reviewsCount: 56,
    category: "aiml",
    subCategoryIds: ["ai-cv", "ai-ml"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/face-recognition.png",
    previewImages: ["/projects/face-recognition.png"],
    createdAt: "2024-04-15T12:30:00Z",
    techStack: ["Python", "OpenCV", "TensorFlow"],
    status: "approved",
    featured: "featured",
    uploadedBy: "user_1"
  },
  {
    id: "p3",
    title: "MERN Stack E-Commerce Platform",
    description: "Full-stack scalable e-commerce site with payment gateway integration, admin dashboard, and order management system.",
    price: 4500,
    rating: 4.7,
    reviewsCount: 12,
    category: "web",
    subCategoryIds: ["web-mern", "web-fullstack", "web-react"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/ecommerce.png",
    previewImages: ["/projects/ecommerce.png"],
    createdAt: "2024-05-01T08:00:00Z",
    techStack: ["MongoDB", "Express", "React", "Node.js"],
    status: "approved",
    featured: "none",
    uploadedBy: "user_1"
  },
  {
    id: "p4",
    title: "Arduino Smart Irrigation System",
    description: "Automated plant watering system using soil moisture sensors with real-time monitoring and mobile notifications.",
    price: 2999,
    rating: 4.5,
    reviewsCount: 89,
    category: "hardware",
    subCategoryIds: ["hw-arduino", "hw-sensors", "iot-agri"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/irrigation.png",
    previewImages: ["/projects/irrigation.png"],
    createdAt: "2024-03-20T14:15:00Z",
    techStack: ["Arduino UNO", "C++", "Sensors"],
    status: "approved",
    featured: "none",
    uploadedBy: "user_2"
  },
  {
    id: "p5",
    title: "Flutter Food Delivery App",
    description: "Cross-platform mobile application with Firebase backend, real-time order tracking, and payment integration.",
    price: 3200,
    rating: 4.6,
    reviewsCount: 22,
    category: "mobile",
    subCategoryIds: ["mob-flutter"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/food-delivery.png",
    previewImages: ["/projects/food-delivery.png"],
    createdAt: "2024-05-05T09:45:00Z",
    techStack: ["Flutter", "Dart", "Firebase"],
    status: "approved",
    featured: "none",
    uploadedBy: "user_1"
  },
  {
    id: "p6",
    title: "Next.js SaaS Dashboard UI Kit",
    description: "Premium glowing dashboard templates for modern startups with analytics, charts, and responsive layouts.",
    price: 3299,
    rating: 5.0,
    reviewsCount: 104,
    category: "web",
    subCategoryIds: ["web-nextjs", "web-react"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/saas-dashboard.png",
    previewImages: ["/projects/saas-dashboard.png"],
    createdAt: "2024-05-08T16:20:00Z",
    techStack: ["Next.js", "Tailwind CSS", "Framer Motion"],
    status: "approved",
    featured: "none",
    uploadedBy: "user_1"
  },
  {
    id: "p7",
    title: "Raspberry Pi Network Ad Blocker",
    description: "Network-wide ad blocking system using Pi-hole concepts with custom DNS filtering and dashboard monitoring.",
    price: 2999,
    rating: 4.4,
    reviewsCount: 18,
    category: "cybersecurity",
    subCategoryIds: ["sec-pentest"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/network-security.png",
    previewImages: ["/projects/network-security.png"],
    createdAt: "2024-02-15T10:00:00Z",
    techStack: ["Raspberry Pi", "Linux", "Networking"],
    status: "approved",
    featured: "none",
    uploadedBy: "user_1"
  },
  {
    id: "p8",
    title: "NLP Sentiment Analysis Bot",
    description: "Analyzes social media text sentiment using advanced NLP algorithms with detailed emotion classification and reporting.",
    price: 2999,
    rating: 4.8,
    reviewsCount: 41,
    category: "aiml",
    subCategoryIds: ["ai-nlp", "ai-ml"],
    sellerName: "EduNova Team",
    thumbnail: "/projects/nlp-sentiment.png",
    previewImages: ["/projects/nlp-sentiment.png"],
    createdAt: "2024-04-28T11:10:00Z",
    techStack: ["Python", "NLTK", "PyTorch", "FastAPI", "React UI"],
    status: "approved",
    featured: "none",
    uploadedBy: "user_1",
    finalDeliverables: [
      "PyTorch Neural Network Checkpoints (.pt)",
      "FastAPI Model Serving API",
      "Interactive Sentiment Word Cloud Visualizer",
      "Social Media Ingestion Pipeline Scripts",
      "Model Evaluation Jupyter Notebooks"
    ],
    architectureOverview: "Transformer-based natural language processing pipeline for real-time social sentiment classification. Tokenizes continuous text streams, computes valence and emotional polarity vectors, and generates interactive word cloud analytics.",
    featuresList: [
      "Real-time social media stream ingestion and sentiment polarity classification",
      "Fine-grained multi-class emotion detection (Joy, Frustration, Neutral, Anxiety)",
      "Dynamic negative sentiment word-cloud generation with TF-IDF weighting",
      "Pre-trained PyTorch transformer models with FastAPI inference endpoint",
      "Interactive data dashboard with historical sentiment trend charts"
    ],
    projectStructure: [
      {
        layer: "🧠 NLP Core & Model Pipeline",
        items: [
          "model/transformer.py: PyTorch RoBERTa-based sentiment classifier",
          "preprocessing/tokenizer.py: Regex text cleaning, tokenization & stopword removal",
          "api/routes.py: FastAPI REST endpoints for single and batch predictions",
          "utils/wordcloud.py: Weighted keyword cluster frequency generator"
        ]
      },
      {
        layer: "🖥️ Frontend UI Dashboard",
        items: [
          "Dashboard: Real-time sentiment distribution gauges and charts",
          "Live Test Sandbox: Interactive text testing input with confidence scores"
        ]
      }
    ],
    howItWorks: [
      "1. Raw text is submitted via REST API or streaming input.",
      "2. Tokenizer filters stopwords, normalizes emojis, and generates tensor embeddings.",
      "3. PyTorch neural network computes classification probabilities across sentiment classes.",
      "4. Results are visualized live with breakdown percentages and emotion tags."
    ],
    gettingStarted: [
      {
        title: "1. Python Environment Setup",
        command: "python -m venv venv\nsource venv/bin/activate # or venv\\Scripts\\activate on Windows\npip install -r requirements.txt",
        details: "Requires Python 3.9+ and PyTorch."
      },
      {
        title: "2. Download NLP Models & Launch API",
        command: "python download_models.py\nuvicorn api.main:app --reload --port 8000",
        details: "Inference API available at http://localhost:8000/docs"
      }
    ],
    futureImprovements: [
      "Multilingual translation integration for 20+ regional languages",
      "Aspect-based sentiment analysis (ABSA) for specific product features"
    ]
  }
];

import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { logger } from "../logger";

// Keep backward-compatible export as empty for now, UI must be updated to use async
export const mockProjects: Project[] = projectsData;

// Seed data function to ensure projects exist in Firestore.
// Only called from admin paths — under the new write rule a guest would be denied.
const seedProjectsIfEmpty = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    if (querySnapshot.empty) {
      logger.log("Seeding projects collection in Firestore...");
      for (const project of projectsData) {
        await setDoc(doc(db, "projects", project.id), project);
      }
      logger.log("Projects seeded successfully.");
    }
  } catch (err: any) {
    console.warn("[Projects] Seeding skipped (likely permissions):", err?.code || err?.message);
  }
};

/**
 * Defensive sanitizer to ensure no project ever causes runtime crashes
 * from missing or undefined arrays/properties (e.g. subCategoryIds, techStack).
 */
export const sanitizeProject = (raw: any): Project => {
  if (!raw) {
    return {
      id: "unknown",
      title: "Untitled Project",
      description: "",
      price: 2999,
      rating: 4.8,
      reviewsCount: 0,
      category: "software",
      subCategoryIds: [],
      sellerName: "EduNova Team",
      thumbnail: "/projects/predictive-maintenance.jpg",
      previewImages: ["/projects/predictive-maintenance.jpg"],
      createdAt: new Date().toISOString(),
      techStack: [],
      status: "approved",
      featured: "none",
      uploadedBy: "system",
      finalDeliverables: [],
      featuresList: [],
    };
  }

  const thumbnail = String(raw.thumbnail || "/projects/predictive-maintenance.jpg");
  return {
    ...raw,
    id: String(raw.id || `proj-${Date.now()}`),
    title: String(raw.title || "Untitled Project"),
    description: String(raw.description || ""),
    price: typeof raw.price === "number" && !isNaN(raw.price) ? raw.price : 2999,
    rating: typeof raw.rating === "number" && !isNaN(raw.rating) ? raw.rating : 4.8,
    reviewsCount: typeof raw.reviewsCount === "number" ? raw.reviewsCount : 0,
    category: (raw.category as CategoryKey) || "software",
    subCategoryIds: Array.isArray(raw.subCategoryIds) ? raw.subCategoryIds : [],
    sellerName: String(raw.sellerName || "EduNova Team"),
    thumbnail,
    previewImages: Array.isArray(raw.previewImages) && raw.previewImages.length > 0
      ? raw.previewImages
      : [thumbnail],
    createdAt: String(raw.createdAt || new Date().toISOString()),
    techStack: Array.isArray(raw.techStack) ? raw.techStack : [],
    status: raw.status === "rejected" || raw.status === "pending" ? raw.status : "approved",
    featured: raw.featured || "none",
    uploadedBy: String(raw.uploadedBy || "system"),
    finalDeliverables: Array.isArray(raw.finalDeliverables) ? raw.finalDeliverables : [],
    featuresList: Array.isArray(raw.featuresList) ? raw.featuresList : [],
    architectureOverview: raw.architectureOverview || "",
    gettingStarted: Array.isArray(raw.gettingStarted) ? raw.gettingStarted : [],
    commonIssues: Array.isArray(raw.commonIssues) ? raw.commonIssues : [],
    futureImprovements: Array.isArray(raw.futureImprovements) ? raw.futureImprovements : [],
  };
};

/**
 * Public-facing query: returns approved projects.
 * Combines Firestore data with local curated catalog so all projects render cleanly.
 */
export const getPublicProjects = async (): Promise<Project[]> => {
  try {
    const q = query(collection(db, "projects"), where("status", "==", "approved"));
    const querySnapshot = await getDocs(q);
    const firestoreProjects: Project[] = [];
    querySnapshot.forEach((docSnap) => {
      firestoreProjects.push(sanitizeProject(docSnap.data()));
    });

    const firestoreMap = new Map(firestoreProjects.map(p => [p.id, p]));
    const localApproved = projectsData.filter(p => p.status === "approved");
    const result: Project[] = [];
    const seenIds = new Set<string>();

    // Include local approved projects (enriched with any updates saved in Firestore)
    for (const localProj of localApproved) {
      seenIds.add(localProj.id);
      if (firestoreMap.has(localProj.id)) {
        result.push(sanitizeProject({ ...localProj, ...firestoreMap.get(localProj.id) }));
      } else {
        result.push(sanitizeProject(localProj));
      }
    }

    // Include any additional approved projects added strictly through Firestore
    for (const fsProj of firestoreProjects) {
      if (!seenIds.has(fsProj.id)) {
        result.push(sanitizeProject(fsProj));
      }
    }

    return result;
  } catch (err: any) {
    console.warn("[Projects] Firestore query failed, using local fallback data:", err?.code || err?.message);
    return projectsData.filter(p => p.status === "approved").map(sanitizeProject);
  }
};

/**
 * Admin-only query: returns ALL projects regardless of status.
 */
export const getAllProjectsForAdmin = async (): Promise<Project[]> => {
  try {
    await seedProjectsIfEmpty();
    const querySnapshot = await getDocs(collection(db, "projects"));
    const firestoreProjects: Project[] = [];
    querySnapshot.forEach((docSnap) => {
      firestoreProjects.push(docSnap.data() as Project);
    });

    const firestoreMap = new Map(firestoreProjects.map(p => [p.id, p]));
    const result: Project[] = [];
    const seenIds = new Set<string>();

    for (const localProj of projectsData) {
      seenIds.add(localProj.id);
      if (firestoreMap.has(localProj.id)) {
        result.push(sanitizeProject({ ...localProj, ...firestoreMap.get(localProj.id) }));
      } else {
        result.push(sanitizeProject(localProj));
      }
    }

    for (const fsProj of firestoreProjects) {
      if (!seenIds.has(fsProj.id)) {
        result.push(sanitizeProject(fsProj));
      }
    }

    return result;
  } catch (err: any) {
    console.warn("[Projects] Admin fetch failed, using local fallback:", err?.code || err?.message);
    return projectsData.map(sanitizeProject);
  }
};

/**
 * @deprecated Use getPublicProjects() for public pages or getAllProjectsForAdmin() for admin pages.
 */
export const getAllProjects = getPublicProjects;

export function notifyProjectsSync() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("edunova_projects_updated"));
      localStorage.setItem("edunova_projects_sync_time", Date.now().toString());
    } catch {}
  }
}

export const approveProject = async (id: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "projects", id), { status: "approved" });
  } catch (err) {
    console.error("Error approving project in Firestore:", err);
  }
  const idx = projectsData.findIndex(p => p.id === id);
  if (idx !== -1) projectsData[idx] = { ...projectsData[idx], status: "approved" };
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("edunova_project_overrides");
      const map = cached ? JSON.parse(cached) : {};
      map[id] = { ...(map[id] || {}), status: "approved" };
      localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
    } catch {}
  }
  notifyProjectsSync();
};

export const rejectProject = async (id: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "projects", id), { status: "rejected" });
  } catch (err) {
    console.error("Error rejecting project in Firestore:", err);
  }
  const idx = projectsData.findIndex(p => p.id === id);
  if (idx !== -1) projectsData[idx] = { ...projectsData[idx], status: "rejected" };
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("edunova_project_overrides");
      const map = cached ? JSON.parse(cached) : {};
      map[id] = { ...(map[id] || {}), status: "rejected" };
      localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
    } catch {}
  }
  notifyProjectsSync();
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "projects", id));
  } catch (err) {
    console.error("Error deleting project:", err);
  }
  projectsData = projectsData.filter(p => p.id !== id);
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("edunova_project_overrides");
      if (cached) {
        const map = JSON.parse(cached);
        delete map[id];
        localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
      }
    } catch {}
  }
  notifyProjectsSync();
};

export const setProjectFeatured = async (id: string, featured: Project["featured"]): Promise<void> => {
  try {
    await updateDoc(doc(db, "projects", id), { featured });
  } catch (err) {
    console.error("Error setting featured status:", err);
  }
  const idx = projectsData.findIndex(p => p.id === id);
  if (idx !== -1) projectsData[idx] = { ...projectsData[idx], featured };
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("edunova_project_overrides");
      const map = cached ? JSON.parse(cached) : {};
      map[id] = { ...(map[id] || {}), featured };
      localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
    } catch {}
  }
  notifyProjectsSync();
};

export const addProject = async (project: Project): Promise<void> => {
  try {
    const { getPlatformSettings } = await import("./settings");
    const settings = getPlatformSettings();
    if (settings.autoApproveProjects && project.status === "pending") {
      project.status = "approved";
    }
  } catch {}

  try {
    await setDoc(doc(db, "projects", project.id), project);
  } catch (err) {
    console.error("Error adding project:", err);
  }
  const existingIdx = projectsData.findIndex(p => p.id === project.id);
  if (existingIdx !== -1) {
    projectsData[existingIdx] = project;
  } else {
    projectsData.unshift(project);
  }
  notifyProjectsSync();
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<boolean> => {
  try {
    const docRef = doc(db, "projects", id);
    await setDoc(docRef, { ...updates, id }, { merge: true });

    // Update in-memory projectsData array
    const idx = projectsData.findIndex(p => p.id === id);
    if (idx !== -1) {
      projectsData[idx] = { ...projectsData[idx], ...updates };
    }

    // Update browser localStorage overrides
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("edunova_project_overrides");
        const map = cached ? JSON.parse(cached) : {};
        map[id] = { ...(map[id] || {}), ...updates };
        localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
      } catch {}
    }

    notifyProjectsSync();
    return true;
  } catch (err: any) {
    console.warn("[Projects] Notice updating project in Firestore (applying local override):", err?.message || err);
    const idx = projectsData.findIndex(p => p.id === id);
    if (idx !== -1) {
      projectsData[idx] = { ...projectsData[idx], ...updates };
    }
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("edunova_project_overrides");
        const map = cached ? JSON.parse(cached) : {};
        map[id] = { ...(map[id] || {}), ...updates };
        localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
      } catch {}
    }
    notifyProjectsSync();
    return true;
  }
};

export const purgeRejectedProjects = async (): Promise<number> => {
  let count = 0;
  try {
    const q = query(collection(db, "projects"), where("status", "==", "rejected"));
    const snap = await getDocs(q);
    const delPromises = snap.docs.map(d => {
      count++;
      return deleteDoc(d.ref).catch(() => {});
    });
    await Promise.all(delPromises);
  } catch (err) {
    console.warn("[Projects] Notice purging rejected projects from Firestore:", err);
  }

  const beforeLen = projectsData.length;
  projectsData = projectsData.filter(p => p.status !== "rejected");
  count = Math.max(count, beforeLen - projectsData.length);

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("edunova_project_overrides");
      if (cached) {
        const map = JSON.parse(cached);
        for (const k in map) {
          if (map[k]?.status === "rejected") {
            delete map[k];
          }
        }
        localStorage.setItem("edunova_project_overrides", JSON.stringify(map));
      }
    } catch {}
  }

  notifyProjectsSync();
  return count;
};


