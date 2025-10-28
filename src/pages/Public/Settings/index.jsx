import React, { useContext, useState, useEffect } from "react";
import { Settings2, Server, Eye, EyeOff, RefreshCw, AlertTriangle } from "lucide-react";
import axios from "axios";
import { AuthContext } from "../../../context/AuthLocket";
import { showSuccess, showInfo } from "../../../components/Toast";
import { getCustomBackendUrl } from "../../../utils/backendConfig";
import { TbServerOff, TbServerBolt } from "react-icons/tb";
import ThemeSelector from "../../../components/Theme/ThemeSelector";

function SettingsPage() {
  const { user } = useContext(AuthContext);
  const [backendUrl, setBackendUrl] = useState("");
  const [isCustomBackend, setIsCustomBackend] = useState(false);
  const [encryptKey, setEncryptKey] = useState("");
  const [showEncryptKey, setShowEncryptKey] = useState(false);
  const [nodeStatus, setNodeStatus] = useState(null);
  const [isCheckingNode, setIsCheckingNode] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const [lastCheckedTime, setLastCheckedTime] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const urlRegex = /^https?:\/\/(?:[a-zA-Z0-9_-]+\.)*[a-zA-Z0-9_-]+(?:\.[a-zA-Z]{2,})?(?::\d{1,5})?(?:\/[^\s]*)?$/;

  const measureLatency = async (url) => {
    try {
      const startTime = performance.now();
      const response = await axios.head(`${url}/keepalive`, {
        timeout: 5000
      });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      return {
        isUp: response.status === 200,
        latency: `${latency}ms`,
        type: 'custom',
        name: 'Máy chủ tùy chỉnh'
      };
    } catch (error) {
      return {
        isUp: false,
        latency: 'N/A',
        type: 'custom',
        name: 'Máy chủ tùy chỉnh'
      };
    }
  };

  // Load backend settings when component mounts
  useEffect(() => {
    const savedUrl = getCustomBackendUrl();
    const savedIsCustom = localStorage.getItem("use_custom_backend") === "true";
    const savedEncryptKey = localStorage.getItem("custom_backend_encrypt_key");
    
    if (savedUrl) {
      setBackendUrl(savedUrl);
      checkNodeStatus(savedUrl);
    }
    if (savedEncryptKey) {
      setEncryptKey(savedEncryptKey);
    }
    setIsCustomBackend(savedIsCustom);
  }, []);

  const checkNodeStatus = async (url) => {
    if (!url || !urlRegex.test(url)) {
      setNodeStatus(null);
      setLastCheckedTime(null);
      return;
    }
    setIsCheckingNode(true);
    const status = await measureLatency(url);
    setNodeStatus(status);
    setIsCheckingNode(false);
    setRefreshCountdown(10);
    setLastCheckedTime(new Date());
  };

  // Handle refresh countdown
  useEffect(() => {
    let timer;
    if (refreshCountdown > 0) {
      timer = setInterval(() => {
        setRefreshCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [refreshCountdown]);

  useEffect(() => {
    if (isCustomBackend && backendUrl) {
      checkNodeStatus(backendUrl);
    } else {
      setNodeStatus(null);
      setLastCheckedTime(null);
    }
  }, [backendUrl, isCustomBackend]);

  const handleRefresh = () => {
    if (refreshCountdown === 0 && backendUrl) {
      checkNodeStatus(backendUrl);
    }
  };

  const handleSaveBackendSettings = () => {
    if (isCustomBackend) {
      if (!backendUrl) {
        showInfo("Vui lòng nhập URL backend");
        return;
      }

      if (!urlRegex.test(backendUrl)) {
        showInfo("Định dạng URL backend không hợp lệ");
        return;
      }

      if (!nodeStatus?.isUp) {
        showInfo("Không thể lưu cài đặt - node không phản hồi");
        return;
      }

      localStorage.setItem("custom_backend_url", backendUrl);
      localStorage.setItem("use_custom_backend", "true");
    } else {
      localStorage.removeItem("custom_backend_url");
      localStorage.setItem("use_custom_backend", "false");
    }

    showSuccess("Backend settings đã được lưu thành công");
  };

  const handleClearUploadedMoments = () => {
    localStorage.removeItem("uploadedMoments");
    showSuccess("Đã xóa dữ liệu.");
    setShowClearConfirm(false);
  };

  const NodeCard = ({ data }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm opacity-70">Trạng thái Node</span>
        <button
          className={`btn btn-sm btn-ghost gap-2 ${refreshCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleRefresh}
          disabled={refreshCountdown > 0 || isCheckingNode}
        >
          <RefreshCw 
            size={16} 
            className={`${isCheckingNode ? 'animate-spin' : ''}`}
          />
          {refreshCountdown > 0 ? `${refreshCountdown}s` : 'Làm mới'}
        </button>
      </div>
      <div className={`relative flex items-center gap-4 p-4 rounded-lg w-full overflow-hidden ${
        data.isUp ? 'bg-success/15' : 'bg-error/15'
      }`}>
        <div className="flex items-start gap-4 z-10">
          {data.isUp ? <TbServerBolt size={20} className="text-success" /> : <TbServerOff size={20} className="text-error" />}
          <div className="flex flex-col">
            <span className={`flex items-center gap-2 font-medium ${data.isUp ? 'text-success' : 'text-error'}`}>
              {data.name}
            </span>
            <span className="text-base opacity-70">Độ trễ: {data.latency}</span>
            <span className="text-sm opacity-50">
              Kiểm tra lần cuối: {lastCheckedTime ? lastCheckedTime.toLocaleString() : 'Chưa kiểm tra'}
            </span>
            <span className="underline text-success">{data.isUp ? "" : "Lỗi kết nối, Hãy kiểm tra xem coi server có cấu hình đúng cách không?"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const settingsSections = [
    {
      id: "backend",
      title: "Cấu Hình Backend",
      icon: <Server size={20} />,
      description: "Cấu hình kết nối đến máy chủ backend",
      customContent: (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Sử dụng backend tùy chỉnh</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={isCustomBackend}
                onChange={(e) => setIsCustomBackend(e.target.checked)}
              />
            </label>
          </div>
          
          {isCustomBackend && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">URL Backend</span>
                </label>
                <input
                  type="text"
                  placeholder="https://api.example.com"
                  className="input input-bordered w-full"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>

              {nodeStatus && <NodeCard data={nodeStatus} />}

              <label className="label">
                <span className="label-text-alt text-warning">
                  ⚠️ Chỉ thay đổi các cài đặt này nếu bạn biết mình đang làm gì
                </span>
              </label>
            </>
          )}
          
          <button 
            className="btn btn-primary w-full"
            onClick={handleSaveBackendSettings}
            disabled={isCustomBackend && (isCheckingNode || !nodeStatus?.isUp)}
          >
            {isCheckingNode ? 'Đang kiểm tra Node...' : 'Lưu Cài Đặt Backend'}
          </button>
        </div>
      )
    },
    {
      id: "dangerous",
      title: "Khu Vực Nguy Hiểm",
      icon: <AlertTriangle size={20} className="text-error" />,
      description: "⚠️ Những hành động này không thể hoàn tác và có thể ảnh hưởng đến dữ liệu của bạn",
      customContent: (
        <div className="space-y-4">
          <div className="alert alert-error">
            <AlertTriangle size={20} />
            <div>
              <h3 className="font-bold">Xóa Các Khoảnh Khắc Đã Tải Lên</h3>
              <div className="text-xs">Điều này sẽ xóa vĩnh viễn tất cả dữ liệu khoảnh khắc đã tải lên từ bộ nhớ cục bộ.</div>
              <div className="underline text-success">Lưu ý: Các moment bạn đã đăng lên sẽ không bị mất trên app Locket.</div>
            </div>
            <button 
              className="btn btn-error btn-sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={!user}
            >
              Xóa Dữ Liệu
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen bg-base-100">
      <div className="flex items-center gap-3 mb-8">
        <Settings2 className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Cài Đặt</h1>
      </div>
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div
            key={section.id}
            className="card bg-base-200 shadow-xl"
          >
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h2 className="card-title">{section.title}</h2>
              </div>
              <p className="text-sm text-base-content/70 mb-4">
                {section.description}
              </p>
              {section.customContent}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <ThemeSelector />
      </div>
      {showClearConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={24} className="text-error" />
              <h3 className="font-bold text-lg">Cảnh Báo</h3>
            </div>
            <p className="py-4">
              Bạn có chắc chắn muốn xóa tất cả dữ liệu khoảnh khắc đã tải lên? Hành động này không thể hoàn tác.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowClearConfirm(false)}>Hủy</button>
              <button className="btn btn-error" onClick={handleClearUploadedMoments}>Xóa Dữ Liệu</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowClearConfirm(false)}></div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage; 