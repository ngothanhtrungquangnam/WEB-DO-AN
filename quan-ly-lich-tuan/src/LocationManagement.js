import React, { useState, useEffect } from 'react';
import { Table, message, Button, Typography, Modal, Form, Input, Popconfirm, Space } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

const API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api/locations'; 

const LocationManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // --- 1. SỬA HÀM GỌI API (THÊM TOKEN) ---
  const fetchLocations = () => {
    setLoading(true);
    
    // Lấy Token
    const token = localStorage.getItem('userToken');

    fetch(API_URL, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // <--- QUAN TRỌNG: Gửi kèm Token
        }
    }) 
      .then(response => {
        // Kiểm tra lỗi 401 trước khi xử lý dữ liệu
        if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
        }
        return response.json();
      })
      .then(data => {
        // Chỉ map khi data thực sự là Array
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

  // 2. Gọi API khi tải
  useEffect(() => {
    fetchLocations();
  }, []);

  // --- 3. SỬA HÀM TẠO (THÊM TOKEN) ---
  const handleCreate = (values) => {
    const token = localStorage.getItem('userToken');

    fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <--- Thêm Token
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

  // --- 4. SỬA HÀM XÓA (THÊM TOKEN) ---
  const handleDelete = (id) => {
    const token = localStorage.getItem('userToken');

    fetch(`${API_URL}/${id}`, { 
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <--- Thêm Token
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

  // 5. Định nghĩa các cột
  const columns = [
    {
      title: 'TT',
      key: 'tt',
      render: (text, record, index) => index + 1,
      width: 80,
    },
    {
      title: 'Tên',
      dataIndex: 'ten',
      key: 'ten',
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'ngayTao',
      key: 'ngayTao',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
      width: 200,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      render: (record) => (
        <Popconfirm
          title="Bạn có chắc muốn xóa địa điểm này?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button danger size="small">Xóa</Button>
        </Popconfirm>
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
          Tạo
        </Button>
      </Space>
      
      <Table
        columns={columns}
        dataSource={locations}
        loading={loading}
        bordered
        size="small"
      />

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
            <Input placeholder="Ví dụ: Hội trường F" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LocationManagement;