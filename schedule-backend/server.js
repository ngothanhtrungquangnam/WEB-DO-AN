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

// Tìm đoạn cấu hình CORS và sửa thành:
const corsOptions = {
    origin: '*', // Tạm thời cho phép tất cả để tránh lỗi (sau này sửa lại link web sau)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};
app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ SỬA: Dùng environment variables thay vì hard-code
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_12345';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('⚠️ WARNING: JWT_SECRET chưa được thiết lập trong production!');
}

// ✅ SỬA: Dùng environment variables cho database
const db = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-2f0f2f65-quanlylichtuan2025.g.aivencloud.com',
    port: parseInt(process.env.DB_PORT || '11845'),
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_0yRZ11XzXUYlvr1inPx',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: {
        rejectUnauthorized: false    
    },
    // 👇 Thêm các dòng cấu hình cho Pool
    waitForConnections: true,
    connectionLimit: 10, // Giới hạn số kết nối cùng lúc
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Kiểm tra kết nối thử một lần (Không bắt buộc nhưng nên có để debug)
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Lỗi kết nối Pool:', err);
    } else {
        console.log('✅ Kết nối Database qua Pool thành công!');
        connection.release(); // Trả kết nối về hồ chứa
    }
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
// API ĐĂNG NHẬP (SỬ DỤNG ASYNC/AWAIT CHUẨN MỰC)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // BƯỚC 1: Xử lý lỗi bằng try/catch
    try {
        // ✅ SỬA: Dùng db.promise().query để có thể dùng await
        const [results] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);

        if (results.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        const user = results[0];

        // Các kiểm tra trạng thái
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Tài khoản đang chờ duyệt. Vui lòng liên hệ Admin.' });
        }
        if (user.status === 'rejected') { 
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị từ chối.' });
        }

        // So sánh mật khẩu (Đã là async)
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        // Ký và trả Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, fullName: user.fullName, hostName: user.hostName }, 
            JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ 
            message: 'Đăng nhập thành công!',
            token: token,
            user: {
                id: user.id, email: user.email, role: user.role, fullName: user.fullName, status: user.status, hostName: user.hostName
            }
        });
    } catch (err) {
        // Xử lý lỗi nếu DB bị lỗi Promise
        console.error('❌ Login API Crash:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
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

// API GỬI YÊU CẦU QUÊN MẬT KHẨU (ĐÃ FIX LỖI CRASH)
app.post('/api/forgot-password-request', async (req, res) => {
    const { email, fullName } = req.body;
    
    // Log để kiểm tra dữ liệu gửi lên
    console.log(`📩 Nhận yêu cầu reset: Email=${email}, Tên=${fullName}`);

    if (!email || !fullName) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Email và Tên của bạn.' });
    }

    try {
        // 1. TÌM USER (Dùng hostName để khớp với "Họ và Tên")
        const findUserSql = 'SELECT id, email, hostName FROM users WHERE email = ? AND hostName = ?';
        const [users] = await db.promise().query(findUserSql, [email, fullName]);

        if (users.length === 0) {
            console.log("❌ Không tìm thấy user khớp thông tin.");
            return res.status(404).json({ message: 'Thông tin không khớp với bất kỳ tài khoản nào.' });
        }

        const user = users[0];
        console.log("✅ Tìm thấy user ID:", user.id);

        // 2. KIỂM TRA YÊU CẦU ĐANG CHỜ (PENDING)
        // Cách 1: Đổi dấu bao bên ngoài thành ngoặc kép, bên trong thành nháy đơn
       const checkPendingSql = "SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending'";
        const [pendingRequests] = await db.promise().query(checkPendingSql, [user.id, 'pending']);
        if (pendingRequests.length > 0) {
            console.warn("⚠️ User đã có yêu cầu đang chờ.");
            return res.status(409).json({ message: 'Bạn đã có yêu cầu đang chờ xử lý. Vui lòng đợi Admin duyệt.' });
        }

        // 3. TẠO YÊU CẦU MỚI
        const insertSql = 'INSERT INTO password_reset_requests (user_id, email, fullName) VALUES (?, ?, ?)';
        // Lưu ý: Dùng user.hostName để lưu vào cột fullName
        await db.promise().query(insertSql, [user.id, user.email, user.hostName]);

        console.log("🎉 Tạo yêu cầu thành công!");
        res.json({ message: 'Đã gửi yêu cầu thành công! Vui lòng chờ Admin duyệt.' });

    } catch (err) {
        console.error("🔥 LỖI SERVER (Forgot Password):", err);
        res.status(500).json({ message: 'Lỗi hệ thống, vui lòng thử lại sau.' });
    }
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
app.get('/api/admin/stats/general', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // 1. Đếm Lịch chờ duyệt
        const [schedules] = await db.promise().query("SELECT COUNT(*) as count FROM schedules WHERE trangThai = 'cho_duyet'");
        
        // 2. Đếm Tài khoản mới đăng ký
        const [users] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE status = 'pending'");

        // 3. Đếm Yêu cầu Reset mật khẩu (SỬA VÀ THÊM TRY/CATCH)
        let resetCount = 0;
        try {
            // Chạy truy vấn riêng biệt
            const [resets] = await db.promise().query("SELECT COUNT(*) as count FROM password_reset_requests WHERE status = 'pending'");
            resetCount = resets[0].count;
        } catch (e) {
            // Nếu lỗi là ER_NO_SUCH_TABLE (mã 1146), bỏ qua lỗi và giữ nguyên resetCount = 0
            if (e.errno !== 1146) { 
                throw e; // Báo lỗi nếu là lỗi khác (mật khẩu, kết nối...)
            }
            console.warn('⚠️ WARN: Bỏ qua lỗi thiếu bảng password_reset_requests.');
        }

        res.json({
            pendingSchedules: schedules[0].count,
            pendingUsers: users[0].count, 
            pendingResets: resetCount  // Dùng giá trị 0 nếu bảng không tồn tại
        });
    } catch (err) {
        console.error('Lỗi lấy stats CỐT LÕI:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});
// 🔄 2. API CẬP NHẬT: LẤY DANH SÁCH USERS (Thêm cột requestCount)
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    // Subquery đếm requestCount: > 0 nghĩa là có yêu cầu
 // THAY THẾ TOÀN BỘ SQL TRONG API NÀY BẰNG:
const sql = `
    SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.status, 
        u.hostName AS fullName,
        COALESCE(r.count, 0) AS requestCount /* ✅ Lấy count từ JOIN, nếu NULL thì coi là 0 */
    FROM users u
    LEFT JOIN (
        /* Truy vấn riêng: Đếm tất cả yêu cầu pending cho từng user */
        SELECT user_id, COUNT(*) AS count
        FROM password_reset_requests
        WHERE status = 'pending'
        GROUP BY user_id
    ) r ON r.user_id = u.id /* Nối count vào bảng users */
    ORDER BY u.id DESC
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
 const { ngay, thoiGian, thuocPhuLuc, isBoSung, noiDung, thanhPhan, guiMail, diaDiem, chuTriTen, chuTriEmail, donVi } = req.body;
    
    const ngayFormatted = dayjs(ngay).format('YYYY-MM-DD');
    const batDauFormatted = thoiGian ? dayjs(thoiGian[0]).format('HH:mm:ss') : '07:00:00';
    const ketThucFormatted = thoiGian ? dayjs(thoiGian[1]).format('HH:mm:ss') : '11:00:00';

    // 👇 CẬP NHẬT CÂU SQL: THÊM CỘT isBoSung
   const sql = `
        INSERT INTO schedules 
        (ngay, batDau, ketThuc, thuocPhuLuc, isBoSung, noiDung, thanhPhan, guiMail, diaDiem, chuTriTen, chuTriEmail, donVi, trangThai) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cho_duyet')
    `;
    
    // 👇 THÊM BIẾN isBoSung VÀO MẢNG VALUES
    const values = [
        ngayFormatted, batDauFormatted, ketThucFormatted, 
        thuocPhuLuc, isBoSung, // <-- Nhớ thêm vào đây
        noiDung, thanhPhan, guiMail, diaDiem, chuTriTen, chuTriEmail,
        donVi
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
// =====================================================================================
//                              API KHOA / PHÒNG BAN (DEPARTMENTS)
// =====================================================================================

// 1. Lấy danh sách Khoa (Dùng cho Menu thả xuống ở Form đăng ký)
app.get('/api/departments', (req, res) => { 
    db.query("SELECT * FROM departments ORDER BY name ASC", (err, results) => {
        if (err) {
            console.error("Lỗi lấy danh sách khoa:", err);
            return res.status(500).json({ message: 'Lỗi server khi lấy danh sách khoa.' });
        }
        res.json(results);
    });
});

// 2. Thêm Khoa mới (Dành cho Admin quản lý)
app.post('/api/departments', authMiddleware, adminMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên khoa không được để trống' });

    db.query("INSERT INTO departments (name) VALUES (?)", [name], (err, result) => {
        if (err) {
            // Mã lỗi 1062 là trùng lặp (Duplicate entry)
            if (err.errno === 1062) return res.status(409).json({ message: 'Tên khoa này đã tồn tại.' });
            return res.status(500).json({ message: 'Lỗi server.' });
        }
        res.json({ message: 'Thêm khoa thành công', id: result.insertId });
    });
});

// 3. Sửa tên Khoa
app.put('/api/departments/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    
    db.query("UPDATE departments SET name = ? WHERE id = ?", [name, id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        res.json({ message: 'Cập nhật tên khoa thành công.' });
    });
});

// 4. Xóa Khoa
app.delete('/api/departments/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM departments WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        res.json({ message: 'Đã xóa khoa thành công.' });
    });
});

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

// =============================================================
// API QUẢN LÝ PHÒNG (ROOMS) - DÀNH CHO ADMIN
// =============================================================

// 1. Lấy danh sách phòng theo ID Khu vực
app.get('/api/locations/:id/rooms', authMiddleware, (req, res) => {
    const locationId = req.params.id;
    const sql = "SELECT * FROM rooms WHERE location_id = ? ORDER BY name ASC";
    
    db.query(sql, [locationId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        res.json(results);
    });
});

// 2. Thêm Phòng mới
app.post('/api/rooms', authMiddleware, adminMiddleware, (req, res) => {
    const { name, location_id } = req.body;
    const sql = "INSERT INTO rooms (name, location_id) VALUES (?, ?)";
    db.query(sql, [name, location_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi thêm phòng.' });
        res.json({ message: 'Thêm phòng thành công!', id: result.insertId });
    });
});

// 3. Xóa Phòng
app.delete('/api/rooms/:id', authMiddleware, adminMiddleware, (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM rooms WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi xóa phòng.' });
        res.json({ message: 'Đã xóa phòng.' });
    });
});

// ✅ THÊM: 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint không tồn tại.' });
});
// API XÓA LỊCH (Có bảo mật quyền)
app.delete('/api/schedules/:id', authMiddleware, (req, res) => {
    const scheduleId = req.params.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    let sql = "DELETE FROM schedules WHERE id = ?";
    let params = [scheduleId];

    // 👇 LOGIC QUAN TRỌNG:
    // Nếu KHÔNG phải Admin/Manager, thì chỉ được xóa lịch của chính mình (check email)
    if (userRole !== 'admin' && userRole !== 'manager') {
        sql += " AND chuTriEmail = ?";
        params.push(userEmail);
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi server.' });
        
        if (result.affectedRows === 0) {
            // Nếu không xóa được dòng nào -> Có thể do ID sai hoặc User cố xóa lịch của người khác
            return res.status(403).json({ message: 'Bạn không có quyền xóa lịch này hoặc lịch không tồn tại.' });
        }
        
        res.json({ message: 'Đã xóa lịch thành công.' });
    });
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