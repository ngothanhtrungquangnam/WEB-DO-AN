import React, { useState, useEffect } from 'react';
import { Table, message, Button, Select, Space, Typography, Switch, Tag, Popconfirm } from 'antd';
import 'dayjs/locale/vi';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek'; 
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import { DeleteOutlined, CheckOutlined, UnorderedListOutlined, FilterOutlined } from '@ant-design/icons';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
dayjs.locale('vi');

const { Option } = Select;
const { Title } = Typography;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api'; 

// --- TỰ ĐỘNG SINH TUẦN ---
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


const AdminSchedulePage = () => {
  const [allSchedules, setAllSchedules] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // State điều khiển chế độ xem
  // true: Xem tất cả (theo tuần) | false: Chỉ xem chờ duyệt (Mặc định)
  const [viewAllMode, setViewAllMode] = useState(false); 
  
  const [selectedWeek, setSelectedWeek] = useState(defaultWeekValue);

  // --- 1. GỌI API LẤY DANH SÁCH LỊCH ---
  const fetchSchedules = () => {
    setLoading(true);
    const token = localStorage.getItem('userToken');
    
    let apiUrl = new URL(`${BASE_API_URL}/schedules`);

    if (viewAllMode) {
        // CHẾ ĐỘ XEM TẤT CẢ: Lọc theo Tuần đã chọn
        const week = weekOptions.find(w => w.value === selectedWeek);
        if (week) {
            apiUrl.searchParams.append('startDate', week.startDate);
            apiUrl.searchParams.append('endDate', week.endDate);
        }
        // Không lọc trạng thái -> Lấy hết (Đã duyệt, Hủy, Chờ duyệt...)
    } else {
        // CHẾ ĐỘ MẶC ĐỊNH: Chỉ lấy danh sách CHỜ DUYỆT (Bất kể ngày tháng)
        apiUrl.searchParams.append('trangThai', 'cho_duyet');
    }

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
        // Thêm key và sắp xếp theo ngày giờ
        const sortedData = data
            .map(item => ({ ...item, key: item.id }))
            .sort((a, b) => {
                // Sắp xếp: Ngày tăng dần -> Giờ bắt đầu tăng dần
                const dateA = dayjs(a.ngay);
                const dateB = dayjs(b.ngay);
                if (!dateA.isSame(dateB)) return dateA.diff(dateB);
                return a.batDau.localeCompare(b.batDau);
            });
        setAllSchedules(sortedData); 
      })
      .catch(error => {
        if (error.message === 'UNAUTHORIZED') message.error('Hết phiên đăng nhập.');
        else message.error('Lỗi tải dữ liệu.');
      })
      .finally(() => setLoading(false));
  };

  // Gọi lại API khi đổi chế độ xem hoặc đổi tuần (chỉ khi ở chế độ xem tất cả)
  useEffect(() => {
    fetchSchedules();
  }, [viewAllMode, selectedWeek]);


  // --- CÁC HÀM XỬ LÝ ---
  const handleApprove = (id) => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/schedules/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            message.success('Đã duyệt lịch!');
            fetchSchedules();
        } else {
            message.error('Lỗi khi duyệt.');
        }
    });
  };

  const handleDelete = (id) => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/schedules/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            message.success('Đã xóa/từ chối lịch!');
            fetchSchedules();
        } else {
            message.error('Lỗi khi xóa.');
        }
    });
  };


const adminColumns = [
    { title: 'TT', key: 'tt', render: (text, record, index) => index + 1, width: 50, align: 'center' },
    
    { 
        title: 'Thứ / Ngày', 
        key: 'ngay', 
        width: 110,
        render: (r) => {
            const d = dayjs(r.ngay);
            const thu = d.day() === 0 ? "Chủ Nhật" : `Thứ ${d.day() + 1}`;
            return (
                <div>
                    <div style={{fontWeight: 'bold', color: '#1890ff'}}>{thu}</div>
                    <small>{d.format('DD/MM/YYYY')}</small>
                </div>
            );
        }
    },

    { title: 'Thời gian', key: 'thoiGian', width: 100, render: (r) => <b>{`${r.batDau.slice(0, 5)} - ${r.ketThuc.slice(0, 5)}`}</b> },
    
    // 👇 ĐÃ CHỈNH SỬA ĐỘ RỘNG Ở ĐÂY 👇
    { 
        title: 'Nội dung', 
        dataIndex: 'noiDung', 
        key: 'noiDung', 
        width: 300,  // Thu hẹp lại một chút
        render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> 
    },
    { 
        title: 'Thành phần', 
        dataIndex: 'thanhPhan', 
        key: 'thanhPhan', 
        width: 380,  // Mở rộng ra nhiều (Cũ là 200)
        render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> 
    },
    // 👆 KẾT THÚC CHỈNH SỬA 👆

    { title: 'Địa điểm', dataIndex: 'diaDiem', key: 'diaDiem', width: 120 },
    { title: 'Chủ trì', dataIndex: 'chuTriTen', key: 'chuTriTen', width: 120, render: (t) => <b>{t}</b> },
    { title: 'Đơn vị đề nghị', dataIndex: 'chuTriEmail', key: 'donViDeNghi', width: 150, ellipsis: true },
    
    { 
      title: 'Trạng thái', 
      dataIndex: 'trangThai',
      key: 'trangThai', 
      width: 100,
      align: 'center',
      render: (status) => {
          if (status === 'da_duyet') return <Tag color="success">Đã duyệt</Tag>;
          if (status === 'huy') return <Tag color="red">Đã hủy</Tag>;
          return <Tag color="warning">Chờ duyệt</Tag>;
      }
    },
    
    { 
      title: 'Bổ sung', 
      dataIndex: 'isBoSung', 
      key: 'boSung', 
      width: 80, 
      align: 'center',
      render: (val) => (val == 1 || val === true) ? <Tag color="red">BS</Tag> : null
    },

    { 
      title: 'Hành động', 
      key: 'hanhDong', 
      width: 140,
      fixed: 'right',
      render: (record) => (
        <Space size="small">
          {record.trangThai === 'cho_duyet' && (
            <Button 
                type="primary" 
                size="small" 
                icon={<CheckOutlined />}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => handleApprove(record.id)}
            >
                Duyệt
            </Button>
          )}
          
          <Popconfirm title="Xóa/Từ chối lịch này?" onConfirm={() => handleDelete(record.id)} okType="danger">
             <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: '0px', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      {/* Header Xanh */}
      <div style={{ 
          backgroundColor: '#3498db', padding: '10px 20px', display: 'flex', 
          justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 
      }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          {viewAllMode ? 'Tất Cả Lịch Trình (Lịch Sử)' : 'Danh Sách Lịch Chờ Duyệt'}
        </Title>
        
        {/* Nút Chuyển Chế Độ */}
        <Space>
            <span style={{color: 'white', fontWeight: 500}}>Chế độ xem: </span>
            <Switch 
                checkedChildren="Tất cả" 
                unCheckedChildren="Chờ duyệt" 
                checked={viewAllMode}
                onChange={(val) => setViewAllMode(val)}
            />
        </Space>
      </div>

      {/* Bộ lọc - Chỉ hiện khi xem tất cả */}
      {viewAllMode && (
          <div style={{ padding: '0 20px', marginBottom: 16, backgroundColor: '#f0f2f5', padding: '10px', borderRadius: 4, margin: '0 20px 16px' }}>
             <Space wrap align="center">
                <FilterOutlined />
                <span style={{fontWeight: 600}}>Bộ lọc tuần:</span>
                <Select defaultValue="2025-2026" style={{ width: 120 }} disabled><Option value="2025-2026">2025 - 2026</Option></Select>
                <Select 
                    value={selectedWeek} 
                    style={{ width: 280 }} 
                    onChange={(val) => setSelectedWeek(val)} 
                    showSearch
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                >
                    {weekOptions.map(week => (<Option key={week.value} value={week.value}>{week.label}</Option>))}
                </Select>
             </Space>
          </div>
      )}

      {/* Bảng Danh Sách Duy Nhất */}
      <div style={{ padding: '0 20px' }}>
          <Table
            columns={adminColumns}
            dataSource={allSchedules} 
            loading={loading}
            bordered
            size="middle"
            pagination={{ pageSize: 10 }} 
            locale={{ emptyText: viewAllMode ? 'Không có lịch nào trong tuần này' : 'Hiện không có lịch nào chờ duyệt 🎉' }}
            rowClassName={(record) => record.trangThai === 'cho_duyet' ? 'highlight-row-pending' : ''}
          />
      </div>

      {/* CSS nhỏ để làm nổi bật dòng chờ duyệt */}
      <style>{`
        .highlight-row-pending td {
            background-color: #fff7e6 !important;
        }
        .highlight-row-pending:hover td {
            background-color: #ffe7ba !important;
        }
      `}</style>

    </div>
  );
};

export default AdminSchedulePage;