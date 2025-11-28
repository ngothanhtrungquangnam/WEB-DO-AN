import React, { useState, useEffect } from 'react';
// 👇 Thêm Badge, Tooltip vào import
import { Table, message, Button, Typography, Space, Popconfirm, Select, Form, Modal, Input, Tag, Badge, Tooltip } from 'antd';
// 👇 Thêm BellTwoTone vào import
import { EditOutlined, DeleteOutlined, CheckOutlined, KeyOutlined, BellTwoTone } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

// Hàm hỗ trợ lấy config cho request có Token
const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('userToken')}`
    }
});

// Hàm lấy ID người dùng hiện tại
const getCurrentUserId = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            return JSON.parse(userData).id;
        } catch (e) { return null; }
    }
    return null;
};

// Component chính
const AdminUsersPage = ({ type }) => { 
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const currentUserId = getCurrentUserId();
    
    const pageTitle = type === 'pending' ? 'Tài khoản cần duyệt (Pending)' : 'Quản lý Tài khoản (Đang hoạt động)';

    // --- 1. HÀM LẤY DANH SÁCH USER ---
    const fetchUsers = () => {
        setLoading(true);
        axios.get(`${BASE_API_URL}/admin/users`, getConfig())
            .then(res => {
                if (Array.isArray(res.data)) {
                    let filteredData = res.data.filter(user => {
                        if (type === 'pending') {
                            return user.status === 'pending';
                        } else {
                            return user.status === 'active' || user.role === 'admin' || user.role === 'manager';
                        }
                    });
                    setUsers(filteredData.map(user => ({ ...user, key: user.id })));
                }
            })
            .catch(error => {
                message.error(error.response?.data?.message || 'Lỗi tải danh sách người dùng.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [type]); 

   // --- 2. HÀM MỚI: CẤP LẠI MẬT KHẨU (RESET PASSWORD) ---
const handleResetPassword = (id) => {
    // Gọi API PATCH
    axios.patch(`${BASE_API_URL}/admin/users/${id}/reset-password`, {}, getConfig())
    .then(res => {
        // 👇 CẬP NHẬT 1: Tải lại danh sách user NGAY LẬP TỨC để nút đỏ chuyển thành vàng
        fetchUsers(); 

        // Hiện thông báo Modal thành công
        Modal.success({
            title: 'Xử lý thành công!',
            content: (
                <div>
                    <p>{res.data.message}</p>
                    <p style={{ color: 'red', fontWeight: 'bold' }}>Vui lòng thông báo mật khẩu này cho người dùng.</p>
                </div>
            ),
            // 👇 CẬP NHẬT 2: Khi bấm OK, reload trang để cập nhật luôn số đỏ trên Menu bên trái
            onOk: () => {
                window.location.reload(); 
            },
        });
    })
    .catch(error => {
            message.error(error.response?.data?.message || 'Lỗi cấp lại mật khẩu.');
    });
};

    // --- 3. CÁC HÀM KHÁC (DUYỆT, SỬA, XÓA) ---
    const handleApprove = (id) => {
        setLoading(true);
        axios.patch(`${BASE_API_URL}/admin/users/${id}/approve`, {}, getConfig())
        .then(res => {
            message.success(res.data?.message || 'Đã duyệt tài khoản thành công!');
            fetchUsers(); 
        })
        .catch(error => {
             message.error(error.response?.data?.message || 'Lỗi duyệt tài khoản.');
        })
        .finally(() => setLoading(false));
    };

    const handleEdit = (record) => {
        setEditingUser(record);
        setIsModalVisible(true);
        form.setFieldsValue(record);
    };

    const handleSave = (values) => {
        setLoading(true);
        axios.put(`${BASE_API_URL}/admin/users/${editingUser.id}`, values, getConfig())
            .then(res => {
                message.success('Cập nhật người dùng thành công!');
                setIsModalVisible(false);
                fetchUsers();
            })
            .catch(error => {
                message.error(error.response?.data?.message || 'Lỗi cập nhật người dùng.');
            })
            .finally(() => setLoading(false));
    };

    const handleDelete = (id) => {
        setLoading(true);
        axios.delete(`${BASE_API_URL}/admin/users/${id}`, getConfig())
            .then(res => {
                message.success('Thao tác thành công!');
                fetchUsers();
            })
            .catch(error => {
                message.error(error.response?.data?.message || 'Lỗi xóa người dùng.');
            })
            .finally(() => setLoading(false));
    };

    // --- 4. ĐỊNH NGHĨA CÁC CỘT (LOGIC MỚI Ở ĐÂY) ---
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
        { title: 'Email', dataIndex: 'email', key: 'email', width: 240 },
        { 
           title: 'Họ và Tên', 
    dataIndex: 'hostName', // ✅ Đúng tên trong Database
    key: 'hostName', 
    width: 200,
            render: (text, record) => (
                <Space>
                    {text}
                    {/* 👇 HIỆN CHUÔNG NẾU CÓ YÊU CẦU 👇 */}
                    {record.requestCount > 0 && (
                        <Tooltip title="Người dùng này đang yêu cầu cấp lại mật khẩu">
                            <Badge dot>
                                <BellTwoTone twoToneColor="#eb2f96" style={{ fontSize: '18px', animation: 'pulse 1s infinite' }} />
                            </Badge>
                        </Tooltip>
                    )}
                </Space>
            )
        },
        { 
            title: 'Vai trò', 
            dataIndex: 'role', 
            key: 'role', 
            width: 100,
            render: (role) => <Tag color={role === 'admin' || role === 'manager' ? 'red' : 'blue'}>{role.toUpperCase()}</Tag>
        },
        { 
            title: 'Trạng thái', 
            dataIndex: 'status', 
            key: 'status', 
            width: 110,
            render: (status) => (
                <Tag color={status === 'active' ? 'success' : 'warning'}>
                    {status === 'active' ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT'}
                </Tag>
            )
        },
        { 
            title: 'Hành động', 
            key: 'action', 
            width: 280,
            render: (text, record) => (
                <Space size="small">
                    {/* NÚT DUYỆT */}
                    {record.status === 'pending' && type === 'pending' && (
                        <Button 
                            type="primary" icon={<CheckOutlined />} size="small"
                            onClick={() => handleApprove(record.id)}
                        >
                            Duyệt
                        </Button>
                    )}
                    
                    {/* 👇 NÚT CẤP LẠI MK (THÔNG MINH) 👇 */}
                    {record.status === 'active' && (
                        <Popconfirm
                            // Đổi câu hỏi nếu có yêu cầu
                            title={record.requestCount > 0 
                                ? "Xử lý yêu cầu cấp lại mật khẩu?" 
                                : "Reset mật khẩu về '123456'?"}
                            description={record.requestCount > 0 
                                ? "Mật khẩu sẽ về 123456 và yêu cầu sẽ được đóng lại." 
                                : "Hành động này không thể hoàn tác."}
                            onConfirm={() => handleResetPassword(record.id)}
                            okText="Đồng ý"
                            cancelText="Hủy"
                            disabled={record.id === currentUserId}
                        >
                            <Button 
                                icon={<KeyOutlined />} 
                                size="small" 
                                disabled={record.id === currentUserId}
                                // Nếu có yêu cầu -> Màu đỏ (danger). Không -> Màu vàng
                                danger={record.requestCount > 0}
                                style={record.requestCount > 0 
                                    ? { fontWeight: 'bold' } 
                                    : { backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }
                                }
                            >
                                {record.requestCount > 0 ? "Xử lý YC" : "Cấp MK"}
                            </Button>
                        </Popconfirm>
                    )}

                    {/* Nút Sửa */}
                    {record.status !== 'pending' && (
                        <Button 
                            icon={<EditOutlined />} size="small" 
                            onClick={() => handleEdit(record)} 
                            disabled={record.id === currentUserId}
                        >
                            Sửa
                        </Button>
                    )}
                    
                    {/* Nút Xóa */}
                    <Popconfirm
                        title={record.status === 'pending' ? "Từ chối duyệt?" : "Xóa user?"}
                        onConfirm={() => handleDelete(record.id)}
                        okText="Có" cancelText="Không"
                        disabled={record.id === currentUserId}
                    >
                        <Button 
                            icon={<DeleteOutlined />} size="small" danger
                            disabled={record.id === currentUserId}
                        >
                            {record.status === 'pending' ? 'Từ chối' : 'Xóa'}
                        </Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div style={{ padding: '0px' }}>
            {/* CSS Animation nhỏ cho cái chuông */}
            <style>
                {`@keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }`}
            </style>

            <Title level={3} style={{ marginBottom: 20 }}>{pageTitle}</Title>
            
            <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                bordered
                size="small"
                pagination={{ pageSize: 10 }}
            />

            {/* MODAL CHỈNH SỬA (Giữ nguyên) */}
            <Modal
                title="Chỉnh sửa Người dùng"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item label="Email" name="email">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item label="Họ và Tên" name="fullName" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Vai trò" name="role" rules={[{ required: true }]}>
                        <Select>
                            <Option value="user">User</Option>
                            <Option value="manager">Manager</Option>
                            <Option value="admin">Admin</Option>
                        </Select>
                    </Form.Item>
                    <Text type="secondary">Lưu ý: Không thể đổi mật khẩu tại đây.</Text>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminUsersPage;