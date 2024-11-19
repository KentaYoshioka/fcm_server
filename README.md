# fcm_server
fcm_server is a JavaScript server that monitors changes in Supabase records and sends push notifications to a smartphone app made with flutter.

# Setup
1. Clone this repository 
   ```bash
   $ git clone https://github.com/SenoOh/fcm_server.git
   ```
2. npm init
   ```bash
   $ npm init
   ```
3. Install modules
   ```bash
   $ npm install @supabase/supabase-js firebase-admin dotenv express nodemailer
   ```
4. Copy `.env.example` file and create `.env` file.
5. Create an app password from your Google Account security page and Replace in the `.env` file with your own Gmail information.
6. Replace in the `.env` file with your own another information. 
7. Place serviceAccountKey.json, the Firebase private key, in the repository. 

## Linux
1. Launch
```bash
$ node fcm.js
```
