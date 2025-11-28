import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AuthGuard = () => {
    // Lấy token xác thực từ LocalStorage
    const token = localStorage.getItem('userToken'); 
    
    // Nếu có token, cho phép component con (Outlet) được render
    if (token) {
        return <Outlet />; 
    }
    
    // Nếu không có token, chuyển hướng người dùng đến trang đăng nhập
    return <Navigate to="/login" replace />;
};

export default AuthGuard;