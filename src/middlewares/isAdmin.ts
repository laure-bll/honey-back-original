import dotenv from 'dotenv'
import {doc, getDoc} from "firebase/firestore";
import {db} from "../utils/database";

dotenv.config()

export const adminAuth = async (req: any, res: any, next: any) => {
    try {
        const docRef: any = doc(db, 'utilisateurs', req.auth.userId);
        const docSnap: any = (await getDoc(docRef)).data();
        if(!docSnap.isAdmin)
            throw new Error("User is not Admin")

        next();
    } catch(e: any) {
        res.status(401).json({ error: e.message });
    }
}


