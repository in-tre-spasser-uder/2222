import { useState, useEffect } from "react";

// 整理可用的模型列表（基于你提供的模型）
const AVAILABLE_MODELS = [
    { value: "gemini-2.5-flash-preview-04-17", label: "gemini-2.5-flash-preview-04-17（推荐）" },
    { value: "gemini-2.5-flash-preview-09-2025", label: "gemini-2.5-flash-preview-09-2025" },
    { value: "gemini-2.5-flash", label: "gemini-2.5-flash" },
    { value: "gemini-2.5-pro", label: "gemini-2.5-pro" },
    { value: "gemini-1.5-flash", label: "gemini-1.5-flash" },
    { value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
    { value: "gemini-3-pro-preview", label: "gemini-3-pro-preview" },
    { value: "gemini-3.1-pro-preview", label: "gemini-3.1-pro-preview" },
];

const ModelSelector = ({ selectedModel, onModelChange }) => {
    const [model, setModel] = useState(() => {
        const saved = localStorage.getItem("selectedModel");
        return saved || selectedModel || "gemini-2.5-flash-preview-04-17";
    });

    // 当父组件传入的selectedModel变化时更新
    useEffect(() => {
        if (selectedModel) setModel(selectedModel);
    }, [selectedModel]);

    const handleChange = (e) => {
        const val = e.target.value;
        setModel(val);
        onModelChange(val);
        localStorage.setItem("selectedModel", val); // 保存选中的模型
    };

    return (
        <div style={{
            margin: "0 20px 12px",
            maxWidth: 1000,
            marginLeft: "auto",
            marginRight: "auto",
        }}>
            <label style={{
                color: "var(--color-text-secondary)",
                marginRight: 8,
                fontSize: "0.9rem"
            }}>
                选择模型：
            </label>
            <select
                value={model}
                onChange={handleChange}
                style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border-hr)",
                    outline: "none",
                    minWidth: 280,
                }}
            >
                {AVAILABLE_MODELS.map(m => (
                    <option key={m.value} value={m.value}>
                        {m.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default ModelSelector;