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

const ScheduleForm = () => {
  const [form] = Form.useForm();
  const editorNoiDungRef = useRef(null);
  const editorThanhPhanRef = useRef(null);
  
  const [locationOptions, setLocationOptions] = useState([]);
  const [hostOptions, setHostOptions] = useState([]); 
  
  // 👇 1. STATE MỚI CHO KHOA/PHÒNG BAN
  const [departmentOptions, setDepartmentOptions] = useState([]); 

  // --- 2. LOGIC FETCH DỮ LIỆU TỪ API ---
  useEffect(() => {
    const token = localStorage.getItem('userToken'); 

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    // Hàm lấy danh sách Chủ trì
    const fetchHostOptions = () => {
        fetch(`${BASE_API_URL}/active-users`, { headers })
        .then(res => res.json())
        .then(data => setHostOptions(data))
        .catch(() => message.error('Lỗi tải danh sách chủ trì.'));
    };

    // Hàm lấy danh sách Địa điểm
    const fetchLocationOptions = () => {
        fetch(`${BASE_API_URL}/locations`, { headers })
        .then(res => res.json())
        .then(data => {
            const formatted = data.map(loc => ({ label: loc.ten, value: loc.ten }));
            setLocationOptions(formatted);
        })
        .catch(() => console.error('Lỗi tải địa điểm'));
    };

    // 👇 3. HÀM MỚI: LẤY DANH SÁCH KHOA TỪ API
    const fetchDepartmentOptions = () => {
        fetch(`${BASE_API_URL}/departments`, { headers })
        .then(res => res.json())
        .then(data => {
            // Chuyển đổi dữ liệu API thành dạng { label, value } cho Select
            const formatted = data.map(dept => ({ label: dept.name, value: dept.name }));
            setDepartmentOptions(formatted);
        })
        .catch(() => console.error('Lỗi tải danh sách Khoa'));
    };

    fetchHostOptions();
    fetchLocationOptions();
    fetchDepartmentOptions(); // <-- Gọi hàm này

  }, []); 


// --- 3. LOGIC SUBMIT FORM ---
  const onFinish = (values) => {
    const noiDung = editorNoiDungRef.current ? editorNoiDungRef.current.getContent() : '';
    const thanhPhan = editorThanhPhanRef.current ? editorThanhPhanRef.current.getContent() : '';

    if (!noiDung || noiDung.trim() === '') {
      message.error('Vui lòng nhập Nội dung!');
      return; 
    }

    // 👇 [QUAN TRỌNG] XỬ LÝ NGÀY THÁNG ĐỂ TRÁNH LỖI LÙI NGÀY
    // Chuyển đổi đối tượng Dayjs thành chuỗi "YYYY-MM-DD" cứng
    // Lúc này server sẽ nhận chuỗi "2025-11-14" chứ không phải giờ UTC nữa
    const formattedDate = values.ngay ? values.ngay.format('YYYY-MM-DD') : null;

    // Xử lý thời gian (nếu cần thiết để tránh lỗi múi giờ cho giờ giấc)
    // Antd TimePicker trả về mảng Dayjs, ta nên format luôn
    let formattedThoiGian = values.thoiGian;
    if (values.thoiGian && values.thoiGian.length === 2) {
        // Backend của bạn đang xử lý mảng này, nên ta cứ gửi mảng string ISO hoặc giữ nguyên cũng được
        // Nhưng tốt nhất cứ giữ nguyên thoiGian vì Backend bạn có đoạn dayjs(thoiGian[0])
        // Tuy nhiên, quan trọng nhất là cái 'ngay' ở trên.
    }

    const fullData = {
      ...values, 
      ngay: formattedDate, // 👈 GHI ĐÈ GIÁ TRỊ NGÀY ĐÃ FORMAT
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
  const handleHostChange = (selectedValue) => {
    const selectedUser = hostOptions.find(u => u.value === selectedValue); 
    if (selectedUser) {
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

            <Form.Item name="isBoSung" label="Lịch bổ sung" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch style={{ backgroundColor: '#ff4d4f' }} />
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
        
        <Form.Item name="diaDiem" label="Địa điểm" rules={[{ required: true, message: 'Vui lòng chọn địa điểm!' }]}>
          <Select showSearch placeholder="Chọn địa điểm" options={locationOptions} loading={locationOptions.length === 0} />
        </Form.Item>

        {/* 👇 4. THÊM Ô CHỌN KHOA/PHÒNG BAN VÀO ĐÂY */}
        {/* Giả sử bạn muốn lưu tên khoa vào một biến nào đó, ví dụ 'donViToChuc' hoặc 'khoaPhong' */}
        {/* Nếu Database bảng schedules chưa có cột này, bạn cần thêm cột vào DB trước (như bước 1 tôi hướng dẫn) */}
        <Form.Item 
            name="donVi" // Tên field này tùy bạn đặt, nhớ phải khớp với cột trong DB nếu có
            label="Khoa / Phòng ban" 
            // rules={[{ required: true, message: 'Vui lòng chọn đơn vị!' }]} // Bỏ comment nếu muốn bắt buộc
        >
          <Select 
            showSearch 
            placeholder="Chọn Khoa / Phòng ban" 
            options={departmentOptions} 
            loading={departmentOptions.length === 0}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        <Form.Item name="chuTriEmail" label="Chủ trì (Chọn tài khoản)" rules={[{ required: true, message: 'Vui lòng chọn tài khoản chủ trì!' }]}>
          <Select 
            showSearch 
            placeholder="Chọn người dùng" 
            options={hostOptions} 
            loading={hostOptions.length === 0} 
            onChange={handleHostChange}
            allowClear
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