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
  Tooltip, // Import Tooltip
  Tag,
} from "antd";
import {
  CommentOutlined,
  CloseOutlined,
  UserOutlined,
  RobotOutlined,
  FileSearchOutlined,
  CompressOutlined,
  ExclamationCircleOutlined, // Import for warning icon
} from "@ant-design/icons";
import SourceEvidencePanel from "./SourceEvidencePanel";

const { Text } = Typography;

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  isExplained?: boolean; // New flag to indicate if this message has explanation data
}

interface MatchDetail {
    summary_idx: number;
    source_indices: number[];
    scores: number[];
}

interface ExplainResponse {
    source_sentences: string[];
    summary_sentences: string[];
    matches: MatchDetail[];
    avg_similarity_score: number;
    low_similarity_matches: MatchDetail[]; // Add low_similarity_matches
}

const AIChatWidget = ({
  recordId,
}: {
  recordId: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Explain / Evidence States
  const [showEvidence, setShowEvidence] = useState(false);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [hoveredSummaryIdx, setHoveredSummaryIdx] = useState<number | null>(null);
  const [hoveredSentenceScore, setHoveredSentenceScore] = useState<number | null>(null); // New state

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
  }, [messages, isOpen, showEvidence]);

  const handleToggleEvidence = async () => {
      if (showEvidence) {
          setShowEvidence(false);
          return;
      }

      // If opening evidence panel, fetch data if not already present
      // Find the last AI message (excluding welcome) to explain
      const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai' && m.id !== 'welcome');
      
      if (!lastAiMsg) return;

      setShowEvidence(true);
      
      if (!explainData) {
        setIsExplainLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/explain/${recordId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ summary: lastAiMsg.content })
            });

            if (!response.ok) throw new Error('Failed to fetch explanation');
            const data: ExplainResponse = await response.json(); // Cast to ExplainResponse
            setExplainData(data);
        } catch (error) {
            console.error("Explain error:", error);
        } finally {
            setIsExplainLoading(false);
        }
      }
  };

  const handleSummarizeRecord = async () => {
    setIsLoading(true);
    // Reset evidence data when generating new summary
    setExplainData(null);
    setShowEvidence(false);

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

  // Render logic for AI messages
  const renderAiMessageContent = (msg: Message) => {
      // Only special rendering if evidence mode is ON and we have data
      if (showEvidence && explainData && msg.id !== 'welcome' && !isLoading) {
          return (
              <div>
                  {explainData.summary_sentences.map((sent, idx) => {
                      const isLowSimilarity = explainData.low_similarity_matches.some(m => m.summary_idx === idx);
                      const matchForSentence = explainData.matches.find(m => m.summary_idx === idx);
                      const score = matchForSentence && matchForSentence.scores.length > 0 ? matchForSentence.scores[0] : null;

                      return (
                          <React.Fragment key={idx}>
                              <span
                                onMouseEnter={() => {
                                    setHoveredSummaryIdx(idx);
                                    setHoveredSentenceScore(score); // Set score on hover
                                }}
                                onMouseLeave={() => {
                                    setHoveredSummaryIdx(null);
                                    setHoveredSentenceScore(null); // Clear score on leave
                                }}
                                style={{
                                    backgroundColor: hoveredSummaryIdx === idx ? '#bae7ff' : (isLowSimilarity ? '#ffe0b2' : 'transparent'), // Light orange for low similarity
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    borderRadius: 2,
                                    // whiteSpace: 'pre-wrap' // Removed
                                }}
                              >
                                  {sent.trim()}{' '}
                                  {isLowSimilarity && (
                                    <ExclamationCircleOutlined 
                                        style={{ color: '#faad14', marginLeft: 4, fontSize: 10 }} 
                                        title="Độ tương đồng thấp" 
                                    />
                                  )}
                              </span>
                              <br />
                          </React.Fragment>
                      );

                  })}
              </div>
          );
      }
      return <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.content}</Text>;
  };

  // Determine container width
  const containerWidth = showEvidence ? 900 : 480;

  return (
    <>
      <FloatButton
        icon={<CommentOutlined />}
        type="primary"
        tooltip={!isOpen ? "Chat với AI" : undefined}
        onClick={() => setIsOpen(!isOpen)}
        style={{ right: 24, bottom: 24, width: 56, height: 56 }}
      />

        <Card
          className={`fixed bottom-[90px] right-[24px] h-[600px] z-[1000] flex flex-col shadow-lg rounded-xl border border-gray-300 transition-all duration-300 ease-in-out transform
            ${isOpen ? "scale-100 opacity-100 visible" : "scale-95 opacity-0 invisible pointer-events-none"}`}
          style={{ width: containerWidth }}
          title={
            <Space>
              <RobotOutlined style={{ color: "#1890ff" }} />
              <Text strong>Trợ lý AI</Text>
              {showEvidence && explainData && (
                hoveredSentenceScore !== null ? (
                    <Tag color={hoveredSentenceScore >= 0.7 ? "blue" : "error"}>
                        Câu: {hoveredSentenceScore.toFixed(2)}
                    </Tag>
                ) : (
                    <Tooltip title="Điểm tương đồng trung bình">
                        <Tag color={explainData.avg_similarity_score >= 0.7 ? "success" : "warning"}>
                            TB: {explainData.avg_similarity_score.toFixed(2)}
                        </Tag>
                    </Tooltip>
                )
              )}
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => { setIsOpen(false); setShowEvidence(false); }}
            />
          }
          bodyStyle={{
            flex: 1,
            overflow: "hidden",
            padding: 0,
            display: "flex",
            flexDirection: "row", // Change to row for side-by-side
          }}
          headStyle={{
            minHeight: 46,
            padding: "0 12px",
          }}
        >
          {/* LEFT PANEL: EVIDENCE (Only visible if showEvidence is true) */}
          {showEvidence && (
              <div style={{ width: '50%', height: '100%', borderRight: '1px solid #f0f0f0' }}>
                  <SourceEvidencePanel 
                    data={explainData} 
                    loading={isExplainLoading} 
                    hoveredSummaryIdx={hoveredSummaryIdx} 
                  />
              </div>
          )}

          {/* RIGHT PANEL: CHAT */}
          <div style={{ width: showEvidence ? '50%' : '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                        alignItems: "flex-start",
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
                            {/* Use custom renderer for content */}
                            {item.role === 'ai' ? renderAiMessageContent(item) : <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{item.content}</Text>}
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
                display: "flex",
                gap: 8
                }}
            >
                <Button
                type="primary"
                onClick={handleSummarizeRecord}
                loading={isLoading}
                disabled={isLoading}
                style={{ flex: 1 }}
                >
                Tóm tắt hồ sơ
                </Button>
                <Button
                icon={showEvidence ? <CompressOutlined /> : <FileSearchOutlined />}
                onClick={handleToggleEvidence}
                disabled={isLoading || messages.length <= 1} 
                title={showEvidence ? "Ẩn bằng chứng" : "Xem bằng chứng trích dẫn"}
                type={showEvidence ? "default" : "dashed"}
                />
            </div>
          </div>
        </Card>
    </>
  );
};

export default AIChatWidget;