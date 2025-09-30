# IndexTTS API 接口文档

IndexTTS 提供了多种方式来使用其文本转语音功能，包括命令行接口(CLI)、Python API 和 Web UI。本文档将详细介绍各种接口的使用方法和参数说明。

## 目录

1. [Python API](#python-api)
   - [IndexTTS (v1)](#indextts-v1)
   - [IndexTTS2 (v2)](#indextts2-v2)
2. [命令行接口 (CLI)](#命令行接口-cli)
3. [Web UI API](#web-ui-api)
4. [HTTP API](#http-api)
5. [参数说明](#参数说明)

## Python API

### IndexTTS (v1)

IndexTTS v1 是项目的第一个版本，提供了基础的文本转语音功能。

#### 初始化

```python
from indextts.infer import IndexTTS

tts = IndexTTS(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=False,
    device=None,
    use_cuda_kernel=None
)
```

**参数说明:**
- `cfg_path` (str): 配置文件路径，默认为 "checkpoints/config.yaml"
- `model_dir` (str): 模型目录路径，默认为 "checkpoints"
- `use_fp16` (bool): 是否使用 FP16 精度，默认为 False
- `device` (str): 运行设备，如 'cuda:0', 'cpu'，默认自动选择
- `use_cuda_kernel` (bool): 是否使用 CUDA 内核，默认为 None

#### infer 方法

```python
output = tts.infer(
    audio_prompt="examples/voice_01.wav",
    text="欢迎大家来体验indextts，并给予我们意见与反馈，谢谢大家。",
    output_path="gen.wav",
    verbose=False,
    max_text_tokens_per_segment=120,
    **generation_kwargs
)
```

**参数说明:**
- `audio_prompt` (str): 音色参考音频文件路径
- `text` (str): 待合成的文本
- `output_path` (str): 输出音频文件路径
- `verbose` (bool): 是否输出详细信息，默认为 False
- `max_text_tokens_per_segment` (int): 每个分句的最大 token 数，默认为 120
- `**generation_kwargs`: 生成参数，包括:
  - `do_sample` (bool): 是否进行采样，默认为 True
  - `top_p` (float): top-p 采样参数，默认为 0.8
  - `top_k` (int): top-k 采样参数，默认为 30
  - `temperature` (float): 温度参数，默认为 1.0
  - `length_penalty` (float): 长度惩罚，默认为 0.0
  - `num_beams` (int): beam search 数量，默认为 3
  - `repetition_penalty` (float): 重复惩罚，默认为 10.0
  - `max_mel_tokens` (int): 最大 mel token 数，默认为 600

#### infer_fast 方法

```python
output = tts.infer_fast(
    audio_prompt="examples/voice_01.wav",
    text="欢迎大家来体验indextts，并给予我们意见与反馈，谢谢大家。",
    output_path="gen.wav",
    verbose=False,
    max_text_tokens_per_segment=100,
    segments_bucket_max_size=4,
    **generation_kwargs
)
```

**参数说明:**
- `audio_prompt` (str): 音色参考音频文件路径
- `text` (str): 待合成的文本
- `output_path` (str): 输出音频文件路径
- `verbose` (bool): 是否输出详细信息，默认为 False
- `max_text_tokens_per_segment` (int): 每个分句的最大 token 数，默认为 100
- `segments_bucket_max_size` (int): 分句分桶的最大容量，默认为 4
- `**generation_kwargs`: 生成参数（同 infer 方法）

### IndexTTS2 (v2)

IndexTTS2 是项目的第二个版本，增加了情感控制等功能。

#### 初始化

```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=False,
    device=None,
    use_cuda_kernel=None,
    use_deepspeed=False
)
```

**参数说明:**
- `cfg_path` (str): 配置文件路径，默认为 "checkpoints/config.yaml"
- `model_dir` (str): 模型目录路径，默认为 "checkpoints"
- `use_fp16` (bool): 是否使用 FP16 精度，默认为 False
- `device` (str): 运行设备，如 'cuda:0', 'cpu'，默认自动选择
- `use_cuda_kernel` (bool): 是否使用 CUDA 内核，默认为 None
- `use_deepspeed` (bool): 是否使用 DeepSpeed 加速，默认为 False

#### infer 方法

```python
output = tts.infer(
    spk_audio_prompt="examples/voice_01.wav",
    text="欢迎大家来体验indextts2，并给予我们意见与反馈，谢谢大家。",
    output_path="gen.wav",
    emo_audio_prompt=None,
    emo_alpha=1.0,
    emo_vector=None,
    use_emo_text=False,
    emo_text=None,
    use_random=False,
    interval_silence=200,
    verbose=False,
    max_text_tokens_per_segment=120,
    **generation_kwargs
)
```

**参数说明:**
- `spk_audio_prompt` (str): 音色参考音频文件路径
- `text` (str): 待合成的文本
- `output_path` (str): 输出音频文件路径
- `emo_audio_prompt` (str): 情感参考音频文件路径，默认为 None
- `emo_alpha` (float): 情感权重，范围 0.0-1.0，默认为 1.0
- `emo_vector` (list): 情感向量，包含 8 个浮点数，分别对应 [高兴, 愤怒, 悲伤, 恐惧, 反感, 低落, 惊讶, 平静]
- `use_emo_text` (bool): 是否使用文本描述控制情感，默认为 False
- `emo_text` (str): 情感描述文本，默认为 None
- `use_random` (bool): 是否使用随机采样，默认为 False
- `interval_silence` (int): 分句间静音时长（毫秒），默认为 200
- `verbose` (bool): 是否输出详细信息，默认为 False
- `max_text_tokens_per_segment` (int): 每个分句的最大 token 数，默认为 120
- `**generation_kwargs`: 生成参数，包括:
  - `do_sample` (bool): 是否进行采样，默认为 True
  - `top_p` (float): top-p 采样参数，默认为 0.8
  - `top_k` (int): top-k 采样参数，默认为 30
  - `temperature` (float): 温度参数，默认为 0.8
  - `length_penalty` (float): 长度惩罚，默认为 0.0
  - `num_beams` (int): beam search 数量，默认为 3
  - `repetition_penalty` (float): 重复惩罚，默认为 10.0
  - `max_mel_tokens` (int): 最大 mel token 数，默认为 1500

## 命令行接口 (CLI)

IndexTTS 提供了命令行接口，可以通过 `indextts` 命令直接使用。

### 基本用法

```bash
indextts "文本内容" -v 音频提示文件.wav -o 输出文件.wav
```

### 参数说明

- `text` (必需): 待合成的文本内容
- `-v`, `--voice` (必需): 音频提示文件路径（wav 格式）
- `-o`, `--output_path`: 输出音频文件路径，默认为 "gen.wav"
- `-c`, `--config`: 配置文件路径，默认为 "checkpoints/config.yaml"
- `--model_dir`: 模型目录路径，默认为 "checkpoints"
- `--fp16`: 使用 FP16 精度进行推理
- `-f`, `--force`: 强制覆盖已存在的输出文件
- `-d`, `--device`: 运行设备，如 cpu, cuda, mps, xpu

### 示例

```bash
# 基本用法
indextts "欢迎大家来体验indextts，并给予我们意见与反馈，谢谢大家。" -v examples/voice_01.wav -o output.wav

# 使用 FP16 精度
indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output.wav --fp16

# 指定设备
indextts "欢迎使用 IndexTTS" -v examples/voice_01.wav -o output.wav -d cuda:0
```

## Web UI API

Web UI 提供了图形界面来使用 IndexTTS 功能，同时也暴露了一些 API 接口。

### 启动 Web UI

```bash
uv run webui.py [--port PORT] [--host HOST] [--model_dir MODEL_DIR] [--fp16] [--deepspeed] [--cuda_kernel]
```

### 参数说明

- `--port`: Web UI 端口，默认为 7860
- `--host`: Web UI 主机地址，默认为 0.0.0.0
- `--model_dir`: 模型目录路径，默认为 "./checkpoints"
- `--fp16`: 使用 FP16 精度进行推理
- `--deepspeed`: 使用 DeepSpeed 加速
- `--cuda_kernel`: 使用 CUDA 内核
- `--gui_seg_tokens`: GUI 中每个分句的最大 token 数，默认为 120

### Web UI 功能

Web UI 提供了以下功能：

1. **音色参考音频上传**: 上传用于音色克隆的参考音频
2. **文本输入**: 输入待合成的文本
3. **情感控制**:
   - 使用音色参考音频作为情感参考
   - 上传独立的情感参考音频
   - 使用情感向量控制（8个维度）
   - 使用文本描述控制情感（实验功能）
4. **高级参数设置**:
   - GPT2 采样参数（do_sample, temperature, top_p, top_k, num_beams 等）
   - 分句设置（最大 token 数等）
5. **示例**: 预设的示例用于快速测试

## HTTP API

Web UI 基于 Gradio 构建，自动提供了 HTTP API 接口。详细信息请参阅 [HTTP API 文档](HTTP_API.md)。

## 参数说明

### 文本分句参数

- `max_text_tokens_per_segment`: 控制每个分句的最大 token 数
  - 值越小，分句越碎，推理速度可能更快但可能影响质量
  - 值越大，分句越长，推理速度可能更慢但质量更接近非快速推理
  - 建议值范围：80-200

### 情感控制参数

IndexTTS2 提供了多种情感控制方式：

1. **情感参考音频**: 使用独立的音频作为情感参考
2. **情感向量**: 直接指定 8 维情感向量
   - 高兴 (happy)
   - 愤怒 (angry)
   - 悲伤 (sad)
   - 恐惧 (afraid)
   - 反感 (disgusted)
   - 低落 (melancholic)
   - 惊讶 (surprised)
   - 平静 (calm)
3. **文本描述**: 使用自然语言描述情感

### 生成参数

- `do_sample`: 是否使用采样而非贪婪解码
- `temperature`: 控制随机性，值越高越随机
- `top_p`: nucleus sampling 参数
- `top_k`: top-k sampling 参数
- `num_beams`: beam search 的 beam 数量
- `repetition_penalty`: 重复惩罚系数
- `length_penalty`: 长度惩罚系数
- `max_mel_tokens`: 最大生成的 mel token 数量

### 性能优化参数

- `use_fp16`: 使用半精度浮点数，减少内存占用并可能提高速度
- `use_deepspeed`: 使用 DeepSpeed 优化推理性能
- `use_cuda_kernel`: 使用自定义 CUDA 内核加速 BigVGAN
- `infer_fast`: 使用快速推理模式，对长文本可提升 2-10 倍速度