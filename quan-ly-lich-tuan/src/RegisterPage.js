import React, { useState } from 'react';
import { Form, Input, Button, message, Modal, Divider } from 'antd'; // Thêm Divider
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'; 
import axios from 'axios';

// 👇 Import Google
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import './Auth.css';
import dutLogo from './dut.jpg'; 
import logo2 from './dtvt.jpg';

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

// 👇 CLIENT ID CỦA BẠN
// Tìm dòng này và sửa lại:
const GOOGLE_CLIENT_ID = "494075819114-mhvbrg2rjeqvlltsc2herhpuovd1asv5.apps.googleusercontent.com";

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
    
    const navigate = useNavigate();

    // --- XỬ LÝ ĐĂNG KÝ THƯỜNG (GIỮ NGUYÊN) ---
    const onFinish = (values) => {
        console.log("📌 Bắt đầu xử lý Đăng ký:", values); 
        setLoading(true);
        
        const { confirmPassword, ...dataToSend } = values;

        // Logic cũ: hostName = fullName
        dataToSend.hostName = dataToSend.fullName;

        console.log("📡 Đang gửi dữ liệu đến:", `${BASE_API_URL}/register`);
        
        axios.post(`${BASE_API_URL}/register`, dataToSend)
            .then(res => {
                console.log("✅ Server phản hồi thành công:", res.data);
                setIsSuccessModalVisible(true);
            })
            .catch(error => {
                console.error("❌ Lỗi khi đăng ký:", error);
                const errorMessage = error.response?.data?.message || 'Đăng ký thất bại.';
                message.error(errorMessage);
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

    const handleCloseSuccessModal = () => {
        setIsSuccessModalVisible(false); 
        navigate('/login'); 
    };

    const handleLoginRedirect = () => {
        navigate('/login');
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
                        <h2 className="auth-title">ĐĂNG KÝ TÀI KHOẢN</h2>
                        <p className="auth-subtitle">Tạo tài khoản mới để sử dụng hệ thống</p>
                    </div>

                    {/* 👇 NÚT GOOGLE MỚI */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => message.error('Đăng nhập Google thất bại')}
                            useOneTap
                            text="signup_with"
                            shape="pill"
                            width="300"
                        />
                    </div>

                    <Divider plain style={{ color: '#999', fontSize: '12px' }}>Hoặc đăng ký bằng Email</Divider>

                    {/* FORM ĐĂNG KÝ CŨ (GIỮ NGUYÊN) */}
                    <Form
                        name="register"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Vui lòng nhập Email!' },
                                { type: 'email', message: 'Email không hợp lệ!' }
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email (Tài khoản)" />
                        </Form.Item>

                        <Form.Item
                            name="fullName"
                            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Họ và Tên" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: 'Vui lòng nhập Mật khẩu!' },
                                { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên!' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                        </Form.Item>
                        
                        <Form.Item
                            name="confirmPassword"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận Mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 24 }}>
                            <Button type="primary" htmlType="submit" loading={loading} block className="auth-button">
                                ĐĂNG KÝ
                            </Button>
                        </Form.Item>

                        <div className="auth-footer">
                            <span>Đã có tài khoản?</span>
                            <span onClick={handleLoginRedirect} className="auth-link">Đăng nhập ngay</span>
                        </div>
                    </Form>
                </div>

                {/* MODAL CŨ (GIỮ NGUYÊN) */}
                <Modal
                    title="Đăng ký thành công!"
                    open={isSuccessModalVisible} 
                    onOk={handleCloseSuccessModal}
                    onCancel={handleCloseSuccessModal}
                    okText="Về trang Đăng nhập"
                    cancelButtonProps={{ style: { display: 'none' } }} 
                    centered 
                >
                    <div style={{ padding: '10px 0' }}>
                        <p style={{ fontSize: '16px' }}>Tài khoản của bạn đã được tạo thành công.</p>
                        <p style={{ fontWeight: 'bold', color: '#faad14', marginTop: '10px' }}>
                            ⚠️ Lưu ý: Bạn cần chờ Quản trị viên (Admin) duyệt tài khoản trước khi có thể đăng nhập.
                        </p>
                    </div>
                </Modal>

            </div>
        </GoogleOAuthProvider>
    );
};

export default RegisterPage;