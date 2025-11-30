import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, message, Popconfirm, Tag, Card } from 'antd';
import { DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;

// Link Backend của bạn
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const MyPendingSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Hàm lấy dữ liệu (Chỉ lấy lịch của mình + đang chờ duyệt)
  const fetchMyPendingSchedules = () => {
    setLoading(true);
    const token = localStorage.getItem('userToken');
    
    // Gọi API: isMyCreation=true (Của tôi) & trangThai=cho_duyet
    const query = `?isMyCreation=true&trangThai=cho_duyet`;

    fetch(`${BASE_API_URL}/schedules${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (Array.isArray(data)) {
            // Sắp xếp lịch mới nhất lên đầu
            const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setSchedules(sorted);
        } else {
            setSchedules([]);
        }
        setLoading(false);
    })
    .catch(() => {
        setLoading(false);
        message.error("Lỗi tải dữ liệu");
    });
  };

  useEffect(() => {
    fetchMyPendingSchedules();
  }, []);

  // 2. Hàm Xóa (Hủy đăng ký)
  const handleDelete = (id) => {
      const token = localStorage.getItem('userToken');
      fetch(`${BASE_API_URL}/schedules/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
          if (res.ok) {
              message.success('Đã hủy đăng ký lịch thành công!');
              fetchMyPendingSchedules(); // Tải lại bảng
          } else {
              message.error('Không thể xóa lịch này.');
          }
      })
      .catch(() => message.error('Lỗi kết nối server'));
  };

  // 3. Cấu hình bảng
  const columns = [
    { 
        title: 'Ngày đăng ký', 
        dataIndex: 'ngay', 
        key: 'ngay',
        render: (text) => dayjs(text).format('DD/MM/YYYY')
    },
    { 
        title: 'Thời gian', 
        key: 'thoiGian',
        render: (record) => 
            <span style={{color: '#1890ff', fontWeight: 'bold'}}>
                {record.batDau.slice(0,5)} - {record.ketThuc.slice(0,5)}
            </span>
    },
    { 
        title: 'Nội dung', 
        dataIndex: 'noiDung', 
        key: 'noiDung',
        width: '40%',
        render: (html) => <div dangerouslySetInnerHTML={{ __html: html }} />
    },
    { 
        title: 'Địa điểm', 
        dataIndex: 'diaDiem', 
        key: 'diaDiem' 
    },
    { 
        title: 'Trạng thái', 
        key: 'trangThai',
        align: 'center',
        render: () => <Tag icon={<ClockCircleOutlined />} color="warning">Chờ duyệt</Tag>
    },
    { 
        title: 'Hành động', 
        key: 'action',
        align: 'center',
        render: (record) => (
            <Popconfirm 
                title="Bạn muốn hủy đăng ký lịch này?" 
                onConfirm={() => handleDelete(record.id)}
                okText="Hủy lịch" 
                cancelText="Không"
            >
                <Button type="primary" danger icon={<DeleteOutlined />}>
                    Hủy đăng ký
                </Button>
            </Popconfirm>
        )
    }
  ];

  return (
    <div style={{ padding: 20 }}>
      <Card title="Lịch Đã Gửi (Đang chờ duyệt)">
        <Table 
            columns={columns} 
            dataSource={schedules} 
            rowKey="id" 
            loading={loading}
            locale={{ emptyText: 'Bạn không có lịch nào đang chờ duyệt.' }}
        />
      </Card>
    </div>
  );
};

export default MyPendingSchedules;