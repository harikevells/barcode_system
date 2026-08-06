import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALQTpaezE79HZvFyF9dq_tsMoXZGERPXE",
  authDomain: "multiscannerapp.firebaseapp.com",
  projectId: "multiscannerapp",
  storageBucket: "multiscannerapp.firebasestorage.app",
  messagingSenderId: "823770924584",
  appId: "1:823770924584:web:671611814f1cd29742571d",
  measurementId: "G-LHSSHGG0G4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
