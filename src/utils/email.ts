import nodemailer from "nodemailer";
import dotenv from 'dotenv'

dotenv.config()


export const mailSender = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.KEY_EMAIL
    },
});


