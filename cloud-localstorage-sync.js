/*
 * localStorage 云同步适配层
 * ------------------------------------------------------------
 * 适用于直接使用原生 localStorage.getItem / setItem 的工具
 * （跟 storage-polyfill.js 不同，那个是给用 window.storage 写的工具用的）。
 *
 * 原理：
 *   1. 页面刚加载时，用同步请求先把云端已存的数据拉下来写进
 *      localStorage —— 必须在工具自己的代码读取 localStorage 之前
 *      完成，所以这里用了同步 XHR（虽然是过时写法，但这个场景下
 *      刚好需要"阻塞一下、确保数据已就位"，属于合理使用）。
 *   2. 之后只要工具调用 localStorage.setItem(...)，这里会顺手把这次
 *      写入也异步同步一份到云端（做了防抖，短时间内多次保存只会
 *      发一次请求，避免刷爆接口）。
 *   3. 不需要知道工具具体用了哪些 key，全部自动同步，以后工具新增
 *      存储项也不用再改这个脚本。
 *
 * 用法：
 *   <script src="../cloud-localstorage-sync.js" data-tool="graphic"></script>
 * 放在工具自己的 <script> 之前（越靠前越好，最好是 <head> 里第一个）。
 *
 * 如果某个工具有另一套专门的大数据同步机制（比如按模块分批同步），
 * 可以加一个 data-exclude-prefix 属性，让这个通用同步脚本跳过那些 key，
 * 不要跟专门的机制打架、也不要把大数据塞进本地存储占满配额：
 *   <script src="../cloud-localstorage-sync.js" data-tool="graphic" data-exclude-prefix="tuitui-notes"></script>
 */
(function () {
  var SUPABASE_URL = 'https://tfvgntgamixgzjjvumcy.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmdmdudGdhbWl4Z3pqanZ1bWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjUzMzAsImV4cCI6MjEwMDY0MTMzMH0.tY3_QXFtjwdPZEbmfEPr3QThGJMty3RMsZEj9nmr-Io';
  var REST = SUPABASE_URL + '/rest/v1/app_data';

  var currentScript = document.currentScript;
  var TOOL_NAME = (currentScript && currentScript.dataset && currentScript.dataset.tool) || 'default';
  var EXCLUDE_PREFIX = (currentScript && currentScript.dataset && currentScript.dataset.excludePrefix) || null;

  function isExcluded(key){
    return EXCLUDE_PREFIX && key.indexOf(EXCLUDE_PREFIX) === 0;
  }

  // ---------- 1. 启动时同步拉取云端数据，写入 localStorage ----------
  try {
    var url = REST + '?tool_name=eq.' + encodeURIComponent(TOOL_NAME) + '&select=data_key,data_value';
    if(EXCLUDE_PREFIX){
      url += '&data_key=not.like.' + encodeURIComponent(EXCLUDE_PREFIX) + '*';
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // 同步请求：必须等它做完，后面工具代码才能读到正确数据
    xhr.setRequestHeader('apikey', SUPABASE_KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      var rows = JSON.parse(xhr.responseText);
      rows.forEach(function (row) {
        try { localStorage.setItem(row.data_key, row.data_value); } catch (e) {}
      });
    }
  } catch (e) {
    console.warn('[cloud-sync] 拉取云端数据失败，先用本地缓存，不影响使用：', e);
  }

  // ---------- 2. 包装 setItem / removeItem，之后每次改动都顺手同步到云端 ----------
  var _setItem = Storage.prototype.setItem;
  var _removeItem = Storage.prototype.removeItem;
  var pendingSet = {};
  var pendingRemove = {};
  var flushTimer = null;

  function flush() {
    var setKeys = Object.keys(pendingSet);
    var removeKeys = Object.keys(pendingRemove);
    pendingSet = {};
    pendingRemove = {};
    flushTimer = null;

    if (setKeys.length) {
      var rows = setKeys.map(function (key) {
        return {
          tool_name: TOOL_NAME,
          data_key: key,
          data_value: pendingSet[key],
          updated_at: new Date().toISOString()
        };
      });
      fetch(REST + '?on_conflict=tool_name,data_key', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(rows)
      }).catch(function (e) { console.warn('[cloud-sync] 云端保存失败，已保存到本地：', e); });
    }

    removeKeys.forEach(function (key) {
      var delUrl = REST +
        '?tool_name=eq.' + encodeURIComponent(TOOL_NAME) +
        '&data_key=eq.' + encodeURIComponent(key);
      fetch(delUrl, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      }).catch(function (e) { console.warn('[cloud-sync] 云端删除失败：', e); });
    });
  }

  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 800); // 防抖：短时间内多次保存只会同步一次
  }

  Storage.prototype.setItem = function (key, value) {
    var localOk = true;
    try{
      _setItem.call(this, key, value);
    }catch(e){
      localOk = false; // 本地存储写不进去（比如配额满了）不要紧，本地缓存只是锦上添花，云端才是真正权威的数据源
    }
    if (this === window.localStorage && !isExcluded(key)) {
      delete pendingRemove[key];
      pendingSet[key] = value;
      scheduleFlush();
    }
    if(!localOk) return; // 本地没写成功就别假装成功了，直接结束（云端同步已经在上面排好队了）
  };

  Storage.prototype.removeItem = function (key) {
    _removeItem.call(this, key);
    if (this === window.localStorage && !isExcluded(key)) {
      delete pendingSet[key];
      pendingRemove[key] = true;
      scheduleFlush();
    }
  };
})();
