import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

interface SystemInfo {
  os: string;
  os_version: string;
  cpu_name: string;
  cpu_cores: number;
  total_memory: number;
  available_memory: number;
  total_disk_space: number;
  available_disk_space: number;
  gpu_info: string[];
  python_version?: string;
  git_version?: string;
  cuda_available: boolean;
}

interface InstallProgress {
  step: string;
  progress: number;
  message: string;
  is_complete: boolean;
  has_error: boolean;
}

interface InstallConfig {
  install_path: string;
  model_type: string;
  use_gpu: boolean;
}

function App() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [isWebEnvironment, setIsWebEnvironment] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    step: "idle",
    progress: 0,
    message: "",
    is_complete: false,
    has_error: false
  });
  const [error, setError] = useState<string | null>(null);
  const [installConfig, setInstallConfig] = useState<InstallConfig>({
    install_path: '/Users/Shared/IndexTTS', // Default fallback
    model_type: 'base',
    use_gpu: false
  });

  // Check environment and set default install path
  useEffect(() => {
    // Check if running in web environment by trying to use Tauri API
    const checkEnvironment = async () => {
      try {
        // Try to call a Tauri command to verify we're in desktop environment
        await invoke('get_default_install_path');
        // If successful, we're in Tauri desktop environment
        setIsWebEnvironment(false);
        
        // Proceed with system info check and path setup
        checkSystemInfo();
        
        // Set default install path
        const setDefaultPath = async () => {
          try {
            const defaultPath = await invoke('get_default_install_path') as string;
            setInstallConfig(prev => ({
              ...prev,
              install_path: defaultPath
            }));
          } catch (error) {
            console.error('Failed to get default install path:', error);
            // Keep the fallback path that was set in initial state
          }
        };
        
        setDefaultPath();
      } catch (error) {
        // If Tauri API call fails, we're in web environment
        console.log('Detected web environment:', error);
        setIsWebEnvironment(true);
        setError('此安装器仅支持桌面应用环境，不支持Web浏览器运行。请下载桌面版本。');
        setLoading(false);
      }
    };
    
    checkEnvironment();
  }, []);

  async function checkSystemInfo() {
    try {
      setLoading(true);
      setError(null);
      const info = await invoke<SystemInfo>("get_system_info");
      setSystemInfo(info);
    } catch (err) {
      setError(`系统检测失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function getSystemStatus() {
    if (!systemInfo) return { status: 'unknown', message: '系统信息未知' };
    
    const issues = [];
    
    // Check memory (minimum 8GB recommended)
    if (systemInfo.total_memory < 8 * 1024 * 1024 * 1024) {
      issues.push('内存不足8GB，可能影响性能');
    }
    
    // Check disk space (minimum 10GB recommended)
    if (systemInfo.available_disk_space < 10 * 1024 * 1024 * 1024) {
      issues.push('可用磁盘空间不足10GB');
    }
    
    // Check Python
    if (!systemInfo.python_version) {
      issues.push('未检测到Python');
    }
    
    // Check Git
    if (!systemInfo.git_version) {
      issues.push('未检测到Git');
    }
    
    if (issues.length === 0) {
      return { status: 'good', message: '系统环境良好，可以开始安装' };
    } else if (issues.length <= 2) {
      return { status: 'warning', message: `检测到问题: ${issues.join(', ')}` };
    } else {
      return { status: 'error', message: `系统环境不满足要求: ${issues.join(', ')}` };
    }
  }

  async function startInstallation() {
    // Prevent installation in web environment
    if (isWebEnvironment) {
      alert('安装功能仅在桌面应用中可用，Web环境不支持安装。');
      return;
    }
    
    setInstalling(true);
    setError(null); // Clear any previous errors
    
    try {
      console.log('Starting installation with config:', installConfig);
      const result = await invoke('start_installation', { config: installConfig });
      console.log('Installation started:', result);
      
      // Poll for progress updates
      const progressInterval = setInterval(async () => {
        try {
          const progress = await invoke('get_installation_progress') as InstallProgress;
          console.log('Installation progress:', progress);
          setInstallProgress(progress);
          
          if (progress.is_complete || progress.has_error) {
            clearInterval(progressInterval);
            setInstalling(false);
            
            if (progress.has_error) {
              setError(`安装失败: ${progress.message}`);
            }
          }
        } catch (error) {
          console.error('Failed to get installation progress:', error);
          clearInterval(progressInterval);
          setInstalling(false);
          setError(`获取安装进度失败: ${error}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to start installation:', error);
      setInstalling(false);
      setError(`启动安装失败: ${error}`);
    }
  }

  async function launchIndexTTS() {
     try {
       const result = await invoke('launch_indextts', { install_path: installConfig.install_path }) as string;
       alert(result);
     } catch (error) {
       alert(`启动失败: ${error}`);
     }
   }
 
   async function openInstallDirectory() {
     try {
       await invoke('open_install_directory', { install_path: installConfig.install_path });
     } catch (error) {
       alert(`打开目录失败: ${error}`);
     }
   }

  const systemStatus = systemInfo ? getSystemStatus() : { status: 'unknown', message: '' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
            IndexTTS 安装器
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            智能语音合成系统的一键安装解决方案，为您提供专业级的文本转语音服务
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Information Card */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">系统环境检测</h2>
                </div>
                <button
                  onClick={checkSystemInfo}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {loading ? "检测中..." : "重新检测"}
                </button>
              </div>

              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <span className="ml-4 text-lg text-gray-600">正在检测系统环境...</span>
                </div>
              ) : systemInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                          </svg>
                          操作系统
                        </span>
                        <span className="text-gray-600 font-medium">{systemInfo.os} {systemInfo.os_version}</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          </svg>
                          处理器
                        </span>
                        <span className="text-gray-600 font-medium text-right max-w-48 truncate" title={systemInfo.cpu_name}>
                          {systemInfo.cpu_name}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          CPU核心
                        </span>
                        <span className="text-gray-600 font-medium">{systemInfo.cpu_cores} 核</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                          内存
                        </span>
                        <span className="text-gray-600 font-medium">
                          {formatBytes(systemInfo.available_memory)} / {formatBytes(systemInfo.total_memory)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          磁盘空间
                        </span>
                        <span className="text-gray-600 font-medium">
                          {formatBytes(systemInfo.available_disk_space)} 可用
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-xl">
                      <span className="font-semibold text-gray-700 flex items-center mb-2">
                        <svg className="w-4 h-4 mr-2 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                        显卡
                      </span>
                      <div className="space-y-1">
                        {systemInfo.gpu_info.map((gpu, index) => (
                          <div key={index} className="text-gray-600 text-sm bg-white/50 px-3 py-1 rounded-lg">{gpu}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Python
                        </span>
                        <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                          systemInfo.python_version 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {systemInfo.python_version ? `✓ ${systemInfo.python_version}` : '✗ 未安装'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Git
                        </span>
                        <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                          systemInfo.git_version 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {systemInfo.git_version ? `✓ ${systemInfo.git_version}` : '✗ 未安装'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          CUDA
                        </span>
                        <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                          systemInfo.cuda_available 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>
                          {systemInfo.cuda_available ? '✓ 可用' : '⚠ 不可用'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

             </div>
           )
         
           {/* System Status */}
           <div className="lg:col-span-1">
             {systemInfo && (
               <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 ${
                 systemStatus.status === 'good' ? 'border-l-4 border-l-green-400' :
                 systemStatus.status === 'warning' ? 'border-l-4 border-l-yellow-400' :
                 'border-l-4 border-l-red-400'
               }`}>
                 <div className="flex items-center mb-4">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                     systemStatus.status === 'good' ? 'bg-green-100' :
                     systemStatus.status === 'warning' ? 'bg-yellow-100' :
                     'bg-red-100'
                   }`}>
                     <div className={`w-6 h-6 rounded-full ${
                       systemStatus.status === 'good' ? 'bg-green-500' :
                       systemStatus.status === 'warning' ? 'bg-yellow-500' :
                       'bg-red-500'
                     }`}></div>
                   </div>
                   <h3 className="text-xl font-bold text-gray-800">系统状态</h3>
                 </div>
                 <p className={`text-lg font-medium ${
                   systemStatus.status === 'good' ? 'text-green-700' :
                   systemStatus.status === 'warning' ? 'text-yellow-700' :
                   'text-red-700'
                 }`}>
                   {systemStatus.message}
                 </p>
               </div>
             )}
           </div>
        </div>

        {/* Installation Card */}
        <div className="lg:col-span-3 mt-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800">安装 IndexTTS</h2>
            </div>
            
            {!installing ? (
              <div className="space-y-8">
                <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    🚀 一键安装 IndexTTS 语音合成系统，包含完整的模型文件、依赖环境和配置优化
                  </p>
                </div>
                
                {/* Installation Configuration */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    安装配置
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        📁 安装路径
                      </label>
                      <input
                        type="text"
                        value={installConfig.install_path}
                        onChange={(e) => setInstallConfig({...installConfig, install_path: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70"
                        placeholder="/Users/Shared/IndexTTS"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        🎯 模型类型
                      </label>
                      <select
                        value={installConfig.model_type}
                        onChange={(e) => setInstallConfig({...installConfig, model_type: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70"
                      >
                        <option value="standard">🎵 标准模型 (推荐)</option>
                        <option value="large">🎼 大型模型 (高质量)</option>
                        <option value="small">🎶 小型模型 (快速)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-center">
                       <label className="flex items-center cursor-pointer bg-white/70 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200">
                         <input
                           type="checkbox"
                           checked={installConfig.use_gpu}
                           onChange={(e) => setInstallConfig({...installConfig, use_gpu: e.target.checked})}
                           className="mr-3 w-5 h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                         />
                         <span className="text-sm font-semibold text-gray-700">
                           ⚡ GPU 加速 {systemInfo?.cuda_available ? '(CUDA 可用)' : '(CUDA 不可用)'}
                         </span>
                       </label>
                     </div>
                   </div>
                 </div>
                 
                 <div className="text-center">
                   <button
                     onClick={startInstallation}
                     disabled={!systemInfo || systemStatus.status === 'error' || isWebEnvironment || installing}
                     className="px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg rounded-2xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                   >
                     {isWebEnvironment ? '🚫 不支持Web环境' : installing ? '⏳ 安装中...' : '🚀 开始安装'}
                   </button>
                 </div>
               </div>
          ) : (
             <div className="space-y-8">
               <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl">
                 <div className="flex items-center justify-between mb-4">
                   <span className="font-bold text-lg text-gray-800">{installProgress.message}</span>
                   <span className="text-2xl font-bold text-indigo-600">{Math.round(installProgress.progress)}%</span>
                 </div>
                 
                 {/* Progress Bar */}
                 <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                   <div 
                     className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
                     style={{ width: `${installProgress.progress}%` }}
                   ></div>
                 </div>
               </div>
               
               {/* Installation Steps */}
               <div className="grid grid-cols-5 gap-4">
                 {[
                   { key: "preparing", label: "准备环境", icon: "🔧" },
                   { key: "downloading", label: "下载源码", icon: "📥" },
                   { key: "models", label: "安装模型", icon: "🧠" },
                   { key: "dependencies", label: "配置依赖", icon: "📦" },
                   { key: "configuring", label: "完成配置", icon: "⚙️" }
                 ].map((step, index) => {
                   const isActive = installProgress.step === step.key;
                   const isCompleted = installProgress.progress > (index / 5) * 100;
                   
                   return (
                     <div key={step.key} className="text-center">
                       <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                         isCompleted ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg scale-110' :
                         isActive ? 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-lg scale-105 animate-pulse' :
                         'bg-gray-100 text-gray-400 border-2 border-gray-200'
                       }`}>
                         {isCompleted ? '✅' : isActive ? step.icon : step.icon}
                       </div>
                       <div className={`text-sm font-semibold ${
                         isActive ? 'text-indigo-600' :
                         isCompleted ? 'text-green-600' :
                         'text-gray-500'
                       }`}>
                         {step.label}
                       </div>
                     </div>
                   );
                 })}
               </div>
               
               {(installProgress.is_complete || installProgress.step === "completed") && (
                 <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-2xl border-2 border-green-200">
                   <div className="text-6xl mb-4">🎉</div>
                   <h3 className="text-2xl font-bold text-green-800 mb-4">IndexTTS 安装完成！</h3>
                   <p className="text-green-700 mb-6">您现在可以开始使用 IndexTTS 语音合成系统了</p>
                   <div className="flex justify-center space-x-4">
                     <button
                       className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                       onClick={launchIndexTTS}
                     >
                       🚀 启动 IndexTTS
                     </button>
                     <button
                       className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                       onClick={openInstallDirectory}
                     >
                       📁 打开安装目录
                     </button>
                   </div>
                 </div>
               )}
               
               {installProgress.has_error && (
                 <div className="text-center bg-gradient-to-r from-red-50 to-pink-50 p-8 rounded-2xl border-2 border-red-200">
                   <div className="text-6xl mb-4">❌</div>
                   <h3 className="text-2xl font-bold text-red-800 mb-4">安装失败</h3>
                   <p className="text-red-700 mb-6">{installProgress.message}</p>
                   <button
                     className="px-8 py-4 bg-gradient-to-r from-gray-500 to-slate-600 text-white font-bold rounded-2xl hover:from-gray-600 hover:to-slate-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                     onClick={() => {
                       setInstalling(false);
                       setInstallProgress({
                         step: "idle",
                         progress: 0,
                         message: "",
                         is_complete: false,
                         has_error: false
                       });
                     }}
                   >
                     🔄 重新开始
                   </button>
                 </div>
               )}
               </div>
            )}
           </div>
         </div>
       </div>
       </div>

       </div>
     );
   }

export default App;
