// Firebase web-app config (Firebase Console > Project settings > Your apps).
// These values are public by design; security comes from firestore.rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyB2FxYgDIioHktbsMSIaw5Do3vBSuXbxqw",

  authDomain: "vmal-92673.firebaseapp.com",

  projectId: "vmal-92673",

  storageBucket: "vmal-92673.firebasestorage.app",

  messagingSenderId: "37471099810",

  appId: "1:37471099810:web:69daf8aff40567979370fb",

  measurementId: "G-NQ8EHR3GLP"

};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only these emails may open the dashboard (must match firestore.rules too)
export const ADMIN_EMAILS = ["vmalhomecareproducts@gmail.com"];
