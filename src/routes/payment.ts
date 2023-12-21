import {Router} from "express"
import Stripe from "stripe";
import dotenv from 'dotenv';

dotenv.config()


const stripe = new Stripe(process.env.CLIENT_SECRET_STRIPE as string)
// const stripe = require('stripe')(process.env.CLIENT_SECRET_STRIPE);


const app = Router();

app.post("/secret", async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000, // centimes
      currency: "eur",
      payment_method_types: ["card"],
    });

    res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (error: any) {
    return res.status(error.statusCode).json({ error });
  }
});

export default app;
