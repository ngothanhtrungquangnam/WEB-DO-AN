import React, { useRef, useState, useEffect } from 'react';
import {
  Form,
  Button,
  DatePicker,
  TimePicker,
  Select,
  Switch,
  message,
  Input,
  Row, Col // 👈 Import thêm để chia cột
} from 'antd';
import { Editor } from '@tinymce/tinymce-react';

const { RangePicker } = TimePicker;

// --- ĐỊNH NGHĨA API URL ---
const BASE_API_URL = 'https://lich-tuan-api-bcg9d2aqfgbwbbcv.eastasia-01.azurewebsites.net/api';

const ScheduleForm = () => {
  const [form] = Form.useForm();
  const editorNoiDungRef = useRef(null);
  const editorThanhPhanRef = useRef(null);
  
  // State cũ
  const [locationOptions, setLocationOptions] = useState([]);
  const [hostOptions, setHostOptions] = useState([]); 
  const [departmentOptions, setDepartmentOptions] = useState([]); 

  // 👇 STATE MỚI CHO TÍNH NĂNG CHỌN PHÒNG
  const [roomOptions, setRoomOptions] = useState([]); 
  const [isRoomDisabled, setIsRoomDisabled] = useState(true); // Mặc định khóa ô chọn phòng
  const [selectedLocationName, setSelectedLocationName] = useState(''); // Lưu tên Khu để gửi về server

  // --- LOGIC FETCH DỮ LIỆU TỪ API ---
  useEffect(() => {
    const token = localStorage.getItem('userToken'); 

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    // 1. Lấy danh sách Chủ trì
    const fetchHostOptions = () => {
        fetch(`${BASE_API_URL}/active-users`, { headers })
        .then(res => res.json())
        .then(data => setHostOptions(data))
        .catch(() => message.error('Lỗi tải danh sách chủ trì.'));
    };

    // 2. Lấy danh sách Địa điểm (Khu vực)
    const fetchLocationOptions = () => {
        fetch(`${BASE_API_URL}/locations`, { headers })
        .then(res => res.json())
        .then(data => {
            // 👇 QUAN TRỌNG: Value phải là ID để lát gọi API lấy phòng
            const formatted = data.map(loc => ({ label: loc.ten, value: loc.id }));
            setLocationOptions(formatted);
        })
        .catch(() => console.error('Lỗi tải địa điểm'));
    };

    // 3. Lấy danh sách Khoa
    const fetchDepartmentOptions = () => {
        fetch(`${BASE_API_URL}/departments`, { headers })
        .then(res => res.json())
        .then(data => {
            const formatted = data.map(dept => ({ label: dept.name, value: dept.name }));
            setDepartmentOptions(formatted);
        })
        .catch(() => console.error('Lỗi tải danh sách Khoa'));
    };

    fetchHostOptions();
    fetchLocationOptions();
    fetchDepartmentOptions();

  }, []); 

  // 👇 HÀM MỚI: XỬ LÝ KHI NGƯỜI DÙNG CHỌN KHU VỰC
  const handleLocationChange = (locationId, option) => {
    // 1. Reset ô chọn phòng
    form.setFieldsValue({ soPhong: undefined });
    setRoomOptions([]);
    
    // 2. Lưu tên khu vực (để lát submit form dùng tên này chứ không dùng ID)
    setSelectedLocationName(option.label);

    // 3. Gọi API lấy danh sách phòng theo ID Khu vực
    const token = localStorage.getItem('userToken');
    
    fetch(`${BASE_API_URL}/locations/${locationId}/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.length > 0) {
            // Nếu có phòng: Map dữ liệu và Mở khóa
            const rooms = data.map(r => ({ label: r.name, value: r.name }));
            setRoomOptions(rooms);
            setIsRoomDisabled(false);
        } else {
            // Nếu không có phòng: Khóa lại
            setIsRoomDisabled(true);
        }
    })
    .catch(() => {
        console.error('Lỗi lấy danh sách phòng');
        setIsRoomDisabled(true);
    });
  };

  // --- LOGIC SUBMIT FORM ---
  const onFinish = (values) => {
    const noiDung = editorNoiDungRef.current ? editorNoiDungRef.current.getContent() : '';
    const thanhPhan = editorThanhPhanRef.current ? editorThanhPhanRef.current.getContent() : '';

    if (!noiDung || noiDung.trim() === '') {
      message.error('Vui lòng nhập Nội dung!');
      return; 
    }

    // Xử lý Ngày (Fix Timezone)
    const formattedDate = values.ngay ? values.ngay.format('YYYY-MM-DD') : null;

    // Xử lý Giờ (Fix Timezone)
    let formattedThoiGian = null;
    if (values.thoiGian && values.thoiGian.length === 2) {
        formattedThoiGian = [
            values.thoiGian[0].format('YYYY-MM-DD HH:mm'), 
            values.thoiGian[1].format('YYYY-MM-DD HH:mm')
        ];
    }

    // 👇 XỬ LÝ ĐỊA ĐIỂM: GỘP TÊN KHU + TÊN PHÒNG
    // Nếu chọn phòng thì gộp lại, nếu không thì chỉ lấy tên Khu
    let finalDiaDiem = selectedLocationName; 
    if (values.soPhong) {
        finalDiaDiem = `${selectedLocationName} - Phòng ${values.soPhong}`;
    }
    // (Lưu ý: values.diaDiem đang chứa ID, ta không dùng nó để gửi lên server, ta dùng finalDiaDiem)

    const fullData = {
      ...values, 
      ngay: formattedDate,
      thoiGian: formattedThoiGian,
      diaDiem: finalDiaDiem, // Gửi chuỗi text đã gộp
      noiDung,
      thanhPhan,
    };

    // Xóa field thừa không cần gửi
    delete fullData.soPhong; 

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
          alert('Đăng ký thành công');
          window.location.reload();
      }
    })
    .catch((err) => {
        if (err.message === 'UNAUTHORIZED') {
            message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        } else {
            message.error('Có lỗi xảy ra khi kết nối server!');
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
        
        {/* 👇 GIAO DIỆN CHIA CỘT ĐỊA ĐIỂM + SỐ PHÒNG */}
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="diaDiem" label="Địa điểm (Khu)" rules={[{ required: true, message: 'Vui lòng chọn địa điểm!' }]}>
                    <Select 
                        showSearch 
                        placeholder="Chọn Khu vực" 
                        options={locationOptions} 
                        onChange={handleLocationChange} // Gắn hàm xử lý mới
                    />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="soPhong" label="Số phòng">
                    <Select 
                        showSearch
                        placeholder="Chọn số phòng"
                        options={roomOptions}
                        disabled={isRoomDisabled} // Khóa nếu chưa chọn Khu
                        allowClear
                    />
                </Form.Item>
            </Col>
        </Row>

        <Form.Item name="donVi" label="Khoa / Phòng ban">
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
