const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); 
const dotenv = require('dotenv');

// 環境変数をロード
dotenv.config();
const FCMTOKEN = process.env.FCMTOKEN; // 環境変数からFCMトークンを取得
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
        // token: FCMTOKEN, // 送信先のデバイスのFCMトークン
        topic: 'allUsers',
    };
    try {
        const response = await admin.messaging().send(message);
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
        InsertNotification('新店舗情報', `${newShopName} が新しくオープンしました！`);
    })
    .on('postgres_changes',{
        event: 'UPDATE',
        schema: 'public',
        table: 'shops',
    }, (payload) => {
        const updatedShopName = payload.new.name; // 更新された店舗の名前
        sendPushNotification('店舗更新情報', `${updatedShopName} の情報を更新しました！`);
        InsertNotification('店舗更新情報', `${updatedShopName} の情報を更新しました！`);
    })
    .on('postgres_changes',{
        event: 'INSERT',
        schema: 'public',
        table: 'products',
    }, (payload) => {
        const newProductTitle = payload.new.title; // 新しい商品のタイトル
        sendPushNotification('新商品情報', `${newProductTitle} が新しく入荷しました！`);
        InsertNotification('新商品情報', `${newProductTitle} が新しく入荷しました！`);
    })
    .on('postgres_changes',{
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
    }, (payload) => {
        const updatedProductTitle = payload.new.title; // 更新された商品のタイトル
        sendPushNotification('商品更新情報', `${updatedProductTitle} の情報を更新しました！`);
        InsertNotification('商品更新情報', `${updatedProductTitle} の情報を更新しました！`);
    })
    .subscribe();
};

// 変更監視の開始
listenForChanges();