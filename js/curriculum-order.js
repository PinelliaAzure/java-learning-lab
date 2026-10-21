/* 模块排布顺序（自学路径）与编号重排
   ---------------------------------------------------------------------
   顺序：语法 -> 面向对象 -> 类库/集合/泛型/函数式 -> IO/并发/网络 -> JVM/设计模式
        -> 数据库 -> 数据库进阶 -> Redis 与消息队列 -> 安全与加密
        -> Spring 生态 -> Spring AOP 与 Security -> 现代 Java 与 AI 工程 -> 项目实战
   本文件只做排序与重编号，不改任何模块内容；按 id 匹配，重复执行结果不变。 */
(function () {
  'use strict';
  var ORDER = ["m0","m1","m2","m3","m4","m5","m6","m7","m8","m15","m9","m10","m11","m18","m19","m16","m12","m17","m14","m13"];
  var C = window.JAVA_COURSE || (window.JAVA_COURSE = []);
  if (!C.length) return;
  var byId = {};
  C.forEach(function (m) { byId[m.id] = m; });
  var ordered = [];
  ORDER.forEach(function (id) {
    if (byId[id] && ordered.indexOf(byId[id]) < 0) ordered.push(byId[id]);
  });
  C.forEach(function (m) { if (ordered.indexOf(m) < 0) ordered.push(m); });
  ordered.forEach(function (m, i) { m.no = String(i + 1).padStart(2, '0'); C[i] = m; });
  C.length = ordered.length;
})();
