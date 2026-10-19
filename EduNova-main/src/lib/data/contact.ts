export interface ContactReply {
  id: string;
  text: string;
  repliedAt: string;
  repliedBy: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  projectRef?: string;
  phone?: string;
  status: "new" | "read" | "replied" | "resolved" | "spam";
  reply?: string;
  repliedAt?: string;
  repliedBy?: string;
  replies?: ContactReply[];
  createdAt: string;
}

export interface SocialMediaLinks {
  instagram: { url: string; enabled: boolean };
  linkedin: { url: string; enabled: boolean };
  twitter: { url: string; enabled: boolean };
  github: { url: string; enabled: boolean };
  youtube: { url: string; enabled: boolean };
  facebook: { url: string; enabled: boolean };
  telegram: { url: string; enabled: boolean };
  discord: { url: string; enabled: boolean };
  whatsapp: { url: string; enabled: boolean };
}

const DEFAULT_SOCIALS: SocialMediaLinks = {
  instagram: { url: "https://instagram.com/edunova", enabled: true },
  linkedin: { url: "https://linkedin.com/company/edunova", enabled: true },
  twitter: { url: "https://twitter.com/edunova", enabled: true },
  github: { url: "https://github.com/edunova", enabled: true },
  youtube: { url: "https://youtube.com/edunova", enabled: true },
  facebook: { url: "https://facebook.com/edunova", enabled: false },
  telegram: { url: "https://t.me/edunova", enabled: false },
  discord: { url: "https://discord.gg/edunova", enabled: false },
  whatsapp: { url: "https://wa.me/1234567890", enabled: false },
};

import { db, auth } from "../firebase";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

const CONTACT_KEY = "edunova_contact_messages";
const SOCIALS_KEY = "edunova_socials";

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const token = await auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

export function getContactMessages(): ContactMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/contact", { headers, cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        if (typeof window !== "undefined") {
          localStorage.setItem(CONTACT_KEY, JSON.stringify(data.messages));
        }
        return data.messages;
      }
    }
  } catch (err) {
    console.warn("[Contact] Server fetch notice, checking local:", err);
  }
  return getContactMessages();
}

export function subscribeContactMessages(callback: (messages: ContactMessage[]) => void): () => void {
  // 1. Immediately emit local cached messages
  callback(getContactMessages());

  if (typeof window === "undefined") return () => {};

  // 2. Fetch fresh data from server once on load
  fetchContactMessages().then((msgs) => callback(msgs));

  // 3. Optional periodic refresh (every 60s instead of 3s to preserve Workers & Firestore quota)
  const interval = setInterval(() => {
    fetchContactMessages().then((msgs) => callback(msgs));
  }, 60000);

  // 4. Firestore real-time snapshot for authorized admins
  let unsubFirestore = () => {};
  try {
    const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const msgs: ContactMessage[] = snapshot.docs.map((d) => d.data() as ContactMessage);
          callback(msgs);
        }
      },
      () => {
        // Fall back quietly if unauthenticated or permissions pending
      }
    );
  } catch {
    // Ignore and rely on standard fetch
  }

  return () => {
    clearInterval(interval);
    unsubFirestore();
  };
}

export async function saveContactMessage(msg: Omit<ContactMessage, "id" | "status" | "createdAt">): Promise<ContactMessage> {
  const res = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to submit message. Please try again.");
  }

  const data = await res.json();
  const createdMsg: ContactMessage = data.message || {
    ...msg,
    id: `MSG-${Date.now().toString(36).toUpperCase()}`,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  // Cache locally
  const localList = getContactMessages();
  localList.unshift(createdMsg);
  if (typeof window !== "undefined") {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(localList));
  }

  return createdMsg;
}

export async function updateContactMessageStatus(id: string, status: ContactMessage["status"]): Promise<boolean> {
  const messages = getContactMessages();
  const idx = messages.findIndex(m => m.id === id);
  if (idx !== -1) {
    messages[idx].status = status;
    if (typeof window !== "undefined") {
      localStorage.setItem(CONTACT_KEY, JSON.stringify(messages));
    }
  }

  try {
    const headers = await getAuthHeaders();
    await fetch("/api/contact", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, status }),
    });
  } catch {
    // Silent
  }

  try {
    await updateDoc(doc(db, "contact_messages", id), { status });
  } catch {
    // Silent
  }

  return true;
}

export async function deleteContactMessage(id: string): Promise<boolean> {
  const messages = getContactMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(filtered));
  }

  try {
    const headers = await getAuthHeaders();
    await fetch(`/api/contact?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
  } catch {
    // Silent
  }

  try {
    await deleteDoc(doc(db, "contact_messages", id));
  } catch {
    // Silent
  }

  return true;
}

export async function clearAllContactMessages(): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONTACT_KEY);
    localStorage.setItem(CONTACT_KEY, JSON.stringify([]));
  }

  try {
    const headers = await getAuthHeaders();
    await fetch("/api/contact?id=all", {
      method: "DELETE",
      headers,
    });
  } catch {
    // Silent
  }

  try {
    const snap = await getDocs(collection(db, "contact_messages"));
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch {
    // Silent
  }

  return true;
}

export async function replyToContactMessage(id: string, replyText: string, repliedBy: string = "EduNova Support Admin"): Promise<ContactMessage | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/contact", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        id,
        replyText,
        repliedBy,
        status: "resolved",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.message || null;
    }
  } catch (err) {
    console.error("[Contact] Error sending reply:", err);
  }
  return null;
}

export async function getUserInquiries(email: string): Promise<ContactMessage[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/contact?email=${encodeURIComponent(email)}`, {
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return data.messages || [];
    }
  } catch (err) {
    console.warn("[Contact] Error fetching user inquiries:", err);
  }
  return [];
}

export function getSocialLinks(): SocialMediaLinks {
  if (typeof window === "undefined") return DEFAULT_SOCIALS;
  try {
    const raw = localStorage.getItem(SOCIALS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SOCIALS;
  } catch {
    return DEFAULT_SOCIALS;
  }
}

export function saveSocialLinks(links: SocialMediaLinks) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SOCIALS_KEY, JSON.stringify(links));
  }
}
