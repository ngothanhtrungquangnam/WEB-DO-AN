// Đây là Class User đáp ứng yêu cầu hướng đối tượng
class User {
    constructor(data) {
        // Ánh xạ dữ liệu từ JSON/Database vào thuộc tính của Class
        this.id = data.id;
        this.email = data.email;
        this.passwordHash = data.passwordHash;
        this.fullName = data.fullName || data.hostName; // Xử lý cả 2 trường hợp tên
        this.role = data.role || 'user';
        this.status = data.status || 'pending';
        this.hostName = data.hostName;
    }

    // Phương thức kiểm tra xem user có phải admin không
    isAdmin() {
        return this.role === 'admin';
    }

    // Phương thức lấy thông tin an toàn (bỏ password đi) để gửi về Frontend
    toClient() {
        return {
            id: this.id,
            email: this.email,
            fullName: this.fullName,
            role: this.role,
            hostName: this.hostName,
            status: this.status
        };
    }
}

module.exports = User;