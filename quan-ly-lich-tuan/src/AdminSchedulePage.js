import React, { useState, useEffect } from 'react';
import { Table, message, Button, Select, Tabs, Space, Typography, Switch, Tag, Popconfirm, Tooltip } from 'antd';

import 'dayjs/locale/vi';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek'; 
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import { CheckOutlined, CloseOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
dayjs.locale('vi');

const { Option } = Select;
const { Title } = Typography;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api'; 

// --- 1. TỰ ĐỘNG SINH TUẦN (Để không bị lỗi ngày tháng) ---
const generateWeeks = (year) => {
    const weeks = [];
    let currentDate = dayjs(`${year}-01-01`).startOf('week').add(1, 'day'); 
    if (currentDate.year() < year) currentDate = currentDate.add(1, 'week');

    for (let i = 1; i <= 53; i++) {
        const startDate = currentDate.format('YYYY-MM-DD');
        const endDate = currentDate.add(6, 'day').format('YYYY-MM-DD');
        const labelStr = `Tuần ${i}: ${currentDate.format('DD/MM/YYYY')} - ${currentDate.add(6, 'day').format('DD/MM/YYYY')}`;
        weeks.push({ label: labelStr, value: `${year}-W${i}`, startDate, endDate });
        currentDate = currentDate.add(1, 'week');
        if (currentDate.year() > year && i > 50) break; 
    }
    return weeks;
};

const weekOptions = generateWeeks(2025);

// Tự động chọn tuần hiện tại
const today = dayjs();
const currentWeekObj = weekOptions.find(w => 
    (today.isAfter(dayjs(w.startDate).subtract(1, 'day')) && today.isBefore(dayjs(w.endDate).add(1, 'day')))
);
const defaultWeekValue = currentWeekObj ? currentWeekObj.value : weekOptions[0].value;

// Danh sách Tab Thứ (Key 1 = Thứ 2, Key 7 = CN)
const dayTabs = [
  { label: 'Thứ Hai', key: '1' }, 
  { label: 'Thứ Ba', key: '2' },
  { label: 'Thứ Tư', key: '3' },
  { label: 'Thứ Năm', key: '4' },
  { label: 'Thứ Sáu', key: '5' },
  { label: 'Thứ Bảy', key: '6' },
  { label: 'Chủ Nhật', key: '7' },
];

const AdminSchedulePage = () => {
  const [allSchedules, setAllSchedules] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(defaultWeekValue);
  const [showCanceled, setShowCanceled] = useState(false); // Lọc đã hủy

  // --- 1. GỌI API LẤY DANH SÁCH LỊCH ---
  const fetchSchedulesByWeek = () => {
    setLoading(true);
    const week = weekOptions.find(w => w.value === selectedWeek);
    
    let apiUrl = new URL(`${BASE_API_URL}/schedules`);
    if (week) {
        apiUrl.searchParams.append('startDate', week.startDate);
        apiUrl.searchParams.append('endDate', week.endDate);
    }
    // Nếu muốn xem lịch đã hủy
    if (showCanceled) {
        apiUrl.searchParams.append('isFilterCanceled', 'true');
    }

    const token = localStorage.getItem('userToken');

    fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
      .then(res => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        return res.json();
      })
      .then(data => {
        // Thêm key để React render
        const dataWithKey = data.map(item => ({ ...item, key: item.id }));
        setAllSchedules(dataWithKey); 
      })
      .catch(error => {
        if (error.message === 'UNAUTHORIZED') message.error('Hết phiên đăng nhập.');
        else message.error('Lỗi tải dữ liệu.');
      })
      .finally(() => setLoading(false));
  };

  // Gọi lại API khi đổi tuần hoặc đổi switch Hủy
  useEffect(() => {
    fetchSchedulesByWeek();
  }, [selectedWeek, showCanceled]);


  // --- 2. HÀM DUYỆT LỊCH ---
  const handleApprove = (id) => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/schedules/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            message.success('Đã duyệt lịch!');
            fetchSchedulesByWeek(); // Tải lại bảng
        } else {
            message.error('Lỗi khi duyệt.');
        }
    });
  };

  // --- 3. HÀM TỪ CHỐI / XÓA LỊCH ---
  const handleDelete = (id) => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/schedules/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            message.success('Đã xóa/từ chối lịch!');
            fetchSchedulesByWeek();
        } else {
            message.error('Lỗi khi xóa.');
        }
    });
  };


  // --- CẤU HÌNH CỘT CHO BẢNG ---
  const adminColumns = [
    { title: 'TT', key: 'tt', render: (text, record, index) => index + 1, width: 50, align: 'center' },
    { title: 'Thời gian', key: 'thoiGian', width: 100, render: (r) => <b>{`${r.batDau.slice(0, 5)} - ${r.ketThuc.slice(0, 5)}`}</b> },
    { title: 'Nội dung', dataIndex: 'noiDung', key: 'noiDung', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
    { title: 'Thành phần', dataIndex: 'thanhPhan', key: 'thanhPhan', width: 200, render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
    { title: 'Địa điểm', dataIndex: 'diaDiem', key: 'diaDiem', width: 120 },
    { title: 'Chủ trì', dataIndex: 'chuTriTen', key: 'chuTriTen', width: 120, render: (t) => <b>{t}</b> },
    
    { title: 'Đơn vị đề nghị', dataIndex: 'chuTriEmail', key: 'donViDeNghi', width: 150, ellipsis: true },
    
    { 
      title: 'ĐV duyệt', 
      dataIndex: 'trangThai',
      key: 'donViDuyet', 
      width: 80,
      align: 'center',
      render: (status) => {
          if (status === 'da_duyet') return <div style={{ width: 20, height: 20, backgroundColor: '#52c41a', borderRadius: '50%', margin: 'auto' }}></div>;
          if (status === 'huy') return <Tag color="red">Hủy</Tag>;
          return <div style={{ width: 20, height: 20, backgroundColor: '#d9d9d9', borderRadius: '50%', margin: 'auto' }}></div>; // Màu xám cho chưa duyệt
      }
    },
    
  { 
      title: 'Bổ sung', 
      dataIndex: 'isBoSung', 
      key: 'boSung', 
      width: 90, 
      align: 'center',
      render: (val) => {
          console.log("Giá trị Bổ sung:", val); // Log ra console để kiểm tra
          // Dùng so sánh lỏng (==) để bắt được cả số 1 và chuỗi "1"
          if (val == 1 || val === true) {
              return <Tag color="red" style={{ fontWeight: 'bold' }}>BS</Tag>;
          }
          return null; 
      }
    },

    // 2. CỘT PHỤ LỤC (Sửa thành hình tròn xanh)
    { 
      title: 'Phụ lục', 
      dataIndex: 'thuocPhuLuc', 
      key: 'phuLuc', 
      width: 90, 
      align: 'center',
      render: (val) => {
          if (val == 1 || val === true) {
              // 👇 ĐỔI TỪ ICON CHECK SANG HÌNH TRÒN XANH
              return (
                  <div style={{ 
                      width: 20, 
                      height: 20, 
                      backgroundColor: '#52c41a', // Màu xanh lá (giống ĐV duyệt)
                      borderRadius: '50%', 
                      margin: 'auto' 
                  }} />
              );
          }
          return null; 
      } 
    },
    { 
      title: 'Hủy', 
      key: 'hanhDong', 
      width: 140,
      render: (record) => (
        <Space size="small">
          {/* Nút Duyệt chỉ hiện khi chưa duyệt */}
          {record.trangThai === 'cho_duyet' && (
            <Popconfirm title="Duyệt lịch này?" onConfirm={() => handleApprove(record.id)}>
                <Button type="primary" size="small" style={{ backgroundColor: '#52c41a' }}>Duyệt</Button>
            </Popconfirm>
          )}
          
          {/* Nút Hủy luôn hiện */}
          <Popconfirm title="Xóa/Từ chối lịch này?" onConfirm={() => handleDelete(record.id)} okType="danger">
             <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  // --- TẠO DANH SÁCH TAB TỪ DỮ LIỆU ---
  const renderTabItems = () => {
      return dayTabs.map(dayTab => {
          // Lọc lịch theo thứ (isoWeekday: 1=Thứ 2, 7=CN)
          const daySchedules = allSchedules.filter(s => dayjs(s.ngay).isoWeekday().toString() === dayTab.key);
          
          return {
              key: dayTab.key,
              label: dayTab.label,
              children: (
                <Table
                    columns={adminColumns}
                    dataSource={daySchedules} 
                    loading={loading}
                    bordered
                    size="middle"
                    pagination={false} 
                    locale={{ emptyText: 'Không có lịch nào trong ngày này' }}
                />
              )
          };
      });
  };

  return (
    <div style={{ padding: '0px', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      {/* Header Xanh */}
      <div style={{ 
          backgroundColor: '#3498db', padding: '10px 20px', display: 'flex', 
          justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 
      }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          Danh sách lịch tuần
        </Title>
        <div style={{ color: 'red', fontWeight: 'bold', textShadow: '1px 1px 0px #fff' }}>
          1 ngày 5 giờ 25 phút 2 giây
        </div>
      </div>

      {/* Bộ lọc */}
      <Space style={{ marginBottom: 16, padding: '0 20px', display: 'flex' }} wrap align="center">
            <div>
              <span className="filter-label" style={{fontWeight: 500, marginRight: 8}}>Năm học</span>
              <Select defaultValue="2025-2026" style={{ width: 140 }}><Option value="2025-2026">2025 - 2026</Option></Select>
            </div>
            <div>
              <span className="filter-label" style={{fontWeight: 500, marginRight: 8}}>Tuần học</span>
              <Select 
                value={selectedWeek} 
                style={{ width: 300 }} 
                onChange={(val) => setSelectedWeek(val)} 
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              >
                {weekOptions.map(week => (<Option key={week.value} value={week.value}>{week.label}</Option>))}
              </Select>
            </div>
            <div>
              <Space style={{marginLeft: 20}}>
                <Switch 
                    size="small" 
                    checked={showCanceled} 
                    onChange={(checked) => setShowCanceled(checked)} 
                />
                <span>Đã hủy</span>
              </Space>
            </div>
      </Space>

      {/* Tabs Thứ */}
      <div style={{ padding: '0 20px' }}>
          <Tabs 
            defaultActiveKey="1" 
            type="card"
            items={renderTabItems()} 
          />
      </div>

    </div>
  );
};

export default AdminSchedulePage;