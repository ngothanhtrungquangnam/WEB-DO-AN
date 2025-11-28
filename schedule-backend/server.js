const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dayjs = require('dayjs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import Middleware
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');

const app = express();

// ✅ SỬA: Cấu hình CORS an toàn
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://thankful-sea-0dc589b00.3.azurestaticapps.net/login', // ✅ Sửa: bd8 không phải b00
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn('⚠️ CORS blocked:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ SỬA: Dùng environment variables thay vì hard-code
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_12345';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('⚠️ WARNING: JWT_SECRET chưa được thiết lập trong production!');
}

// ✅ SỬA: Dùng environment variables cho database
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'mysql-2f0f2f65-quanlylichtuan2025.g.aivencloud.com',
    port: parseInt(process.env.DB_PORT || '11845'),
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_0yRZ11XzXUYlvr1inPx',
    database: process.env.DB_NAME || 'defaultdb',
    connectTimeout: 10000,
    ssl: {
        rejectUnauthorized: false    
    }
});

db.connect((err) => {
    if (err) {
        console.error('❌ Kết nối Database thất bại:', err);
        process.exit(1);
    }
    console.log('✅ Đã kết nối Database Aiven thành công!');
});

// ✅ THÊM: Middleware logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ✅ THÊM: Health check endpoints
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Lịch Tuần API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        database: db ? 'connected' : 'disconnected'
    });
});

// =====================================================================================
//                                API XÁC THỰC (AUTH)
// =====================================================================================

// API ĐĂNG NHẬP
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi máy chủ.' });
        if (results.length === 0) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });

        const user = results[0];

        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Tài khoản đang chờ duyệt. Vui lòng liên hệ Admin.' });
        }
        if (user.status === 'rejected') { 
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị từ chối.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, fullName: user.fullName, hostName: user.hostName }, 
            JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ 
            message: 'Đăng nhập thành công!',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                fullName: user.fullName,
                status: user.status,
                hostName: user.hostName
            }
        });
    });
});

// API ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    const { email, password, fullName, hostName } = req.body;
    
    if (!email || !password || !fullName || !hostName) return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    
    const defaultRole = 'user';
    const defaultStatus = 'pending'; 

    try {
        const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(409).json({ message: 'Email đã tồn tại.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
       // Chỉ INSERT vào hostName, bỏ fullName đi
const sql = `INSERT INTO users (email, passwordHash, role, status, hostName) VALUES (?, ?, ?, ?, ?)`;
// Truyền fullName (hoặc hostName) vào vị trí của hostName
await db.promise().query(sql, [email, hashedPassword, defaultRole, defaultStatus, fullName || hostName]);
        
        res.status(201).json({ message: 'Đăng ký thành công! Vui lòng chờ Admin duyệt.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
});

// API GỬI YÊU CẦU QUÊN MẬT KHẨU
app.post('/api/forgot-password-request', (req, res) => {
    const { email, fullName } = req.body;
    
    if (!email || !fullName) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Email và Tên của bạn.' });
    }

   // Tìm theo hostName
const findUserSql = 'SELECT id, email, hostName FROM users WHERE email = ? AND hostName = ?';
    
    db.query(findUserSql, [email, fullName], (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Thông tin không khớp với bất kỳ tài khoản nào.' });
        }

        const user = results[0];
        const checkPendingSql = 'SELECT id FROM password_reset_requests WHERE user_id = ? AND status = "pending"';
        
        db.query(checkPendingSql, [user.id], (err, pendingResults) => {
            if (pendingResults.length > 0) {
                return res.status(409).json({ message: 'Bạn đã có yêu cầu đang chờ xử lý.' });
            }

            // ✅ SỬA: Dùng hostName thay vì fullName
            const insertSql = 'INSERT INTO password_reset_requests (user_id, email, fullName) VALUES (?, ?, ?)';
            db.query(insertSql, [user.id, user.email, user.hostName], (insertErr) => {
                if (insertErr) return res.status(500).json({ message: 'Lỗi server.' });
                res.json({ message: 'Đã gửi yêu cầu thành công!' });
            });
        });
    });
});

// =====================================================================================
//                             API ADMIN (CORE CHO BÀI TOÁN)
// =====================================================================================

// 🆕 1. API MỚI: ĐẾM SỐ YÊU CẦU ĐANG CHỜ (Cho Menu Badge)
app.get('/api/admin/stats/pending-schedules', authMiddleware, adminMiddleware, (req, res) => {
    // 👇 SỬA LẠI: Đếm trong bảng 'schedules' thay vì 'password_reset_requests'
    const sql = "SELECT COUNT(*) as count FROM schedules WHERE trangThai = 'cho_duyet'";
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        res.json({ count: results[0].count });
    });
});
// API: Lấy tổng hợp các số liệu cần duyệt (Dùng cho MainLayout)
app.get('/api/admin/stats/general', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // 1. Đếm Lịch chờ duyệt
        const [schedules] = await db.promise().query("SELECT COUNT(*) as count FROM schedules WHERE trangThai = 'cho_duyet'");
        
        // 2. Đếm Tài khoản mới đăng ký (pending) -> Cho menu "Tài khoản cần duyệt"
        const [users] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE status = 'pending'");

        // 3. Đếm Yêu cầu Reset mật khẩu (pending) -> Cho menu "Quản lý tài khoản"
        const [resets] = await db.promise().query("SELECT COUNT(*) as count FROM password_reset_requests WHERE status = 'pending'");

        res.json({
            pendingSchedules: schedules[0].count,
            pendingUsers: users[0].count,       // Số user mới
            pendingResets: resets[0].count      // Số yêu cầu cấp lại mật khẩu
        });
    } catch (err) {
        console.error('Lỗi lấy stats:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 🔄 2. API CẬP NHẬT: LẤY DANH SÁCH USERS (Thêm cột requestCount)
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    // Subquery đếm requestCount: > 0 nghĩa là có yêu cầu
  const sql = `
    SELECT u.id, u.email, u.role, u.status, u.hostName as fullName,
           (SELECT COUNT(*) FROM password_reset_requests r WHERE r.user_id = u.id AND r.status = 'pending') as requestCount
    FROM users u
    ORDER BY requestCount DESC, u.id DESC
`;
    // ORDER BY requestCount DESC sẽ đưa người có yêu cầu lên đầu
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi lấy danh sách users:', err);
            return res.status(500).json({ message: 'Lỗi server.' });
        }
        res.json(results);
    });
});

// 3. API ADMIN: Duyệt tài khoản đăng ký
app.patch('/api/admin/users/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) return res.status(403).json({ message: 'Không thể tự duyệt chính mình.' });

    const sql = "UPDATE users SET status = 'active' WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy user.' });
        res.json({ message: 'Đã duyệt tài khoản thành công!' });
    });
});

// 🔄 4. API CẬP NHẬT: RESET MẬT KHẨU (VÀ ĐÓNG YÊU CẦU NẾU CÓ)
app.patch('/api/admin/users/:id/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
        return res.status(403).json({ message: 'Không thể tự reset chính mình.' });
    }

    const DEFAULT_PASSWORD = '123456'; 

    try {
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Bước 1: Cập nhật mật khẩu User
        await db.promise().query("UPDATE users SET passwordHash = ? WHERE id = ?", [hashedPassword, id]);

        // Bước 2: Cập nhật trạng thái yêu cầu thành 'done' (nếu có) để tắt thông báo đỏ
        await db.promise().query("UPDATE password_reset_requests SET status = 'done' WHERE user_id = ? AND status = 'pending'", [id]);
        
        res.json({ 
            message: `Đã cấp lại mật khẩu thành công! Mật khẩu mới là: ${DEFAULT_PASSWORD}` 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
});

// 5. API XÓA USER
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) return res.status(403).json({ message: 'Không thể xóa chính mình.' });

    const sql = "DELETE FROM users WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi server (có thể do dữ liệu ràng buộc).' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy user.' });
        res.json({ message: 'Đã xóa/từ chối người dùng thành công.' });
    });
});

// =====================================================================================
//                                  CÁC API KHÁC
// =====================================================================================

app.get('/api/active-users', authMiddleware, (req, res) => {

    const sql = `
        SELECT 
            email as value, 
            CASE 
                WHEN status = 'pending' THEN CONCAT(hostName, ' (Chờ duyệt)') 
                ELSE hostName 
            END as label 
        FROM users 
        WHERE status IN ('active', 'pending') OR role IN ('admin', 'manager') 
        ORDER BY hostName ASC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi lấy danh sách chủ trì:', err);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
        res.json(results);
    });
});
// Lấy danh sách Lịch
app.get('/api/schedules', authMiddleware, (req, res) => {
    const { startDate, endDate, chuTri, trangThai, isMySchedule, isMyCreation, isFilterCanceled } = req.query; 
    const currentUserEmail = req.user.email;
    const currentUserRole = req.user.role;

    let sql = "SELECT * FROM schedules WHERE 1=1";
    const params = [];

    if (startDate && endDate) { sql += " AND ngay BETWEEN ? AND ?"; params.push(startDate, endDate); }
    if (isMyCreation === 'true') { sql += " AND chuTriEmail = ?"; params.push(currentUserEmail); }
    if (isMySchedule === 'true') { sql += " AND thanhPhan LIKE ?"; params.push(`%${currentUserEmail}%`); }
    if (isFilterCanceled === 'true') { sql += " AND trangThai = 'huy'"; }
    if (chuTri) { sql += " AND chuTriEmail = ?"; params.push(chuTri); }
    if (trangThai && trangThai !== 'Tất cả') { sql += " AND trangThai = ?"; params.push(trangThai); }
if (currentUserRole !== 'admin' && currentUserRole !== 'manager' && !isMyCreation) {
    // Logic mới: Hiển thị "Đã duyệt" HOẶC "Lịch của chính mình (dù chưa duyệt)"
    sql += " AND (trangThai = 'da_duyet' OR chuTriEmail = ?)";
    params.push(currentUserEmail);
}

    sql += " ORDER BY ngay ASC, batDau ASC";

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Lỗi lấy lịch' });
        res.json(results);
    });
});

// Đăng ký Lịch
app.post('/api/schedules', authMiddleware, (req, res) => {
    // 👇 THÊM isBoSung VÀO ĐÂY
    const { ngay, thoiGian, thuocPhuLuc, isBoSung, noiDung, thanhPhan, guiMail, diaDiem, chuTriTen, chuTriEmail } = req.body;
    
    const ngayFormatted = dayjs(ngay).format('YYYY-MM-DD');
    const batDauFormatted = thoiGian ? dayjs(thoiGian[0]).format('HH:mm:ss') : '07:00:00';
    const ketThucFormatted = thoiGian ? dayjs(thoiGian[1]).format('HH:mm:ss') : '11:00:00';

    // 👇 CẬP NHẬT CÂU SQL: THÊM CỘT isBoSung
    const sql = `
        INSERT INTO schedules 
        (ngay, batDau, ketThuc, thuocPhuLuc, isBoSung, noiDung, thanhPhan, guiMail, diaDiem, chuTriTen, chuTriEmail, trangThai) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cho_duyet')
    `;
    
    // 👇 THÊM BIẾN isBoSung VÀO MẢNG VALUES
    const values = [
        ngayFormatted, batDauFormatted, ketThucFormatted, 
        thuocPhuLuc, isBoSung, // <-- Nhớ thêm vào đây
        noiDung, thanhPhan, guiMail, diaDiem, chuTriTen, chuTriEmail
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Lỗi insert:', err); // Log lỗi để dễ debug
            return res.status(500).json({ error: 'Lỗi server.' });
        }
        res.status(201).json({ message: 'Đăng ký thành công! Lịch đang chờ duyệt.' });
    });
});

// Duyệt Lịch
app.patch('/api/schedules/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
    db.query("UPDATE schedules SET trangThai = 'da_duyet' WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Lỗi server.' });
        res.status(200).json({ message: 'Duyệt lịch thành công!' });
    });
});

// Hủy Lịch
app.delete('/api/schedules/:id', authMiddleware, (req, res) => {
    let sql = "DELETE FROM schedules WHERE id = ?";
    let params = [req.params.id];
    if (req.user.role !== 'admin') {
        sql += " AND chuTriEmail = ?";
        params.push(req.user.email);
    }
    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: 'Lỗi server.' });
        if (result.affectedRows === 0) return res.status(403).json({ error: 'Không thể xóa.' });
        res.json({ message: 'Đã xóa lịch.' });
    });
});

// --- API LOCATIONS ---
app.get('/api/locations', authMiddleware, (req, res) => {
    db.query("SELECT * FROM locations ORDER BY ten", (err, resSql) => res.json(resSql));
});
app.post('/api/locations', authMiddleware, adminMiddleware, (req, res) => {
    db.query("INSERT INTO locations (ten) VALUES (?)", [req.body.ten], (err, r) => res.json({ message: 'Thêm thành công', id: r.insertId }));
});
app.delete('/api/locations/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.query("DELETE FROM locations WHERE id = ?", [req.params.id], (err, r) => res.json({ message: 'Đã xóa' }));
});

// --- API USER PROFILE ---
// --- API USER PROFILE ---
// --- API USER PROFILE ---
app.get('/api/user/profile', authMiddleware, (req, res) => {
    // 👇 SỬA LẠI: Chỉ gọi 'hostName', xóa 'fullName' đi
    db.query('SELECT id, email, role, status, hostName FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err) {
            console.error("Lỗi lấy profile:", err);
            return res.status(500).json({ message: 'Lỗi server.' });
        }
        
        if (!results || results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy user.' });
        }

        // Nếu frontend của bạn vẫn cần biến tên là fullName, ta gán nó bằng hostName
        const user = results[0];
        user.fullName = user.hostName; // ✅ Mẹo nhỏ: Gán hostName vào fullName để frontend không bị lỗi hiển thị

        res.json(user);
    });
});
app.put('/api/user/profile', authMiddleware, (req, res) => {
    // 👇 Sửa fullName thành hostName
    // Lưu ý: req.body.fullName là dữ liệu gửi lên từ form (có thể giữ nguyên), nhưng cột trong DB phải là hostName
    const newName = req.body.fullName || req.body.hostName; // Lấy tên mới

    db.query('UPDATE users SET hostName = ? WHERE id = ?', [newName, req.user.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Lỗi cập nhật" });
        }
        res.json({ message: 'Cập nhật thành công.' });
    });
});

// ✅ SỬA: Thêm error handling đầy đủ
app.patch('/api/user/password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    db.query('SELECT passwordHash FROM users WHERE id = ?', [userId], async (err, results) => {
        if (err) {
            console.error('Lỗi query password:', err);
            return res.status(500).json({ message: 'Lỗi server.' });
        }
        
        if (!results || results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy user.' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, results[0].passwordHash);
        if (!isMatch) return res.status(401).json({ message: 'Mật khẩu sai.' });
        
        const newHashed = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET passwordHash = ? WHERE id = ?', [newHashed, userId], (updateErr) => {
            if (updateErr) {
                console.error('Lỗi update password:', updateErr);
                return res.status(500).json({ message: 'Lỗi server.' });
            }
            res.json({ message: 'Đổi mật khẩu thành công.' });
        });
    });
});

// ✅ THÊM: 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint không tồn tại.' });
});

// ✅ THÊM: Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        url: req.url,
        method: req.method,
        time: new Date().toISOString()
    });
    
    const errorResponse = {
        message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    };
    
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.error = err.message;
    }
    
    res.status(err.status || 500).json(errorResponse);
});

// Lấy port từ Azure (quan trọng!)
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy trên port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});