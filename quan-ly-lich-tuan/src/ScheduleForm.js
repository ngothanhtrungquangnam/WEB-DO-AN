import React, { useRef, useState, useEffect } from 'react';
import {
  Form,
  Button,
  DatePicker,
  TimePicker,
  Select,
  Switch,
  message,
  Input 
} from 'antd';
import { Editor } from '@tinymce/tinymce-react';

const { RangePicker } = TimePicker;

// --- 1. ĐỊNH NGHĨA API URL CHUẨN (NODE.JS) ---
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

// ĐÃ XÓA MOCK_USER_OPTIONS VÀ userOptions
// const MOCK_USER_OPTIONS = [...]; 

const ScheduleForm = () => {
  const [form] = Form.useForm();
  const editorNoiDungRef = useRef(null);
  const editorThanhPhanRef = useRef(null);
  
  const [locationOptions, setLocationOptions] = useState([]);
  // 👇 ĐÃ THAY ĐỔI: Dùng state mới để lưu Host Options THẬT
  const [hostOptions, setHostOptions] = useState([]); 


  // --- 2. LOGIC FETCH CHỦ TRÌ VÀ ĐỊA ĐIỂM (CẬP NHẬT) ---
  useEffect(() => {
    const token = localStorage.getItem('userToken'); 

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    // Hàm lấy danh sách Chủ trì (Host List) từ API mới
    const fetchHostOptions = () => {
        fetch(`${BASE_API_URL}/active-users`, { headers })
        .then(response => {
             if (response.status === 401) throw new Error('UNAUTHORIZED');
             if (!response.ok) throw new Error('Lỗi tải danh sách chủ trì');
             return response.json();
        })
        .then(data => {
            // API trả về format { value: email, label: hostName } đã sẵn sàng cho Select
            setHostOptions(data);
        })
        .catch(error => {
            if (error.message === 'UNAUTHORIZED') {
                 console.warn('Hết phiên đăng nhập khi tải chủ trì');
            } else {
                 message.error('Không thể tải danh sách Chủ trì.');
            }
        });
    };

    // Hàm lấy danh sách Địa điểm (Giữ nguyên)
    const fetchLocationOptions = () => {
        fetch(`${BASE_API_URL}/locations`, { headers })
        .then(response => {
            if (response.status === 401) throw new Error('UNAUTHORIZED');
            if (!response.ok) throw new Error('Lỗi mạng');
            return response.json();
        })
        .then(data => {
            const formattedLocations = data.map(loc => ({
                 label: loc.ten, 
                 value: loc.ten 
            }));
            setLocationOptions(formattedLocations);
        })
        .catch(error => {
            if (error.message !== 'UNAUTHORIZED') {
                message.error('Không thể tải danh sách địa điểm.');
            }
        });
    };

    fetchHostOptions();
    fetchLocationOptions();

  }, []); 


  // --- 3. LOGIC SUBMIT FORM (Giữ nguyên) ---
  const onFinish = (values) => {
    const noiDung = editorNoiDungRef.current ? editorNoiDungRef.current.getContent() : '';
    const thanhPhan = editorThanhPhanRef.current ? editorThanhPhanRef.current.getContent() : '';

    if (!noiDung || noiDung.trim() === '') {
      message.error('Vui lòng nhập Nội dung!');
      return; 
    }

    const fullData = {
      ...values, 
      noiDung,
      thanhPhan,
    };

    const token = localStorage.getItem('userToken');

    fetch(`${BASE_API_URL}/schedules`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(fullData),
    })
    .then(res => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        return res.json();
    })
    .then(result => {
      if (result.error) {
          message.error(result.error);
      } else {
          message.success(result.message || 'Đăng ký thành công!');
          form.resetFields(); 
          if (editorNoiDungRef.current) editorNoiDungRef.current.setContent('');
          if (editorThanhPhanRef.current) editorThanhPhanRef.current.setContent('');
      }
    })
    .catch((err) => {
        if (err.message === 'UNAUTHORIZED') {
            message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        } else {
            message.error('Có lỗi xảy ra khi kết nối server Node.js!');
        }
    });
  };

  // (Hàm xử lý Host giữ nguyên)
  const handleHostChange = (selectedValue) => {
    // 👇 CẬP NHẬT: Dùng hostOptions thay vì userOptions
    const selectedUser = hostOptions.find(u => u.value === selectedValue); 
    if (selectedUser) {
      // Đảm bảo chuTriTen lấy từ label (hostName)
      form.setFieldsValue({ chuTriTen: selectedUser.label }); 
    } else {
      form.setFieldsValue({ chuTriTen: undefined });
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#fff', maxWidth: '800px', margin: 'auto' }}>
      <h2>Tạo Lịch Tuần</h2>
      <Form
        form={form} 
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ thuocPhuLuc: false, guiMail: false }}
      >
        <Form.Item name="ngay" label="Ngày" rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="thoiGian" label="Thời gian (Bắt đầu - Kết thúc)" rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}>
          <RangePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '10px' }}>
            <Form.Item name="thuocPhuLuc" label="Thuộc phụ lục" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
            </Form.Item>

            {/* NÚT MỚI: LỊCH BỔ SUNG */}
            <Form.Item name="isBoSung" label="Lịch bổ sung" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch style={{ backgroundColor: '#ff4d4f' }} /> {/* Màu đỏ để cảnh báo */}
            </Form.Item>
        </div>
        <Form.Item label="Nội dung">
          <Editor apiKey='gcwiz4nqpl1ayyyc6jufm6ubb04zdbvio0dct1vaec17lrql' onInit={(evt, editor) => editorNoiDungRef.current = editor} init={{ height: 250, menubar: false, plugins: 'anchor autolink link lists searchreplace table visualblocks wordcount', toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | table link' }} />
        </Form.Item>
        <Form.Item label="Thành Phần">
          <Editor apiKey='gcwiz4nqpl1ayyyc6jufm6ubb04zdbvio0dct1vaec17lrql' onInit={(evt, editor) => editorThanhPhanRef.current = editor} init={{ height: 250, menubar: false, plugins: 'anchor autolink link lists searchreplace table visualblocks wordcount', toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | table link' }} />
        </Form.Item>
        <Form.Item name="guiMail" label="Gửi mail cho thành phần" valuePropName="checked">
          <Switch />
        </Form.Item>
        
        {/* ĐỊA ĐIỂM (LOCATION) */}
        <Form.Item name="diaDiem" label="Địa điểm" rules={[{ required: true, message: 'Vui lòng chọn địa điểm!' }]}>
          <Select showSearch placeholder="Chọn địa điểm" options={locationOptions} loading={locationOptions.length === 0} />
        </Form.Item>

        {/* CHỦ TRÌ (HOST) */}
        <Form.Item name="chuTriEmail" label="Chủ trì (Chọn tài khoản)" rules={[{ required: true, message: 'Vui lòng chọn tài khoản chủ trì!' }]}>
          <Select 
            showSearch 
            placeholder="Chọn người dùng" 
            options={hostOptions} 
            loading={hostOptions.length === 0} 
            onChange={handleHostChange}
            allowClear
            // 👇 THÊM DÒNG NÀY ĐỂ TÌM KIẾM TỐT HƠN (Tìm theo tên hiển thị)
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        
        <Form.Item name="chuTriTen" label="Tên hiển thị chủ trì" rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị!' }]}>
          <Input placeholder="Sẽ tự động điền khi bạn chọn tài khoản ở trên" disabled />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">Đăng ký</Button>
        </Form.Item>
      </Form>
    </div>
  );
};
export default ScheduleForm;