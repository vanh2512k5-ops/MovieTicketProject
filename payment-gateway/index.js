const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Dữ liệu giả lập (thực tế là DB)
const bills = {}; 

// Thông tin tài khoản nhận tiền giả lập
const BANK_ACCOUNT = {
  bankId: 'mbbank',
  accountNo: '2836250105',
  accountName: 'LE VIET ANH'
};

// Hàm lấy secret key theo merchantId
function getSecretKey(merchantId) {
  return process.env[`${merchantId}_SECRET`] || null;
}

function generateHmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// API 1: Nhận yêu cầu tạo bill từ Business BE
app.post('/bill/create', (req, res) => {
  const { merchantId, orderId, amount, timestamp, callbackUrl } = req.body;
  const receivedSignature = req.headers['x-signature'];

  // Lấy secret key của merchant
  const secretKey = getSecretKey(merchantId);
  if (!secretKey) {
    return res.status(403).json({ error: 'Unknown merchant' });
  }

  // Xác minh chữ ký từ BE
  const dataToVerify = `${merchantId}|${orderId}|${amount}|${timestamp}`;
  const expectedSig  = generateHmac(dataToVerify, secretKey);

  if (expectedSig !== receivedSignature) {
    console.warn(`[GW]   Chữ ký sai từ merchant ${merchantId}`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Kiểm tra timestamp (chống replay attack)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) { // 5 phút
    return res.status(400).json({ error: 'Request expired' });
  }

  // Tạo bill
  const billId = 'BILL_' + Date.now();
  bills[billId] = { merchantId, orderId, amount, callbackUrl, status: 'PENDING' };

  console.log(`[GW]  Tạo bill ${billId} cho đơn ${orderId}`);

  // Trả về thông tin tài khoản để BE tạo VietQR
  res.json({
    billId,
    bankId:      BANK_ACCOUNT.bankId,
    bankAccount: BANK_ACCOUNT.accountNo,
    accountName: BANK_ACCOUNT.accountName,
  });
});

// API 2: Giả lập GW nhận tiền → gọi callback về BE
app.post('/simulate-payment', async (req, res) => {
  const { orderId } = req.body;

  // Tìm bill theo orderId
  const bill = Object.entries(bills).find(([, b]) => b.orderId == orderId);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  const [billId, billData] = bill;
  const { merchantId, amount, callbackUrl } = billData;

  // Cập nhật trạng thái
  billData.status = 'SUCCESS';

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const secretKey = getSecretKey(merchantId);
  
  // Đảm bảo orderId là chuỗi (string) để C# không bị lỗi Parse (400 Bad Request)
  const orderIdStr = String(orderId);

  // Ký callback trước khi gửi về BE
  const dataToSign = `${merchantId}|${orderIdStr}|${billId}|${amount}|SUCCESS|${timestamp}`;
  const signature  = generateHmac(dataToSign, secretKey);

  console.log(`[GW]  Gửi callback về BE: ${callbackUrl}`);

  try {
    await axios.post(
      callbackUrl,
      { merchantId, orderId: orderIdStr, billId, amount, status: 'SUCCESS', timestamp },
      { headers: { 'X-Signature': signature } }
    );
    console.log(`[GW]  Callback thành công`);
    res.json({ ok: true });
  } catch (error) {
    console.error(`[GW]  Callback thất bại: ${error.message}`);
    res.status(500).json({ error: 'Callback failed' });
  }
});

const port = process.env.GW_PORT || 4000;
app.listen(port, () => {
  console.log(`[GW] Cổng thanh toán giả lập chạy tại port ${port}`);
});
