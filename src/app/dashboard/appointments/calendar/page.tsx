'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, message, Modal, Form, Input, Select, DatePicker, Button, Row, Col, Typography, Tag, AutoComplete, Descriptions } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg, EventSourceInput } from '@fullcalendar/core';
import dayjs from 'dayjs';
import NProgress from 'nprogress';
import { useDebounce } from '@/hooks/useDebounce';

const { Option } = Select;
const { Title, Text } = Typography;

const AppointmentCalendarPage = () => {
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [form] = Form.useForm();
    const calendarRef = useRef<FullCalendar>(null);

    // Data for forms and filters
    const [clinics, setClinics] = useState<any[]>([]);

    // Patient Search
    const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; id: string; recordId: number | null }[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const debouncedSearchTerm = useDebounce(patientSearch, 500);

    // Available doctors for a given slot
    const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
    const [isFindingDoctors, setIsFindingDoctors] = useState(false);

    // Initial data fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: clinicsData } = await supabase.from('phong_kham').select('*');
            if (clinicsData) setClinics(clinicsData);
        };
        fetchInitialData();
    }, []);

    // Effect for debounced patient search (now only searches patients with open records)
    useEffect(() => {
        const searchPatientsWithOpenRecords = async () => {
            if (!debouncedSearchTerm) {
                setPatientOptions([]);
                return;
            }

            const { data, error } = await supabase
                .from('ho_so_benh_an')
                .select('id_ho_so, benh_nhan!inner(id_benh_nhan, ho_ten)')
                .eq('trang_thai', 'Đang xử lý')
                .ilike('benh_nhan.ho_ten', `%${debouncedSearchTerm}%`)
                .limit(10);

            if (error) {
                console.error('Error searching patients:', error);
                return;
            }

            if (data) {
                const options = data.map((record: any) => ({
                    value: record.benh_nhan.ho_ten,
                    label: record.benh_nhan.ho_ten,
                    id: record.benh_nhan.id_benh_nhan,
                    recordId: record.id_ho_so
                }));
                setPatientOptions(options as any);
            }
        };

        searchPatientsWithOpenRecords();
    }, [debouncedSearchTerm]);

    const fetchEvents: EventSourceInput = async (fetchInfo, successCallback, failureCallback) => {
        NProgress.start();
        const { data, error } = await supabase.rpc('get_calendar_events', {
            start_date: fetchInfo.startStr,
            end_date: fetchInfo.endStr
        });

        if (error) {
            message.error("Lỗi khi tải dữ liệu lịch: " + error.message);
            failureCallback(error);
        } else {
            successCallback(data || []);
        }
        NProgress.done();
    };

    const findAvailableDoctors = async (time: Date) => {
        setIsFindingDoctors(true);
        setAvailableDoctors([]);
        const getShiftFromTime = (t: dayjs.Dayjs): string | null => {
            const hour = t.hour();
            if (hour >= 7 && hour < 12) return 'Sáng';
            if (hour >= 13 && hour < 17) return 'Chiều';
            if (hour >= 18 && hour < 21) return 'Tối';
            return null;
        };

        const date = dayjs(time).format('YYYY-MM-DD');
        const shift = getShiftFromTime(dayjs(time));

        if (!shift) {
            message.warning('Vui lòng chọn giờ trong ca làm việc (Sáng 7-12h, Chiều 13-17h, Tối 18-21h).');
            setIsFindingDoctors(false);
            return;
        }

        const { data: dutyData } = await supabase.from('lich_truc').select('id_bac_si').eq('ngay_truc', date).eq('ca_truc', shift);
        if (!dutyData || dutyData.length === 0) {
            message.error(`Không có bác sĩ nào trực ca ${shift.toLowerCase()} ngày ${dayjs(time).format('DD/MM/YYYY')}.`);
            setIsFindingDoctors(false);
            return;
        }

        const doctorIds = dutyData.map(d => d.id_bac_si);
        const { data: doctorsData } = await supabase
            .from('bac_si')
            .select('id_bac_si, tai_khoan!inner(ho_ten), chuyen_khoa!inner(ten_chuyen_khoa)')
            .in('id_bac_si', doctorIds);

        if (doctorsData) setAvailableDoctors(doctorsData);
        setIsFindingDoctors(false);
    };

    const handleDateClick = async (arg: DateClickArg) => {
        form.resetFields();
        form.setFieldsValue({ thoi_gian_kham: dayjs(arg.date) });
        setIsModalVisible(true);
        await findAvailableDoctors(arg.date);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        setSelectedEvent(clickInfo.event);
        setIsDetailModalVisible(true);
    };

    const handlePatientSelect = (value: string, option: any) => {
        form.setFieldsValue({ id_benh_nhan: option.id, id_ho_so: option.recordId });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (!values.id_ho_so) {
                message.error('Không thể tạo lịch hẹn vì bệnh nhân này không có hồ sơ bệnh án đang xử lý.');
                return;
            }

            const submissionData = {
                id_benh_nhan: values.id_benh_nhan,
                id_ho_so: values.id_ho_so,
                id_bac_si: values.id_bac_si,
                id_phong_kham: values.id_phong_kham,
                ly_do_kham: values.ly_do_kham,
                thoi_gian_kham: dayjs(values.thoi_gian_kham).toISOString(),
                trang_thai: 'Đã Hẹn'
            };

            const { error } = await supabase.from('lich_kham').insert([submissionData]);

            if (error) throw error;
            message.success('Tạo lịch hẹn mới thành công!');
            setIsModalVisible(false);
            calendarRef.current?.getApi().refetchEvents();
        } catch (info) {
            console.log('Validate Failed:', info);
        }
    };

    return (
        <Card title="Đặt lịch hẹn nhanh">
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridWeek,timeGridDay'
                }}
                allDaySlot={false}
                locale='vi'
                slotDuration='00:30:00'
                snapDuration='00:30:00'
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                events={fetchEvents}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                editable={false}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            />

            <Modal
                title="Tạo Lịch hẹn mới"
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText="Lưu"
                cancelText="Huỷ"
                width={700}
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Bệnh nhân (chỉ tìm bệnh nhân có hồ sơ đang mở)" name="patient_search" rules={[{ required: true, message: 'Vui lòng tìm và chọn bệnh nhân' }]}>
                        <AutoComplete
                            options={patientOptions}
                            onSelect={handlePatientSelect}
                            onSearch={(text) => setPatientSearch(text)}
                            placeholder="Nhập tên bệnh nhân để tìm kiếm..."
                        />
                    </Form.Item>
                    <Form.Item name="id_benh_nhan" hidden><Input /></Form.Item>
                    <Form.Item name="id_ho_so" hidden><Input /></Form.Item>

                    <Form.Item name="ly_do_kham" label="Lý do khám" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="thoi_gian_kham" label="Thời gian khám" rules={[{ required: true }]}>
                                <DatePicker showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} minuteStep={30} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="id_phong_kham" label="Phòng khám" rules={[{ required: true, message: 'Vui lòng chọn phòng khám' }]}>
                                <Select showSearch optionFilterProp="children" placeholder="Chọn phòng khám">
                                    {clinics.map(c => <Option key={c.id_phong_kham} value={c.id_phong_kham}>{c.ten_phong_kham}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                     <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="id_bac_si" label="Bác sĩ" rules={[{ required: true, message: 'Vui lòng chọn bác sĩ' }]}>
                                <Select showSearch optionFilterProp="children" placeholder="Chọn bác sĩ trong ca trực" loading={isFindingDoctors}>
                                    {availableDoctors.map(d => <Option key={d.id_bac_si} value={d.id_bac_si}>{`${d.tai_khoan.ho_ten} (${d.chuyen_khoa.ten_chuyen_khoa})`}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {selectedEvent && (
                <Modal
                    title={`Chi tiết Lịch hẹn`}
                    open={isDetailModalVisible}
                    onCancel={() => setIsDetailModalVisible(false)}
                    footer={[
                        <Button key="back" onClick={() => setIsDetailModalVisible(false)}>Đóng</Button>,
                        <Button key="profile" type="primary" onClick={() => { NProgress.start(); router.push(`/dashboard/appointments/${selectedEvent.extendedProps.recordId}`) }}>
                            Tới hồ sơ bệnh án
                        </Button>,
                    ]}
                >
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Bệnh nhân"><Text strong>{selectedEvent.title}</Text></Descriptions.Item>
                        <Descriptions.Item label="Bác sĩ">{`${selectedEvent.extendedProps.doctorName} (${selectedEvent.extendedProps.doctorSpecialty || 'N/A'})`}</Descriptions.Item>
                        <Descriptions.Item label="Thời gian">{dayjs(selectedEvent.start).format('HH:mm, DD/MM/YYYY')}</Descriptions.Item>
                        <Descriptions.Item label="Lý do khám">{selectedEvent.extendedProps.reason}</Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color="#1890ff">{selectedEvent.extendedProps.status}</Tag>
                        </Descriptions.Item>
                    </Descriptions>
                </Modal>
            )}
        </Card>
    );
};

export default AppointmentCalendarPage;