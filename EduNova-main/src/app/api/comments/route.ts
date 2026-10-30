import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";
import { generateId } from "@/lib/idUtils";

const COLLECTION_NAME = "comments";

// GET /api/comments?projectId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    let queryRef = adminDb.collection(COLLECTION_NAME);
    let snapshot;

    if (projectId) {
      snapshot = await queryRef.where("projectId", "==", projectId).get();
    } else {
      snapshot = await queryRef.get();
    }

    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort: pinned first, then newest first
    comments.sort((a: any, b: any) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({ comments });
  } catch (err: any) {
    console.error("[API Comments GET] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to fetch comments", comments: [] }, { status: 500 });
  }
}

// POST /api/comments
export async function POST(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, false);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Authentication required to post a comment" },
        { status: authResult.status || 401 }
      );
    }

    const body = await request.json();
    const { projectId, text, parentId = null } = body;

    if (!projectId || !text?.trim()) {
      return NextResponse.json({ error: "Project ID and comment text are required" }, { status: 400 });
    }

    const cleanText = String(text).trim().slice(0, 3000);
    const id = generateId("CMT");
    const isAdmin = authResult.user.role === "admin";

    const newComment = {
      id,
      projectId: String(projectId).trim(),
      userId: authResult.user.uid,
      userName: authResult.user.name || "Member",
      userEmail: authResult.user.email || "",
      text: cleanText,
      likes: 0,
      likedBy: [],
      pinned: false,
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      isAdminReply: isAdmin,
      isSolution: false,
    };

    await adminDb.collection(COLLECTION_NAME).doc(id).set(newComment);

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err: any) {
    console.error("[API Comments POST] Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Failed to post comment" }, { status: 500 });
  }
}

// DELETE /api/comments?id=...
export async function DELETE(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, false);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
    }

    const docRef = adminDb.collection(COLLECTION_NAME).doc(commentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: true });
    }

    const data = docSnap.data()!;
    const isAdmin = authResult.user.role === "admin";
    if (!isAdmin && data.userId !== authResult.user.uid) {
      return NextResponse.json({ error: "Forbidden: You cannot delete another user's comment" }, { status: 403 });
    }

    // Also delete any child replies
    const repliesSnap = await adminDb.collection(COLLECTION_NAME).where("parentId", "==", commentId).get();
    const batch = adminDb.batch();
    batch.delete(docRef);
    repliesSnap.docs.forEach((r) => batch.delete(r.ref));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API Comments DELETE] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

// PATCH /api/comments (for like, pin, solution)
export async function PATCH(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, false);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, action } = body;
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
    }

    const docRef = adminDb.collection(COLLECTION_NAME).doc(commentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const comment = docSnap.data()!;
    const isAdmin = authResult.user.role === "admin";
    const uid = authResult.user.uid;

    if (action === "like") {
      const likedBy: string[] = Array.isArray(comment.likedBy) ? comment.likedBy : [];
      const alreadyLiked = likedBy.includes(uid);
      const updatedLikedBy = alreadyLiked ? likedBy.filter((x) => x !== uid) : [...likedBy, uid];
      const updatedLikes = Math.max(0, alreadyLiked ? (comment.likes || 1) - 1 : (comment.likes || 0) + 1);

      await docRef.update({ likedBy: updatedLikedBy, likes: updatedLikes });
      return NextResponse.json({ success: true, likes: updatedLikes, likedBy: updatedLikedBy });
    }

    if (action === "pin") {
      if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
      const nextPinned = !comment.pinned;
      await docRef.update({ pinned: nextPinned });
      return NextResponse.json({ success: true, pinned: nextPinned });
    }

    if (action === "solution") {
      if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
      const nextSolution = !comment.isSolution;
      await docRef.update({ isSolution: nextSolution });
      return NextResponse.json({ success: true, isSolution: nextSolution });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[API Comments PATCH] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

