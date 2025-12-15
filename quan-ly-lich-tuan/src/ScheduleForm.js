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

  // --- 2. XỬ LÝ EXCEL (Logic thông minh bạn cung cấp) ---
  const processExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];

        // Đọc file raw
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        
        if (!rawData || rawData.length < 2) {
            message.error("File không có dữ liệu!");
            return;
        }

        // Tìm dòng tiêu đề
        let headerRowIndex = -1;
        let mapping = {}; 

        for (let i = 0; i < 5; i++) {
            const row = rawData[i];
            // Fix lỗi nếu row bị undefined hoặc null
            if (!row) continue; 
            const rowStr = row.map(c => String(c || "").toLowerCase().trim());
            
            if (rowStr.some(c => c.includes("nội dung") || c.includes("content"))) {
                headerRowIndex = i;
                rowStr.forEach((cell, index) => {
                    if (cell.includes("ngày") || cell.includes("thứ")) mapping.date = index;
                    if (cell.includes("thời gian") || cell.includes("giờ")) mapping.time = index;
                    if (cell.includes("nội dung")) mapping.content = index;
                    if (cell.includes("thành phần")) mapping.participants = index;
                    if (cell.includes("địa điểm")) mapping.location = index;
                    if (cell.includes("chủ trì")) mapping.host = index;
                    if (cell.includes("đơn vị") || cell.includes("khoa")) mapping.dept = index;
                });
                break;
            }
        }

        if (headerRowIndex === -1) {
            alert("Không tìm thấy dòng tiêu đề (Nội dung, Thời gian...). Vui lòng kiểm tra file!");
            return;
        }

        const contentRows = rawData.slice(headerRowIndex + 1);
        let lastDate = null;
        let foundData = null;

        for (let row of contentRows) {
            // Fix lỗi row trống
            if (!row || row.length === 0) continue;

            // -- Xử lý ngày (ô gộp) --
            let dateRaw = row[mapping.date];
            if (dateRaw) {
                lastDate = dateRaw;
            } else {
                dateRaw = lastDate;
            }

            if (!row[mapping.content]) continue;

            // -- Phân tích Ngày --
            let parsedDate = null;
            if (dateRaw) {
                if (typeof dateRaw === 'number') {
                    parsedDate = dayjs(new Date(Math.round((dateRaw - 25569)*86400*1000)));
                } else {
                    const dateStr = String(dateRaw);
                    const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{4}))?/);
                    if (dateMatch) {
                        const day = dateMatch[1];
                        const month = dateMatch[2];
                        const year = dateMatch[4] || new Date().getFullYear();
                        parsedDate = dayjs(`${year}-${month}-${day}`, 'YYYY-M-D');
                    }
                }
            }

            // -- Phân tích Giờ --
            let timeRange = null;
            let timeRaw = row[mapping.time];
            if (timeRaw) {
                let timeStr = String(timeRaw).toLowerCase().replace(/g|h|giờ/g, ':').replace(/\s/g, ''); 
                const parts = timeStr.split('-');
                if (parts.length >= 1) {
                    let start = dayjs(parts[0], 'HH:mm');
                    let end = parts.length > 1 ? dayjs(parts[1], 'HH:mm') : start.add(1, 'hour');
                    
                    if (start.isValid()) {
                        timeRange = [start, end.isValid() ? end : start.add(1, 'hour')];
                    }
                }
            }

            // -- Tìm ID Địa điểm --
            let foundLocationId = undefined;
            if (mapping.location !== undefined && row[mapping.location]) {
                const excelLocName = String(row[mapping.location]).toLowerCase();
                const found = locationOptions.find(opt => opt.label.toLowerCase().includes(excelLocName));
                if (found) foundLocationId = found.value;
            }

            if (parsedDate) {
                foundData = {
                    ngay: parsedDate,
                    thoiGian: timeRange,
                    noiDung: row[mapping.content],
                    thanhPhan: row[mapping.participants],
                    diaDiem: foundLocationId,
                    donVi: mapping.dept !== undefined ? row[mapping.dept] : '',
                    chuTri: mapping.host !== undefined ? row[mapping.host] : '',
                    rawLocation: row[mapping.location] 
                };
                break; 
            }
        }

        // Fill dữ liệu
        if (foundData) {
            form.setFieldsValue({
                ngay: foundData.ngay,
                thoiGian: foundData.thoiGian,
                donVi: foundData.donVi,
                chuTriTen: foundData.chuTri,
                diaDiem: foundData.diaDiem
            });

            let contentStr = String(foundData.noiDung || "");
            if (!foundData.diaDiem && foundData.rawLocation) {
                contentStr += `<br/><b>Địa điểm (từ file):</b> ${foundData.rawLocation}`;
            }

            if (editorNoiDungRef.current) editorNoiDungRef.current.setContent(contentStr);
            if (editorThanhPhanRef.current) editorThanhPhanRef.current.setContent(String(foundData.thanhPhan || ""));
            
            if (foundData.diaDiem) {
                const opt = locationOptions.find(o => o.value === foundData.diaDiem);
                if (opt) handleLocationChange(foundData.diaDiem, opt);
            }

            message.success('Đã nhập dữ liệu Excel thành công!');
        } else {
            message.warning('Không tìm thấy dữ liệu hợp lệ trong Excel!');
        }
      } catch (error) {
        console.error(error);
        message.error('Lỗi khi đọc file Excel.');
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
                  style={{ backgroundColor: '#107c41', color: 'white', borderColor: '#107c41' }}
              >
                  📂 Nhập từ Excel
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
