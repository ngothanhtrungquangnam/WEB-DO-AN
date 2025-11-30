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

  // 1. Hàm lấy dữ liệu
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

  // 3. Cấu hình bảng (ĐÃ CẬP NHẬT THÊM CỘT)
  const columns = [
    { 
        title: 'Ngày đăng ký', 
        dataIndex: 'ngay', 
        key: 'ngay',
        width: 110,
        render: (text) => dayjs(text).format('DD/MM/YYYY')
    },
    { 
        title: 'Thời gian', 
        key: 'thoiGian',
        width: 120,
        render: (record) => 
            <span style={{color: '#1890ff', fontWeight: 'bold'}}>
                {record.batDau.slice(0,5)} - {record.ketThuc.slice(0,5)}
            </span>
    },
    { 
        title: 'Nội dung', 
        dataIndex: 'noiDung', 
        key: 'noiDung',
        width: 250,
        render: (html) => <div dangerouslySetInnerHTML={{ __html: html }} />
    },
    // 👇 CỘT MỚI: THÀNH PHẦN
    { 
        title: 'Thành phần', 
        dataIndex: 'thanhPhan', 
        key: 'thanhPhan',
        width: 200,
        render: (html) => <div dangerouslySetInnerHTML={{ __html: html }} />
    },
    { 
        title: 'Địa điểm', 
        dataIndex: 'diaDiem', 
        key: 'diaDiem',
        width: 150,
    },
    // 👇 CỘT MỚI: KHOA / ĐƠN VỊ
    { 
        title: 'Khoa / Đơn vị', 
        dataIndex: 'donVi', 
        key: 'donVi',
        width: 150,
        render: (text) => <span style={{ color: '#1890ff', fontWeight: 500 }}>{text}</span>
    },
    // 👇 CỘT MỚI: CHỦ TRÌ
    { 
        title: 'Chủ trì', 
        dataIndex: 'chuTriTen', 
        key: 'chuTriTen',
        width: 150,
        render: (text) => <b>{text}</b>
    },
    // 👇 CỘT MỚI: TÀI KHOẢN CHỦ TRÌ
    { 
        title: 'Tài khoản chủ trì', 
        dataIndex: 'chuTriEmail', 
        key: 'chuTriEmail',
        width: 180,
        render: (text) => <span style={{ color: '#888' }}>{text}</span>
    },
    { 
        title: 'Trạng thái', 
        key: 'trangThai',
        align: 'center',
        width: 120,
        render: () => <Tag icon={<ClockCircleOutlined />} color="warning">Chờ duyệt</Tag>
    },
    { 
        title: 'Hành động', 
        key: 'action',
        align: 'center',
        width: 140,
        fixed: 'right', // Cố định cột này bên phải
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
            // 👇 Thêm thanh cuộn ngang để bảng không bị vỡ khi nhiều cột
            scroll={{ x: 1500 }} 
            bordered
        />
      </Card>
    </div>
  );
};

export default MyPendingSchedules;