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
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// Import thêm icon CloudUpload từ thư viện icon của Ant Design
import { CloudUploadOutlined } from '@ant-design/icons';
// Cấu hình worker cho PDF (Bắt buộc để đọc được file)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
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

  // --- 👇 THÊM MỚI: XỬ LÝ IMPORT EXCEL ---
  const fileInputRef = useRef(null);

// --- HÀM IMPORT EXCEL MỚI (ĐÃ NÂNG CẤP) ---
// --- 1. HÀM CHÍNH: PHÂN LOẠI FILE ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.name.split('.').pop().toLowerCase();

    // Reset input để có thể chọn lại file khác
    e.target.value = null;

    if (fileType === 'xlsx' || fileType === 'xls') {
        processExcelFile(file);
    } else if (fileType === 'docx') {
        processWordFile(file);
    } else if (fileType === 'pdf') {
        processPdfFile(file);
    } else {
        message.error("Chỉ hỗ trợ file Excel, Word và PDF!");
    }
  };
// --- A. HÀM TÌM ID CỦA NGƯỜI KHÁC TRONG EXCEL (Nếu cần) ---
  const findHostIdByName = (nameInExcel) => {
    if (!nameInExcel) return null;
    const cleanName = String(nameInExcel).toLowerCase().trim();
    const found = hostOptions.find(u => 
        u.label.toLowerCase().includes(cleanName) || 
        cleanName.includes(u.label.toLowerCase())
    );
    return found ? found.value : null; 
  };

// --- B. HÀM GỌI API (Đã sửa để log lỗi chi tiết) ---
  const saveScheduleToApi = async (scheduleData) => {
      const token = localStorage.getItem('userToken');
      
      const payload = {
          ngay: scheduleData.ngay.format('YYYY-MM-DD'),
          thoiGian: [
              scheduleData.thoiGian[0].format('YYYY-MM-DD HH:mm'),
              scheduleData.thoiGian[1].format('YYYY-MM-DD HH:mm')
          ],
          diaDiem: scheduleData.diaDiemFull, 
          noiDung: scheduleData.noiDung,
          thanhPhan: scheduleData.thanhPhan,
          donVi: scheduleData.donVi,
          
          // 👇 QUAN TRỌNG: Gửi Email thay vì ID
          chuTriEmail: scheduleData.chuTriEmail, 
          chuTriTen: scheduleData.chuTriTen,
          
          thuocPhuLuc: false,
          isBoSung: false, 
          guiMail: false
      };

      try {
          console.log("Đang gửi API:", payload); // 👉 Debug Payload
          const response = await fetch(`${BASE_API_URL}/schedules`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
              // In lỗi ra console để biết tại sao server từ chối
              const errText = await response.text();
              console.error("LỖI API:", errText);
              return false;
          }
          return true;
      } catch (error) {
          console.error("Lỗi mạng:", error);
          return false;
      }
  };
// --- C. HÀM XỬ LÝ EXCEL CHÍNH (Đã sửa lấy Email) ---
  const processExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        if (!rawData || rawData.length < 2) {
            message.error("File không có dữ liệu!");
            return;
        }

        // 1. TÌM TIÊU ĐỀ
        let headerIndex = -1;
        let map = {};
        for (let i = 0; i < 50; i++) {
            const row = rawData[i];
            if (!row) continue;
            const strRow = row.map(c => String(c || "").toLowerCase());
            if (strRow.some(c => c.includes("nội dung") || c.includes("content"))) {
                headerIndex = i;
                strRow.forEach((c, idx) => {
                    if (c.includes("ngày") || c.includes("thứ")) map.date = idx;
                    if (c.includes("giờ") || c.includes("thời gian")) map.time = idx;
                    if (c.includes("nội dung")) map.content = idx;
                    if (c.includes("thành phần")) map.part = idx;
                    if (c.includes("địa điểm")) map.loc = idx;
                    if (c.includes("chủ trì")) map.host = idx;
                    if (c.includes("đơn vị") || c.includes("khoa")) map.dept = idx;
                });
                break;
            }
        }

        if (headerIndex === -1) {
            message.error("Không tìm thấy tiêu đề!"); 
            return;
        }

        // 2. LẤY THÔNG TIN USER (Lấy cả Email)
        let currentUser = null;
        try {
            const userStr = localStorage.getItem('userData'); 
            if (userStr) currentUser = JSON.parse(userStr);
        } catch (e) { console.error(e); }

        const myName = currentUser ? currentUser.hostName.trim() : ""; 
        // 👇 SỬA: Lấy Email thay vì ID
        const myEmail = currentUser ? currentUser.email : ""; 

        if (!myName || !myEmail) {
            message.error("Lỗi thông tin User (thiếu tên hoặc email). Hãy đăng nhập lại!");
            return;
        }

        const listToImport = [];
        const contentRows = rawData.slice(headerIndex + 1);
        let lastDate = null;

        // 3. QUÉT DỮ LIỆU
        for (let row of contentRows) {
            if (!row || row.length === 0) continue;

            let dRaw = row[map.date];
            if (dRaw) lastDate = dRaw;
            else dRaw = lastDate;

            if (!row[map.content]) continue; 

            // LOGIC LỌC CHÍNH CHỦ
            const hostInExcel = String(row[map.host] || "").trim();
            const isMe = hostInExcel.toLowerCase().includes(myName.toLowerCase());
            
            if (!isMe) continue; 

            // Parse Ngày
            let parsedDate = null;
            if (typeof dRaw === 'number') parsedDate = dayjs(new Date(Math.round((dRaw - 25569)*86400*1000)));
            else if (dRaw) {
                const m = String(dRaw).match(/(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{4}))?/);
                if (m) parsedDate = dayjs(`${m[4]||new Date().getFullYear()}-${m[2]}-${m[1]}`);
            }

            // Xử lý Giờ
            let timeRange = null;
            if (row[map.time]) {
                let tStr = String(row[map.time]).toLowerCase().replace(/g|h|giờ/g, ':').replace(/\s/g, '');
                const parts = tStr.split('-');
                let start = dayjs(parts[0], 'HH:mm');
                let end = (parts.length > 1 && parts[1]) ? dayjs(parts[1], 'HH:mm') : start.add(1, 'hour');
                
                if (start.isValid()) {
                    timeRange = [start, end.isValid() ? end : start.add(1, 'hour')];
                }
            }

            if (parsedDate && timeRange) {
                listToImport.push({
                    ngay: parsedDate,
                    thoiGian: timeRange,
                    noiDung: row[map.content],
                    thanhPhan: row[map.part],
                    diaDiemFull: String(row[map.loc] || ""), 
                    donVi: map.dept ? row[map.dept] : '',
                    chuTriTen: hostInExcel, 
                    // 👇 Gán Email của bạn vào đây
                    chuTriEmail: myEmail 
                });
            }
        }

        // 4. XÁC NHẬN VÀ LƯU
        if (listToImport.length === 0) {
            message.warning(`Không tìm thấy lịch nào của "${myName}"!`);
            return;
        }

        const confirm = window.confirm(`Tìm thấy ${listToImport.length} lịch của "${myName}". ĐĂNG KÝ NGAY?`);
        
        if (confirm) {
            message.loading("Đang lưu...", 0);
            let count = 0;
            for (const item of listToImport) {
                const success = await saveScheduleToApi(item);
                if (success) count++;
            }
            message.destroy();
            
            if (count > 0) {
                message.success(`Đã lưu thành công ${count} lịch!`);
                // 👇 QUAN TRỌNG: Reload để xem lịch mới trong Danh sách
                setTimeout(() => window.location.reload(), 1500);
            } else {
                message.error("Lỗi khi lưu! Hãy nhấn F12 -> Console để xem chi tiết.");
            }
        }

      } catch (err) {
        console.error(err);
        message.error("Lỗi đọc file Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };
  // --- 3. XỬ LÝ WORD (.docx) ---
  const processWordFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
        const arrayBuffer = evt.target.result;
        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then((result) => {
                const text = result.value; 
                if (editorNoiDungRef.current) {
                    editorNoiDungRef.current.setContent(text.replace(/\n/g, '<br/>'));
                }
                message.success("Đã lấy nội dung từ file Word!");
                message.info("Với Word, bạn cần tự chọn Ngày và Giờ.");
            })
            .catch((err) => {
                console.error(err);
                message.error("Lỗi đọc file Word.");
            });
    };
    reader.readAsArrayBuffer(file);
  };

  // --- 4. XỬ LÝ PDF (.pdf) ---
  const processPdfFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const typedarray = new Uint8Array(evt.target.result);
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + "<br/><br/>";
            }

            if (editorNoiDungRef.current) {
                editorNoiDungRef.current.setContent(fullText);
            }
            message.success("Đã lấy nội dung từ file PDF!");
            message.info("Với PDF, bạn cần tự chọn Ngày và Giờ.");
        } catch (err) {
            console.error(err);
            message.error("Lỗi đọc file PDF.");
        }
    };
    reader.readAsArrayBuffer(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
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
      
      {/* --- SỬA ĐOẠN TIÊU ĐỀ NÀY --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Tạo Lịch Tuần</h2>
          <div>
              <input
                  type="file"
                 accept=".xlsx, .xls, .docx, .pdf"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
              />
              <Button 
    onClick={triggerFileInput} 
    style={{ 
        background: 'linear-gradient(90deg, #107c41 0%, #34a853 100%)', // Màu xanh chuyển sắc (Gradient)
        color: 'white', 
        border: 'none',
        fontWeight: '700',          // Chữ đậm
        fontSize: '15px',           // Cỡ chữ vừa vặn
        height: '42px',             // Chiều cao nút
        padding: '0 20px',          // Độ rộng nút
        borderRadius: '6px',        // Bo góc nhẹ hiện đại
        boxShadow: '0 4px 12px rgba(16, 124, 65, 0.3)', // Đổ bóng xanh nhẹ
        display: 'flex',
        alignItems: 'center',
        gap: '10px',                // Khoảng cách giữa Icon và Chữ
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    }}
    // Hiệu ứng khi di chuột vào (Nổi lên + Đổi màu nhẹ)
    onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 124, 65, 0.5)';
    }}
    // Hiệu ứng khi di chuột ra
    onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 124, 65, 0.3)';
    }}
>
    {/* Icon đám mây upload */}
    <CloudUploadOutlined style={{ fontSize: '18px', fontWeight: 'bold' }} />
    
    {/* Tên nút mới */}
    TẢI TÀI LIỆU
</Button>
          </div>
      </div>
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
          <Editor apiKey='mirj3kustmowze1zj8u0c3o8frnsab26ljndqnup0bx9z2kp' onInit={(evt, editor) => editorNoiDungRef.current = editor} init={{ height: 250, menubar: false, plugins: 'anchor autolink link lists searchreplace table visualblocks wordcount', toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | table link' }} />
        </Form.Item>
        <Form.Item label="Thành Phần">
          <Editor apiKey='mirj3kustmowze1zj8u0c3o8frnsab26ljndqnup0bx9z2kp' onInit={(evt, editor) => editorThanhPhanRef.current = editor} init={{ height: 250, menubar: false, plugins: 'anchor autolink link lists searchreplace table visualblocks wordcount', toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | table link' }} />
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
