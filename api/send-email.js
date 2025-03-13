import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { parse } from 'urlencoded-body-parser';

const OAuth2 = google.auth.OAuth2;

// Configure the OAuth2 client with your credentials
const oauth2Client = new OAuth2(
  process.env.OAUTH_CLIENT_ID,     // Your OAuth2 Client ID
  process.env.OAUTH_CLIENT_SECRET, // Your OAuth2 Client Secret
  "https://developers.google.com/oauthplayground" // Redirect URL
);

// Set the refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log("Received POST request for sending email.");

      // Parse form data (URL-encoded)
      const body = await parse(req);
      console.log("Parsed form data:", body);

      const { name, email, message } = body;

      // Get an access token from the OAuth2 client
      console.log("Requesting access token...");
      const accessTokenResponse = await oauth2Client.getAccessToken();
      const accessToken = accessTokenResponse?.token;
      console.log("Access token obtained:", accessToken ? "Token exists" : "No token");

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

      // Define the email options
      const mailOptions = {
        from: `Contact Form <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAILS, // Can include multiple emails separated by commas
        cc: email, // Send a copy to the sender
        subject: `New Contact Form Submission from ${name}`,
        text: `You have received a new message from your website contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `<p>You have received a new message from your website contact form.</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>`
      };

      console.log("Mail options prepared:", mailOptions);

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully. Message ID:", info.messageId);

      return res.status(200).json({ success: true, info });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } else {
    // Only allow POST requests
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
