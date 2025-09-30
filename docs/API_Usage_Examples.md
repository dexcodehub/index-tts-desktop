# IndexTTS API 使用示例

本文档提供了 IndexTTS 各种 API 接口的详细使用示例。

## 目录

1. [Python API 使用示例](#python-api-使用示例)
   - [IndexTTS v1 基础使用](#indextts-v1-基础使用)
   - [IndexTTS v1 快速推理](#indextts-v1-快速推理)
   - [IndexTTS2 基础使用](#indextts2-基础使用)
   - [IndexTTS2 情感控制](#indextts2-情感控制)
2. [命令行接口使用示例](#命令行接口使用示例)
3. [Web UI 使用示例](#web-ui-使用示例)

## Python API 使用示例

### IndexTTS v1 基础使用

```python
from indextts.infer import IndexTTS

# 初始化模型
tts = IndexTTS(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True  # 使用FP16提高推理速度
)

# 基础文本转语音
text = "欢迎大家来体验indextts，并给予我们意见与反馈，谢谢大家。"
voice_prompt = "examples/voice_01.wav"
output_path = "output_basic.wav"

result = tts.infer(
    audio_prompt=voice_prompt,
    text=text,
    output_path=output_path,
    verbose=True  # 输出详细信息
)

print(f"音频已保存到: {result}")
```

### IndexTTS v1 快速推理

```python
from indextts.infer import IndexTTS

# 初始化模型
tts = IndexTTS(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True
)

# 对于长文本使用快速推理
long_text = """
这是一个很长的文本示例，用于演示快速推理功能。
快速推理可以显著提高长文本的合成速度。
通过分句和批处理技术，可以实现2-10倍的性能提升。
这对于需要合成大量文本的应用场景非常有用。
"""

voice_prompt = "examples/voice_01.wav"
output_path = "output_fast.wav"

result = tts.infer_fast(
    audio_prompt=voice_prompt,
    text=long_text,
    output_path=output_path,
    verbose=True,
    max_text_tokens_per_segment=100,  # 每个分句的最大token数
    segments_bucket_max_size=4,       # 分句分桶的最大容量
    # 生成参数
    do_sample=True,
    top_p=0.8,
    top_k=30,
    temperature=1.0,
    num_beams=3
)

print(f"长文本音频已保存到: {result}")
```

### IndexTTS2 基础使用

```python
from indextts.infer_v2 import IndexTTS2

# 初始化IndexTTS2模型
tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True,
    use_deepspeed=False  # 根据系统配置选择是否使用DeepSpeed
)

# 基础文本转语音（使用音色参考音频作为情感参考）
text = "欢迎大家来体验indextts2，并给予我们意见与反馈，谢谢大家。"
spk_audio_prompt = "examples/voice_01.wav"
output_path = "output_v2_basic.wav"

result = tts.infer(
    spk_audio_prompt=spk_audio_prompt,
    text=text,
    output_path=output_path,
    verbose=True
)

print(f"IndexTTS2音频已保存到: {result}")
```

### IndexTTS2 情感控制

#### 1. 使用独立的情感参考音频

```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True
)

# 使用不同的音频作为情感参考
text = "今天的天气真好，我们去公园散步吧！"
spk_audio_prompt = "examples/voice_01.wav"      # 音色参考
emo_audio_prompt = "examples/voice_10.wav"      # 情感参考（兴奋的语调）
output_path = "output_v2_emo_audio.wav"

result = tts.infer(
    spk_audio_prompt=spk_audio_prompt,
    text=text,
    output_path=output_path,
    emo_audio_prompt=emo_audio_prompt,
    emo_alpha=0.8,  # 情感权重，0.0-1.0之间
    verbose=True
)

print(f"使用情感参考音频的音频已保存到: {result}")
```

#### 2. 使用情感向量控制

```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True
)

# 使用情感向量直接控制情感
text = "我真的很生气，你怎么能这样做！"
spk_audio_prompt = "examples/voice_01.wav"
output_path = "output_v2_emo_vector.wav"

# 情感向量：[高兴, 愤怒, 悲伤, 恐惧, 反感, 低落, 惊讶, 平静]
emo_vector = [0.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1]  # 高愤怒，低平静

result = tts.infer(
    spk_audio_prompt=spk_audio_prompt,
    text=text,
    output_path=output_path,
    emo_vector=emo_vector,
    emo_alpha=0.9,  # 情感强度
    verbose=True
)

print(f"使用情感向量的音频已保存到: {result}")
```

#### 3. 使用文本描述控制情感

```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True
)

# 使用文本描述控制情感（实验功能）
text = "快躲起来！是他要来了！他要来抓我们了！"
spk_audio_prompt = "examples/voice_12.wav"
output_path = "output_v2_emo_text.wav"

result = tts.infer(
    spk_audio_prompt=spk_audio_prompt,
    text=text,
    output_path=output_path,
    emo_alpha=0.6,        # 情感强度
    use_emo_text=True,    # 启用文本情感控制
    use_random=False,     # 不使用随机采样
    verbose=True
)

print(f"使用文本情感控制的音频已保存到: {result}")
```

#### 4. 使用指定的情感描述文本

```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True
)

# 使用指定的情感描述文本
text = "快躲起来！是他要来了！他要来抓我们了！"
emo_text = "你吓死我了！你是鬼吗？"
spk_audio_prompt = "examples/voice_12.wav"
output_path = "output_v2_emo_text_specified.wav"

result = tts.infer(
    spk_audio_prompt=spk_audio_prompt,
    text=text,
    output_path=output_path,
    emo_alpha=0.6,
    use_emo_text=True,
    emo_text=emo_text,    # 指定情感描述文本
    use_random=False,
    verbose=True
)

print(f"使用指定情感描述文本的音频已保存到: {result}")
```

## 命令行接口使用示例

### 基础使用

```bash
# 基本文本合成
uv run indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output.wav

# 使用FP16精度
uv run indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output_fp16.wav --fp16

# 指定配置文件和模型目录
uv run indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output_custom.wav -c checkpoints/config.yaml --model_dir checkpoints

# 强制覆盖已存在的文件
uv run indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output.wav -f

# 指定运行设备
uv run indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output_cuda.wav -d cuda:0
```

### 批量处理脚本示例

```bash
#!/bin/bash
# batch_tts.sh - 批量文本转语音脚本

# 定义参考音频
VOICE_PROMPT="examples/voice_01.wav"

# 定义文本列表
TEXTS=(
    "欢迎使用 IndexTTS 文本转语音系统。"
    "这是一个批量处理的示例。"
    "您可以根据需要添加更多文本。"
    "每个文本将生成独立的音频文件。"
)

# 循环处理每个文本
for i in "${!TEXTS[@]}"; do
    TEXT="${TEXTS[$i]}"
    OUTPUT_FILE="output_${i}.wav"
    
    echo "正在处理第 $((i+1)) 个文本..."
    uv run indextts "$TEXT" -v "$VOICE_PROMPT" -o "$OUTPUT_FILE" --fp16
    
    if [ $? -eq 0 ]; then
        echo "成功生成: $OUTPUT_FILE"
    else
        echo "处理失败: $OUTPUT_FILE"
    fi
done

echo "批量处理完成！"
```

## Web UI 使用示例

### 启动 Web UI

```bash
# 基本启动
uv run webui.py

# 指定端口和主机
uv run webui.py --port 8080 --host 127.0.0.1

# 使用FP16和DeepSpeed加速
uv run webui.py --fp16 --deepspeed

# 使用CUDA内核优化
uv run webui.py --cuda_kernel
```

### Web UI 功能使用

1. **基础合成**:
   - 上传音色参考音频
   - 输入文本内容
   - 点击"生成语音"按钮

2. **情感控制**:
   - 选择"使用情感参考音频"选项
   - 上传情感参考音频
   - 调整情感权重滑块

3. **情感向量控制**:
   - 选择"使用情感向量控制"选项
   - 调整各个情感维度的滑块值
   - 点击生成

4. **高级参数设置**:
   - 展开"高级生成参数设置"
   - 调整采样参数以获得不同的语音效果
   - 调整分句参数以优化长文本处理

### Web UI API 调用示例

虽然 Web UI 主要通过浏览器界面使用，但其后端基于 Gradio，可以通过编程方式调用：

```python
import requests
import json

# Web UI 运行在本地 7860 端口
url = "http://127.0.0.1:7860/api/predict"

# 准备请求数据
data = {
    "fn_index": 0,  # 函数索引，需要根据实际接口确定
    "data": [
        "examples/voice_01.wav",  # 音色参考音频
        0,  # 情感控制方式索引
        "欢迎使用 IndexTTS Web UI",  # 文本
        None,  # 情感参考音频
        1.0,  # 情感权重
        "",   # 情感描述文本
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,  # 情感向量
        120,  # 分句最大token数
        True, 0.8, 30, 0.8, 0.0, 3, 10.0, 1500  # 生成参数
    ]
}

# 发送请求
response = requests.post(url, json=data)

if response.status_code == 200:
    result = response.json()
    print("Web UI API 调用成功:", result)
else:
    print("Web UI API 调用失败:", response.status_code, response.text)
```

## 最佳实践建议

### 性能优化

1. **使用 FP16**: 在支持的硬件上使用 FP16 可以显著提高推理速度并减少内存占用
2. **合理设置分句参数**: 根据文本长度和质量要求调整 `max_text_tokens_per_segment`
3. **长文本使用快速推理**: 对于长文本，优先使用 `infer_fast` 方法
4. **启用硬件加速**: 在支持 CUDA 的 GPU 上运行以获得最佳性能

### 质量优化

1. **选择合适的参考音频**: 清晰、高质量的参考音频有助于提高合成质量
2. **调整生成参数**: 根据需要调整采样参数以平衡质量和多样性
3. **情感控制调优**: 合理设置情感权重和向量以获得自然的情感表达

### 故障排除

1. **内存不足**: 降低 `max_text_tokens_per_segment` 值或使用 CPU 运行
2. **音频质量问题**: 检查参考音频质量，调整生成参数
3. **情感控制不明显**: 增加情感权重或调整情感向量值