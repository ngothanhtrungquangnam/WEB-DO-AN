import React, { useState, useEffect } from 'react';
import { Table, message, Button, Typography, Space, Popconfirm, Select, Form, Modal, Input, Tag, Badge, Tooltip } from 'antd';
import { 
    EditOutlined, 
    DeleteOutlined, 
    CheckOutlined, 
    KeyOutlined, 
    BellTwoTone,
    MailOutlined, 
    SettingOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

// Hàm lấy config Token
const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('userToken')}`
    }
});

// Hàm lấy ID user hiện tại
const getCurrentUserId = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            return JSON.parse(userData).id;
        } catch (e) { return null; }
    }
    return null;
};

const AdminUsersPage = ({ type }) => { 
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    // State cho Modal Cấu hình Email
    const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');

    const currentUserId = getCurrentUserId();
    
    const pageTitle = type === 'pending' ? 'Tài khoản cần duyệt (Pending)' : 'Quản lý Tài khoản (Đang hoạt động)';

    // 1. Lấy danh sách User
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

    // 2. Các hàm xử lý hành động
    const handleResetPassword = (id) => {
        axios.patch(`${BASE_API_URL}/admin/users/${id}/reset-password`, {}, getConfig())
        .then(res => {
            fetchUsers(); 
            Modal.success({
                title: 'Xử lý thành công!',
                content: (
                    <div>
                        <p>{res.data.message}</p>
                        <p style={{ color: 'red', fontWeight: 'bold' }}>Vui lòng thông báo mật khẩu này cho người dùng.</p>
                    </div>
                ),
                onOk: () => window.location.reload(),
            });
        })
        .catch(error => message.error('Lỗi cấp lại mật khẩu.'));
    };

    const handleApprove = (id) => {
        setLoading(true);
        axios.patch(`${BASE_API_URL}/admin/users/${id}/approve`, {}, getConfig())
        .then(res => {
            message.success('Đã duyệt tài khoản thành công!');
            fetchUsers(); 
        })
        .catch(() => message.error('Lỗi duyệt tài khoản.'))
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
            .then(() => {
                message.success('Cập nhật người dùng thành công!');
                setIsModalVisible(false);
                fetchUsers();
            })
            .catch(() => message.error('Lỗi cập nhật.'))
            .finally(() => setLoading(false));
    };

    const handleDelete = (id) => {
        setLoading(true);
        axios.delete(`${BASE_API_URL}/admin/users/${id}`, getConfig())
            .then(() => {
                message.success('Thao tác thành công!');
                fetchUsers();
            })
            .catch(() => message.error('Lỗi xóa người dùng.'))
            .finally(() => setLoading(false));
    };

    // 3. Hàm Quản lý Email (Mới)
 // 👇 THÊM ĐOẠN NÀY
    // --- HÀM QUẢN LÝ EMAIL ADMIN (MỚI) ---
    const openEmailConfig = () => {
        axios.get(`${BASE_API_URL}/settings/admin-email`, getConfig())
            .then(res => {
                setAdminEmail(res.data.email);
                setIsEmailModalVisible(true);
            })
            .catch(() => {
                setAdminEmail('');
                setIsEmailModalVisible(true);
            });
    };

    const handleSaveEmail = () => {
        if (!adminEmail.trim()) {
            message.warning("Vui lòng nhập email hợp lệ");
            return;
        }
        axios.put(`${BASE_API_URL}/settings/admin-email`, { email: adminEmail }, getConfig())
            .then(() => {
                message.success('Đã cập nhật Email nhận thông báo!');
                setIsEmailModalVisible(false);
            })
            .catch(() => message.error('Lỗi lưu cấu hình email.'));
    };
    // 👆 HẾT
    // 4. Cấu hình Cột
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
        { title: 'Email', dataIndex: 'email', key: 'email', width: 240 },
        { 
            title: 'Họ và Tên', 
            dataIndex: 'fullName', 
            key: 'fullName', 
            width: 200,
            render: (text, record) => (
                <Space>
                    {text}
                    {record.requestCount > 0 && (
                        <Tooltip title="Yêu cầu cấp lại mật khẩu">
                            <Badge dot><BellTwoTone twoToneColor="#eb2f96" /></Badge>
                        </Tooltip>
                    )}
                </Space>
            )
        },
        { 
            title: 'Vai trò', dataIndex: 'role', key: 'role', width: 100,
            render: (role) => <Tag color={role === 'admin' || role === 'manager' ? 'red' : 'blue'}>{role.toUpperCase()}</Tag>
        },
        { 
            title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
            render: (status) => <Tag color={status === 'active' ? 'success' : 'warning'}>{status === 'active' ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT'}</Tag>
        },
        { 
            title: 'Hành động', key: 'action', width: 280,
            render: (text, record) => (
                <Space size="small">
                    {record.status === 'pending' && type === 'pending' && (
                        <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => handleApprove(record.id)}>Duyệt</Button>
                    )}
                    
                    {record.status === 'active' && (
                        <Popconfirm
                            title={record.requestCount > 0 ? "Xử lý yêu cầu?" : "Reset mật khẩu?"}
                            onConfirm={() => handleResetPassword(record.id)}
                            okText="Đồng ý" cancelText="Hủy"
                            disabled={record.id === currentUserId}
                        >
                            <Button 
                                icon={<KeyOutlined />} size="small" 
                                disabled={record.id === currentUserId}
                                danger={record.requestCount > 0}
                                style={record.requestCount > 0 ? { fontWeight: 'bold' } : { backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
                            >
                                {record.requestCount > 0 ? "Xử lý YC" : "Cấp MK"}
                            </Button>
                        </Popconfirm>
                    )}

                    {record.status !== 'pending' && (
                        <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} disabled={record.id === currentUserId}>Sửa</Button>
                    )}
                    
                    <Popconfirm
                        title="Xác nhận xóa?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Có" cancelText="Không"
                        disabled={record.id === currentUserId}
                    >
                        <Button icon={<DeleteOutlined />} size="small" danger disabled={record.id === currentUserId}>
                            {record.status === 'pending' ? 'Từ chối' : 'Xóa'}
                        </Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div style={{ padding: '0px' }}>
            {/* Thanh Tiêu đề + Nút Cấu hình (Đã làm đẹp) */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <Title level={3} style={{margin: 0}}>{pageTitle}</Title>
                
                {/* 👇 NÚT MÀU CAM NỔI BẬT 👇 */}
                {type !== 'pending' && (
                    <Button 
                        type="primary"
                        icon={<SettingOutlined style={{fontSize: '16px'}} />} 
                        onClick={openEmailConfig}
                        style={{
                            backgroundColor: '#fa8c16',
                            borderColor: '#fa8c16',
                            height: '40px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(250, 140, 22, 0.3)',
                            borderRadius: '6px'
                        }}
                    >
                        CẤU HÌNH EMAIL NHẬN TIN
                    </Button>
                )}
            </div>
            
            <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                bordered
                size="small"
                pagination={{ pageSize: 10 }}
            />

            {/* Modal Chỉnh sửa User */}
            <Modal
                title="Chỉnh sửa / Cấp quyền Người dùng"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu thay đổi"
            >
                <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ role: 'user' }}>
                    <Form.Item label="Email" name="email"><Input disabled style={{color: '#333'}} /></Form.Item>
                    <Form.Item label="Họ và Tên" name="fullName" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="Vai trò" name="role" rules={[{ required: true }]}>
                        <Select>
                            <Option value="user">User</Option>
                            <Option value="admin">Admin</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal Cấu hình Email */}
           {/* 👇 THÊM MODAL NÀY VÀO CUỐI CÙNG 👇 */}
            <Modal
                title="Cấu hình Email Nhận Thông Báo"
                open={isEmailModalVisible}
                onOk={handleSaveEmail}
                onCancel={() => setIsEmailModalVisible(false)}
                okText="Lưu thay đổi"
            >
                <p>Khi có người dùng đăng ký lịch mới, hệ thống sẽ gửi email thông báo về địa chỉ này:</p>
                <Input 
                    prefix={<MailOutlined />} 
                    value={adminEmail} 
                    onChange={(e) => setAdminEmail(e.target.value)} 
                    placeholder="Nhập email của Admin..."
                />
                <Text type="secondary" style={{fontSize: '12px', marginTop: '8px', display: 'block'}}>
                    Lưu ý: Sau khi lưu, hệ thống sẽ áp dụng ngay lập tức.
                </Text>
            </Modal>
            {/* 👆 HẾT */}
        </div>
    );
};

export default AdminUsersPage;