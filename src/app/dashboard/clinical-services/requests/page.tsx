'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Select, message, Tag, Spin, Alert, Input, Upload, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { UploadFile, UploadProps } from 'antd';
import { useDebounce } from '@/hooks/useDebounce';

const { Option } = Select;

const ServiceRequestsPage = () => {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Filter states
  const [nameFilter, setNameFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null);
  const debouncedNameFilter = useDebounce(nameFilter, 500);

  const [form] = Form.useForm();
  const statusValue = Form.useWatch('trang_thai_chi_dinh', form);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('chi_dinh_cls').select(`
        id_chi_dinh,
        thoi_gian_tao_chi_dinh,
        trang_thai_chi_dinh,
        bac_si:id_bac_si_chi_dinh ( tai_khoan!inner(ho_ten) ),
        lich_kham:id_lich_kham (
          benh_nhan:id_benh_nhan!inner( ho_ten )
        ),
        dich_vu_cls:id_dich_vu ( ten_dich_vu ),
        ket_qua_cls (
            id_ket_qua_cls,
            id_ky_thuat_vien,
            ket_luan,
            duong_dan_file_ket_qua,
            chi_so_xet_nghiem,
            ky_thuat_vien:id_ky_thuat_vien ( tai_khoan!inner(ho_ten) )
        )
      `);

      if (debouncedNameFilter) {
        query = query.ilike('lich_kham.benh_nhan.ho_ten', `%${debouncedNameFilter}%`);
      }

      if (statusFilter) {
        query = query.eq('trang_thai_chi_dinh', statusFilter);
      } else {
        query = query.in('trang_thai_chi_dinh', ['Chờ thực hiện', 'Đã lấy mẫu', 'Đang xử lý']);
      }

      if (technicianFilter) {
        query = query.eq('ket_qua_cls.id_ky_thuat_vien', technicianFilter);
      }

      const { data, error } = await query.order('thoi_gian_tao_chi_dinh', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      setError(`Lỗi khi tải danh sách chỉ định: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [debouncedNameFilter, statusFilter, technicianFilter]);

  const fetchTechnicians = async () => {
      const { data, error } = await supabase.from('ky_thuat_vien').select('id_ky_thuat_vien, tai_khoan!inner(ho_ten)');
      if(data) setTechnicians(data);
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const handleEdit = (record: any) => {
    setEditingRequest(record);
    const result = record.ket_qua_cls;

    form.setFieldsValue({
      trang_thai_chi_dinh: record.trang_thai_chi_dinh,
      ket_luan: result?.ket_luan,
      chi_so_xet_nghiem: result?.chi_so_xet_nghiem ? JSON.stringify(result.chi_so_xet_nghiem, null, 2) : undefined,
    });

    if (result?.duong_dan_file_ket_qua) {
        setFileList([{
            uid: '-1',
            name: result.duong_dan_file_ket_qua.split('/').pop(),
            status: 'done',
            url: `https://wkyyexkbgzahstfebtfh.supabase.co/storage/v1/object/public/cls_results/${result.duong_dan_file_ket_qua}`
        }]);
    } else {
        setFileList([]);
    }
    setIsModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (!editingRequest) return;

      const { trang_thai_chi_dinh, ...resultValues } = values;

      const { error: statusError } = await supabase
        .from('chi_dinh_cls')
        .update({ trang_thai_chi_dinh })
        .eq('id_chi_dinh', editingRequest.id_chi_dinh);

      if (statusError) throw new Error(`Lỗi cập nhật trạng thái: ${statusError.message}`);

      if (trang_thai_chi_dinh === 'Hoàn thành') {
        const resultData = {
            id_chi_dinh: editingRequest.id_chi_dinh,
            id_ky_thuat_vien: user?.id,
            thoi_gian_thuc_hien: new Date().toISOString(),
            thoi_gian_tra_ket_qua: new Date().toISOString(),
            ket_luan: resultValues.ket_luan,
            duong_dan_file_ket_qua: fileList.length > 0 && fileList[0].status === 'done' ? fileList[0].name : undefined,
            chi_so_xet_nghiem: resultValues.chi_so_xet_nghiem ? JSON.parse(resultValues.chi_so_xet_nghiem) : null,
        };

        const { error: resultError } = await supabase.from('ket_qua_cls').upsert(resultData, { onConflict: 'id_chi_dinh' });
        if (resultError) throw new Error(`Lỗi lưu kết quả CLS: ${resultError.message}`);
      }

      message.success('Cập nhật thành công!');
      setIsModalVisible(false);
      fetchRequests();

    } catch (err: any) {
        message.error(`Cập nhật thất bại: ${err.message}`);
    }
  };

  const uploadProps: UploadProps = {
    fileList,
    maxCount: 1,
    onRemove: () => {
        setFileList([]);
    },
    beforeUpload: (file) => {
        setFileList([file]);
        return false; // Prevent auto-upload
    },
    customRequest: async ({ file, onSuccess, onError }) => {
        if (!editingRequest) return;
        const fileExt = (file as File).name.split('.').pop();
        const fileName = `${editingRequest.id_chi_dinh}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('cls_results')
            .upload(filePath, file as File);

        if (uploadError) {
            onError?.(uploadError);
            message.error(`Tải file thất bại: ${uploadError.message}`);
        } else {
            onSuccess?.('ok');
            setFileList(prevList => prevList.map(f => ({ ...f, name: fileName, status: 'done' })));
            message.success(`${(file as File).name} đã được tải lên thành công.`);
        }
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Chờ thực hiện': return <Tag color="blue">Chờ thực hiện</Tag>;
      case 'Đã lấy mẫu': return <Tag color="cyan">Đã lấy mẫu</Tag>;
      case 'Đang xử lý': return <Tag color="orange">Đang xử lý</Tag>;
      case 'Hoàn thành': return <Tag color="green">Hoàn thành</Tag>;
      case 'Đã huỷ': return <Tag color="red">Đã huỷ</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    { title: 'Mã CĐ', dataIndex: 'id_chi_dinh', key: 'id_chi_dinh' },
    { title: 'Bệnh nhân', dataIndex: ['lich_kham', 'benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Dịch vụ', dataIndex: ['dich_vu_cls', 'ten_dich_vu'], key: 'service_name' },
    { title: 'Bác sĩ chỉ định', dataIndex: ['bac_si', 'tai_khoan', 'ho_ten'], key: 'doctor_name' },
    { title: 'Thời gian chỉ định', dataIndex: 'thoi_gian_tao_chi_dinh', key: 'thoi_gian_tao_chi_dinh', render: (text: string) => new Date(text).toLocaleString() },
    { title: 'Trạng thái', dataIndex: 'trang_thai_chi_dinh', key: 'trang_thai_chi_dinh', render: getStatusTag },
    { title: 'KTV Thực hiện', dataIndex: ['ket_qua_cls', 'ky_thuat_vien', 'tai_khoan', 'ho_ten'], key: 'technician_name', render: (name: string) => name || 'Chưa có' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Button onClick={() => handleEdit(record)}>Cập nhật</Button>
      ),
    },
  ];

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <>
      <Card title="Danh sách chỉ định đang chờ">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
                <Input 
                    placeholder="Tìm theo tên bệnh nhân..."
                    value={nameFilter}
                    onChange={e => setNameFilter(e.target.value)}
                />
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Select 
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Lọc theo trạng thái"
                    value={statusFilter}
                    onChange={value => setStatusFilter(value)}
                >
                    <Option value="Chờ thực hiện">Chờ thực hiện</Option>
                    <Option value="Đã lấy mẫu">Đã lấy mẫu</Option>
                    <Option value="Đang xử lý">Đang xử lý</Option>
                </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Select 
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="Lọc theo kỹ thuật viên"
                    value={technicianFilter}
                    onChange={value => setTechnicianFilter(value)}
                    optionFilterProp="children"
                >
                    {technicians.map(t => <Option key={t.id_ky_thuat_vien} value={t.id_ky_thuat_vien}>{t.tai_khoan.ho_ten}</Option>)}
                </Select>
            </Col>
        </Row>
        <Table
          columns={columns}
          dataSource={requests}
          loading={loading}
          rowKey="id_chi_dinh"
        />
      </Card>

      <Modal
        title="Cập nhật trạng thái chỉ định"
        open={isModalVisible}
        onOk={handleUpdate}
        onCancel={() => setIsModalVisible(false)}
        okText="Cập nhật"
        cancelText="Huỷ"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="trang_thai_chi_dinh" label="Trạng thái" rules={[{ required: true }]}>
            <Select>
              <Option value="Chờ thực hiện">Chờ thực hiện</Option>
              <Option value="Đã lấy mẫu">Đã lấy mẫu</Option>
              <Option value="Đang xử lý">Đang xử lý</Option>
              <Option value="Hoàn thành">Hoàn thành</Option>
              <Option value="Đã huỷ">Đã huỷ</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Kỹ thuật viên thực hiện">
            <Input value={profile?.ho_ten || user?.email} disabled />
          </Form.Item>
          
          {statusValue === 'Hoàn thành' && (
            <>
                <Form.Item name="ket_luan" label="Kết luận">
                    <Input.TextArea rows={4} spellCheck={false} />
                </Form.Item>

                <Form.Item 
                    label="File kết quả" 
                    tooltip="Tải lên file PDF hoặc ảnh kết quả. Chỉ được tải 1 file."
                >
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />}>Chọn File</Button>
                    </Upload>
                </Form.Item>

                <Form.Item 
                    name="chi_so_xet_nghiem" 
                    label="Chỉ số xét nghiệm (JSON)" 
                    tooltip='Nhập các chỉ số dưới dạng JSON. Ví dụ: { "glucose": 5.4, "unit": "mmol/L" }'
                    rules={[{
                        validator: async (_, value) => {
                            if (value) {
                                try {
                                    JSON.parse(value);
                                } catch (e) {
                                    return Promise.reject(new Error('Chuỗi JSON không hợp lệ'));
                                }
                            }
                        }
                    }]}
                >
                    <Input.TextArea rows={4} placeholder='{ "ten_chi_so": "gia_tri" }' spellCheck={false} />
                </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default ServiceRequestsPage;