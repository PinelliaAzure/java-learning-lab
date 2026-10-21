/* 扩展模块的学习目标、易错点与作业 */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});
  function add(id, goals, pitfalls, homework) {
    G[id] = { goals: goals, pitfalls: pitfalls, homework: homework };
  }

  add('network-basics',
    ['说清 TCP 与 UDP 的区别和适用场景', '用 Socket/ServerSocket 写出最小客户端与服务端', '给网络调用设置连接与读取超时'],
    ['不设超时，线程可能永久阻塞。', '把 UDP 当可靠传输用，丢了数据不知道。', '服务端 accept 后不关闭 Socket，句柄泄漏。'],
    '写一个回声服务端：客户端发一行，服务端原样返回；用 telnet 或第二个 Socket 测试，然后故意不启动服务端观察连接异常。');

  add('http-client-server',
    ['用 HttpClient 发起 GET/POST 并判断状态码', '用 HttpServer 注册路由并返回 JSON', '区分 4xx 与 5xx 的排查方向'],
    ['不判状态码就解析 body，把错误页当 JSON。', '每次请求新建 HttpClient，连接池无法复用。', 'POST 忘记设置 Content-Type: application/json。'],
    '用 HttpClient 调用一个公开 API，打印状态码和响应体前 200 个字符；再用 HttpServer 写一个 /hello 接口并用 curl 访问。');

  add('nio-selector',
    ['理解 Channel/Buffer/Selector 的分工', '说出阻塞 IO 与 NIO 的适用差异', '知道半包/粘包与 Netty 的关系'],
    ['写完 Buffer 不 flip 就读，读到 0 字节。', 'select 后不清空 selectedKeys，事件重复处理。', '以为 NIO 一定比 IO 快，忽略复杂度。'],
    '用 ServerSocketChannel + Selector 写一个接受连接并回显的服务器，用两个客户端同时连接，观察单线程如何处理。');

  add('security-basics',
    ['区分编码、哈希、加密', '用 SHA-256 计算摘要并解释加盐', '知道密码应使用 bcrypt/Argon2'],
    ['把 Base64 当加密。', '密码用 MD5 且不加盐。', '自己实现随机数或加密算法。'],
    '用 MessageDigest 计算“盐 + 密码”的 SHA-256，并比较同一密码不同盐的结果；再用 BCryptPasswordEncoder 生成和校验一次。');

  add('crypto',
    ['说清对称与非对称加密的取舍', '用 RSA 生成密钥对并做签名验签', '解释 TLS 为什么用混合加密'],
    ['用 ECB 模式加密，相同明文得到相同密文。', '把私钥发给对方“验签”。', '用同一把密钥既加密又签名。'],
    '生成 RSA 密钥对，对一段文本签名并用公钥验签；再修改一个字节，确认验签失败。');

  add('web-security',
    ['说出 HTTPS 解决与不解决的问题', '用 PreparedStatement 消除 SQL 注入', '区分 XSS、CSRF 与越权'],
    ['只在前端校验，后端直接信任参数。', '接口只判登录不判数据归属。', '把用户输入直接拼进 SQL 或 HTML。'],
    '找一段拼接 SQL 的代码改成 PreparedStatement；再列出你项目中三个需要“校验资源归属”的接口。');

  add('spring-aop',
    ['解释切面、切点、通知的关系', '说清 JDK 代理与 CGLIB 的差异', '解释自调用导致事务失效的原因'],
    ['同类 this 调用绕过代理。', '对 final 类/方法用 CGLIB 代理失败。', '切点写太宽，把不必要的方法都拦截。'],
    '写一个 @Around 切面统计 service 方法耗时；再用 this 调用一个 @Transactional 方法，观察事务是否生效。');

  add('spring-security',
    ['说清认证与授权的区别', '配置 SecurityFilterChain 的放行与角色规则', '用 BCrypt 存储密码并解释 401/403'],
    ['把 401 和 403 混为一谈。', '只做登录校验，不做接口级授权。', '密码明文或 MD5 存储。'],
    '配置 /api/public/** 放行、/api/admin/** 需要 ADMIN，用两个账号分别访问，记录状态码。');

  add('db-index',
    ['解释 B+ 树与聚簇/二级索引', '按最左前缀设计联合索引', '用 EXPLAIN 判断索引是否生效'],
    ['给每个列都建索引。', '联合索引顺序与查询条件不匹配。', '在索引列上做函数运算导致失效。'],
    '给 book(author, price) 建联合索引，分别用 author、price、author+price 查询，记录 EXPLAIN 的 key 和 type。');

  add('db-lock',
    ['说清四种隔离级别与异常现象', '解释 MVCC 如何实现一致性读', '知道无索引更新可能退化为表锁'],
    ['长事务占锁，导致连接池耗尽。', '更新顺序不一致，制造死锁。', '以为所有 UPDATE 都只锁一行。'],
    '开两个会话：一个事务更新 id=1 不提交，另一个更新 id=1，观察阻塞；再用 SHOW ENGINE INNODB STATUS 看锁等待。');

  add('db-optimization',
    ['用慢查询日志定位问题 SQL', '用 keyset 分页替代深分页', '判断何时才需要分库分表'],
    ['没有测量就加索引或调参数。', '深分页 LIMIT 100000,20。', '过早分库分表，复杂度失控。'],
    '造一张 10 万行的表，对比 LIMIT 90000,20 与 keyset 分页的耗时；再为查询列建索引并对比。');

  add('redis',
    ['掌握 String/Hash/ZSet 的典型用法', '解释穿透、击穿、雪崩的区别与对策', '用 SET NX PX 实现分布式锁并安全释放'],
    ['缓存与数据库双写顺序错误。', '锁没有过期时间，宕机后永久死锁。', '释放锁不校验持有者。'],
    '用 Redis 缓存一个查询结果并设置 10 分钟 TTL；模拟缓存失效，观察请求是否打到数据库，再讨论空值缓存方案。');

  add('message-queue',
    ['说清 MQ 的解耦、削峰、异步价值', '比较 Kafka 与 RabbitMQ 的适用场景', '用唯一键实现消费幂等'],
    ['假设消息只投递一次。', '跨分区强求全局顺序。', '消费失败无限重试，造成积压。'],
    '设计一个“下单后扣库存”的异步流程：列出消息 key、消费幂等方案、失败重试与死信处理。');
})();
