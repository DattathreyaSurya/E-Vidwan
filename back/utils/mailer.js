// Example: mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.EMAIL, // your email
    pass: process.env.EMAIL_PASSWORD  // your email password or app password
  }
});

module.exports = transporter;