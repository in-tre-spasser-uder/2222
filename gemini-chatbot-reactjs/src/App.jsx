import { useEffect, useRef, useState } from "react";
import Message from "./components/Message";
import PromptForm from "./components/PromptForm";
import Sidebar from "./components/Sidebar";
import ModelSelector from "./components/ModelSelector"; // 引入模型选择器
import { Menu } from "lucide-react";

const App = () => {
  // Main app state
  const [isLoading, setIsLoading] = useState(false);
  const typingInterval = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });
  // 新增：模型选择状态
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("selectedModel");
    return saved || "gemini-2.5-flash-preview-04-17";
  });
  const [conversations, setConversations] = useState(() => {
    try {
      // Load conversations from localStorage or use default
      const saved = localStorage.getItem("conversations");
      return saved ? JSON.parse(saved) : [{ id: "default", title: "New Chat", messages: [] }];
    } catch {
      return [{ id: "default", title: "New Chat", messages: [] }];
    }
  });
  const [activeConversation, setActiveConversation] = useState(() => {
    return localStorage.getItem("activeConversation") || "default";
  });

  useEffect(() => {
    localStorage.setItem("activeConversation", activeConversation);
  }, [activeConversation]);

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  // Handle theme changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Get current active conversation
  const currentConversation = conversations.find((c) => c.id === activeConversation) || conversations[0];

  // Scroll to bottom of container
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Effect to scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeConversation]);

  const typingEffect = (text, messageId) => {
    let textElement = document.querySelector(`#${messageId} .text`);
    if (!textElement) return;
    // Initially set the content to empty and mark as loading
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation
          ? {
            ...conv,
            messages: conv.messages.map((msg) => (msg.id === messageId ? { ...msg, content: "", loading: true } : msg)),
          }
          : conv
      )
    );
    // Set up typing animation
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;
    let currentText = "";
    clearInterval(typingInterval.current);
    typingInterval.current = setInterval(() => {
      if (wordIndex < words.length) {
        // Update the current text being displayed
        currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        textElement.textContent = currentText;
        // Update state with current progress
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation
              ? {
                ...conv,
                messages: conv.messages.map((msg) => (msg.id === messageId ? { ...msg, content: currentText, loading: true } : msg)),
              }
              : conv
          )
        );
        scrollToBottom();
      } else {
        // Animation complete
        clearInterval(typingInterval.current);
        // Final update, mark as finished loading
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation
              ? {
                ...conv,
                messages: conv.messages.map((msg) => (msg.id === messageId ? { ...msg, content: currentText, loading: false } : msg)),
              }
              : conv
          )
        );
        setIsLoading(false);
      }
    }, 40);
  };

  // 重写：适配OpenAI格式的generateResponse函数
  const generateResponse = async (conversation, botMessageId) => {
    // 转换消息格式为OpenAI格式
    const formattedMessages = conversation.messages?.map((msg) => ({
      role: msg.role === "bot" ? "assistant" : msg.role, // bot -> assistant
      content: msg.content,
    }));

    try {
      const res = await fetch(import.meta.env.VITE_API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_API_KEY}` // OpenAI格式的认证
        },
        body: JSON.stringify({
          model: selectedModel, // 使用选中的模型
          messages: formattedMessages,
          stream: false, // 关闭流式响应，方便处理
          temperature: 0.7 // 可调整的参数
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${res.status}`);
      }

      const data = await res.json();
      // 提取OpenAI格式的响应内容
      const responseText = data.choices[0]?.message?.content || "抱歉，没有获取到响应。";
      // 处理思考过程（如果有）
      const reasoningContent = data.choices[0]?.message?.reasoning_content;
      const finalText = reasoningContent ? `${reasoningContent}\n\n${responseText}` : responseText;

      typingEffect(finalText.trim(), botMessageId);
    } catch (error) {
      console.error("API请求错误:", error);
      setIsLoading(false);
      updateBotMessage(botMessageId, `错误: ${error.message}`, true);
    }
  };

  // Update specific bot message
  const updateBotMessage = (botId, content, isError = false) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation
          ? {
            ...conv,
            messages: conv.messages.map((msg) => (msg.id === botId ? { ...msg, content, loading: false, error: isError } : msg)),
          }
          : conv
      )
    );
  };

  return (
    <div className={`app-container ${theme === "light" ? "light-theme" : "dark-theme"}`}>
      <div className={`overlay ${isSidebarOpen ? "show" : "hide"}`} onClick={() => setIsSidebarOpen(false)}></div>
      <Sidebar
        conversations={conversations}
        setConversations={setConversations}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        theme={theme}
        setTheme={setTheme}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="main-container">
        <header className="main-header">
          <button onClick={() => setIsSidebarOpen(true)} className="sidebar-toggle">
            <Menu size={18} />
          </button>
        </header>

        {/* 新增：模型选择器 */}
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        {currentConversation.messages.length === 0 ? (
          // Welcome container
          <div className="welcome-container">
            <img className="welcome-logo" src="gemini.svg" alt="Gemini Logo" />
            <h1 className="welcome-heading">Message Gemini</h1>
            <p className="welcome-text">Ask me anything about any topic. I'm here to help!</p>
          </div>
        ) : (
          // Messages container
          <div className="messages-container" ref={messagesContainerRef}>
            {currentConversation.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </div>
        )}
        {/* Prompt input */}
        <div className="prompt-container">
          <div className="prompt-wrapper">
            <PromptForm
              conversations={conversations}
              setConversations={setConversations}
              activeConversation={activeConversation}
              generateResponse={generateResponse}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
          <p className="disclaimer-text">Gemini can make mistakes, so double-check it.</p>
        </div>
      </main>
    </div>
  );
};

export default App;