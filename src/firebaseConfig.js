import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaw_dmAdCtOrYavwTmLiV9UGMZtvvgDI8",
  authDomain: "webapp-e610b.firebaseapp.com",
  projectId: "webapp-e610b",
  storageBucket: "webapp-e610b.appspot.com",
  messagingSenderId: "541829448237",
  appId: "1:541829448237:web:0a04b7f539750b4e60aea4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };