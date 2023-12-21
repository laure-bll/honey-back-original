import {
  addDoc,
  collection,
  query,
  getDocs,
  serverTimestamp,
  where,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../utils/database";
import { Router } from "express";
import { auth } from "../middlewares/auth";
import PDFDocument from "pdfkit";

const app = Router();

interface AddressType {
  zip: string;
  city: string;
  country: string;
  address: string;
}

interface InvoiceType {
  address: AddressType;
  userId: string;
}

export const addInvoice = async ({ address, userId }: InvoiceType) => {
  const invoicesCollection = collection(db, "invoices");
  await addDoc(invoicesCollection, {
    date: serverTimestamp(),
    TVA: 20, // %
    taxes: (19.1 * 20) / 100 + 0.9, // €
    quantity: 20, // GO
    stripe: 0.9, // € taxes
    amount: 15.28, // HT €
    totalAmount: 15.28 + 0.9 + (19.1 * 20) / 100, // € TTC
    userId,
    address,
  });
};

app.get("/", auth, async (req: any, res) => {
  try {
    const invoicesRef = collection(db, "invoices");

    const userId = req.auth.userId;

    const q = query(invoicesRef, where("userId", "==", userId));
    const invoices = (await getDocs(q)).docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    }));

    res.status(200).json({ invoices });
  } catch (error: any) {
    return res.status(error.statusCode).json({ error });
  }
});

const generateBase64PDF = async (data: any) => {
  try {
    const pdfDoc = new PDFDocument();
    pdfDoc.fontSize(12);
    pdfDoc.font("Helvetica-Bold");

    const colors = ["#007acc", "#ff7f50", "#32cd32"];

    pdfDoc.fillColor(colors[0]).text("Honee", { align: "left" });
    pdfDoc.fillColor(colors[0]).text("123 Bee Street", { align: "left" });
    pdfDoc.fillColor(colors[0]).text("Honeeville, HV 56789", { align: "left" });
    pdfDoc.fillColor(colors[0]).text("France", { align: "left" });
    pdfDoc
      .fillColor(colors[0])
      .text("SIRET Number: 12345678900012", { align: "left" });
    pdfDoc.moveDown(2);

    pdfDoc
      .fillColor(colors[1])
      .text(`${data.firstName} ${data.lastName?.toUpperCase()}`, {
        align: "right",
      });
    pdfDoc.fillColor(colors[1]).text(data.address.address, { align: "right" });
    pdfDoc
      .fillColor(colors[1])
      .text(`${data.address.zip} ${data.address.city}`, { align: "right" });
    pdfDoc
      .fillColor(colors[1])
      .text(`${data.address.country}`, { align: "right" });

    pdfDoc.moveDown(2);
    pdfDoc.text("").fillColor("black");
    pdfDoc.text("Order Summary:").fillColor("black");
    pdfDoc.moveDown(2);
    pdfDoc.fillColor("black").text(
      `${new Date(data.date.toDate()).toLocaleDateString(undefined, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })}`,
      { align: "left" }
    );
    pdfDoc.text(`Quantity: ${data.quantity} Go`).fillColor("black");
    pdfDoc.text(`Amount HT: ${data.amount} €`).fillColor("black");
    pdfDoc.text("Tax Details:").fillColor("black");
    pdfDoc.text(`Taxes : ${data.taxes + data.stripe} €`).fillColor("black");
    pdfDoc.text(`Total Amount: ${data.totalAmount} €`).fillColor("black");
    pdfDoc.moveDown(10);
    pdfDoc
      .text("Thank you for your purchase!", { align: "center" })
      .fillColor("black");

    const chunks: any[] = [];
    pdfDoc.on("data", (chunk) => {
      chunks.push(chunk);
    });

    await new Promise((resolve) => {
      pdfDoc.on("end", resolve);
      pdfDoc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const base64String = pdfBuffer.toString("base64");
    return base64String;
  } catch (err) {
    console.log(err);
    return undefined;
  }
};

app.get("/order/:id", auth, async (req: any, res) => {
  try {
    const userId = req.auth.userId;
    const orderId = req.params.id;

    const refUser: any = doc(db, "utilisateurs", userId);
    const user: any = (await getDoc(refUser)).data();

    const docRef: any = doc(db, "invoices", orderId);
    const docSnap: any = (await getDoc(docRef)).data();

    if (docSnap.userId === userId) {
      const base64PDF = await generateBase64PDF({ ...docSnap, ...user });

      res.status(200).json(base64PDF);
    } else {
      res.status(401).json("Not authorized");
    }
  } catch (error: any) {
    return res.status(error.statusCode).json({ error });
  }
});

app.post("/", auth, async (req: any, res) => {
  try {
    const { city, zip, country, address } = req.body;

    const addr = {
      city,
      zip,
      country,
      address,
    };

    const userId = req.auth.userId;
    await addInvoice({ address: addr, userId });

    const docRef: any = doc(db, "utilisateurs", userId);
    const user: any = (await getDoc(docRef)).data();

    const dataEdited: any = {
      storage: { used: user.storage.used, max: user.storage.max + 21474836480 },
    };
    await updateDoc(docRef, dataEdited);

    res.status(201).json("Successfully payed");
  } catch (error: any) {
    return res.status(error.statusCode).json({ error });
  }
});

export default app;