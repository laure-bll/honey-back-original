/** source/server.ts */
import http from "http";
import express, { Express } from "express";
import Routes from "./routes";
import dotenv from "dotenv";

dotenv.config();

//Initialisation de la base de donné

const router: Express = express();

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

router.use(Routes);

router.use((req, res, next) => {
  const error = new Error("not found");
  return res.status(404).json({
    message: error.message,
  });
});

/** Server */
const httpServer = http.createServer(router);
const PORT: any = process.env.PORT ?? 3001;
httpServer.listen(PORT, () =>
  console.log(`The server is running on port ${PORT}`)
);
