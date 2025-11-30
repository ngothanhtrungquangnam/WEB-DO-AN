import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spin, Empty, Typography, Select, Space, message, Card, Tooltip, Badge } from 'antd';
import { ReloadOutlined, CalendarOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);

const { Title, Text } = Typography;
const { Option } = Select;

const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const WeeklyTimetable = () => {
  const currentWeek = dayjs().isoWeek();
  const [selectedWeek, setSelectedWeek] = useState(currentWeek); 
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [filterLocation, setFilterLocation] = useState('all');
  const [displayedRooms, setDisplayedRooms] = useState([]);

  // --- HÀM 0: DANH SÁCH TUẦN ---
  const weekOptions = useMemo(() => {
    const options = [];
    let start = dayjs().startOf('year').startOf('isoWeek');
    for (let i = 1; i <= 52; i++) {
        const end = start.add(6, 'day');
        // Nếu là tuần hiện tại thì thêm chữ (Hiện tại)
        const isCurrent = i === currentWeek ? ' (Hiện tại)' : '';
        const label = `Tuần ${i}${isCurrent} [${start.format('DD/MM')} - ${end.format('DD/MM')}]`;
        options.push({ label, value: i, startRaw: start, endRaw: end });
        start = start.add(1, 'week');
    }
    return options;
  }, [currentWeek]);

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
    setLoading(true);
    const token = localStorage.getItem('userToken');
    const weekObj = weekOptions.find(w => w.value === selectedWeek);
    
    if (!weekObj) { setLoading(false); return; }

    const query = `?startDate=${weekObj.startRaw.format('YYYY-MM-DD')}&endDate=${weekObj.endRaw.format('YYYY-MM-DD')}`;

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

  useEffect(() => { fetchSchedules(); }, [selectedWeek]);

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

  // --- HÀM 4: VẼ Ô DỮ LIỆU (UI ĐẸP HƠN) ---
  const getCellContent = (room, dayIndex, session) => {
    const events = schedules.filter(s => {
        const sDate = dayjs(s.ngay);
        const sTimeStart = s.batDau; 
        const hour = parseInt(sTimeStart.split(':')[0]);
        const isSameRoom = s.diaDiem === room;
        
        const weekObj = weekOptions.find(w => w.value === selectedWeek);
        let isDateMatch = false;
        if(weekObj) {
            const columnDate = weekObj.startRaw.add(dayIndex, 'day');
            isDateMatch = sDate.isSame(columnDate, 'day');
        }
        
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
                            {evt.batDau.slice(0,5)} - {evt.ketThuc ? evt.ketThuc.slice(0,5) : ''}
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
      
      {/* 1. THANH TOOLBAR */}
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
                        value={selectedWeek}
                        style={{ width: 240 }}
                        onChange={(val) => setSelectedWeek(val)}
                        options={weekOptions} 
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

      {/* 2. BẢNG DỮ LIỆU */}
      <Spin spinning={loading}>
        {displayedRooms.length === 0 ? (
            <Empty description="Không có lịch nào được tìm thấy" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{marginTop: 50}} />
        ) : (
            <div className="timetable-container shadow-box">
                <table className="custom-table">
                    <thead>
                        {/* Header Ngày */}
                        <tr>
                            <th rowSpan={2} className="sticky-col sticky-header-top z-high">
                                Phòng / Địa điểm
                            </th>
                            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                                const weekObj = weekOptions.find(w => w.value === selectedWeek);
                                let subDate = weekObj ? weekObj.startRaw.add(dayIndex, 'day') : null;
                                let isToday = subDate && subDate.isSame(dayjs(), 'day');

                                return (
                                    <th key={dayIndex} colSpan={3} className={`sticky-header-top ${isToday ? 'highlight-today' : ''}`}>
                                        <div style={{ textTransform: 'uppercase', fontSize: '13px' }}>
                                            {dayIndex === 6 ? 'Chủ Nhật' : `Thứ ${dayIndex + 2}`}
                                        </div>
                                        {subDate && (
                                            <div style={{ fontSize: '11px', color: isToday ? '#fff' : '#666', fontWeight: 'normal' }}>
                                                {subDate.format('DD/MM/YYYY')}
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Header Buổi */}
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

      {/* 3. CSS "XỊN" (Được nhúng trực tiếp) */}
      <style jsx>{`
        /* Container của bảng */
        .timetable-container {
            overflow: auto;
            max-height: 75vh; /* Giới hạn chiều cao để scroll dọc */
            background: #fff;
            border-radius: 8px;
            border: 1px solid #f0f0f0;
        }
        .shadow-box {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        /* Table Reset */
        .custom-table {
            width: 100%;
            border-collapse: separate; /* Bắt buộc để sticky hoạt động */
            border-spacing: 0;
            font-size: 13px;
            color: #333;
        }

        /* Border cho các ô */
        .custom-table th, .custom-table td {
            border-right: 1px solid #f0f0f0;
            border-bottom: 1px solid #f0f0f0;
            padding: 8px;
            vertical-align: top;
        }

        /* --- STICKY HEADERS (Cố định tiêu đề) --- */
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
            top: 53px; /* Chiều cao của dòng header trên */
            background-color: #fff;
            z-index: 10;
            text-align: center;
            font-size: 11px;
            color: #888;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        /* --- STICKY COLUMN (Cố định cột Phòng) --- */
        .sticky-col {
            position: sticky;
            left: 0;
            background-color: #fff;
            z-index: 11; /* Cao hơn nội dung */
            border-right: 2px solid #f0f0f0;
        }
        .z-high { z-index: 20; } /* Góc trên cùng bên trái */

        .room-name-cell {
            font-weight: 600;
            color: #0050b3;
            background-color: #f9f9f9;
            min-width: 180px;
            max-width: 200px;
            vertical-align: middle !important;
        }

        /* Highlight ngày hiện tại */
        .highlight-today {
            background-color: #1890ff !important;
            color: white !important;
        }

        /* Hiệu ứng hover dòng */
        .table-row-hover:hover td {
            background-color: #fcfcfc;
        }
        .table-row-hover:hover .sticky-col {
            background-color: #e6f7ff; /* Highlight tên phòng khi hover dòng */
        }

        /* --- EVENT CARD (Thẻ lịch đẹp) --- */
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