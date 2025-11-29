// // File: src/DepartmentsPage.js
// import React, { useState, useEffect } from 'react';

// const DepartmentsPage = () => {
//     const [departments, setDepartments] = useState([]);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         // 👇 QUAN TRỌNG: Thay cái URL này bằng URL backend thực tế của bạn
//         // Nếu chạy local: 'http://localhost:8080/api/departments'
//         // Nếu đã up lên Azure Backend: 'https://<tên-app-backend-của-bạn>.azurewebsites.net/api/departments'
//         const API_URL = 'https://thankful-sea-0dc589b00.3.azurestaticapps.net/khoa-phong'; 

//         fetch(API_URL, {
//             headers: {
//                 'Authorization': `Bearer ${localStorage.getItem('token')}` // Nếu API cần đăng nhập
//             }
//         })
//         .then(res => res.json())
//         .then(data => {
//             setDepartments(data);
//             setLoading(false);
//         })
//         .catch(err => {
//             console.error('Lỗi:', err);
//             setLoading(false);
//         });
//     }, []);

//     return (
//         <div className="p-4">
//             <h3 className="mb-3">Danh sách Khoa - Phòng ban</h3>
//             {loading ? <p>Đang tải...</p> : (
//                 <table className="table table-bordered table-striped">
//                     <thead className="table-primary">
//                         <tr>
//                             <th>STT</th>
//                             <th>Tên Đơn Vị</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {departments.length > 0 ? departments.map((d, i) => (
//                             <tr key={d.id}>
//                                 <td>{i + 1}</td>
//                                 <td>{d.name}</td>
//                             </tr>
//                         )) : <tr><td colSpan="2">Chưa có dữ liệu</td></tr>}
//                     </tbody>
//                 </table>
//             )}
//         </div>
//     );
// };

// export default DepartmentsPage;