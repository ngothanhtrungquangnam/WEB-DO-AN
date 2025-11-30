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
import RegisterPage from './RegisterPage';
import MyPendingSchedules from './MyPendingSchedules';

// 👇 MỚI: Import trang Khoa/Phòng ban
import DepartmentsPage from './DepartmentsPage'; 
import WeeklyTimetable from './WeeklyTimetable';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');

const customLocale = {
  ...viVN,
  // 1. Sửa cho phần chọn Giờ (TimePicker)
  TimePicker: {
    ...viVN.TimePicker,
    ok: 'OK', // 👈 Đổi từ 'Chọn' (hoặc mặc định là Được rồi) thành 'OK'
  },
  // 2. Sửa cho phần chọn Ngày (DatePicker/RangePicker)
  DatePicker: {
    ...viVN.DatePicker,
    lang: {
      ...viVN.DatePicker.lang,
      ok: 'OK', // 👈 Đổi tiếp ở đây thành 'OK'
    }
  },
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
            
            {/* MainLayout bao bọc tất cả các route con bên dưới */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<ScheduleDashboard />} />
              <Route path="dang-ky" element={<ScheduleForm />} />
              <Route path="lich-da-gui" element={<MyPendingSchedules />} />
              <Route path="dia-diem" element={<LocationManagement />} />
              <Route path="quan-ly" element={<AdminSchedulePage />} />

              
              {/* Các route Người dùng */}
              <Route path="nguoi-dung/ca-nhan" element={<UserPage />} />
              <Route path="nguoi-dung/quan-ly" element={<AdminUsersPage type="active" />} />
              <Route path="nguoi-dung/can-duyet" element={<AdminUsersPage type="pending" />} />
              
              {/* 👇 ĐÃ SỬA: Gắn component DepartmentsPage vào đây */}
              {/* Vì MainLayout đã ở trên, nên ở đây chỉ để <DepartmentsPage /> là đủ */}
              <Route path="khoa-phong" element={<DepartmentsPage />} />
              {/* Thêm dòng này vào chỗ các Route khác */}
               <Route path="thoi-khoa-bieu" element={<WeeklyTimetable />} /> 
              
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