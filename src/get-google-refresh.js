import { google } from 'googleapis';
import readline from 'readline';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate the URL
const scopes = ['https://www.googleapis.com/auth/calendar'];
const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  // Always prompt for account selection to allow using a different Google account
  prompt: 'select_account',
});

console.log('Authorize this app by visiting this url:', url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token', err);
      rl.close();
      return;
    }
    // VULN-H14: Write to file instead of logging to console
    const fs = await import('fs');
    fs.default.writeFileSync('.google-refresh-token', token.refresh_token);
    console.log('Refresh token saved to .google-refresh-token — add this file to .gitignore');
    rl.close();
  });
});