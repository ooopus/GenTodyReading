# GenTodyReading

本项目利用 AnkiConnect 插件，帮助你更高效地进行阅读和学习。

## 快速开始

### 1. 安装 AnkiConnect

在 Anki 中安装 **AnkiConnect** 插件，插件代码为： **2055492159**。

安装步骤：

1. 打开 Anki。
2. 点击菜单栏中的 “工具” -> “插件”。
3. 点击 “获取插件...”。
4. 在弹出的窗口中输入代码 `2055492159`，然后点击 “确定”。
5. 重启 Anki。

### 2. 配置 AnkiConnect

打开 AnkiConnect 的配置文件，通常位于 Anki 的插件目录下的 `AnkiConnect` 子目录中，文件名为 `config.json` 或类似名称。修改配置文件，确保其内容如下：

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "ignoreOriginList": [],
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOriginList": [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
}
```

**说明：**

*   `webBindAddress`: AnkiConnect 监听的地址，通常设置为 `127.0.0.1`。
*   `webBindPort`: AnkiConnect 监听的端口，默认为 `8765`。
*   `webCorsOriginList`: 允许跨域访问 AnkiConnect 的来源列表。本项目需要在本地 `3000` 端口启动一个 Web 服务，所以你需要将 `http://localhost:3000` 和 `http://127.0.0.1:3000` 添加到列表中。

### 3. 启动本地 Web 服务器

将本项目的所有文件下载到本地的一个文件夹中。然后在该文件夹下，打开终端或命令行窗口，执行以下命令启动一个简单的 Web 服务器：

```bash
python3 -m http.server 3000
```

这将在本地的 `3000` 端口启动一个 Web 服务器。

**注意：** 确保你的系统中已经安装了 Python 3。

### 4. 访问 GenTodyReading

在浏览器中访问以下地址：

```
http://127.0.0.1:3000
```

现在，你可以开始使用 GenTodyReading 了！

## 贡献

欢迎对本项目提出建议和贡献代码！

## 许可

本项目采用 **GNU General Public License v3.0 (GPLv3)** 许可。

**GPLv3 许可概要：**

*   **你可以：**
    *   自由地运行该程序，无论出于何种目的。
    *   自由地学习该程序如何工作，并根据你的需要修改它。
    *   自由地分发该程序的副本。
    *   自由地改进该程序，并将你的改进发布给公众，使整个社区受益。

*   **你必须：**
    *   在所有副本上都包含原始的版权声明和 GPLv3 许可声明。
    *   对修改过的程序做明显的修改声明。
    *   以相同的 GPLv3 许可发布你修改后的程序或包含该程序大部分代码的新程序。
    *   提供源代码。

**完整的 GPLv3 许可文本请参阅：** [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html)
