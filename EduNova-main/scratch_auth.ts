import { adminAuth } from "./src/lib/firebaseAdmin";

async function listAuthUsers() {
  const list = await adminAuth.listUsers(50);
  console.log(`=== FIREBASE AUTH USERS (${list.users.length}) ===`);
  list.users.forEach(u => {
    console.log(` - UID: ${u.uid} | Email: ${u.email} | Verified: ${u.emailVerified} | Created: ${u.metadata.creationTime}`);
  });
}

listAuthUsers()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
