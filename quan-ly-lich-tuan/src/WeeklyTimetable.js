import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spin, Empty, Typography, Select, Space, message, Card, Tooltip } from 'antd';
import { ReloadOutlined, CalendarOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
  const [locations, setLocations] = useState([]);
  const [filterLocation, setFilterLocation] = useState('all');
  const [displayedRooms, setDisplayedRooms] = useState([]);

  // --- HÀM 0: TẠO DANH SÁCH TUẦN (LOGIC SỬA LỖI LỆCH THỨ) ---
  const weekOptions = useMemo(() => {
    const options = [];
    
    // Mốc thời gian của trường: Tuần 1 bắt đầu từ Thứ 3 (07/01/2025)
    let schoolWeekStart = dayjs('2025-01-07'); 

    // Tạo 52 tuần
    for (let i = 1; i <= 52; i++) {
        // Tính ngày kết thúc của tuần học (Thứ 3 -> Thứ 2 tuần sau)
        const schoolWeekEnd = schoolWeekStart.add(6, 'day');
        
        // Kiểm tra tuần hiện tại
        const isCurrent = dayjs().isAfter(schoolWeekStart.subtract(1, 'minute')) && dayjs().isBefore(schoolWeekEnd.add(1, 'minute'));
        const currentLabel = isCurrent ? ' (Hiện tại)' : '';

        // 1. LABEL (Hiển thị cho người dùng): Giữ nguyên theo lịch trường (07/01...)
        const label = `Tuần ${i}${currentLabel} [${schoolWeekStart.format('DD/MM/YYYY')} - ${schoolWeekEnd.format('DD/MM/YYYY')}]`;
        
        // 2. VALUE (Giá trị để vẽ bảng): 👇 QUAN TRỌNG: Quy đổi về THỨ 2 (ISO Monday)
        // Để khi vẽ cột T2, T3... nó khớp với lịch chuẩn.
        const isoMonday = schoolWeekStart.startOf('isoWeek'); 

        options.push({ 
            label: label, 
            value: isoMonday.format('YYYY-MM-DD'), // Lưu giá trị là Thứ 2
            startRaw: isoMonday, 
            endRaw: isoMonday.add(6, 'day') 
        });
        
        // Nhảy sang tuần tiếp theo
        schoolWeekStart = schoolWeekStart.add(1, 'week');
    }
    return options;
  }, []);

  // --- TỰ ĐỘNG CHỌN TUẦN HIỆN TẠI ---
  useEffect(() => {
      if (weekOptions.length > 0 && !selectedWeekStart) {
          const today = dayjs();
          // Tìm tuần chứa ngày hôm nay (dựa trên khoảng thời gian ISO Mon-Sun)
          const currentOption = weekOptions.find(w => 
              today.isSame(w.startRaw, 'day') || (today.isAfter(w.startRaw) && today.isBefore(w.endRaw.add(1, 'day')))
          );
          
          if (currentOption) {
              setSelectedWeekStart(currentOption.value);
          } else {
              setSelectedWeekStart(weekOptions[0].value);
          }
      }
  }, [weekOptions]);

  // --- HÀM 1: LẤY KHU VỰC ---
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if(Array.isArray(data)) setLocations(data);
    })
    .catch(err => console.error(err));
  }, []);

  // --- HÀM 2: LẤY LỊCH ---
  const fetchSchedules = () => {
    if (!selectedWeekStart) return;

    setLoading(true);
    const token = localStorage.getItem('userToken');
    
    // Query từ Thứ 2 đến Chủ Nhật (Chuẩn ISO)
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

  // --- HÀM 3: LỌC PHÒNG ---
  useEffect(() => {
    if (schedules.length === 0) {
        setDisplayedRooms([]);
        return;
    }
    let rooms = [...new Set(schedules.map(item => item.diaDiem))];
    if (filterLocation !== 'all') {
        rooms = rooms.filter(roomName => roomName.includes(filterLocation));
    }
    setDisplayedRooms(rooms.sort());
  }, [schedules, filterLocation]);

  // --- HÀM 4: VẼ Ô DỮ LIỆU ---
  const getCellContent = (room, dayIndex, session) => {
    const events = schedules.filter(s => {
        const sDate = dayjs(s.ngay);
        const sTimeStart = s.batDau; 
        const hour = parseInt(sTimeStart.split(':')[0]);
        const isSameRoom = s.diaDiem === room;
        
        // Vì selectedWeekStart đã được chuẩn hóa về Thứ 2
        // Nên selectedWeekStart + 6 ngày chính xác là Chủ Nhật
        const columnDate = dayjs(selectedWeekStart).add(dayIndex, 'day');
        const isDateMatch = sDate.isSame(columnDate, 'day');
        
        let isSessionMatch = false;
        if (session === 'Sáng' && hour < 12) isSessionMatch = true;
        if (session === 'Chiều' && hour >= 12 && hour < 18) isSessionMatch = true;
        if (session === 'Tối' && hour >= 18) isSessionMatch = true;

        return isSameRoom && isDateMatch && isSessionMatch;
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
                            <div>Nội dung: {evt.noiDung.replace(/<[^>]+>/g, '').slice(0, 50)}...</div>
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
                    </div>
                </Tooltip>
            ))}
        </div>
    );
  };

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Space wrap size="large" style={{width: '100%', justifyContent: 'space-between'}}>
            <Space>
                <Title level={4} style={{ margin: 0, color: '#0050b3', display: 'flex', alignItems: 'center' }}>
                    <CalendarOutlined style={{ marginRight: 8 }} /> THỜI KHÓA BIỂU
                </Title>
            </Space>

            <Space wrap>
                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{fontSize: 12}}>Chọn Tuần:</Text>
                    <Select 
                        value={selectedWeekStart}
                        style={{ width: 280 }}
                        onChange={(val) => setSelectedWeekStart(val)}
                        options={weekOptions} 
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Space>

                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{fontSize: 12}}>Lọc Giảng đường:</Text>
                    <Select 
                        defaultValue="all" 
                        style={{ width: 200 }} 
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
                            {/* 👇 VÒNG LẶP HEADER NGÀY (Chuẩn ISO Mon-Sun) */}
                            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                                // selectedWeekStart bây giờ ĐÃ LÀ THỨ 2 (Do logic fix bên trên)
                                const currentDate = dayjs(selectedWeekStart).add(dayIndex, 'day');
                                const isToday = currentDate.isSame(dayjs(), 'day');
                                
                                // Lấy tên Thứ
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