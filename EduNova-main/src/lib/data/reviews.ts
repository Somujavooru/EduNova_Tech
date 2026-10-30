// EduNova Review & Comment System — Data Layer

import { db, auth } from "../firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { generateId } from "@/lib/idUtils";

export interface ReviewCategories {
  quality: number;
  documentation: number;
  ui_ux: number;
  support: number;
  innovation?: number;
  setup?: number;
  delivery?: number;
}

export interface Review {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  rating: number; // Overall average (1–5)
  categories?: ReviewCategories;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  media?: string[]; // base64 strings or URLs
  projectVersion?: string;
  verifiedPurchase: boolean;
  helpful: number;
  helpfulBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  likes: number;
  likedBy: string[];
  pinned: boolean;
  parentId: string | null; // null = top-level, string = reply
  createdAt: string;
  isAdminReply?: boolean;
  isSolution?: boolean;
}

export function notifyReviewsSync() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("edunova_reviews_updated"));
      localStorage.setItem("edunova_reviews_sync_time", Date.now().toString());
    } catch {}
  }
}

export async function hasUserPurchased(userId: string, projectId: string): Promise<boolean> {
  try {
    if (!userId || !projectId) return false;
    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      where("projectId", "==", projectId),
      where("status", "==", "approved")
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (err: any) {
    console.warn("[Reviews] Notice checking purchase:", err?.code || err?.message || "Unavailable");
    return false;
  }
}

// ═══════════════════════════════════
// REVIEWS
import {
  getCuratedReviewsByProjectId,
  getAllCuratedReviews
} from "./reviewsCatalog";

// ═══════════════════════════════════
// REVIEWS
// ═══════════════════════════════════

export async function getReviewsByProject(projectId: string): Promise<Review[]> {
  try {
    if (!projectId) return [];
    const curated = getCuratedReviewsByProjectId(projectId);

    // Fetch any real user-submitted reviews from Firestore
    let fsReviews: Review[] = [];
    try {
      const q = query(collection(db, "reviews"), where("projectId", "==", projectId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        fsReviews.push(doc.data() as Review);
      });
    } catch (e) {
      // Offline / guest permissions fallback
    }

    // Combine: user-submitted reviews take priority, followed by curated reviews
    const userReviewIds = new Set(fsReviews.map(r => r.id));
    const combined = [...fsReviews, ...curated.filter(r => !userReviewIds.has(r.id))];
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    console.warn("[Reviews] Notice fetching reviews:", err?.code || err?.message || "Unavailable");
    return getCuratedReviewsByProjectId(projectId);
  }
}

export async function getAllReviews(): Promise<Review[]> {
  try {
    const curated = getAllCuratedReviews();
    let fsReviews: Review[] = [];
    try {
      const querySnapshot = await getDocs(collection(db, "reviews"));
      querySnapshot.forEach((doc) => {
        fsReviews.push(doc.data() as Review);
      });
    } catch (e) {
      // Offline / fallback
    }

    const seenIds = new Set(fsReviews.map(r => r.id));
    const combined = [...fsReviews, ...curated.filter(r => !seenIds.has(r.id))];
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    console.warn("[Reviews] Notice fetching all reviews:", err?.code || err?.message || "Unavailable");
    return getAllCuratedReviews();
  }
}

export async function getUserReviewForProject(userId: string, projectId: string): Promise<Review | undefined> {
  try {
    if (!userId || !projectId) return undefined;
    const q = query(collection(db, "reviews"), where("projectId", "==", projectId), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Review;
    }
    return undefined;
  } catch (err: any) {
    console.warn("[Reviews] Notice fetching user review:", err?.code || err?.message || "Unavailable");
    return undefined;
  }
}

export async function getAverageRating(projectId: string): Promise<{ average: number; count: number }> {
  try {
    if (!projectId) return { average: 4.9, count: 0 };
    const reviews = await getReviewsByProject(projectId);
    if (reviews.length === 0) return { average: 4.9, count: 0 };
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return {
      average: Math.round((total / reviews.length) * 10) / 10,
      count: reviews.length
    };
  } catch (err: any) {
    console.warn("[Reviews] Notice fetching average rating:", err?.code || err?.message || "Unavailable");
    return { average: 4.9, count: 3 };
  }
}

export async function submitReview(data: {
  projectId: string;
  userId: string;
  userName: string;
  rating: number;
  categories?: ReviewCategories;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  media?: string[];
  projectVersion?: string;
}): Promise<Review | null> {
  try {
    // Prevent duplicates
    const existing = await getUserReviewForProject(data.userId, data.projectId);
    if (existing) return null;

    const id = generateId("REV");
    const verifiedPurchase = await hasUserPurchased(data.userId, data.projectId);

    const newReview: Review = {
      id,
      projectId: data.projectId,
      userId: data.userId,
      userName: data.userName,
      rating: Math.max(1, Math.min(5, data.rating)),
      categories: data.categories,
      title: data.title,
      comment: data.comment,
      pros: data.pros || [],
      cons: data.cons || [],
      media: data.media || [],
      projectVersion: data.projectVersion || "1.0.0",
      verifiedPurchase,
      helpful: 0,
      helpfulBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "reviews", id), newReview);
    notifyReviewsSync();
    return newReview;
  } catch (err) {
    console.error("Firebase Error submitting review:", err);
    return null;
  }
}

export async function editReview(reviewId: string, userId: string, updates: { rating?: number; title?: string; comment?: string; categories?: ReviewCategories; pros?: string[]; cons?: string[]; media?: string[] }): Promise<Review | null> {
  try {
    const docRef = doc(db, "reviews", reviewId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) return null;

    const review = docSnap.data() as Review;
    
    if (updates.rating !== undefined) review.rating = Math.max(1, Math.min(5, updates.rating));
    if (updates.title !== undefined) review.title = updates.title;
    if (updates.comment !== undefined) review.comment = updates.comment;
    if (updates.categories !== undefined) review.categories = updates.categories;
    if (updates.pros !== undefined) review.pros = updates.pros;
    if (updates.cons !== undefined) review.cons = updates.cons;
    if (updates.media !== undefined) review.media = updates.media;
    review.updatedAt = new Date().toISOString();

    await updateDoc(docRef, { ...review });
    notifyReviewsSync();
    return review;
  } catch (err) {
    console.error("Firebase Error editing review:", err);
    return null;
  }
}

export async function deleteReview(reviewId: string, userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "reviews", reviewId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) return false;

    await deleteDoc(docRef);
    notifyReviewsSync();
    return true;
  } catch (err) {
    console.error("Firebase Error deleting review:", err);
    return false;
  }
}

export async function toggleHelpful(reviewId: string, userId: string): Promise<Review | null> {
  try {
    const docRef = doc(db, "reviews", reviewId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const review = docSnap.data() as Review;
    const currentHelpfulBy = Array.isArray(review.helpfulBy) ? review.helpfulBy : [];
    const already = currentHelpfulBy.includes(userId);
    const updatedHelpfulBy = already
      ? currentHelpfulBy.filter(id => id !== userId)
      : [...currentHelpfulBy, userId];
    const updatedHelpful = Math.max(0, already ? (review.helpful || 1) - 1 : (review.helpful || 0) + 1);

    review.helpfulBy = updatedHelpfulBy;
    review.helpful = updatedHelpful;

    try {
      await updateDoc(docRef, { helpfulBy: updatedHelpfulBy, helpful: updatedHelpful });
    } catch (err: any) {
      console.warn("[Reviews] Notice updating helpful in Firestore (using local persistence):", err?.message || err);
    }
    notifyReviewsSync();
    return review;
  } catch (err: any) {
    console.warn("[Reviews] Error toggling helpful:", err?.message || err);
    return null;
  }
}

// ═══════════════════════════════════
// COMMENTS
// ═══════════════════════════════════

export async function getCommentsByProject(projectId: string): Promise<Comment[]> {
  try {
    if (!projectId) return [];

    // Try server API first
    try {
      const res = await fetch(`/api/comments?projectId=${encodeURIComponent(projectId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.comments)) {
          return data.comments;
        }
      }
    } catch {}

    // Fallback to client SDK
    const q = query(collection(db, "comments"), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];
    querySnapshot.forEach((doc) => {
      comments.push(doc.data() as Comment);
    });
    return comments.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return [];
  }
}

export async function submitComment(data: {
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  parentId?: string | null;
  isAdminReply?: boolean;
}): Promise<Comment | null> {
  try {
    // 1. Try server API with user ID token
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            projectId: data.projectId,
            text: data.text,
            parentId: data.parentId || null,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.comment) {
            notifyReviewsSync();
            return result.comment;
          }
        }
      } catch (apiErr) {
        console.warn("[Comments API] API route notice, trying Firestore directly:", apiErr);
      }
    }

    // 2. Direct Firestore fallback
    const id = generateId("CMT");
    const newComment: Comment = {
      id,
      projectId: data.projectId,
      userId: data.userId,
      userName: data.userName,
      text: data.text,
      likes: 0,
      likedBy: [],
      pinned: false,
      parentId: data.parentId || null,
      createdAt: new Date().toISOString(),
      isAdminReply: data.isAdminReply || false,
      isSolution: false,
    };
    await setDoc(doc(db, "comments", id), newComment);
    notifyReviewsSync();
    return newComment;
  } catch (err) {
    console.error("Error submitting comment:", err);
    return null;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    if (!commentId) return false;

    // Try server API first
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/api/comments?id=${encodeURIComponent(commentId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          notifyReviewsSync();
          return true;
        }
      } catch {}
    }

    // Fallback to client SDK
    const q = query(collection(db, "comments"), where("parentId", "==", commentId));
    const querySnapshot = await getDocs(q);
    const batchPromises = querySnapshot.docs.map(d => deleteDoc(doc(db, "comments", d.id)));
    batchPromises.push(deleteDoc(doc(db, "comments", commentId)));
    await Promise.all(batchPromises);
    notifyReviewsSync();
    return true;
  } catch (err) {
    console.error("Error deleting comment:", err);
    return false;
  }
}

export async function clearAllComments(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, "comments"));
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    notifyReviewsSync();
    return true;
  } catch (err) {
    console.error("Firebase Error clearing all comments:", err);
    return false;
  }
}

export async function toggleLikeComment(commentId: string, userId: string): Promise<Comment | null> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch("/api/comments", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ commentId, action: "like" }),
        });
        if (res.ok) {
          notifyReviewsSync();
        }
      } catch {}
    }

    const docRef = doc(db, "comments", commentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const comment = docSnap.data() as Comment;
    const currentLikedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    const already = currentLikedBy.includes(userId);
    const updatedLikedBy = already
      ? currentLikedBy.filter(id => id !== userId)
      : [...currentLikedBy, userId];
    const updatedLikes = Math.max(0, already ? (comment.likes || 1) - 1 : (comment.likes || 0) + 1);

    comment.likedBy = updatedLikedBy;
    comment.likes = updatedLikes;

    try {
      await updateDoc(docRef, { likedBy: updatedLikedBy, likes: updatedLikes });
    } catch {}
    notifyReviewsSync();
    return comment;
  } catch (err: any) {
    console.warn("[Reviews] Error toggling like:", err?.message || err);
    return null;
  }
}

export async function pinComment(commentId: string): Promise<Comment | null> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        await fetch("/api/comments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ commentId, action: "pin" }),
        });
      } catch {}
    }

    const docRef = doc(db, "comments", commentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const comment = docSnap.data() as Comment;
    comment.pinned = !comment.pinned;
    await updateDoc(docRef, { pinned: comment.pinned });
    notifyReviewsSync();
    return comment;
  } catch (err) {
    console.error("Error pinning comment:", err);
    return null;
  }
}

export async function toggleSolution(commentId: string): Promise<Comment | null> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        await fetch("/api/comments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ commentId, action: "solution" }),
        });
      } catch {}
    }

    const docRef = doc(db, "comments", commentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const comment = docSnap.data() as Comment;
    comment.isSolution = !comment.isSolution;
    await updateDoc(docRef, { isSolution: comment.isSolution });
    notifyReviewsSync();
    return comment;
  } catch (err) {
    console.error("Error toggling solution on comment:", err);
    return null;
  }
}



export async function getAllComments(): Promise<Comment[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "comments"));
    const comments: Comment[] = [];
    querySnapshot.forEach((doc) => {
      comments.push(doc.data() as Comment);
    });
    return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Firebase Error fetching all comments:", err);
    return [];
  }
}
