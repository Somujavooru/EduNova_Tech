import { 
  Cpu, Code, Wifi, MonitorPlay, BrainCircuit, Bot, 
  Globe, Smartphone, Cloud, ShieldCheck 
} from "lucide-react";

export type CategoryKey = 
  | "hardware" 
  | "software" 
  | "iot" 
  | "embedded" 
  | "aiml" 
  | "robotics" 
  | "web" 
  | "mobile" 
  | "cloud" 
  | "cybersecurity";

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: CategoryKey;
  name: string;
  icon: any; // Lucide icon
  subCategories: SubCategory[];
}

export const categories: Category[] = [
  {
    id: "hardware",
    name: "Hardware Projects",
    icon: Cpu,
    subCategories: [
      { id: "hw-arduino", name: "Arduino Projects" },
      { id: "hw-esp32", name: "ESP32 Projects" },
      { id: "hw-pi", name: "Raspberry Pi" },
      { id: "hw-sensors", name: "Sensor-Based Systems" }
    ]
  },
  {
    id: "software",
    name: "Software & Desktop Apps",
    icon: Code,
    subCategories: [
      { id: "soft-python", name: "Python Applications" },
      { id: "soft-java", name: "Java Applications" },
      { id: "soft-games", name: "Games & Arcade" },
      { id: "soft-tools", name: "Desktop Utilities" },
      { id: "web-python", name: "Python Scripts & GUI" },
      { id: "web-java", name: "Java GUI & Swing" }
    ]
  },
  {
    id: "web",
    name: "Web Development",
    icon: Globe,
    subCategories: [
      { id: "web-java", name: "Java Web Development" },
      { id: "web-python", name: "Python Web Development" },
      { id: "web-mern", name: "MERN Stack" },
      { id: "web-react", name: "React Projects" },
      { id: "web-fullstack", name: "Full Stack Development" },
      { id: "web-nextjs", name: "Next.js Projects" }
    ]
  },
  {
    id: "mobile",
    name: "Mobile App Development",
    icon: Smartphone,
    subCategories: [
      { id: "mob-android", name: "Android Apps" },
      { id: "mob-flutter", name: "Flutter Apps" },
      { id: "mob-reactnative", name: "React Native Apps" },
      { id: "mob-kotlin", name: "Kotlin Apps" },
      { id: "mob-java", name: "Java Android Apps" }
    ]
  },
  {
    id: "iot",
    name: "IoT Projects",
    icon: Wifi,
    subCategories: [
      { id: "iot-home", name: "Smart Home" },
      { id: "iot-agri", name: "Smart Agriculture" },
      { id: "iot-industrial", name: "Industrial IoT" },
      { id: "iot-health", name: "Healthcare IoT" },
      { id: "iot-monitor", name: "IoT Monitoring Systems" }
    ]
  },
  {
    id: "embedded",
    name: "Embedded Systems",
    icon: MonitorPlay,
    subCategories: [
      { id: "emb-arduino", name: "Arduino Projects" },
      { id: "emb-esp32", name: "ESP32 Projects" },
      { id: "emb-automation", name: "Automation Projects" },
      { id: "emb-smart", name: "Smart Systems" }
    ]
  },
  {
    id: "aiml",
    name: "AI/ML Projects",
    icon: BrainCircuit,
    subCategories: [
      { id: "ai-ml", name: "Machine Learning" },
      { id: "ai-cv", name: "Computer Vision" },
      { id: "ai-nlp", name: "NLP Projects" },
      { id: "ai-auto", name: "AI Automation" },
      { id: "ai-dl", name: "Deep Learning" }
    ]
  },
  {
    id: "robotics",
    name: "Robotics",
    icon: Bot,
    subCategories: [
      { id: "rob-arm", name: "Robotic Arms" },
      { id: "rob-rover", name: "Rovers & Drones" }
    ]
  },
  {
    id: "cloud",
    name: "Cloud Projects",
    icon: Cloud,
    subCategories: [
      { id: "cloud-aws", name: "AWS Infrastructure" },
      { id: "cloud-k8s", name: "Kubernetes" }
    ]
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    icon: ShieldCheck,
    subCategories: [
      { id: "sec-pentest", name: "Penetration Testing" },
      { id: "sec-crypto", name: "Cryptography" }
    ]
  }
];
