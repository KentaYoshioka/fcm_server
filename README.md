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
   $ npm install @supabase/supabase-js firebase-admin dotenv
   ```
4. Copy `.env.example` file and create `.env` file.
5. Replace in the `.env` file with your own information. 

## Linux
1. Launch
```bash
$ node fcm.js
```
