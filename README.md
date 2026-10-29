# Safari 起始标签页

极简命令行风格的 Safari 起始页。项目是纯静态 HTML、CSS 和 JavaScript，可以直接打开，也可以部署到 GitHub Pages。

## 搜索与快捷前缀

- 直接输入内容：使用当前默认搜索引擎。
- 输入包含 `.` 且不含空格的内容：作为网址打开。
- `!gh 关键词`：搜索 GitHub。
- `!bl 关键词`：搜索 Bilibili。
- `!yt 关键词`：搜索 YouTube。
- `!ai`：打开 ChatGPT。

页面内置 Google、Bing、DuckDuckGo 和百度。输入 `engine` 查看，输入 `engine bing` 等命令切换默认引擎。设置会保存在当前浏览器中。

## 命令

| 命令 | 作用 |
|---|---|
| `help` | 显示命令帮助 |
| `config` | 显示可修改设置 |
| `engine [name]` | 查看或切换默认搜索引擎 |
| `links` | 查看快捷链接 |
| `open <name>` | 打开快捷链接 |
| `link add <name> <url>` | 添加快捷链接 |
| `link remove <name>` | 删除自定义快捷链接 |
| `history` | 查看最近输入 |
| `clear history` | 清除输入历史 |
| `note <内容>` | 保存本地便签 |
| `notes` | 查看便签 |
| `note remove <序号>` | 删除一条便签 |
| `note clear` | 清除全部便签 |
| `set user <值>` | 修改用户名 |
| `set host <值>` | 修改主机名 |
| `set branch <值>` | 修改状态栏分支名 |
| `set theme <值>` | 修改左上角文字 |
| `set color <名称> <#RRGGBB>` | 修改颜色 |
| `reset config` | 恢复 `CONFIG` 默认设置 |

输入时按 `Tab` 补全命令，按上下方向键浏览历史，按 `Esc` 清空。页面获得焦点后，可以按 `/` 聚焦命令行。

历史、便签、自定义链接和页面设置只保存在浏览器的 `localStorage` 中，不会上传到服务器。更换域名或清除网站数据后，这些内容不会自动迁移。

## 修改默认配置

打开 `script.js`，修改顶部的 `CONFIG` 对象：

- `username`、`hostname`、`branch`、`themeLabel`：页面文字。
- `defaultEngine`、`searchEngines`：默认搜索引擎和搜索地址。
- `prefixes`：快捷搜索前缀。
- `links`：默认快捷链接。
- `colors`：页面配色。

## 在 Safari 中使用

1. 在 Safari 中打开页面。
2. 进入“Safari 浏览器”→“设置”→“通用”。
3. 把页面地址填入“主页”。
4. 将“新窗口打开方式”和“新标签页打开方式”设为“主页”。

Safari 打开新标签页时可能把焦点留在顶部智能搜索栏。点击页面命令行即可输入。

## 部署到 GitHub Pages

1. 把项目文件提交到 GitHub 仓库。
2. 打开仓库的 Settings → Pages。
3. 在 Build and deployment 中选择 Deploy from a branch。
4. 选择 `main` 分支和 `/(root)` 目录并保存。
5. 部署完成后，把生成的 HTTPS 地址设为 Safari 主页。

本项目不需要构建命令。不要在 `CONFIG` 中保存密码、令牌或其他敏感信息，因为 GitHub Pages 上的代码可以被公开查看。
