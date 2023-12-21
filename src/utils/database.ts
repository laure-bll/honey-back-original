import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.DB_KEY,
  authDomain: process.env.DB_AUTH,
  projectId: process.env.DB_ID,
  storageBucket: process.env.DB_BUCKET,
  messagingSenderId: process.env.DB_SENDER,
  appId: process.env.DB_APP,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// export default {
//     db: getFirestore(app),
//     storage: getStorage(app),
// };
