"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FloatButton,
  Card,
  Button,
  List,
  Avatar,
  Typography,
  Space,
  Spin,
  Tooltip,
  Tag,
} from "antd";
import {
  CommentOutlined,
  CloseOutlined,
  RobotOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { ExplainResponse } from "@/types/ai";
import { aiService } from "@/services/api";
import AIChatMessageItem, { Message } from "./AIChatMessageItem";

const { Text } = Typography;

const AIChatWidget = ({
  recordId,
}: {
  recordId: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Explain / Evidence States
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  
  // Track which sentence is currently selected (clicked)
  const [selectedSummaryIdx, setSelectedSummaryIdx] = useState<number | null>(null);

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
  }, [messages, isOpen, explainData]);

  // Function to fetch explanation/evidence data
  const handleFetchEvidence = async (contentOverride?: string) => {
      // Use override content if provided, otherwise find the last AI message
      let summaryText = contentOverride;
      
      if (!summaryText) {
        const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai' && m.id !== 'welcome');
        if (lastAiMsg) summaryText = lastAiMsg.content;
      }
      
      if (!summaryText) return;

      // Don't refetch if we already have data for this exact summary (simple check)
      // For now, we always fetch to be safe or if re-summarized
      
      setIsExplainLoading(true);
      try {
          const data = await aiService.fetchExplanation(recordId, summaryText);
          setExplainData(data);
      } catch (error) {
          console.error("Explain error:", error);
      } finally {
          setIsExplainLoading(false);
      }
  };

  const handleSummarizeRecord = async () => {
    setIsLoading(true);
    setExplainData(null); // Reset evidence data
    setSelectedSummaryIdx(null);

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
        aiService.getSummaryStreamUrl(recordId),
        {
          method: "GET",
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error("ReadableStream not supported.");

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
      
      // Auto fetch evidence immediately after summary finishes
      await handleFetchEvidence(aiContent);

    } catch (error: any) {
      console.error("Error summarizing:", error);
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
        tooltip={!isOpen ? "Chat với AI" : "Đóng chat"}
        aria-label={!isOpen ? "Mở chat AI" : "Đóng chat"}
        onClick={() => setIsOpen(!isOpen)}
        style={{ right: 24, bottom: 24, width: 56, height: 56 }}
      />

        <Card
          role="region"
          aria-label="Cửa sổ chat AI"
          className={`fixed bottom-[90px] right-[24px] h-[600px] z-[1000] flex flex-col shadow-2xl rounded-xl border border-gray-300 transition-all duration-300 ease-in-out transform
            ${isOpen ? "scale-100 opacity-100 visible" : "scale-95 opacity-0 invisible pointer-events-none"}`}
          style={{ width: 480 }} // Fixed width, no split screen
          title={
            <Space>
              <RobotOutlined style={{ color: "#1890ff" }} />
              <Text strong>Trợ lý AI</Text>
              {explainData && (
                <Tooltip title="Độ tin cậy tổng thể của bản tóm tắt">
                    <Tag 
                        icon={explainData.avg_similarity_score >= 0.7 ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />} 
                        color={explainData.avg_similarity_score >= 0.7 ? "success" : "warning"}
                    >
                        Tin cậy: {Math.round(explainData.avg_similarity_score * 100)}%
                    </Tag>
                </Tooltip>
              )}
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              aria-label="Đóng cửa sổ chat"
              onClick={() => { setIsOpen(false); setSelectedSummaryIdx(null); }}
            />
          }
          bodyStyle={{
            flex: 1,
            overflow: "hidden",
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Chat Messages Area */}
            <div
                style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                backgroundColor: "#f5f5f5",
                }}
            >
                <List
                dataSource={messages}
                split={false}
                renderItem={(item) => (
                    <List.Item
                    style={{
                        padding: "8px 0",
                        justifyContent:
                        item.role === "user" ? "flex-end" : "flex-start",
                    }}
                    >
                        <AIChatMessageItem
                            item={item}
                            isLoading={isLoading}
                            isExplainLoading={isExplainLoading}
                            explainData={explainData}
                            selectedSummaryIdx={selectedSummaryIdx}
                            onSelectSummary={setSelectedSummaryIdx}
                        />
                    </List.Item>
                )}
                />
                
                {/* Loading Indicators */}
                {isLoading && (
                <div style={{ padding: "8px 0", display: "flex", gap: 12 }}>
                    <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: "#1890ff" }} />
                    <div className="bg-white p-3 rounded-xl rounded-tl-sm shadow-sm">
                        <Spin size="small" tip="Đang tóm tắt..." />
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input / Actions Area */}
            <div
                style={{
                padding: "12px",
                borderTop: "1px solid #f0f0f0",
                backgroundColor: "#fff",
                display: "flex",
                gap: 8,
                flexDirection: 'column'
                }}
            >
                {/* Helper hint when evidence is available */}
                {explainData && !isLoading && (
                    <div className="text-xs text-gray-500 text-center mb-1">
                        <ExclamationCircleOutlined /> Nhấn vào từng câu để xem bằng chứng gốc
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                    type="primary"
                    onClick={handleSummarizeRecord}
                    loading={isLoading || isExplainLoading}
                    disabled={isLoading || isExplainLoading}
                    style={{ flex: 1 }}
                    >
                    {messages.length > 1 ? "Tóm tắt lại" : "Tóm tắt hồ sơ"}
                    </Button>
                </div>
            </div>
        </Card>
    </>
  );
};
export default AIChatWidget;
