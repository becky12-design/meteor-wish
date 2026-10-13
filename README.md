# 对着流星许下愿望 ✨

满屏星星 + 会动的流星，写下任何一句话就会弹出「许愿成功 / 你将得偿所愿」，
写字的那一刻，你的愿望会飞上夜空变成一颗星。
**同一个链接打开的人，看到的是同一片星空，互相看得见对方许的愿。**

## 文件说明

```
meteor-wish/
├── index.html               ← 整个页面（单文件，CSS/JS 都在里面，零依赖）
├── server.js                ← 零依赖后端：托管页面 + 存心愿 + 实时广播
├── package.json             ← 启动配置（npm start）
├── render.yaml              ← 部署到 Render 免费云的一键配置
├── .gitignore
├── README.md
│
│  以下三个是本机用的双击启动器，部署到云上时不需要它们
├── 1-看效果.bat             ← 双击：直接看效果（不用装任何东西）
├── 2-本机试玩.bat           ← 双击：本机跑服务，同一个 Wi-Fi 的手机可一起玩
├── 3-生成公网链接.bat       ← 双击：生成临时公网链接（需要 cloudflared）
└── tools/start-tunnel.ps1   ← 上面那个 .bat 调用的脚本
```

---

# 一、永久链接（推荐，10 分钟，全程在浏览器里点）

目标：得到一个 `https://meteor-wish-xxxx.onrender.com` 这样的网址，随时随地能打开，你的电脑关机也不影响。
需要注册两个免费账号：**GitHub**（存代码）和 **Render**（跑网站）。不需要装任何软件。

## 第 1 步：把文件传到 GitHub

1. 浏览器打开 https://github.com ，注册或登录
2. 右上角 `+` → **New repository**
   - Repository name 填 `meteor-wish`
   - 选 **Public**（公开）
   - 点 **Create repository**
3. 在新页面点 **uploading an existing file**（或 Add file → Upload files）
4. 打开本文件夹，把这 5 个文件一起拖进去：

   `index.html`、`server.js`、`package.json`、`render.yaml`、`README.md`

   （三个 `.bat` 和 `tools` 文件夹不用传，不影响部署）
5. 页面下方点 **Commit changes**

> 如果 github.com 打不开或很慢：多刷几次，或者换个网络（手机热点）再试。国内访问 GitHub 时快时慢是正常的。

## 第 2 步：让 Render 把你的网页跑起来

1. 浏览器打开 https://render.com ，点 **Get Started** → 选 **GitHub** 登录（一键授权）
2. 点 **New +** → **Web Service**
3. 在仓库列表里找到 `meteor-wish` → 点 **Connect**
4. 只改这几项，其余保持默认：
   - Language / Runtime：**Node**
   - Build Command：留空（或填 `npm install`）
   - Start Command：`node server.js`
   - Instance Type：**Free**
5. 点 **Create Web Service**，等 2~3 分钟，页面顶部就会出现你的网址，例如：

   ```
   https://meteor-wish-abc1.onrender.com
   ```

## 第 3 步：发给朋友

在自己的网址后面加上房间号，例如：

```
https://meteor-wish-abc1.onrender.com/?room=520
```

**同一个链接打开的人就在同一片星空下，互相看得见对方许的愿。**
换个房间号（`?room=别的名字`）就换一片星空。

## 两个要提前知道的地方

- 免费实例闲置 15 分钟会休眠，朋友第一次打开可能要等 30~60 秒（刷新一下就出来了，之后很快）。
- 免费实例的磁盘是临时的：**重启或重新部署后，之前的心愿会清空**（页面本身不受影响）。
  想让心愿永久保存，加一个免费数据库或换成带磁盘的实例就行，需要时告诉我，我帮你接。

---

# 二、本机试玩 / 开发调试

```bash
node server.js          # 或双击 2-本机试玩.bat
```
启动后终端会打印：

```
本机打开：     http://localhost:8787/?room=sky
手机同 Wi-Fi：  http://192.168.x.x:8787/?room=sky
```

手机连同一个 Wi-Fi（关掉流量）打开第二个地址，就能和电脑进同一个房间：电脑上许愿，手机上立刻多一颗星。

**只想看效果、不想跑服务**：双击 `1-看效果.bat`（或直接把 `index.html` 拖进 Edge/Chrome）。
这时是离线模式，流星和许愿都能玩，只是别人看不到你的愿望。

**临时公网链接（不想注册任何账号时用）**：双击 `3-生成公网链接.bat`。
第一次运行它会自动下载 cloudflared（约 20MB），成功后打印一个
`https://xxxx.trycloudflare.com/?room=sky` 的临时网址，并自动复制到剪贴板。
注意：这个链接靠你电脑撑着，**窗口一关/电脑一睡就失效**，下次要重新生成（每次都不一样）。
这也是为什么推荐用上面第一节的永久链接方案。

---

# 三、页面里能玩什么

| 操作 | 效果 |
|---|---|
| 点夜空 | 手指位置飞出一颗流星 |
| 按住拖动 | 连着一串流星飞过（速度跟手） |
| 底部输入任何一句话 | 弹出「许愿成功 / 你将得偿所愿」通知，文字飞上天变成一颗星 |
| 点天上的愿望星 | 看看是谁、什么时候许的愿 |
| 左下「心愿 N」 | 打开抽屉看所有人的愿望 + 设置自己的署名 |
| 右上 `◐` | 换星空配色（白金 / 冰蓝 / 玫瑰金） |
| 右上 `♪` | 音效开关（合成音，不加载音频文件） |
| 右上 `⤴` | 复制当前链接（自动带房间号）发朋友 |
| 右上 `⤓` | 把此刻的星空 + 心愿存成图片（手机上长按保存后发微信） |

细节：流星有长短/速度/亮度/角度的随机差异，偶发"火流星"拖着碎屑，
每 14~26 秒来一次小流星雨；别人的愿望实时推送过来，掉线自动降级成 6 秒轮询；
手机上键盘弹起输入栏会自动上移；横竖屏、`prefers-reduced-motion`、低端机降负载都做了处理。

### 发一条"专属寄语"给某个人

在链接后面加参数（发之前把中文用 URL 编码更保险，很多聊天软件会自动编码）：

```
https://你的网址/?room=520&to=小松&msg=今晚一起看星星吗
```

对方打开会先看到横幅「小松，有人为你留了一句话：今晚一起看星星吗」，
输入框提示语也会变成「对 小松 说点什么…」。这是一个"真诚版"的小惊喜，不是整蛊。

---

# 四、改成你自己的版本

打开 `index.html`，最上面第 1 节就是配置区：

```js
var CFG = {
  placeholder: '对着流星许下愿望✨',   // 输入框提示语
  bannerTitle: '许愿成功',            // 弹窗标题
  bannerSub:   '你将得偿所愿',        // 弹窗副标题
  hint:        '轻触夜空，可以让一颗流星飞过 ✨',
  meteorRate: 4.6,                    // 每秒平均几颗流星（现在偏密，调小更清冷：1.5~3）
  maxMeteors: 34,                     // 同屏最多几颗
  burstGap: [14, 26],                 // 流星雨间隔（秒）
  burstCount: [12, 22]                // 每次流星雨几颗
};
```

配色在下面的 `THEMES` 里（`white` 白金 / `ice` 冰蓝 / `rose` 玫瑰金），
改 `star`（星星）、`trail`（流星）、`wishMine`（自己的愿望星）就能换气质；
想加第四套：`THEMES` 里加一项，再把名字塞进 `THEME_ORDER` 数组。

---

# 五、后端接口与环境变量

| 接口 | 说明 |
|---|---|
| `GET /` | 返回页面 |
| `GET /api/health` | 健康检查（页面用它判断在线/离线） |
| `GET /api/wishes?room=xx&limit=300` | 拉取某房间的心愿 |
| `POST /api/wish` | 许愿（JSON: `room/text/name/clientId/ts`，限流 + 校验） |
| `GET /api/stream?room=xx` | SSE 实时流（新愿望、同屏人数） |
| `DELETE /api/wish?room=xx&id=xx&key=ADMIN_KEY` | 删某条心愿（需设 `ADMIN_KEY`） |

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `8787` | 端口 |
| `ROOM` | `sky` | 启动日志里提示的房间名 |
| `DATA_DIR` | `./data` | 心愿数据目录（自动生成 `wishes.json`） |
| `ADMIN_KEY` | 空 | 设了才启用删除接口 |
| `PUBLIC_ORIGIN` | 空 | 前后端分离部署时允许的页面来源 |

数据：心愿以明文存在 `data/wishes.json`，**同房间的人都能看到**（这正是功能本身），
所以别写不适合被人看到的隐私内容；超过 45 天自动清理，每房间最多 1500 条；
同一 IP 两次许愿间隔 ≥2.5 秒、同一房间 ≥0.7 秒；文本最长 80 字、署名 12 字，控制字符会被清理。

---

# 六、常见问题

**Q：朋友打开看不到我的心愿？**
八成是两个链接的 `?room=` 不一样。用右上角 `⤴` 复制出来的链接一定是对的。

**Q：提示"暂时连不上服务器，心愿只保存在本机"？**
页面没连上 `server.js`（比如直接双击了 `index.html`，或只放了静态页没配 `?api=`）。
这种情况还能玩，只是愿望只有本机可见。

**Q：`2-生成公网链接.bat` 提示下载失败？**
公司/校园网可能拦了 GitHub 或 Cloudflare。可以手动下载
`cloudflared-windows-amd64.exe`（Cloudflare 官网或 GitHub releases），
改名成 `cloudflared.exe` 放进项目文件夹，再双击一次。
实在不行就直接走"路线 B（Render）"，那条路不依赖 cloudflared。

**Q：手机上卡片或输入框被键盘挡住？**
已经在 `visualViewport` 上做了跟随；个别机型若还有问题，把底部 `padding-bottom` 调大些。

**Q：想加"心愿点赞""24 小时后消失""同屏弹幕"？**
在这个结构上加都不难，说一声就好。
