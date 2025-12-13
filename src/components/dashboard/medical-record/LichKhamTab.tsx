"use client";

import { useState, useEffect, useCallback } from "react";
import {
  message,
  Button,
  Tag,
  Typography,
  Table,
  Space,
  Modal,
  Form,
  DatePicker,
  Select,
  Input,
  InputNumber,
  Descriptions,
} from "antd";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import dayjs from "dayjs";

const { Option } = Select;

const LichKhamTab = ({
  record_id,
  patient_id,
  record_status,
  record_type,
  onConclude,
}: {
  record_id: number;
  patient_id: string;
  record_status: string;
  record_type: string;
  onConclude: (appointment: any) => void;
}) => {
  const { user, can } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isAdmissionModalVisible, setIsAdmissionModalVisible] = useState(false);

  const [editingAppointment, setEditingAppointment] = useState<any | null>(
    null
  );
  const [viewingAppointment, setViewingAppointment] = useState<any | null>(
    null
  );
  const [doctors, setDoctors] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [isFindingDoctors, setIsFindingDoctors] = useState(false);

  const [editForm] = Form.useForm();
  const [admissionForm] = Form.useForm();

  const appointmentTime = Form.useWatch("thoi_gian_kham", editForm);
  const isRecordCancelled = record_status === "Đã huỷ";

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lich_kham")
      .select(
        "*, bac_si:id_bac_si_phu_trach(tai_khoan!id_bac_si(ho_ten)), phong_kham:id_phong_kham(ten_phong_kham), ho_so_benh_an!id_ho_so(chan_doan(benh(id_benh, ten_benh)))"
      )
      .eq("id_ho_so", record_id)
      .order("thoi_gian_kham", { ascending: false });

    if (error) {
      message.error("Lỗi khi tải lịch sử khám: " + error.message);
    } else {
      setAppointments(data);
    }
    setLoading(false);
  }, [record_id]);

  const fetchInitialData = useCallback(async () => {
    const { data: doctorsData } = await supabase
      .from("bac_si")
      .select("id_bac_si, tai_khoan!inner(ho_ten)");
    if (doctorsData) setDoctors(doctorsData);
    const { data: clinicsData } = await supabase.from("phong_kham").select("*");
    if (clinicsData) setClinics(clinicsData);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchInitialData();
  }, [fetchAppointments, fetchInitialData]);

  useEffect(() => {
    const getShiftFromTime = (time: dayjs.Dayjs): string | null => {
      const hour = time.hour();
      if (hour >= 7 && hour < 12) return "Sáng";
      if (hour >= 13 && hour < 17) return "Chiều";
      if (hour >= 18 && hour < 21) return "Tối";
      return null;
    };

    const findAvailableDoctors = async () => {
      if (!appointmentTime) {
        setAvailableDoctors([]);
        return;
      }
      setIsFindingDoctors(true);
      const date = appointmentTime.format("YYYY-MM-DD");
      const shift = getShiftFromTime(dayjs(appointmentTime));

      if (!shift) {
        setAvailableDoctors([]);
        setIsFindingDoctors(false);
        return;
      }

      const { data: dutyData } = await supabase
        .from("lich_truc")
        .select("id_bac_si")
        .eq("ngay_truc", date)
        .eq("ca_truc", shift);
      if (!dutyData || dutyData.length === 0) {
        setAvailableDoctors([]);
        setIsFindingDoctors(false);
        return;
      }

      const doctorIds = dutyData.map((d) => d.id_bac_si);
      const { data: doctorsData } = await supabase
        .from("bac_si")
        .select(
          "id_bac_si, tai_khoan!id_bac_si(ho_ten), chuyen_khoa!id_chuyen_khoa(ten_chuyen_khoa)"
        )
        .in("id_bac_si", doctorIds);

      if (doctorsData) setAvailableDoctors(doctorsData);
      setIsFindingDoctors(false);
    };

    findAvailableDoctors();
    editForm.setFieldsValue({ id_bac_si: null });
  }, [appointmentTime, editForm]);

  const handleEdit = (appointment: any | null) => {
    setEditingAppointment(appointment);
    if (appointment) {
      editForm.setFieldsValue({
        ...appointment,
        id_bac_si: appointment.id_bac_si_phu_trach,
        thoi_gian_kham: dayjs(appointment.thoi_gian_kham),
      });
    } else {
      editForm.resetFields();
    }
    setIsEditModalVisible(true);
  };

  const handleViewDetails = (appointment: any) => {
    setViewingAppointment(appointment);
    setIsDetailModalVisible(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();

      const submissionData = {
        id_benh_nhan: patient_id,
        id_bac_si_phu_trach: values.id_bac_si,
        id_phong_kham: values.id_phong_kham,
        ly_do_kham: values.ly_do_kham,
        chi_phi_kham: values.chi_phi_kham,
        thoi_gian_kham: dayjs(values.thoi_gian_kham).toISOString(),
        id_ho_so: record_id,
        trang_thai: "Đã Hẹn",
        id_nguoi_dat_lich: user?.id,
        loai_lich_kham: "Khám bệnh",
      };

      let error;
      if (editingAppointment) {
        const { id_nguoi_dat_lich, ...updateData } = submissionData;
        const { error: updateError } = await supabase
          .from("lich_kham")
          .update(updateData)
          .eq("id_lich_kham", editingAppointment.id_lich_kham);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("lich_kham")
          .insert([submissionData]);
        error = insertError;
      }
      if (error) throw error;
      message.success(
        editingAppointment
          ? "Cập nhật thành công!"
          : "Tạo lịch khám mới thành công!"
      );
      setIsEditModalVisible(false);
      fetchAppointments();
    } catch (info) {
      console.log("Validate Failed:", info);
    }
  };

  const handleCancelAppointment = () => {
    Modal.confirm({
      title: "Xác nhận huỷ lịch khám",
      content: `Bạn có chắc muốn huỷ lịch khám #${editingAppointment.id_lich_kham}?`,
      okText: "Xác nhận huỷ",
      cancelText: "Không",
      onOk: async () => {
        const { error } = await supabase
          .from("lich_kham")
          .update({ trang_thai: "Đã Huỷ" })
          .eq("id_lich_kham", editingAppointment.id_lich_kham);
        if (error) {
          message.error(`Lỗi khi huỷ lịch khám: ${error.message}`);
        } else {
          message.success("Huỷ lịch khám thành công.");
          setIsEditModalVisible(false);
          fetchAppointments();
        }
      },
    });
  };

  const showAdmissionModal = () => {
    admissionForm.resetFields();
    const isCurrentUserDoctor = doctors.some((d) => d.id_bac_si === user?.id);
    if (isCurrentUserDoctor) {
      admissionForm.setFieldsValue({ id_bac_si_phu_trach: user?.id });
    }
    setIsAdmissionModalVisible(true);
  };

  const handleAdmissionOk = async () => {
    try {
      const values = await admissionForm.validateFields();

      // 1. Get Note Type ID
      const { data: noteType } = await supabase
        .from("loai_ghi_chu")
        .select("id_loai_ghi_chu")
        .eq("ten_loai_ghi_chu", "Chẩn đoán nhập viện")
        .single();
      if (!noteType)
        throw new Error(
          'Không tìm thấy loại ghi chú "Chẩn đoán nhập viện". Vui lòng liên hệ quản trị viên.'
        );

      // 2. Call RPC to admit patient (Parameter p_chan_doan removed as per new DB design)
      const { error } = await supabase.rpc("admit_patient_to_inpatient", {
        p_ho_so_id: record_id,
        p_bac_si_id: values.id_bac_si_phu_trach,
        p_ngay_nhap_vien: new Date().toISOString(),
      });

      if (error) throw error;

      // 3. Create Medical Note for Admission Diagnosis
      const { error: noteError } = await supabase.from("ghi_chu_y_te").insert({
        id_ho_so: record_id,
        id_loai_ghi_chu: noteType.id_loai_ghi_chu,
        id_nguoi_tao: user?.id,
        noi_dung_ghi_chu: values.chan_doan_nhap_vien,
      });

      if (noteError) throw noteError;

      message.success(
        "Tạo lệnh nhập viện thành công! Bệnh án đã được chuyển thành hồ sơ nội trú."
      );
      setIsAdmissionModalVisible(false);
      router.refresh();
    } catch (err: any) {
      message.error("Lỗi khi tạo lệnh nhập viện: " + err.message);
    }
  };

  const columns = [
    {
      title: "Ngày khám",
      dataIndex: "thoi_gian_kham",
      key: "thoi_gian_kham",
      width: 180,
      render: (ts: string) => (ts ? new Date(ts).toLocaleString("vi-VN") : "-"),
    },
    {
      title: "Bác sĩ",
      dataIndex: ["bac_si", "tai_khoan", "ho_ten"],
      key: "bac_si",
      width: 200,
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 200 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "Lý do khám",
      dataIndex: "ly_do_kham",
      key: "ly_do_kham",
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 250 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai",
      key: "trang_thai",
      width: 120,
      render: (status: string) => {
        let color = "default";
        if (status === "Đã Khám") color = "success";
        else if (status === "Đã Huỷ") color = "error";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "action",
      fixed: "right" as const,
      width: 220,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => handleViewDetails(record)}>
            Chi tiết
          </Button>
          {!isRecordCancelled && (
            <>
              {record.trang_thai === "Đã Hẹn" && (
                <Button size="small" onClick={() => handleEdit(record)}>
                  Cập nhật
                </Button>
              )}
              {((can("appointment.result.update.assigned") &&
                record.id_bac_si_phu_trach === user?.id) ||
                can("appointment.update.all")) &&
                record.trang_thai === "Đã Hẹn" && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => onConclude(record)}
                  >
                    Kết luận & Kê đơn
                  </Button>
                )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          onClick={() => handleEdit(null)}
          type="primary"
          disabled={isRecordCancelled}
        >
          Tạo Lịch khám mới
        </Button>
        {record_type === "Ngoại trú" &&
          can("inpatient.admission.create") &&
          !isRecordCancelled && (
            <Button onClick={showAdmissionModal}>Tạo lệnh nhập viện</Button>
          )}
      </Space>
      <Table
        columns={columns}
        dataSource={appointments}
        loading={loading}
        rowKey="id_lich_kham"
        size="small"
      />

      {viewingAppointment && (
        <Modal
          title={`Chi tiết Lịch khám #${viewingAppointment.id_lich_kham}`}
          open={isDetailModalVisible}
          onCancel={() => setIsDetailModalVisible(false)}
          width={624}
          footer={
            <Button onClick={() => setIsDetailModalVisible(false)}>Đóng</Button>
          }
        >
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Trạng thái">
              <Tag>{viewingAppointment.trang_thai}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian khám">
              {new Date(viewingAppointment.thoi_gian_kham).toLocaleString(
                "vi-VN"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Bác sĩ">
              {viewingAppointment.bac_si?.tai_khoan?.ho_ten}
            </Descriptions.Item>
            <Descriptions.Item label="Phòng khám">
              {viewingAppointment.phong_kham?.ten_phong_kham}
            </Descriptions.Item>
            <Descriptions.Item label="Lý do khám">
              {viewingAppointment.ly_do_kham}
            </Descriptions.Item>
            <Descriptions.Item label="Chẩn đoán">
              {viewingAppointment.ho_so_benh_an?.chan_doan
                ?.map((d: any) => d.benh.ten_benh)
                .join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tái khám">
              {viewingAppointment.ngay_tai_kham
                ? new Date(viewingAppointment.ngay_tai_kham).toLocaleDateString(
                    "vi-VN"
                  )
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chi phí khám">
              {viewingAppointment.chi_phi_kham
                ? `${viewingAppointment.chi_phi_kham.toLocaleString(
                    "vi-VN"
                  )} VND`
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}

      <Modal
        title={
          editingAppointment
            ? `Cập nhật Lịch khám #${editingAppointment.id_lich_kham}`
            : "Tạo Lịch khám mới"
        }
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsEditModalVisible(false)}>
            Đóng
          </Button>,
          editingAppointment && (
            <Button key="cancel" danger onClick={handleCancelAppointment}>
              Huỷ lịch
            </Button>
          ),
          <Button key="submit" type="primary" onClick={handleEditOk}>
            Lưu
          </Button>,
        ]}
        width={720}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="ly_do_kham"
            label="Lý do khám"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="thoi_gian_kham"
            label="Thời gian khám"
            rules={[{ required: true }]}
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
          <Form.Item
            name="id_bac_si"
            label="Bác sĩ"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Chọn bác sĩ có lịch trực..."
              loading={isFindingDoctors}
              disabled={!appointmentTime}
            >
              {availableDoctors.map((d) => (
                <Option
                  key={d.id_bac_si}
                  value={d.id_bac_si}
                >{`${d.tai_khoan.ho_ten} (${d.chuyen_khoa.ten_chuyen_khoa})`}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="id_phong_kham"
            label="Phòng khám"
            rules={[{ required: true }]}
          >
            <Select placeholder="Chọn phòng khám">
              {clinics.map((c) => (
                <Option key={c.id_phong_kham} value={c.id_phong_kham}>
                  {c.ten_phong_kham}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="chi_phi_kham" label="Chi phí khám (VND)">
            <InputNumber<number>
              style={{ width: "100%" }}
              placeholder="Nhập chi phí"
              min={0}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) =>
                value ? parseInt(value.replace(/\$\s?|(,*)/g, "")) : 0
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Admission Modal */}
      <Modal
        title="Tạo lệnh nhập viện"
        open={isAdmissionModalVisible}
        onOk={handleAdmissionOk}
        onCancel={() => setIsAdmissionModalVisible(false)}
        width={624}
        okText="Xác nhận Nhập viện"
        cancelText="Huỷ"
      >
        <Form form={admissionForm} layout="vertical">
          <Form.Item
            name="chan_doan_nhap_vien"
            label="Chẩn đoán nhập viện"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập chẩn đoán khi nhập viện",
              },
            ]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="id_bac_si_phu_trach"
            label="Bác sĩ phụ trách"
            rules={[
              { required: true, message: "Vui lòng chọn bác sĩ phụ trách" },
            ]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Chọn bác sĩ"
            >
              {doctors.map((d) => (
                <Option key={d.id_bac_si} value={d.id_bac_si}>
                  {d.tai_khoan.ho_ten}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LichKhamTab;
