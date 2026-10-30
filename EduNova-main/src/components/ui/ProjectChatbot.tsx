"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Project, isProjectReadyToDownload } from "@/lib/data/mockProjects";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, X, Send, Sparkles, MessageSquare, ArrowRight, 
  ExternalLink, CheckCircle2, Hammer, Zap, IndianRupee,
  Minimize2, Maximize2, RotateCcw, HelpCircle
} from "lucide-react";

interface Props {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  matchedProjects?: Project[];
  timestamp: string;
}

const STARTER_PROMPTS = [
  "☕ Show me Java projects",
  "🐍 Python Desktop & GUI",
  "💰 Projects under ₹3,500",
  "⚡ Instant Download projects",
  "🛡️ How does 25% Advance work?",
  "📦 Check Order Status",
  "✉️ Contact Support Team",
];

// Helper to normalize common typos
function normalizeUserQuery(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b(wnat|wnt)\b/g, "want")
    .replace(/\b(cntact|kontact|conatct|cotact)\b/g, "contact")
    .replace(/\b(soprt|suport|supprt|suporting)\b/g, "support")
    .replace(/\b(hw|hwo)\b/g, "how")
    .replace(/\b(wht|wat)\b/g, "what")
    .replace(/\b(ths|thz)\b/g, "this")
    .replace(/\b(reash|reche)\b/g, "reach")
    .replace(/\b(pyton|pyhton)\b/g, "python")
    .replace(/\b(jva|jav)\b/g, "java")
    .replace(/\b(prject|proejct|porject|projets|projct)\b/g, "project")
    .replace(/\b(pyament|paymnt|paymnet)\b/g, "payment")
    .replace(/\b(refnd|refudn)\b/g, "refund")
    .replace(/\b(dwnload|dowload|donwload)\b/g, "download")
    .replace(/\b(trak|trck)\b/g, "track")
    .replace(/\b(ordr|oder|odr)\b/g, "order")
    .replace(/\b(ststus|staus|statuss|stat)\b/g, "status")
    .replace(/\b(seardch|serch|srch)\b/g, "search")
    .replace(/\b(chk|chck|ceck)\b/g, "check")
    .replace(/\b(giv|gve)\b/g, "give")
    .replace(/\b(numbr|phn|fone)\b/g, "phone")
    .replace(/\bu\b/g, "you");
}

// Recognized technical vocabulary to prevent non-technical queries from triggering project searches
const TECHNICAL_KEYWORDS = [
  "python", "java", "javascript", "typescript", "c++", "cpp", "c#", "php", "go", "golang", "rust", "html", "css", "sql",
  "react", "nextjs", "next.js", "vue", "angular", "node", "nodejs", "express", "django", "flask", "fastapi", "spring", "springboot", "flutter", "react native",
  "iot", "arduino", "esp32", "esp8266", "raspberry", "embedded", "sensor", "robotics",
  "ai", "ml", "machine learning", "deep learning", "neural", "nlp", "vision", "computer vision", "cnn", "lstm", "opencv",
  "blockchain", "crypto", "cryptocurrency", "smart contract", "solidity", "web3",
  "gui", "tkinter", "desktop", "website", "mobile", "android", "ios", "cloud", "security", "cybersecurity",
  "portfolio", "ecommerce", "e-commerce", "chat", "attendance", "weather", "game", "puzzle", "2048", "calculator",
  "sentiment", "face", "recognition", "detection", "hospital", "management", "traffic", "automation", "dashboard"
];

function renderFormattedLine(line: string): React.ReactNode[] {
  // Regex to match [text](url), **bold**, *italic*, `code`
  const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      elements.push(line.substring(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      // Link: [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      elements.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target={linkUrl.startsWith("http") ? "_blank" : undefined}
          rel={linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-cyan-300 font-semibold underline underline-offset-2 hover:text-cyan-200 transition-colors inline-block"
        >
          {linkText}
        </a>
      );
    } else if (match[4]) {
      // Bold: **text** (handles nested [link](url))
      const boldText = match[4];
      const innerLink = /\[([^\]]+)\]\(([^)]+)\)/.exec(boldText);
      if (innerLink) {
        elements.push(
          <a
            key={`bold-link-${match.index}`}
            href={innerLink[2]}
            target={innerLink[2].startsWith("http") ? "_blank" : undefined}
            rel={innerLink[2].startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-cyan-300 font-bold underline underline-offset-2 hover:text-cyan-200 transition-colors inline-block"
          >
            {innerLink[1]}
          </a>
        );
      } else {
        elements.push(
          <strong key={`bold-${match.index}`} className="text-white font-bold">
            {boldText}
          </strong>
        );
      }
    } else if (match[5]) {
      // Italic: *text*
      const italicText = match[5];
      const innerLink = /\[([^\]]+)\]\(([^)]+)\)/.exec(italicText);
      if (innerLink) {
        elements.push(
          <a
            key={`italic-link-${match.index}`}
            href={innerLink[2]}
            target={innerLink[2].startsWith("http") ? "_blank" : undefined}
            rel={innerLink[2].startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-cyan-300 font-medium italic underline underline-offset-2 hover:text-cyan-200 transition-colors inline-block"
          >
            {innerLink[1]}
          </a>
        );
      } else {
        elements.push(
          <em key={`italic-${match.index}`} className="text-gray-300 italic">
            {italicText}
          </em>
        );
      }
    } else if (match[6]) {
      // Inline code: `code`
      elements.push(
        <code key={`code-${match.index}`} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[11px]">
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    elements.push(line.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [line];
}

function renderFormattedMessage(text: string) {
  return text.split("\n\n").map((para, pIdx) => {
    const lines = para.split("\n");
    return (
      <p key={pIdx} className="mb-2 last:mb-0 leading-relaxed">
        {lines.map((line, lIdx) => (
          <span key={lIdx} className="block">
            {renderFormattedLine(line)}
          </span>
        ))}
      </p>
    );
  });
}

export function ProjectChatbot({ projects, onSelectProject }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "bot",
      text: "Hello and welcome to EduNova Forge! 👋✨\n\nI'm your **EduNova Forge AI Assistant**. Ask me anything: find verified engineering projects, check technical architectures, learn about our **25% advance milestone builds**, track orders, or contact our core team!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, messages, isTyping]);

// Robust helper to extract genuine Order ID or UTR without mistaking words like "order" for IDs
function extractOrderIdOrUtr(text: string): string | null {
  // 1. Explicit prefixed patterns like "order id ORD-123", "order id: 492049", "order number 12345"
  const prefixMatch = text.match(/(?:order\s*id|invoice\s*id|utr\s*number|utr|order\s*#|invoice\s*#|order\s*no)\s*(?:is|:|=|#)?\s*([a-zA-Z0-9-_]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    const candidate = prefixMatch[1].trim();
    const stopWords = new Set(["is", "can", "what", "the", "this", "my", "a", "an", "to", "in", "for", "search", "check", "give", "show", "please", "status"]);
    if (!stopWords.has(candidate.toLowerCase()) && (/\d/.test(candidate) || candidate.includes("-") || candidate.length >= 6)) {
      return candidate;
    }
  }

  // 2. Specific formatted IDs: ORD-..., INV-..., or 10-14 digit UTR (never matches plain words like "order")
  const formatMatch = text.match(/\b(ord[-_][a-zA-Z0-9]+|ord\d+[a-zA-Z0-9]*|inv[-_][a-zA-Z0-9-]+|inv\d+[a-zA-Z0-9]*|\d{10,14})\b/i);
  if (formatMatch && formatMatch[1]) {
    return formatMatch[1].trim();
  }

  // 3. 18-24 character Firestore Document IDs (e.g. KN2HEQDTUuYOqXT0YlaP)
  const firestoreIdMatch = text.match(/\b([a-zA-Z0-9]{18,24})\b/);
  if (firestoreIdMatch && firestoreIdMatch[1]) {
    const candidate = firestoreIdMatch[1].trim();
    if (/\d/.test(candidate) && /[a-zA-Z]/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

  // Local AI Answer & Matching Engine
  const generateResponse = async (query: string): Promise<{ text: string; matchedProjects?: Project[] }> => {
    const rawClean = query.trim().toLowerCase();
    const cleanPunctuation = rawClean.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const normalized = normalizeUserQuery(cleanPunctuation);

    // ─────────────────────────────────────────────────────────────
    // INTENT 1: Contact Team / Support / Talk to Human / Reach Out
    // ─────────────────────────────────────────────────────────────
    const isContactIntent =
      /\b(contact|cntact|talk to|speak with|reach|call|phone|mobile|number|email|mail|gmail|whatsapp|telegram|human|person|agent|team|support|customer|helpdesk|office|address|complaint)\b/i.test(normalized) &&
      (
        normalized.includes("contact") ||
        normalized.includes("team") ||
        normalized.includes("support") ||
        normalized.includes("talk") ||
        normalized.includes("speak") ||
        normalized.includes("reach") ||
        normalized.includes("call") ||
        normalized.includes("email") ||
        normalized.includes("phone") ||
        normalized.includes("whatsapp") ||
        normalized.includes("human") ||
        normalized.includes("helpdesk")
      );

    if (isContactIntent) {
      return {
        text: "**How to Contact the EduNova Forge Team:** 🤝\n\nWe're here to help you with project inquiries, orders, custom builds, or technical questions!\n\n• ✉️ **Official Support Email**: [edunovaforgessupport@gmail.com](mailto:edunovaforgessupport@gmail.com)\n  *(Direct response from our core engineering team within 24 hours)*\n• 📝 **Direct Contact Form**: Submit a message on our **[Contact Page](/contact)**\n• 🛠️ **Custom Project Requests**: For syllabus or college requirements, submit via **[Custom Projects](/requests)**\n• 🕒 **Support Hours**: Monday – Saturday, 9:00 AM – 8:00 PM IST\n\nIf inquiring about an existing order, please include your **Order ID** or UPI transaction reference for faster resolution!",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 2: Order Tracking / Order Status / Live Lookup by ID or UTR
    // ─────────────────────────────────────────────────────────────
    const extractedOrderId = extractOrderIdOrUtr(query);
    const hasOrderKeyword = /\b(order|orders|ord|odr|purchase|invoice)\b/i.test(normalized);
    const hasStatusOrAction = /\b(status|track|tracking|search|check|find|lookup|stage|progress|where|when|delivery|deliver|update|give|id)\b/i.test(normalized);
    const isOrderQuery =
      extractedOrderId !== null ||
      (hasOrderKeyword && hasStatusOrAction) ||
      /\b(where is my order|order status|track order|check order|search order|find order|track my order|my order|delivery status)\b/i.test(normalized);

    if (isOrderQuery) {
      if (extractedOrderId) {
        const queryId = extractedOrderId;
        try {
          const res = await fetch(`/api/orders/status?query=${encodeURIComponent(queryId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.found && data.order) {
              const ord = data.order;
              const stageMap: Record<string, string> = {
                planning: "📋 Planning & Architecture (25%)",
                building: "⚙️ Code Development & Building (50%)",
                testing: "🧪 Testing & Quality Assurance (75%)",
                completed: "📦 Ready for Delivery",
                delivered: "✅ Delivered (100%)",
              };
              const stageText = stageMap[ord.buildStage] || "Live Milestone Progress";
              const statusText =
                ord.status === "approved"
                  ? "✅ Approved & Verified"
                  : ord.status === "rejected"
                  ? "❌ Rejected"
                  : "⏳ Pending Admin Verification";
              const deliveryText =
                ord.deliveryStatus === "delivered" ? "Delivered to your Dashboard" : "In Progress";

              return {
                text: `**Live Order Status Found:** 📦✨\n\n• **Order ID**: \`${ord.id}\`\n• **Invoice ID**: \`${ord.invoiceId || ord.id}\`\n• **Project**: **${ord.projectTitle}** (${ord.projectCategory})\n• **Payment Status**: ${statusText}\n• **Build Milestone**: **${stageText}**\n• **Delivery**: ${deliveryText}\n• **Amount**: ₹${ord.amount?.toLocaleString("en-IN")}\n\n👉 You can view full tracking and download source files directly in your **[Dashboard](/dashboard)**!`,
              };
            }
          }
        } catch (err) {
          console.warn("[Chatbot] Order lookup error:", err);
        }

        return {
          text: `I searched our records for **${queryId}**, but couldn't locate an active order with that ID yet.\n\n• **Check ID**: Please confirm the exact Order ID (e.g., \`ORD-...\`), Invoice ID, or 12-digit UTR.\n• **Recent Payment**: If you just completed UPI payment, our team verifies UTRs within 15–30 minutes.\n• **Account Orders**: You can view all orders associated with your account on your **[Dashboard](/dashboard)**.\n• **Need Help?**: Email [edunovaforgessupport@gmail.com](mailto:edunovaforgessupport@gmail.com) with your payment screenshot for immediate assistance!`,
        };
      }

      // User asked about checking order status without providing an ID yet (e.g. "i will give the order id can u seardch what is ths ststus")
      return {
        text: "**Yes, absolutely! I can look up your order status right here!** 🔍📦\n\nSimply reply with your **Order ID** (for example: `ORD-123456`), **Invoice ID**, or your **12-digit UPI UTR number**.\n\nI will check the verification status, live milestone progress (*Planning → Building → Testing*), and delivery files for your project immediately!\n\n👉 You can also track all your active projects in real-time on your **[Dashboard](/dashboard)**.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 3: Payments, UPI, Safety, Scam, Refund & Verification
    // ─────────────────────────────────────────────────────────────
    const isPaymentSecurityIntent =
      /\b(payment|how to pay|pay|upi|qr|gpay|phonepe|paytm|bhim|utr|transaction|is it safe|safe|scam|fraud|trusted|refund|money back|cancel order)\b/i.test(normalized);

    if (isPaymentSecurityIntent) {
      return {
        text: "**Payments, Verification & Buyer Protection:** 🛡️\n\n• **Payment Method**: Direct UPI (Google Pay, PhonePe, Paytm, BHIM) via dynamic QR code or UPI ID.\n• **Admin UTR Verification**: Every transaction UTR is manually verified by EduNova Forge administrators.\n• **25% Milestone Advance**: For build-on-order projects, you only pay 25% upfront. You review and verify the working deliverables before paying the final 75% balance.\n• **Buyer Protection & Refunds**: If a build fails to meet the agreed syllabus or technical specifications, our support team steps in immediately for revision or full resolution.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 4: How the 25% Advance Milestone Build Works
    // ─────────────────────────────────────────────────────────────
    const isAdvanceBuildIntent =
      /\b(how does advance work|25%|advance work|how does build work|build on order|how to order|ordering process|milestone build)\b/i.test(normalized);

    if (isAdvanceBuildIntent) {
      return {
        text: "**How the 25% Advance Payment Works:** 🚀\n\n1. **Milestone 1 (25% Advance)**: Pay only 25% upfront via UPI QR or ID to initiate project engineering.\n2. **Live Build Tracking**: Track progress live in your **[Dashboard](/dashboard)** (Planning → Building → Quality Testing).\n3. **Milestone 2 (Final 75%)**: Once our engineering team delivers and verifies the full working build, you pay the remaining balance to download the completed source code and assets.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 5: Custom Projects / University Requirements / Syllabus
    // ─────────────────────────────────────────────────────────────
    const isCustomProjectIntent =
      /\b(custom|my idea|college requirement|university|final year|mini project|syllabus|request project|can you make|can you build|build for me|new idea|ieee)\b/i.test(normalized);

    if (isCustomProjectIntent) {
      return {
        text: "**Need a Custom College / University Project?** 🎓\n\nIf your university requires specific modules or an original topic, you can submit a request on our **[Custom Projects Page](/requests)**.\n\n• **Original requesters get FREE lifetime access** once the community build is accepted!\n• Our verified engineers build according to your syllabus, IEEE guidelines, and timeline.\n• Deliverables include complete source code, viva questions, synopsis, setup guide, and presentation slides.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 6: Deliverables / What is Included / Source Code & Zip
    // ─────────────────────────────────────────────────────────────
    const isDeliverablesIntent =
      /\b(what is included|what do i get|source code|zip|files|ppt|report|documentation|synopsis|readme|how to run|setup guide|instructions)\b/i.test(normalized);

    if (isDeliverablesIntent) {
      return {
        text: "**What You Receive with Every EduNova Forge Project:** 📂\n\n1. **100% Complete Source Code**: Clean, well-commented, unencrypted source code ZIP.\n2. **Step-by-Step Setup Guide**: Clear README with environment setup and execution commands.\n3. **Architecture & Design**: High-level system diagrams, component workflows, and database schemas.\n4. **Project Report & PPT** (where specified): Ready for university evaluations and project seminars.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 7: Selling / Submitting / Earning as a Developer
    // ─────────────────────────────────────────────────────────────
    const isSellerIntent =
      /\b(sell|upload project|become seller|contribute|earn money|monetize|creator|submit project)\b/i.test(normalized);

    if (isSellerIntent) {
      return {
        text: "**Monetize & Sell Your Engineering Projects on EduNova Forge:** 💡\n\nAre you a student developer or engineer with original projects?\n\n• You can list your verified code and earn royalties on every order.\n• Reach out to our team at [edunovaforgessupport@gmail.com](mailto:edunovaforgessupport@gmail.com) or submit your details via our **[Contact Page](/contact)** with your GitHub repository link and demo video.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 8: About EduNova Forge / Who Created / Capabilities / Help
    // ─────────────────────────────────────────────────────────────
    const isAboutIntent =
      /\b(who are you|what is edunova|what is edunova forge|about edunova|about edunova forge|about this site|who created|who built|who owns|is this legit|what can you do|help me)\b/i.test(normalized) ||
      normalized === "help";

    if (isAboutIntent) {
      return {
        text: "Welcome to EduNova Forge — Discover • Build • Bring Ideas to Life! 🎓🚀\n\nI'm your **AI Project Assistant**, here to make finding, ordering, and managing your academic projects effortless.\n\n**Here's how I can help:**\n• **Smart Project Search**: Search 150+ verified projects by language (**Java**, **Python**, **React**, **IoT**, **AI/ML**).\n• **25% Advance Builds**: For build-on-order projects, pay just 25% upfront and track live milestone updates in your dashboard.\n• **Instant Downloads**: Browse projects that include ready-to-run source code ZIPs and setup guides.\n• **Budget Filtering**: Find projects within your price range (e.g. *'under ₹3,000'*).\n• **Support & Contact**: Connect directly with our core engineering team.\n\nWhat would you like to explore today?",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 9: Greetings & Casual Small Talk
    // ─────────────────────────────────────────────────────────────
    const greetingWords = new Set([
      "hi", "hii", "hiii", "hello", "helo", "hellow", "hey", "heyy", "heya",
      "hlo", "hy", "hola", "howdy", "yo", "sup", "namaste", "greetings", "welcome",
      "edunova", "bot", "assistant", "there", "friend", "team", "sir", "madam", "bro"
    ]);

    const words = normalized.split(" ").filter(Boolean);
    const isAllGreetings = words.length > 0 && words.every(w => greetingWords.has(w));
    const startsWithGreeting = /^(hi+|hello+|helo+|hey+|heya+|hola|howdy|yo|sup|namaste|greetings)\b/i.test(normalized);
    const isShortGreeting = startsWithGreeting && words.length <= 4;

    if (isAllGreetings || isShortGreeting || /^(good\s*(morning|afternoon|evening|day)|nice\s*to\s*meet\s*you)/i.test(normalized)) {
      return {
        text: "Hello and welcome to EduNova Forge! 👋✨\n\nI'm your AI Project Assistant. I'm here to help you explore our engineering project catalog, recommend projects for your academic needs, check tech stacks, or guide you through our **25% advance milestone build**.\n\n**How can I help you today?** You can ask me:\n• ☕ *'Show me top Java projects'*\n• 🐍 *'Python desktop GUI with Tkinter'*\n• 💰 *'Projects under ₹3,500'*\n• 🛡️ *'How does the 25% advance build work?'*\n• ⚡ *'What projects are ready for instant download?'*\n• ✉️ *'I want to contact the team'*",
      };
    }

    if (/^(thanks?|thank you|thx|awesome|great|cool|perfect|ok|okay)\b/i.test(normalized)) {
      return {
        text: "You're very welcome! 😊 Feel free to ask if you need to find more projects, check source code details, or have questions about ordering. Happy coding! 🚀",
      };
    }

    if (/^(bye|goodbye|see you|cya)\b/i.test(normalized)) {
      return {
        text: "Goodbye! 👋 Best of luck with your engineering projects. Come back anytime!",
      };
    }

    if (normalized.includes("how are you") || normalized.includes("how r u")) {
      return {
        text: "I'm doing great, thank you for asking! 😊 Ready to help you discover awesome engineering projects, guide you on orders, or answer questions about EduNova Forge. What are you working on?",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 10: Budget Filtering (e.g. "under 3000", "under 4000", "cheap")
    // ─────────────────────────────────────────────────────────────
    const budgetMatch = normalized.match(/under\s*₹?\s*(\d+)/i) || normalized.match(/below\s*₹?\s*(\d+)/i) || normalized.match(/less than\s*₹?\s*(\d+)/i);
    if (budgetMatch || (/\b(budget|cheap|affordable)\b/i.test(normalized) && normalized.includes("project"))) {
      const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : 3500;
      const budgetProjects = projects
        .filter(p => (p.price || 0) <= maxBudget)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4);

      if (budgetProjects.length > 0) {
        return {
          text: `Found **${budgetProjects.length}** high-rated projects priced under **₹${maxBudget.toLocaleString("en-IN")}**:`,
          matchedProjects: budgetProjects,
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 11: Direct Project Title / Specific Topic Matching
    // ─────────────────────────────────────────────────────────────
    const matchedProject = projects.find(p => {
      const cleanTitle = p.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const titleWords = cleanTitle.split(/\s+/).filter(w => w.length > 2 && !["with", "and", "the", "for", "using", "gui"].includes(w));
      return titleWords.some(tw => normalized.includes(tw)) || normalized.includes(cleanTitle.trim());
    });

    if (matchedProject && !isAllGreetings && !isShortGreeting) {
      const isReady = isProjectReadyToDownload(matchedProject);
      const advPrice = Math.round(matchedProject.price * 0.25);
      const paymentInfo = isReady
        ? `**Price**: ₹${matchedProject.price.toLocaleString("en-IN")} *(Instant Download Ready)*`
        : `**Total Price**: ₹${matchedProject.price.toLocaleString("en-IN")} • **Pay 25% Advance**: **₹${advPrice.toLocaleString("en-IN")}** to begin development`;

      return {
        text: `**${matchedProject.title}** 🚀\n\n• ${paymentInfo}\n• **Category**: ${matchedProject.category.toUpperCase()}\n• **Tech Stack**: ${matchedProject.techStack.join(", ")}\n• **Includes**: Full unencrypted source code ZIP, step-by-step setup guide, and documentation!\n\nClick the project card below to view details or place your order:`,
        matchedProjects: [matchedProject],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 12: Delivery & Timeline Inquiries
    // ─────────────────────────────────────────────────────────────
    if (/\b(when will i get|delivery time|how many days|how long|timeline|delivery date|duration|time taken|when deliver)\b/i.test(normalized)) {
      return {
        text: "**Project Delivery Timeline:** ⏱️📦\n\n• **Instant Download Projects**: Files are unlocked **immediately** in your Dashboard upon payment approval (typically 10–20 minutes).\n• **Build-on-Order Projects**: Completed and verified within **3 to 7 working days** depending on complexity.\n• **Milestone Progress**: Track live progress (*Planning (25%) → Building (50%) → Testing (75%) → Ready for Delivery*) directly in your **[Dashboard](/dashboard)**!",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 13: Download & Source Code Access
    // ─────────────────────────────────────────────────────────────
    if (/\b(how to download|where to download|where are my files|google drive|drive link|source code download|access code|get code)\b/i.test(normalized)) {
      return {
        text: "**How to Access Your Project Files:** 📥\n\n1. Log in and go to your **[Dashboard](/dashboard)** under **My Projects**.\n2. Once your order payment is verified by our admin, your project card will show a green **Download Source Files** button.\n3. You also receive a direct Google Drive link containing all source files, setup commands, and project report!",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 14: Referral Rewards & Discounts
    // ─────────────────────────────────────────────────────────────
    if (/\b(referral|refer|invite friend|discount code|earn reward|referral code|referrals)\b/i.test(normalized)) {
      return {
        text: "**EduNova Forge Student Referral Rewards:** 🎁\n\n• **Auto-Unlock**: Your unique referral code is activated as soon as your first order (including a 25% advance) is approved!\n• **How It Works**: Share your referral link with college friends. When they buy, they get a welcome discount, and **you earn cash rewards** directly credited to your account for future projects!\n• Check your code and tracking on your **[Dashboard](/dashboard)**.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 15: Technical Project Search (STRICT GUARDRAILS)
    // ─────────────────────────────────────────────────────────────
    const hasSearchVerb = /\b(show|find|search|recommend|list|give me|looking for|best|projects? for|suggest)\b/i.test(normalized);
    const matchedTechTerms = TECHNICAL_KEYWORDS.filter(term => {
      if (term.length <= 2) {
        const rx = new RegExp(`\\b${term}\\b`, "i");
        return rx.test(normalized);
      }
      return normalized.includes(term);
    });

    const isExplicitProjectSearch = hasSearchVerb || matchedTechTerms.length > 0;

    if (isExplicitProjectSearch) {
      // Clean conversational stop words to isolate the core technical search query
      const cleanQuery = normalized
        .replace(/\b(please|show|find|recommend|best|give|me|project|projects|with|using|in|for|can|you|the|a|an|of|and|or|some|good|any|is|are|what|where|about|tell|looking|i|want|need|bot|edunova|site|help|how)\b/gi, " ")
        .trim();

      const searchTerms = cleanQuery.split(/\s+/).filter(w => w.length > 1);

      if (searchTerms.length > 0) {
        const matches = projects.filter(p => {
          const title = (p.title || "").toLowerCase();
          const desc = (p.description || "").toLowerCase();
          const category = (p.category || "").toLowerCase();
          const tech = Array.isArray(p.techStack) ? p.techStack.map(t => String(t).toLowerCase()) : [];
          const subCats = Array.isArray(p.subCategoryIds) ? p.subCategoryIds.map(s => String(s).toLowerCase()) : [];

          return searchTerms.some(term => {
            if (term.length <= 2) {
              const regex = new RegExp(`\\b${term}\\b`, "i");
              return regex.test(title) || regex.test(category) || tech.some(t => regex.test(t));
            }
            return (
              title.includes(term) ||
              desc.includes(term) ||
              category.includes(term) ||
              tech.some(t => t.includes(term)) ||
              subCats.some(s => s.includes(term))
            );
          });
        });

        if (matches.length > 0) {
          const topMatches = matches
            .sort((a, b) => (b.rating || 5) - (a.rating || 5))
            .slice(0, 4);

          return {
            text: `Here are the top **${topMatches.length}** projects matching **"${cleanQuery}"**:`,
            matchedProjects: topMatches,
          };
        }
      }

      // If explicit search had no matches, offer suggestions + fallback
      const fallbackPicks = projects.slice(0, 3);
      return {
        text: `I couldn't find exact matches for "${query}". Try searching by language (**Python**, **Java**, **React**, **IoT**, **AI**), price (**"under ₹3,000"**), or ask about our **25% advance milestone build**.\n\nHere are some of our top trending projects:`,
        matchedProjects: fallbackPicks,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // INTENT 16: Polite Contextual Fallback
    // ─────────────────────────────────────────────────────────────
    return {
      text: "I'm here to help you find the right project or assist with your order! 😊\n\nCould you clarify what you'd like help with? You can ask me:\n• ☕ *'Show me Java or Python projects'*\n• 💰 *'Projects under ₹3,000'*\n• 🛡️ *'How does the 25% advance work?'*\n• 📦 *'Where is my order?'* *(provide Order ID)*\n• 🎓 *'I need a custom university project'*\n• ✉️ *'I want to contact support'*",
    };
  };

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      sender: "user",
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(async () => {
      const response = await generateResponse(userMsg.text);
      const botMsg: ChatMessage = {
        id: "b-" + Date.now(),
        sender: "bot",
        text: response.text,
        matchedProjects: response.matchedProjects,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <>
      {/* ── Floating Launcher Button (Bottom Right) ── */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/90 to-purple-950/90 border border-cyan-400/40 text-cyan-200 text-xs font-semibold shadow-[0_4px_20px_rgba(6,182,212,0.3)] backdrop-blur-md cursor-pointer hover:border-cyan-300 transition-all"
            onClick={() => setIsOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Search or ask anything!</span>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Project Assistant"
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-[1.5px] shadow-[0_8px_30px_rgba(6,182,212,0.4)] flex items-center justify-center group cursor-pointer"
        >
          <div className="w-full h-full rounded-2xl bg-[#0a0f1d] flex items-center justify-center relative overflow-hidden group-hover:bg-[#0c1428] transition-colors">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isOpen ? (
              <X className="w-6 h-6 text-cyan-300" />
            ) : (
              <>
                <Bot className="w-6 h-6 text-cyan-300 group-hover:text-white transition-colors" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-ping" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
              </>
            )}
          </div>
        </motion.button>
      </div>

      {/* ── Chatbot Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[calc(100vh-7.5rem)] rounded-3xl border border-cyan-500/30 bg-[#0a0f1d]/95 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/60 via-black/40 to-purple-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>
                      <span className="text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">EduNova</span>{" "}
                      <span className="text-[#ff7828] drop-shadow-[0_0_8px_rgba(255,120,40,0.7)]">Forge</span> AI Assistant
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                      Local
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Indexed {projects.length} verified projects
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMessages([
                      {
                        id: "welcome-reset",
                        sender: "bot",
                        text: "Conversation cleared! What project are you looking for today?",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      }
                    ]);
                  }}
                  title="Clear Chat"
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-xs shadow-md"
                        : "bg-white/[0.06] border border-white/10 text-gray-200 rounded-tl-xs shadow-inner"
                    }`}
                  >
                    <div className="font-normal">
                      {renderFormattedMessage(msg.text)}
                    </div>

                    {/* Interactive Project Recommendations */}
                    {msg.matchedProjects && msg.matchedProjects.length > 0 && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                        {msg.matchedProjects.map((p) => {
                          const isReady = isProjectReadyToDownload(p);
                          return (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-xl bg-black/50 border border-white/10 hover:border-cyan-400/50 transition-colors flex items-center gap-3 group cursor-pointer"
                              onClick={() => {
                                onSelectProject(p);
                                setIsOpen(false);
                              }}
                            >
                              <img
                                src={p.thumbnail}
                                alt={p.title}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {p.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-amber-400 font-bold text-xs">
                                    ₹{p.price?.toLocaleString("en-IN")}
                                  </span>
                                  {isReady ? (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                                      Instant
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
                                      25% Adv
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-black transition-colors"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-gray-400 text-xs px-2 py-1">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starter Suggestions */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/20 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-[11px] text-gray-300 hover:text-cyan-200 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 border-t border-white/10 bg-[#070b16] flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about projects, Java, pricing, or advance build..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-black flex items-center justify-center font-bold hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
