/* 扩展模块：网络编程 / 安全与加密 / Spring AOP 与 Security / 数据库进阶 / Redis 与 MQ */
(function () {
  'use strict';
  var C = window.JAVA_COURSE || (window.JAVA_COURSE = []);

  function L(o) { return o; }

  C.push({
    id: 'm15', no: '15', title: '网络编程', desc: 'TCP、HTTP 与 NIO',
    lessons: [
      L({
        id: 'network-basics', title: 'TCP/IP、Socket 与端口', minutes: 9, level: '进阶',
        intro: '两台机器上的程序要通信，靠的是 IP 定位主机、端口定位进程、TCP 保证可靠传输。Socket 就是这套机制在 Java 里的编程接口。',
        points: [
          { t: '分层', d: '应用层 HTTP、传输层 TCP/UDP、网络层 IP、链路层。Java 的 Socket 工作在传输层之上。' },
          { t: 'TCP 与 UDP', d: 'TCP 面向连接、可靠、有序；UDP 无连接、开销小、不保证到达，适合音视频和实时游戏。' },
          { t: 'Socket 与 ServerSocket', d: '客户端用 <code>new Socket(host, port)</code> 连接；服务端用 <code>ServerSocket</code> 监听端口，<code>accept()</code> 阻塞等待连接。' },
          { t: '端口与超时', d: '端口 0~65535，0~1023 是知名端口。网络调用必须设连接/读取超时，否则线程可能永久阻塞。' }
        ],
        code: `try (ServerSocket server = new ServerSocket(8080)) {\n    Socket socket = server.accept();\n    BufferedReader in = new BufferedReader(\n            new InputStreamReader(socket.getInputStream()));\n    PrintWriter out = new PrintWriter(socket.getOutputStream(), true);\n    out.println("Hello, " + in.readLine());\n}`,
        tip: '网络程序三件事：设超时、判异常、关资源。不要假设对方一定会响应。',
        quiz: [
          { q: 'TCP 与 UDP 的核心区别是？', options: ['TCP 更快', 'TCP 面向连接且可靠，UDP 无连接不保证到达', 'UDP 只能传文本', 'TCP 不需要端口'], answer: 1, explain: 'TCP 建立连接、确认重传、保证有序；UDP 只管发，不保证到达和顺序。' },
          { q: '服务端用哪个方法等待客户端连接？', options: ['connect()', 'accept()', 'read()', 'bind()'], answer: 1, explain: 'ServerSocket.accept() 阻塞等待新连接，返回一个 Socket。' },
          { q: '网络调用不设超时，最坏情况是？', options: ['自动重试', '线程永久阻塞', '立即抛异常', '端口被关闭'], answer: 1, explain: '对方不响应时，阻塞式调用可能一直等待；连接超时和读取超时都要设置。' }
        ]
      }),
      L({
        id: 'http-client-server', title: 'HttpClient 与 HttpServer', minutes: 9, level: '进阶',
        intro: 'HTTP 是应用层协议：请求由方法、路径、头、体组成，响应由状态码、头、体组成。JDK 11 自带 HttpClient，JDK 自带 HttpServer 可以写简单的服务端。',
        points: [
          { t: '请求与响应', d: 'GET 取资源、POST 提交、PUT 更新、DELETE 删除；状态码 2xx 成功、3xx 重定向、4xx 客户端错、5xx 服务端错。' },
          { t: 'HttpClient', d: '<code>HttpClient.newHttpClient()</code> 创建客户端，<code>HttpRequest</code> 构造请求，<code>send</code> 同步、<code>sendAsync</code> 异步。' },
          { t: 'HttpServer', d: '<code>HttpServer.create(...).createContext(path, handler)</code> 注册路由，<code>start()</code> 监听。适合学习和测试，不适合生产。' },
          { t: 'JSON 与超时', d: '请求体通常是 JSON，用 Jackson 序列化；连接超时、请求超时、重试策略都要显式配置。' }
        ],
        code: `HttpClient client = HttpClient.newBuilder()\n        .connectTimeout(Duration.ofSeconds(3))\n        .build();\nHttpRequest request = HttpRequest.newBuilder()\n        .uri(URI.create("https://example.com/api/books/1"))\n        .header("Accept", "application/json")\n        .GET().build();\nHttpResponse<String> response =\n        client.send(request, HttpResponse.BodyHandlers.ofString());\nif (response.statusCode() == 200) {\n    System.out.println(response.body());\n}`,
        tip: '先判状态码，再解析 body；4xx/5xx 的 body 往往不是业务数据。',
        quiz: [
          { q: 'HTTP 状态码 404 表示？', options: ['服务器内部错误', '请求的资源不存在', '重定向', '请求成功'], answer: 1, explain: '4xx 是客户端错误，404 特指资源不存在；500 才是服务端错误。' },
          { q: 'HttpClient 的同步发送方法是？', options: ['send', 'sendAsync', 'execute', 'fetch'], answer: 0, explain: 'send 同步阻塞返回 HttpResponse；sendAsync 返回 CompletableFuture。' },
          { q: '服务端返回 JSON 时，响应头通常应包含？', options: ['Content-Type: application/json', 'Accept: text/html', 'Location: /json', 'Cache-Control: no-store'], answer: 0, explain: 'Content-Type 告诉客户端响应体的格式；Accept 是客户端表达“我想要什么”。' }
        ]
      }),
      L({
        id: 'nio-selector', title: 'NIO：Channel、Buffer 与 Selector', minutes: 10, level: '进阶',
        intro: '传统 IO 一个连接一个线程，连接多了线程就爆炸。NIO 用 Channel + Buffer + Selector，让一个线程管理多个连接。',
        points: [
          { t: '面向缓冲区', d: '数据先读进 Buffer，再从中取；Buffer 有 position、limit、capacity 三个指针。' },
          { t: 'Channel', d: '<code>FileChannel</code>、<code>SocketChannel</code>、<code>ServerSocketChannel</code>，可读可写，支持非阻塞模式。' },
          { t: 'Selector', d: '把 Channel 注册到 Selector，一个线程 <code>select()</code> 等待多个事件：ACCEPT、READ、WRITE。' },
          { t: '适用场景', d: '高并发、连接多但每连接数据量小的服务；编程复杂度高于阻塞 IO。' }
        ],
        code: `Selector selector = Selector.open();\nServerSocketChannel server = ServerSocketChannel.open();\nserver.bind(new InetSocketAddress(8080));\nserver.configureBlocking(false);\nserver.register(selector, SelectionKey.OP_ACCEPT);\n\nwhile (true) {\n    selector.select();\n    for (SelectionKey key : selector.selectedKeys()) {\n        if (key.isAcceptable()) { /* accept */ }\n        if (key.isReadable()) { /* read into buffer */ }\n    }\n    selector.selectedKeys().clear();\n}`,
        tip: 'NIO 的难点不是 API，而是事件循环、半包/粘包和缓冲区翻转；生产项目通常直接用 Netty。',
        quiz: [
          { q: 'Selector 的作用是？', options: ['加密数据', '用一个线程监听多个 Channel 的事件', '压缩文件', '解析 JSON'], answer: 1, explain: 'Selector 多路复用，让单线程管理多个非阻塞连接。' },
          { q: 'Buffer 的 flip() 做了什么？', options: ['扩容', '把 limit 设为 position，position 归零，准备读', '清空数据', '关闭通道'], answer: 1, explain: '写完数据要 flip 切换为读模式；读完 clear/compact 才能继续写。' },
          { q: 'NIO 更适合哪种场景？', options: ['连接少、数据量大的文件复制', '连接多、每连接数据量小的服务', '纯 CPU 计算', '单机命令行工具'], answer: 1, explain: 'NIO 的优势在高并发连接；大文件顺序读写用 FileChannel 也可以，但选择要看场景。' }
        ]
      })
    ]
  });

  C.push({
    id: 'm16', no: '16', title: '安全与加密', desc: '哈希、加密、HTTPS 与 Web 漏洞',
    lessons: [
      L({
        id: 'security-basics', title: '编码、哈希与密码存储', minutes: 8, level: '进阶',
        intro: 'Base64 不是加密，哈希不可逆，密码不能明文存。分清这三件事，是后端安全的第一课。',
        points: [
          { t: '编码', d: 'Base64、URL 编码只是把数据换成另一种表示，可逆，不提供任何保密性。' },
          { t: '哈希', d: 'MD5/SHA-256 把任意长度输入变成固定长度摘要，不可逆；相同输入结果相同，用于校验完整性。' },
          { t: '加盐与慢哈希', d: '密码存储要加随机盐，并用 bcrypt/Argon2 这类慢哈希，增加暴力破解成本。' },
          { t: '不要自己造', d: '不要自己设计加密算法或写随机数；用 JDK/框架提供的标准实现。' }
        ],
        code: `MessageDigest md = MessageDigest.getInstance("SHA-256");\nbyte[] digest = md.digest((salt + password).getBytes(StandardCharsets.UTF_8));\nString stored = Base64.getEncoder().encodeToString(digest);\n\n// 更推荐：BCryptPasswordEncoder\n// String hash = encoder.encode(rawPassword);\n// boolean ok = encoder.matches(rawPassword, hash);`,
        tip: '看到“密码用 MD5 存”就要警惕：没有盐、太快， rainbow table 一查就出。',
        quiz: [
          { q: 'Base64 的性质是？', options: ['不可逆加密', '可逆编码，不提供保密性', '哈希算法', '数字签名'], answer: 1, explain: 'Base64 只是编码，任何人都能解码，不能用来保护秘密。' },
          { q: '密码存储最推荐的做法是？', options: ['明文', 'MD5 不加盐', 'bcrypt/Argon2 加盐慢哈希', 'Base64'], answer: 2, explain: '慢哈希 + 随机盐能显著提高离线爆破成本；MD5 太快且无盐。' },
          { q: '哈希函数的核心特性不包括？', options: ['不可逆', '相同输入相同输出', '可解密还原', '雪崩效应'], answer: 2, explain: '哈希是单向的，不能解密还原；加密才是可逆的。' }
        ]
      }),
      L({
        id: 'crypto', title: '对称加密、非对称加密与签名', minutes: 10, level: '进阶',
        intro: '对称加密快但密钥分发难，非对称加密解决密钥交换但慢。真实系统通常两者结合，再用签名保证来源和完整性。',
        points: [
          { t: '对称加密', d: 'AES 用同一把密钥加密解密，速度快；推荐 GCM 模式，自带完整性校验。' },
          { t: '非对称加密', d: 'RSA/EC 用公钥加密、私钥解密（或反过来签名），解决密钥分发，但速度慢。' },
          { t: '混合加密', d: '用非对称加密传递一次性对称密钥，再用对称密钥加密大量数据，这就是 TLS 的思路。' },
          { t: '数字签名', d: '私钥签名、公钥验签，保证消息未被篡改且来自持有私钥的一方。' }
        ],
        code: `KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");\ngen.initialize(2048);\nKeyPair pair = gen.generateKeyPair();\n\nSignature signer = Signature.getInstance("SHA256withRSA");\nsigner.initSign(pair.getPrivate());\nsigner.update(data);\nbyte[] signature = signer.sign();\n\nsigner.initVerify(pair.getPublic());\nsigner.update(data);\nboolean ok = signer.verify(signature);`,
        tip: '加密保护机密性，签名保护完整性和身份；不要用同一把密钥既加密又签名。',
        quiz: [
          { q: 'AES 属于？', options: ['非对称加密', '对称加密', '哈希', '编码'], answer: 1, explain: 'AES 用同一把密钥加解密，属于对称加密。' },
          { q: '数字签名通常用哪把密钥签名？', options: ['公钥', '私钥', '会话密钥', '随机盐'], answer: 1, explain: '私钥签名、公钥验签；私钥必须保密。' },
          { q: 'TLS 为什么采用混合加密？', options: ['对称加密不能加密数据', '非对称加密太慢，只用来协商对称密钥', '哈希不能校验', '为了增加密钥长度'], answer: 1, explain: '非对称加密安全但慢，只用于密钥交换；大量数据用对称加密。' }
        ]
      }),
      L({
        id: 'web-security', title: 'HTTPS 与常见 Web 漏洞', minutes: 10, level: '进阶',
        intro: 'HTTPS 解决传输安全，但解决不了业务漏洞。SQL 注入、XSS、CSRF、越权，仍然是后端最常见的安全问题。',
        points: [
          { t: 'HTTPS/TLS', d: '证书验证服务器身份，TLS 协商会话密钥并加密传输；没有 HTTPS，密码和令牌在网络上是明文。' },
          { t: 'SQL 注入', d: '拼接 SQL 会让输入变成语法；用 PreparedStatement 参数绑定，输入只作为值。' },
          { t: 'XSS 与 CSRF', d: 'XSS 是页面执行了攻击者的脚本；CSRF 是借用户已登录的 Cookie 发起请求。输出转义、HttpOnly、CSRF Token、SameSite 都是防线。' },
          { t: '越权', d: '接口只校验“已登录”不校验“是否有权访问这条数据”，会导致水平/垂直越权。每次访问资源都要校验归属和角色。' }
        ],
        code: `// 错误：拼接 SQL\n// "SELECT * FROM user WHERE name = '" + input + "'"\n\n// 正确：参数绑定\nString sql = "SELECT id, name FROM user WHERE name = ?";\ntry (PreparedStatement ps = conn.prepareStatement(sql)) {\n    ps.setString(1, input);\n    try (ResultSet rs = ps.executeQuery()) { /* ... */ }\n}`,
        tip: '安全是每一层的事：传输用 HTTPS，SQL 用参数，页面做转义，接口做鉴权。',
        quiz: [
          { q: '防止 SQL 注入最有效的手段是？', options: ['过滤单引号', 'PreparedStatement 参数绑定', '把 SQL 写长一点', '关闭错误回显'], answer: 1, explain: '参数绑定让输入永远只是值，不参与 SQL 语法解析。' },
          { q: 'CSRF 攻击利用的是？', options: ['服务器漏洞', '用户已登录的 Cookie 自动携带', '数据库索引', '弱密码'], answer: 1, explain: '浏览器会自动带上目标站点的 Cookie，攻击者诱导用户发起请求。' },
          { q: '水平越权指的是？', options: ['普通用户访问管理员接口', '用户 A 访问用户 B 的数据', '跨站脚本', 'SQL 注入'], answer: 1, explain: '水平越权是同级别用户之间的数据越界；垂直越权是低权限访问高权限功能。' }
        ]
      })
    ]
  });

  C.push({
    id: 'm17', no: '17', title: 'Spring AOP 与 Security', desc: '切面、代理、认证与授权',
    lessons: [
      L({
        id: 'spring-aop', title: 'Spring AOP 与动态代理', minutes: 9, level: '进阶',
        intro: '日志、事务、权限这些横切逻辑不该散落在每个业务方法里。AOP 通过代理在方法前后织入增强，让业务代码保持干净。',
        points: [
          { t: '术语', d: '切面 Aspect、切点 Pointcut、通知 Advice（Before/After/Around/AfterThrowing）。' },
          { t: '代理', d: 'JDK 动态代理基于接口，CGLIB 基于继承；Spring 默认按目标类是否实现接口选择。' },
          { t: '自调用失效', d: '同类内部 <code>this.method()</code> 不经过代理，@Transactional/@Cacheable 等增强不会生效。' },
          { t: '事务关系', d: 'Spring 事务本质就是 AOP：开启事务、执行业务、提交/回滚。' }
        ],
        code: `@Aspect\n@Component\npublic class LogAspect {\n    @Around("execution(* com.example.service.*.*(..))")\n    public Object log(ProceedingJoinPoint pjp) throws Throwable {\n        long start = System.currentTimeMillis();\n        try {\n            return pjp.proceed();\n        } finally {\n            System.out.println(pjp.getSignature() + " 耗时 " +\n                    (System.currentTimeMillis() - start) + "ms");\n        }\n    }\n}`,
        tip: 'AOP 是代理模式的应用；理解代理边界，就能解释“为什么事务/缓存有时不生效”。',
        quiz: [
          { q: 'Spring AOP 默认用什么方式创建代理？', options: ['只能 CGLIB', '有接口用 JDK 代理，否则 CGLIB', '只能 JDK 代理', '字节码插桩'], answer: 1, explain: '目标类实现接口时用 JDK 动态代理，否则用 CGLIB 子类代理。' },
          { q: '同类内部调用 @Transactional 方法，事务可能失效的原因是？', options: ['方法不是 public', '自调用不经过代理', '数据库不支持事务', '没有加 @EnableTransactionManagement'], answer: 1, explain: 'this 调用绕过代理，事务增强没有机会执行；这是最经典的原因。' },
          { q: '@Around 通知相比 @Before 的优势是？', options: ['可以修改返回值、决定是否执行目标方法', '性能更高', '不需要切点', '只能用于事务'], answer: 0, explain: 'Around 包裹目标方法，可以控制执行、修改参数和返回值。' }
        ]
      }),
      L({
        id: 'spring-security', title: 'Spring Security 认证与授权', minutes: 10, level: '进阶',
        intro: 'Spring Security 用一条过滤器链处理登录、会话、权限。理解 Authentication 与 Authorization 的区别，才能排查 401/403。',
        points: [
          { t: '过滤器链', d: '请求先经过 SecurityFilterChain，再进入 Controller；认证失败 401，授权失败 403。' },
          { t: '认证', d: 'AuthenticationManager 校验用户名密码，成功后把 Authentication 放入 SecurityContext。' },
          { t: '授权', d: '用 <code>authorizeHttpRequests</code> 配置路径和角色；方法级用 <code>@PreAuthorize</code>。' },
          { t: 'JWT 与密码', d: '前后端分离常用 JWT；密码用 <code>BCryptPasswordEncoder</code> 存储，不要明文。' }
        ],
        code: `@Bean\nSecurityFilterChain chain(HttpSecurity http) throws Exception {\n    http.csrf(csrf -> csrf.disable())\n        .authorizeHttpRequests(auth -> auth\n            .requestMatchers("/api/public/**").permitAll()\n            .requestMatchers("/api/admin/**").hasRole("ADMIN")\n            .anyRequest().authenticated())\n        .httpBasic(Customizer.withDefaults());\n    return http.build();\n}`,
        tip: '401 是“你是谁不清楚”，403 是“知道你是谁，但你没权限”；排查时先分清。',
        quiz: [
          { q: 'Spring Security 中认证失败通常返回？', options: ['403', '401', '404', '500'], answer: 1, explain: '401 Unauthorized 表示未认证；403 Forbidden 表示已认证但无权限。' },
          { q: '密码编码器推荐使用？', options: ['MD5', 'BCryptPasswordEncoder', 'Base64', '明文'], answer: 1, explain: 'BCrypt 加盐且慢，适合密码存储；MD5/Base64 都不安全。' },
          { q: '方法级权限控制常用哪个注解？', options: ['@PreAuthorize', '@RequestMapping', '@Transactional', '@Bean'], answer: 0, explain: '@PreAuthorize 在方法调用前做表达式鉴权。' }
        ]
      })
    ]
  });

  C.push({
    id: 'm18', no: '18', title: '数据库进阶', desc: '索引、事务与优化',
    lessons: [
      L({
        id: 'db-index', title: '索引、B+ 树与执行计划', minutes: 10, level: '进阶',
        intro: '索引让查询从全表扫描变成定位，但建错索引会让写入变慢、查询依旧慢。理解 B+ 树和执行计划，才能判断索引是否生效。',
        points: [
          { t: 'B+ 树', d: '非叶子节点只存键，叶子节点存数据并用链表相连，适合范围查询；高度通常 3~4 层。' },
          { t: '聚簇与二级索引', d: 'InnoDB 主键是聚簇索引，叶子存整行；二级索引叶子存主键，查非索引列要回表。' },
          { t: '联合索引', d: '遵循最左前缀：INDEX(a,b,c) 能用于 a、a+b、a+b+c，不能跳过 a 直接用 b。' },
          { t: 'EXPLAIN', d: '看 type（ALL 最差）、key（实际索引）、rows（预估行数）、Extra（Using index 表示覆盖索引）。' }
        ],
        code: `EXPLAIN SELECT id, title, price\nFROM book\nWHERE author = 'Tom' AND price > 50\nORDER BY price DESC;\n\nCREATE INDEX idx_author_price ON book(author, price);`,
        codeTitle: 'index.sql',
        tip: '索引不是越多越好：每个索引都会拖慢 INSERT/UPDATE，并占用空间。',
        quiz: [
          { q: '联合索引 (a,b,c) 能直接用于只查 b 的查询吗？', options: ['能，自动匹配', '不能，违反最左前缀', '能，但必须加 hint', '取决于数据量'], answer: 1, explain: '联合索引按 a、b、c 顺序组织，跳过 a 无法直接定位 b。' },
          { q: 'EXPLAIN 的 type 为 ALL 表示？', options: ['使用主键', '全表扫描', '覆盖索引', '索引合并'], answer: 1, explain: 'ALL 是全表扫描，通常需要加索引或改写查询。' },
          { q: '覆盖索引的含义是？', options: ['索引覆盖了所有表', '查询需要的列都在索引里，不需要回表', '索引比表大', '只能用于主键'], answer: 1, explain: '查询列全部能从二级索引拿到，避免回表，Extra 会显示 Using index。' }
        ]
      }),
      L({
        id: 'db-lock', title: '事务隔离、MVCC 与锁', minutes: 10, level: '进阶',
        intro: '事务隔离级别决定并发读写能看到什么，MVCC 让读不加锁，行锁和间隙锁保证写的一致性。理解这些，才能解释死锁和幻读。',
        points: [
          { t: '隔离级别', d: '读未提交、读已提交、可重复读（MySQL 默认）、串行化；级别越高一致性越强、并发越低。' },
          { t: 'MVCC', d: '每行有隐藏的版本信息，读操作根据 Read View 判断可见版本，实现“读不加锁”。' },
          { t: '锁', d: 'InnoDB 有行锁、间隙锁、临键锁；没有索引的更新可能退化成表锁。' },
          { t: '死锁', d: '两个事务互相等待对方持有的锁；数据库会检测并回滚一个，应用要能重试。' }
        ],
        code: `START TRANSACTION;\nSELECT * FROM account WHERE id = 1 FOR UPDATE;\nUPDATE account SET balance = balance - 100 WHERE id = 1;\nUPDATE account SET balance = balance + 100 WHERE id = 2;\nCOMMIT;`,
        codeTitle: 'lock.sql',
        tip: '事务要短、更新顺序要一致、WHERE 要走索引；这三点能避免大部分锁问题。',
        quiz: [
          { q: 'MySQL InnoDB 默认隔离级别是？', options: ['读未提交', '读已提交', '可重复读', '串行化'], answer: 2, explain: 'InnoDB 默认 REPEATABLE READ，通过 MVCC + 间隙锁处理幻读。' },
          { q: 'MVCC 主要解决什么问题？', options: ['让读不加锁也能看到一致快照', '加密数据', '压缩表', '加快写入'], answer: 0, explain: 'MVCC 用版本链和 Read View 实现一致性读，读写不互相阻塞。' },
          { q: 'UPDATE 的 WHERE 没有索引，可能发生？', options: ['只锁一行', '退化为表锁，阻塞其他写入', '自动加索引', '事务失效'], answer: 1, explain: '没有索引无法定位行，InnoDB 可能锁住大量行甚至整表。' }
        ]
      }),
      L({
        id: 'db-optimization', title: '慢查询、分页与数据库优化', minutes: 10, level: '进阶',
        intro: '优化不是背参数：先用慢查询日志找到最慢的 SQL，再看执行计划，最后才考虑索引、SQL 改写、缓存或分库分表。',
        points: [
          { t: '定位', d: '开启 slow_query_log，按耗时排序；用 EXPLAIN 看扫描行数和索引使用。' },
          { t: '深分页', d: '<code>LIMIT 100000, 20</code> 会扫描并丢弃前 10 万行；用“记住上一页最大 id”的 keyset 分页。' },
          { t: '批量与连接池', d: '批量插入用 addBatch/executeBatch；连接池配置最大连接数、超时和泄漏检测。' },
          { t: '分库分表', d: '单表过大再考虑；优先做索引、归档、读写分离，分片会带来事务和跨库查询复杂度。' }
        ],
        code: `-- 深分页：慢\nSELECT * FROM orders ORDER BY id LIMIT 100000, 20;\n\n-- keyset：快\nSELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;\n\n-- 批量\nINSERT INTO book(title, price) VALUES\n('A', 10), ('B', 20), ('C', 30);`,
        codeTitle: 'optimize.sql',
        tip: '先测量再优化：没有慢查询日志和执行计划，调参基本靠猜。',
        quiz: [
          { q: '深分页慢的主要原因是？', options: ['LIMIT 语法慢', '要扫描并丢弃 offset 之前的大量行', '排序字段没有类型', '数据库版本低'], answer: 1, explain: 'offset 越大，扫描丢弃的行越多；keyset 分页用上一页最大 id 定位。' },
          { q: '优化 SQL 的第一步应该是？', options: ['加索引', '看慢查询日志和执行计划', '分库分表', '换数据库'], answer: 1, explain: '先定位哪条 SQL 慢、为什么慢，再决定索引或改写。' },
          { q: '分库分表最大的代价是？', options: ['查询变快', '跨库事务、JOIN 和运维复杂度上升', '索引消失', '不能备份'], answer: 1, explain: '分片解决容量和写入，但会牺牲事务、关联查询和运维简单性。' }
        ]
      })
    ]
  });

  C.push({
    id: 'm19', no: '19', title: 'Redis 与消息队列（选修）', desc: '缓存、分布式锁与异步解耦',
    lessons: [
      L({
        id: 'redis', title: 'Redis 缓存与分布式锁', minutes: 9, level: '进阶',
        intro: 'Redis 把数据放在内存里，读写极快，常用于缓存、计数、排行榜和分布式锁。但缓存会带来穿透、击穿、雪崩和一致性问题。',
        points: [
          { t: '数据结构', d: 'String、Hash、List、Set、ZSet；ZSet 适合排行榜，Hash 适合存对象字段。' },
          { t: '缓存三坑', d: '穿透（查不存在的数据）、击穿（热点 key 过期）、雪崩（大量 key 同时过期）。' },
          { t: '过期与淘汰', d: '设置 TTL；内存满时按 maxmemory-policy 淘汰，常见 allkeys-lru。' },
          { t: '分布式锁', d: 'SET key value NX PX，value 用唯一标识，释放时用 Lua 校验，避免误删别人的锁。' }
        ],
        code: `// Spring Data Redis\nredisTemplate.opsForValue().set("book:1", json, Duration.ofMinutes(10));\nString cached = redisTemplate.opsForValue().get("book:1");\n\n// 分布式锁\nBoolean ok = redisTemplate.opsForValue()\n        .setIfAbsent("lock:order:1", uuid, Duration.ofSeconds(30));`,
        tip: '缓存一致性优先“先更新数据库，再删除缓存”，并接受短暂不一致；不要幻想强一致。',
        quiz: [
          { q: '缓存穿透指的是？', options: ['热点 key 过期', '大量 key 同时过期', '查询不存在的数据，请求打到数据库', '缓存雪崩'], answer: 2, explain: '穿透是查不存在的数据，缓存永远不命中；可用空值缓存或布隆过滤器。' },
          { q: '分布式锁释放时为什么要用 Lua？', options: ['提高速度', '保证“判断 value + 删除”原子执行，避免误删', '压缩数据', '加密锁'], answer: 1, explain: '不加原子校验，可能删掉锁过期后别人加的锁。' },
          { q: 'ZSet 最适合的场景是？', options: ['存对象字段', '排行榜', '消息队列', '布隆过滤器'], answer: 1, explain: 'ZSet 按 score 排序，天然适合排行榜和延时队列。' }
        ]
      }),
      L({
        id: 'message-queue', title: '消息队列：解耦、削峰与幂等', minutes: 9, level: '进阶',
        intro: '消息队列把“立即处理”变成“排队处理”，用于解耦、削峰和异步。但引入 MQ 也带来重复消费、顺序和积压问题。',
        points: [
          { t: '模型', d: '生产者 → Topic/Queue → 消费者；消费者组内竞争，组间广播。' },
          { t: 'Kafka 与 RabbitMQ', d: 'Kafka 高吞吐、分区顺序、适合日志/流；RabbitMQ 路由灵活、延迟低，适合业务消息。' },
          { t: '幂等', d: '网络重试会导致重复消费；用业务唯一键 + 去重表/Redis 保证只处理一次。' },
          { t: '顺序与积压', d: '同一分区内有序；消费慢会积压，要监控 lag、扩容消费者或优化处理逻辑。' }
        ],
        code: `// Kafka 生产者（Spring Kafka）\nkafkaTemplate.send("order-created", orderId, json);\n\n// 消费者\n@KafkaListener(topics = "order-created", groupId = "inventory")\npublic void onOrder(String orderId, String json) {\n    if (dedup.exists(orderId)) return;   // 幂等\n    inventoryService.deduct(json);\n    dedup.mark(orderId);\n}`,
        tip: 'MQ 只保证“至少一次”很常见，消费端必须幂等；不要假设消息只来一次。',
        quiz: [
          { q: '消息队列的主要作用不包括？', options: ['解耦', '削峰', '异步', '保证数据库事务'], answer: 3, explain: 'MQ 用于解耦、削峰、异步；它不能替代数据库事务。' },
          { q: '消费者幂等的常见实现是？', options: ['每次重启', '业务唯一键 + 去重表/Redis', '增加分区', '关闭重试'], answer: 1, explain: '用唯一业务键记录已处理，重复消息直接跳过。' },
          { q: 'Kafka 同一分区内的消息？', options: ['完全无序', '按写入顺序有序', '按大小排序', '随机'], answer: 1, explain: '分区内有序，跨分区不保证全局顺序。' }
        ]
      })
    ]
  });
})();
