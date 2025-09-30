# IndexTTS HTTP API 接口文档

IndexTTS 项目通过 Gradio Web UI 提供了 HTTP API 接口，允许开发者通过 HTTP 请求直接调用 TTS 功能。

## 目录

1. [启动 HTTP 服务](#启动-http-服务)
2. [API 端点](#api-端点)
3. [请求格式](#请求格式)
4. [响应格式](#响应格式)
5. [使用示例](#使用示例)
6. [错误处理](#错误处理)

## 启动 HTTP 服务

要启用 HTTP API，需要启动 Web UI 服务：

```bash
# 基本启动
uv run webui.py

# 指定端口和主机
uv run webui.py --port 7860 --host 0.0.0.0

# 使用 FP16 加速
uv run webui.py --fp16

# 使用 DeepSpeed 加速
uv run webui.py --deepspeed
```

启动后，Web UI 将在指定的主机和端口上运行，并自动提供 HTTP API 接口。

默认访问地址：
- Web UI: http://127.0.0.1:7860
- API 端点: http://127.0.0.1:7860/api/predict

## API 端点

### 主要端点

1. **预测接口**: `POST /api/predict`
   - 用于执行文本转语音的核心功能

2. **配置接口**: `GET /api/config`
   - 获取 API 配置信息

3. **健康检查**: `GET /api/health`
   - 检查服务运行状态

## 请求格式

### POST /api/predict

#### 请求头
```
Content-Type: application/json
```

#### 请求体
```json
{
  "fn_index": 0,
  "data": [
    "音频文件路径或Base64编码",
    "情感控制模式索引",
    "待合成文本",
    "情感参考音频路径",
    "情感权重",
    "情感描述文本",
    "情感向量[0]", "情感向量[1]", "情感向量[2]", "情感向量[3]",
    "情感向量[4]", "情感向量[5]", "情感向量[6]", "情感向量[7]",
    "分句最大token数",
    "do_sample", "top_p", "top_k", "temperature",
    "length_penalty", "num_beams", "repetition_penalty", "max_mel_tokens"
  ],
  "request": {
    "cancel": false,
    "fn_index": 0
  }
}
```

#### 参数说明

| 参数位置 | 参数名 | 类型 | 必需 | 说明 |
|---------|--------|------|------|------|
| data[0] | spk_audio_prompt | string | 是 | 音色参考音频文件路径 |
| data[1] | emo_control_method | integer | 是 | 情感控制方式 (0-3) |
| data[2] | text | string | 是 | 待合成的文本 |
| data[3] | emo_audio_prompt | string | 否 | 情感参考音频路径 |
| data[4] | emo_alpha | float | 否 | 情感权重 (0.0-1.0) |
| data[5] | emo_text | string | 否 | 情感描述文本 |
| data[6-13] | emo_vector | float[8] | 否 | 情感向量 [高兴, 愤怒, 悲伤, 恐惧, 反感, 低落, 惊讶, 平静] |
| data[14] | max_text_tokens_per_segment | integer | 否 | 分句最大token数 |
| data[15] | do_sample | boolean | 否 | 是否进行采样 |
| data[16] | top_p | float | 否 | top-p 采样参数 |
| data[17] | top_k | integer | 否 | top-k 采样参数 |
| data[18] | temperature | float | 否 | 温度参数 |
| data[19] | length_penalty | float | 否 | 长度惩罚 |
| data[20] | num_beams | integer | 否 | beam search 数量 |
| data[21] | repetition_penalty | float | 否 | 重复惩罚 |
| data[22] | max_mel_tokens | integer | 否 | 最大 mel token 数 |

## 响应格式

### 成功响应

```json
{
  "data": [
    {
      "name": "输出音频文件名.wav",
      "data": "Base64编码的音频数据",
      "is_file": false
    }
  ],
  "is_generating": false,
  "duration": 0.123,
  "average_duration": 0.123
}
```

### 错误响应

```json
{
  "error": "错误信息",
  "traceback": "详细的错误堆栈信息",
  "duration": 0.123
}
```

## 使用示例

### Python 示例

```python
import requests
import json
import base64

# Web UI 运行在本地 7860 端口
url = "http://127.0.0.1:7860/api/predict"

# 准备请求数据
data = {
    "fn_index": 0,
    "data": [
        "examples/voice_01.wav",  # 音色参考音频
        0,                        # 情感控制方式索引 (0=与音色参考音频相同)
        "欢迎使用 IndexTTS HTTP API",  # 文本
        None,                     # 情感参考音频
        1.0,                      # 情感权重
        "",                       # 情感描述文本
        0.0, 0.0, 0.0, 0.0,      # 情感向量 [高兴, 愤怒, 悲伤, 恐惧]
        0.0, 0.0, 0.0, 0.0,      # 情感向量 [反感, 低落, 惊讶, 平静]
        120,                      # 分句最大token数
        True, 0.8, 30, 0.8,      # 生成参数: do_sample, top_p, top_k, temperature
        0.0, 3, 10.0, 1500       # 生成参数: length_penalty, num_beams, repetition_penalty, max_mel_tokens
    ]
}

# 发送请求
response = requests.post(url, json=data)

if response.status_code == 200:
    result = response.json()
    print("API 调用成功")
    
    # 获取音频数据
    audio_data = result["data"][0]
    if "data" in audio_data:
        # 保存音频文件
        with open("output.wav", "wb") as f:
            audio_bytes = base64.b64decode(audio_data["data"])
            f.write(audio_bytes)
        print("音频已保存到 output.wav")
else:
    print("API 调用失败:", response.status_code)
    print("错误信息:", response.text)
```

### JavaScript 示例

```javascript
// 使用 fetch API
async function callIndexTTSAPI() {
    const url = "http://127.0.0.1:7860/api/predict";
    
    const requestData = {
        fn_index: 0,
        data: [
            "examples/voice_01.wav",  // 音色参考音频
            0,                        // 情感控制方式索引
            "欢迎使用 IndexTTS HTTP API",  // 文本
            null,                     // 情感参考音频
            1.0,                      // 情感权重
            "",                       // 情感描述文本
            0.0, 0.0, 0.0, 0.0,      // 情感向量
            0.0, 0.0, 0.0, 0.0,      // 情感向量
            120,                      // 分句最大token数
            true, 0.8, 30, 0.8,      // 生成参数
            0.0, 3, 10.0, 1500       // 生成参数
        ]
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("API 调用成功:", result);
            
            // 处理音频数据
            const audioData = result.data[0];
            if (audioData.data) {
                // 创建音频播放链接
                const audioBlob = new Blob([Uint8Array.from(atob(audioData.data), c => c.charCodeAt(0))], {type: 'audio/wav'});
                const audioUrl = URL.createObjectURL(audioBlob);
                console.log("音频URL:", audioUrl);
            }
        } else {
            console.error("API 调用失败:", response.status, await response.text());
        }
    } catch (error) {
        console.error("请求出错:", error);
    }
}

// 调用函数
callIndexTTSAPI();
```

### curl 示例

```bash
# 基本调用
curl -X POST http://127.0.0.1:7860/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "fn_index": 0,
    "data": [
      "examples/voice_01.wav",
      0,
      "欢迎使用 IndexTTS HTTP API",
      null,
      1.0,
      "",
      0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0,
      120,
      true, 0.8, 30, 0.8,
      0.0, 3, 10.0, 1500
    ]
  }' \
  -o response.json

# 解析响应并提取音频数据
python3 -c "
import json
import base64
with open('response.json', 'r') as f:
    response = json.load(f)
    if 'data' in response and len(response['data']) > 0:
        audio_data = response['data'][0]
        if 'data' in audio_data:
            with open('output.wav', 'wb') as audio_file:
                audio_file.write(base64.b64decode(audio_data['data']))
            print('音频已保存到 output.wav')
"
```

## 情感控制模式说明

IndexTTS 支持多种情感控制模式：

1. **模式 0**: 与音色参考音频相同
   - 使用音色参考音频作为情感参考

2. **模式 1**: 使用情感参考音频
   - 使用独立的情感参考音频

3. **模式 2**: 使用情感向量控制
   - 通过 8 维情感向量直接控制情感

4. **模式 3**: 使用情感描述文本控制（实验功能）
   - 通过自然语言描述控制情感

## 错误处理

### 常见错误码

| 状态码 | 说明 | 解决方案 |
|--------|------|----------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求参数错误 | 检查请求参数格式和内容 |
| 404 | 接口不存在 | 检查 API 端点是否正确 |
| 429 | 请求过于频繁 | 降低请求频率 |
| 500 | 服务器内部错误 | 检查服务器日志 |
| 503 | 服务不可用 | 等待服务恢复 |

### 错误信息示例

```json
{
  "error": "Parameter validation failed",
  "traceback": "Traceback (most recent call last):\n  File \"webui.py\", line 123, in gen_single\n    raise ValueError('Text is empty')\nValueError: Text is empty"
}
```

## 注意事项

1. **文件路径**: 在 HTTP API 调用中，音频文件路径需要是服务器上可访问的路径
2. **Base64 编码**: 对于上传的音频文件，可以使用 Base64 编码传输
3. **跨域问题**: 如果从前端调用，可能需要处理跨域问题
4. **性能考虑**: HTTP API 调用会占用服务器资源，建议合理控制并发量
5. **安全性**: 在生产环境中，建议添加身份验证和访问控制

## API 限制

1. **请求大小限制**: 单个请求的大小可能受到限制
2. **并发限制**: 同时处理的请求数量可能有限制
3. **超时限制**: 长时间运行的请求可能会超时
4. **频率限制**: 短时间内大量请求可能会被限制

如需调整这些限制，可以修改 Web UI 的配置或在启动时添加相应参数。