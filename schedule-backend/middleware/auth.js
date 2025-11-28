const jwt = require('jsonwebtoken');

// QUAN TRỌNG: Phải dùng cùng khóa bí mật với server.js
const JWT_SECRET = 'YOUR_SUPER_SECRET_KEY_12345'; 

const authMiddleware = (req, res, next) => {
    // 1. Lấy token từ Header (Authorization: Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Truy cập bị từ chối. Không có token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Giải mã token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. Gắn thông tin người dùng vào req (req.user)
        req.user = decoded; 
        next(); // Cho phép tiếp tục
    } catch (ex) {
        // 4. Token không hợp lệ
        res.status(400).json({ message: 'Token không hợp lệ.' });
    }
};

module.exports = authMiddleware;