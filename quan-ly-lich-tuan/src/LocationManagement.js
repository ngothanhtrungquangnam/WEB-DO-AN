import React, { useState, useEffect } from 'react';
import { Table, message, Button, Typography, Modal, Form, Input, Popconfirm, Space, List } from 'antd';
// 👇 1. Import thêm icon HomeOutlined
import { DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;

// URL cũ của bạn (Giữ nguyên)
const API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api/locations';
// 👇 URL gốc để dùng cho phần Room (Cắt bớt phần /locations)
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const LocationManagement = () => {
  // --- STATE CŨ (GIỮ NGUYÊN) ---
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // --- STATE MỚI (CHO TÍNH NĂNG PHÒNG) ---
  const [isRoomModalVisible, setIsRoomModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null); // Khu vực đang chọn
  const [rooms, setRooms] = useState([]); // Danh sách phòng
  const [newRoomName, setNewRoomName] = useState(''); // Tên phòng mới

  // ========================================================================
  // PHẦN 1: CÁC CHỨC NĂNG CŨ (ĐỊA ĐIỂM) - GIỮ NGUYÊN 100%
  // ========================================================================

  const fetchLocations = () => {
    setLoading(true);
    const token = localStorage.getItem('userToken');

    fetch(API_URL, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }) 
      .then(response => {
        if (response.status === 401) throw new Error('UNAUTHORIZED');
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
            setLocations(data.map(item => ({ ...item, key: item.id })));
        } else {
            setLocations([]);
        }
        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
        if (error.message === 'UNAUTHORIZED') {
            message.error('Phiên đăng nhập hết hạn. Vui lòng F5 hoặc đăng nhập lại.');
        } else {
            console.error('Lỗi khi tải địa điểm:', error);
            message.error('Không thể tải danh sách địa điểm.');
        }
      });
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleCreate = (values) => {
    const token = localStorage.getItem('userToken');

    fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(values), 
    })
    .then(res => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        return res.json();
    })
    .then(result => {
      if (result.error) {
        message.error(result.error);
      } else {
        message.success(result.message);
        setIsModalVisible(false);
        form.resetFields();
        fetchLocations(); 
      }
    })
    .catch((err) => {
        if (err.message === 'UNAUTHORIZED') message.error('Hết phiên đăng nhập.');
        else message.error('Có lỗi xảy ra khi tạo.');
    });
  };

  const handleDelete = (id) => {
    const token = localStorage.getItem('userToken');

    fetch(`${API_URL}/${id}`, { 
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })
    .then(res => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        return res.json();
    })
    .then(result => {
      if (result.error) {
        message.error(result.error);
      } else {
        message.success(result.message);
        fetchLocations(); 
      }
    })
    .catch((err) => {
        if (err.message === 'UNAUTHORIZED') message.error('Hết phiên đăng nhập.');
        else message.error('Có lỗi xảy ra khi xóa.');
    });
  };

  // ========================================================================
  // PHẦN 2: CÁC CHỨC NĂNG MỚI (QUẢN LÝ PHÒNG)
  // ========================================================================

  // 2.1. Mở Modal và tải danh sách phòng
  const openRoomModal = (location) => {
    setCurrentLocation(location);
    setIsRoomModalVisible(true);
    fetchRooms(location.id);
  };

  // 2.2. Gọi API lấy danh sách phòng
  const fetchRooms = (locationId) => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/locations/${locationId}/rooms`, {
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        }
    })
    .then(res => res.json())
    .then(data => setRooms(data))
    .catch(() => message.error('Lỗi tải danh sách phòng'));
  };

  // 2.3. Gọi API thêm phòng
  const handleAddRoom = () => {
    if (!newRoomName.trim()) {
        message.warning('Vui lòng nhập tên/số phòng!');
        return;
    }
    const token = localStorage.getItem('userToken');
    
    fetch(`${BASE_API_URL}/rooms`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newRoomName, location_id: currentLocation.id })
    })
    .then(res => {
        if (res.ok) {
            message.success(`Đã thêm phòng ${newRoomName}`);
            setNewRoomName('');
            fetchRooms(currentLocation.id); // Tải lại danh sách
        } else {
            message.error('Lỗi khi thêm phòng');
        }
    })
    .catch(() => message.error('Lỗi kết nối'));
  };

  // 2.4. Gọi API xóa phòng
  const handleDeleteRoom = (roomId) => {
    const token = localStorage.getItem('userToken');
    fetch(`${BASE_API_URL}/rooms/${roomId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            message.success('Đã xóa phòng');
            fetchRooms(currentLocation.id);
        } else {
            message.error('Không thể xóa phòng này');
        }
    })
    .catch(() => message.error('Lỗi kết nối'));
  };

  // ========================================================================
  // PHẦN 3: GIAO DIỆN
  // ========================================================================

  const columns = [
    {
      title: 'TT',
      key: 'tt',
      render: (text, record, index) => index + 1,
      width: 60,
      align: 'center',
    },
    {
      title: 'Tên Khu Vực',
      dataIndex: 'ten',
      key: 'ten',
      render: (text) => <b>{text}</b>,
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'ngayTao',
      key: 'ngayTao',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
      width: 180,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 220, // Tăng chiều rộng để chứa 2 nút
      align: 'right',
      render: (record) => (
        <Space>
          {/* 👇 NÚT MỚI: QUẢN LÝ PHÒNG */}
          <Button 
            icon={<HomeOutlined />} 
            onClick={() => openRoomModal(record)}
          >
            Q.Lý Phòng
          </Button>

          {/* NÚT CŨ: XÓA ĐỊA ĐIỂM */}
          <Popconfirm
            title="Xóa khu vực này sẽ xóa hết phòng bên trong?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0px' }}>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>
          Danh Sách Địa Điểm
        </Title>
        <Button 
          type="primary" 
          style={{ backgroundColor: '#28a745' }}
          onClick={() => setIsModalVisible(true)}
        >
          Tạo Khu Vực
        </Button>
      </Space>
      
      <Table
        columns={columns}
        dataSource={locations}
        loading={loading}
        bordered
        size="small"
      />

      {/* MODAL CŨ: TẠO ĐỊA ĐIỂM */}
      <Modal
        title="Tạo địa điểm mới"
        open={isModalVisible} 
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="ten"
            label="Tên địa điểm"
            rules={[{ required: true, message: 'Vui lòng nhập tên địa điểm!' }]}
          >
            <Input placeholder="Ví dụ: Khu F" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 👇 MODAL MỚI: QUẢN LÝ PHÒNG */}
      <Modal 
        title={`Danh sách phòng: ${currentLocation?.ten}`} 
        open={isRoomModalVisible} 
        onCancel={() => setIsRoomModalVisible(false)}
        footer={[<Button key="close" onClick={() => setIsRoomModalVisible(false)}>Đóng</Button>]}
      >
        {/* Input thêm phòng */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <Input 
                placeholder="Nhập số phòng (VD: F201)..." 
                value={newRoomName} 
                onChange={e => setNewRoomName(e.target.value)}
                onPressEnter={handleAddRoom}
            />
            <Button type="primary" onClick={handleAddRoom}>Thêm</Button>
        </div>

        {/* Danh sách phòng */}
        <List
            bordered
            dataSource={rooms}
            locale={{ emptyText: 'Chưa có phòng nào' }}
            renderItem={(item) => (
                <List.Item
                    actions={[
                        <Popconfirm 
                            title="Xóa phòng này?" 
                            onConfirm={() => handleDeleteRoom(item.id)}
                            okText="Xóa" 
                            cancelText="Hủy"
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    ]}
                >
                    <Typography.Text>{item.name}</Typography.Text>
                </List.Item>
            )}
            style={{ maxHeight: '300px', overflowY: 'auto' }}
        />
      </Modal>
    </div>
  );
};

export default LocationManagement;