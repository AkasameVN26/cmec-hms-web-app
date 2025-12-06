"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  message,
  Typography,
  Tag,
  Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const { Title } = Typography;

interface NoteType {
  id_loai_ghi_chu: number;
  ten_loai_ghi_chu: string;
  nhom_ghi_chu: string | null;
  thu_tu_uu_tien: number;
  send_to_ai: boolean;
}

const NoteTypesPage = () => {
  const [data, setData] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NoteType | null>(null);
  const [form] = Form.useForm();
  const { can } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    const { data: noteTypes, error } = await supabase
      .from("loai_ghi_chu")
      .select("*")
      .order("thu_tu_uu_tien", { ascending: true })
      .order("ten_loai_ghi_chu", { ascending: true });

    if (error) {
      message.error("Lỗi tải danh sách: " + error.message);
    } else {
      setData(noteTypes || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    // Set default values
    form.setFieldsValue({
      thu_tu_uu_tien: 100,
      send_to_ai: true,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: NoteType) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("loai_ghi_chu")
      .delete()
      .eq("id_loai_ghi_chu", id);

    if (error) {
      message.error("Lỗi khi xóa: " + error.message);
    } else {
      message.success("Đã xóa loại ghi chú thành công");
      fetchData();
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      let error;
      if (editingRecord) {
        const { error: updateError } = await supabase
          .from("loai_ghi_chu")
          .update(values)
          .eq("id_loai_ghi_chu", editingRecord.id_loai_ghi_chu);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("loai_ghi_chu")
          .insert([values]);
        error = insertError;
      }

      if (error) throw error;

      message.success(
        editingRecord ? "Cập nhật thành công" : "Thêm mới thành công"
      );
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      if (err.message) {
        message.error("Lỗi: " + err.message);
      }
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id_loai_ghi_chu",
      key: "id_loai_ghi_chu",
      width: 80,
    },
    {
      title: "Tên loại ghi chú",
      dataIndex: "ten_loai_ghi_chu",
      key: "ten_loai_ghi_chu",
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: "Nhóm",
      dataIndex: "nhom_ghi_chu",
      key: "nhom_ghi_chu",
      render: (text: string) => text || <span style={{ color: "#ccc" }}>-</span>,
    },
    {
      title: "Thứ tự ưu tiên",
      dataIndex: "thu_tu_uu_tien",
      key: "thu_tu_uu_tien",
      width: 150,
      align: "center" as const,
    },
    {
      title: "Gửi cho AI",
      dataIndex: "send_to_ai",
      key: "send_to_ai",
      width: 120,
      align: "center" as const,
      render: (val: boolean) =>
        val ? <Tag color="green">Có</Tag> : <Tag color="default">Không</Tag>,
    },
    {
      title: "Hành động",
      key: "action",
      width: 150,
      align: "center" as const,
      render: (_: any, record: NoteType) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record.id_loai_ghi_chu)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Danh mục Loại Ghi chú Y tế
        </Title>
        <div style={{ display: 'flex', gap: 16 }}>
            <Input.Search 
                placeholder="Tìm theo tên hoặc nhóm..." 
                allowClear 
                onSearch={val => setSearchText(val)}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm mới
            </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={data.filter(item => 
            item.ten_loai_ghi_chu.toLowerCase().includes(searchText.toLowerCase()) || 
            (item.nhom_ghi_chu && item.nhom_ghi_chu.toLowerCase().includes(searchText.toLowerCase()))
        )}
        loading={loading}
        rowKey="id_loai_ghi_chu"
        bordered
        size="middle"
      />

      <Modal
        title={editingRecord ? "Cập nhật Loại ghi chú" : "Thêm mới Loại ghi chú"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="ten_loai_ghi_chu"
            label="Tên loại ghi chú"
            rules={[{ required: true, message: "Vui lòng nhập tên loại ghi chú" }]}
          >
            <Input placeholder="Ví dụ: Diễn biến bệnh, Y lệnh, Tiền sử..." />
          </Form.Item>

          <Form.Item name="nhom_ghi_chu" label="Nhóm ghi chú">
            <Input placeholder="Ví dụ: Hành chính, Chuyên môn..." />
          </Form.Item>

          <Space style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <Form.Item
              name="thu_tu_uu_tien"
              label="Thứ tự ưu tiên"
              tooltip="Số nhỏ hiển thị trước"
              style={{ width: '45%' }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="send_to_ai"
              label="Gửi dữ liệu cho AI"
              tooltip="Cho phép AI phân tích nội dung của loại ghi chú này"
              valuePropName="checked"
              style={{ width: '45%' }}
            >
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default NoteTypesPage;
