import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const fbConfigContent = fs.readFileSync('src/lib/firebase.ts', 'utf8');
const apiKey = fbConfigContent.match(/apiKey:\s*"([^"]+)"/)?.[1];
const projectId = fbConfigContent.match(/projectId:\s*"([^"]+)"/)?.[1];

const app = initializeApp({
  apiKey,
  projectId,
  authDomain: `${projectId}.firebaseapp.com`,
});

const db = getFirestore(app);

async function inspectData() {
  try {
    const reqSnap = await getDocs(collection(db, 'custom_requests'));
    console.log('Total custom_requests in Firestore:', reqSnap.size);
    reqSnap.forEach(d => console.log(' Request ID:', d.id, d.data().projectTitle, d.data().userEmail));

    const msgSnap = await getDocs(collection(db, 'contact_messages'));
    console.log('Total contact_messages in Firestore:', msgSnap.size);
    msgSnap.forEach(d => console.log(' Message ID:', d.id, d.data().subject, d.data().email));

    const userSnap = await getDocs(collection(db, 'users'));
    console.log('Total users in Firestore:', userSnap.size);
    userSnap.forEach(d => console.log(' User ID:', d.id, d.data().email, d.data().name));
  } catch (err) {
    console.log('Error inspecting Firestore:', err.message);
  }
}

inspectData();
