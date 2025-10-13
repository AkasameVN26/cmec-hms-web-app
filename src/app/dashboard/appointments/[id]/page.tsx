'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, message, Spin, Descriptions, Button, Tag, Tabs, Row, Col, Typography, Table, Space, Modal, Form, DatePicker, Select, Input, InputNumber, Image } from 'antd';
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
    const { user, roles, can } = useAuth();
    const isAdmin = roles.includes('Quản lý');
    const isReceptionist = roles.includes('Lễ tân');

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isConclusionModalVisible, setIsConclusionModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
    const [viewingAppointment, setViewingAppointment] = useState<any | null>(null);
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

    const handleViewDetails = (appointment: any) => {
        setViewingAppointment(appointment);
        setIsDetailModalVisible(true);
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
            if (error) {
                message.error(`Lỗi khi huỷ lịch khám: ${error.message}`);
            } else {
                message.success('Huỷ lịch khám thành công.');
                setIsEditModalVisible(false);
                fetchAppointments();
            }
        }});
    };

    const handleConclude = (appointment: any) => {
        setEditingAppointment(appointment);
        const diseaseIds = appointment.chan_doan.map((d: any) => d.benh.id_benh);
        conclusionForm.setFieldsValue({ ...appointment, benh_ids: diseaseIds, ngay_tai_kham: appointment.ngay_tai_kham ? dayjs(appointment.ngay_tai_kham) : null, prescription: [] });
        setIsConclusionModalVisible(true);
    };

    const handleConcludeOk = async () => {
        try {
            const values = await conclusionForm.validateFields();
            const cleanedPrescription = (values.prescription || []).filter((p: any) => p && p.id_thuoc && p.so_luong && p.lieu_dung);
            const { error } = await supabase.rpc('submit_conclusion_and_prescription', { p_lich_kham_id: editingAppointment.id_lich_kham, p_ket_luan: values.ket_luan, p_benh_ids: values.benh_ids || [], p_medicines: cleanedPrescription, p_ngay_tai_kham: values.ngay_tai_kham ? dayjs(values.ngay_tai_kham).format('YYYY-MM-DD') : null });
            if (error) throw error;
            message.success('Đã lưu kết luận và đơn thuốc.');
            setIsConclusionModalVisible(false);
            fetchAppointments();
        } catch (info) { console.log('Validate Failed:', info); message.error('Lưu thất bại, vui lòng kiểm tra lại thông tin.'); }
    };

    const columns = [
        { title: 'Ngày khám', dataIndex: 'thoi_gian_kham', key: 'thoi_gian_kham', width: 180, render: (ts:string) => ts ? new Date(ts).toLocaleString('vi-VN') : '-' },
        { title: 'Bác sĩ', dataIndex: ['bac_si', 'tai_khoan', 'ho_ten'], key: 'bac_si', width: 200, render: (text:string) => <Typography.Text style={{ maxWidth: 200 }} ellipsis={{ tooltip: text }}>{text}</Typography.Text> },
        { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham', render: (text:string) => <Typography.Text style={{ maxWidth: 250 }} ellipsis={{ tooltip: text }}>{text}</Typography.Text> },
        { title: 'Kết luận', dataIndex: 'ket_luan', key: 'ket_luan', render: (text:string) => <Typography.Text style={{ maxWidth: 250 }} ellipsis={{ tooltip: text }}>{text || '-'}</Typography.Text> },
        { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai', width: 120, render: (status:string) => { let color = 'default'; if (status === 'Đã Khám') color = 'success'; else if (status === 'Đã Huỷ') color = 'error'; return <Tag color={color}>{status}</Tag>; }},
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right',
            width: 220,
            render: (_: any, record: any) => (
                <Space>
                    <Button size="small" onClick={() => handleViewDetails(record)}>Chi tiết</Button>
                    {!isRecordCancelled && (
                        <>
                            {(isReceptionist || isAdmin) && record.trang_thai === 'Đã Hẹn' && <Button size="small" onClick={() => handleEdit(record)}>Cập nhật</Button>}
                            {((can('appointment.result.update.assigned') && record.id_bac_si === user?.id) || can('appointment.update.all')) && record.trang_thai === 'Đã Hẹn' && <Button type="primary" size="small" onClick={() => handleConclude(record)}>Kết luận & Kê đơn</Button>}
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
            
            {/* View Details Modal */}
            {viewingAppointment && (
                <Modal title={`Chi tiết Lịch khám #${viewingAppointment.id_lich_kham}`} open={isDetailModalVisible} onCancel={() => setIsDetailModalVisible(false)} footer={<Button onClick={() => setIsDetailModalVisible(false)}>Đóng</Button>}>
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Trạng thái"><Tag>{viewingAppointment.trang_thai}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Thời gian khám">{new Date(viewingAppointment.thoi_gian_kham).toLocaleString('vi-VN')}</Descriptions.Item>
                        <Descriptions.Item label="Bác sĩ">{viewingAppointment.bac_si?.tai_khoan?.ho_ten}</Descriptions.Item>
                        <Descriptions.Item label="Phòng khám">{viewingAppointment.phong_kham?.ten_phong_kham}</Descriptions.Item>
                        <Descriptions.Item label="Lý do khám">{viewingAppointment.ly_do_kham}</Descriptions.Item>
                        <Descriptions.Item label="Kết luận">{viewingAppointment.ket_luan || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Chẩn đoán">{viewingAppointment.chan_doan.map((d:any) => d.benh.ten_benh).join(', ') || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Ngày tái khám">{viewingAppointment.ngay_tai_kham ? new Date(viewingAppointment.ngay_tai_kham).toLocaleDateString('vi-VN') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="Chi phí khám">{viewingAppointment.chi_phi_kham ? `${viewingAppointment.chi_phi_kham.toLocaleString('vi-VN')} VND` : '-'}</Descriptions.Item>
                    </Descriptions>
                </Modal>
            )}

            {/* Edit/Create Modal */}
            <Modal title={editingAppointment ? `Cập nhật Lịch khám #${editingAppointment.id_lich_kham}` : 'Tạo Lịch khám mới'} open={isEditModalVisible} onCancel={() => setIsEditModalVisible(false)} footer={[<Button key="back" onClick={() => setIsEditModalVisible(false)}>Đóng</Button>, (editingAppointment && <Button key="cancel" danger onClick={handleCancelAppointment}>Huỷ lịch</Button>), <Button key="submit" type="primary" onClick={handleEditOk}>Lưu</Button>]} width={600}>
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
                    <Form.Item name="chi_phi_kham" label="Chi phí khám (VND)">
                        <InputNumber style={{ width: '100%' }} placeholder="Nhập chi phí" min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Conclusion Modal */}
            <Modal title={`Kết luận cho Lịch khám #${editingAppointment?.id_lich_kham}`} open={isConclusionModalVisible} onOk={handleConcludeOk} onCancel={() => setIsConclusionModalVisible(false)} okText="Lưu Kết luận & Đơn thuốc" cancelText="Huỷ" width={800}>
                <Form form={conclusionForm} layout="vertical">
                    <Tabs defaultActiveKey="1">
                        <TabPane tab="Kết luận & Chẩn đoán" key="1">
                            <Form.Item name="ket_luan" label="Kết luận của Bác sĩ" rules={[{ required: true }]}><Input.TextArea rows={6} spellCheck={false} /></Form.Item>
                            <Form.Item name="benh_ids" label="Chẩn đoán"><Select mode="multiple" allowClear placeholder="Chọn các chẩn đoán (nếu có)" optionFilterProp="children">{diseases.map(d => <Option key={d.id_benh} value={d.id_benh}>{d.ten_benh}</Option>)}</Select></Form.Item>
                            <Form.Item name="ngay_tai_kham" label="Ngày tái khám">
                                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                            </Form.Item>
                        </TabPane>
                        <TabPane tab="Kê đơn thuốc" key="2">
                            <Form.List name="prescription">{(fields, { add, remove }) => (<>{fields.map(({ key, name, ...restField }) => {
                                const selectedMedicineId = conclusionForm.getFieldValue(['prescription', name, 'id_thuoc']);
                                const unit = medicines.find(m => m.id_thuoc === selectedMedicineId)?.don_vi_tinh;

                                return (<Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item {...restField} name={[name, 'id_thuoc']} rules={[{ required: true, message: 'Vui lòng chọn thuốc' }]} style={{width: '250px'}}>
                                        <Select showSearch placeholder="Chọn thuốc" optionFilterProp="children" onChange={() => conclusionForm.setFieldsValue({ prescription: [...conclusionForm.getFieldValue('prescription')]}) }>{medicines.map(m => <Option key={m.id_thuoc} value={m.id_thuoc}>{`${m.ten_thuoc} (Tồn: ${m.so_luong_ton_kho})`}</Option>)}</Select>
                                    </Form.Item>
                                    <Form.Item {...restField} name={[name, 'so_luong']} rules={[{ required: true, message: 'Nhập SL' }]}>
                                        <InputNumber placeholder="SL" min={1} style={{width: '70px'}}/>
                                    </Form.Item>
                                    <span style={{ minWidth: '40px' }}>{unit}</span>
                                    <Form.Item {...restField} name={[name, 'lieu_dung']} rules={[{ required: true, message: 'Nhập liều dùng' }]} style={{width: '250px'}}>
                                        <Input placeholder="Liều dùng (VD: Sáng 1 viên, tối 1 viên)" spellCheck={false} />
                                    </Form.Item>
                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                </Space>)
                            })}<Form.Item><Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm thuốc</Button></Form.Item></>)}</Form.List>
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
    const { user, can, profile } = useAuth();
    const [clsOrders, setClsOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isResultModalVisible, setIsResultModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clsServices, setClsServices] = useState<any[]>([]);
    const [form] = Form.useForm();
    const isRecordCancelled = record_status === 'Đã huỷ';

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


    const fetchClsOrders = useCallback(async () => {
        setLoading(true);
        const { data: appointmentData } = await supabase.from('lich_kham').select('id_lich_kham').eq('id_ho_so', record_id);
        if (!appointmentData || appointmentData.length === 0) {
            setClsOrders([]);
            setLoading(false);
            return;
        }
        const appointmentIds = appointmentData.map(a => a.id_lich_kham);

        const { data, error } = await supabase.from('chi_dinh_cls').select('*, dich_vu_cls:id_dich_vu(ten_dich_vu), bac_si:id_bac_si_chi_dinh(id_bac_si, tai_khoan!id_bac_si(ho_ten)), ket_qua_cls(*, ky_thuat_vien:id_ky_thuat_vien(tai_khoan!inner(ho_ten))) ').in('id_lich_kham', appointmentIds).order('thoi_gian_tao_chi_dinh', { ascending: false });
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
        setIsCreateModalVisible(true);
    };

    const handleCreateOk = async () => {
        try {
            const values = await form.validateFields();
            const { error } = await supabase.from('chi_dinh_cls').insert([values]);
            if (error) throw error;
            message.success('Tạo chỉ định CLS thành công!');
            setIsCreateModalVisible(false);
            fetchClsOrders();
        } catch (err) {
            console.log('Validate failed:', err);
        }
    };

    const handleViewResult = (record: any) => {
        setSelectedOrder(record);
        setIsResultModalVisible(true);
    };

    const handleCancelOrder = (record: any) => {
        Modal.confirm({
            title: 'Xác nhận huỷ chỉ định',
            content: `Bạn có chắc muốn huỷ chỉ định cho dịch vụ "${record.dich_vu_cls.ten_dich_vu}"?`,
            okText: 'Xác nhận huỷ',
            okType: 'danger',
            cancelText: 'Không',
            onOk: async () => {
                const { error } = await supabase.from('chi_dinh_cls').update({ trang_thai_chi_dinh: 'Đã huỷ' }).eq('id_chi_dinh', record.id_chi_dinh);
                if (error) {
                    message.error(`Lỗi khi huỷ chỉ định: ${error.message}`);
                } else {
                    message.success('Huỷ chỉ định thành công.');
                    fetchClsOrders();
                }
            }
        });
    };

    const columns = [
        { 
            title: 'Tên dịch vụ', 
            dataIndex: ['dich_vu_cls', 'ten_dich_vu'], 
            key: 'dich_vu',
            width: 200,
            render: (text: string) => text ? <Typography.Text style={{ maxWidth: 200 }} ellipsis={{ tooltip: text }}>{text}</Typography.Text> : '-'
        },
        { title: 'Bác sĩ chỉ định', dataIndex: ['bac_si', 'tai_khoan', 'ho_ten'], key: 'bac_si' },
        { title: 'Trạng thái', dataIndex: 'trang_thai_chi_dinh', key: 'trang_thai_chi_dinh', render: getStatusTag },
        { title: 'Kết luận', dataIndex: ['ket_qua_cls', 'ket_luan'], key: 'ket_luan', render: (text: string) => text ? <Typography.Text style={{ maxWidth: 600 }} ellipsis={{ tooltip: text }}>{text}</Typography.Text> : '-' },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    {record.trang_thai_chi_dinh === 'Hoàn thành' && (
                        <Button size="small" onClick={() => handleViewResult(record)}>Xem chi tiết</Button>
                    )}
                    {record.trang_thai_chi_dinh === 'Chờ thực hiện' && (user?.id === record.bac_si.id_bac_si || can('system.admin')) && (
                        <Button size="small" danger onClick={() => handleCancelOrder(record)}>Huỷ chỉ định</Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div>
            <Button type="primary" style={{ marginBottom: 16 }} onClick={handleAddNew} disabled={isRecordCancelled}>
                Tạo Chỉ định mới
            </Button>
            <Table columns={columns} dataSource={clsOrders} loading={loading} rowKey="id_chi_dinh" size="small" />
            
            {/* Create Order Modal */}
            <Modal title="Tạo Chỉ định Cận lâm sàng" open={isCreateModalVisible} onOk={handleCreateOk} onCancel={() => setIsCreateModalVisible(false)} okText="Tạo" cancelText="Huỷ">
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
                    footer={<Button onClick={() => setIsResultModalVisible(false)}>Đóng</Button>}
                    width={800}
                    >
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Dịch vụ">{selectedOrder.dich_vu_cls.ten_dich_vu}</Descriptions.Item>
                        <Descriptions.Item label="Thời gian tạo chỉ định">{new Date(selectedOrder.thoi_gian_tao_chi_dinh).toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="Thời gian trả kết quả">{new Date(selectedOrder.ket_qua_cls.thoi_gian_tra_ket_qua).toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="KTV thực hiện">{selectedOrder.ket_qua_cls.ky_thuat_vien?.tai_khoan?.ho_ten || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Kết luận">{selectedOrder.ket_qua_cls.ket_luan || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Chỉ số xét nghiệm">
                            <Input.TextArea readOnly autoSize={{ minRows: 4 }} value={selectedOrder.ket_qua_cls.chi_so_xet_nghiem ? JSON.stringify(selectedOrder.ket_qua_cls.chi_so_xet_nghiem, null, 2) : 'Không có'} spellCheck={false} />
                        </Descriptions.Item>
                        <Descriptions.Item label="File kết quả">
                        {selectedOrder.ket_qua_cls.duong_dan_file_ket_qua ? (
                            <Image width={200} src={`https://wkyyexkbgzahstfebtfh.supabase.co/storage/v1/object/public/cls_results/${selectedOrder.ket_qua_cls.duong_dan_file_ket_qua}`} alt="File kết quả" />
                        ) : 'Không có file đính kèm'}
                        </Descriptions.Item>
                    </Descriptions>
                </Modal>
            )}
        </div>
    );
}

// ==============================================
// Đơn thuốc Tab Component
// ==============================================
const DonThuocTab = ({ record_id }: { record_id: number }) => {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPrescriptions = useCallback(async () => {
        setLoading(true);
        // First, get all appointment IDs for the current medical record
        const { data: appointmentData, error: appointmentError } = await supabase.from('lich_kham').select('id_lich_kham').eq('id_ho_so', record_id);

        if (appointmentError || !appointmentData || appointmentData.length === 0) {
            if(appointmentError) message.error("Lỗi khi tải lịch khám của hồ sơ: " + appointmentError.message);
            setPrescriptions([]);
            setLoading(false);
            return;
        }
        const appointmentIds = appointmentData.map(a => a.id_lich_kham);

        // Then, get prescriptions for those appointments
        const { data, error } = await supabase
            .from('don_thuoc')
            .select(`
                *,
                lich_kham:id_lich_kham(
                    bac_si:id_bac_si(
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
            `)
            .in('id_lich_kham', appointmentIds)
            .order('thoi_gian_ke_don', { ascending: false });

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
            { title: 'Tên thuốc', dataIndex: ['thuoc', 'ten_thuoc'], key: 'ten_thuoc' },
            { title: 'Số lượng', dataIndex: 'so_luong', key: 'so_luong' },
            { title: 'Đơn vị', dataIndex: ['thuoc', 'don_vi_tinh'], key: 'don_vi_tinh' },
            { title: 'Liều dùng', dataIndex: 'lieu_dung', key: 'lieu_dung' },
        ];
        return <Table columns={detailColumns} dataSource={record.chi_tiet_don_thuoc} pagination={false} rowKey="id_chi_tiet_don_thuoc"/>;
    };

    const mainColumns = [
        { title: 'Mã đơn', dataIndex: 'id_don_thuoc', key: 'id_don_thuoc', render: (id:number) => `#${id}` },
        { title: 'Ngày kê đơn', dataIndex: 'thoi_gian_ke_don', key: 'thoi_gian_ke_don', render: (ts:string) => new Date(ts).toLocaleString('vi-VN') },
        { title: 'Bác sĩ kê đơn', dataIndex: ['lich_kham', 'bac_si', 'tai_khoan', 'ho_ten'], key: 'bac_si' },
        { title: 'Trạng thái', dataIndex: 'trang_thai_don_thuoc', key: 'trang_thai', render: (status:string) => <Tag>{status}</Tag> },
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
// Main Page Component
// ==============================================
const MedicalRecordDetailPage = ({ params }: { params: { id: string } }) => {
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { can } = useAuth();

  const fetchRecord = useCallback(async () => {
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
    }, [params.id, router]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleCloseRecord = () => {
      Modal.confirm({
          title: 'Xác nhận Đóng Hồ sơ Bệnh án',
          content: `Bạn có chắc muốn đóng hồ sơ #${record.id_ho_so}? Hành động này sẽ hoàn tất luồng xử lý và không thể hoàn tác dễ dàng.`,
          okText: 'Đóng hồ sơ',
          okType: 'primary',
          cancelText: 'Huỷ',
          onOk: async () => {
              const { error } = await supabase.from('ho_so_benh_an').update({
                  trang_thai: 'Hoàn tất',
                  thoi_gian_dong_ho_so: new Date().toISOString(),
              }).eq('id_ho_so', record.id_ho_so);

              if (error) {
                  message.error(`Lỗi khi đóng hồ sơ: ${error.message}`);
              } else {
                  message.success('Đã đóng hồ sơ bệnh án thành công.');
                  fetchRecord(); // Re-fetch data to show the new status
              }
          }
      });
  };

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
                <Space>
                    {renderStatusTag(record.trang_thai)}
                    {record.trang_thai === 'Đang xử lý' && can('patient.encounter.update') && (
                        <Button type="primary" onClick={handleCloseRecord}>Đóng hồ sơ</Button>
                    )}
                </Space>
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
                <DonThuocTab record_id={record.id_ho_so} />
            </TabPane>
        </Tabs>
    </Card>
  );
};

export default MedicalRecordDetailPage;
