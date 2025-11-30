import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    
    // 👇 Thêm state để kiểm tra quyền Admin
    const [isAdmin, setIsAdmin] = useState(false);

    // 👇 LINK BACKEND AZURE CỦA BẠN (GIỮ NGUYÊN ĐỂ KHÔNG BỊ LỖI LẠI)
    const BASE_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net'; 

    // 1. Kiểm tra quyền và Lấy danh sách khoa
  // Thay thế hàm fetchDepartments cũ bằng hàm này:
    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('userToken');
            const userStr = localStorage.getItem('user'); // Lấy thông tin user
            
            // --- BẮT ĐẦU ĐOẠN KIỂM TRA QUYỀN MỚI ---
            if (userStr) {
                const user = JSON.parse(userStr);
                
                // In ra Console để bạn kiểm tra xem máy tính đang đọc được gì
                console.log("CHECK QUYỀN - User Role đang là:", user.role);

                // Chuyển role về chữ thường để so sánh cho chắc chắn
                const role = user.role ? user.role.toLowerCase() : '';

                if (role === 'admin' || role === 'manager') {
                    console.log("=> Máy tính hiểu là: ADMIN (Hiện nút Thêm/Xóa)");
                    setIsAdmin(true);
                } else {
                    console.log("=> Máy tính hiểu là: USER (Ẩn nút Thêm/Xóa)");
                    setIsAdmin(false);
                }
            }
            // --- KẾT THÚC ĐOẠN KIỂM TRA ---

            const res = await fetch(`${BASE_URL}/api/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Không thể tải dữ liệu');
            
            const data = await res.json();
            setDepartments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    // 2. Hàm thêm khoa mới (POST)
    const handleAddDepartment = async () => {
        if (!newDeptName.trim()) {
            message.warning('Vui lòng nhập tên khoa!');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/api/departments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newDeptName })
            });

            const data = await res.json();

            if (res.ok) {
                message.success('Thêm khoa thành công!');
                setNewDeptName('');
                setIsModalVisible(false);
                fetchDepartments();
            } else {
                message.error(data.message || 'Lỗi khi thêm khoa');
            }
        } catch (error) {
            message.error('Lỗi kết nối server');
        }
    };

    // 3. Hàm xóa khoa (DELETE)
    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/api/departments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                message.success('Đã xóa khoa thành công!');
                fetchDepartments();
            } else {
                if (res.status === 409) {
                    message.warning('Không thể xóa: Khoa này đang có người dùng hoặc lịch liên quan.');
                } else {
                    message.error('Không thể xóa khoa này.');
                }
            }
        } catch (error) {
            message.error('Lỗi hệ thống khi xóa.');
        }
    };

    // 4. Cấu hình cột cho bảng (Logic ẩn hiện cột Xóa)
    const columns = [
        {
            title: 'STT',
            key: 'index',
            width: 80,
            render: (_, __, index) => index + 1,
            align: 'center'
        },
        {
            title: 'Tên Khoa / Phòng ban',
            dataIndex: 'name',
            key: 'name',
        }
    ];

    // 👇 CHỈ THÊM CỘT "HÀNH ĐỘNG" (NÚT XÓA) NẾU LÀ ADMIN
    if (isAdmin) {
        columns.push({
            title: 'Hành động',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="Bạn có chắc muốn xóa?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="primary" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
            ),
        });
    }

    return (
        <div style={{ padding: 20 }}>
            <Card 
                title="Quản lý Khoa & Phòng ban" 
                extra={
                    // 👇 CHỈ HIỂN THỊ NÚT "THÊM MỚI" NẾU LÀ ADMIN
                    isAdmin ? (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                            Thêm mới
                        </Button>
                    ) : (
                        <Tag color="blue">Chế độ xem (User)</Tag>
                    )
                }
            >
                <Table 
                    columns={columns} 
                    dataSource={departments} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    bordered
                />
            </Card>

            {/* Popup Thêm mới (Chỉ Admin mới mở được modal này, nhưng cứ để code ở đây cũng ko sao) */}
            <Modal
                title="Thêm Khoa / Phòng ban mới"
                open={isModalVisible}
                onOk={handleAddDepartment}
                onCancel={() => setIsModalVisible(false)}
                okText="Lưu"
                cancelText="Hủy"
            >
                <p>Nhập tên đơn vị mới:</p>
                <Input 
                    placeholder="Ví dụ: Phòng Khảo thí..." 
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    onPressEnter={handleAddDepartment}
                />
            </Modal>
        </div>
    );
};

export default DepartmentsPage;