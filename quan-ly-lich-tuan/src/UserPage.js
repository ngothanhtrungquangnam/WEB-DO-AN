import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, Space, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios'; 

const { Title, Text } = Typography;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

// Hàm hỗ trợ lấy config cho request có Token
const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('userToken')}`
    }
});

// -----------------------------------------------------
// --- COMPONENT THÔNG TIN TÀI KHOẢN ---
// -----------------------------------------------------
const ProfileInfo = ({ user, fetchUserInfo }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    
    // Cập nhật giá trị form khi user thay đổi
    useEffect(() => {
        form.setFieldsValue(user);
    }, [user, form]);
    
    // Xử lý cập nhật thông tin (fullName)
    const onUpdateProfile = (values) => {
        setLoading(true);
        axios.put(`${BASE_API_URL}/user/profile`, values, getConfig())
            .then(res => {
                message.success('Cập nhật thông tin thành công!');
                fetchUserInfo(); 
            })
            .catch(error => {
                message.error(error.response?.data?.message || 'Không thể cập nhật thông tin.');
            })
            .finally(() => setLoading(false));
    };

    return (
        <Card title="Thông tin Tài khoản" bordered={false}>
            <Form 
                form={form} 
                layout="vertical" 
                onFinish={onUpdateProfile}
                initialValues={user}
            >
                <Form.Item label="Email (Không thể thay đổi)" name="email">
                    <Input disabled prefix={<UserOutlined />} />
                </Form.Item>
                
                <Form.Item 
                    label="Họ và Tên" 
                    name="fullName"
                    rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                >
                    <Input />
                </Form.Item>
                
                <Form.Item label="Vai trò hệ thống" name="role">
                    <Input disabled />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Cập nhật
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

// -----------------------------------------------------
// --- COMPONENT ĐỔI MẬT KHẨU ---
// -----------------------------------------------------
const ChangePassword = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const onChangePassword = (values) => {
        setLoading(true);
        axios.patch(`${BASE_API_URL}/user/password`, values, getConfig())
            .then(res => {
                message.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
                // Xóa token và chuyển hướng về trang login
                localStorage.clear();
                window.location.href = '/login'; 
            })
            .catch(error => {
                message.error(error.response?.data?.message || 'Đổi mật khẩu thất bại.');
            })
            .finally(() => setLoading(false));
    };

    return (
        <Card title="Đổi Mật khẩu" bordered={false}>
            <Form form={form} layout="vertical" onFinish={onChangePassword}>
                <Form.Item
                    label="Mật khẩu Hiện tại"
                    name="currentPassword"
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
                >
                    <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                
                <Form.Item
                    label="Mật khẩu Mới"
                    name="newPassword"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự.' }
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} />
                </Form.Item>

                <Form.Item
                    label="Nhập lại Mật khẩu Mới"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Đổi Mật khẩu
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

// -----------------------------------------------------
// --- COMPONENT CHÍNH ---
// -----------------------------------------------------
const UserPage = () => {
    const [user, setUser] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchUserInfo = () => {
        setLoading(true);
        axios.get(`${BASE_API_URL}/user/profile`, getConfig())
            .then(res => {
                setUser(res.data);
                localStorage.setItem('userData', JSON.stringify(res.data)); 
            })
            .catch(error => {
                message.error('Không thể tải thông tin người dùng.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const items = [
        {
            key: 'info',
            label: (
                <Space><UserOutlined />Thông tin Tài khoản</Space>
            ),
            children: <ProfileInfo user={user} fetchUserInfo={fetchUserInfo} />,
        },
        {
            key: 'password',
            label: (
                <Space><LockOutlined />Đổi Mật khẩu</Space>
            ),
            children: <ChangePassword />,
        },
    ];

    if (loading) {
        return <Title level={4}>Đang tải...</Title>;
    }
    
    return (
        <div style={{ padding: '0px' }}>
            <Title level={3} style={{ marginBottom: 20 }}>Quản lý Tài khoản</Title>
            <Tabs defaultActiveKey="info" items={items} />
        </div>
    );
};

export default UserPage;