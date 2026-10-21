/* 扩展题库（第 4 批）：网络编程 / 安全与加密 / Spring AOP 与 Security / 数据库进阶 / Redis 与 MQ
   仅补充 EXAM_EXTRA 与 LESSON_EXTRA，不改动课程正文。
   - EXAM_EXTRA：按模块补齐到至少 18 题；每题 {q, options[4], answer, explain}。
   - LESSON_EXTRA：只给不足 3 题的课补题。当前 m15~m19 每课已有 3 题，故为空映射。 */
(function () {
  'use strict';

  window.EXAM_EXTRA = window.EXAM_EXTRA || {};
  window.LESSON_EXTRA = window.LESSON_EXTRA || {};

  Object.assign(window.EXAM_EXTRA, {
    m15: [
      {
        q: 'TCP 三次握手的核心目的是？',
        options: ['交换 IP 地址', '确认双方收发能力并同步初始序列号', '协商加密算法', '分配端口号'],
        answer: 1,
        explain: '三次握手确认双向可达、同步初始序列号（SEQ），之后才进入数据传输。'
      },
      {
        q: 'TCP 四次挥手的主要作用是？',
        options: ['建立连接', '确认双方数据都发送完毕并释放连接', '协商加密算法', '分配端口号'],
        answer: 1,
        explain: '四次挥手让双方都确认自己的数据已发送完，并分别关闭发送方向，最后释放连接；三次握手才是建立连接。'
      },
      {
        q: '客户端执行 new Socket(host, port) 时，host 和 port 分别定位什么？',
        options: ['主机和主机上的进程', '数据库和表', '用户和角色', '协议和版本'],
        answer: 0,
        explain: 'IP 或主机名定位主机，端口定位主机上的具体进程；两者合起来才能建立连接。'
      },
      {
        q: 'HTTP 状态码 502 通常表示？',
        options: ['请求成功', '资源被永久移动', '请求参数不合法', '网关或代理从上游收到无效响应'],
        answer: 3,
        explain: '502 Bad Gateway 是网关/代理一侧的问题；504 则是网关等待上游超时。'
      },
      {
        q: '使用 try-with-resources 关闭 Socket 的主要好处是？',
        options: ['自动重连', '正常或异常都会关闭，避免文件描述符泄漏', '自动加密数据', '提升网络带宽'],
        answer: 1,
        explain: 'Socket 持有系统资源，必须确保关闭；try-with-resources 会在 finally 阶段自动 close。'
      },
      {
        q: 'TCP 依靠什么机制保证数据可靠到达？',
        options: ['广播和组播', 'Base64 编码', '确认应答、序号和超时重传', 'DNS 轮询'],
        answer: 2,
        explain: 'TCP 用序号排序、ACK 确认、超时重传和滑动窗口来保证可靠、有序。'
      },
      {
        q: 'TCP/NIO 网络编程中，“粘包/半包”是指？',
        options: ['TCP 字节流可能把多次发送合并或拆分，接收方要按协议边界拆解', 'UDP 一定丢包', 'Buffer 无法扩容', '端口被占用'],
        answer: 0,
        explain: 'TCP 是字节流，没有消息边界；需要在应用层用长度字段或分隔符来划分消息。'
      },
      {
        q: 'DNS 的主要作用是？',
        options: ['把域名解析为 IP 地址', '给 HTTP 报文加密', '分配进程端口', '压缩响应体'],
        answer: 0,
        explain: 'DNS 是互联网的“通讯录”，负责域名到 IP 的解析；加密由 TLS 负责。'
      },
      {
        q: 'HTTP/1.1 默认的 keep-alive 作用是？',
        options: ['强制使用 HTTPS', '禁止浏览器缓存', '把响应体压缩', '复用同一条 TCP 连接发送多个请求，减少握手开销'],
        answer: 3,
        explain: 'keep-alive 让多个请求复用连接，避免每次都做 TCP 握手；连接终究会超时关闭。'
      }
    ],
    m16: [
      {
        q: 'AES-GCM 相比 AES-CBC 的主要优势是？',
        options: ['自带完整性校验，属于认证加密', '不需要密钥', '只能加密文本', '加密后不可解密'],
        answer: 0,
        explain: 'GCM 同时提供机密性和完整性，解密时能发现数据被篡改；CBC 需要额外做 MAC。'
      },
      {
        q: '用 RSA 做加密时，通常用哪把密钥加密数据？',
        options: ['私钥', '公钥', '会话密钥', '随机盐'],
        answer: 1,
        explain: '公钥加密、私钥解密，公钥可以公开分发；签名则反过来用私钥签、公钥验。'
      },
      {
        q: '数字证书的核心作用是？',
        options: ['压缩公钥', '由 CA 把公钥与身份绑定，防止公钥被冒充', '生成随机密码', '替代 HTTPS'],
        answer: 1,
        explain: '证书由受信任的 CA 签发，证明“这把公钥确实属于这个域名/主体”，TLS 靠它防冒充。'
      },
      {
        q: '中间人攻击的典型方式是？',
        options: ['强行关闭服务器', '删除数据库索引', '猜解端口号', '攻击者分别与通信双方建立连接并转发、篡改数据'],
        answer: 3,
        explain: '攻击者插在双方中间，双方都以为在和对端直连；证书校验和 TLS 能识别这种冒充。'
      },
      {
        q: '密码哈希时加随机盐的作用是？',
        options: ['相同密码得到不同摘要，抵御彩虹表', '让哈希变短', '使哈希可逆', '加快登录速度'],
        answer: 0,
        explain: '每个用户用独立随机盐，攻击者无法用预计算表批量破解；盐要和哈希一起存储。'
      },
      {
        q: '防御 XSS 最直接的做法是？',
        options: ['把密码明文存储', '关闭 HTTPS', '对输出到页面的内容做 HTML 转义', '使用 GET 提交'],
        answer: 2,
        explain: 'XSS 的根源是用户输入被当成 HTML/JS 执行；输出转义、CSP、HttpOnly 都是有效防线。'
      },
      {
        q: 'CSRF Token 能防 CSRF 的原因是？',
        options: ['Token 放在数据库里', 'Token 会加密 Cookie', '浏览器自动拒绝跨站请求', '攻击者站点拿不到用户会话中的随机 Token，无法伪造完整请求'],
        answer: 3,
        explain: '服务端下发随机 Token 并校验，跨站请求虽然会自动带 Cookie，却带不上正确的 Token。'
      },
      {
        q: '生成密钥、令牌、盐等安全随机数应使用？',
        options: ['java.util.Random', 'Math.random()', 'SecureRandom', 'System.currentTimeMillis()'],
        answer: 2,
        explain: 'Random/Math.random 的序列可预测；安全场景必须用加密安全的 SecureRandom。'
      },
      {
        q: 'HTTPS 连接中证书校验失败时，正确做法是？',
        options: ['忽略错误继续连接', '改成 HTTP', '把证书存到本地信任', '中止连接并排查证书问题'],
        answer: 3,
        explain: '证书错误可能意味着中间人攻击或配置问题，继续连接等于放弃身份校验。'
      }
    ],
    m17: [
      {
        q: '切点表达式 execution(* com.example.service.*.*(..)) 匹配的是？',
        options: ['service 包下任意类的任意方法', '只有 public static 方法', '只有构造方法', '所有包的所有字段'],
        answer: 0,
        explain: '第一个 * 是返回类型任意，接着是包、类、方法名，(..) 表示任意参数。'
      },
      {
        q: '@AfterThrowing 通知在什么时候执行？',
        options: ['目标方法正常返回后', '目标方法抛出异常后', '目标方法执行前', '代理创建时'],
        answer: 1,
        explain: 'AfterThrowing 用于异常后的处理，比如记录失败日志；正常返回则走 @AfterReturning。'
      },
      {
        q: 'JDK 动态代理的前提是？',
        options: ['目标类必须是 final', '必须使用 CGLIB', '目标类必须实现接口', '方法必须是 static'],
        answer: 2,
        explain: 'JDK 代理基于接口生成实现类；没有接口时 Spring 才改用 CGLIB 生成子类。'
      },
      {
        q: 'CGLIB 无法增强哪类方法？',
        options: ['public 方法', 'final 方法', '带参数的方法', '返回 void 的方法'],
        answer: 1,
        explain: 'CGLIB 通过继承并覆盖方法实现代理，final 方法不能被覆盖，因此无法增强。'
      },
      {
        q: '@Transactional 默认在什么异常下回滚？',
        options: ['所有异常', '只有 IOException', '任何受检异常', 'RuntimeException 和 Error'],
        answer: 3,
        explain: '默认只对运行时异常和 Error 回滚；受检异常需要 rollbackFor 显式指定。'
      },
      {
        q: '事务传播行为 REQUIRES_NEW 的含义是？',
        options: ['加入当前事务', '挂起当前事务，新开一个独立事务', '没有事务就报错', '只读事务'],
        answer: 1,
        explain: 'REQUIRES_NEW 会挂起外层事务并开启新事务，两者提交/回滚互不影响。'
      },
      {
        q: 'Spring Security 把当前登录信息主要存放在？',
        options: ['ApplicationContext', 'DispatcherServlet', 'SecurityContextHolder', 'ModelAndView'],
        answer: 2,
        explain: '认证成功后 Authentication 放入 SecurityContextHolder，默认基于 ThreadLocal 供当前线程读取。'
      },
      {
        q: 'hasRole("ADMIN") 实际匹配的权限名是？',
        options: ['ADMIN', 'ROLE_ADMIN', 'ROLEADMIN', 'has_admin'],
        answer: 1,
        explain: 'hasRole 会自动补 ROLE_ 前缀；用 hasAuthority 时则要写完整的 ROLE_ADMIN。'
      },
      {
        q: 'UserDetailsService 的职责是？',
        options: ['加密数据库', '生成 JWT 密钥', '配置数据源', '按用户名加载用户和权限'],
        answer: 3,
        explain: '登录时 AuthenticationManager 调用 UserDetailsService 按用户名查出用户、密码和权限。'
      },
      {
        q: 'JWT 无状态认证的主要代价是？',
        options: ['无法携带用户信息', '必须使用 Cookie', '签发后难以主动失效，需要短过期或黑名单', '不能跨域'],
        answer: 2,
        explain: 'JWT 自包含且服务端不存会话，登出、改权限后旧 token 仍然有效，需要用短过期 + 黑名单缓解。'
      },
      {
        q: 'Spring Security 默认开启的 CSRF 防护主要针对？',
        options: ['基于 Cookie 会话的写请求', '所有 GET 请求', '数据库连接', '文件上传大小'],
        answer: 0,
        explain: 'CSRF 利用浏览器自动携带 Cookie；纯 Token 无状态接口可以关闭，但仍用 Cookie 时不能盲目关。'
      },
      {
        q: '启用 @PreAuthorize 方法级鉴权通常需要？',
        options: ['@EnableCaching', '@EnableScheduling', '@EnableMethodSecurity', '@MapperScan'],
        answer: 2,
        explain: 'Spring Security 6 用 @EnableMethodSecurity 开启方法级注解鉴权，旧版本是 @EnableGlobalMethodSecurity。'
      }
    ],
    m18: [
      {
        q: 'B+ 树适合范围查询的关键结构是？',
        options: ['每个节点只存一行', '所有数据都在根节点', '叶子节点用链表相连', '不支持排序'],
        answer: 2,
        explain: 'B+ 树叶子节点按键有序并用链表连接，找到起点后可顺着链表连续扫描范围。'
      },
      {
        q: 'InnoDB 二级索引的叶子节点存的是？',
        options: ['主键值', '整行数据', '表名', '索引名'],
        answer: 0,
        explain: '二级索引叶子存主键，查非索引列时要拿主键回聚簇索引再查一次，也就是回表。'
      },
      {
        q: '下列哪种写法最容易让索引失效？',
        options: ['WHERE id = 1', 'WHERE id > 100', "WHERE name LIKE 'Tom%'", 'WHERE YEAR(created_at) = 2024'],
        answer: 3,
        explain: '对索引列使用函数后，数据库无法直接按索引值定位；可改成范围条件 created_at >= ... AND < ...。'
      },
      {
        q: '事务 ACID 中的隔离性指？',
        options: ['事务要么全成功要么全失败', '并发事务之间互不干扰，看到一致的数据', '数据持久保存', '约束不被破坏'],
        answer: 1,
        explain: '隔离性由隔离级别和锁/MVCC 实现；原子性、一致性、持久性分别对应 A、C、D。'
      },
      {
        q: '幻读是指同一事务内？',
        options: ['读到了脏数据', '更新丢失', '两次查询同一范围，第二次多出其他事务插入的行', '数据库宕机'],
        answer: 2,
        explain: '幻读强调“行数变多”，InnoDB 在可重复读下用 MVCC 和间隙锁（Next-Key Lock）来缓解。'
      },
      {
        q: '预防死锁的常见做法是？',
        options: ['让事务尽量长', '按固定顺序访问资源并缩短事务', '关闭索引', '提高隔离级别到串行化'],
        answer: 1,
        explain: '所有事务按同一顺序加锁能避免循环等待；事务越短，持锁时间越短，冲突越少。'
      },
      {
        q: '大事务的主要危害不包括？',
        options: ['长时间持锁', 'undo 日志膨胀', '主从延迟增大', '自动提升索引效率'],
        answer: 3,
        explain: '大事务会长时间持锁、撑大 undo、拉长主从同步；它不会提升索引效率。'
      },
      {
        q: '连接池被耗尽最常见的原因是？',
        options: ['数据库索引太多', 'SQL 写得太短', '连接池配置了最大连接数', '连接用完没有关闭或慢 SQL 长期占用'],
        answer: 3,
        explain: '连接泄漏和慢查询占满连接最典型；需要设置借出超时、泄漏检测并优化慢 SQL。'
      },
      {
        q: '区分度很低的列（如性别）单独建索引，通常？',
        options: ['收益有限，优化器可能仍选择全表扫描', '效果很好', '会导致事务失效', '会自动变成联合索引'],
        answer: 0,
        explain: '索引的价值在于快速缩小范围；一列只有两三个值时，扫描大半张表还不如全表扫描。'
      }
    ],
    m19: [
      {
        q: 'Redis 单线程执行命令却很快，主要原因是？',
        options: ['使用磁盘缓存', '每个请求开一个线程', '数据在内存中且用 IO 多路复用处理连接', '不需要网络'],
        answer: 2,
        explain: 'Redis 数据在内存，命令执行是单线程避免锁竞争，网络层用 IO 多路复用处理大量连接。'
      },
      {
        q: 'RDB 与 AOF 的主要区别是？',
        options: ['RDB 存快照、恢复快但可能丢数据；AOF 追加写命令、更实时但文件更大', 'RDB 是加密格式', 'AOF 不能持久化', '两者完全一样'],
        answer: 0,
        explain: 'RDB 是某一时刻的快照，宕机可能丢最后一段时间；AOF 记录写命令，更实时但需要重放和压缩。'
      },
      {
        q: '缓存击穿是指？',
        options: ['大量 key 同时过期', '查询不存在的数据', 'Redis 宕机', '热点 key 过期瞬间大量请求打到数据库'],
        answer: 3,
        explain: '击穿针对单个热点 key；可用互斥锁只放一个请求回源，或逻辑过期后台刷新。'
      },
      {
        q: '缓解缓存雪崩的常见做法是？',
        options: ['把所有 key 设成同一时间过期', '关闭缓存', '给 TTL 加随机抖动并做多级缓存/高可用', '只用 RDB'],
        answer: 2,
        explain: '雪崩是大量 key 同时失效或 Redis 整体不可用；随机 TTL、多级缓存、集群和高可用都能缓解。'
      },
      {
        q: '“先更新数据库，再删除缓存”的主要好处是？',
        options: ['数据库不支持更新', '缓存不能删除', '这样能强一致', '删除缓存比更新缓存简单且不易写入旧值'],
        answer: 3,
        explain: '更新缓存可能被并发写覆盖成旧值；删缓存让下次读取重建，配合重试和延迟双删降低不一致窗口。'
      },
      {
        q: '分布式锁 SET key value NX PX 30000 中 NX 的含义是？',
        options: ['key 不存在时才设置', '覆盖已有 key', '设置过期时间', '删除 key'],
        answer: 0,
        explain: 'NX 保证只有第一个请求能创建锁；PX 30000 表示 30 秒后自动过期，防止死锁。'
      },
      {
        q: '锁已过期但业务还没执行完，可能的结果是？',
        options: ['锁自动续期', '其他线程拿到锁，出现并发执行', '业务自动回滚', 'Redis 崩溃'],
        answer: 1,
        explain: '过期后锁失效，别的线程可以加锁成功；需要看门狗续期或合理评估 TTL，并在释放时校验 value。'
      },
      {
        q: 'Redis 哨兵（Sentinel）的主要作用是？',
        options: ['持久化数据', '压缩内存', '监控主从并在故障时自动切换', '执行 Lua 脚本'],
        answer: 2,
        explain: '哨兵监控主节点，故障时选举新主并通知客户端，提升可用性；持久化是 RDB/AOF 的职责。'
      },
      {
        q: '消息队列“削峰”指的是？',
        options: ['提高数据库 QPS', '减少消息数量', '让生产者停止发送', '把瞬时高峰请求先入队，消费者按自身能力匀速处理'],
        answer: 3,
        explain: '削峰用队列缓冲瞬时流量，保护下游数据库；代价是处理延迟和积压监控。'
      },
      {
        q: '要尽量避免消息丢失，通常需要？',
        options: ['只依赖生产者发送成功', '生产确认、broker 持久化/副本、消费端手动 ack 三处都做好', '关闭消费者重试', '不设过期时间'],
        answer: 1,
        explain: '消息可能丢在生产、broker、消费三个环节；确认、持久化/副本、手动 ack 要配套使用。'
      },
      {
        q: 'Kafka 同一消费者组内，一条消息通常？',
        options: ['被组内所有消费者各消费一次', '只被组内一个消费者消费', '被所有组消费一次', '不会被消费'],
        answer: 1,
        explain: '组内是竞争关系，一条消息只投给一个消费者；不同消费者组之间才是广播。'
      },
      {
        q: '与 RabbitMQ 相比，Kafka 更适合下面哪种场景？',
        options: ['高吞吐的日志、流式数据处理', '需要复杂路由规则的业务消息', '强一致的数据库事务', '浏览器端实时渲染'],
        answer: 0,
        explain: 'Kafka 高吞吐、按分区顺序写，适合日志和流式处理；RabbitMQ 路由灵活、延迟低，更适合业务消息。两者都不能替代数据库事务。'
      }
    ]
  });

  /* m15~m19 每课已有 3 题，没有需要补到 3 题的课；保留空映射以对齐加载约定。 */
  Object.assign(window.LESSON_EXTRA, {});
})();
