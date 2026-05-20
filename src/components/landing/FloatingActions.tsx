"use client";

import { FloatButton } from "antd";
import { PhoneOutlined, ArrowUpOutlined } from "@ant-design/icons";

// TODO: [Phúc] - Implement "Scroll to top"
// TODO: [Phúc] - Implement "Quick Call" button
export default function FloatingActions() {
  return (
    <>
      <FloatButton.Group shape="circle" style={{ right: 24, bottom: 24 }}>
        <FloatButton icon={<PhoneOutlined />} tooltip="Gọi khẩn cấp" type="primary" />
        <FloatButton.BackTop icon={<ArrowUpOutlined />} visibilityHeight={400} />
      </FloatButton.Group>
    </>
  );
}
