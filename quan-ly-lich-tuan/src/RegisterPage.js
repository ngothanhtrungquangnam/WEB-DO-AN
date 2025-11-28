import React, { useState } from 'react';
// 👇 Import Modal, Form, Input, Button...
import { Form, Input, Button, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import axios from 'axios';

import './Auth.css';
import dutLogo from './dut.jpg'; 
import logo2 from './dtvt.jpg';

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    // 👇 THÊM BIẾN STATE ĐỂ ĐIỀU KHIỂN MODAL
    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
    
    const navigate = useNavigate();

    const onFinish = (values) => {
        console.log("📌 Bắt đầu xử lý Đăng ký:", values); 
        setLoading(true);
        
        const { confirmPassword, ...dataToSend } = values;

        console.log("📡 Đang gửi dữ liệu đến:", `${BASE_API_URL}/register`);
        
        axios.post(`${BASE_API_URL}/register`, dataToSend)
            .then(res => {
                console.log("✅ Server phản hồi thành công:", res.data);
                
                // ✅ THAY ĐỔI QUAN TRỌNG:
                // Thay vì gọi Modal.success(), ta bật biến state lên true
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

    // Hàm xử lý khi bấm nút OK trong Modal thành công
    const handleCloseSuccessModal = () => {
        setIsSuccessModalVisible(false); // Tắt modal
        navigate('/login'); // Chuyển về trang đăng nhập
    };

    const handleLoginRedirect = () => {
        navigate('/login');
    };

    return (
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

                    <div style={{ display: 'flex', gap: '16px' }}> 
                        <Form.Item
                            name="fullName"
                            style={{ flex: 1, marginBottom: '24px' }} 
                            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Họ và Tên" />
                        </Form.Item>

                        <Form.Item
                            name="hostName"
                            style={{ flex: 1, marginBottom: '24px' }} 
                            rules={[{ required: true, message: 'Vui lòng nhập Tên Chủ trì!' }]}
                        >
                            <Input prefix={<IdcardOutlined />} placeholder="Tên Chủ trì" />
                        </Form.Item>
                    </div>

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

            {/* 👇 ĐÂY LÀ MODAL THÔNG BÁO THÀNH CÔNG (Luôn hiện nếu state = true) 👇 */}
            <Modal
                title="Đăng ký thành công!"
                open={isSuccessModalVisible} // Điều khiển bằng biến state
                onOk={handleCloseSuccessModal}
                onCancel={handleCloseSuccessModal}
                okText="Về trang Đăng nhập"
                cancelButtonProps={{ style: { display: 'none' } }} // Ẩn nút Cancel đi cho đẹp
                centered // Căn giữa màn hình
            >
                <div style={{ padding: '10px 0' }}>
                    <p style={{ fontSize: '16px' }}>Tài khoản của bạn đã được tạo thành công.</p>
                    <p style={{ fontWeight: 'bold', color: '#faad14', marginTop: '10px' }}>
                        ⚠️ Lưu ý: Bạn cần chờ Quản trị viên (Admin) duyệt tài khoản trước khi có thể đăng nhập.
                    </p>
                </div>
            </Modal>

        </div>
    );
};

export default RegisterPage;