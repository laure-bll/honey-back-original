import { Router } from "express";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, storage } from "../utils/database";
import * as bcrypt from "bcrypt";
import jwt, { Secret } from "jsonwebtoken";
import { auth } from "../middlewares/auth";
import dotenv from "dotenv";
import { deleteObject, ref } from "firebase/storage";
import { mailSender } from "../utils/email";
import { addInvoice } from "./invoices";

dotenv.config();

interface UserInterface {
  isAdmin: boolean;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  dateCreated: any;
  files: string[];
  storage: { max: number; used: number };
}

const secretKey = process.env.KEY_TOKEN;
const app = Router();

const login = async (email: string, password: string) => {
  const usersCollection = collection(db, "utilisateurs");
  const user: any = (await getDocs(usersCollection)).docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .find((x: any) => x.email === email);
  if (!user) {
    throw new Error("User not found!");
  }
  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    throw new Error("Password wrong");
  }

  const userToken = jwt.sign(
    {
      user: {
        id: user.id,
        lastName: user.lastName,
        firstName: user.firstName,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      options: {
        expiresIn: "2h",
      },
    },
    secretKey as Secret
  );

  return userToken;
};

app.get("/", auth, async (req: any, res) => {
    try {
        const docRef: any = doc(db, 'utilisateurs', req.auth.userId);
        const docSnap: any = (await getDoc(docRef)).data();
        res.status(200).json({...docSnap})
    } catch (e) {
        console.error(e)
        res.status(500)
    }
})
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userToken = await login(email, password);
    res.status(200).json({ userToken });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
app.post("/signup", async (req, res) => {
  try {
    const {
      password,
      email,
      firstName,
      lastName,
      zip,
      city,
      country,
      address,
    } = req.body;

    if (
      !password ||
      !email ||
      !firstName ||
      !lastName ||
      !address ||
      !city ||
      !country ||
      !zip
    ) {
      throw new Error("Missing value");
    }

    const hash = bcrypt.hashSync(password, 10);

    const addr = {
      zip,
      city,
      country,
      address,
    };

    const usersCollection = collection(db, "utilisateurs");
    const user = await addDoc(usersCollection, {
      dataCreated: serverTimestamp(),
      isAdmin: false,
      email,
      firstName,
      lastName,
      password: hash,
      storage: { used: 0, max: 21474836480 },
      files: [],
      address: addr,
    });

    await addInvoice({
      address: addr,
      userId: user.id,
    });

    const data: any = {
      to: email,
      subject: "Honee vous souhaite la bienvenue",
      text: `${firstName} ${lastName}, l'équipe de Honee vous souhaite la bienvenue!`,
      html: `<div><h1>Bienvenue</h1><p>${firstName} ${lastName}, toute l'équipe de Honee vous souhaite la bienvenue!</p></div>`,
    };
    await mailSender.sendMail(data);

    const userToken = await login(email, password);
    res.status(201).send({ userToken });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});
app.delete("/", auth, async (req: any, res) => {
  try {
    const userDoc = doc(db, "utilisateurs", req.auth.userId);
    const user: any = (await getDoc(userDoc)).data();
    const data: any = {
      to: user.email,
      subject: "Supression du compte Honee",
      text: `${user.firstName} ${user.lastName}, votre compte a été supprimé!`,
      html: `<div><h1>Ho non</h1><p>${user.firstName} ${user.lastName}, nous sommes tristes que vous décidiez de quitter l'aventure Honee aussi tôt. Nous espérons que vous reviendrez vite!</p></div>`,
    };
    await mailSender.sendMail(data);

    const emailToAdmin: any = {
      to: "leafy.ipssi@gmail.com",
      subject: "Un utilisateur a supprimé son compte",
      text: `${user.firstName} ${user.lastName}, votre compte a été supprimé !`,
      html: `<div><h1>Un compte a été supprimé</h1><p>${user.firstName} ${user.lastName} a suprimé son compte.</br> Cela a entrainé la suppresion de ${user.files.length} fichier(s)</p></div>`,
    };
    await mailSender.sendMail(emailToAdmin);

    await Promise.all(
      user.files.map(async (x: string) => {
        const fileRef = doc(db, "files", x);
        const storageRef = ref(storage, `${req.auth.userId}/${x}`);

        await deleteObject(storageRef);
        await deleteDoc(fileRef);
      })
    );
    await deleteDoc(userDoc);
    res.status(200).send("Success removed");
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});
app.put("/newAdmin", auth, async (req: any, res) => {
  if (!req.auth.isAdmin) {
    return res.status(500).send("Your are not admin");
  }
  try {
    if (!req.body.userId) {
      throw new Error("Missing user");
    }
    const docRef: any = doc(db, "utilisateurs", req.body.userId);
    const dataEdited: any = {
      isAdmin: true,
    };
    await updateDoc(docRef, dataEdited);
    res.status(200).send("Edit admin is succesful");
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});
app.put("/profile", auth, async (req: any, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const docRef: any = doc(db, "utilisateurs", req.auth.userId);
    const dataEdited: any = { firstName, lastName, email };

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      dataEdited.password = hash;
    }
    
    await updateDoc(docRef, dataEdited);
    res.status(200).send("Edit profil success");
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});

export default app;
