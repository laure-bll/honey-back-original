import { Router } from "express";
import AuthRoutes from "./auth";
import FileRoutes from "./files";
import PaymentRoutes from "./payment";
import AdminRoutes from "./admin";
import InvoiceRoutes from "./invoices";

const app = Router();

app.use("/auth", AuthRoutes);
app.use("/file", FileRoutes);
app.use("/admin", AdminRoutes);
app.use("/payment", PaymentRoutes);
app.use("/invoices", InvoiceRoutes);

export default app;