const adminMiddleware = (req, res, next) => {
    // req.user được gắn thông tin bởi authMiddleware (ID, email, role)
    
    // Kiểm tra nếu vai trò KHÔNG phải là admin HOẶC manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        // 403 Forbidden (Không có quyền truy cập)
        return res.status(403).json({ 
            message: 'Truy cập bị từ chối. Bạn không có quyền quản trị để thực hiện thao tác này.' 
        });
    }

    next(); // Có quyền, cho phép tiếp tục đến route
};

module.exports = adminMiddleware;