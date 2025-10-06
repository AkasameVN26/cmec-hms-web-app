'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Select, message } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Option } = Select;

const EditAccountPage = ({ params }: { params: { id: string } }) => {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tai_khoan')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) {
      setAccount(data);
      form.setFieldsValue(data);
    } else {
      message.error('Không tìm thấy tài khoản');
    }
    setLoading(false);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('tai_khoan')
      .update({ vai_tro: values.vai_tro })
      .eq('id', params.id);

    if (error) {
      message.error(error.message);
    } else {
      message.success('Cập nhật tài khoản thành công');
      router.push('/dashboard/accounts');
    }
    setLoading(false);
  };

  return (
    <Card title="Chỉnh sửa tài khoản">
      {account && (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={account}
        >
          <Form.Item
            label="Email"
            name="email"
          >
            <p>{account.email}</p>
          </Form.Item>

          <Form.Item
            label="Vai trò"
            name="vai_tro"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò">
              <Option value="Quản lý">Quản lý</Option>
              <Option value="Bác sĩ">Bác sĩ</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};

export default EditAccountPage;
