/*
 * window.storage 适配层
 * ------------------------------------------------------------
 * 背景：部分工具（比如资料分析·错题本）原本是按 Claude Artifact
 * 环境写的，直接调用 window.storage.get / window.storage.set。
 * 这套 API 只在 claude.ai 里才存在，离开这个环境（比如部署到
 * GitHub Pages）默认是不存在的，调用就会报错。
 *
 * 这个脚本在页面加载最早期注入一个"仿造"的 window.storage：
 *   - 优先尝试存到 Supabase（云端，跨设备同步）
 *   - 连不上网 / 请求失败时，自动降级存到浏览器 localStorage
 *   - 对外的方法签名、返回值结构跟真正的 window.storage 保持一致，
 *     所以原来的工具代码完全不用改。
 *
 * 用法：在工具 HTML 的 <head> 里，工具自己的 <script> 之前引入：
 *   <script src="../storage-polyfill.js" data-tool="notebook"></script>
 * data-tool 用来给每个工具的数据做命名空间隔离，避免不同工具的
 * key 互相冲突。
 */
(function () {
  // 如果已经存在真正的 window.storage（比如真的在 Claude Artifact 环境里打开），
  // 就不要覆盖，直接用原生的。
  if (window.storage) return;

  var SUPABASE_URL = 'https://tfvgntgamixgzjjvumcy.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmdmdudGdhbWl4Z3pqanZ1bWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjUzMzAsImV4cCI6MjEwMDY0MTMzMH0.tY3_QXFtjwdPZEbmfEPr3QThGJMty3RMsZEj9nmr-Io';
  var REST = SUPABASE_URL + '/rest/v1/app_data';
  var TIMEOUT_MS = 6000;

  var currentScript = document.currentScript;
  var TOOL_NAME = (currentScript && currentScript.dataset && currentScript.dataset.tool) || 'default';

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('timeout')); }, ms);
      })
    ]);
  }

  function localKey(key, shared) {
    return 'cloudstore::' + (shared ? '_shared' : TOOL_NAME) + '::' + key;
  }

  function toolNameFor(shared) {
    return shared ? '_shared' : TOOL_NAME;
  }

  async function cloudGet(key, shared) {
    var url = REST +
      '?tool_name=eq.' + encodeURIComponent(toolNameFor(shared)) +
      '&data_key=eq.' + encodeURIComponent(key) +
      '&select=data_value&limit=1';
    var res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY
      }
    });
    if (!res.ok) throw new Error('cloud get failed: ' + res.status);
    var rows = await res.json();
    return rows.length ? rows[0].data_value : null;
  }

  async function cloudSet(key, value, shared) {
    var url = REST + '?on_conflict=tool_name,data_key';
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{
        tool_name: toolNameFor(shared),
        data_key: key,
        data_value: value,
        updated_at: new Date().toISOString()
      }])
    });
    if (!res.ok) throw new Error('cloud set failed: ' + res.status);
  }

  async function cloudDelete(key, shared) {
    var url = REST +
      '?tool_name=eq.' + encodeURIComponent(toolNameFor(shared)) +
      '&data_key=eq.' + encodeURIComponent(key);
    var res = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY
      }
    });
    if (!res.ok) throw new Error('cloud delete failed: ' + res.status);
  }

  window.storage = {
    async get(key, shared) {
      try {
        var value = await withTimeout(cloudGet(key, shared), TIMEOUT_MS);
        if (value !== null && value !== undefined) {
          try { localStorage.setItem(localKey(key, shared), value); } catch (e) {}
          return { key: key, value: value, shared: !!shared };
        }
      } catch (e) {
        console.warn('[storage-polyfill] 云端读取失败，改用本地缓存：', e);
      }
      try {
        var local = localStorage.getItem(localKey(key, shared));
        if (local !== null) return { key: key, value: local, shared: !!shared };
      } catch (e) {}
      return null;
    },

    async set(key, value, shared) {
      try { localStorage.setItem(localKey(key, shared), value); } catch (e) {}
      try {
        await withTimeout(cloudSet(key, value, shared), TIMEOUT_MS);
      } catch (e) {
        console.warn('[storage-polyfill] 云端保存失败，已保存到本地浏览器，之后联网会在下次保存时自动同步：', e);
      }
      return { key: key, value: value, shared: !!shared };
    },

    async delete(key, shared) {
      try { localStorage.removeItem(localKey(key, shared)); } catch (e) {}
      try {
        await withTimeout(cloudDelete(key, shared), TIMEOUT_MS);
      } catch (e) {
        console.warn('[storage-polyfill] 云端删除失败：', e);
      }
      return { key: key, deleted: true, shared: !!shared };
    },

    async list(prefix, shared) {
      try {
        var url = REST +
          '?tool_name=eq.' + encodeURIComponent(toolNameFor(shared)) +
          '&select=data_key' +
          (prefix ? '&data_key=like.' + encodeURIComponent(prefix) + '*' : '');
        var res = await withTimeout(fetch(url, {
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        }), TIMEOUT_MS);
        if (!res.ok) throw new Error('cloud list failed: ' + res.status);
        var rows = await res.json();
        return { keys: rows.map(function (r) { return r.data_key; }), prefix: prefix, shared: !!shared };
      } catch (e) {
        console.warn('[storage-polyfill] 云端列表读取失败：', e);
        return { keys: [], prefix: prefix, shared: !!shared };
      }
    }
  };
})();
