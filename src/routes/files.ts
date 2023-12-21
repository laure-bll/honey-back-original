import {Router} from "express"
import {deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytes, getBytes} from "firebase/storage";
import {db, storage} from "../utils/database"
import {auth} from "../middlewares/auth";
import multer from "multer";
import dotenv from 'dotenv'
import {addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc} from "firebase/firestore";

dotenv.config()

const app = Router();

const upload = multer({storage: multer.memoryStorage()});

app.get("/", auth, async (req: any, res) => {
    try {
        const listRef = ref(storage, `${req.auth.userId}/`);

        const file = await listAll(listRef)

        res.json(await Promise.all(file.items.map(async x => {
            const metaData = await getMetadata(x)
            const fileRef: any = doc(db, 'files', x.name);
            const file: any = (await getDoc(fileRef)).data()
            const downloadUrl = await getDownloadURL(x);

            return {
                id: x.name,
                name: file.name,
                size: metaData.size,
                type: metaData.contentType,
                created: metaData.timeCreated,
                downloadUrl,
            }
        })));
    } catch (e: any) {
        console.error(e)
        res.status(500).json({error: e.message})
    }
})
app.post("/", auth, upload.single("filename"), async (req: any, res) => {
    try {
        if (!req.file)
            throw new Error("No File")
        // Verif size
        const docRef: any = doc(db, 'utilisateurs', req.auth.userId);
        const user: any = (await getDoc(docRef)).data()
        const afterSize = parseInt(user.storage.used) + req.file.size;
        if (afterSize > parseInt(user.storage.max)) {
            throw new Error("No storage")
        }

        const filesCollection = collection(db, 'files');
        const fileData = await addDoc(filesCollection, {
            date: serverTimestamp(),
            size: req.file.size,
            name: req.file.originalname,
            type: req.file.mimetype,
        })
        const metadata = {
            contentType: req.file.mimetype,
        };
        const storageRef = ref(storage, `${req.auth.userId}/${fileData.id}`);

        const snapshot = await uploadBytes(storageRef, req.file.buffer, metadata);

        const downloadURL = await getDownloadURL(snapshot.ref);

        const dataEdited: any = {
            storage: {used: afterSize, max: user.storage.max},
            files: [
                ...user.files,
                fileData.id
            ]
        }
        await updateDoc(docRef, dataEdited);

        return res.json({
            name: req.file.originalname,
            type: req.file.mimetype,
            downloadURL: downloadURL
        })


    } catch (e: any) {
        console.error(e)
        res.status(500).json({error: e.message})
    }
});

app.delete("/", auth, async (req: any, res) => {
    try {
        if (!req.body.idFile)
            throw new Error("No files selected")
        const fileRef = doc(db, "files", req.body.idFile);
        const file: any = (await getDoc(fileRef)).data()
        if (!fileRef)
            throw new Error("File not exist");

        const userRef: any = doc(db, 'utilisateurs', req.auth.userId);
        const user: any = (await getDoc(userRef)).data()

        const storageRef = ref(storage, `${req.auth.userId}/${req.body.idFile}`);

        await deleteObject(storageRef);
        await deleteDoc(fileRef);

        await updateDoc(userRef, {
            storage: {used: user.storage.used - file.size, max: user.storage.max},
            files: user.files.filter((x: string) => x !== req.body.idFile),
        });

        res.json({succes: "File is deleted"})

    } catch (e: any) {
        res.status(400).send(e.message)
    }
});

app.get("/download/:id", auth, async (req: any, res) => {
    try{
        const fileRef = ref(storage, `${req.auth.userId}/${req.params.id}`)
        const buffer = await getBytes(fileRef);

        const docFileRef: any = doc(db, 'files', fileRef.name);
        const file: any = (await getDoc(docFileRef)).data()

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);

        res.end(Buffer.from(buffer));


    }
    catch(e: any)
    {
        console.error(e)
        res.status(500).send(e.message)
    }
})


export default app;
