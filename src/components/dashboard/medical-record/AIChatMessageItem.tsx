import React from "react";
import { Avatar, Typography, Spin } from "antd";
import {
  UserOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import InteractiveSentence from "./InteractiveSentence";
import { ExplainResponse } from "@/types/ai";

const { Text } = Typography;

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface AIChatMessageItemProps {
  item: Message;
  isLoading: boolean;
  isExplainLoading: boolean;
  explainData: ExplainResponse | null;
  selectedSummaryIdx: number | null;
  onSelectSummary: (idx: number | null) => void;
}

const AIChatMessageItem = React.memo(
  ({
    item,
    isLoading,
    isExplainLoading,
    explainData,
    selectedSummaryIdx,
    onSelectSummary,
  }: AIChatMessageItemProps) => {
    // Render logic for AI messages with interactive sentences
    const renderAiMessageContent = () => {
      // Only special rendering if evidence data exists and it's not the welcome message
      if (explainData && item.id !== "welcome" && !isLoading) {
        return (
          <div className="leading-relaxed">
            {explainData.summary_sentences.map((sent, idx) => {
              const isLowSimilarity = explainData.low_similarity_matches.some(
                (m) => m.summary_idx === idx
              );
              const isSelected = selectedSummaryIdx === idx;

              return (
                <InteractiveSentence
                  key={idx}
                  sentence={sent}
                  index={idx}
                  explainData={explainData}
                  isSelected={isSelected}
                  isLowSimilarity={isLowSimilarity}
                  onSelect={onSelectSummary}
                />
              );
            })}
          </div>
        );
      }

      // Show loading state specifically for explanation if main loading is done but explain is pending
      if (isExplainLoading && item.id !== "welcome") {
        return (
          <div>
            <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {item.content}
            </Text>
            <div className="mt-2 text-xs text-blue-500 flex items-center gap-2">
              <Spin size="small" /> Đang phân tích nguồn chứng minh...
            </div>
          </div>
        );
      }

      return (
        <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
          {item.content}
        </Text>
      );
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: item.role === "user" ? "row-reverse" : "row",
          maxWidth: "95%",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Avatar
          size="small"
          icon={item.role === "user" ? <UserOutlined /> : <RobotOutlined />}
          style={{
            backgroundColor: item.role === "user" ? "#87d068" : "#1890ff",
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <div
          style={{
            backgroundColor: item.role === "user" ? "#95de64" : "#ffffff",
            padding: "10px 14px",
            borderRadius: "16px",
            borderTopRightRadius: item.role === "user" ? "4px" : "16px",
            borderTopLeftRadius: item.role === "ai" ? "4px" : "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            maxWidth: "100%",
          }}
        >
          {/* Render Content */}
          {item.role === "ai" ? (
            renderAiMessageContent()
          ) : (
            <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {item.content}
            </Text>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    // Custom equality check for React.memo

    // 1. If message reference changed (e.g. streaming update), re-render
    if (prev.item !== next.item) return false;

    // 2. If global loading states changed, re-render (simplistic but safe)
    if (prev.isLoading !== next.isLoading) return false;
    if (prev.isExplainLoading !== next.isExplainLoading) return false;

    // 3. If explainData changed, re-render
    if (prev.explainData !== next.explainData) return false;

    // 4. Handle selectedSummaryIdx changes
    // Only re-render if:
    // a) This is an AI message (user messages don't care about selection)
    // b) We have explainData (interactive mode active)
    // c) The selection actually changed
    if (
      prev.selectedSummaryIdx !== next.selectedSummaryIdx &&
      next.item.role === "ai" &&
      next.explainData
    ) {
      return false; // Re-render to update highlights
    }

    // Otherwise, consider props equal and skip re-render
    return true;
  }
);

AIChatMessageItem.displayName = "AIChatMessageItem";

export default AIChatMessageItem;
