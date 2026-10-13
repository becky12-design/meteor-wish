#!/usr/bin/env node
'use strict';
/*
 * 对着流星许下愿望 · 零依赖后端
 * 作用：
 *   1) 托管 index.html（同一个链接发给朋友就能打开）
 *   2) 保存心愿 + 用 SSE 把新心愿实时广播给同一个房间的所有人
 *   3) 统计同屏人数（“此刻有 N 人同在这片星空下”）
 *
 * 启动：  node server.js
 * 可选环境变量： PORT（默认 8787）、DATA_DIR（数据目录）、ADMIN_KEY（删除心愿的密钥）
 *                PUBLIC_ORIGIN（跨域部署时允许的来源）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || '';
const INDEX_FILE = path.join(__dirname, 'index.html');

const MAX_TEXT = 80;          // 心愿最长字数
const MAX_NAME = 12;          // 署名最长字数
const MAX_PER_ROOM = 1500;    // 每个房间最多保留的条数
const TTL = 45 * 24 * 3600 * 1000;
const IP_GAP = 2500;          // 同一 IP 两次许愿最小间隔(ms)
const ROOM_GAP = 700;         // 同一房间两次许愿最小间隔(ms)

const DATA_FILE = path.join(DATA_DIR, 'wishes.json');
let rooms = Object.create(null);
let saveTimer = null;
const ipLast = Object.create(null);
const roomLast = Object.create(null);
const sseClients = new Set();

function info() { console.log('[wish]', ...arguments); }

/* ---------------- 存储 ---------------- */
function loadDB() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (d && d.rooms && typeof d.rooms === 'object') rooms = d.rooms;
    info('已读取历史心愿：' + Object.keys(rooms).length + ' 个房间');
  } catch (e) { info('没有历史数据，从头开始'); }
  prune();
}
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify({ rooms: rooms, savedAt: Date.now() }));
    } catch (e) { info('保存失败：' + e.message); }
  }, 1200);
}
function prune() {
  const now = Date.now();
  let removed = 0;
  Object.keys(rooms).forEach(function (k) {
    let list = (rooms[k] || []).filter(function (w) { return now - w.ts < TTL; });
    if (list.length > MAX_PER_ROOM) list = list.slice(-MAX_PER_ROOM);
    if (!list.length) { delete rooms[k]; removed++; } else rooms[k] = list;
  });
  Object.keys(ipLast).forEach(function (k) { if (now - ipLast[k] > 3600e3) delete ipLast[k]; });
  Object.keys(roomLast).forEach(function (k) { if (now - roomLast[k] > 3600e3) delete roomLast[k]; });
  return removed;
}
function roomList(room) { return rooms[room] || (rooms[room] = []); }

/* ---------------- 工具 ---------------- */
function clip(s, n) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.slice(0, n);
}
function cleanRoom(s) {
  s = String(s == null ? '' : s).replace(/[^0-9A-Za-z_\u4e00-\u9fa5.-]/g, '').slice(0, 32);
  return s || 'sky';
}
function pub(w) {
  return { id: w.id, text: w.text, name: w.name, clientId: w.clientId, ts: w.ts };
}
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}
function cors(res) {
  if (!PUBLIC_ORIGIN) return;
  res.setHeader('Access-Control-Allow-Origin', PUBLIC_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}
function clientIp(req) {
  const x = req.headers['x-forwarded-for'];
  if (x) return String(x).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}
function readBody(req) {
  return new Promise(function (resolve) {
    let size = 0, buf = '';
    req.on('data', function (c) {
      size += c.length;
      if (size > 8192) { req.destroy(); resolve(null); return; }
      buf += c;
    });
    req.on('end', function () {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch (e) { resolve(null); }
    });
    req.on('error', function () { resolve(null); });
  });
}

/* ---------------- SSE 实时广播 ---------------- */
function sseWrite(res, event, data) {
  try { res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n'); } catch (e) {}
}
function broadcast(room, event, data) {
  sseClients.forEach(function (c) { if (c.room === room) sseWrite(c.res, event, data); });
}
function presence(room) {
  let n = 0;
  sseClients.forEach(function (c) { if (c.room === room) n++; });
  if (n < 1) return;
  broadcast(room, 'presence', { n: n });
}
setInterval(function () {
  sseClients.forEach(function (c) {
    try { c.res.write(':hb\n\n'); } catch (e) {}
  });
  const seen = {};
  sseClients.forEach(function (c) { if (!seen[c.room]) { seen[c.room] = 1; presence(c.room); } });
}, 20000);

/* ---------------- 路由 ---------------- */
function serveIndex(res) {
  fs.readFile(INDEX_FILE, function (err, buf) {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('找不到 index.html，请确认它和 server.js 在同一个文件夹里。');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(buf);
  });
}

const server = http.createServer(function (req, res) {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  /* ---- 页面 ---- */
  if (p === '/' || p === '/index.html') {
    if (req.method !== 'GET') return json(res, 405, { error: 'method' });
    return serveIndex(res);
  }
  if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }

  /* ---- 健康检查 ---- */
  if (p === '/api/health') {
    let n = 0;
    Object.keys(rooms).forEach(function (k) { n += rooms[k].length; });
    return json(res, 200, { ok: true, rooms: Object.keys(rooms).length, wishes: n, online: sseClients.size, now: Date.now() });
  }

  /* ---- 拉取心愿 ---- */
  if (p === '/api/wishes') {
    const room = cleanRoom(u.searchParams.get('room'));
    const limit = Math.min(Math.max(Number(u.searchParams.get('limit')) || 300, 1), 600);
    const all_ = rooms[room] || [];
    return json(res, 200, { serverTs: Date.now(), room: room, total: all_.length, wishes: all_.slice(-limit).map(pub) });
  }

  /* ---- 许下一个愿望 ---- */
  if (p === '/api/wish' && req.method === 'POST') {
    return readBody(req).then(function (b) {
      if (!b) return json(res, 400, { error: 'bad_json' });
      const room = cleanRoom(b.room);
      const text = clip(b.text, MAX_TEXT);
      const name = clip(b.name, MAX_NAME);
      const clientId = /^[\w-]{1,40}$/.test(String(b.clientId || '')) ? String(b.clientId) : '';
      if (!text) return json(res, 400, { error: 'empty_text' });

      const now = Date.now();
      const ip = clientIp(req);
      if (ipLast[ip] && now - ipLast[ip] < IP_GAP) return json(res, 429, { error: 'too_fast', retry: IP_GAP });
      if (roomLast[room] && now - roomLast[room] < ROOM_GAP) return json(res, 429, { error: 'too_fast', retry: ROOM_GAP });
      ipLast[ip] = now;
      roomLast[room] = now;

      let ts = Number(b.ts);
      if (!ts || ts > now + 60000 || ts < now - 86400e3) ts = now;

      const wish = {
        id: 's' + crypto.randomBytes(6).toString('hex'),
        text: text, name: name, clientId: clientId, ts: ts
      };
      const list = roomList(room);
      list.push(wish);
      if (list.length > MAX_PER_ROOM) rooms[room] = list.slice(-MAX_PER_ROOM);
      persist();

      broadcast(room, 'wish', pub(wish));
      json(res, 200, { ok: true, wish: pub(wish) });
      info('新愿望 @' + room + '：' + text.slice(0, 24));
    });
  }

  /* ---- SSE 实时流 ---- */
  if (p === '/api/stream') {
    const room = cleanRoom(u.searchParams.get('room'));
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 3000\n\n');
    res.write(': connected\n\n');
    const c = { res: res, room: room };
    sseClients.add(c);
    presence(room);
    req.on('close', function () {
      sseClients.delete(c);
      presence(room);
    });
    return;
  }

  /* ---- 删除（管理用）---- */
  if (p === '/api/wish' && req.method === 'DELETE') {
    if (!ADMIN_KEY || u.searchParams.get('key') !== ADMIN_KEY) return json(res, 403, { error: 'forbidden' });
    const room = cleanRoom(u.searchParams.get('room'));
    const id = String(u.searchParams.get('id') || '');
    const list = rooms[room] || [];
    const idx = list.findIndex(function (w) { return w.id === id; });
    if (idx < 0) return json(res, 404, { error: 'not_found' });
    list.splice(idx, 1);
    persist();
    broadcast(room, 'remove', { id: id });
    return json(res, 200, { ok: true });
  }

  if (p === '/api/wish') return json(res, 405, { error: 'method' });
  json(res, 404, { error: 'not_found' });
});

server.listen(PORT, HOST, function () {
  const ips = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (a) {
      if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
    });
  });
  const room = String(process.env.ROOM || 'sky').replace(/[^0-9A-Za-z_\u4e00-\u9fa5.-]/g, '').slice(0, 32) || 'sky';
  console.log('');
  console.log('  ✨ 流星许愿页已启动');
  console.log('  ────────────────────────────────────────────');
  console.log('  本机打开：   http://localhost:' + PORT + '/?room=' + room);
  ips.forEach(function (ip) {
    console.log('  手机同 Wi-Fi： http://' + ip + ':' + PORT + '/?room=' + room);
  });
  console.log('  把这个链接发给朋友，你们就会看到同一片星空 ✨');
  console.log('  数据保存在：' + DATA_FILE);
  console.log('');
});
setInterval(prune, 10 * 60 * 1000);
loadDB();
