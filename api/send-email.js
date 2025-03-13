import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import parse from 'urlencoded-body-parser';

const OAuth2 = google.auth.OAuth2;

// Configure the OAuth2 client with your credentials
const oauth2Client = new OAuth2(
  process.env.OAUTH_CLIENT_ID,     // Your OAuth2 Client ID
  process.env.OAUTH_CLIENT_SECRET, // Your OAuth2 Client Secret
  "https://developers.google.com/oauthplayground" // Redirect URL (can be adjusted)
);

// Set the refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Parse form data (URL-encoded)
      const body = await parse(req);
      const { name, email, message } = body;

      // Get an access token from the OAuth2 client
      const accessTokenResponse = await oauth2Client.getAccessToken();
      const accessToken = accessTokenResponse?.token;

      // Create a Nodemailer transporter using OAuth2
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.SMTP_USER, // Your Gmail address
          clientId: process.env.OAUTH_CLIENT_ID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });

      // Define the email options with multiple recipients and CC
      const mailOptions = {
        from: `Contact Form <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL, // Comma-separated list of recipient addresses
        cc: email, // Send a copy to the sender
        bcc: process.env.BCC_EMAILS,
        subject: `New Contact Form Submission from ${name}`,
        text: `You have received a new message from your website contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `<p>You have received a new message from your website contact form.</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>`
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);

      // Return an HTML confirmation page
      res.status(200).setHeader('Content-Type', 'text/html');
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Message Sent</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background-color: #f9f9f9;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              button {
                padding: 10px 20px;
                font-size: 16px;
                margin-top: 20px;
                border: none;
                background-color: #0070f3;
                color: white;
                border-radius: 4px;
                cursor: pointer;
              }
              button:hover {
                background-color: #005bb5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Message Sent!</h1>
              <p>Thank you for contacting us. We will get back to you soon.</p>
              <button onclick="window.location.href='/'">Go Back</button>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).setHeader('Content-Type', 'text/html');
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              button { padding: 10px 20px; font-size: 16px; margin-top: 20px; border: none; background-color: #0070f3; color: white; border-radius: 4px; cursor: pointer; }
              button:hover { background-color: #005bb5; }
            </style>
          </head>
          <body>
            <h1>Failed to send email</h1>
            <p>Please try again later.</p>
            <button onclick="window.location.href='/'">Go Back</button>
          </body>
        </html>
      `);
    }
  } else {
    // Only allow POST requests
    res.status(405).setHeader('Content-Type', 'text/html');
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Method Not Allowed</title>
        </head>
        <body>
          <h1>405 - Method Not Allowed</h1>
        </body>
      </html>
    `);
  }
}
