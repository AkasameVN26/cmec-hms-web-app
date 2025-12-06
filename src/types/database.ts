export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bac_si: {
        Row: BacSi
        Insert: Omit<BacSi, 'id_bac_si' | 'ngay_chuyen_den'> & { id_bac_si?: string; ngay_chuyen_den?: string }
        Update: Partial<BacSi>
      }
      benh: {
        Row: Benh
        Insert: Omit<Benh, 'id_benh'> & { id_benh?: number }
        Update: Partial<Benh>
      }
      benh_nhan: {
        Row: BenhNhan
        Insert: Omit<BenhNhan, 'id_benh_nhan'> & { id_benh_nhan?: string }
        Update: Partial<BenhNhan>
      }
      benh_vien: {
        Row: BenhVien
        Insert: Omit<BenhVien, 'id'> & { id?: number }
        Update: Partial<BenhVien>
      }
      chan_doan: {
        Row: ChanDoan
        Insert: ChanDoan
        Update: Partial<ChanDoan>
      }
      chi_dinh_cls: {
        Row: ChiDinhCLS
        Insert: Omit<ChiDinhCLS, 'id_chi_dinh' | 'thoi_gian_tao_chi_dinh'> & { id_chi_dinh?: number; thoi_gian_tao_chi_dinh?: string }
        Update: Partial<ChiDinhCLS>
      }
      chi_tiet_don_thuoc: {
        Row: ChiTietDonThuoc
        Insert: Omit<ChiTietDonThuoc, 'id_chi_tiet_don_thuoc'> & { id_chi_tiet_don_thuoc?: number }
        Update: Partial<ChiTietDonThuoc>
      }
      chuyen_khoa: {
        Row: ChuyenKhoa
        Insert: Omit<ChuyenKhoa, 'id_chuyen_khoa'> & { id_chuyen_khoa?: number }
        Update: Partial<ChuyenKhoa>
      }
      dich_vu_cls: {
        Row: DichVuCLS
        Insert: Omit<DichVuCLS, 'id_dich_vu'> & { id_dich_vu?: number }
        Update: Partial<DichVuCLS>
      }
      don_thuoc: {
        Row: DonThuoc
        Insert: Omit<DonThuoc, 'id_don_thuoc' | 'thoi_gian_ke_don'> & { id_don_thuoc?: number; thoi_gian_ke_don?: string }
        Update: Partial<DonThuoc>
      }
      ghi_chu_y_te: {
        Row: GhiChuYTe
        Insert: Omit<GhiChuYTe, 'id_ghi_chu' | 'thoi_gian_tao'> & { id_ghi_chu?: number; thoi_gian_tao?: string }
        Update: Partial<GhiChuYTe>
      }
      giuong_benh: {
        Row: GiuongBenh
        Insert: Omit<GiuongBenh, 'id_giuong_benh'> & { id_giuong_benh?: number }
        Update: Partial<GiuongBenh>
      }
      ho_so_benh_an: {
        Row: HoSoBenhAn
        Insert: Omit<HoSoBenhAn, 'id_ho_so' | 'thoi_gian_mo_ho_so'> & { id_ho_so?: number; thoi_gian_mo_ho_so?: string }
        Update: Partial<HoSoBenhAn>
      }
      ket_qua_cls: {
        Row: KetQuaCLS
        Insert: Omit<KetQuaCLS, 'id_ket_qua_cls' | 'thoi_gian_tra_ket_qua'> & { id_ket_qua_cls?: number; thoi_gian_tra_ket_qua?: string }
        Update: Partial<KetQuaCLS>
      }
      khu_dieu_tri: {
        Row: KhuDieuTri
        Insert: Omit<KhuDieuTri, 'id_khu'> & { id_khu?: number }
        Update: Partial<KhuDieuTri>
      }
      ktv_dich_vu_cls: {
        Row: KTVDichVuCLS
        Insert: KTVDichVuCLS
        Update: Partial<KTVDichVuCLS>
      }
      ky_thuat_vien: {
        Row: KyThuatVien
        Insert: Omit<KyThuatVien, 'id_ky_thuat_vien'> & { id_ky_thuat_vien?: string }
        Update: Partial<KyThuatVien>
      }
      lich_kham: {
        Row: LichKham
        Insert: Omit<LichKham, 'id_lich_kham' | 'thoi_gian_tao'> & { id_lich_kham?: number; thoi_gian_tao?: string }
        Update: Partial<LichKham>
      }
      lich_truc: {
        Row: LichTruc
        Insert: Omit<LichTruc, 'id_lich_truc'> & { id_lich_truc?: number }
        Update: Partial<LichTruc>
      }
      loai_ghi_chu: {
        Row: LoaiGhiChu
        Insert: Omit<LoaiGhiChu, 'id_loai_ghi_chu'> & { id_loai_ghi_chu?: number }
        Update: Partial<LoaiGhiChu>
      }
      luot_dieu_tri_noi_tru: {
        Row: LuotDieuTriNoiTru
        Insert: Omit<LuotDieuTriNoiTru, 'id_luot_dieu_tri'> & { id_luot_dieu_tri?: number }
        Update: Partial<LuotDieuTriNoiTru>
      }
      permissions: {
        Row: Permissions
        Insert: Omit<Permissions, 'id'> & { id?: number }
        Update: Partial<Permissions>
      }
      phieu_theo_doi_noi_tru: {
        Row: PhieuTheoDoiNoiTru
        Insert: Omit<PhieuTheoDoiNoiTru, 'id_phieu' | 'thoi_gian_tao'> & { id_phieu?: number; thoi_gian_tao?: string }
        Update: Partial<PhieuTheoDoiNoiTru>
      }
      phong_benh: {
        Row: PhongBenh
        Insert: Omit<PhongBenh, 'id_phong'> & { id_phong?: number }
        Update: Partial<PhongBenh>
      }
      phong_kham: {
        Row: PhongKham
        Insert: Omit<PhongKham, 'id_phong_kham'> & { id_phong_kham?: number }
        Update: Partial<PhongKham>
      }
      role_permissions: {
        Row: RolePermissions
        Insert: RolePermissions
        Update: Partial<RolePermissions>
      }
      roles: {
        Row: Roles
        Insert: Omit<Roles, 'id'> & { id?: number }
        Update: Partial<Roles>
      }
      tai_khoan: {
        Row: TaiKhoan
        Insert: TaiKhoan
        Update: Partial<TaiKhoan>
      }
      thuoc: {
        Row: Thuoc
        Insert: Omit<Thuoc, 'id_thuoc'> & { id_thuoc?: number }
        Update: Partial<Thuoc>
      }
      user_roles: {
        Row: UserRoles
        Insert: UserRoles
        Update: Partial<UserRoles>
      }
    }
  }
}

// --- Table Interfaces ---

export interface BacSi {
  id_bac_si: string
  kinh_nghiem: string | null
  so_dien_thoai: string
  cccd: string
  ngay_sinh: string | null
  tien_luong: number | null
  id_chuyen_khoa: number
  ngay_chuyen_den: string
  ngay_chuyen_di: string | null
}

export interface Benh {
  id_benh: number
  ten_benh: string
  mo_ta_benh: string | null
  id_chuyen_khoa: number | null
}

export interface BenhNhan {
  id_benh_nhan: string
  ho_ten: string
  ngay_sinh: string | null
  gioi_tinh: 'Nam' | 'Nữ' | 'Khác' | null
  dia_chi: string | null
  so_dien_thoai: string | null
  cccd: string
}

export interface BenhVien {
  id: number
  ten_benh_vien: string
  dia_chi: string
  so_dien_thoai: string
  email: string
  website: string
  ngay_thanh_lap: string
}

export interface ChanDoan {
  id_ho_so: number
  id_benh: number
  loai_chan_doan: 'Bệnh chính' | 'Bệnh kèm theo'
}

export interface ChiDinhCLS {
  id_chi_dinh: number
  id_lich_kham: number
  id_dich_vu: number
  id_bac_si_chi_dinh: string
  thoi_gian_tao_chi_dinh: string
  ghi_chu: string | null
  trang_thai_chi_dinh: 'Chờ thực hiện' | 'Đã lấy mẫu' | 'Đang xử lý' | 'Hoàn thành' | 'Đã huỷ'
}

export interface ChiTietDonThuoc {
  id_chi_tiet_don_thuoc: number
  id_don_thuoc: number
  id_thuoc: number
  so_luong: number
  lieu_dung: string
  ghi_chu: string | null
}

export interface ChuyenKhoa {
  id_chuyen_khoa: number
  ten_chuyen_khoa: string
  loai_khoa: 'Lâm sàng' | 'Cận lâm sàng' | null
}

export interface DichVuCLS {
  id_dich_vu: number
  ten_dich_vu: string
  id_phong_kham: number
  don_gia: number
  mo_ta: string | null
  id_chuyen_khoa: number
}

export interface DonThuoc {
  id_don_thuoc: number
  id_lich_kham: number
  thoi_gian_ke_don: string
  trang_thai_don_thuoc: 'Mới' | 'Đã cấp phát' | 'Đã huỷ'
}

export interface GhiChuYTe {
  id_ghi_chu: number
  id_loai_ghi_chu: number
  id_ho_so: number
  id_lich_kham: number | null
  id_nguoi_tao: string
  thoi_gian_tao: string
  noi_dung_ghi_chu: string | null
  du_lieu_cau_truc: Json | null
}

export interface GiuongBenh {
  id_giuong_benh: number
  so_giuong: string
  trang_thai_giuong: 'Trống' | 'Đang sử dụng'
  id_phong: number
}

export interface HoSoBenhAn {
  id_ho_so: number
  id_benh_nhan: string
  thoi_gian_mo_ho_so: string
  thoi_gian_dong_ho_so: string | null
  loai_benh_an: 'Nội trú' | 'Ngoại trú'
  trang_thai: 'Đang xử lý' | 'Hoàn tất' | 'Đã huỷ'
  tong_chi_phi: number | null
}

export interface KetQuaCLS {
  id_ket_qua_cls: number
  id_chi_dinh: number
  id_ky_thuat_vien: string | null
  thoi_gian_thuc_hien: string | null
  thoi_gian_tra_ket_qua: string
  ket_luan: string | null
  duong_dan_file_ket_qua: string | null
  chi_so_xet_nghiem: Json | null
}

export interface KhuDieuTri {
  id_khu: number
  ten_khu: string
  id_chuyen_khoa: number | null
}

export interface KTVDichVuCLS {
  id_ky_thuat_vien: string
  id_dich_vu: number
}

export interface KyThuatVien {
  id_ky_thuat_vien: string
  id_chuyen_khoa: number
  trinh_do: string | null
  so_dien_thoai: string
  cccd: string
  ngay_sinh: string | null
  tien_luong: number | null
  ngay_chuyen_den: string
  ngay_chuyen_di: string | null
}

export interface LichKham {
  id_lich_kham: number
  id_benh_nhan: string
  id_bac_si_phu_trach: string
  id_phong_kham: number
  thoi_gian_tao: string
  thoi_gian_kham: string
  trang_thai: 'Đã Hẹn' | 'Đã Khám' | 'Đã Huỷ'
  ngay_tai_kham: string | null
  chi_phi_kham: number | null
  id_ho_so: number
  loai_lich_kham: 'Khám bệnh' | 'Tái khám' | 'Hội chẩn'
  id_nguoi_dat_lich: string
  ly_do_kham: string | null
}

export interface LichTruc {
  id_lich_truc: number
  id_bac_si: string
  ngay_truc: string
  ca_truc: 'Sáng' | 'Chiều' | 'Tối'
}

export interface LoaiGhiChu {
  id_loai_ghi_chu: number
  ten_loai_ghi_chu: string
  nhom_ghi_chu: string | null
  thu_tu_uu_tien: number | null
  send_to_ai: boolean | null
}

export interface LuotDieuTriNoiTru {
  id_luot_dieu_tri: number
  ngay_nhap_vien: string
  id_giuong_benh: number | null
  ngay_xuat_vien: string | null
  trang_thai_dieu_tri: 'Đang điều trị' | 'Đã xuất viện' | 'Chuyển viện'
  id_bac_si_phu_trach: string
  id_ho_so: number
}

export interface Permissions {
  id: number
  ten_quyen: string
  mo_ta: string | null
}

export interface PhieuTheoDoiNoiTru {
  id_phieu: number
  id_luot_dieu_tri: number
  thoi_gian_tao: string
  nhip_tim: number | null
  nhiet_do: number | null
  huyet_ap: string | null
  nhip_tho: number | null
  dien_bien_benh: string | null
  y_lenh: string | null
  id_nhan_vien_y_te: string
}

export interface PhongBenh {
  id_phong: number
  ten_phong: string
  id_khu: number
  chi_phi_van_hanh: number | null
}

export interface PhongKham {
  id_phong_kham: number
  ten_phong_kham: string
  vi_tri: string | null
  chi_phi_van_hanh: number
}

export interface RolePermissions {
  id_vai_tro: number
  id_quyen: number
}

export interface Roles {
  id: number
  ten_vai_tro: string
}

export interface TaiKhoan {
  id: string
  email: string
  ho_ten: string | null
}

export interface Thuoc {
  id_thuoc: number
  ten_thuoc: string
  hoat_chat: string | null
  don_vi_tinh: string
  so_luong_ton_kho: number
  don_gia_nhap: number
  don_gia_ban: number
  mo_ta: string | null
  nhom_thuoc: string | null
}

export interface UserRoles {
  id_tai_khoan: string
  id_vai_tro: number
}