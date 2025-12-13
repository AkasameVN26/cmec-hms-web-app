"use client";

import { useState, useRef, useEffect } from "react";
import {
  FloatButton,
  Card,
  Button,
  List,
  Avatar,
  Typography,
  Space,
  Spin,
} from "antd";
import {
  CommentOutlined,
  CloseOutlined,
  UserOutlined,
  RobotOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

const AIChatWidget = ({
  recordId,
}: {
  recordId: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content: `Xin chào! Tôi là trợ lý AI. Để tôi tóm tắt hồ sơ bệnh án #${recordId} cho bạn.`,
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSummarizeRecord = async () => {
    setIsLoading(true);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Tóm tắt hồ sơ bệnh án",
      timestamp: new Date(),
    };

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      role: "ai",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsgPlaceholder]);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/summarize-stream/${recordId}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body)
        throw new Error("ReadableStream not supported in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
          )
        );
      }

    } catch (error: any) {
      console.error("Error summarizing medical record:", error);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "ai",
        content: `Đã xảy ra lỗi: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== aiMsgId), errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<CommentOutlined />}
        type="primary"
        tooltip="Chat với AI"
        onClick={() => setIsOpen(!isOpen)}
        style={{ right: 24, bottom: 24, width: 56, height: 56 }}
      />

      {isOpen && (
        <Card
          title={
            <Space>
              <RobotOutlined style={{ color: "#1890ff" }} />
              <Text strong>Trợ lý AI</Text>
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setIsOpen(false)}
            />
          }
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            width: 400,
            height: 600,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08)",
            borderRadius: "12px",
          }}
          bodyStyle={{
            flex: 1,
            overflow: "hidden",
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
          headStyle={{
            minHeight: 46,
            padding: "0 12px",
          }}
        >
          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              backgroundColor: "#f5f5f5",
            }}
          >
            <List
              dataSource={messages}
              split={false}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "4px 0",
                    justifyContent:
                      item.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        item.role === "user" ? "row-reverse" : "row",
                      maxWidth: "95%",
                      gap: 8,
                    }}
                  >
                    <Avatar
                      size="small"
                      icon={
                        item.role === "user" ? (
                          <UserOutlined />
                        ) : (
                          <RobotOutlined />
                        )
                      }
                      style={{
                        backgroundColor:
                          item.role === "user" ? "#87d068" : "#1890ff",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        backgroundColor:
                          item.role === "user" ? "#95de64" : "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        borderTopRightRadius:
                          item.role === "user" ? "2px" : "12px",
                        borderTopLeftRadius:
                          item.role === "ai" ? "2px" : "12px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        maxWidth: "100%",
                      }}
                    >
                      <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                        {item.content}
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
            {isLoading && (
              <div style={{ padding: "8px 0", display: "flex", gap: 8 }}>
                <Avatar
                  size="small"
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: "#1890ff" }}
                />
                <div
                  style={{
                    backgroundColor: "#fff",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    borderTopLeftRadius: "2px",
                  }}
                >
                  <Spin size="small" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid #f0f0f0",
              backgroundColor: "#fff",
              textAlign: "center",
            }}
          >
            <Button
              type="primary"
              block
              onClick={handleSummarizeRecord}
              loading={isLoading}
              disabled={isLoading}
            >
              Tóm tắt hồ sơ bệnh án
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};

export default AIChatWidget;
