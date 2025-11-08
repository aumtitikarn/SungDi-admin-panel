// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD9DD7MmOQIKspu2I1JWqFyH6V8N4tUOKg",
  authDomain: "sungdi-d4e0a.firebaseapp.com",
  projectId: "sungdi-d4e0a",
  storageBucket: "sungdi-d4e0a.firebasestorage.app",
  messagingSenderId: "35248035673",
  appId: "1:35248035673:web:d58f0a74ac1eebffa99e48",
  measurementId: "G-X5D178PTZL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);