import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Space, Typography, message, Badge } from 'antd';
import axios from 'axios';
import './CustomStyles.css';
import bannerImg from './banner.png';
import {
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ApartmentOutlined,
  MenuOutlined,
  LogoutOutlined, 
  FormOutlined,
  TeamOutlined,       
  IdcardOutlined,     
  CheckCircleOutlined,
  ClockCircleOutlined,
  TableOutlined,
  SendOutlined
} from '@ant-design/icons';


const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const getCurrentUser = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch (e) {
            console.error("Lỗi parse userData:", e);
            return null;
        }
    }
    return null;
};

const isAdminOrManager = (user) => user && (user.role === 'admin' || user.role === 'manager');

const MainLayout = () => {
  // 👇 FIX: Mặc định là FALSE (sidebar mở) để user thấy menu ngay
  const [collapsed, setCollapsed] = useState(false); 
  const [user, setUser] = useState(getCurrentUser()); 
  
  const [stats, setStats] = useState({
      pendingSchedules: 0, 
      pendingUsers: 0,     
      pendingResets: 0     
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
      setUser(getCurrentUser());
  }, [location.pathname]);

  useEffect(() => {
      const fetchAdminStats = () => {
          const currentUser = getCurrentUser();
          if (!isAdminOrManager(currentUser)) return;

          const token = localStorage.getItem('userToken');
          if (!token) return;

          const headers = { Authorization: `Bearer ${token}` };

          axios.get('https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api/admin/stats/general', { headers })
          .then(res => {
              setStats(res.data);
          })
          .catch(err => console.error("Lỗi lấy thống kê admin:", err));
      };

      fetchAdminStats(); 
      const interval = setInterval(fetchAdminStats, 10000); 
      return () => clearInterval(interval);
  }, [location.pathname]); 

  const handleLogout = () => {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      message.success('Đã đăng xuất thành công.');
      navigate('/login', { replace: true });
  };

  const getMenuItems = (user) => {
      const isManager = isAdminOrManager(user);
      const totalUserNotifs = stats.pendingUsers + stats.pendingResets;

      const userSubItems = [
          {
              key: '/nguoi-dung/ca-nhan',
              icon: <IdcardOutlined />,
              label: <Link to="/nguoi-dung/ca-nhan">Tài khoản cá nhân</Link>,
          },
          {
              key: '/nguoi-dung/quan-ly',
              icon: <CheckCircleOutlined />,
              label: (
                  <Link to="/nguoi-dung/quan-ly" style={{ display: 'flex', alignItems: 'center' }}>
                      <span>Quản lý tài khoản</span>
                      {stats.pendingResets > 0 && (
                          <Badge 
                              count={stats.pendingResets} 
                              style={{ marginLeft: '8px', backgroundColor: '#faad14' }} 
                          />
                      )}
                  </Link>
              ),
              hidden: !isManager 
          },
          {
              key: '/nguoi-dung/can-duyet',
              icon: <ClockCircleOutlined />,
              label: (
                  <Link to="/nguoi-dung/can-duyet" style={{ display: 'flex', alignItems: 'center' }}>
                      <span>Tài khoản cần duyệt</span>
                      {stats.pendingUsers > 0 && (
                          <Badge 
                              count={stats.pendingUsers} 
                              style={{ marginLeft: '8px', backgroundColor: '#52c41a' }} 
                          />
                      )}
                  </Link>
              ),
              hidden: !isManager 
          }
      ];

      const lichTuanItems = [
          { 
              key: '/', 
              label: <Link to="/">Xem Lịch Tuần</Link>,
              icon: <CalendarOutlined />,
          }, 
          { 
              key: '/dang-ky', 
              label: <Link to="/dang-ky">Đăng ký lịch tuần</Link>,
              icon: <FormOutlined />,
              hidden: isManager 
          }, 
          { 
              key: '/lich-da-gui', 
              label: <Link to="/lich-da-gui">Lịch đã gửi</Link>,
              icon: <SendOutlined />, 
              hidden: isManager
          }, 
          { 
              key: '/quan-ly', 
              label: (
                  <Link to="/quan-ly" style={{ display: 'flex', alignItems: 'center' }}>
                      <span>Quản lý/Duyệt lịch</span>
                      {stats.pendingSchedules > 0 && (
                           <Badge 
                              count={stats.pendingSchedules} 
                              style={{ 
                                  marginLeft: '8px', 
                                  backgroundColor: '#ff4d4f',
                                  boxShadow: '0 0 0 1px #d9d9d9 inset'
                              }} 
                          />
                      )}
                  </Link>
              ),
              icon: <CheckCircleOutlined />,
              hidden: !isManager 
          },
          { 
              key: '/dia-diem', 
              label: <Link to="/dia-diem">Quản lý Địa điểm</Link>,
              icon: <EnvironmentOutlined />,
              hidden: !isManager 
          },
      ];

      return [
          { 
              key: 'sub-nguoi-dung', 
              icon: <TeamOutlined />, 
              label: (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span>Người dùng</span>
                      {totalUserNotifs > 0 && <Badge count={totalUserNotifs} size="small" style={{ marginLeft: 8 }} />}
                  </div>
              ),
              children: filterMenuItems(userSubItems) 
          },
          { 
              key: 'sub-lich-tuan', 
              icon: <CalendarOutlined />, 
              label: (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span>Lịch Tuần</span>
                      {stats.pendingSchedules > 0 && <Badge dot style={{ marginLeft: 8, marginTop: 2 }} />}
                  </div>
              ),
              children: filterMenuItems(lichTuanItems) 
          },
          { 
              key: '/thoi-khoa-bieu', 
              icon: <TableOutlined />, 
              label: <Link to="/thoi-khoa-bieu">Thời khóa biểu</Link>,
          },
          { 
              key: '/khoa-phong', 
              icon: <ApartmentOutlined />, 
              label: <Link to="/khoa-phong">Khoa và phòng ban</Link>,
          },
      ];
  };

  const filterMenuItems = (items) => {
      return items.filter(item => !item.hidden).map(item => {
          if (item.children) {
              return {
                  ...item,
                  children: filterMenuItems(item.children),
              };
          }
          return item;
      });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          width={250} 
          className="custom-sider"
          collapsible
          collapsed={collapsed} 
          onCollapse={(value) => setCollapsed(value)}
          trigger={null} 
          collapsedWidth={80}
          breakpoint="lg" // 👈 FIX: Tự động collapse trên mobile
          onBreakpoint={(broken) => {
              setCollapsed(broken); // Tự động thu gọn khi màn hình nhỏ
          }}
        >
        {/* 👇 ĐÂY LÀ ĐOẠN BẠN CẦN SỬA (BƯỚC 2) 👇 */}
  <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 16px', 
      backgroundColor: 'transparent', // Đổi từ xanh #1890ff sang suốt để không bị lệch tông với banner
      height: 64,
      justifyContent: collapsed ? 'center' : 'flex-start'
  }}>
      {!collapsed && (
          <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)} 
              style={{ 
                  color: '#fff', 
                  fontSize: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)', // Tạo nền mờ nhẹ cho nút menu
                  borderRadius: '4px',
                  width: '40px', 
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
              }}
          />
      )}
      {/* BẠN ĐÃ XÓA dutLogo VÀ CHỮ DUT Ở ĐÂY LÀ ĐÚNG. 
          MÌNH CHỈ CHỈNH LẠI MÀU NỀN CHO TRONG SUỐT ĐỂ NÓ ĐẸP HƠN. 
      */}
  </div>
            
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname === '/' ? '/' : location.pathname]}
            defaultOpenKeys={['sub-nguoi-dung', 'sub-lich-tuan']}
            style={{ height: '100%', borderRight: 0 }}
            items={filterMenuItems(getMenuItems(user))} 
          />
        </Sider>

<Layout>
          

<Header style={{ 
    backgroundImage: `url(${bannerImg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex', 
    alignItems: 'center', 
    color: '#fff',
    justifyContent: 'space-between', 
    padding: '0 24px', 
    height: 180, // 👈 QUAN TRỌNG: Tăng chiều cao lên (ví dụ: 180px)
    position: 'relative',
    borderBottom: 'none'
}}>
    {/* Lớp phủ mờ nhẹ để chữ bên phải dễ đọc hơn trên nền ảnh */}
    <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.15)', // Lớp phủ đen mờ 15%
        zIndex: 0
    }} />

    {/* Nút Menu (chỉ hiện khi sidebar bị thu gọn) */}
    <div style={{ zIndex: 1 }}>
        {collapsed && (
            <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setCollapsed(!collapsed)} 
                style={{ 
                    color: '#fff', 
                    fontSize: '20px',
                    backgroundColor: 'rgba(0,0,0,0.3)', // Nền mờ giúp nút dễ nhìn
                    borderRadius: '4px',
                    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            />
        )}
    </div>

    {/* Phần thông tin User và nút Đăng xuất bên phải */}
    <Space size="middle" style={{ marginLeft: 'auto', zIndex: 1, alignItems: 'center' }}>
        {user && (
            <Text strong style={{ 
                color: '#fff', 
                fontSize: '16px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)', // Đổ bóng chữ
                marginRight: '10px'
            }}>
                Xin chào, {user.fullName || user.email} ({user.role})
            </Text>
        )}
        <Button 
            type="primary" 
            danger 
            onClick={handleLogout} 
            icon={<LogoutOutlined />}
            style={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontWeight: 'bold',
                borderRadius: '6px',
                height: '36px',
                padding: '0 20px'
            }}
        >
            Đăng xuất
        </Button>
    </Space>
</Header>
          <Content style={{ 
              padding: 24, 
              margin: '16px', 
              minHeight: 280, 
              background: '#fff', 
              borderRadius: '8px' 
          }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
  );
};

export default MainLayout;