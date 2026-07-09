import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSwRKVkwLa1u5xWyoLwk0VNVr3s3FBNDk",
  authDomain: "secret-sunrise-pgtt6.firebaseapp.com",
  projectId: "secret-sunrise-pgtt6",
  storageBucket: "secret-sunrise-pgtt6.firebasestorage.app",
  messagingSenderId: "817470103921",
  appId: "1:817470103921:web:d61b7f991777c9d1b8d6d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = getFirestore(app, "ai-studio-cardpiodigital-43242732-fbbd-49e7-9cd4-d8881f4d17db");

