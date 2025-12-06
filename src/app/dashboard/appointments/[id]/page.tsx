"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  message,
  Spin,
  Descriptions,
  Button,
  Tag,
  Tabs,
  Row,
  Col,
  Typography,
  Table,
  Space,
  Modal,
  Form,
  DatePicker,
  Select,
  Input,
  InputNumber,
  Image,
  List,
  Divider,
  Alert,
} from "antd";
import {
  MinusCircleOutlined,
  PlusOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "0 VND";
  return value.toLocaleString("vi-VN") + " VND";
};

// ==============================================
// Lịch sử Khám bệnh Tab Component
// ==============================================
const LichKhamTab = ({
  record_id,
  patient_id,
  record_status,
  record_type,
  onConclude, // Add onConclude prop
}: {
  record_id: number;
  patient_id: string;
  record_status: string;
  record_type: string;
  onConclude: (appointment: any) => void; // Define prop type
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
        width={600}
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

// ==============================================
// Chỉ định CLS Tab Component
// ==============================================
const ChiDinhClsTab = ({
  record_id,
  record_status,
}: {
  record_id: number;
  record_status: string;
}) => {
  const { user, can, profile } = useAuth();
  const [clsOrders, setClsOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clsServices, setClsServices] = useState<any[]>([]);
  const [form] = Form.useForm();
  const isRecordCancelled = record_status === "Đã huỷ";

  const getStatusTag = (status: string) => {
    switch (status) {
      case "Chờ thực hiện":
        return <Tag color="blue">Chờ thực hiện</Tag>;
      case "Đã lấy mẫu":
        return <Tag color="cyan">Đã lấy mẫu</Tag>;
      case "Đang xử lý":
        return <Tag color="orange">Đang xử lý</Tag>;
      case "Hoàn thành":
        return <Tag color="green">Hoàn thành</Tag>;
      case "Đã huỷ":
        return <Tag color="red">Đã huỷ</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const fetchClsOrders = useCallback(async () => {
    setLoading(true);
    const { data: appointmentData } = await supabase
      .from("lich_kham")
      .select("id_lich_kham")
      .eq("id_ho_so", record_id);
    if (!appointmentData || appointmentData.length === 0) {
      setClsOrders([]);
      setLoading(false);
      return;
    }
    const appointmentIds = appointmentData.map((a) => a.id_lich_kham);

    const { data, error } = await supabase
      .from("chi_dinh_cls")
      .select(
        "*, dich_vu_cls:id_dich_vu(ten_dich_vu), bac_si:id_bac_si_chi_dinh(id_bac_si, tai_khoan!id_bac_si(ho_ten)), ket_qua_cls(*, ky_thuat_vien:id_ky_thuat_vien(tai_khoan!inner(ho_ten))) "
      )
      .in("id_lich_kham", appointmentIds)
      .order("thoi_gian_tao_chi_dinh", { ascending: false });
    if (error) {
      message.error("Lỗi khi tải danh sách chỉ định CLS: " + error.message);
    } else {
      setClsOrders(data);
    }
    setLoading(false);
  }, [record_id]);

  const fetchInitialData = useCallback(async () => {
    const { data: appData } = await supabase
      .from("lich_kham")
      .select("id_lich_kham, thoi_gian_kham")
      .eq("id_ho_so", record_id);
    if (appData) setAppointments(appData);

    const { data: serviceData } = await supabase
      .from("dich_vu_cls")
      .select("*");
    if (serviceData) setClsServices(serviceData);
  }, [record_id]);

  useEffect(() => {
    fetchClsOrders();
    fetchInitialData();
  }, [fetchClsOrders, fetchInitialData]);

  const handleAddNew = () => {
    form.resetFields();
    form.setFieldsValue({ id_bac_si_chi_dinh: user?.id });
    setIsCreateModalVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await form.validateFields();
      const { error } = await supabase.from("chi_dinh_cls").insert([values]);
      if (error) throw error;
      message.success("Tạo chỉ định CLS thành công!");
      setIsCreateModalVisible(false);
      fetchClsOrders();
    } catch (err) {
      console.log("Validate failed:", err);
    }
  };

  const handleViewResult = (record: any) => {
    setSelectedOrder(record);
    setIsResultModalVisible(true);
  };

  const handleCancelOrder = (record: any) => {
    Modal.confirm({
      title: "Xác nhận huỷ chỉ định",
      content: `Bạn có chắc muốn huỷ chỉ định cho dịch vụ "${record.dich_vu_cls.ten_dich_vu}"?`,
      okText: "Xác nhận huỷ",
      okType: "danger",
      cancelText: "Không",
      onOk: async () => {
        const { error } = await supabase
          .from("chi_dinh_cls")
          .update({ trang_thai_chi_dinh: "Đã huỷ" })
          .eq("id_chi_dinh", record.id_chi_dinh);
        if (error) {
          message.error(`Lỗi khi huỷ chỉ định: ${error.message}`);
        } else {
          message.success("Huỷ chỉ định thành công.");
          fetchClsOrders();
        }
      },
    });
  };

  const columns = [
    {
      title: "Tên dịch vụ",
      dataIndex: ["dich_vu_cls", "ten_dich_vu"],
      key: "dich_vu",
      width: 200,
      render: (text: string) =>
        text ? (
          <Typography.Text
            style={{ maxWidth: 200 }}
            ellipsis={{ tooltip: text }}
          >
            {text}
          </Typography.Text>
        ) : (
          "-"
        ),
    },
    {
      title: "Bác sĩ chỉ định",
      dataIndex: ["bac_si", "tai_khoan", "ho_ten"],
      key: "bac_si",
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai_chi_dinh",
      key: "trang_thai_chi_dinh",
      render: getStatusTag,
    },
    {
      title: "Kết luận",
      dataIndex: ["ket_qua_cls", "ket_luan"],
      key: "ket_luan",
      render: (text: string) =>
        text ? (
          <Typography.Text
            style={{ maxWidth: 600 }}
            ellipsis={{ tooltip: text }}
          >
            {text}
          </Typography.Text>
        ) : (
          "-"
        ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          {record.trang_thai_chi_dinh === "Hoàn thành" && (
            <Button size="small" onClick={() => handleViewResult(record)}>
              Xem chi tiết
            </Button>
          )}
          {record.trang_thai_chi_dinh === "Chờ thực hiện" &&
            (user?.id === record.bac_si.id_bac_si || can("system.admin")) && (
              <Button
                size="small"
                danger
                onClick={() => handleCancelOrder(record)}
              >
                Huỷ chỉ định
              </Button>
            )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        style={{ marginBottom: 16 }}
        onClick={handleAddNew}
        disabled={isRecordCancelled}
      >
        Tạo Chỉ định mới
      </Button>
      <Table
        columns={columns}
        dataSource={clsOrders}
        loading={loading}
        rowKey="id_chi_dinh"
        size="small"
      />

      {/* Create Order Modal */}
      <Modal
        title="Tạo Chỉ định Cận lâm sàng"
        open={isCreateModalVisible}
        onOk={handleCreateOk}
        onCancel={() => setIsCreateModalVisible(false)}
        okText="Tạo"
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="id_lich_kham"
            label="Buổi khám"
            rules={[{ required: true }]}
          >
            <Select placeholder="Chọn buổi khám để gắn chỉ định">
              {appointments.map((a) => (
                <Option key={a.id_lich_kham} value={a.id_lich_kham}>{`#${
                  a.id_lich_kham
                } - ${new Date(a.thoi_gian_kham).toLocaleString(
                  "vi-VN"
                )}`}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="id_dich_vu"
            label="Dịch vụ CLS"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Chọn dịch vụ cận lâm sàng"
            >
              {clsServices.map((s) => (
                <Option key={s.id_dich_vu} value={s.id_dich_vu}>
                  {s.ten_dich_vu}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="id_bac_si_chi_dinh" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="Bác sĩ chỉ định">
            <Input value={profile?.ho_ten || user?.email} disabled />
          </Form.Item>
          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Result Modal */}
      {selectedOrder && selectedOrder.ket_qua_cls && (
        <Modal
          title={`Chi tiết kết quả cho CĐ #${selectedOrder.id_chi_dinh}`}
          open={isResultModalVisible}
          onCancel={() => setIsResultModalVisible(false)}
          footer={
            <Button onClick={() => setIsResultModalVisible(false)}>Đóng</Button>
          }
          width={800}
        >
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Dịch vụ">
              {selectedOrder.dich_vu_cls.ten_dich_vu}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian tạo chỉ định">
              {new Date(selectedOrder.thoi_gian_tao_chi_dinh).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian trả kết quả">
              {new Date(
                selectedOrder.ket_qua_cls.thoi_gian_tra_ket_qua
              ).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="KTV thực hiện">
              {selectedOrder.ket_qua_cls.ky_thuat_vien?.tai_khoan?.ho_ten ||
                "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Kết luận">
              {selectedOrder.ket_qua_cls.ket_luan || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chỉ số xét nghiệm">
              <Input.TextArea
                readOnly
                autoSize={{ minRows: 4 }}
                value={
                  selectedOrder.ket_qua_cls.chi_so_xet_nghiem
                    ? JSON.stringify(
                        selectedOrder.ket_qua_cls.chi_so_xet_nghiem,
                        null,
                        2
                      )
                    : "Không có"
                }
                spellCheck={false}
              />
            </Descriptions.Item>
            <Descriptions.Item label="File kết quả">
              {selectedOrder.ket_qua_cls.duong_dan_file_ket_qua ? (
                <Image
                  width={200}
                  src={`https://wkyyexkbgzahstfebtfh.supabase.co/storage/v1/object/public/cls_results/${selectedOrder.ket_qua_cls.duong_dan_file_ket_qua}`}
                  alt="File kết quả"
                />
              ) : (
                "Không có file đính kèm"
              )}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </div>
  );
};

// ==============================================
// Đơn thuốc Tab Component
// ==============================================
const DonThuocTab = ({ record_id }: { record_id: number }) => {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    // First, get all appointment IDs for the current medical record
    const { data: appointmentData, error: appointmentError } = await supabase
      .from("lich_kham")
      .select("id_lich_kham")
      .eq("id_ho_so", record_id);

    if (appointmentError || !appointmentData || appointmentData.length === 0) {
      if (appointmentError)
        message.error(
          "Lỗi khi tải lịch khám của hồ sơ: " + appointmentError.message
        );
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    const appointmentIds = appointmentData.map((a) => a.id_lich_kham);

    // Then, get prescriptions for those appointments
    const { data, error } = await supabase
      .from("don_thuoc")
      .select(
        `
                *,
                lich_kham:id_lich_kham(
                    bac_si:id_bac_si_phu_trach(
                        tai_khoan!inner(ho_ten)
                    )
                ),
                chi_tiet_don_thuoc(
                    *,
                    thuoc:id_thuoc(
                        ten_thuoc,
                        don_vi_tinh
                    )
                )
            `
      )
      .in("id_lich_kham", appointmentIds)
      .order("thoi_gian_ke_don", { ascending: false });

    if (error) {
      message.error("Lỗi khi tải danh sách đơn thuốc: " + error.message);
    } else {
      setPrescriptions(data || []);
    }
    setLoading(false);
  }, [record_id]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const expandedRowRender = (record: any) => {
    const detailColumns = [
      {
        title: "Tên thuốc",
        dataIndex: ["thuoc", "ten_thuoc"],
        key: "ten_thuoc",
      },
      { title: "Số lượng", dataIndex: "so_luong", key: "so_luong" },
      {
        title: "Đơn vị",
        dataIndex: ["thuoc", "don_vi_tinh"],
        key: "don_vi_tinh",
      },
      { title: "Liều dùng", dataIndex: "lieu_dung", key: "lieu_dung" },
    ];
    return (
      <Table
        columns={detailColumns}
        dataSource={record.chi_tiet_don_thuoc}
        pagination={false}
        rowKey="id_chi_tiet_don_thuoc"
      />
    );
  };

  const mainColumns = [
    {
      title: "Mã đơn",
      dataIndex: "id_don_thuoc",
      key: "id_don_thuoc",
      render: (id: number) => `#${id}`,
    },
    {
      title: "Ngày kê đơn",
      dataIndex: "thoi_gian_ke_don",
      key: "thoi_gian_ke_don",
      render: (ts: string) => new Date(ts).toLocaleString("vi-VN"),
    },
    {
      title: "Bác sĩ kê đơn",
      dataIndex: ["lich_kham", "bac_si", "tai_khoan", "ho_ten"],
      key: "bac_si",
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai_don_thuoc",
      key: "trang_thai",
      render: (status: string) => <Tag>{status}</Tag>,
    },
  ];

  return (
    <Table
      columns={mainColumns}
      dataSource={prescriptions}
      loading={loading}
      rowKey="id_don_thuoc"
      expandable={{ expandedRowRender }}
      size="small"
    />
  );
};

// ==============================================
// Điều trị nội trú Tab Component
// ==============================================
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
          footer={
            <Button onClick={() => setIsNoteDetailModalVisible(false)}>
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

// ==============================================
// Main Page Component
// ==============================================
const MedicalRecordDetailPage = ({ params }: { params: { id: string } }) => {
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInvoiceModalVisible, setIsInvoiceModalVisible] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Diagnosis Management State
  const [diseases, setDiseases] = useState<any[]>([]);
  const [noteTypes, setNoteTypes] = useState<any[]>([]); // New state for Note Types
  const [isDiagnosisModalVisible, setIsDiagnosisModalVisible] = useState(false);
  const [isAllDiagnosesModalVisible, setIsAllDiagnosesModalVisible] =
    useState(false);
  const [isConclusionModalVisible, setIsConclusionModalVisible] =
    useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(
    null
  );
  const [diagnosisForm] = Form.useForm();
  const [conclusionForm] = Form.useForm();
  const [noteForm] = Form.useForm(); // Form for Notes
  const [updatingDiagnosis, setUpdatingDiagnosis] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);

  // Note Management State
  const [notesList, setNotesList] = useState<any[]>([]);
  const [noteViewMode, setNoteViewMode] = useState<"list" | "create">("list");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);

  // Note Detail Modal State
  const [viewingMedicalNote, setViewingMedicalNote] = useState<any | null>(
    null
  );
  const [isMedicalNoteDetailModalVisible, setIsMedicalNoteDetailModalVisible] =
    useState(false);
  const [recentNotes, setRecentNotes] = useState<any[]>([]); // For display in Descriptions (limited)
  const [allRecordNotes, setAllRecordNotes] = useState<any[]>([]); // For 'All Notes' modal (unlimited)
  const [isAllNotesModalVisible, setIsAllNotesModalVisible] = useState(false);
  const [conclusionActiveTab, setConclusionActiveTab] = useState("1"); // Track active tab in Conclusion Modal

  // Filter States for All Notes Modal
  const [filterNoteType, setFilterNoteType] = useState<number | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<
    [dayjs.Dayjs, dayjs.Dayjs] | null
  >(null);
  const [filterCreator, setFilterCreator] = useState("");

  const filteredNotes = useMemo(() => {
    return allRecordNotes.filter((note) => {
      // Filter by Note Type
      if (filterNoteType && note.id_loai_ghi_chu !== filterNoteType)
        return false;

      // Filter by Creator Name
      if (
        filterCreator &&
        !note.nguoi_tao?.ho_ten
          .toLowerCase()
          .includes(filterCreator.toLowerCase())
      )
        return false;

      // Filter by Date Range
      if (filterDateRange) {
        const noteDate = dayjs(note.thoi_gian_tao);
        // Check if date is within range (inclusive)
        if (
          noteDate.isBefore(filterDateRange[0].startOf("day")) ||
          noteDate.isAfter(filterDateRange[1].endOf("day"))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allRecordNotes, filterNoteType, filterCreator, filterDateRange]);

  const router = useRouter();
  const { can, user } = useAuth();

  const fetchDisplayNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("ghi_chu_y_te")
      .select(
        "*, loai_ghi_chu:id_loai_ghi_chu(ten_loai_ghi_chu), nguoi_tao:id_nguoi_tao(ho_ten)"
      )
      .eq("id_ho_so", params.id)
      .order("thoi_gian_tao", { ascending: false })
      .limit(3); // Limit for display

    if (error) {
      console.error("Error fetching display notes:", error);
    } else if (data) {
      setRecentNotes(data);
    }
  }, [params.id]);

  const fetchAllRecordNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("ghi_chu_y_te")
      .select(
        "*, loai_ghi_chu:id_loai_ghi_chu(ten_loai_ghi_chu), nguoi_tao:id_nguoi_tao(ho_ten)"
      )
      .eq("id_ho_so", params.id)
      .order("thoi_gian_tao", { ascending: false });

    if (error) {
      console.error("Error fetching all record notes:", error);
    } else if (data) {
      setAllRecordNotes(data);
    }
  }, [params.id]);

  const fetchNotes = useCallback(
    async (specificAppointmentId?: number) => {
      if (!record?.id_ho_so) return;
      setLoadingNotes(true);

      let query = supabase
        .from("ghi_chu_y_te")
        .select(
          `
              *,
              loai_ghi_chu:id_loai_ghi_chu(ten_loai_ghi_chu),
              nguoi_tao:id_nguoi_tao(ho_ten)
          `
        )
        .eq("id_ho_so", record.id_ho_so)
        .order("thoi_gian_tao", { ascending: false });

      // Prioritize the specific ID passed directly, otherwise fall back to state
      const activeAppointmentId =
        specificAppointmentId ?? editingAppointment?.id_lich_kham;

      if (activeAppointmentId) {
        query = query.eq("id_lich_kham", activeAppointmentId);
      }

      const { data, error } = await query;

      if (error) {
        message.error("Lỗi tải ghi chú: " + error.message);
      } else {
        setNotesList(data || []);
      }
      setLoadingNotes(false);
    },
    [record?.id_ho_so, editingAppointment?.id_lich_kham]
  );

  const classifiedDiagnoses = useMemo(() => {
    if (!record?.chan_doan) return { main: [], others: [] };
    const main = record.chan_doan.filter(
      (d: any) => d.loai_chan_doan === "Bệnh chính"
    );
    const others = record.chan_doan.filter(
      (d: any) => d.loai_chan_doan !== "Bệnh chính"
    );
    return { main, others };
  }, [record]);

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ho_so_benh_an")
      .select(
        `*,
            benh_nhan:id_benh_nhan(*),
            chan_doan(
                loai_chan_doan,
                benh:id_benh(id_benh, ten_benh)
            )
        `
      )
      .eq("id_ho_so", params.id)
      .single();

    if (error || !data) {
      message.error("Không thể tải thông tin hồ sơ.");
      router.push("/dashboard/appointments");
    } else {
      // Fetch total notes count separately
      const { count, error: countError } = await supabase
        .from("ghi_chu_y_te")
        .select("id_ghi_chu", { count: "exact", head: true })
        .eq("id_ho_so", params.id);

      if (countError) {
        console.error("Error fetching notes count:", countError);
      }

      setRecord({ ...data, notes_count: count || 0 });
    }
    setLoading(false);
  }, [params.id, router]);
  const fetchInitialData = useCallback(async () => {
    const { data: diseasesData } = await supabase.from("benh").select("*");
    if (diseasesData) setDiseases(diseasesData);

    const { data: medicinesData } = await supabase
      .from("thuoc")
      .select("*")
      .gt("so_luong_ton_kho", 0);
    if (medicinesData) setMedicines(medicinesData);

    const { data: noteTypesData } = await supabase
      .from("loai_ghi_chu")
      .select("*");
    if (noteTypesData) setNoteTypes(noteTypesData);
  }, []);

  useEffect(() => {
    fetchRecord();
    fetchInitialData();
    fetchDisplayNotes(); // Fetch limited notes for display
    fetchAllRecordNotes(); // Fetch all notes for the modal
  }, [fetchRecord, fetchInitialData, fetchDisplayNotes, fetchAllRecordNotes]);

  const handleEditDiagnosis = () => {
    const currentDiagnoses =
      record?.chan_doan?.map((d: any) => ({
        id_benh: d.benh.id_benh,
        loai_chan_doan: d.loai_chan_doan,
      })) || [];
    diagnosisForm.setFieldsValue({ diagnoses: currentDiagnoses });
    setIsDiagnosisModalVisible(true);
  };

  const handleSaveDiagnoses = async () => {
    try {
      setUpdatingDiagnosis(true);
      const values = await diagnosisForm.validateFields();
      const newDiagnoses = values.diagnoses || [];

      // 1. Delete existing diagnoses for this record
      const { error: deleteError } = await supabase
        .from("chan_doan")
        .delete()
        .eq("id_ho_so", record.id_ho_so);

      if (deleteError) throw deleteError;

      // 2. Insert new diagnoses
      if (newDiagnoses.length > 0) {
        const insertData = newDiagnoses.map((d: any) => ({
          id_ho_so: record.id_ho_so,
          id_benh: d.id_benh,
          loai_chan_doan: d.loai_chan_doan,
        }));

        const { error: insertError } = await supabase
          .from("chan_doan")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      message.success("Cập nhật chẩn đoán thành công!");
      setIsDiagnosisModalVisible(false);
      fetchRecord(); // Refresh data
    } catch (err: any) {
      message.error("Lỗi cập nhật chẩn đoán: " + err.message);
    } finally {
      setUpdatingDiagnosis(false);
    }
  };

  const handleConclude = (appointment: any) => {
    setEditingAppointment(appointment);

    // Prepare diagnosis data for the form
    const currentDiagnoses =
      record?.chan_doan?.map((d: any) => ({
        id_benh: d.benh.id_benh,
        loai_chan_doan: d.loai_chan_doan,
      })) || [];

    conclusionForm.setFieldsValue({
      ngay_tai_kham: appointment.ngay_tai_kham
        ? dayjs(appointment.ngay_tai_kham)
        : null,
      diagnoses: currentDiagnoses, // Fill the diagnosis list
      prescription: [],
    });
    setNoteViewMode("list");
    // Pass ID directly to avoid stale state issue
    fetchNotes(appointment.id_lich_kham);
    setConclusionActiveTab("1");
    setIsConclusionModalVisible(true);
  };

  const handleConcludeOk = async () => {
    try {
      const values = await conclusionForm.validateFields();

      // 1. Sync Diagnoses (Delete old, Insert new) - Similar to handleSaveDiagnoses
      const newDiagnoses = values.diagnoses || [];
      // Delete existing for this record
      const { error: deleteError } = await supabase
        .from("chan_doan")
        .delete()
        .eq("id_ho_so", record.id_ho_so);
      if (deleteError) throw deleteError;

      // Insert new
      if (newDiagnoses.length > 0) {
        const insertData = newDiagnoses.map((d: any) => ({
          id_ho_so: record.id_ho_so,
          id_benh: d.id_benh,
          loai_chan_doan: d.loai_chan_doan,
        }));
        const { error: insertError } = await supabase
          .from("chan_doan")
          .insert(insertData);
        if (insertError) throw insertError;
      }

      // 2. Submit Prescription and Conclusion Text
      const cleanedPrescription = (values.prescription || []).filter(
        (p: any) => p && p.id_thuoc && p.so_luong && p.lieu_dung
      );
      const { error } = await supabase.rpc(
        "submit_conclusion_and_prescription",
        {
          p_lich_kham_id: editingAppointment.id_lich_kham,
          p_ket_luan: "", // Removed from form, pass empty string as it's now a medical note
          p_benh_ids: [], // We handled diagnosis manually above
          p_medicines: cleanedPrescription,
          p_ngay_tai_kham: values.ngay_tai_kham
            ? dayjs(values.ngay_tai_kham).format("YYYY-MM-DD")
            : null,
        }
      );
      if (error) throw error;

      message.success("Đã lưu kết luận, chẩn đoán và đơn thuốc.");
      setIsConclusionModalVisible(false);
      fetchRecord();
      fetchDisplayNotes();
      fetchAllRecordNotes();
    } catch (info: any) {
      console.log("Validate Failed:", info);
      message.error(
        "Lỗi: " + (info.message || "Vui lòng kiểm tra lại thông tin.")
      );
    }
  };

  const handleSaveNote = async () => {
    try {
      const values = await noteForm.validateFields();

      console.log("Saving note with values:", values);
      console.log("Current editingAppointment:", editingAppointment);

      // Validate JSON if present
      if (values.du_lieu_cau_truc) {
        try {
          JSON.parse(values.du_lieu_cau_truc);
        } catch (e) {
          throw new Error("Dữ liệu cấu trúc không phải là JSON hợp lệ.");
        }
      }

      const noteData = {
        id_ho_so: record.id_ho_so,
        id_lich_kham: editingAppointment?.id_lich_kham || null,
        id_loai_ghi_chu: values.id_loai_ghi_chu,
        id_nguoi_tao: user?.id,
        noi_dung_ghi_chu: values.noi_dung_ghi_chu,
        du_lieu_cau_truc: values.du_lieu_cau_truc
          ? JSON.parse(values.du_lieu_cau_truc)
          : null,
      };

      if (editingNote) {
        const { error } = await supabase
          .from("ghi_chu_y_te")
          .update(noteData)
          .eq("id_ghi_chu", editingNote.id_ghi_chu);
        if (error) throw error;
        message.success("Cập nhật ghi chú thành công");
      } else {
        const { error } = await supabase.from("ghi_chu_y_te").insert(noteData);
        if (error) throw error;
        message.success("Đã lưu ghi chú y tế.");
      }

      noteForm.resetFields();
      setEditingNote(null);
      // Ensure we fetch notes for the current appointment context if available
      fetchNotes(editingAppointment?.id_lich_kham);
      fetchDisplayNotes(); // Refresh the main list for display
      fetchAllRecordNotes(); // Refresh the list for the 'All Notes' modal
      setNoteViewMode("list");
    } catch (err: any) {
      console.error("Error saving note:", err);
      message.error(
        "Lỗi lưu ghi chú: " + (err.message || "Vui lòng kiểm tra lại thông tin")
      );
    }
  };

  const handleDeleteNote = (note: any) => {
    Modal.confirm({
      title: "Xóa ghi chú",
      content: "Bạn có chắc chắn muốn xóa ghi chú này không?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        const { error } = await supabase
          .from("ghi_chu_y_te")
          .delete()
          .eq("id_ghi_chu", note.id_ghi_chu);
        if (error) {
          message.error("Lỗi khi xóa: " + error.message);
        } else {
          message.success("Đã xóa ghi chú");
          fetchNotes();
        }
      },
    });
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    noteForm.setFieldsValue({
      id_loai_ghi_chu: note.id_loai_ghi_chu,
      noi_dung_ghi_chu: note.noi_dung_ghi_chu,
      du_lieu_cau_truc: note.du_lieu_cau_truc
        ? JSON.stringify(note.du_lieu_cau_truc, null, 2)
        : "",
    });
    setNoteViewMode("create");
  };

  const handleShowInvoice = async () => {
    setIsClosing(true);
    const { data, error } = await supabase.rpc("get_invoice_details", {
      p_ho_so_id: record.id_ho_so,
    });

    if (error) {
      message.error(`Lỗi khi lấy chi tiết hóa đơn: ${error.message}`);
      setIsClosing(false);
      return;
    }

    setInvoiceData(data);
    setIsInvoiceModalVisible(true);
    setIsClosing(false);
  };

  const handleConfirmPaymentAndClose = async () => {
    setIsClosing(true);
    const { error } = await supabase
      .from("ho_so_benh_an")
      .update({
        trang_thai: "Hoàn tất",
        thoi_gian_dong_ho_so: new Date().toISOString(),
        tong_chi_phi: invoiceData?.total || 0,
      })
      .eq("id_ho_so", record.id_ho_so);

    if (error) {
      message.error(`Lỗi khi đóng hồ sơ: ${error.message}`);
    } else {
      message.success(
        "Đã xác nhận thanh toán và đóng hồ sơ bệnh án thành công."
      );
      setIsInvoiceModalVisible(false);
      fetchRecord(); // Re-fetch data to show the new status
    }
    setIsClosing(false);
  };

  if (loading || !record) {
    return (
      <Spin size="large" className="flex justify-center items-center h-full" />
    );
  }

  const renderStatusTag = (status: string) => {
    let color = "default";
    if (status === "Đang xử lý") color = "gold";
    else if (status === "Hoàn tất") color = "success";
    else if (status === "Đã huỷ") color = "error";
    return <Tag color={color}>{status.toUpperCase()}</Tag>;
  };

  const examColumns = [
    {
      title: "Lần khám",
      dataIndex: "id",
      key: "id",
      render: (id: number) => `LK#${id}`,
    },
    { title: "Lý do", dataIndex: "reason", key: "reason" },
    {
      title: "Chi phí",
      dataIndex: "cost",
      key: "cost",
      render: formatCurrency,
      align: "right" as const,
    },
  ];

  const serviceColumns = [
    { title: "Tên dịch vụ", dataIndex: "name", key: "name" },
    {
      title: "Chi phí",
      dataIndex: "cost",
      key: "cost",
      render: formatCurrency,
      align: "right" as const,
    },
  ];

  const prescriptionColumns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      render: (id: number) => `ĐT#${id}`,
    },
    {
      title: "Tên thuốc",
      dataIndex: ["medicines", 0, "name"],
      key: "name",
      render: (text: string, record: any) =>
        record.medicines.map((m: any) => m.name).join(", "),
    },
    {
      title: "Tổng cộng",
      dataIndex: "medicines",
      key: "total",
      align: "right" as const,
      render: (medicines: any[]) =>
        formatCurrency(medicines.reduce((acc, m) => acc + m.total, 0)),
    },
  ];

  return (
    <>
      <Card style={{ paddingTop: 0 }}>
        <Button
          onClick={() => router.push("/dashboard/appointments")}
          type="link"
          style={{ padding: 0, marginBottom: 4 }}
        >
          &larr; Quay lại danh sách
        </Button>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              {`Hồ sơ Bệnh án #${record.id_ho_so}`}
            </Title>
          </Col>
          <Col>
            <Space>
              {renderStatusTag(record.trang_thai)}
              {record.trang_thai === "Đang xử lý" &&
                can("patient.encounter.update") && (
                  <Button
                    type="primary"
                    onClick={handleShowInvoice}
                    loading={isClosing}
                  >
                    Đóng hồ sơ & Thanh toán
                  </Button>
                )}
            </Space>
          </Col>
        </Row>

        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginBottom: 2 }}
        >
          <Descriptions.Item label="Bệnh nhân">
            {record.benh_nhan?.ho_ten || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">
            {record.benh_nhan?.ngay_sinh
              ? new Date(record.benh_nhan.ngay_sinh).toLocaleDateString("vi-VN")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày mở hồ sơ">
            {new Date(record.thoi_gian_mo_ho_so).toLocaleString("vi-VN")}
          </Descriptions.Item>
          <Descriptions.Item label="Loại bệnh án">
            <Tag color={record.loai_benh_an === "Nội trú" ? "red" : "blue"}>
              {record.loai_benh_an}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Chẩn đoán" span={1}>
            <Space wrap>
              {classifiedDiagnoses.main.length +
                classifiedDiagnoses.others.length >
              0 ? (
                <>
                  {[...classifiedDiagnoses.main, ...classifiedDiagnoses.others]
                    .slice(0, 3)
                    .map((d: any, index: number) => (
                      <Tag
                        key={index}
                        color={
                          d.loai_chan_doan === "Bệnh chính"
                            ? "volcano"
                            : "geekblue"
                        }
                        style={{ cursor: "pointer" }}
                        onClick={() => setIsAllDiagnosesModalVisible(true)}
                      >
                        {d.benh.ten_benh}
                      </Tag>
                    ))}
                  {classifiedDiagnoses.main.length +
                    classifiedDiagnoses.others.length >
                    3 && (
                    <Tag
                      style={{ cursor: "pointer", borderStyle: "dashed" }}
                      onClick={() => setIsAllDiagnosesModalVisible(true)}
                    >
                      ...
                    </Tag>
                  )}
                </>
              ) : (
                <Text type="secondary">Chưa có chẩn đoán</Text>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú y tế" span={1}>
            <Space wrap>
              {recentNotes.length > 0 ? (
                <>
                  {recentNotes.map((note: any) => (
                    <Tag
                      key={note.id_ghi_chu}
                      style={{ cursor: "pointer" }}
                      onClick={() => setIsAllNotesModalVisible(true)}
                    >
                      {note.loai_ghi_chu?.ten_loai_ghi_chu}
                    </Tag>
                  ))}
                  {record && record.notes_count > 3 && (
                    <Tag
                      style={{ cursor: "pointer", borderStyle: "dashed" }}
                      onClick={() => setIsAllNotesModalVisible(true)}
                    >
                      ...
                    </Tag>
                  )}
                </>
              ) : (
                <Text type="secondary">Chưa có ghi chú</Text>
              )}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        {/* Modal for All Notes */}
        <Modal
          title="Tất cả Ghi chú Y tế của Hồ sơ"
          open={isAllNotesModalVisible}
          onCancel={() => setIsAllNotesModalVisible(false)}
          footer={[
            <Button
              key="close"
              onClick={() => setIsAllNotesModalVisible(false)}
            >
              Đóng
            </Button>,
          ]}
          width={900}
        >
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Select
              placeholder="Lọc theo loại ghi chú"
              style={{ width: 200 }}
              allowClear
              showSearch // Ensure search is enabled
              optionFilterProp="children" // Filter based on Option's children
                                      filterOption={(input, option) =>
                                          (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                      }
              onChange={setFilterNoteType}
            >
              {noteTypes.map((nt) => (
                <Option key={nt.id_loai_ghi_chu} value={nt.id_loai_ghi_chu}>
                  {nt.ten_loai_ghi_chu}
                </Option>
              ))}
            </Select>

            <RangePicker
              placeholder={["Từ ngày", "Đến ngày"]}
              onChange={(dates) => setFilterDateRange(dates as any)}
              style={{ width: 250 }}
              format="DD/MM/YYYY"
            />

            <Input
              placeholder="Tìm theo tên người tạo..."
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              onChange={(e) => setFilterCreator(e.target.value)}
            />
          </div>

          <Table
            dataSource={filteredNotes} // Now uses filteredNotes
            rowKey="id_ghi_chu"
            size="small"
            pagination={{ pageSize: 7 }}
            onRow={(record) => ({
              onClick: () => {
                setViewingMedicalNote(record);
                setIsMedicalNoteDetailModalVisible(true);
              },
              style: { cursor: "pointer" },
            })}
            columns={[
              {
                title: "Thời gian",
                dataIndex: "thoi_gian_tao",
                key: "time",
                render: (t: string) => dayjs(t).format("DD/MM HH:mm"),
                width: 130,
              },
              {
                title: "Loại",
                dataIndex: ["loai_ghi_chu", "ten_loai_ghi_chu"],
                key: "type",
                width: 250,
                render: (t) => <Tag>{t}</Tag>,
              },
              {
                title: "Nội dung",
                dataIndex: "noi_dung_ghi_chu",
                key: "content",
                ellipsis: true,
              },
              {
                title: "Người tạo",
                dataIndex: ["nguoi_tao", "ho_ten"],
                key: "creator",
                width: 120,
              },
            ]}
          />
        </Modal>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Lịch sử Khám bệnh" key="1">
            <LichKhamTab
              record_id={record.id_ho_so}
              patient_id={record.id_benh_nhan}
              record_status={record.trang_thai}
              record_type={record.loai_benh_an}
              onConclude={handleConclude}
            />
          </TabPane>
          <TabPane tab="Chỉ định & Kết quả CLS" key="2">
            <ChiDinhClsTab
              record_id={record.id_ho_so}
              record_status={record.trang_thai}
            />
          </TabPane>
          <TabPane tab="Đơn thuốc" key="3">
            <DonThuocTab record_id={record.id_ho_so} />
          </TabPane>
          {record.loai_benh_an === "Nội trú" && (
            <TabPane tab="Điều trị nội trú" key="4">
              <InpatientTreatmentTab
                record_id={record.id_ho_so}
                record_status={record.trang_thai}
              />
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* Diagnosis Edit Modal */}
      <Modal
        title="Cập nhật Chẩn đoán"
        open={isDiagnosisModalVisible}
        onOk={handleSaveDiagnoses}
        onCancel={() => setIsDiagnosisModalVisible(false)}
        confirmLoading={updatingDiagnosis}
        width={700}
      >
        <Form form={diagnosisForm} layout="vertical">
          <Form.List name="diagnoses">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "id_benh"]}
                      rules={[{ required: true, message: "Chọn bệnh" }]}
                      style={{ width: "350px" }}
                    >
                      <Select
                        showSearch
                        placeholder="Chọn bệnh"
                        optionFilterProp="children"
                      >
                        {diseases.map((d) => (
                          <Option key={d.id_benh} value={d.id_benh}>
                            {d.ten_benh}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "loai_chan_doan"]}
                      rules={[{ required: true, message: "Chọn loại" }]}
                      style={{ width: "200px" }}
                      initialValue="Bệnh chính"
                    >
                      <Select>
                        <Option value="Bệnh chính">Bệnh chính</Option>
                        <Option value="Bệnh kèm theo">Bệnh kèm theo</Option>
                      </Select>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Thêm chẩn đoán
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* New Modal for All Diagnoses */}
      <Modal
        title="Tất cả Chẩn đoán"
        open={isAllDiagnosesModalVisible}
        onCancel={() => setIsAllDiagnosesModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsAllDiagnosesModalVisible(false)}
          >
            Đóng
          </Button>,
          record?.trang_thai === "Đang xử lý" &&
            can("patient.diagnosis.update") && (
              <Button
                key="update"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setIsAllDiagnosesModalVisible(false);
                  handleEditDiagnosis();
                }}
              >
                Cập nhật
              </Button>
            ),
        ]}
      >
        <Text
          strong
          style={{ display: "block", marginBottom: 8, color: "#cf1322" }}
        >
          Chẩn đoán chính
        </Text>
        {classifiedDiagnoses.main.length > 0 ? (
          <List
            size="small"
            dataSource={classifiedDiagnoses.main}
            renderItem={(item: any) => (
              <List.Item style={{ padding: "4px 0" }}>
                <Tag color="volcano">{item.benh.ten_benh}</Tag>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary" style={{ marginLeft: 16 }}>
            Chưa có thông tin
          </Text>
        )}

        <Divider style={{ margin: "16px 0" }} />

        <Text
          strong
          style={{ display: "block", marginBottom: 8, color: "#1d39c4" }}
        >
          Bệnh kèm theo
        </Text>
        {classifiedDiagnoses.others.length > 0 ? (
          <List
            size="small"
            dataSource={classifiedDiagnoses.others}
            renderItem={(item: any) => (
              <List.Item style={{ padding: "4px 0" }}>
                <Tag color="geekblue">{item.benh.ten_benh}</Tag>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary" style={{ marginLeft: 16 }}>
            Không có
          </Text>
        )}
      </Modal>

      {/* Conclusion Modal */}
      <Modal
        title={`Kết luận cho Lịch khám #${editingAppointment?.id_lich_kham}`}
        open={isConclusionModalVisible}
        onCancel={() => setIsConclusionModalVisible(false)}
        width={900}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsConclusionModalVisible(false)}
          >
            Đóng
          </Button>,
          // Only show "Complete & Prescribe" button if NOT in Note Creating mode (to avoid confusion)
          // Or show it always but clarify its purpose.
          // Per user request: Distinguish clearly.
          // If in Note tab and creating note, user should use "Save Note".
          // If in Diagnosis or Prescription tab, user uses "Complete".
          (conclusionActiveTab !== "1" || noteViewMode === "list") && (
            <Button key="submit" type="primary" onClick={handleConcludeOk}>
              Hoàn tất Khám & Kê đơn
            </Button>
          ),
        ]}
      >
        <Form form={conclusionForm} layout="vertical">
          <Tabs
            defaultActiveKey="1"
            activeKey={conclusionActiveTab}
            onChange={setConclusionActiveTab}
          >
            <TabPane tab="Ghi chép y tế" key="1">
              {noteViewMode === "list" ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <Text strong>Danh sách ghi chú</Text>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingNote(null);
                        noteForm.resetFields();
                        setNoteViewMode("create");
                      }}
                    >
                      Thêm ghi chú
                    </Button>
                  </div>
                  <Table
                    dataSource={notesList}
                    rowKey="id_ghi_chu"
                    size="small"
                    loading={loadingNotes}
                    pagination={{ pageSize: 5 }}
                    onRow={(record) => ({
                      onClick: () => {
                        setViewingMedicalNote(record);
                        setIsMedicalNoteDetailModalVisible(true);
                      },
                      style: { cursor: "pointer" },
                    })}
                    columns={[
                      {
                        title: "Thời gian",
                        dataIndex: "thoi_gian_tao",
                        key: "time",
                        render: (t: string) =>
                          new Date(t).toLocaleString("vi-VN"),
                        width: 150,
                      },
                      {
                        title: "Loại",
                        dataIndex: ["loai_ghi_chu", "ten_loai_ghi_chu"],
                        key: "type",
                        width: 250,
                        render: (t) => <Tag>{t}</Tag>,
                      },
                      {
                        title: "Nội dung",
                        dataIndex: "noi_dung_ghi_chu",
                        key: "content",
                        ellipsis: true,
                      },
                      {
                        title: "Người tạo",
                        dataIndex: ["nguoi_tao", "ho_ten"],
                        key: "creator",
                        width: 150,
                      },
                      {
                        title: "Hành động",
                        key: "action",
                        width: 100,
                        render: (_: any, record: any) => (
                          <Space onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditNote(record)}
                            />
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteNote(record)}
                            />
                          </Space>
                        ),
                      },
                    ]}
                  />
                </>
              ) : (
                <>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => {
                      setEditingNote(null);
                      setNoteViewMode("list");
                    }}
                    style={{ marginBottom: 16 }}
                  >
                    Quay lại danh sách
                  </Button>
                  <Title level={5}>
                    {editingNote ? "Cập nhật ghi chú" : "Thêm ghi chú mới"}
                  </Title>
                  <Form form={noteForm} layout="vertical">
                    <Form.Item
                      name="id_loai_ghi_chu"
                      label="Loại ghi chú"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn loại ghi chú",
                        },
                      ]}
                    >
                      <Select
                        placeholder="Chọn loại ghi chú (Diễn biến, Y lệnh...)"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children as unknown as string)
                            ?.toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        {noteTypes.map((nt) => (
                          <Option
                            key={nt.id_loai_ghi_chu}
                            value={nt.id_loai_ghi_chu}
                          >
                            {nt.ten_loai_ghi_chu}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      name="noi_dung_ghi_chu"
                      label="Nội dung ghi chú"
                      rules={[
                        { required: true, message: "Vui lòng nhập nội dung" },
                      ]}
                    >
                      <Input.TextArea
                        rows={6}
                        placeholder="Nhập nội dung chi tiết..."
                      />
                    </Form.Item>
                    <Form.Item
                      name="du_lieu_cau_truc"
                      label="Dữ liệu cấu trúc (JSON)"
                      tooltip="Dành cho các dữ liệu có định dạng đặc biệt"
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder='{"key": "value"}'
                        style={{ fontFamily: "monospace" }}
                      />
                    </Form.Item>
                    <Button type="primary" onClick={handleSaveNote}>
                      {editingNote ? "Lưu thay đổi" : "Lưu ghi chú"}
                    </Button>
                  </Form>
                </>
              )}
            </TabPane>

            <TabPane tab="Chẩn đoán" key="2" forceRender={true}>
              {/* Integrated Diagnosis Editing */}
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Danh sách chẩn đoán:
              </Text>
              <Form.List name="diagnoses">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space
                        key={key}
                        style={{ display: "flex", marginBottom: 8 }}
                        align="baseline"
                      >
                        <Form.Item
                          {...restField}
                          name={[name, "id_benh"]}
                          rules={[{ required: true, message: "Chọn bệnh" }]}
                          style={{ width: "350px" }}
                        >
                          <Select
                            showSearch
                            placeholder="Chọn bệnh"
                            optionFilterProp="children"
                          >
                            {diseases.map((d) => (
                              <Option key={d.id_benh} value={d.id_benh}>
                                {d.ten_benh}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, "loai_chan_doan"]}
                          rules={[{ required: true, message: "Chọn loại" }]}
                          style={{ width: "200px" }}
                          initialValue="Bệnh chính"
                        >
                          <Select>
                            <Option value="Bệnh chính">Bệnh chính</Option>
                            <Option value="Bệnh kèm theo">Bệnh kèm theo</Option>
                          </Select>
                        </Form.Item>
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ color: "red" }}
                        />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Thêm chẩn đoán
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Divider />

              <Form.Item name="ngay_tai_kham" label="Ngày tái khám">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </TabPane>

            <TabPane tab="Đơn thuốc" key="3" forceRender={true}>
              <Form.List name="prescription">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => {
                      const selectedMedicineId = conclusionForm.getFieldValue([
                        "prescription",
                        name,
                        "id_thuoc",
                      ]);
                      const unit = medicines.find(
                        (m) => m.id_thuoc === selectedMedicineId
                      )?.don_vi_tinh;

                      return (
                        <Space
                          key={key}
                          style={{ display: "flex", marginBottom: 8 }}
                          align="baseline"
                        >
                          <Form.Item
                            {...restField}
                            name={[name, "id_thuoc"]}
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng chọn thuốc",
                              },
                            ]}
                            style={{ width: "250px" }}
                          >
                            <Select
                              showSearch
                              placeholder="Chọn thuốc"
                              optionFilterProp="children"
                              onChange={() =>
                                conclusionForm.setFieldsValue({
                                  prescription: [
                                    ...conclusionForm.getFieldValue(
                                      "prescription"
                                    ),
                                  ],
                                })
                              }
                            >
                              {medicines.map((m) => (
                                <Option
                                  key={m.id_thuoc}
                                  value={m.id_thuoc}
                                >{`${m.ten_thuoc} (Tồn: ${m.so_luong_ton_kho})`}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "so_luong"]}
                            rules={[{ required: true, message: "Nhập SL" }]}
                          >
                            <InputNumber
                              placeholder="SL"
                              min={1}
                              style={{ width: "70px" }}
                            />
                          </Form.Item>
                          <span style={{ minWidth: "40px" }}>{unit}</span>
                          <Form.Item
                            {...restField}
                            name={[name, "lieu_dung"]}
                            rules={[
                              { required: true, message: "Nhập liều dùng" },
                            ]}
                            style={{ width: "250px" }}
                          >
                            <Input
                              placeholder="Liều dùng (VD: Sáng 1 viên, tối 1 viên)"
                              spellCheck={false}
                            />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Space>
                      );
                    })}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Thêm thuốc
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {invoiceData && (
        <Modal
          title={`Hóa đơn thanh toán cho Hồ sơ #${record.id_ho_so}`}
          open={isInvoiceModalVisible}
          onCancel={() => setIsInvoiceModalVisible(false)}
          width={800}
          footer={[
            <Button key="back" onClick={() => setIsInvoiceModalVisible(false)}>
              Huỷ
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={isClosing}
              onClick={handleConfirmPaymentAndClose}
            >
              Xác nhận thanh toán & Đóng hồ sơ
            </Button>,
          ]}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Title level={4}>Bảng tổng hợp chi phí</Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Tổng phí khám bệnh">
                {formatCurrency(invoiceData.exam_fee)}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng phí dịch vụ CLS">
                {formatCurrency(invoiceData.service_fee)}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền thuốc">
                {formatCurrency(invoiceData.medicine_fee)}
              </Descriptions.Item>
              <Descriptions.Item label={<Text strong>TỔNG CỘNG</Text>}>
                <Text strong style={{ fontSize: 18, color: "#1890ff" }}>
                  {formatCurrency(invoiceData.total)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {invoiceData.details?.exams?.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>
                  Chi tiết Phí khám
                </Title>
                <Table
                  size="small"
                  columns={examColumns}
                  dataSource={invoiceData.details.exams}
                  pagination={false}
                  rowKey="id"
                />
              </>
            )}

            {invoiceData.details?.services?.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>
                  Chi tiết Dịch vụ CLS
                </Title>
                <Table
                  size="small"
                  columns={serviceColumns}
                  dataSource={invoiceData.details.services}
                  pagination={false}
                  rowKey="name"
                />
              </>
            )}

            {invoiceData.details?.prescriptions?.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>
                  Chi tiết Đơn thuốc
                </Title>
                <Table
                  size="small"
                  columns={prescriptionColumns}
                  dataSource={invoiceData.details.prescriptions}
                  pagination={false}
                  rowKey="id"
                />
              </>
            )}
          </Space>
        </Modal>
      )}

      <Modal
        title="Chi tiết Ghi chú Y tế"
        open={isMedicalNoteDetailModalVisible}
        onCancel={() => setIsMedicalNoteDetailModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsMedicalNoteDetailModalVisible(false)}
          >
            Đóng
          </Button>,
        ]}
      >
        {viewingMedicalNote && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Thời gian">
              {new Date(viewingMedicalNote.thoi_gian_tao).toLocaleString(
                "vi-VN"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Loại ghi chú">
              <Tag>{viewingMedicalNote.loai_ghi_chu?.ten_loai_ghi_chu}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Người tạo">
              {viewingMedicalNote.nguoi_tao?.ho_ten}
            </Descriptions.Item>
            <Descriptions.Item label="Nội dung">
              <div style={{ whiteSpace: "pre-wrap" }}>
                {viewingMedicalNote.noi_dung_ghi_chu}
              </div>
            </Descriptions.Item>
            {viewingMedicalNote.du_lieu_cau_truc && (
              <Descriptions.Item label="Dữ liệu cấu trúc">
                <pre style={{ maxHeight: 200, overflow: "auto" }}>
                  {JSON.stringify(viewingMedicalNote.du_lieu_cau_truc, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default MedicalRecordDetailPage;
