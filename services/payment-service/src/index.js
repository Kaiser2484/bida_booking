const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const amqp = require('amqplib');
const crypto = require('crypto');
const querystring = require('querystring');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let rabbitChannel;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitChannel = await connection.createChannel();

    await rabbitChannel.assertQueue('payment_queue', { durable: true });
    await rabbitChannel.assertQueue('notification_queue', { durable: true });
    await rabbitChannel.assertQueue('booking_events', { durable: true });

    // Listen for payment requests from booking service
    rabbitChannel.consume('payment_queue', async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        await handlePaymentEvent(event);
        rabbitChannel.ack(msg);
      }
    });

    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const handlePaymentEvent = async (event) => {
  if (event.type === 'CREATE_PAYMENT') {
    const { bookingId, amount, userId } = event.data;

    try {
      await pool.query(
        `INSERT INTO payments (booking_id, amount, payment_method, status)
         VALUES ($1, $2, 'pending', 'pending')
         ON CONFLICT (booking_id) DO NOTHING`,
        [bookingId, amount]
      );
      console.log(`💰 Payment created for booking ${bookingId}:  ${amount}đ`);
    } catch (error) {
      console.error('Create payment error:', error);
    }
  }
};

const publishEvent = (queue, message) => {
  if (rabbitChannel) {
    rabbitChannel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }
};

// ==================== VNPAY CONFIG (Mock) ====================
const VNPAY_CONFIG = {
  vnp_TmnCode: 'DEMO_VNPAY',
  vnp_HashSecret: 'DEMOSECRETKEY123456789',
  vnp_Url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: 'http://localhost:3004/api/payments/vnpay-return',
};

// Sort object by key
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

// Get payment by booking ID
app.get('/api/payments/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await pool.query(
      `SELECT p.*, b.total_price as booking_amount, b.status as booking_status,
              b.start_time, b.end_time
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.booking_id = $1`,
      [bookingId]
    );
    res.json({ payment: result.rows[0] || null });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get payment by booking ID
app.get('/api/payments/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await pool.query(
      `SELECT * FROM payments WHERE booking_id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment: result.rows[0] });
  } catch (error) {
    console.error('Get payment by booking ID error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get user payments
app.get('/api/payments/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT p.*, b.start_time, b.end_time,
              t.table_number, c.name as club_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN tables t ON b.table_id = t.id
       JOIN clubs c ON t.club_id = c.id
       WHERE b.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Create VNPay payment URL
app.post('/api/payments/create-vnpay-url', async (req, res) => {
  try {
    const { bookingId, amount, bankCode, language } = req.body;

    const date = new Date();
    const createDate = date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const orderId = `${bookingId}_${Date.now()}`;

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY_CONFIG.vnp_TmnCode,
      vnp_Locale: language || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan dat ban bida #${bookingId}`,
      vnp_OrderType: 'billpayment',
      vnp_Amount: amount * 100, // VNPay requires amount * 100
      vnp_ReturnUrl: VNPAY_CONFIG.vnp_ReturnUrl,
      vnp_IpAddr: req.ip || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnp_Params.vnp_BankCode = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params.vnp_SecureHash = signed;

    const paymentUrl = `${VNPAY_CONFIG.vnp_Url}?${querystring.stringify(vnp_Params, { encode: false })}`;

    // Update payment with order ID
    await pool.query(
      `UPDATE payments SET transaction_id = $1 WHERE booking_id = $2`,
      [orderId, bookingId]
    );

    res.json({
      paymentUrl,
      orderId,
      // For demo, also return a mock success URL
      mockSuccessUrl: `http://localhost:3004/api/payments/mock-success/${bookingId}`,
    });
  } catch (error) {
    console.error('Create VNPay URL error:', error);
    res.status(500).json({ error: 'Lỗi tạo link thanh toán' });
  }
});

// VNPay return URL handler
app.get('/api/payments/vnpay-return', async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const orderId = vnp_Params.vnp_TxnRef;
    const bookingId = orderId.split('_')[0];
    const responseCode = vnp_Params.vnp_ResponseCode;

    if (secureHash === signed && responseCode === '00') {
      // Payment successful
      await pool.query(
        `UPDATE payments 
         SET status = 'completed', payment_method = 'vnpay', paid_at = NOW()
         WHERE booking_id = $1`,
        [bookingId]
      );

      // Update booking status
      publishEvent('booking_events', {
        type: 'PAYMENT_COMPLETED',
        data: { bookingId },
      });

      // Send notification
      publishEvent('notification_queue', {
        type: 'PAYMENT_COMPLETED',
        data: { bookingId },
      });

      // Redirect to success page
      res.redirect(`http://localhost:5173/payment-success? bookingId=${bookingId}`);
    } else {
      // Payment failed
      await pool.query(
        `UPDATE payments SET status = 'failed' WHERE booking_id = $1`,
        [bookingId]
      );

      res.redirect(`http://localhost:5173/payment-failed?bookingId=${bookingId}`);
    }
  } catch (error) {
    console.error('VNPay return error:', error);
    res.redirect('http://localhost:5173/payment-failed');
  }
});

// Mock success payment (for testing without VNPay)
app.get('/api/payments/mock-success/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const transactionId = `MOCK_${Date.now()}`;

    await pool.query(
      `UPDATE payments 
       SET status = 'completed', payment_method = 'mock', 
           transaction_id = $1, paid_at = NOW()
       WHERE booking_id = $2`,
      [transactionId, bookingId]
    );

    // Confirm booking
    await pool.query(
      `UPDATE bookings SET status = 'confirmed' WHERE id = $1`,
      [bookingId]
    );

    publishEvent('notification_queue', {
      type: 'PAYMENT_COMPLETED',
      data: { bookingId },
    });

    res.redirect(`http://localhost:5173/payment-success?bookingId=${bookingId}`);
  } catch (error) {
    console.error('Mock payment error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Process cash payment (staff)
app.post('/api/payments/: id/cash', async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const transactionId = `CASH_${Date.now()}`;

    const result = await pool.query(
      `UPDATE payments 
       SET payment_method = 'cash', status = 'completed', 
           transaction_id = $1, paid_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [transactionId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy payment' });
    }

    const payment = result.rows[0];

    // Confirm booking
    await pool.query(
      `UPDATE bookings SET status = 'confirmed' WHERE id = $1`,
      [payment.booking_id]
    );

    publishEvent('notification_queue', {
      type: 'PAYMENT_COMPLETED',
      data: { bookingId: payment.booking_id, paymentMethod: 'cash' },
    });

    res.json({ message: 'Thanh toán tiền mặt thành công', payment });
  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Refund payment
app.post('/api/payments/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE payments 
       SET status = 'refunded'
       WHERE id = $1 AND status = 'completed'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Không thể hoàn tiền' });
    }

    const payment = result.rows[0];

    publishEvent('notification_queue', {
      type: 'PAYMENT_REFUNDED',
      data: {
        bookingId: payment.booking_id,
        amount: payment.amount,
        reason,
      },
    });

    res.json({ message: 'Hoàn tiền thành công', payment });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get payment statistics (admin)
app.get('/api/payments/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default values
    const start = startDate || '1970-01-01';
    const end = endDate || new Date().toISOString();

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_payments,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
        SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunded
       FROM payments
       WHERE created_at >= $1::timestamp
       AND created_at <= $2::timestamp`,
      [start, end]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

const PORT = process.env.PORT || 3004;

const startServer = async () => {
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`🚀 Payment Service running on port ${PORT}`);
  });
};

startServer();