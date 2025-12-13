"use client";

import { useState, useEffect, useCallback } from "react";
import {
  message,
  Tag,
  Typography,
  Descriptions,
  Space,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  DatePicker,
  Spin,
} from "antd";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const InpatientTreatmentTab = ({
  record_id,
  record_status,
}: {
  record_id: number;
  record_status: string;
}) => {
  const { user, can } = useAuth();
  const [treatmentRecord, setTreatmentRecord] = useState<any | null>(null);
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState<string>("");
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isNoteDetailModalVisible, setIsNoteDetailModalVisible] =
    useState(false);
  const [isDischargeModalVisible, setIsDischargeModalVisible] = useState(false);
  const [viewingNote, setViewingNote] = useState<any | null>(null);
  const [noteForm] = Form.useForm();
  const [dischargeForm] = Form.useForm();
  const isRecordCancelled = record_status === "Đã huỷ";

  const fetchInpatientRecord = useCallback(async () => {
    setLoading(true);

    // Fetch Treatment Record
    const { data, error } = await supabase
      .from("luot_dieu_tri_noi_tru")
      .select(
        `
                *,
                bac_si:id_bac_si_phu_trach(tai_khoan!inner(ho_ten)),
                giuong_benh(*, phong_benh(*, khu_dieu_tri(*))),
                phieu_theo_doi_noi_tru(
                    *,
                    nhan_vien:id_nhan_vien_y_te(ho_ten)
                )
            `
      )
      .eq("id_ho_so", record_id)
      .order("thoi_gian_tao", {
        foreignTable: "phieu_theo_doi_noi_tru",
        ascending: false,
      })
      .single();

    if (error && error.code !== "PGRST116") {
      message.error("Lỗi khi tải thông tin điều trị nội trú: " + error.message);
    } else {
      setTreatmentRecord(data);
    }

    // Fetch Diagnoses from Notes
    const { data: notes } = await supabase
      .from("ghi_chu_y_te")
      .select("noi_dung_ghi_chu, loai_ghi_chu!inner(ten_loai_ghi_chu)")
      .eq("id_ho_so", record_id)
      .in("loai_ghi_chu.ten_loai_ghi_chu", [
        "Chẩn đoán nhập viện",
        "Chẩn đoán xuất viện",
      ]);

    if (notes) {
      const adminDiag = notes.find(
        (n: any) => n.loai_ghi_chu.ten_loai_ghi_chu === "Chẩn đoán nhập viện"
      );
      const dischDiag = notes.find(
        (n: any) => n.loai_ghi_chu.ten_loai_ghi_chu === "Chẩn đoán xuất viện"
      );
      if (adminDiag) setAdmissionDiagnosis(adminDiag.noi_dung_ghi_chu);
      if (dischDiag) setDischargeDiagnosis(dischDiag.noi_dung_ghi_chu);
    }

    setLoading(false);
  }, [record_id]);

  useEffect(() => {
    fetchInpatientRecord();
  }, [fetchInpatientRecord]);

  const handleAddNote = () => {
    noteForm.resetFields();
    setIsNoteModalVisible(true);
  };

  const handleViewNoteDetails = (note: any) => {
    setViewingNote(note);
    setIsNoteDetailModalVisible(true);
  };

  const handleNoteOk = async () => {
    try {
      const values = await noteForm.validateFields();
      const { error } = await supabase.from("phieu_theo_doi_noi_tru").insert({
        id_luot_dieu_tri: treatmentRecord.id_luot_dieu_tri,
        id_nhan_vien_y_te: user?.id,
        ...values,
      });
      if (error) throw error;
      message.success("Thêm phiếu theo dõi thành công!");
      setIsNoteModalVisible(false);
      fetchInpatientRecord();
    } catch (err: any) {
      message.error("Lỗi khi thêm phiếu theo dõi: " + err.message);
    }
  };

  const showDischargeModal = () => {
    dischargeForm.resetFields();
    dischargeForm.setFieldsValue({ ngay_xuat_vien: dayjs() });
    setIsDischargeModalVisible(true);
  };

  const handleDischargeOk = async () => {
    try {
      const values = await dischargeForm.validateFields();

      // 1. Get Note Type ID
      const { data: noteType } = await supabase
        .from("loai_ghi_chu")
        .select("id_loai_ghi_chu")
        .eq("ten_loai_ghi_chu", "Chẩn đoán xuất viện")
        .single();
      if (!noteType)
        throw new Error('Không tìm thấy loại ghi chú "Chẩn đoán xuất viện".');

      // 2. Call RPC (Parameter p_discharge_diagnosis removed)
      const { error } = await supabase.rpc("discharge_patient", {
        p_treatment_id: treatmentRecord.id_luot_dieu_tri,
        p_discharge_date: values.ngay_xuat_vien.toISOString(),
      });
      if (error) throw error;

      // 3. Create Note
      const { error: noteError } = await supabase.from("ghi_chu_y_te").insert({
        id_ho_so: record_id,
        id_loai_ghi_chu: noteType.id_loai_ghi_chu,
        id_nguoi_tao: user?.id,
        noi_dung_ghi_chu: values.chan_doan_xuat_vien,
      });
      if (noteError) throw noteError;

      message.success("Đã tạo lệnh xuất viện thành công!");
      setIsDischargeModalVisible(false);
      fetchInpatientRecord();
    } catch (err: any) {
      message.error("Lỗi khi tạo lệnh xuất viện: " + err.message);
    }
  };

  const noteColumns = [
    {
      title: "Thời gian",
      dataIndex: "thoi_gian_tao",
      key: "thoi_gian_tao",
      width: 170,
      render: (ts: string) => new Date(ts).toLocaleString("vi-VN"),
    },
    {
      title: "Diễn biến bệnh",
      dataIndex: "dien_bien_benh",
      key: "dien_bien_benh",
      ellipsis: true,
    },
    { title: "Y lệnh", dataIndex: "y_lenh", key: "y_lenh", ellipsis: true },
    {
      title: "Nhân viên",
      dataIndex: ["nhan_vien", "ho_ten"],
      key: "nhan_vien",
      width: 200,
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => handleViewNoteDetails(record)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  if (loading) return <Spin />;
  if (!treatmentRecord)
    return (
      <Typography.Text>
        Bệnh nhân chưa có thông tin điều trị nội trú.
      </Typography.Text>
    );

  const bed = treatmentRecord.giuong_benh;
  const room = bed?.phong_benh;
  const ward = room?.khu_dieu_tri;
  const location = bed
    ? `${ward?.ten_khu || "N/A"} - ${room.ten_phong} - Giường ${bed.so_giuong}`
    : "Chưa xếp giường";
  const isDischarged = treatmentRecord.trang_thai_dieu_tri === "Đã xuất viện";

  return (
    <div>
      <Descriptions
        bordered
        size="small"
        column={2}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="Ngày nhập viện">
          {new Date(treatmentRecord.ngay_nhap_vien).toLocaleString("vi-VN")}
        </Descriptions.Item>
        <Descriptions.Item label="Bác sĩ phụ trách">
          {treatmentRecord.bac_si.tai_khoan.ho_ten}
        </Descriptions.Item>
        <Descriptions.Item label="Vị trí" span={2}>
          {location}
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái điều trị">
          <Tag color={isDischarged ? "success" : "blue"}>
            {treatmentRecord.trang_thai_dieu_tri}
          </Tag>
        </Descriptions.Item>
        {isDischarged && (
          <>
            <Descriptions.Item label="Ngày xuất viện">
              {new Date(treatmentRecord.ngay_xuat_vien).toLocaleString("vi-VN")}
            </Descriptions.Item>
            <Descriptions.Item label="Chẩn đoán xuất viện">
              {dischargeDiagnosis || (
                <Text type="secondary" italic>
                  (Chưa cập nhật)
                </Text>
              )}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>

      <Title level={5}>Phiếu theo dõi</Title>
      <Space style={{ marginBottom: 16 }}>
        {!isDischarged &&
          !isRecordCancelled &&
          can("inpatient.note.create") && (
            <Button onClick={handleAddNote} type="primary">
              Thêm Phiếu theo dõi
            </Button>
          )}
        {!isDischarged &&
          !isRecordCancelled &&
          can("inpatient.record.update") && (
            <Button onClick={showDischargeModal}>Tạo lệnh xuất viện</Button>
          )}
      </Space>
      <Table
        columns={noteColumns}
        dataSource={treatmentRecord.phieu_theo_doi_noi_tru}
        rowKey="id_phieu"
        size="small"
      />

      <Modal
        title="Thêm Phiếu theo dõi mới"
        open={isNoteModalVisible}
        onOk={handleNoteOk}
        onCancel={() => setIsNoteModalVisible(false)}
        width={624}
        okText="Lưu"
        cancelText="Huỷ"
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item name="dien_bien_benh" label="Diễn biến bệnh">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="y_lenh" label="Y lệnh">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="nhip_tim" label="Nhịp tim (l/p)">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nhiet_do" label="Nhiệt độ (°C)">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nhip_tho" label="Nhịp thở (l/p)">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="huyet_ap" label="Huyết áp (mmHg)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tạo lệnh xuất viện"
        open={isDischargeModalVisible}
        onOk={handleDischargeOk}
        onCancel={() => setIsDischargeModalVisible(false)}
        width={624}
        okText="Xác nhận xuất viện"
        cancelText="Huỷ"
      >
        <Form form={dischargeForm} layout="vertical">
          <Form.Item
            name="ngay_xuat_vien"
            label="Ngày giờ xuất viện"
            rules={[
              { required: true, message: "Vui lòng chọn ngày xuất viện" },
            ]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="chan_doan_xuat_vien"
            label="Chẩn đoán xuất viện"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập chẩn đoán khi xuất viện",
              },
            ]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {viewingNote && (
              <Modal
                title={`Chi tiết Phiếu theo dõi (${new Date(
                  viewingNote.thoi_gian_tao
                ).toLocaleString("vi-VN")})`}
                open={isNoteDetailModalVisible}
                onCancel={() => setIsNoteDetailModalVisible(false)}
                width={624}
                footer={            <Button onClick={() => setIsNoteDetailModalVisible(false)}>
              Đóng
            </Button>
          }
        >
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nhân viên thực hiện">
              {viewingNote.nhan_vien?.ho_ten || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Diễn biến bệnh">
              {viewingNote.dien_bien_benh}
            </Descriptions.Item>
            <Descriptions.Item label="Y lệnh">
              {viewingNote.y_lenh}
            </Descriptions.Item>
            <Descriptions.Item label="Nhịp tim">
              {viewingNote.nhip_tim ? `${viewingNote.nhip_tim} lần/phút` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Nhiệt độ">
              {viewingNote.nhiet_do ? `${viewingNote.nhiet_do} °C` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Huyết áp">
              {viewingNote.huyet_ap || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Nhịp thở">
              {viewingNote.nhip_tho ? `${viewingNote.nhip_tho} lần/phút` : "-"}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </div>
  );
};

export default InpatientTreatmentTab;
