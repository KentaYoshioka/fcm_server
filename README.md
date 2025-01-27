# fcm_server
fcm_server is a JavaScript server that monitors changes in supabase records and sends push notifications to smartphone applications using FCM (Firebase Cloud Messaging).This server is for https://github.com/KentaYoshioka/latin_one that is smartphone app made with flutter.

In addition, this server sends order information from smartphone app users to the administrator by email.

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
   $ npm install @supabase/supabase-js firebase-admin dotenv nodemailer
   ```
4. Copy `.env.example` file and create `.env` file.
5. Create an app password from your Google Account security page and Replace in the `.env` file with your own Gmail information.
6. Replace in the `.env` file with your own another information. 
7. Place serviceAccountKey.json, the Firebase private key, in the repository. 

## Launch
1. Linux
```bash
$ node fcm.js
```
