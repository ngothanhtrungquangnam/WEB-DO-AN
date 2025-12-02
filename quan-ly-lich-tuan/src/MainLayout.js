import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Space, Typography, message, Badge } from 'antd';
import axios from 'axios';
import './CustomStyles.css';
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
import dutLogo from './dut.jpg'; 

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
  const [collapsed, setCollapsed] = useState(true); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // ✅ Phát hiện mobile
  const [user, setUser] = useState(getCurrentUser()); 
  
  const [stats, setStats] = useState({
      pendingSchedules: 0, 
      pendingUsers: 0,     
      pendingResets: 0     
  });

  const location = useLocation();
  const navigate = useNavigate();

    // ✅ THÊM: Xử lý responsive
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setCollapsed(true); // Đóng sidebar khi chuyển sang mobile
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setUser(getCurrentUser());
    }, [location.pathname]);

    // ✅ THÊM: Tự động đóng sidebar trên mobile khi đổi route
    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [location.pathname, isMobile]);

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

    // ✅ THÊM: Hàm xử lý khi click menu item
    const handleMenuClick = (e) => {
        if (isMobile) {
            setCollapsed(true); // Đóng sidebar trên mobile
        }
    };

    const getMenuItems = (user) => {
        const isManager = isAdminOrManager(user);
        const totalUserNotifs = stats.pendingUsers + stats.pendingResets;

        // 1. MENU CON NGƯỜI DÙNG
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

        // 2. MENU CON LỊCH TUẦN
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
          collapsedWidth={isMobile ? 0 : 80} // ✅ Ẩn hoàn toàn trên mobile
          breakpoint="md" // ✅ Thêm breakpoint
          onBreakpoint={(broken) => {
              setIsMobile(broken);
              if (broken) setCollapsed(true);
          }}
          style={{
              overflow: 'auto',
              height: '100vh',
              position: isMobile ? 'fixed' : 'relative', // ✅ Fixed trên mobile
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: isMobile ? 1000 : 'auto', // ✅ Nổi lên trên mobile
          }}
        >
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: '#1890ff', height: 64 }}>
                <Button
                    type="text"
                    icon={<MenuOutlined />}
                    onClick={() => setCollapsed(!collapsed)} 
                    style={{ color: '#fff', fontSize: '18px', marginRight: '16px', display: collapsed ? 'none' : 'block' }}
                />
                <img src={dutLogo} alt="DUT Logo" style={{ height: '40px', marginRight: '10px' }} />
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.4)' }}>DUT</span>
            </div>
            
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname === '/' ? '/' : location.pathname]}
            defaultOpenKeys={['sub-nguoi-dung', 'sub-lich-tuan']}
            style={{ height: '100%', borderRight: 0 }}
            items={filterMenuItems(getMenuItems(user))} 
            onClick={handleMenuClick} // ✅ Đóng sidebar khi click menu trên mobile
          />
        </Sider>

        {/* ✅ THÊM: Overlay đen khi sidebar mở trên mobile */}
        {isMobile && !collapsed && (
            <div
                onClick={() => setCollapsed(true)}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 999,
                }}
            />
        )}

        <Layout>
          <Header style={{ 
              backgroundColor: '#ffD700', 
              display: 'flex', 
              alignItems: 'center', 
              color: '#000', 
              justifyContent: 'space-between', 
              padding: '0 24px', 
              height: 64,
              position: 'sticky', // ✅ Header dính trên cùng
              top: 0,
              zIndex: 900
          }}>
                <Button
                    type="text"
                    icon={<MenuOutlined />}
                    onClick={() => setCollapsed(!collapsed)} 
                    style={{ 
                        color: '#000', 
                        fontSize: '18px', 
                        display: collapsed ? 'block' : 'none' // ✅ Hiện nút khi sidebar đóng
                    }}
                />
                <Space size="middle" style={{ marginLeft: 'auto' }}>
                    {user && (
                        <Text strong style={{ color: '#000', fontSize: isMobile ? '12px' : '14px' }}>
                            {isMobile ? user.fullName?.split(' ')[0] : `Xin chào, ${user.fullName || user.email}`} ({user.role})
                        </Text>
                    )}
                    <Button 
                        type="primary" 
                        danger 
                        onClick={handleLogout} 
                        icon={<LogoutOutlined />}
                        size={isMobile ? 'small' : 'middle'}
                    >
                        {!isMobile && 'Đăng xuất'}
                    </Button>
                </Space>
          </Header>

          <Content style={{ 
              padding: isMobile ? 12 : 24, 
              margin: isMobile ? '8px' : '16px', 
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