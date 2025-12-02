import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');

// --- IMPORT CÁC COMPONENT ---
import MainLayout from './MainLayout';
import ScheduleDashboard from './ScheduleDashboard';
import ScheduleForm from './ScheduleForm';
import LocationManagement from './LocationManagement';
import AdminSchedulePage from './AdminSchedulePage';
import LoginPage from './LoginPage';
import AuthGuard from './AuthGuard';
import UserPage from './UserPage';
import AdminUsersPage from './AdminUsersPage';
import RegisterPage from './RegisterPage';
import MyPendingSchedules from './MyPendingSchedules';
import DepartmentsPage from './DepartmentsPage'; 
import WeeklyTimetable from './WeeklyTimetable';
// 👇 MỚI: Import trang Cấu hình Email
import EmailConfigPage from './EmailConfigPage'; 

const customLocale = {
  ...viVN,
  TimePicker: { ...viVN.TimePicker, ok: 'OK' },
  DatePicker: { ...viVN.DatePicker, lang: { ...viVN.DatePicker.lang, ok: 'OK' } },
};

function App() {
  return (
    <ConfigProvider locale={customLocale}>
      <Router>
        <Routes>
          
          {/* 1. Trang Đăng nhập & Đăng ký (Không có Layout chung) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dang-ky-tai-khoan" element={<RegisterPage />} />

          {/* 2. Các trang nội bộ (Cần đăng nhập & Có Layout chung) */}
          <Route element={<AuthGuard />}>
            <Route path="/" element={<MainLayout />}>
              
              {/* Trang chủ: Xem lịch tuần */}
              <Route index element={<ScheduleDashboard />} />
              
              {/* Các trang chức năng Lịch */}
              <Route path="dang-ky" element={<ScheduleForm />} />
              <Route path="lich-da-gui" element={<MyPendingSchedules />} />
              <Route path="quan-ly" element={<AdminSchedulePage />} />
              <Route path="thoi-khoa-bieu" element={<WeeklyTimetable />} /> 

              {/* Các trang Quản lý Danh mục */}
              <Route path="dia-diem" element={<LocationManagement />} />
              <Route path="khoa-phong" element={<DepartmentsPage />} />
              
              {/* 👇 TRANG MỚI: CẤU HÌNH EMAIL */}
              <Route path="cau-hinh-email" element={<EmailConfigPage />} />

              {/* Các trang Người dùng */}
              <Route path="nguoi-dung/ca-nhan" element={<UserPage />} />
              <Route path="nguoi-dung/quan-ly" element={<AdminUsersPage type="active" />} />
              <Route path="nguoi-dung/can-duyet" element={<AdminUsersPage type="pending" />} />
              
            </Route>
          </Route>
          
          {/* 3. Nếu không tìm thấy trang -> Quay về trang chủ */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;