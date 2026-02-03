const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const amqp = require('amqplib');
const { createClient } = require('redis');
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

let redisClient;
let rabbitChannel;

// Email transporter (using Ethereal for testing)
let emailTransporter;

const setupEmailTransporter = async () => {
  // Create test account for development
  const testAccount = await nodemailer.createTestAccount();

  emailTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('✅ Email transporter ready');
  console.log(`📧 Test email account: ${testAccount.user}`);
};

// Email templates
const emailTemplates = {
  USER_REGISTERED: Handlebars.compile(`
    <h1>Chào mừng đến với Bida Booking!  🎱</h1>
    <p>Xin chào <strong>{{fullName}}</strong>,</p>
    <p>Cảm ơn bạn đã đăng ký tài khoản tại Bida Booking.</p>
    <p>Bạn có thể bắt đầu đặt bàn ngay bây giờ! </p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  BOOKING_CREATED: Handlebars.compile(`
    <h1>Xác nhận đặt bàn 🎱</h1>
    <p>Đơn đặt bàn của bạn đã được tạo thành công!</p>
    <h3>Chi tiết đặt bàn:</h3>
    <ul>
      <li><strong>Mã đặt bàn:</strong> {{bookingId}}</li>
      <li><strong>Ngày: </strong> {{bookingDate}}</li>
      <li><strong>Thời gian:</strong> {{startTime}} - {{endTime}}</li>
      <li><strong>Tổng tiền:</strong> {{totalAmount}}đ</li>
    </ul>
    <p>Vui lòng thanh toán để xác nhận đặt bàn.</p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  BOOKING_CONFIRMED: Handlebars.compile(`
    <h1>Đặt bàn đã được xác nhận ✅</h1>
    <p>Đơn đặt bàn <strong>#{{bookingId}}</strong> của bạn đã được xác nhận! </p>
    <p>Hẹn gặp bạn tại câu lạc bộ. </p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  BOOKING_COMPLETED: Handlebars.compile(`
    <h1>Cảm ơn bạn đã sử dụng dịch vụ 🎉</h1>
    <p>Đơn đặt bàn <strong>#{{bookingId}}</strong> đã hoàn thành.</p>
    <p>Hy vọng bạn đã có những giây phút thư giãn tuyệt vời!</p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  BOOKING_CANCELLED: Handlebars.compile(`
    <h1>Đặt bàn đã bị hủy ❌</h1>
    <p>Đơn đặt bàn <strong>#{{bookingId}}</strong> đã được hủy.</p>
    <p>Nếu bạn đã thanh toán, tiền sẽ được hoàn lại trong 3-5 ngày làm việc.</p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  PAYMENT_COMPLETED: Handlebars.compile(`
    <h1>Thanh toán thành công 💰</h1>
    <p>Cảm ơn bạn đã thanh toán cho đơn đặt bàn <strong>#{{bookingId}}</strong>! </p>
    <p>Đơn đặt bàn của bạn đã được xác nhận. </p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  PAYMENT_REFUNDED: Handlebars.compile(`
    <h1>Hoàn tiền thành công 💸</h1>
    <p>Chúng tôi đã hoàn lại <strong>{{amount}}đ</strong> cho bạn. </p>
    <p>Lý do: {{reason}}</p>
    <p>Tiền sẽ được chuyển về tài khoản của bạn trong 3-5 ngày làm việc.</p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),

  BOOKING_REMINDER: Handlebars.compile(`
    <h1>Nhắc nhở đặt bàn ⏰</h1>
    <p>Đây là lời nhắc cho đơn đặt bàn của bạn: </p>
    <ul>
      <li><strong>Ngày: </strong> {{bookingDate}}</li>
      <li><strong>Thời gian:</strong> {{startTime}}</li>
      <li><strong>Địa điểm:</strong> {{clubName}}</li>
    </ul>
    <p>Hẹn gặp bạn! </p>
    <p>Trân trọng,<br>Đội ngũ Bida Booking</p>
  `),
};

const connectRedis = async () => {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.log('Redis Error:', err));
  await redisClient.connect();
  console.log('✅ Connected to Redis');
};

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitChannel = await connection.createChannel();

    await rabbitChannel.assertQueue('notification_queue', { durable: true });

    // Listen for notifications
    rabbitChannel.consume('notification_queue', async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        await handleNotification(event);
        rabbitChannel.ack(msg);
      }
    });

    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

// Send email
const sendEmail = async (to, subject, html) => {
  try {
    const info = await emailTransporter.sendMail({
      from: '"Bida Booking" <noreply@bidabooking.com>',
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent:  ${info.messageId}`);
    console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);

    return info;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
};

// Handle notification
const handleNotification = async (event) => {
  console.log('📧 Processing notification:', event.type);

  const notification = {
    id: `notif_${Date.now()}`,
    type: event.type,
    data: event.data,
    timestamp: new Date().toISOString(),
    read: false,
  };

  try {
    // Get email template
    const template = emailTemplates[event.type];

    if (template) {
      const html = template(event.data);
      let subject = '';
      let message = ''; // Add message for frontend

      switch (event.type) {
        case 'USER_REGISTERED':
          subject = 'Chào mừng đến với Bida Booking!  🎱';
          message = 'Chào mừng bạn đến với Bida Booking!';
          break;
        case 'BOOKING_CREATED':
          subject = `Xác nhận đặt bàn #${event.data.bookingId}`;
          message = `Bạn đã đặt bàn thành công. Mã đơn: #${event.data.bookingId}`;
          break;
        case 'BOOKING_CONFIRMED':
          subject = `Đặt bàn #${event.data.bookingId} đã được xác nhận ✅`;
          message = `Đơn đặt bàn #${event.data.bookingId} của bạn đã được xác nhận.`;
          break;
        case 'BOOKING_CANCELLED':
          subject = `Đặt bàn #${event.data.bookingId} đã bị hủy`;
          message = `Đơn đặt bàn #${event.data.bookingId} đã bị hủy.`;
          break;
        case 'BOOKING_COMPLETED': // Add missing case
          subject = `Đơn đặt bàn #${event.data.bookingId} đã hoàn thành`;
          message = `Cảm ơn bạn đã sử dụng dịch vụ. Đơn #${event.data.bookingId} đã hoàn thành.`;
          break;
        case 'PAYMENT_COMPLETED':
          subject = `Thanh toán thành công cho đơn #${event.data.bookingId}`;
          message = `Thanh toán thành công cho đơn #${event.data.bookingId}.`;
          break;
        case 'PAYMENT_REFUNDED':
          subject = 'Hoàn tiền thành công';
          message = `Bạn đã được hoàn tiền ${event.data.amount}đ.`;
          break;
        case 'BOOKING_REMINDER':
          subject = 'Nhắc nhở:  Bạn có lịch đặt bàn hôm nay! ';
          message = `Nhắc nhở: Bạn có lịch đặt bàn vào ${event.data.startTime} hôm nay.`;
          break;
      }

      // Update notification object with message
      notification.message = message;
      notification.title = subject; // Also good to have title

      // In production, get user email from database
      if (event.data.email) {
        await sendEmail(event.data.email, subject, html);
      }

      console.log(`✅ Notification processed: ${event.type}`);
    }

    // Store in Redis for real-time notifications
    if (event.data.userId) {
      const key = `notifications:${event.data.userId}`;
      await redisClient.lPush(key, JSON.stringify(notification));
      await redisClient.lTrim(key, 0, 49); // Keep last 50
      await redisClient.expire(key, 86400 * 30); // Expire after 30 days

      // Publish for real-time WebSocket delivery
      await redisClient.publish('notifications', JSON.stringify({
        userId: event.data.userId,
        notification,
      }));
    }
  } catch (error) {
    console.error('Handle notification error:', error);
  }
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Get user notifications
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const notifications = await redisClient.lRange(
      `notifications:${userId}`,
      parseInt(offset),
      parseInt(offset) + parseInt(limit) - 1
    );

    const total = await redisClient.lLen(`notifications:${userId}`);

    res.json({
      notifications: notifications.map(n => JSON.parse(n)),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const key = `notifications:${userId}`;
    const notifications = await redisClient.lRange(key, 0, -1);

    const updatedNotifications = notifications.map(n => {
      const notif = JSON.parse(n);
      if (notif.id === id) {
        notif.read = true;
      }
      return JSON.stringify(notif);
    });

    // Replace list
    await redisClient.del(key);
    if (updatedNotifications.length > 0) {
      await redisClient.rPush(key, updatedNotifications);
    }

    res.json({ message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Mark all notifications as read
app.patch('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    const key = `notifications:${userId}`;
    const notifications = await redisClient.lRange(key, 0, -1);

    const updatedNotifications = notifications.map(n => {
      const notif = JSON.parse(n);
      notif.read = true;
      return JSON.stringify(notif);
    });

    await redisClient.del(key);
    if (updatedNotifications.length > 0) {
      await redisClient.rPush(key, updatedNotifications);
    }

    res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get unread count
app.get('/api/notifications/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await redisClient.lRange(`notifications:${userId}`, 0, -1);
    const unreadCount = notifications.filter(n => !JSON.parse(n).read).length;

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Send test notification (for development)
app.post('/api/notifications/test', async (req, res) => {
  try {
    const { userId, type, data } = req.body;

    await handleNotification({ type, data: { ...data, userId } });

    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

const PORT = process.env.PORT || 3005;

const startServer = async () => {
  await connectRedis();
  await connectRabbitMQ();
  await setupEmailTransporter();

  app.listen(PORT, () => {
    console.log(`🚀 Notification Service running on port ${PORT}`);
  });
};

startServer();