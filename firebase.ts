import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdctp8WjTwgLwR5ZTAobjQ-ApkNxfbRuw",
  authDomain: "aristo-cpa-work-platform.firebaseapp.com",
  projectId: "aristo-cpa-work-platform",
  storageBucket: "aristo-cpa-work-platform.firebasestorage.app",
  messagingSenderId: "813300838301",
  appId: "1:813300838301:web:4f74800c4be5f731930974"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
