import React, { useState, useEffect, version } from 'react';
import axios from 'axios';
import { GoServer } from "react-icons/go";
import { LuServerCog } from "react-icons/lu";
import { BsDatabaseCheck } from "react-icons/bs";
import { getBackendNodes, isUsingCustomBackend, getCustomBackendUrl } from '../../../utils/backendConfig';

const NodeInfo = () => {
  const [nodeStatuses, setNodeStatuses] = useState([]);
  const [customNodeStatus, setCustomNodeStatus] = useState(null);
  const [dbApiStatus, setDbApiStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const measureLatency = async (url, endpointcheck = "keepalive", method = "head") => {
    try {
      const startTime = performance.now();
      const response = await axios[method](`${url}/${endpointcheck}`, {
        timeout: 5000
      });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      return {
        isUp: response.status === 200,
        latency: `${latency}ms`,
        version: response.data.version || "N/A",
        uptime: response.data.uptime || 0,
      };
    } catch (error) {
      return {
        isUp: false,
        latency: 'N/A',
      };
    }
  };

  const randomIntInRange = (a, b) => {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  };

  const checkNodes = async () => {
    try {
      setIsLoading(true);
      // Get all configured backend nodes
      const nodes = getBackendNodes();
      const statuses = await Promise.all(nodes.map(async (node, index) => {
        const status = await measureLatency(node, "keepalive", "get");
        return {
          index,
          ...status,
          type: 'api',
          name: `Node ${index + 1}`,
        };
      }));

      // Check custom backend if enabled
      if (isUsingCustomBackend()) {
        const customUrl = getCustomBackendUrl();
        const status = await measureLatency(customUrl, "keepalive", "get");
        setCustomNodeStatus({
          ...status,
          type: 'custom',
          name: 'Custom Node',
        });
      } else {
        setCustomNodeStatus(null);
      }

      
      try {
        const dbApiUrl = import.meta.env.VITE_BASE_API_URL_DB;
        const status = await measureLatency(dbApiUrl, "status", "get");
        setDbApiStatus({
          ...status,
          type: 'db',
          name: 'Cơ sở dữ liệu',
        });
      } catch (error) {
        setDbApiStatus({
          isUp: false,
          latency: 'N/A',
          type: 'db',
          name: 'Cơ sở dữ liệu',
        });
      }

      setNodeStatuses(statuses);
    } catch (error) {
      console.error('Error checking nodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkNodes();

    // Set up periodic checks every 5 minutes
    const interval = setInterval(checkNodes, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (uptime) => {
    if (uptime !== "N/A" && uptime !== 0 && !isNaN(uptime)){
      const now = Date.now();
      const seconds = Math.floor((now - uptime * 1000) / 1000);
      if (seconds < 60) return `${seconds} giây trước`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} phút trước`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days} ngày trước`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months} tháng trước`;
      const years = Math.floor(months / 12);
      return `${years} năm trước`;
    } else {
      return "N/A";
    }
  };

  const getNodeIcon = (type) => {
    const iconClass = "w-6 h-6";
    switch (type) {
      case 'custom':
        return <LuServerCog className={iconClass} />;
      case 'db':
        return <BsDatabaseCheck className={iconClass} />;
      default:
        return <GoServer className={iconClass} />;
    }
  };

  const getBackgroundImage = (type) => {
    switch (type) {
      case 'custom':
        return "/custom.png";
      case 'db':
        return "/db.png";
      default:
        return `/node_random_image${randomIntInRange(1, 4)}.png`;
    }
  };

  const LoadingCard = () => (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body items-center text-center">
        <div className="w-24 h-24 mb-4">
          <img 
            src="/node_random_image1.png" 
            alt="Server" 
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <h3 className="card-title text-primary">Đang kiểm tra máy chủ...</h3>
        <p className="text-base-content/70">Chờ một chút, Mafuyu đang kiểm tra máy chủ...</p>
      </div>
    </div>
  );

  const NodeCard = ({ data }) => (
    <div className={`card bg-base-100 shadow-xl ${data.isUp ? 'border-success' : 'border-error'} relative overflow-hidden`}>
      {/* Background Image */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-32 opacity-20"
        style={{
          backgroundImage: `url("${getBackgroundImage(data.type)}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center right',
          backgroundSize: 'contain'
        }}
      />
      <div className="card-body relative z-10">
        <div className="flex items-center gap-4">
          <div className={`badge ${data.isUp ? 'badge-success' : 'badge-error'}`} />
          <div className="flex flex-col">
            <h2 className={`card-title gap-2 ${data.isUp ? 'text-success' : 'text-error'}`}>
              <div className="flex items-center justify-center">
                {getNodeIcon(data.type)}
              </div>
              {data.name}
            </h2>
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-title">Phiên bản {data.type}</div>
                <div className="stat-value text-lg">{data.version}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Uptime</div>
                <div className="stat-value text-lg">{formatUptime(data.uptime)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Độ trễ</div>
                <div className="stat-value text-lg">{data.latency}</div>
              </div>
            </div>
            <div className="text-sm opacity-70 mt-2">
              Lần kiểm tra cuối: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Bảng thông tin trạng thái hoạt động của máy chủ</h2>
        <div className="alert alert-info mb-6">
          <div>
            <h3 className="font-bold">Theo dõi trạng thái hoạt động của máy chủ</h3>
            <div className="text-sm">
              Bảng thông tin này hiển thị trạng thái hoạt động của tất cả máy chủ.
              Độ trễ được đo theo thời gian thực bằng cách sử dụng số liệu hiệu suất.
              Dữ liệu được cập nhật sau mỗi 5 phút.
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <LoadingCard />
          ) : (
            <>
              {dbApiStatus && (
                <NodeCard data={dbApiStatus} />
              )}
              {customNodeStatus && (
                <NodeCard data={customNodeStatus} />
              )}
              {nodeStatuses.map((node) => (
                <NodeCard key={node.index} data={node} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeInfo;
