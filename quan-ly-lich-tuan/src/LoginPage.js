import React, { useState } from 'react';
import { Form, Input, Button, message, Modal, Alert, Divider } from 'antd'; 
import { useNavigate, Link } from 'react-router-dom'; 
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'; 
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios'; 

import './Auth.css'; 
import dutLogo from './dut.jpg'; 
import logo2 from './dtvt.jpg'; 

const API_URL_LOGIN = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api/login'; 
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';
const GOOGLE_CLIENT_ID = "494075819114-mhvbrg2rjeqvlltsc2herhpuovd1asv5.apps.googleusercontent.com";

const LoginPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
    
    // 👇 State hiển thị lỗi Đăng nhập (Sai pass/email)
    const [loginError, setLoginError] = useState(null);
    // 👇 State hiển thị lỗi trong Modal Quên mật khẩu
    const [modalError, setModalError] = useState(null);

    const navigate = useNavigate();

    // --- 1. XỬ LÝ ĐĂNG NHẬP THƯỜNG ---
    const onFinishLogin = (values) => {
        setLoading(true);
        setLoginError(null); // Reset lỗi cũ

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
            // Hiển thị lỗi ra khung đỏ trên màn hình
            setLoginError(error.message);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // --- 2. XỬ LÝ ĐĂNG NHẬP GOOGLE ---
    const handleGoogleSuccess = (credentialResponse) => {
        setLoading(true);
        setLoginError(null);

        axios.post(`${BASE_API_URL}/auth/google`, { token: credentialResponse.credential })
            .then(res => {
                message.success('Đăng nhập Google thành công!');
                localStorage.setItem('userToken', res.data.token);
                localStorage.setItem('userData', JSON.stringify(res.data.user));
                navigate('/', { replace: true });
            })
            .catch(err => {
                // Nếu tài khoản chưa được duyệt (Lỗi 403 từ server)
                if (err.response && err.response.status === 403) {
                    Modal.warning({
                        title: 'Thông báo',
                        content: (
                            <div>
                                <p>{err.response.data.message}</p>
                                <p style={{fontSize: '13px', color: '#888'}}>Vui lòng đợi Quản trị viên kích hoạt tài khoản.</p>
                            </div>
                        ),
                        okText: 'Đã hiểu',
                        centered: true
                    });
                } else {
                    // Các lỗi khác thì hiện ra khung đỏ
                    setLoginError('Lỗi Google: ' + (err.response?.data?.message || err.message));
                }
            })
            .finally(() => setLoading(false));
    };

    const handleRegisterRedirect = () => {
        navigate('/dang-ky-tai-khoan');
    };

    // --- 3. XỬ LÝ QUÊN MẬT KHẨU ---
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
            Modal.success({ title: 'Gửi yêu cầu thành công!', content: data.message });
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

                    {/* === PHẦN 1: FORM ĐĂNG NHẬP (ĐƯA LÊN TRÊN) === */}
                    <Form
                        name="login_form"
                        onFinish={onFinishLogin}
                        autoComplete="off"
                        layout="vertical"
                        size="large"
                        onValuesChange={() => setLoginError(null)} // Nhập lại thì tắt lỗi
                    >
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'Vui lòng nhập Email!' }]}
                            style={{marginBottom: 16}}
                        >
                            <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="Email (Tài khoản)" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                            style={{ marginBottom: 8 }}
                        >
                            <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} placeholder="Mật khẩu" />
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <span onClick={handleForgotPassword} className="auth-link-hover" style={{ color: '#1890ff', cursor: 'pointer', fontSize: '13px' }}>
                                Quên mật khẩu?
                            </span>
                        </div>

                        {/* 👇 HIỂN THỊ LỖI ĐĂNG NHẬP TẠI ĐÂY 👇 */}
                        {loginError && (
                            <Alert
                                message="Đăng nhập thất bại"
                                description={loginError}
                                type="error"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <Form.Item style={{ marginBottom: 16 }}>
                            <Button type="primary" htmlType="submit" loading={loading} block className="auth-button" style={{ height: '45px', fontWeight: '600', fontSize: '16px' }}>
                                ĐĂNG NHẬP
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* === PHẦN 2: GOOGLE (ĐƯA XUỐNG DƯỚI CHO KHOA HỌC) === */}
                    <div style={{ position: 'relative', marginBottom: 20 }}>
                        <Divider plain style={{ color: '#8c8c8c', fontSize: '13px' }}>Hoặc đăng nhập bằng</Divider>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setLoginError('Đăng nhập Google thất bại')}
                            useOneTap={false}
                            theme="outline"
                            size="large"
                            width="320"
                            text="signin_with"
                            shape="rectangular"
                        />
                    </div>

                    <div className="auth-footer" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '15px', textAlign: 'center' }}>
                         <span style={{color: '#666'}}>Bạn chưa có tài khoản? </span>
                         <span onClick={handleRegisterRedirect} className="auth-link" style={{fontWeight: '600', cursor: 'pointer', color: '#1890ff'}}>Đăng ký ngay</span>
                    </div>
                </div>

                {/* MODAL QUÊN MẬT KHẨU */}
                <Modal
                    title="Gửi yêu cầu Quên mật khẩu"
                    open={isForgotModalVisible}
                    onCancel={handleCloseForgotModal}
                    footer={null} 
                >
                    <Form form={form} onFinish={handleSendResetRequest} layout="vertical">
                        <p style={{marginBottom: 15, fontSize: 13, color: '#666'}}>Nhập thông tin để gửi yêu cầu cấp lại mật khẩu.</p>
                        {modalError && <Alert message={modalError} type="error" showIcon style={{ marginBottom: 15 }} />}
                        <Form.Item name="email" rules={[{ required: true }]}><Input prefix={<MailOutlined />} placeholder="Email" /></Form.Item>
                        <Form.Item name="fullName" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder="Họ và Tên" /></Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>Gửi yêu cầu</Button>
                        <div style={{ textAlign: 'center', marginTop: 10 }}><a onClick={handleCloseForgotModal} style={{color: '#888', cursor:'pointer'}}>Hủy bỏ</a></div>
                    </Form>
                </Modal>
            </div>
        </GoogleOAuthProvider>
    );
};

export default LoginPage;