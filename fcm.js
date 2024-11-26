const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); 
const dotenv = require('dotenv');
const express = require('express'); // Expressを使用
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

// 環境変数をロード
dotenv.config();

// サーバー管理者のメール情報
const ADMIN_GMAIL = process.env.ADMIN_GMAIL; // 管理者のGmailアドレス
const ADMIN_GMAIL_PASSWORD = process.env.ADMIN_GMAIL_PASSWORD; // 管理者のアプリパスワード（2段階認証用）

const port = 5050;

// Nodemailerトランスポートの設定
const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465, // セキュアなSMTP通信に使用
    secure: true, // SSL/TLSを使用
    auth: {
        user: ADMIN_GMAIL,
        pass: ADMIN_GMAIL_PASSWORD
    },
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Supabaseクライアントの作成
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Firebase Admin SDKの初期化
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = async (title, body) => {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        topic: 'allUsers',
    };
    try {
        const response = await admin.messaging().send(message);
        InsertNotification(title, body);
        console.log('通知が送信されました:', response);
    } catch (error) {
        console.error('通知の送信に失敗しました:', error);
    }
};

const InsertNotification = async (title, body) => {
    try {
        const { data, error } = await supabase
            .from('inboxs')
            .insert([
                { title: title, body: body }
            ]);
        if (error) {
            console.error('通知の挿入に失敗しました:', error);
        } else {
            console.log('通知が挿入されました:', data);
        }
    } catch (error) {
        console.error('通知の挿入処理中にエラーが発生しました:', error);
    }
};



// テーブルの変更を監視する関数
const listenForChanges = async () => {
    const channel = supabase
    .channel('*')
    .on('postgres_changes',{
        event: 'INSERT',
        schema: 'public',
        table: 'shops',
    }, (payload) => {
        const newShopName = payload.new.name; // 新しい店舗の名前
        sendPushNotification('新店舗情報', `${newShopName} が新しくオープンしました！`);
    })
    .on('postgres_changes',{
        event: 'UPDATE',
        schema: 'public',
        table: 'shops',
    }, (payload) => {
        const updatedShopName = payload.new.name; // 更新された店舗の名前
        sendPushNotification('店舗更新情報', `${updatedShopName} の情報を更新しました！`);
    })
    .on('postgres_changes',{
        event: 'INSERT',
        schema: 'public',
        table: 'products',
    }, (payload) => {
        const newProductTitle = payload.new.title; // 新しい商品のタイトル
        sendPushNotification('新商品情報', `${newProductTitle} が新しく入荷しました！`);
    })
    .on('postgres_changes',{
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
    }, (payload) => {
        const updatedProductTitle = payload.new.title; // 更新された商品のタイトル
        sendPushNotification('商品更新情報', `${updatedProductTitle} の情報を更新しました！`);
    })
    .subscribe();
};

// 変更監視の開始
listenForChanges();

// FCM通知を送信する関数
const sendPushForToken = async (title, body, token) => {
    const message = {
        notification: {
            title: "商品の購入を受け付けました",
            body: "以降の連絡はメールで行います．配達までしばらくお待ちください",
        },
        token: token, // 特定のデバイス宛のトークン
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`トークン ${token} に通知が送信されました:`, response);
    } catch (error) {
        console.error(`トークン ${token} への通知送信に失敗しました:`, error);
    }
};

// 管理者にメールを送信する関数
const sendGmailToAdmin = async (fromGmail, messageBody) => {
    console.log('fromGmail:', fromGmail);
    console.log('messageBody:', messageBody);
    const mailOptions = {
        from: fromGmail, // 送信元（リクエストデータから取得）
        to: ADMIN_GMAIL, // 送信先（管理者）
        subject: '新着メッセージ', // メールの件名
        text: messageBody, // メール本文
    };

    console.log('mailOptions:', mailOptions);

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('管理者にメールを送信しました:', info.response);
    } catch (error) {
        console.error('メール送信に失敗しました:', error);
    }
};

// 受け取ったJSONデータを処理する関数
const processIncomingData = async (data) => {
    const { fcmtoken, gmail, message } = data;

    // FCM通知を送信
    await sendPushForToken('新しいメッセージ', message, fcmtoken);

    // 管理者にメール送信（送信元をgmailから取得）
    await sendGmailToAdmin(gmail, `Gmail: ${gmail}\nメッセージ内容: ${message}`);
};

app.post('/send', async (req, res) => {
    const data = req.body;
    console.log('受け取ったデータ:', data);

    try {
        await processIncomingData(data);
        res.status(200).json({ message: '処理が完了しました。' });
    } catch (error) {
        res.status(500).json({ message: '処理に失敗しました。' });
    }
});

app.listen(port, () => {
    console.log(`サーバがポート${port}で起動しました`);
});