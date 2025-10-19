'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Modal, Form, Select, Button, message, Spin, Card, Typography, Row, Col, Tag, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

const { Title } = Typography;
const { Option } = Select;

const SchedulesPage = () => {
    const [schedules, setSchedules] = useState<any>({});
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [currentMonth, setCurrentMonth] = useState(dayjs());
    
    // State for the filter
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null); // For the Select input
    const [appliedDoctorFilter, setAppliedDoctorFilter] = useState<string | null>(null); // For the actual query

    const [form] = Form.useForm();
    const searchParams = useSearchParams();

    // Effect to initialize filter from URL on first load
    useEffect(() => {
        const doctorIdFromUrl = searchParams.get('doctor_id');
        if (doctorIdFromUrl) {
            setSelectedDoctor(doctorIdFromUrl);
            setAppliedDoctorFilter(doctorIdFromUrl);
        }
    }, [searchParams]); // Runs only once on mount

    // Effect to fetch doctors list
    useEffect(() => {
        const fetchDoctors = async () => {
            const { data, error } = await supabase.from('bac_si').select('id_bac_si, tai_khoan!inner(ho_ten)');
            if (data) setDoctors(data);
        };
        fetchDoctors();
    }, []);

    // Main data fetching effect
    useEffect(() => {
        const fetchSchedules = async () => {
            setLoading(true);
            const startOfMonth = currentMonth.startOf('month').format('YYYY-MM-DD');
            const endOfMonth = currentMonth.endOf('month').format('YYYY-MM-DD');

            let query = supabase
                .from('lich_truc')
                .select('*, bac_si:id_bac_si(tai_khoan!inner(ho_ten))')
                .gte('ngay_truc', startOfMonth)
                .lte('ngay_truc', endOfMonth);

            if (appliedDoctorFilter) {
                query = query.eq('id_bac_si', appliedDoctorFilter);
            }

            const { data, error } = await query;

            if (error) {
                message.error("Lỗi khi tải lịch trực: " + error.message);
            } else {
                const groupedByDate = data.reduce((acc, schedule) => {
                    const date = schedule.ngay_truc;
                    if (!acc[date]) {
                        acc[date] = [];
                    }
                    acc[date].push(schedule);
                    return acc;
                }, {});
                setSchedules(groupedByDate);
            }
            setLoading(false);
        };

        fetchSchedules();
    }, [currentMonth, appliedDoctorFilter]);

    const handleSelectDate = (date: Dayjs) => {
        setSelectedDate(date);
        const daySchedules = schedules[date.format('YYYY-MM-DD')] || [];
        form.setFieldsValue({
            sang_ids: daySchedules.filter((s:any) => s.ca_truc === 'Sáng').map((s:any) => s.id_bac_si),
            chieu_ids: daySchedules.filter((s:any) => s.ca_truc === 'Chiều').map((s:any) => s.id_bac_si),
            toi_ids: daySchedules.filter((s:any) => s.ca_truc === 'Tối').map((s:any) => s.id_bac_si),
        });
        setIsModalVisible(true);
    };

    const handleUpdateSchedule = async () => {
        try {
            const values = await form.validateFields();
            if (!selectedDate) return;

            const { error } = await supabase.rpc('update_on_call_schedule', {
                p_ngay_truc: selectedDate.format('YYYY-MM-DD'),
                p_sang_ids: values.sang_ids || [],
                p_chieu_ids: values.chieu_ids || [],
                p_toi_ids: values.toi_ids || [],
            });

            if (error) throw error;

            message.success(`Đã cập nhật lịch trực cho ngày ${selectedDate.format('DD/MM/YYYY')}`);
            setIsModalVisible(false);
            // Re-fetch data for the current month to show changes
            const fetchEvent = new CustomEvent('fetchSchedules');
            window.dispatchEvent(fetchEvent);
        } catch (err: any) {
            message.error(`Cập nhật thất bại: ${err.message}`);
        }
    };

    const dateCellRender = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        const daySchedules = schedules[dateStr] || [];
        const today = dayjs().startOf('day');
        let cellStyle: React.CSSProperties = {
            height: '100%',
            padding: '4px',
            borderRadius: '4px',
        };

        if (value.isBefore(today, 'day')) {
            cellStyle.backgroundColor = '#f5f5f5'; // Light gray for past
        } else if (value.isSame(today, 'day')) {
            cellStyle.backgroundColor = '#e6f7ff'; // Light blue for today
        }

        return (
            <div style={cellStyle}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {daySchedules.map((item: any) => (
                        <li key={item.id_lich_truc}>
                            <Tag color={item.ca_truc === 'Sáng' ? 'gold' : item.ca_truc === 'Chiều' ? 'geekblue' : 'purple'} style={{fontSize: '10px', margin: '1px'}}>
                                {`${item.ca_truc}: ${item.bac_si.tai_khoan.ho_ten}`}
                            </Tag>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={3}>Quản lý Lịch trực</Title>
                </Col>
                <Col xs={24} sm={16} md={12}>
                    <Space>
                        <Select 
                            allowClear
                            showSearch
                            style={{ width: 250 }}
                            placeholder="Chọn bác sĩ để lọc"
                            value={selectedDoctor}
                            onChange={value => setSelectedDoctor(value)}
                            optionFilterProp="children"
                        >
                            {doctors.map(t => <Option key={t.id_bac_si} value={t.id_bac_si}>{t.tai_khoan.ho_ten}</Option>)}
                        </Select>
                        <Button type="primary" onClick={() => setAppliedDoctorFilter(selectedDoctor)}>Lọc</Button>
                        <Button onClick={() => { setSelectedDoctor(null); setAppliedDoctorFilter(null); }}>Xóa lọc</Button>
                    </Space>
                </Col>
            </Row>
            <Spin spinning={loading}>
                <Calendar dateCellRender={dateCellRender} onSelect={handleSelectDate} onPanelChange={(date) => setCurrentMonth(date)} />
            </Spin>
            {selectedDate && (
                <Modal
                    title={`Chỉnh sửa lịch trực: ${selectedDate.format('DD/MM/YYYY')}`}
                    open={isModalVisible}
                    onOk={handleUpdateSchedule}
                    onCancel={() => setIsModalVisible(false)}
                    okText="Lưu thay đổi"
                    cancelText="Huỷ"
                >
                    <Form form={form} layout="vertical">
                        <Form.Item name="sang_ids" label="Ca Sáng (7h-12h)">
                            <Select mode="multiple" placeholder="Chọn bác sĩ trực" allowClear showSearch optionFilterProp="children">
                                {doctors.map(doc => <Option key={doc.id_bac_si} value={doc.id_bac_si}>{doc.tai_khoan.ho_ten}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name="chieu_ids" label="Ca Chiều (13h-17h)">
                            <Select mode="multiple" placeholder="Chọn bác sĩ trực" allowClear showSearch optionFilterProp="children">
                                {doctors.map(doc => <Option key={doc.id_bac_si} value={doc.id_bac_si}>{doc.tai_khoan.ho_ten}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name="toi_ids" label="Ca Tối (18h-21h)">
                            <Select mode="multiple" placeholder="Chọn bác sĩ trực" allowClear showSearch optionFilterProp="children">
                                {doctors.map(doc => <Option key={doc.id_bac_si} value={doc.id_bac_si}>{doc.tai_khoan.ho_ten}</Option>)}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </Card>
    );
};

export default SchedulesPage;
