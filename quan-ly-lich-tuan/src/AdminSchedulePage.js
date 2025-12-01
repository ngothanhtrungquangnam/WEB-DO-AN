import React, { useState, useEffect } from 'react';
import { Table, message, Button, Select, Space, Typography, Switch, Tag, Popconfirm, Modal, Input } from 'antd';
import 'dayjs/locale/vi';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek'; 
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import { 
    DeleteOutlined, 
    CheckOutlined, 
    FilterOutlined, 
    EyeOutlined, 
    FileTextOutlined, 
    TeamOutlined,
    CloseCircleOutlined 
} from '@ant-design/icons';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
dayjs.locale('vi');

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api'; 

// --- TỰ ĐỘNG SINH TUẦN (CHUẨN: BẮT ĐẦU TỪ 06/01/2025) ---
const generateWeeks = (year) => {
    const weeks = [];
    
    // 👇 MỐC CỐ ĐỊNH: 06/01/2025
    let start = dayjs('2025-01-06'); 

    for (let i = 1; i <= 52; i++) {
        const end = start.add(6, 'day');
        const labelStr = `Tuần ${i}: ${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`; 
        
        weeks.push({
            label: labelStr,
            value: `${year}-W${i}`,
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD')
        });
        
        start = start.add(1, 'week');
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
  const [viewAllMode, setViewAllMode] = useState(false); 
  const [selectedWeek, setSelectedWeek] = useState(defaultWeekValue);

  // 👇 STATE MỚI: Modal Xem chi tiết & Modal Từ chối
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailContent, setDetailContent] = useState({ title: '', content: '' });

  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  // --- 1. GỌI API LẤY DANH SÁCH LỊCH ---
  const fetchSchedules = () => {
    setLoading(true);
    const token = localStorage.getItem('userToken');
    
    let apiUrl = new URL(`${BASE_API_URL}/schedules`);

    if (viewAllMode) {
        // CHẾ ĐỘ XEM TẤT CẢ
        const week = weekOptions.find(w => w.value === selectedWeek);
        if (week) {
            apiUrl.searchParams.append('startDate', week.startDate);
            apiUrl.searchParams.append('endDate', week.endDate);
        }
    } else {
        // CHẾ ĐỘ MẶC ĐỊNH: CHỜ DUYỆT
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
        const sortedData = data
            .map(item => ({ ...item, key: item.id }))
            .sort((a, b) => {
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

  // Mở modal từ chối
  const openRejectModal = (id) => {
      setSelectedScheduleId(id);
      setIsRejectModalVisible(true);
  };

  // Xác nhận từ chối (Xóa)
  const handleConfirmReject = () => {
    const token = localStorage.getItem('userToken');
    // Ở đây dùng DELETE để xóa luôn, hoặc bạn có thể gọi API đổi trạng thái thành 'huy' nếu muốn lưu vết
    fetch(`${BASE_API_URL}/schedules/${selectedScheduleId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            message.success('Đã từ chối lịch.');
            setIsRejectModalVisible(false);
            setRejectReason('');
            fetchSchedules();
        } else {
            message.error('Lỗi khi xóa.');
        }
    });
  };

  // Hàm hiển thị chi tiết
  const showDetail = (title, content) => {
      setDetailContent({ title, content });
      setIsDetailModalVisible(true);
  };


// --- CẤU HÌNH CỘT (CẬP NHẬT GIAO DIỆN PHỤ LỤC & BỔ SUNG) ---
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
    
    // 👇 CỘT NỘI DUNG MỚI
    { 
        title: 'Nội dung', 
        dataIndex: 'noiDung', 
        key: 'noiDung', 
        width: 300, 
        render: (text, record) => {
            const isPhuLuc = record.thuocPhuLuc === 1 || record.thuocPhuLuc === true;
            const isBoSung = record.isBoSung === 1 || record.isBoSung === true;

            const tmp = document.createElement("DIV");
            tmp.innerHTML = text;
            const plainText = tmp.textContent || "";
            const isLong = plainText.length > 150;

            return (
                <div>
                    {isBoSung && <Tag color="#ff4d4f" style={{fontWeight: 'bold', marginBottom: 5}}>LỊCH BỔ SUNG</Tag>}
                    
                    {isPhuLuc ? (
                        <div style={{ backgroundColor: '#f0f5ff', border: '1px dashed #adc6ff', padding: '8px', borderRadius: '4px' }}>
                            <Space><FileTextOutlined style={{color: '#1890ff'}}/><Text type="secondary" style={{fontSize: 12}}>Nội dung phụ lục</Text></Space>
                            <Button type="link" size="small" onClick={() => showDetail('Nội dung chi tiết', text)} style={{paddingLeft: 0, display: 'block'}}>
                                Xem chi tiết
                            </Button>
                        </div>
                    ) : isLong ? (
                        <div>
                            {plainText.slice(0, 150)}...
                            <a onClick={() => showDetail('Nội dung chi tiết', text)} style={{marginLeft: 5}}>Xem thêm</a>
                        </div>
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: text }} />
                    )}
                </div>
            );
        } 
    },
    // 👇 CỘT THÀNH PHẦN MỚI
    { 
        title: 'Thành phần', 
        dataIndex: 'thanhPhan', 
        key: 'thanhPhan', 
        width: 250, 
        render: (text, record) => {
            const isPhuLuc = record.thuocPhuLuc === 1 || record.thuocPhuLuc === true;
            if (isPhuLuc) {
                return (
                    <div style={{ backgroundColor: '#f6ffed', border: '1px dashed #b7eb8f', padding: '8px', borderRadius: '4px' }}>
                        <Space><TeamOutlined style={{color: '#52c41a'}}/><Text type="secondary" style={{fontSize: 12}}>DS đính kèm</Text></Space>
                        <Button type="link" size="small" onClick={() => showDetail('Thành phần tham dự', text)} style={{paddingLeft: 0, display: 'block', color: '#52c41a'}}>
                            Xem danh sách
                        </Button>
                    </div>
                );
            }
            return <div dangerouslySetInnerHTML={{ __html: text }} />;
        }
    },

    { title: 'Địa điểm', dataIndex: 'diaDiem', key: 'diaDiem', width: 120 },

    { 
        title: 'Khoa / Đơn vị', 
        dataIndex: 'donVi', 
        key: 'donVi', 
        width: 150,
        render: (text) => <span style={{ color: '#096dd9', fontWeight: 500 }}>{text}</span>
    },

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
      title: 'Hành động', 
      key: 'hanhDong', 
      width: 140,
      fixed: 'right',
      render: (record) => (
        <Space size="small">
          {record.trangThai === 'cho_duyet' && (
            <Popconfirm title="Duyệt lịch này?" onConfirm={() => handleApprove(record.id)} okText="Duyệt" cancelText="Hủy">
                <Button 
                    type="primary" 
                    size="small" 
                    icon={<CheckOutlined />}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                    Duyệt
                </Button>
            </Popconfirm>
          )}
          
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openRejectModal(record.id)}>
             {record.trangThai === 'cho_duyet' ? 'Từ chối' : 'Xóa'}
          </Button>
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

      {/* 👇 MODAL HIỂN THỊ CHI TIẾT (MỚI) */}
      <Modal
        title={detailContent.title}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[<Button key="close" onClick={() => setIsDetailModalVisible(false)}>Đóng</Button>]}
        width={800}
      >
        <div dangerouslySetInnerHTML={{ __html: detailContent.content }} />
      </Modal>

      {/* 👇 MODAL TỪ CHỐI (MỚI) */}
      <Modal
        title="Xác nhận từ chối / Xóa lịch"
        open={isRejectModalVisible}
        onOk={handleConfirmReject}
        onCancel={() => setIsRejectModalVisible(false)}
        okText="Xác nhận Từ chối"
        okButtonProps={{ danger: true }}
      >
        <p>Bạn có chắc muốn từ chối (xóa) lịch này không?</p>
        <TextArea 
            rows={3} 
            placeholder="Nhập lý do từ chối (Tùy chọn)..." 
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

    </div>
  );
};

export default AdminSchedulePage;