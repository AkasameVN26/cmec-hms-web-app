'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, message, Spin, Descriptions, Button, Tag, Tabs, Row, Col, Typography, Table, Space, Modal, Form, DatePicker, Select, Input, InputNumber } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Title } = Typography;
const { Option } = Select;

// ==============================================
// Lịch sử Khám bệnh Tab Component
// ==============================================
const LichKhamTab = ({ record_id, patient_id, record_status }: { record_id: number, patient_id: string, record_status: string }) => {
    const { user, roles } = useAuth();
    const isAdmin = roles.includes('Quản lý');
    const isDoctor = roles.includes('Bác sĩ');
    const isReceptionist = roles.includes('Lễ tân');

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isConclusionModalVisible, setIsConclusionModalVisible] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [clinics, setClinics] = useState<any[]>([]);
    const [diseases, setDiseases] = useState<any[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
    const [isFindingDoctors, setIsFindingDoctors] = useState(false);
    
    const [editForm] = Form.useForm();
    const [conclusionForm] = Form.useForm();

    const appointmentTime = Form.useWatch('thoi_gian_kham', editForm);
    const isRecordCancelled = record_status === 'Đã huỷ';

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('lich_kham')
            .select('*, bac_si:id_bac_si(tai_khoan!id_bac_si(ho_ten)), phong_kham:id_phong_kham(ten_phong_kham), chan_doan(benh(id_benh, ten_benh)) ')
            .eq('id_ho_so', record_id)
            .order('thoi_gian_kham', { ascending: false });
        
        if (error) {
            message.error("Lỗi khi tải lịch sử khám: " + error.message);
        } else {
            setAppointments(data);
        }
        setLoading(false);
    }, [record_id]);

    const fetchInitialData = useCallback(async () => {
        const { data: doctorsData } = await supabase.from('bac_si').select('id_bac_si, tai_khoan!id_bac_si(ho_ten)');
        if (doctorsData) setDoctors(doctorsData);

        const { data: clinicsData } = await supabase.from('phong_kham').select('*');
        if (clinicsData) setClinics(clinicsData);

        const { data: diseasesData } = await supabase.from('benh').select('*');
        if (diseasesData) setDiseases(diseasesData);

        const { data: medicinesData } = await supabase.from('thuoc').select('*').gt('so_luong_ton_kho', 0);
        if (medicinesData) setMedicines(medicinesData);
    }, []);

    useEffect(() => {
        fetchAppointments();
        fetchInitialData();
    }, [fetchAppointments, fetchInitialData]);

    useEffect(() => {
        const getShiftFromTime = (time: dayjs.Dayjs): string | null => {
            const hour = time.hour();
            if (hour >= 7 && hour < 12) return 'Sáng';
            if (hour >= 13 && hour < 17) return 'Chiều';
            if (hour >= 18 && hour < 21) return 'Tối';
            return null;
        };

        const findAvailableDoctors = async () => {
            if (!appointmentTime) {
                setAvailableDoctors([]);
                return;
            }
            setIsFindingDoctors(true);
            const date = appointmentTime.format('YYYY-MM-DD');
            const shift = getShiftFromTime(appointmentTime);

            if (!shift) {
                setAvailableDoctors([]);
                setIsFindingDoctors(false);
                return;
            }

            const { data: dutyData } = await supabase.from('lich_truc').select('id_bac_si').eq('ngay_truc', date).eq('ca_truc', shift);
            if (!dutyData || dutyData.length === 0) {
                setAvailableDoctors([]);
                setIsFindingDoctors(false);
                return;
            }

            const doctorIds = dutyData.map(d => d.id_bac_si);
            const { data: doctorsData } = await supabase.from('bac_si').select('id_bac_si, tai_khoan!id_bac_si(ho_ten), chuyen_khoa!id_chuyen_khoa(ten_chuyen_khoa)').in('id_bac_si', doctorIds);

            if (doctorsData) setAvailableDoctors(doctorsData);
            setIsFindingDoctors(false);
        };

        findAvailableDoctors();
        editForm.setFieldsValue({ id_bac_si: null });
    }, [appointmentTime, editForm]);

    const handleEdit = (appointment: any | null) => {
        setEditingAppointment(appointment);
        if (appointment) {
            editForm.setFieldsValue({ ...appointment, thoi_gian_kham: dayjs(appointment.thoi_gian_kham) });
        } else {
            editForm.resetFields();
        }
        setIsEditModalVisible(true);
    };

    const handleEditOk = async () => {
        try {
            const values = await editForm.validateFields();
            const submissionData = { ...values, thoi_gian_kham: dayjs(values.thoi_gian_kham).toISOString(), id_ho_so: record_id, id_benh_nhan: patient_id, trang_thai: 'Đã Hẹn' };
            let error;
            if (editingAppointment) {
                const { error: updateError } = await supabase.from('lich_kham').update(submissionData).eq('id_lich_kham', editingAppointment.id_lich_kham);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('lich_kham').insert([submissionData]);
                error = insertError;
            }
            if (error) throw error;
            message.success(editingAppointment ? 'Cập nhật thành công!' : 'Tạo lịch khám mới thành công!');
            setIsEditModalVisible(false);
            fetchAppointments();
        } catch (info) { console.log('Validate Failed:', info); }
    };

    const handleCancelAppointment = () => {
        Modal.confirm({ title: 'Xác nhận huỷ lịch khám', content: `Bạn có chắc muốn huỷ lịch khám #${editingAppointment.id_lich_kham}?`, okText: 'Xác nhận huỷ', cancelText: 'Không', onOk: async () => {
            const { error } = await supabase.from('lich_kham').update({ trang_thai: 'Đã Huỷ' }).eq('id_lich_kham', editingAppointment.id_lich_kham);
            if (error) { message.error(`Lỗi khi huỷ lịch khám: ${error.message}`);
            } else { message.success('Huỷ lịch khám thành công.'); setIsEditModalVisible(false); fetchAppointments(); }
        }});
    };

    const handleConclude = (appointment: any) => {
        setEditingAppointment(appointment);
        const diseaseIds = appointment.chan_doan.map((d: any) => d.benh.id_benh);
        conclusionForm.setFieldsValue({ ...appointment, benh_ids: diseaseIds, prescription: [{}] });
        setIsConclusionModalVisible(true);
    };

    const handleConcludeOk = async () => {
        try {
            const values = await conclusionForm.validateFields();
            const cleanedPrescription = (values.prescription || []).filter((p: any) => p && p.id_thuoc && p.so_luong && p.lieu_dung);
            const { error } = await supabase.rpc('submit_conclusion_and_prescription', { p_lich_kham_id: editingAppointment.id_lich_kham, p_ket_luan: values.ket_luan, p_benh_ids: values.benh_ids || [], p_medicines: cleanedPrescription });
            if (error) throw error;
            message.success('Đã lưu kết luận và đơn thuốc.');
            setIsConclusionModalVisible(false);
            fetchAppointments();
        } catch (info) { console.log('Validate Failed:', info); message.error('Lưu thất bại, vui lòng kiểm tra lại thông tin.'); }
    };

    const columns = [
        { title: 'Ngày khám', dataIndex: 'thoi_gian_kham', key: 'thoi_gian_kham', render: (ts:string) => ts ? new Date(ts).toLocaleString('vi-VN') : '-' },
        { title: 'Bác sĩ', dataIndex: ['bac_si', 'tai_khoan', 'ho_ten'], key: 'bac_si' },
        { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham' },
        { title: 'Kết luận', dataIndex: 'ket_luan', key: 'ket_luan', render: (text:string) => text || '-' },
        { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai', render: (status:string) => { let color = 'default'; if (status === 'Đã Khám') color = 'success'; else if (status === 'Đã Huỷ') color = 'error'; return <Tag color={color}>{status}</Tag>; }},
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    {!isRecordCancelled && (
                        <>
                            {(isReceptionist || isAdmin) && record.trang_thai === 'Đã Hẹn' && <Button size="small" onClick={() => handleEdit(record)}>Cập nhật</Button>}
                            {(isDoctor || isAdmin) && record.trang_thai === 'Đã Hẹn' && <Button type="primary" size="small" onClick={() => handleConclude(record)}>Kết luận & Kê đơn</Button>}
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Button onClick={() => handleEdit(null)} type="primary" style={{ marginBottom: 16 }} disabled={isRecordCancelled}>Tạo Lịch khám mới</Button>
            <Table columns={columns} dataSource={appointments} loading={loading} rowKey="id_lich_kham" size="small" />
            <Modal title={editingAppointment ? `Cập nhật Lịch khám #${editingAppointment.id_lich_kham}` : 'Tạo Lịch khám mới'} visible={isEditModalVisible} onCancel={() => setIsEditModalVisible(false)} footer={[<Button key="back" onClick={() => setIsEditModalVisible(false)}>Đóng</Button>, (editingAppointment && <Button key="cancel" danger onClick={handleCancelAppointment}>Huỷ lịch</Button>), <Button key="submit" type="primary" onClick={handleEditOk}>Lưu</Button>]} width={600}>
                <Form form={editForm} layout="vertical">
                    <Form.Item name="ly_do_kham" label="Lý do khám" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="thoi_gian_kham" label="Thời gian khám" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" /></Form.Item>
                    <Form.Item name="id_bac_si" label="Bác sĩ" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="children" placeholder="Chọn bác sĩ có lịch trực..." loading={isFindingDoctors} disabled={!appointmentTime}>
                            {availableDoctors.map(d => <Option key={d.id_bac_si} value={d.id_bac_si}>{`${d.tai_khoan.ho_ten} (${d.chuyen_khoa.ten_chuyen_khoa})`}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="id_phong_kham" label="Phòng khám" rules={[{ required: true }]}>
                        <Select placeholder="Chọn phòng khám">{clinics.map(c => <Option key={c.id_phong_kham} value={c.id_phong_kham}>{c.ten_phong_kham}</Option>)}</Select>
                    </Form.Item>
                </Form>
            </Modal>
            <Modal title={`Kết luận cho Lịch khám #${editingAppointment?.id_lich_kham}`} visible={isConclusionModalVisible} onOk={handleConcludeOk} onCancel={() => setIsConclusionModalVisible(false)} okText="Lưu Kết luận & Đơn thuốc" cancelText="Huỷ" width={800}>
                <Form form={conclusionForm} layout="vertical">
                    <Tabs defaultActiveKey="1">
                        <TabPane tab="Kết luận & Chẩn đoán" key="1">
                            <Form.Item name="ket_luan" label="Kết luận của Bác sĩ" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
                            <Form.Item name="benh_ids" label="Chẩn đoán"><Select mode="multiple" allowClear placeholder="Chọn các chẩn đoán (nếu có)" optionFilterProp="children">{diseases.map(d => <Option key={d.id_benh} value={d.id_benh}>{d.ten_benh}</Option>)}</Select></Form.Item>
                        </TabPane>
                        <TabPane tab="Kê đơn thuốc" key="2">
                            <Form.List name="prescription">{(fields, { add, remove }) => (<>{fields.map(({ key, name, ...restField }) => (<Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline"><Form.Item {...restField} name={[name, 'id_thuoc']} rules={[{ required: true, message: 'Vui lòng chọn thuốc' }]} style={{width: '250px'}}><Select showSearch placeholder="Chọn thuốc" optionFilterProp="children">{medicines.map(m => <Option key={m.id_thuoc} value={m.id_thuoc}>{`${m.ten_thuoc} (Tồn: ${m.so_luong_ton_kho})`}</Option>)}</Select></Form.Item><Form.Item {...restField} name={[name, 'so_luong']} rules={[{ required: true, message: 'Nhập SL' }]}><InputNumber placeholder="SL" min={1} /></Form.Item><Form.Item {...restField} name={[name, 'lieu_dung']} rules={[{ required: true, message: 'Nhập liều dùng' }]} style={{width: '250px'}}><Input placeholder="Liều dùng (VD: Sáng 1 viên, tối 1 viên)" /></Form.Item><MinusCircleOutlined onClick={() => remove(name)} /></Space>))}<Form.Item><Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm thuốc</Button></Form.Item></>)}</Form.List>
                        </TabPane>
                    </Tabs>
                </Form>
            </Modal>
        </div>
    );
};

// ==============================================
// Chỉ định CLS Tab Component
// ==============================================
const ChiDinhClsTab = ({ record_id, record_status }: { record_id: number, record_status: string }) => {
    const { user } = useAuth();
    const [clsOrders, setClsOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clsServices, setClsServices] = useState<any[]>([]);
    const [form] = Form.useForm();
    const isRecordCancelled = record_status === 'Đã huỷ';

    const fetchClsOrders = useCallback(async () => {
        setLoading(true);
        const { data: appointmentData } = await supabase.from('lich_kham').select('id_lich_kham').eq('id_ho_so', record_id);
        if (!appointmentData || appointmentData.length === 0) {
            setClsOrders([]);
            setLoading(false);
            return;
        }
        const appointmentIds = appointmentData.map(a => a.id_lich_kham);

        const { data, error } = await supabase.from('chi_dinh_cls').select('*, dich_vu_cls:id_dich_vu(ten_dich_vu), bac_si:id_bac_si_chi_dinh(tai_khoan!id_bac_si(ho_ten))').in('id_lich_kham', appointmentIds).order('thoi_gian_tao_chi_dinh', { ascending: false });
        if (error) {
            message.error("Lỗi khi tải danh sách chỉ định CLS: " + error.message);
        } else {
            setClsOrders(data);
        }
        setLoading(false);
    }, [record_id]);

    const fetchInitialData = useCallback(async () => {
        const { data: appData } = await supabase.from('lich_kham').select('id_lich_kham, thoi_gian_kham').eq('id_ho_so', record_id);
        if (appData) setAppointments(appData);

        const { data: serviceData } = await supabase.from('dich_vu_cls').select('*');
        if (serviceData) setClsServices(serviceData);
    }, [record_id]);

    useEffect(() => {
        fetchClsOrders();
        fetchInitialData();
    }, [fetchClsOrders, fetchInitialData]);

    const handleAddNew = () => {
        form.resetFields();
        form.setFieldsValue({ id_bac_si_chi_dinh: user?.id });
        setIsModalVisible(true);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const { error } = await supabase.from('chi_dinh_cls').insert([values]);
            if (error) throw error;
            message.success('Tạo chỉ định CLS thành công!');
            setIsModalVisible(false);
            fetchClsOrders();
        } catch (err) {
            console.log('Validate failed:', err);
        }
    };

    const columns = [
        { title: 'Mã LK', dataIndex: 'id_lich_kham', key: 'id_lich_kham', render: (id:number) => `#${id}` },
        { title: 'Tên dịch vụ', dataIndex: ['dich_vu_cls', 'ten_dich_vu'], key: 'dich_vu' },
        { title: 'Bác sĩ chỉ định', dataIndex: ['bac_si', 'tai_khoan', 'ho_ten'], key: 'bac_si' },
        { title: 'Thời gian tạo', dataIndex: 'thoi_gian_tao_chi_dinh', key: 'thoi_gian_tao_chi_dinh', render: (ts:string) => new Date(ts).toLocaleString('vi-VN') },
        { title: 'Trạng thái', dataIndex: 'trang_thai_chi_dinh', key: 'trang_thai_chi_dinh', render: (status:string) => <Tag>{status}</Tag> },
    ];

    return (
        <div>
            <Button type="primary" style={{ marginBottom: 16 }} onClick={handleAddNew} disabled={isRecordCancelled}>
                Tạo Chỉ định mới
            </Button>
            <Table columns={columns} dataSource={clsOrders} loading={loading} rowKey="id_chi_dinh" size="small" />
            <Modal title="Tạo Chỉ định Cận lâm sàng" visible={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)} okText="Tạo" cancelText="Huỷ">
                <Form form={form} layout="vertical">
                    <Form.Item name="id_lich_kham" label="Buổi khám" rules={[{ required: true }]}>
                        <Select placeholder="Chọn buổi khám để gắn chỉ định">
                            {appointments.map(a => <Option key={a.id_lich_kham} value={a.id_lich_kham}>{`#${a.id_lich_kham} - ${new Date(a.thoi_gian_kham).toLocaleString('vi-VN')}`}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="id_dich_vu" label="Dịch vụ CLS" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="children" placeholder="Chọn dịch vụ cận lâm sàng">
                            {clsServices.map(s => <Option key={s.id_dich_vu} value={s.id_dich_vu}>{s.ten_dich_vu}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="id_bac_si_chi_dinh" label="Bác sĩ chỉ định" rules={[{ required: true }]}>
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="ghi_chu" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ==============================================
// Main Page Component
// ==============================================
const MedicalRecordDetailPage = ({ params }: { params: { id: string } }) => {
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!params.id) {
      router.push('/dashboard/appointments');
      return;
    }

    const fetchRecord = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ho_so_benh_an')
        .select(`*,
            benh_nhan:id_benh_nhan(*)
        `)
        .eq('id_ho_so', params.id)
        .single();

      if (error || !data) {
        message.error('Không thể tải thông tin hồ sơ.');
        router.push('/dashboard/appointments');
      } else {
        setRecord(data);
      }
      setLoading(false);
    };

    fetchRecord();
  }, [params.id, router]);

  if (loading || !record) {
    return <Spin size="large" className="flex justify-center items-center h-full" />;
  }

  const renderStatusTag = (status: string) => {
    let color = 'default';
    if (status === 'Đang xử lý') color = 'gold';
    else if (status === 'Hoàn tất') color = 'success';
    else if (status === 'Đã huỷ') color = 'error';
    return <Tag color={color}>{status.toUpperCase()}</Tag>;
  }

  return (
    <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
                <Button onClick={() => router.push('/dashboard/appointments')} type="link" style={{ padding: 0, marginBottom: 16 }}>
                    &larr; Quay lại danh sách
                </Button>
                <Title level={2} style={{ margin: 0 }}>
                    {`Hồ sơ Bệnh án #${record.id_ho_so}`}
                </Title>
            </Col>
            <Col>
                {renderStatusTag(record.trang_thai)}
            </Col>
        </Row>
        
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Bệnh nhân">{record.benh_nhan?.ho_ten || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">{record.benh_nhan?.ngay_sinh ? new Date(record.benh_nhan.ngay_sinh).toLocaleDateString('vi-VN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày mở hồ sơ">{new Date(record.thoi_gian_mo_ho_so).toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Loại bệnh án"><Tag color={record.loai_benh_an === 'Nội trú' ? 'red' : 'blue'}>{record.loai_benh_an}</Tag></Descriptions.Item>
        </Descriptions>

        <Tabs defaultActiveKey="1">
            <TabPane tab="Lịch sử Khám bệnh" key="1">
                <LichKhamTab record_id={record.id_ho_so} patient_id={record.id_benh_nhan} record_status={record.trang_thai} />
            </TabPane>
            <TabPane tab="Chỉ định & Kết quả CLS" key="2">
                <ChiDinhClsTab record_id={record.id_ho_so} record_status={record.trang_thai} />
            </TabPane>
            <TabPane tab="Đơn thuốc" key="3">
                <p>Chức năng quản lý đơn thuốc sẽ được phát triển ở đây.</p>
            </TabPane>
        </Tabs>
    </Card>
  );
};

export default MedicalRecordDetailPage;
