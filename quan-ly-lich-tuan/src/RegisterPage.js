import React, { useState } from 'react';
import { Form, Input, Button, message, Modal, Divider } from 'antd'; 
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'; 
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import './Auth.css';
import dutLogo from './dut.jpg'; 
import logo2 from './dtvt.jpg';

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';
const GOOGLE_CLIENT_ID = "494075819114-mhvbrg2rjeqvlltsc2herhpuovd1asv5.apps.googleusercontent.com";

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
    
    const navigate = useNavigate();

    // --- 1. XỬ LÝ ĐĂNG KÝ THỦ CÔNG (GIỮ NGUYÊN) ---
    const onFinish = (values) => {
        setLoading(true);
        const { confirmPassword, ...dataToSend } = values;
        dataToSend.hostName = dataToSend.fullName;

        axios.post(`${BASE_API_URL}/register`, dataToSend)
            .then(res => {
                setIsSuccessModalVisible(true);
            })
            .catch(error => {
                const errorMessage = error.response?.data?.message || 'Đăng ký thất bại.';
                message.error(errorMessage);
            })
            .finally(() => setLoading(false));
    };

    // --- 2. XỬ LÝ GOOGLE LOGIN (ĐÃ THÊM LOGIC CHỜ DUYỆT) ---
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
                // 👇 LOGIC QUAN TRỌNG: NẾU 403 (PENDING) -> HIỆN MODAL CHỜ DUYỆT
                if (err.response && err.response.status === 403) {
                    setIsSuccessModalVisible(true);
                } else {
                    message.error('Lỗi: ' + (err.response?.data?.message || err.message));
                }
            })
            .finally(() => setLoading(false));
    };

    const handleCloseSuccessModal = () => {
        setIsSuccessModalVisible(false); 
        navigate('/login'); 
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo-container">
                            <img src={dutLogo} alt="Logo" className="auth-logo" />
                            <img src={logo2} alt="Logo 2" className="auth-logo" />
                        </div>
                        <h2 className="auth-title">ĐĂNG KÝ TÀI KHOẢN</h2>
                        <p className="auth-subtitle">Tạo tài khoản mới để sử dụng hệ thống</p>
                    </div>

                    {/* === PHẦN 1: FORM NHẬP LIỆU (ĐƯA LÊN TRÊN CHO KHOA HỌC) === */}
                    <Form
                        name="register"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'Vui lòng nhập Email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="Email (Tài khoản)" />
                        </Form.Item>

                        <Form.Item
                            name="fullName"
                            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Họ và Tên" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} placeholder="Mật khẩu" />
                        </Form.Item>
                        
                        <Form.Item
                            name="confirmPassword"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận Mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                                        return Promise.reject(new Error('Mật khẩu không khớp!'));
                                    },
                                }),
                            ]}
                            style={{ marginBottom: 24 }}
                        >
                            <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} placeholder="Xác nhận mật khẩu" />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 16 }}>
                            <Button type="primary" htmlType="submit" loading={loading} block className="auth-button" style={{ height: '45px', fontWeight: '600', fontSize: '16px' }}>
                                ĐĂNG KÝ
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* === PHẦN 2: GOOGLE (ĐƯA XUỐNG DƯỚI + PHÂN CÁCH) === */}
                    <div style={{ position: 'relative', marginBottom: 20 }}>
                        <Divider plain style={{ color: '#8c8c8c', fontSize: '13px' }}>Hoặc đăng ký nhanh bằng</Divider>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => message.error('Đăng nhập Google thất bại')}
                            useOneTap={false}
                            theme="outline"
                            size="large"
                            width="320" // Chỉnh độ rộng cho cân đối
                            text="signup_with"
                            shape="rectangular"
                        />
                    </div>

                    <div className="auth-footer" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '15px', textAlign: 'center' }}>
                        <span style={{ color: '#666' }}>Bạn đã có tài khoản? </span>
                        <span onClick={() => navigate('/login')} className="auth-link" style={{ fontWeight: '600', cursor: 'pointer', color: '#1890ff' }}>Đăng nhập ngay</span>
                    </div>
                </div>

                {/* MODAL THÔNG BÁO THÀNH CÔNG (DÙNG CHUNG CHO CẢ 2) */}
                <Modal
                    title="Đăng ký thành công!"
                    open={isSuccessModalVisible} 
                    onOk={handleCloseSuccessModal}
                    onCancel={handleCloseSuccessModal}
                    okText="Về trang Đăng nhập"
                    cancelButtonProps={{ style: { display: 'none' } }} 
                    centered 
                >
                    <div style={{ padding: '10px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
                        <p style={{ fontSize: '16px' }}>Tài khoản của bạn đã được ghi nhận.</p>
                        
                        <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '10px', borderRadius: '6px', marginTop: '10px' }}>
                            <p style={{ fontWeight: 'bold', color: '#faad14', margin: 0 }}>
                                ⚠️ TRẠNG THÁI: CHỜ DUYỆT
                            </p>
                            <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
                                Hệ thống đã gửi thông báo đến Admin.<br/>
                                Vui lòng chờ Quản trị viên kích hoạt tài khoản.
                            </p>
                        </div>
                    </div>
                </Modal>
            </div>
        </GoogleOAuthProvider>
    );
};

export default RegisterPage;