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
  Select,
  Input,
  Descriptions,
  Image,
} from "antd";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const { Option } = Select;

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
        width={624}
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
          width={960}
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

export default ChiDinhClsTab;
