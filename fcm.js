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


const listenOrder = async () => {
    const channel = supabase
    .channel('*')
    .on('postgres_changes',{
        event: 'INSERT',
        schema: 'public',
        table: 'order',
    }, (payload) => {
        sendmail(payload.new);
    })
    .subscribe();
};

// 管理者にメールを送信する関数
const sendmail = async (message) => {
    console.log('message:', message);
    var body = `名前：${message.name}\n`+
                `郵便番号：${message.postalcode}\n`+
                `住所：${message.address}\n`+
                `メールアドレス：${message.email}\n`+
                `注文内容\n${message.order}\n`+
                `合計金額：¥${message.sum}\n`+
                `店舗：${message.shop}`;

    const mailOptions = {
        from: ADMIN_GMAIL, // 送信元（リクエストデータから取得）
        to: ADMIN_GMAIL, // 送信先（管理者）
        subject: `${message.email}から注文連絡`, // メールの件名
        text: body, // メール本文
    };

    console.log('mailOptions:', mailOptions);

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('管理者にメールを送信しました:', info.response);
        sendPushForToken(message);
    } catch (error) {
        console.error('メール送信に失敗しました:', error);
    }
};

// FCM通知を送信する関数
const sendPushForToken = async (messagebody) => {
    const message = {
        notification: {
            title: `${messagebody.name}さんからの商品の購入を受け付けました`,
            body: `注文内容\n${messagebody.order}\n合計金額：¥${messagebody.sum}\n以降の連絡はメールで行います．配達までしばらくお待ちください`,
        },
        token: messagebody.fcmtoken, // 特定のデバイス宛のトークン
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`トークン ${messagebody.fcmtoken} に通知が送信されました:`, response);
    } catch (error) {
        console.error(`トークン ${messagebody.fcmtoken} への通知送信に失敗しました:`, error);
    }
};


// 変更監視の開始
listenForChanges();
listenOrder();
