// Đây là Class Schedule (Lịch)
class Schedule {
    constructor(data) {
        this.id = data.id;
        this.ngay = data.ngay;
        this.batDau = data.batDau;
        this.ketThuc = data.ketThuc;
        this.noiDung = data.noiDung;
        this.diaDiem = data.diaDiem;
        this.chuTri = data.chuTriTen;
        this.trangThai = data.trangThai || 'cho_duyet';
        this.nguoiTaoEmail = data.nguoiTao;
    }

    // Phương thức hiển thị thời gian đẹp
    getFormattedTime() {
        return `${this.batDau} - ${this.ketThuc}`;
    }
}

module.exports = Schedule;