'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Input, message, Typography } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

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
    
    // Calling an edge function to update the user's email securely
    const { error } = await supabase.functions.invoke('update-user-email', {
      body: {
        user_id: params.id,
        new_email: values.email,
      },
    });

    if (error) {
      message.error(`Lỗi khi cập nhật email: ${error.message}`);
    } else {
      message.success('Cập nhật email thành công. Người dùng sẽ cần xác minh email mới.');
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
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Vai trò"
            name="vai_tro"
          >
            <Text strong>{account.vai_tro}</Text>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};

export default EditAccountPage;
