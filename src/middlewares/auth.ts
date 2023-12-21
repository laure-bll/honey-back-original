import jwt, {Secret} from 'jsonwebtoken';
import dotenv from 'dotenv'

dotenv.config()

export const auth = (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decodedToken: any = jwt.verify(
        token,
        process.env.KEY_TOKEN as Secret
      );

      req.auth = {
        userId: decodedToken.user.id,
        isAdmin: decodedToken.user.isAdmin,
      };
      next();
    } catch(e: any) {
        res.status(401).json({ error: "Not connected" });
    }
}


