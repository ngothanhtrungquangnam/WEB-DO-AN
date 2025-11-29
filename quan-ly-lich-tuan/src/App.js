import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

// Import các trang
import MainLayout from './MainLayout';
import ScheduleDashboard from './ScheduleDashboard';
import ScheduleForm from './ScheduleForm';
import LocationManagement from './LocationManagement';
import AdminSchedulePage from './AdminSchedulePage'; 
import LoginPage from './LoginPage'; 
import AuthGuard from './AuthGuard'; 
import UserPage from './UserPage'; 
import AdminUsersPage from './AdminUsersPage'; 
import DepartmentsPage from './DepartmentsPage';
// 👇 1. QUAN TRỌNG: PHẢI IMPORT FILE NÀY 👇
import RegisterPage from './RegisterPage';

import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/vi'; 
dayjs.locale('vi');

const customLocale = {
  ...viVN,
  TimePicker: { ...viVN.TimePicker, ok: 'Chọn' },
  DatePicker: { ...viVN.DatePicker, lang: { ...viVN.DatePicker.lang, ok: 'Chọn' } },
};

function App() {
  return (
    <ConfigProvider locale={customLocale}>
      <Router>
        <Routes>
          
          {/* 1. Trang Đăng nhập */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* 👇 2. QUAN TRỌNG: PHẢI CÓ DÒNG NÀY MỚI CHUYỂN TRANG ĐƯỢC 👇 */}
          <Route path="/dang-ky-tai-khoan" element={<RegisterPage />} />


          {/* 3. Các trang nội bộ (Cần đăng nhập) */}
          <Route element={<AuthGuard />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<ScheduleDashboard />} />
              <Route path="dang-ky" element={<ScheduleForm />} />
              <Route path="dia-diem" element={<LocationManagement />} />
              <Route path="quan-ly" element={<AdminSchedulePage />} /> 
              
              {/* Các route Người dùng */}
              <Route path="nguoi-dung/ca-nhan" element={<UserPage />} />
              <Route path="nguoi-dung/quan-ly" element={<AdminUsersPage type="active" />} />
              <Route path="nguoi-dung/can-duyet" element={<AdminUsersPage type="pending" />} />
              
           <Route 
  path="/khoa-phong" 
  element={
    <MainLayout>
       <DepartmentsPage /> 
    </MainLayout>
  } 
/>
            </Route>
          </Route>
          
          {/* 4. Nếu không tìm thấy trang -> Quay về trang chủ (hoặc Login) */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;