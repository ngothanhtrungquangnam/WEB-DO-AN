import React, { useState } from 'react';
// 👇 Import thêm Divider
import { Form, Input, Button, message, Modal, Alert, Divider } from 'antd'; 
import { useNavigate, Link } from 'react-router-dom'; 
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'; 
// 👇 Import Google
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios'; // Import Axios nếu chưa có (hoặc dùng fetch cũng được)

import './Auth.css'; 
import dutLogo from './dut.jpg'; 
import logo2 from './dtvt.jpg'; 

const API_URL_LOGIN = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api/login'; 
// 👇 DÁN CLIENT ID CỦA BẠN VÀO ĐÂY
// Tìm dòng này và sửa lại:
const GOOGLE_CLIENT_ID = "494075819114-mhvbrg2rjeqvlltsc2herhpuovd1asv5.apps.googleusercontent.com";
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const LoginPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
    const [modalError, setModalError] = useState(null);

    const navigate = useNavigate();

    // --- 1. XỬ LÝ ĐĂNG NHẬP THƯỜNG (GIỮ NGUYÊN) ---
    const onFinishLogin = (values) => {
        setLoading(true);
        fetch(API_URL_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || 'Email hoặc mật khẩu không đúng.') });
            }
            return response.json();
        })
        .then(data => {
            message.success('Đăng nhập thành công!');
            localStorage.setItem('userToken', data.token); 
            localStorage.setItem('userData', JSON.stringify(data.user)); 
            navigate('/', { replace: true }); 
        })
        .catch(error => {
            message.error(error.message);
        })
        .finally(() => {
            setLoading(false);
        });
    };

 const handleGoogleSuccess = (credentialResponse) => {
        setLoading(true);
        axios.post(`${BASE_API_URL}/auth/google`, { token: credentialResponse.credential })
            .then(res => {
                message.success('Đăng nhập thành công!');
                localStorage.setItem('userToken', res.data.token);
                localStorage.setItem('userData', JSON.stringify(res.data.user));
                navigate('/');
            })
            .catch(err => {
                // 👇 XỬ LÝ RIÊNG TRƯỜNG HỢP CHỜ DUYỆT (403)
                if (err.response && err.response.status === 403) {
                    Modal.warning({
                        title: 'Thông báo',
                        content: err.response.data.message, // "Đăng ký thành công! Vui lòng chờ duyệt..."
                        okText: 'Đã hiểu'
                    });
                } else {
                    message.error('Lỗi: ' + (err.response?.data?.message || err.message));
                }
            })
            .finally(() => setLoading(false));
    };

    const handleRegisterRedirect = () => {
        navigate('/dang-ky-tai-khoan');
    };

    // --- 2. XỬ LÝ GỬI YÊU CẦU QUÊN MẬT KHẨU (GIỮ NGUYÊN) ---
    const handleSendResetRequest = (values) => {
        setLoading(true);
        setModalError(null); 

        fetch(`${API_URL_LOGIN.replace('/login', '/forgot-password-request')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        })
        .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Lỗi gửi yêu cầu.');
            return data;
        })
        .then(data => {
            setIsForgotModalVisible(false);
            form.resetFields();
            Modal.success({
                title: 'Gửi yêu cầu thành công!',
                content: data.message,
            });
        })
        .catch(error => setModalError(error.message))
        .finally(() => setLoading(false));
    };

    const handleForgotPassword = () => {
        setModalError(null); 
        setIsForgotModalVisible(true); 
    };

    const handleCloseForgotModal = () => {
        setIsForgotModalVisible(false); 
        form.resetFields(); 
        setModalError(null);
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo-container">
                            <img src={dutLogo} alt="Logo Trường" className="auth-logo" />
                            <img src={logo2} alt="Logo Phụ" className="auth-logo" />
                        </div>
                        <h2 className="auth-title">ĐĂNG NHẬP</h2>
                        <p className="auth-subtitle">Hệ thống Quản lý Lịch Tuần</p>
                    </div>

                    {/* 👇 NÚT GOOGLE MỚI (ĐẶT TRÊN CÙNG) */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => message.error('Đăng nhập Google thất bại')}
                            useOneTap
                            theme="outline"
                            size="large"
                            text="signin_with"
                            shape="pill"
                            width="300"
                        />
                    </div>

                    <Divider plain style={{ color: '#999', fontSize: '12px', margin: '0 0 20px 0' }}>Hoặc đăng nhập bằng tài khoản</Divider>

                    <Form
                        name="login_form"
                        onFinish={onFinishLogin}
                        autoComplete="off"
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'Vui lòng nhập Email!' }]}
                        >
                            <Input prefix={<MailOutlined style={{ color: '#1890ff' }} />} placeholder="Email (Tài khoản)" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input.Password prefix={<LockOutlined style={{ color: '#1890ff' }} />} placeholder="Mật khẩu" />
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                            <span onClick={handleForgotPassword} className="auth-link-hover" style={{ color: '#1890ff', cursor: 'pointer' }}>
                                Quên mật khẩu?
                            </span>
                        </div>

                        <Form.Item style={{ marginBottom: 24 }}>
                            <Button type="primary" htmlType="submit" loading={loading} block className="auth-button">
                                ĐĂNG NHẬP
                            </Button>
                        </Form.Item>

                        <div className="auth-footer">
                             <span>Bạn chưa có tài khoản?</span>
                             <span onClick={handleRegisterRedirect} className="auth-link">Đăng ký ngay</span>
                        </div>
                    </Form>
                </div>

                {/* MODAL QUÊN MẬT KHẨU (GIỮ NGUYÊN) */}
                <Modal
                    title="Gửi yêu cầu Quên mật khẩu"
                    open={isForgotModalVisible}
                    onCancel={handleCloseForgotModal}
                    footer={null} 
                >
                    <Form 
                        form={form} 
                        name="forgot_password_form"
                        onFinish={handleSendResetRequest}
                        autoComplete="off"
                        layout="vertical"
                    >
                        <p style={{ marginBottom: 15 }}>
                            Vui lòng nhập chính xác <b>Email</b> và <b>Họ và Tên</b> đã đăng ký.
                        </p>

                        {modalError && (
                            <Alert
                                message="Lỗi"
                                description={modalError}
                                type="error"
                                showIcon
                                style={{ marginBottom: 15 }}
                            />
                        )}
                        
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'Vui lòng nhập Email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email (Tài khoản)" />
                        </Form.Item>

                        <Form.Item
                            name="fullName"
                            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Họ và Tên" />
                        </Form.Item>
                        
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>
                                Gửi yêu cầu
                            </Button>
                        </Form.Item>
                        
                        <div style={{ textAlign: 'center' }}>
                             <a onClick={handleCloseForgotModal} style={{cursor: 'pointer', color: '#888'}}>Hủy bỏ</a>
                        </div>
                    </Form>
                </Modal>
            </div>
        </GoogleOAuthProvider>
    );
};

export default LoginPage;