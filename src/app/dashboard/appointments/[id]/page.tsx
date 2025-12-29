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
  List,
  Divider,
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

// Import Refactored Components
import LichKhamTab from "@/components/dashboard/medical-record/LichKhamTab";
import ChiDinhClsTab from "@/components/dashboard/medical-record/ChiDinhClsTab";
import DonThuocTab from "@/components/dashboard/medical-record/DonThuocTab";
import InpatientTreatmentTab from "@/components/dashboard/medical-record/InpatientTreatmentTab";
import AIChatWidget from "@/components/dashboard/medical-record/AIChatWidget";

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
  const [concludingLoading, setConcludingLoading] = useState(false);
  const [savingNoteLoading, setSavingNoteLoading] = useState(false);
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
  const [activeTab, setActiveTab] = useState("1");

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
      setConcludingLoading(true);
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
    } finally {
      setConcludingLoading(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      setSavingNoteLoading(true);
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
    } finally {
      setSavingNoteLoading(false);
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
                (option?.children as unknown as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
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

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
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
        width={840}
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
        width={624}
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
        width={1080}
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
            <Button
              key="submit"
              type="primary"
              onClick={handleConcludeOk}
              loading={concludingLoading}
            >
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
                    <Button
                      type="primary"
                      onClick={handleSaveNote}
                      loading={savingNoteLoading}
                    >
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
          width={960}
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
        zIndex={1050}
        width={624}
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

      <AIChatWidget recordId={params.id} />
    </>
  );
};

export default MedicalRecordDetailPage;