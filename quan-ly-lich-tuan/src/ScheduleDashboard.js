import React, { useState, useEffect } from 'react';
import { Table, Tag, message, Button, Select, Space, Typography, Switch, Row, Col, Modal, Tooltip } from 'antd'; 
import { Link } from 'react-router-dom';
// 👇 IMPORT THÊM ICON MỚI
import { UnorderedListOutlined, EyeOutlined } from '@ant-design/icons';
import 'dayjs/locale/vi';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek'; 
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
dayjs.locale('vi');

const { Option } = Select;
const { Title, Text } = Typography;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

// --- 1. HÀM TỰ ĐỘNG SINH DANH SÁCH TUẦN ---
const generateWeeks = (year) => {
    const weeks = [];
    let currentDate = dayjs(`${year}-01-01`).startOf('week').add(1, 'day'); 
    if (currentDate.year() < year) currentDate = currentDate.add(1, 'week');

    for (let i = 1; i <= 53; i++) {
        const startDate = currentDate.format('YYYY-MM-DD');
        const endDate = currentDate.add(6, 'day').format('YYYY-MM-DD');
        const labelStr = `Tuần ${i}: ${currentDate.format('DD-MM-YYYY')} - ${currentDate.add(6, 'day').format('DD-MM-YYYY')}`; 
        
        weeks.push({
            label: labelStr,
            value: `${year}-W${i}`,
            startDate: startDate,
            endDate: endDate
        });
        
        currentDate = currentDate.add(1, 'week');
        if (currentDate.year() > year && i > 50) break; 
    }
    return weeks;
};

const weekOptions = generateWeeks(2025);
const statusOptions = [
  { label: 'Tất cả', value: 'Tất cả' },
  { label: 'Chờ duyệt', value: 'cho_duyet' },
  { label: 'Đã duyệt', value: 'da_duyet' },
];

const today = dayjs();
const currentWeekObj = weekOptions.find(w => 
    (today.isAfter(dayjs(w.startDate).subtract(1, 'day')) && today.isBefore(dayjs(w.endDate).add(1, 'day')))
);
const defaultWeekValue = currentWeekObj ? currentWeekObj.value : weekOptions[0].value;


const ScheduleDashboard = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedWeek, setSelectedWeek] = useState(defaultWeekValue);
  const [userOptions, setUserOptions] = useState([]); 
  const [selectedHost, setSelectedHost] = useState(undefined); 
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');

  const [filterMySchedule, setFilterMySchedule] = useState(false);
  const [filterMyCreation, setFilterMyCreation] = useState(false);
  const [filterUnit, setFilterUnit] = useState(false);
  const [filterCanceled, setFilterCanceled] = useState(false);

  // 👇 STATE MỚI: QUẢN LÝ POPUP PHỤ LỤC
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  // 👇 LẤY THÔNG TIN USER (Để check quyền Admin cho phần Bổ sung)
  const userDataStr = localStorage.getItem('userData');
  const currentUser = userDataStr ? JSON.parse(userDataStr) : null;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
      const fetchHosts = () => {
          const token = localStorage.getItem('userToken');
          if (!token) return;
          fetch(`${BASE_API_URL}/active-users`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => setUserOptions(data))
          .catch(err => console.error("Lỗi tải danh sách chủ trì:", err));
      };
      fetchHosts();
  }, []);

  const handleClearFilters = () => {
      setSelectedHost(undefined);
      setSelectedStatus('Tất cả');
      setFilterMySchedule(false);
      setFilterMyCreation(false);
      setFilterUnit(false);
      setFilterCanceled(false);
      setSelectedWeek(defaultWeekValue); 
      message.info('Đã xóa bộ lọc, quay về mặc định.');
  };

  const handleShowAllList = () => {
      setFilterMySchedule(false);
      setFilterMyCreation(false);
      setFilterUnit(false);
      setFilterCanceled(false);
      message.success('Đang hiển thị tất cả các lịch.');
  };

  // 👇 HÀM HIỂN THỊ POPUP
  const showDetailModal = (title, content) => {
      setModalContent({ title, content });
      setIsModalVisible(true);
  };

  const fetchSchedules = (weekValue, hostValue, statusValue, filters) => {
    setLoading(true);
    const week = weekOptions.find(w => w.value === weekValue);
    let apiUrl = new URL(`${BASE_API_URL}/schedules`);

    if (week) {
        apiUrl.searchParams.append('startDate', week.startDate);
        apiUrl.searchParams.append('endDate', week.endDate); 
    }
    if (hostValue) apiUrl.searchParams.append('chuTri', hostValue); 
    if (statusValue && statusValue !== 'Tất cả') apiUrl.searchParams.append('trangThai', statusValue);
    if (filters.isMySchedule) apiUrl.searchParams.append('isMySchedule', 'true');
    if (filters.isMyCreation) apiUrl.searchParams.append('isMyCreation', 'true');
    if (filters.isFilterUnit) apiUrl.searchParams.append('isFilterUnit', 'true');
    if (filters.isFilterCanceled) apiUrl.searchParams.append('isFilterCanceled', 'true');

    const token = localStorage.getItem('userToken'); 
    fetch(apiUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        return res.json();
    })
    .then(data => {
        let processedData = data.map(item => ({ ...item, key: item.id }));
        for (let i = 0; i < processedData.length; i++) {
          if (processedData[i].rowSpan === 0) continue;
          let count = 1; 
          for (let j = i + 1; j < processedData.length; j++) {
            if (dayjs(processedData[i].ngay).isSame(processedData[j].ngay, 'day')) {
              processedData[j].rowSpan = 0; 
              count++;
            } else { break; }
          }
          processedData[i].rowSpan = count;
        }
        setSchedules(processedData);
        setLoading(false);
    })
    .catch(error => {
        setLoading(false);
        if (error.message !== 'UNAUTHORIZED') message.error('Lỗi tải dữ liệu: ' + error.message);
    });
  };

  useEffect(() => {
    fetchSchedules(selectedWeek, selectedHost, selectedStatus, {
        isMySchedule: filterMySchedule,
        isMyCreation: filterMyCreation,
        isFilterUnit: filterUnit,
        isFilterCanceled: filterCanceled,
    });
  }, [selectedWeek, selectedHost, selectedStatus, filterMySchedule, filterMyCreation, filterUnit, filterCanceled]); 

  const handleSwitchChange = (setter) => (checked) => setter(checked);
  
 // --- CẤU HÌNH CỘT (ĐÃ SỬA LỖI RÚT GỌN NỘI DUNG) ---
  const columns = [
    { 
        title: 'Thứ Ngày', 
        dataIndex: 'ngay', 
        key: 'thuNgay', 
        width: 120, 
        className: 'column-header-custom',
        onCell: (record) => ({ rowSpan: record.rowSpan }), 
        render: (text) => { 
            const date = dayjs(text); 
            const dayName = date.format('dddd'); 
            const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1); 
            return (
                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    <div style={{color: '#34495e'}}>{capitalizedDayName}</div>
                    <div style={{color: '#2980b9'}}>{date.format('DD/MM/YYYY')}</div>
                </div>
            ); 
        }, 
    },
    { 
        title: 'Thời Gian', 
        key: 'thoiGian', 
        width: 100,
        className: 'column-header-custom',
        render: (record) => <b>{`${record.batDau.slice(0, 5)} - ${record.ketThuc.slice(0, 5)}`}</b> 
    },
    // 👇👇 CẬP NHẬT CỘT NỘI DUNG: RÚT GỌN THÔNG MINH 👇👇
    { 
        title: 'Nội Dung', 
        dataIndex: 'noiDung', 
        key: 'noiDung', 
        className: 'column-header-custom', 
        render: (text, record) => {
            // Kiểm tra kỹ: MySQL trả về 1, React trả về true -> Check cả 2
            const isPhuLuc = record.thuocPhuLuc === 1 || record.thuocPhuLuc === true;
            const isBoSung = record.isBoSung === 1 || record.isBoSung === true;

            // Hàm cắt ngắn text nếu quá dài (cho trường hợp không phải phụ lục)
            const stripText = (html) => {
                const tmp = document.createElement("DIV");
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || "";
            };
            const plainText = stripText(text);
            const isLongText = plainText.length > 150; // Dài hơn 150 ký tự coi là dài

            return (
                <div>
                    {/* Tag Bổ Sung */}
                    {isBoSung && (
                        <Tag color="#ff4d4f" style={{ marginBottom: 5, fontWeight: 'bold' }}>LỊCH BỔ SUNG</Tag>
                    )}

                    {/* Xử lý hiển thị */}
                    {isPhuLuc ? (
                        // TRƯỜNG HỢP 1: LÀ PHỤ LỤC -> Luôn ẩn, hiện nút xem
                        <div>
                            <Tag color="geekblue" style={{ marginBottom: 5 }}>PHỤ LỤC</Tag>
                            <div style={{ fontStyle: 'italic', color: '#888', marginBottom: 5, fontSize: '12px' }}>
                                (Nội dung chi tiết xem tại phụ lục)
                            </div>
                            <Button type="dashed" size="small" icon={<EyeOutlined />} onClick={() => showDetailModal('Nội dung chi tiết', text)}>
                                Xem chi tiết
                            </Button>
                        </div>
                    ) : isLongText ? (
                        // TRƯỜNG HỢP 2: KHÔNG PHẢI PHỤ LỤC NHƯNG DÀI QUÁ -> Cắt bớt
                        <div>
                            <div style={{marginBottom: 5}}>
                                {plainText.slice(0, 150)}...
                            </div>
                            <a onClick={() => showDetailModal('Nội dung chi tiết', text)} style={{fontSize: '12px'}}>
                                Xem thêm
                            </a>
                        </div>
                    ) : (
                        // TRƯỜNG HỢP 3: NGẮN GỌN -> Hiện bình thường
                        <div dangerouslySetInnerHTML={{ __html: text }} />
                    )}
                </div>
            );
        } 
    },
    // 👇👇 CẬP NHẬT CỘT THÀNH PHẦN: RÚT GỌN TƯƠNG TỰ 👇👇
    { 
        title: 'Thành Phần', 
        dataIndex: 'thanhPhan', 
        key: 'thanhPhan', 
        className: 'column-header-custom', 
        width: 250,
        render: (text, record) => {
            const isPhuLuc = record.thuocPhuLuc === 1 || record.thuocPhuLuc === true;
            
            // Lọc text thuần để check độ dài
            const tmp = document.createElement("DIV");
            tmp.innerHTML = text;
            const plainText = tmp.textContent || tmp.innerText || "";
            
            if (isPhuLuc) {
                return (
                    <Button size="small" icon={<EyeOutlined />} onClick={() => showDetailModal('Thành phần tham dự', text)}>
                        Xem danh sách
                    </Button>
                );
            }
            
            // Nếu danh sách quá dài (trên 100 ký tự) cũng rút gọn luôn
            if (plainText.length > 100) {
                 return (
                    <div>
                        {plainText.slice(0, 100)}... <br/>
                        <a onClick={() => showDetailModal('Thành phần tham dự', text)}>Xem hết</a>
                    </div>
                );
            }

            return <div dangerouslySetInnerHTML={{ __html: text }} />;
        }
    },
    { title: 'Địa Điểm', dataIndex: 'diaDiem', key: 'diaDiem', width: 150, className: 'column-header-custom' },
    { 
        title: 'Khoa / Đơn vị', 
        dataIndex: 'donVi', 
        key: 'donVi', 
        width: 140,
        render: (text) => <span style={{ color: '#1890ff', fontWeight: 500 }}>{text}</span>
    },
    { title: 'Chủ Trì', dataIndex: 'chuTriTen', key: 'chuTriTen', width: 150, className: 'column-header-custom', render: (text) => <b>{text}</b> }, 
    { title: 'Tài Khoản Chủ Trì', dataIndex: 'chuTriEmail', key: 'chuTriEmail', width: 150, className: 'column-header-custom', render: (text) => <span style={{color: '#2980b9', fontWeight: 500}}>{text}</span> },
    { 
        title: 'ĐV duyệt', 
        key: 'evDuyet', 
        width: 80, 
        align: 'center',
        className: 'column-header-custom',
        render: (record) => {
            if (record.trangThai === 'da_duyet') {
                return <div style={{ width: 20, height: 20, backgroundColor: '#4CAF50', borderRadius: '50%', margin: 'auto' }}></div>;
            } else if (record.trangThai === 'cho_duyet') {
                return <div style={{ width: 20, height: 20, backgroundColor: '#ff9800', borderRadius: '50%', margin: 'auto' }}></div>; 
            }
            return null;
        }
    },
    { 
        title: 'Hành Động', 
        key: 'hanhDong', 
        width: 120, 
        align: 'center',
        className: 'column-header-custom',
        render: (_, record) => {
            const isOwner = currentUser?.email === record.chuTriEmail;
            const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
            const canDelete = isAdmin || isOwner;

            return (
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center'}}>
                    <Tooltip title="Thêm vào Outlook">
                        <Button 
                            size="small" 
                            style={{ backgroundColor: '#6c5ce7', color: '#fff', borderColor: '#6c5ce7', borderRadius: '4px', fontWeight: 500, width: '100%' }}
                            icon={<CalendarOutlined />}
                        />
                    </Tooltip>

                    {canDelete && (
                        <Popconfirm 
                            title="Xóa lịch này?" 
                            onConfirm={() => handleDeleteSchedule(record.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} style={{width: '100%'}}>Xóa</Button>
                        </Popconfirm>
                    )}
                </div>
            ) 
        }
    },
  ];

  return (
    <div style={{ padding: '0px', backgroundColor: '#fff' }}>
      
      <div style={{ 
          backgroundColor: '#3498db', 
          padding: '10px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20,
          borderRadius: '4px 4px 0 0'
      }}>
        <Space>
          <Link to="/dang-ky">
            <Button type="primary" style={{ backgroundColor: '#4CAF50', borderColor: '#4CAF50', fontWeight: 'bold' }}>
                Đăng ký lịch mới
            </Button>
          </Link>
          
          <Button 
            style={{ backgroundColor: '#ffb142', color: '#fff', borderColor: '#ffb142', fontWeight: 'bold' }}
            onClick={handleClearFilters}
          >
              Xóa bộ lọc
          </Button>
        </Space>
      </div>

      <div style={{ padding: '0 20px' }}>
          <Row gutter={[16, 16]} align="bottom" style={{ marginBottom: 16 }}>
                <Col>
                    <div style={{fontWeight: 500, marginBottom: 5, color: '#34495e'}}>Năm học</div>
                    <Select defaultValue="2025-2026" style={{ width: 140 }} className="custom-select">
                        <Option value="2025-2026">2025 - 2026</Option>
                    </Select>
                </Col>
                <Col>
                    <div style={{fontWeight: 500, marginBottom: 5, color: '#34495e'}}>Tuần học</div>
                    <Select 
                        value={selectedWeek} 
                        style={{ width: 300 }} 
                        onChange={setSelectedWeek}
                        showSearch
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    >
                        {weekOptions.map(week => (
                        <Option key={week.value} value={week.value}>{week.label}</Option>
                        ))}
                    </Select>
                </Col>
                <Col>
                    <div style={{fontWeight: 500, marginBottom: 5, color: '#34495e'}}>Lịch của chủ trì</div>
                    <Select 
                        placeholder="Chọn chủ trì" 
                        style={{ width: 220 }} 
                        allowClear
                        value={selectedHost}
                        onChange={setSelectedHost}
                        options={userOptions}
                        showSearch
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                </Col>
                <Col>
                    <div style={{fontWeight: 500, marginBottom: 5, color: '#34495e'}}>Trạng thái lịch</div>
                    <Select 
                        value={selectedStatus} 
                        style={{ width: 150 }} 
                        onChange={setSelectedStatus}
                        options={statusOptions}
                    />
                </Col>
          </Row>

          <Space style={{ marginBottom: 20 }} wrap align="center">
            <Space>
              <Switch size="small" checked={filterMySchedule} onChange={handleSwitchChange(setFilterMySchedule)} />
              <span style={{color: '#555'}}>Lịch của tôi</span>
            </Space>
            <Space>
              <Switch size="small" checked={filterMyCreation} onChange={handleSwitchChange(setFilterMyCreation)} />
              <span style={{color: '#555'}}>Lịch của tôi tạo</span>
            </Space>
            <Space>
              <Switch size="small" checked={filterUnit} onChange={handleSwitchChange(setFilterUnit)} />
              <span style={{color: '#555'}}>Thuộc đơn vị</span>
            </Space>
            <Space>
              <Switch size="small" checked={filterCanceled} onChange={handleSwitchChange(setFilterCanceled)} />
              <span style={{color: '#555'}}>Đã hủy</span>
            </Space>
            
            <Button 
                icon={<UnorderedListOutlined />}
                size="middle"
                onClick={handleShowAllList}
                style={{ 
                    backgroundColor: '#fff', 
                    color: '#d46b08', 
                    border: '1px solid #d46b08', 
                    fontWeight: '600', 
                    borderRadius: '20px', 
                    marginLeft: 15,
                    marginBottom: 20,
                    fontSize: '13px',
                    boxShadow: '0 2px 0 rgba(0,0,0,0.02)'
                }}
            >
                Hiện tất cả
            </Button>
          </Space>
      </div>

      <Title level={3} style={{ textAlign: 'center', color: '#2c3e50', textTransform: 'uppercase', marginBottom: 20 }}>
        LỊCH CÔNG TÁC TUẦN
      </Title>

      <style>
        {`
            .ant-table-thead > tr > th {
                background-color: #f0f2f5 !important;
                color: #333 !important;
                font-weight: bold !important;
                text-align: center !important;
                border-color: #d9d9d9 !important;
            }
            .ant-table-bordered .ant-table-cell {
                border-color: #d9d9d9 !important;
            }
            .ant-table-container {
                border-color: #d9d9d9 !important;
            }
        `}
      </style>

      <Table
        columns={columns}
        dataSource={schedules}
        loading={loading}
        bordered
        size="middle" 
        pagination={false} 
        style={{ border: '1px solid #d9d9d9' }}
      />

      {/* 👇 MODAL HIỂN THỊ NỘI DUNG PHỤ LỤC 👇 */}
      <Modal
        title={modalContent.title}
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={[
            <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
                Đóng
            </Button>
        ]}
        width={800} 
      >
        <div 
            style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}
            dangerouslySetInnerHTML={{ __html: modalContent.content }} 
        />
      </Modal>
    </div>
  );
};

export default ScheduleDashboard;