#!/bin/bash

# IndexTTS WebUI 启动脚本
# 解决虚拟环境路径不匹配的问题

set -e  # 遇到错误时退出

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 启动 IndexTTS WebUI..."
echo "📁 项目目录: $SCRIPT_DIR"

# 检查是否存在 uv.lock 文件
if [ ! -f "uv.lock" ]; then
    echo "❌ 未找到 uv.lock 文件，请先运行 'uv sync' 安装依赖"
    exit 1
fi

# 检查是否存在 webui.py 文件
if [ ! -f "webui.py" ]; then
    echo "❌ 未找到 webui.py 文件"
    exit 1
fi

# 清除可能冲突的 VIRTUAL_ENV 环境变量
if [ -n "$VIRTUAL_ENV" ]; then
    echo "⚠️  检测到现有虚拟环境: $VIRTUAL_ENV"
    echo "🔄 清除环境变量以避免路径冲突..."
    unset VIRTUAL_ENV
fi

# 使用 uv 运行 webui.py，让 uv 自动管理虚拟环境
echo "🎯 启动 WebUI 服务器..."
uv run webui.py