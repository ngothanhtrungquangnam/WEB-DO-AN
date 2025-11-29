import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');

    // 👇 QUAN TRỌNG: Cấu hình đường dẫn API
    // Nếu chạy Local: dùng 'http://localhost:8080'
    // Nếu chạy trên Web Azure: Phải thay bằng link Backend thật của bạn (ví dụ: https://my-api.azurewebsites.net)
   const BASE_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net';

    // 1. Hàm lấy danh sách khoa (GET)
    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BASE_URL}/api/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Không thể tải dữ liệu');
            
            const data = await res.json();
            setDepartments(data);
        } catch (error) {
            console.error(error);
            message.error('Lỗi tải danh sách khoa: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Gọi API khi vào trang
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
            const token = localStorage.getItem('token');
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
                fetchDepartments(); // Tải lại danh sách
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
            const token = localStorage.getItem('token');
            const res = await fetch(`${BASE_URL}/api/departments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                message.success('Đã xóa khoa thành công!');
                fetchDepartments(); // Tải lại bảng
            } else {
                // Xử lý trường hợp backend báo lỗi ràng buộc dữ liệu (như tôi đã nhắc ở server.js)
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

    // Cấu hình cột cho bảng Ant Design
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
        },
        {
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
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <Card 
                title="Quản lý Khoa & Phòng ban" 
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                        Thêm mới
                    </Button>
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

            {/* Popup Thêm mới */}
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