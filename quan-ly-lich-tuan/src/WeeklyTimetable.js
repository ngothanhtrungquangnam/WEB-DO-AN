import React, { useState, useEffect } from 'react';
import { DatePicker, Button, Spin, Empty, Typography, Select, Space, message } from 'antd'; // Thêm Select, Space
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);

const { Title } = Typography;
const { Option } = Select;

// 👇 LINK API BACKEND
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const WeeklyTimetable = () => {
  // 1. State cho Tuần
  const [selectedDate, setSelectedDate] = useState(dayjs());
  
  // 2. State cho Dữ liệu Lịch
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 3. State cho Bộ lọc Khu vực (MỚI)
  const [locations, setLocations] = useState([]); // Danh sách các khu để chọn
  const [filterLocation, setFilterLocation] = useState('all'); // Giá trị đang chọn (Mặc định: Tất cả)

  // 4. State danh sách phòng hiển thị (Sau khi lọc)
  const [displayedRooms, setDisplayedRooms] = useState([]);

  const startOfWeek = selectedDate.startOf('isoWeek');
  const endOfWeek = selectedDate.endOf('isoWeek');

  // --- HÀM 1: LẤY DANH SÁCH KHU VỰC (ĐỂ NẠP VÀO Ô CHỌN) ---
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if(Array.isArray(data)) setLocations(data);
    })
    .catch(err => console.error("Lỗi tải khu vực:", err));
  }, []);

  // --- HÀM 2: LẤY DỮ LIỆU LỊCH ---
  const fetchSchedules = () => {
    setLoading(true);
    const token = localStorage.getItem('userToken');
    const query = `?startDate=${startOfWeek.format('YYYY-MM-DD')}&endDate=${endOfWeek.format('YYYY-MM-DD')}`;

    fetch(`${BASE_API_URL}/schedules${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if(Array.isArray(data)) {
            setSchedules(data); // Lưu dữ liệu gốc
        } else {
            setSchedules([]);
        }
        setLoading(false);
    })
    .catch(() => {
        setLoading(false);
        message.error("Lỗi tải lịch tuần");
    });
  };

  // Gọi API mỗi khi đổi Tuần
  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  // --- HÀM 3: XỬ LÝ LỌC PHÒNG (LOGIC QUAN TRỌNG) ---
  useEffect(() => {
    if (schedules.length === 0) {
        setDisplayedRooms([]);
        return;
    }

    // Bước 1: Lấy tất cả các phòng có trong lịch
    let rooms = [...new Set(schedules.map(item => item.diaDiem))];

    // Bước 2: Lọc theo Khu vực nếu người dùng chọn
    if (filterLocation !== 'all') {
        // Lọc những phòng có tên chứa từ khóa (Ví dụ: "Khu A - Phòng 101" chứa "Khu A")
        rooms = rooms.filter(roomName => roomName.includes(filterLocation));
    }

    // Bước 3: Sắp xếp A-Z và cập nhật hiển thị
    setDisplayedRooms(rooms.sort());

  }, [schedules, filterLocation]); // Chạy lại khi dữ liệu lịch đổi HOẶC bộ lọc đổi


  // --- HÀM 4: VẼ Ô DỮ LIỆU ---
  const getCellContent = (room, dateMoment, session) => {
    const events = schedules.filter(s => {
        const sDate = dayjs(s.ngay);
        const sTime = s.batDau; 
        const hour = parseInt(sTime.split(':')[0]);

        const isSameRoom = s.diaDiem === room;
        const isSameDay = sDate.isSame(dateMoment, 'day');
        
        let isSessionMatch = false;
        if (session === 'Sáng' && hour < 12) isSessionMatch = true;
        if (session === 'Chiều' && hour >= 12 && hour < 18) isSessionMatch = true;
        if (session === 'Tối' && hour >= 18) isSessionMatch = true;

        // Chỉ hiện lịch đã duyệt (nếu muốn)
        // return isSameRoom && isSameDay && isSessionMatch && s.trangThai === 'da_duyet';
        return isSameRoom && isSameDay && isSessionMatch;
    });

    if (events.length === 0) return null;

    return (
        <div style={{ fontSize: '12px' }}>
            {events.map((evt, idx) => (
                <div key={idx} style={{ 
                    marginBottom: '4px', 
                    padding: '4px', 
                    backgroundColor: '#e6f7ff', 
                    border: '1px solid #91d5ff',
                    borderRadius: '4px'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#096dd9' }}>{evt.batDau.slice(0,5)}</div>
                    <div>{evt.chuTriTen}</div>
                </div>
            ))}
        </div>
    );
  };

  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    daysOfWeek.push(startOfWeek.add(i, 'day'));
  }

  return (
    <div style={{ padding: '20px', background: '#fff' }}>
      
      {/* --- PHẦN BỘ LỌC (GIỐNG HÌNH BẠN GỬI) --- */}
      <div style={{ marginBottom: 20, padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <Space wrap>
            <Title level={4} style={{ margin: 0, marginRight: 10, color: '#1890ff' }}>
                THỜI KHÓA BIỂU
            </Title>

            {/* 1. Chọn Tuần */}
            <span>Tuần:</span>
            <DatePicker 
                picker="week" 
                value={selectedDate} 
                onChange={(date) => setSelectedDate(date || dayjs())}
                format="[Tuần] w-YYYY"
                style={{ width: 150 }}
                allowClear={false}
            />

            {/* 2. Chọn Giảng Đường (MỚI) */}
            <span style={{ marginLeft: 10 }}>Giảng đường:</span>
            <Select 
                defaultValue="all" 
                style={{ width: 200 }} 
                onChange={(value) => setFilterLocation(value)}
            >
                <Option value="all">-- Tất cả --</Option>
                {locations.map(loc => (
                    <Option key={loc.id} value={loc.ten}>{loc.ten}</Option>
                ))}
            </Select>

            {/* 3. Nút Dữ liệu (Tải lại) */}
            <Button type="primary" onClick={fetchSchedules} style={{ marginLeft: 10 }}>
                Dữ liệu
            </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {displayedRooms.length === 0 ? (
            <Empty description="Không tìm thấy lịch phù hợp" />
        ) : (
            <div className="timetable-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ minWidth: '150px', backgroundColor: '#e6f7ff' }}>Phòng / Địa điểm</th>
                            {daysOfWeek.map((day, index) => (
                                <th key={index} colSpan={3} style={{ textAlign: 'center', backgroundColor: '#fafafa' }}>
                                    {index === 6 ? 'CN' : `Thứ ${index + 2}`} <br/>
                                    <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }}>
                                        ({day.format('DD/MM')})
                                    </span>
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {daysOfWeek.map((_, index) => (
                                <React.Fragment key={index}>
                                    <th className="sub-header">Sáng</th>
                                    <th className="sub-header">Chiều</th>
                                    <th className="sub-header">Tối</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedRooms.map((room) => (
                            <tr key={room}>
                                <td style={{ fontWeight: 'bold', backgroundColor: '#fffbe6', color: '#d46b08' }}>{room}</td>
                                {daysOfWeek.map((day, dayIdx) => (
                                    <React.Fragment key={dayIdx}>
                                        <td className="cell-data">{getCellContent(room, day, 'Sáng')}</td>
                                        <td className="cell-data">{getCellContent(room, day, 'Chiều')}</td>
                                        <td className="cell-data">{getCellContent(room, day, 'Tối')}</td>
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
        .custom-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d9d9d9;
            font-size: 13px;
        }
        .custom-table th, .custom-table td {
            border: 1px solid #d9d9d9;
            padding: 5px;
            vertical-align: top;
        }
        .custom-table th {
            font-weight: bold;
            white-space: nowrap;
        }
        .sub-header {
            font-size: 11px;
            text-align: center;
            min-width: 50px;
            background-color: #fff !important;
            color: #666;
        }
        .cell-data {
            height: 50px;
            min-width: 50px;
        }
      `}</style>
    </div>
  );
};

export default WeeklyTimetable;