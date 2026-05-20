"use client";

import { Modal } from "antd";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content?: React.ReactNode;
}

// TODO: [Phúc] - Create reusable modal for service/doctor details
export default function DetailModal({ isOpen, onClose, title, content }: DetailModalProps) {
  return (
    <Modal
      title={title || "Chi tiết"}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {content || <p>Nội dung chi tiết...</p>}
    </Modal>
  );
}
