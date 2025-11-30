import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spin, Empty, Typography, Select, Space, message, Card, Tooltip } from 'antd';
import { ReloadOutlined, CalendarOutlined, EnvironmentOutlined, ClockCircleOutlined, ApartmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import advancedFormat from 'dayjs/plugin/advancedFormat';

// Cấu hình Dayjs
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);

const { Title, Text } = Typography;
const { Option } = Select;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const WeeklyTimetable = () => {
  const [selectedWeekStart, setSelectedWeekStart] = useState(''); 
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State cho các bộ lọc
  const [locations, setLocations] = useState([]); // Giảng đường
  const [departments, setDepartments] = useState([]); // Khoa (MỚI)
  
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all'); // State lọc Khoa (MỚI)

  const [displayedRooms, setDisplayedRooms] = useState([]);

  // --- HÀM HỖ TRỢ: LÀM SẠCH HTML TRONG TOOLTIP (FIX LỖI HIỂN THỊ) ---
  const stripHtml = (html) => {
     if (!html) return "";
     // Cách 1: Dùng DOMParser để giải mã ký tự đặc biệt (VD: &ocirc; -> ô)
     const doc = new DOMParser().parseFromString(html, 'text/html');
     return doc.body.textContent || "";
  };

  // --- HÀM 0: TẠO DANH SÁCH TUẦN ---
  const weekOptions = useMemo(() => {
    const options = [];
    let schoolWeekStart = dayjs('2025-01-07'); 

    for (let i = 1; i <= 52; i++) {
        const schoolWeekEnd = schoolWeekStart.add(6, 'day');
        const isCurrent = dayjs().isAfter(schoolWeekStart.subtract(1, 'minute')) && dayjs().isBefore(schoolWeekEnd.add(1, 'minute'));
        const currentLabel = isCurrent ? ' (Hiện tại)' : '';
        const label = `Tuần ${i}${currentLabel} [${schoolWeekStart.format('DD/MM/YYYY')} - ${schoolWeekEnd.format('DD/MM/YYYY')}]`;
        
        const isoMonday = schoolWeekStart.startOf('isoWeek'); 

        options.push({ 
            label: label, 
            value: isoMonday.format('YYYY-MM-DD'),
            startRaw: isoMonday, 
            endRaw: isoMonday.add(6, 'day') 
        });
        
        schoolWeekStart = schoolWeekStart.add(1, 'week');
    }
    return options;
  }, []);

  useEffect(() => {
      if (weekOptions.length > 0 && !selectedWeekStart) {
          const today = dayjs();
          const currentOption = weekOptions.find(w => 
              today.isSame(w.startRaw, 'day') || (today.isAfter(w.startRaw) && today.isBefore(w.endRaw.add(1, 'day')))
          );
          if (currentOption) setSelectedWeekStart(currentOption.value);
          else setSelectedWeekStart(weekOptions[0].value);
      }
  }, [weekOptions]);

  // --- HÀM 1: LẤY DỮ LIỆU BAN ĐẦU (KHU VỰC + KHOA) ---
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Lấy Khu vực
    fetch(`${BASE_API_URL}/locations`, { headers })
    .then(res => res.json())
    .then(data => { if(Array.isArray(data)) setLocations(data); })
    .catch(err => console.error(err));

    // 2. Lấy Danh sách Khoa (MỚI)
    fetch(`${BASE_API_URL}/departments`, { headers })
    .then(res => res.json())
    .then(data => { if(Array.isArray(data)) setDepartments(data); })
    .catch(err => console.error(err));

  }, []);

  // --- HÀM 2: LẤY LỊCH ---
  const fetchSchedules = () => {
    if (!selectedWeekStart) return;
    setLoading(true);
    const token = localStorage.getItem('userToken');
    const startStr = selectedWeekStart;
    const endStr = dayjs(selectedWeekStart).add(6, 'day').format('YYYY-MM-DD');
    const query = `?startDate=${startStr}&endDate=${endStr}`;

    fetch(`${BASE_API_URL}/schedules${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if(Array.isArray(data)) setSchedules(data);
        else setSchedules([]);
        setLoading(false);
    })
    .catch(() => {
        setLoading(false);
        message.error("Lỗi tải lịch tuần");
    });
  };

  useEffect(() => { fetchSchedules(); }, [selectedWeekStart]);

  // --- HÀM 3: LOGIC LỌC NÂNG CAO (KHOA + GIẢNG ĐƯỜNG) ---
  useEffect(() => {
    if (schedules.length === 0) {
        setDisplayedRooms([]);
        return;
    }

    // Bước 1: Lọc danh sách LỊCH trước (Theo Khoa)
    let filteredSchedules = schedules;
    if (filterDepartment !== 'all') {
        // Chỉ lấy những lịch nào thuộc Khoa đã chọn
        filteredSchedules = schedules.filter(s => s.donVi === filterDepartment);
    }

    // Bước 2: Lấy danh sách PHÒNG từ những lịch đã lọc
    let rooms = [...new Set(filteredSchedules.map(item => item.diaDiem))];

    // Bước 3: Lọc danh sách PHÒNG (Theo tên Giảng đường/Khu vực)
    if (filterLocation !== 'all') {
        rooms = rooms.filter(roomName => roomName.includes(filterLocation));
    }

    setDisplayedRooms(rooms.sort());
  }, [schedules, filterLocation, filterDepartment]); // Chạy lại khi 1 trong 3 thay đổi

  // --- HÀM 4: VẼ Ô DỮ LIỆU ---
  const getCellContent = (room, dayIndex, session) => {
    const events = schedules.filter(s => {
        const sDate = dayjs(s.ngay);
        const sTimeStart = s.batDau; 
        const hour = parseInt(sTimeStart.split(':')[0]);
        const isSameRoom = s.diaDiem === room;
        
        // Kiểm tra Khoa (Nếu đang lọc Khoa thì phải khớp)
        const isDeptMatch = filterDepartment === 'all' || s.donVi === filterDepartment;

        const columnDate = dayjs(selectedWeekStart).add(dayIndex, 'day');
        const isDateMatch = sDate.isSame(columnDate, 'day');
        
        let isSessionMatch = false;
        if (session === 'Sáng' && hour < 12) isSessionMatch = true;
        if (session === 'Chiều' && hour >= 12 && hour < 18) isSessionMatch = true;
        if (session === 'Tối' && hour >= 18) isSessionMatch = true;

        return isSameRoom && isDateMatch && isSessionMatch && isDeptMatch;
    });

    if (events.length === 0) return null;

    return (
        <div className="event-cell-wrapper">
            {events.map((evt, idx) => (
                <Tooltip 
                    key={idx} 
                    title={
                        <div>
                            <div><b>{evt.batDau.slice(0,5)} - {evt.ketThuc ? evt.ketThuc.slice(0,5) : '...'}</b></div>
                            <div>Chủ trì: {evt.chuTriTen}</div>
                            {/* 👇 SỬA LỖI 1: DÙNG HÀM stripHtml ĐỂ HIỂN THỊ ĐẸP */}
                            <div>Nội dung: {stripHtml(evt.noiDung).slice(0, 100)}...</div>
                            <div style={{fontSize: 10, color: '#ddd'}}>Đơn vị: {evt.donVi}</div>
                        </div>
                    }
                    color="#108ee9"
                >
                    <div className="event-card">
                        <div className="event-time">
                            <ClockCircleOutlined style={{ marginRight: 4, fontSize: '10px' }} />
                            {evt.batDau.slice(0,5)} - {evt.ketThuc ? evt.ketThuc.slice(0,5) : '...'}
                        </div>
                        <div className="event-host">
                            {evt.chuTriTen}
                        </div>
                        {/* Hiện thêm tên Khoa viết tắt nếu cần */}
                        {/* <div style={{fontSize: 10, color: '#666'}}>{evt.donVi}</div> */}
                    </div>
                </Tooltip>
            ))}
        </div>
    );
  };

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Space wrap size="middle" style={{width: '100%', justifyContent: 'space-between'}}>
            <Title level={4} style={{ margin: 0, color: '#0050b3', display: 'flex', alignItems: 'center' }}>
                <CalendarOutlined style={{ marginRight: 8 }} /> THỜI KHÓA BIỂU
            </Title>

            <Space wrap>
                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{fontSize: 12}}>Chọn Tuần:</Text>
                    <Select 
                        value={selectedWeekStart}
                        style={{ width: 260 }}
                        onChange={(val) => setSelectedWeekStart(val)}
                        options={weekOptions} 
                        showSearch
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                </Space>

                {/* 👇 BỘ LỌC KHOA (MỚI) */}
                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{fontSize: 12}}>Lọc Khoa / Đơn vị:</Text>
                    <Select 
                        defaultValue="all" 
                        style={{ width: 220 }} 
                        onChange={(value) => setFilterDepartment(value)}
                        suffixIcon={<ApartmentOutlined />}
                        showSearch
                        filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                    >
                        <Option value="all">-- Tất cả Khoa --</Option>
                        {departments.map(dept => (
                            <Option key={dept.id} value={dept.name}>{dept.name}</Option>
                        ))}
                    </Select>
                </Space>

                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{fontSize: 12}}>Lọc Giảng đường:</Text>
                    <Select 
                        defaultValue="all" 
                        style={{ width: 180 }} 
                        onChange={(value) => setFilterLocation(value)}
                        suffixIcon={<EnvironmentOutlined />}
                    >
                        <Option value="all">-- Tất cả --</Option>
                        {locations.map(loc => (
                            <Option key={loc.id} value={loc.ten}>{loc.ten}</Option>
                        ))}
                    </Select>
                </Space>

                <Button type="primary" icon={<ReloadOutlined />} onClick={fetchSchedules} style={{ marginTop: 20 }}>
                    Tải lại
                </Button>
            </Space>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {displayedRooms.length === 0 ? (
            <Empty description="Không có lịch nào được tìm thấy" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{marginTop: 50}} />
        ) : (
            <div className="timetable-container shadow-box">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="sticky-col sticky-header-top z-high">
                                Phòng / Địa điểm
                            </th>
                            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                                const currentDate = dayjs(selectedWeekStart).add(dayIndex, 'day');
                                const isToday = currentDate.isSame(dayjs(), 'day');
                                const dayOfWeek = currentDate.day(); 
                                const dayName = dayOfWeek === 0 ? 'Chủ Nhật' : `Thứ ${dayOfWeek + 1}`;

                                return (
                                    <th key={dayIndex} colSpan={3} className={`sticky-header-top ${isToday ? 'highlight-today' : ''}`}>
                                        <div style={{ textTransform: 'uppercase', fontSize: '13px' }}>
                                            {dayName}
                                        </div>
                                        <div style={{ fontSize: '11px', color: isToday ? '#fff' : '#666', fontWeight: 'normal' }}>
                                            {currentDate.format('DD/MM/YYYY')}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        <tr>
                            {[0, 1, 2, 3, 4, 5, 6].map((_, index) => (
                                <React.Fragment key={index}>
                                    <th className="sub-header sticky-header-sub">Sáng</th>
                                    <th className="sub-header sticky-header-sub">Chiều</th>
                                    <th className="sub-header sticky-header-sub">Tối</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedRooms.map((room, index) => (
                            <tr key={room} className="table-row-hover">
                                <td className="sticky-col room-name-cell">
                                    {room}
                                </td>
                                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                                    <React.Fragment key={dayIndex}>
                                        <td className="cell-data">{getCellContent(room, dayIndex, 'Sáng')}</td>
                                        <td className="cell-data">{getCellContent(room, dayIndex, 'Chiều')}</td>
                                        <td className="cell-data">{getCellContent(room, dayIndex, 'Tối')}</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </Spin>

      <style jsx>{`
        .timetable-container {
            overflow: auto;
            max-height: 75vh; 
            background: #fff;
            border-radius: 8px;
            border: 1px solid #f0f0f0;
        }
        .shadow-box {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .custom-table {
            width: 100%;
            border-collapse: separate; 
            border-spacing: 0;
            font-size: 13px;
            color: #333;
        }
        .custom-table th, .custom-table td {
            border-right: 1px solid #f0f0f0;
            border-bottom: 1px solid #f0f0f0;
            padding: 8px;
            vertical-align: top;
        }
        .sticky-header-top {
            position: sticky;
            top: 0;
            background-color: #fafafa;
            z-index: 10;
            text-align: center;
            border-bottom: 2px solid #d9d9d9;
        }
        .sticky-header-sub {
            position: sticky;
            top: 53px; 
            background-color: #fff;
            z-index: 10;
            text-align: center;
            font-size: 11px;
            color: #888;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .sticky-col {
            position: sticky;
            left: 0;
            background-color: #fff;
            z-index: 11;
            border-right: 2px solid #f0f0f0;
        }
        .z-high { z-index: 20; } 

        .room-name-cell {
            font-weight: 600;
            color: #0050b3;
            background-color: #f9f9f9;
            min-width: 180px;
            max-width: 200px;
            vertical-align: middle !important;
        }
        .highlight-today {
            background-color: #1890ff !important;
            color: white !important;
        }
        .table-row-hover:hover td {
            background-color: #fcfcfc;
        }
        .table-row-hover:hover .sticky-col {
            background-color: #e6f7ff;
        }
        .event-card {
            background-color: #e6f7ff;
            border-left: 3px solid #1890ff;
            padding: 6px 8px;
            border-radius: 4px;
            margin-bottom: 6px;
            transition: all 0.2s;
            cursor: pointer;
        }
        .event-card:hover {
            background-color: #bae7ff;
            transform: translateY(-2px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .event-time {
            font-weight: 700;
            color: #096dd9;
            font-size: 11px;
            margin-bottom: 2px;
            display: flex;
            align-items: center;
        }
        .event-host {
            font-size: 12px;
            color: #262626;
            line-height: 1.3;
        }
      `}</style>
    </div>
  );
};

export default WeeklyTimetable;