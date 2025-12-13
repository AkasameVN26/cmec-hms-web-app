"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  message,
  Spin,
  Alert,
  Typography,
  Button,
  Modal,
  Form,
  Select,
  Tag,
  Space,
} from "antd";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

const { Option } = Select;

const InpatientListPage = () => {
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignBedModalVisible, setIsAssignBedModalVisible] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<any | null>(null);
  const [assignBedForm] = Form.useForm();
  const router = useRouter();
  const { can } = useAuth();

  const fetchInpatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("luot_dieu_tri_noi_tru")
        .select(
          `
          id_luot_dieu_tri,
          ngay_nhap_vien,
          giuong_benh ( id_giuong_benh, so_giuong, phong_benh ( ten_phong, khu_dieu_tri ( ten_khu ) ) ),
          ho_so_benh_an!inner (
            id_ho_so, 
            benh_nhan!inner (ho_ten, ngay_sinh),
            chan_doan (
              loai_chan_doan,
              benh ( ten_benh )
            )
          ),
          bac_si:id_bac_si_phu_trach!inner (tai_khoan!inner (ho_ten)),
          phieu_theo_doi_noi_tru ( thoi_gian_tao )
        `
        )
        .eq('trang_thai_dieu_tri', 'Đang điều trị')
        .not('ho_so_benh_an.trang_thai', 'eq', 'Đã huỷ')
        .order('ngay_nhap_vien', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map((treatment) => {
        const notes = treatment.phieu_theo_doi_noi_tru;
        let last_follow_up_time = null;
        if (notes && notes.length > 0) {
          notes.sort(
            (a: any, b: any) =>
              new Date(b.thoi_gian_tao).getTime() -
              new Date(a.thoi_gian_tao).getTime()
          );
          last_follow_up_time = notes[0].thoi_gian_tao;
        }

        // Process diagnosis
        const hoSo = Array.isArray(treatment.ho_so_benh_an) 
          ? treatment.ho_so_benh_an[0] 
          : treatment.ho_so_benh_an;
        
        const diagnoses = hoSo?.chan_doan || [];
        const mainDiagnosis = diagnoses.find((d: any) => d.loai_chan_doan === 'Bệnh chính');
        
        const getBenhName = (d: any) => {
             if (!d || !d.benh) return null;
             return Array.isArray(d.benh) ? d.benh[0]?.ten_benh : d.benh.ten_benh;
        };

        const chan_doan_hien_thi = getBenhName(mainDiagnosis) || getBenhName(diagnoses[0]) || "Chưa có chẩn đoán";

        return { 
          ...treatment, 
          last_follow_up_time,
          chan_doan_nhap_vien: chan_doan_hien_thi 
        };
      });

      setInpatients(processedData);
    } catch (err: any) {
      setError(`Lỗi khi tải danh sách bệnh nhân nội trú: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBeds = async () => {
    const { data, error } = await supabase
      .from("giuong_benh")
      .select("*, phong_benh(*, khu_dieu_tri(*))")
      .eq("trang_thai_giuong", "Trống");
    if (data) setAvailableBeds(data);
  };

  useEffect(() => {
    fetchInpatients();
    fetchAvailableBeds();
  }, []);

  const showAssignBedModal = (treatment: any) => {
    setSelectedTreatment(treatment);
    assignBedForm.resetFields();
    setIsAssignBedModalVisible(true);
  };

  const handleAssignBedOk = async () => {
    try {
      const values = await assignBedForm.validateFields();
      const { error } = await supabase.rpc("assign_bed_to_patient", {
        p_treatment_id: selectedTreatment.id_luot_dieu_tri,
        p_bed_id: values.id_giuong_benh,
      });
      if (error) throw error;
      message.success("Gán giường cho bệnh nhân thành công!");
      setIsAssignBedModalVisible(false);
      fetchInpatients();
      fetchAvailableBeds();
    } catch (err: any) {
      message.error("Lỗi khi gán giường: " + err.message);
    }
  };

  const columns = [
    {
      title: "Bệnh nhân",
      dataIndex: ["ho_so_benh_an", "benh_nhan", "ho_ten"],
      key: "patient_name",
      width: 180,
    },
    {
      title: "Ngày nhập viện",
      dataIndex: "ngay_nhap_vien",
      key: "ngay_nhap_vien",
      width: 180,
      render: (text: string) => new Date(text).toLocaleString("vi-VN"),
    },
    {
      title: "Lần cập nhật gần nhất",
      dataIndex: "last_follow_up_time",
      key: "last_follow_up_time",
      width: 180,
      render: (text: string | null) =>
        text ? new Date(text).toLocaleString("vi-VN") : "-",
    },
    {
      title: "Chẩn đoán nhập viện",
      dataIndex: "chan_doan_nhap_vien",
      key: "chan_doan_nhap_vien",
      width: 250,
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 250 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "Bác sĩ phụ trách",
      dataIndex: ["bac_si", "tai_khoan", "ho_ten"],
      key: "doctor_name",
      width: 180,
    },
    {
      title: "Vị trí",
      key: "location",
      width: 250,
      render: (_: any, record: any) => {
        const bed = record.giuong_benh;
        if (!bed) return <Tag color="orange">Chưa xếp giường</Tag>;
        const room = bed.phong_benh;
        if (!room) return bed.so_giuong;
        const ward = room.khu_dieu_tri;
        return `${ward?.ten_khu || "N/A"} - ${room.ten_phong} - Giường ${
          bed.so_giuong
        }`;
      },
    },
    {
      title: "Hành động",
      key: "action",
      width: 220,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            onClick={() =>
              router.push(
                `/dashboard/appointments/${record.ho_so_benh_an.id_ho_so}?tab=4`
              )
            }
          >
            Theo dõi
          </Button>
          <Button
            onClick={() => showAssignBedModal(record)}
            disabled={!can("inpatient.record.update")}
          >
            {record.giuong_benh ? "Đổi giường" : "Gán giường"}
          </Button>
        </Space>
      ),
    },
  ];

  if (error) return <Alert message={error} type="error" />;

  return (
    <>
      <Card title="Danh sách Bệnh nhân Nội trú">
        <Table
          columns={columns}
          dataSource={inpatients}
          loading={loading}
          rowKey="id_luot_dieu_tri"
        />
      </Card>
      <Modal
        title={`Gán giường cho bệnh nhân: ${selectedTreatment?.ho_so_benh_an?.benh_nhan?.ho_ten}`}
        visible={isAssignBedModalVisible}
        onOk={handleAssignBedOk}
        onCancel={() => setIsAssignBedModalVisible(false)}
        okText="Xác nhận"
        cancelText="Huỷ"
      >
        <Form form={assignBedForm} layout="vertical">
          <Form.Item
            name="id_giuong_benh"
            label="Chọn giường trống"
            rules={[{ required: true, message: "Vui lòng chọn một giường" }]}
          >
            <Select
              showSearch
              placeholder="Tìm và chọn giường bệnh"
              optionFilterProp="children"
            >
              {availableBeds.map((bed) => (
                <Option key={bed.id_giuong_benh} value={bed.id_giuong_benh}>
                  {`${bed.phong_benh?.khu_dieu_tri?.ten_khu} - ${bed.phong_benh?.ten_phong} - Giường ${bed.so_giuong}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InpatientListPage;

export const dynamic = 'force-dynamic';
