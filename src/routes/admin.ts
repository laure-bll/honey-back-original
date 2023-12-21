import {Router} from "express"
import {db, storage} from "../utils/database"
import {auth} from "../middlewares/auth";
import {adminAuth} from "../middlewares/isAdmin";
import {collection, doc, getDoc, getDocs, query, where, Timestamp} from "firebase/firestore";
import {getDownloadURL, getMetadata, listAll, ref} from "firebase/storage";

import dotenv from 'dotenv'

dotenv.config()

const app = Router();

interface User {
    uid: string;
    firstName: string;
    lastName: string;
    storage: string; // ou tout autre type approprié pour le champ "storage"
}

app.get("/", async (req, res) => {
    try {

        const userRef: any = collection(db, 'utilisateurs');
        const filesRef: any = collection(db, 'files');

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayTimestamp = Timestamp.fromDate(startOfToday);

        const q = query(filesRef, where('date', '>=', startOfTodayTimestamp));

        const usersDoc = await getDocs(userRef);
        const filesDoc = await getDocs(filesRef);
        const queryDoc = await getDocs(q);

        res.json({user: usersDoc.size, files: filesDoc.size, fileUpladToday: queryDoc.size})
    } catch (e: any) {
        res.status(500).send(e.message)
    }
});

app.get("/filesbyuser/:id", auth, adminAuth, async (req: any, res) => {
    try {
      if (!req.params.id) throw new Error("No user selected");
      const listRef = ref(storage, `${req.params.id}/`);

      const file = await listAll(listRef);

      res.json(
        await Promise.all(
          file.items.map(async (x) => {
            const metaData = await getMetadata(x);
            const fileRef: any = doc(db, "files", x.name);
            const file: any = (await getDoc(fileRef)).data();
            const downloadUrl = await getDownloadURL(x);
            return {
              id: x.name,
              name: file.name,
              size: metaData.size,
              type: metaData.contentType,
              created: metaData.timeCreated,
              downloadUrl,
            };
          })
        )
      );
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
})
app.get("/users", auth, adminAuth, async (req: any, res) => {
    try {
        // Récupérer tous les utilisateurs depuis Firestore
        const usersSnapshot = await getDocs(collection(db, 'utilisateurs'));
        const users: User[] = [];

        usersSnapshot.forEach(docSnapshot => {
            const userData = docSnapshot.data();

            users.push({
                uid: docSnapshot.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                storage: userData.storage
            });
        });

        res.json(users);

    } catch (e: any) {
        res.status(500).json({error: e.message})
    }
})



export default app;
