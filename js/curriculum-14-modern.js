/* 模块 14：现代 Java 与 AI 工程（Java 21–25 / 虚拟线程 / Boot 4 / Testcontainers / Spring AI / MCP / 可观测性 / AI 质量闸） */
(function () {
  'use strict';
  var C = window.JAVA_COURSE || (window.JAVA_COURSE = []);

  function L(o) { return o; }

  var modern = {
    id: 'm14', no: '14', title: '现代 Java 与 AI 工程',
    desc: 'Java 21–25 语言增量、虚拟线程选型、Boot 4 迁移、Testcontainers、Spring AI、MCP、可观测性与 AI 质量闸',
    lessons: [
      L({
        id: 'modern-lts', title: 'Java 21–25 语言演进与 LTS 迁移', minutes: 40, level: '进阶',
        intro: '2026 年写 Java，版本判断已经从“用 8 还是用 17”变成“21 还是 25”。这一课把 21 到 25 之间真正会写进业务代码的语言变化挑出来，并给出 8/11/17/21 四条旧版本的升级路径。',
        points: [
          { t: 'LTS 节奏', d: 'LTS 每两年一个：17（2021-09）、21（2023-09）、25（2025-09），下一个是 27（2027-09）；中间的功能版本每半年一个，只有 6 个月支持。' },
          { t: '模式匹配转正', d: 'record 模式（JEP 440）与 switch 模式匹配（JEP 441）在 21 转正，配合 sealed 接口可以做穷尽性的类型分派。' },
          { t: '未命名变量 _', d: 'JEP 456（22 转正）：catch 变量、lambda 参数、for-each 变量、record 解构里用不到的成分都可以写成 <code>_</code>，表达“我知道它存在，但不用”。' },
          { t: 'Gatherers', d: 'JEP 485（24 转正）：<code>Stream.gather()</code> 让自定义中间操作成为一等公民，滑动窗口、去重保序、分批这类需求不必再绕道 collector。' },
          { t: 'FFM 转正', d: 'JEP 454（22 转正）：<code>java.lang.foreign</code> 用纯 Java 调用 C 函数，替代 JNI 的胶水代码，配合 <code>--enable-native-access</code> 使用。' }
        ],
        code: 'sealed interface Shape permits Circle, Rect {}\nrecord Circle(double r) implements Shape {}\nrecord Rect(double w, double h) implements Shape {}\n\nstatic double area(Shape s) {\n    return switch (s) {                             // switch 模式匹配（21 转正）\n        case Circle c -> Math.PI * c.r() * c.r();    // record 模式直接解构\n        case Rect r   -> r.w() * r.h();\n    };\n}\n\n// 未命名变量：只关心异常类型，不关心对象\ntry (var in = Files.newBufferedReader(path)) {\n    return in.readLine();\n} catch (IOException _) {\n    return \"<读取失败>\";\n}',
        tip: '升级顺序先定 JDK 再定框架：JDK 25 是当前 LTS，先把 CI 的 toolchain 和运行时镜像换过去，再谈语法迁移。',
        demo: { title: '版本身份证', steps: ['java -version', 'javac -version', 'java --list-modules | head'] },
        guide: {
          goals: ['说清 8/11/17/21/25 的支持状态与升级顺序', '用 switch 模式匹配加 sealed 接口替掉 instanceof 链', '判断一个 21+ 特性在你的项目里能不能直接用（转正还是预览）'],
          pitfalls: ['把预览特性写进生产代码，升级 JDK 时编译直接失败。', '以为 25 是“必须升”，忽略第三方库与容器镜像的兼容窗口。', '只看语法不看 GC 与运行参数，升级后停顿曲线反而变差。'],
          homework: ['把项目里一处 instanceof 强制转换链改写成 switch 模式匹配，并用 sealed 接口保证穷尽。', '用 jdeps 扫一遍依赖，列出升级到 25 之前必须换掉的库（javax.*、老版本 ASM/CGLIB、字节码增强类框架）。']
        },
        quiz: [
          { q: '2026 年当前的 Java LTS 版本是？', options: ['Java 21', 'Java 23', 'Java 25', 'Java 27'], answer: 2, explain: '25 于 2025-09 发布成为 LTS；21 是上一代 LTS，下一个 LTS 是 2027-09 的 27。' },
          { q: 'Stream Gatherers（JEP 485）解决的是哪类问题？', options: ['并行流的线程调度', '自定义 Stream 中间操作', 'HTTP 客户端连接池', '模块化打包'], answer: 1, explain: 'Gatherers 通过 Stream.gather() 支持有状态、可短路的自定义中间操作，如滑动窗口与去重保序。' },
          { q: 'FFM API（JEP 454）主要用于替代？', options: ['JNI', 'JDBC', 'JMX', 'JMS'], answer: 0, explain: 'java.lang.foreign 提供纯 Java 的本地函数调用与内存访问，替代需要写 C 胶水的 JNI。' }
        ]
      }),
      L({
        id: 'virtual-threads', title: '虚拟线程落地与并发选型', minutes: 45, level: '高级',
        intro: '虚拟线程把“一个请求一个线程”的写法重新变成合理选择，但它只降低线程成本，不降低数据库、连接池和下游服务的成本。这一课讲清楚哪些地方该用、哪些地方用了反而更糟。',
        points: [
          { t: '成本结构', d: '虚拟线程由 JVM 调度到少量载体线程（ForkJoinPool），阻塞时卸载栈；平台的线程栈是 MB 级，虚拟线程栈是 KB 级可增长堆对象。' },
          { t: 'pinning', d: '21–23 里 synchronized 块内的阻塞会钉住载体线程；JEP 491 在 24 转正，synchronized 不再钉住，只剩本地方法调用与少数场景仍会钉住。' },
          { t: '不要池化', d: '虚拟线程创建成本极低，应为每个任务新建（<code>Executors.newVirtualThreadPerTaskExecutor()</code>），池化只会把并发度重新锁死。' },
          { t: 'ScopedValue', d: 'JEP 506 在 25 转正：不可变、随作用域自动释放，替代 ThreadLocal 在虚拟线程下“继承副本 + 忘记 remove 泄漏”的老问题。' },
          { t: '真实瓶颈', d: '虚拟线程放大的是并发请求数，数据库连接数、下游 QPS 限额不会跟着放大，必须靠信号量、限流和有界队列兜住。' }
        ],
        code: '// 每个任务一个虚拟线程，不要池化\ntry (var pool = Executors.newVirtualThreadPerTaskExecutor()) {\n    for (int i = 0; i < 10_000; i++) {\n        pool.submit(() -> {\n            Thread.sleep(1_000);          // 阻塞时自动卸载载体线程\n            return null;\n        });\n    }\n}\n\n// 用信号量给下游“真正的”并发上限\nvar permits = new Semaphore(20);\nboolean ok = permits.tryAcquire();   // 拿不到就直接降级，不要无限排队',
        tip: '虚拟线程解决的是“线程不够”，不是“下游扛不住”；上线前先给连接池和下游 QPS 算一遍上限。',
        demo: { title: '观察载体线程', steps: ['-Djdk.virtualThreadScheduler.parallelism=2', '打印 Thread.currentThread()', '对比平台线程的线程名'] },
        guide: {
          goals: ['解释虚拟线程与平台线程的成本差异与调度方式', '判断一段阻塞代码在 24+ 上还会不会 pinning 载体线程', '给数据库连接池和下游限流算出与虚拟线程匹配的上限'],
          pitfalls: ['给虚拟线程套一个固定大小的线程池，并发度被打回原形。', '忽略 synchronized 与本地方法造成的 pinning，吞吐卡在载体线程数上。', '以为开了虚拟线程就不用限流，结果把下游打挂。'],
          homework: ['写一个 10000 个虚拟线程各阻塞 1 秒的 demo，分别用 2 个和 8 个载体线程跑，记录总耗时并解释差异。', '把项目里一个 ThreadLocal 上下文改成 ScopedValue（预览或 25 正式版），确认子线程能读到值且作用域结束后不可见。']
        },
        quiz: [
          { q: '在 JDK 24 及以后，哪一项不再钉住（pin）载体线程？', options: ['synchronized 块里的阻塞', '本地方法调用', '类初始化时的阻塞', '持有监视器时调用 native 方法'], answer: 0, explain: 'JEP 491 让 synchronized 不再钉住载体线程；本地方法调用仍然会钉住。' },
          { q: '虚拟线程场景下，数据库连接池应该怎么配？', options: ['和虚拟线程数一样大', '保持较小的固定上限，用信号量或限流保护', '完全去掉连接池', '每个请求单独建连接'], answer: 1, explain: '连接数是数据库侧的硬上限，虚拟线程再多也不能放大它；应保持小池并用信号量兜住并发。' },
          { q: '为什么不应该把虚拟线程放进固定大小的池？', options: ['虚拟线程不能被池化', '池化会把并发度重新限制为池大小，浪费虚拟线程的低成本特性', '池会破坏 ThreadLocal', '池会让 GC 失效'], answer: 1, explain: '虚拟线程创建成本极低，池化等于把并发度锁死在池容量上，失去意义。' }
        ]
      }),
      L({
        id: 'boot4-migration', title: 'Spring Boot 4 / Framework 7 迁移', minutes: 40, level: '进阶',
        intro: 'Spring Boot 4.0 已于 2025-11-20 GA，底层是 Spring Framework 7。它不是一次换皮升级：基线 JDK、HTTP 客户端、空安全注解、模块拆分和一批移除的 API 都会同时压过来。',
        points: [
          { t: '基线变化', d: 'Boot 4 / Framework 7 基线是 JDK 17+，同时把 Jakarta EE 11、Servlet 6.1、JSpecify 空安全作为默认前提。' },
          { t: 'HTTP 客户端', d: '新代码用 <code>RestClient</code>（同步流式 API）或 <code>@HttpExchange</code> 声明式接口客户端，RestTemplate 进入维护模式。' },
          { t: '声明式客户端', d: 'Framework 7 提供 <code>@ImportHttpServices</code>，把 <code>@HttpExchange</code> 接口直接注册成 Bean，不必手写 HttpServiceProxyFactory。' },
          { t: '空安全', d: 'Spring 自己的 @Nullable/@NonNull 让位给 JSpecify 的 @NullMarked / @Nullable，编译期就能发现空指针风险。' },
          { t: '模块化', d: 'Boot 4 把巨型 autoconfigure 拆成按技术划分的模块，starter 依赖图更细，也更容易踩到“缺一个模块导致自动配置不生效”。' }
        ],
        code: '// 声明式 HTTP 客户端（Framework 7）\n@HttpExchange(url = \"/books\", accept = \"application/json\")\npublic interface BookClient {\n    @GetExchange(\"/{id}\")\n    Book findById(@PathVariable long id);\n}\n\n@Configuration\n@ImportHttpServices(group = \"books\", types = BookClient.class)\nclass ClientConfig {\n    @Bean\n    RestClientHttpServiceGroupConfigurer groupConfigurer() {\n        return groups -> groups.filterByName(\"books\")\n                .forEachClient((name, builder) -> builder.baseUrl(\"https://api.example.com\"));\n    }\n}',
        tip: '迁移先跑 3.x 的最新小版本，把弃用警告清零，再升 4.0；直接跳版本会把“弃用”和“移除”混在一起定位。',
        demo: { title: '迁移体检', steps: ['mvn -U dependency:tree', './mvnw spring-boot:run', '打开 /actuator/conditions'] },
        guide: {
          goals: ['列出 Boot 3.x 升 4.0 的必改项与可延后项', '用 RestClient 与 @HttpExchange 替换现有 RestTemplate 调用', '用 JSpecify 注解表达接口的空约束并让编译期检查生效'],
          pitfalls: ['跳过 3.x 最后一个版本，直接面对成百上千条移除 API 报错。', '把 RestTemplate 留在新代码里，后续还要再改一遍。', '以为 @NullMarked 加了就万事大吉，却没给包级加注解。'],
          homework: ['把一个 RestTemplate 调用改写成 RestClient，再改写成 @HttpExchange 接口，比较三者的代码量与可测性。', '在项目里选一个包加 @NullMarked，修掉编译器报出的空安全问题并记录数量。']
        },
        quiz: [
          { q: 'Spring Boot 4.0 的 GA 时间是？', options: ['2024-11-21', '2025-05-20', '2025-11-20', '2026-03-01'], answer: 2, explain: 'Boot 4.0 于 2025-11-20 GA，对应 Spring Framework 7。' },
          { q: 'Boot 4 中官方推荐用来替代 RestTemplate 的是？', options: ['WebClient 与 RestClient', 'HttpURLConnection', 'Apache HttpClient 4', 'OkHttp'], answer: 0, explain: '同步场景用 RestClient，响应式继续用 WebClient，声明式用 @HttpExchange。' },
          { q: 'Framework 7 采用的空安全注解标准是？', options: ['JSR-305', 'JSpecify', 'JetBrains Annotations', 'Eclipse JDT'], answer: 1, explain: 'Framework 7 全面改用 JSpecify 的 @NullMarked/@Nullable，编译期与静态分析都能识别。' }
        ]
      }),
      L({
        id: 'testcontainers', title: 'Testcontainers 与数据库迁移脚本', minutes: 35, level: '进阶',
        intro: '单元测试用 H2 图快，但 SQL 方言、锁行为和扩展函数一换库就露馅。Testcontainers 让集成测试跑在真正的 PostgreSQL 上，配合迁移脚本才能验证“上线那一刻会发生什么”。',
        points: [
          { t: '基本装配', d: '<code>@Testcontainers</code> 管生命周期，<code>@Container</code> 标字段，容器在测试类前后自动启停。' },
          { t: '零配置接入', d: 'Boot 3.1+ 的 <code>@ServiceConnection</code> 直接把容器的连接信息注册成 DataSource，不必再写 @DynamicPropertySource。' },
          { t: '迁移脚本', d: 'Flyway 的 <code>V1__init.sql</code> 与 Liquibase 的 changelog 应在测试启动时就跑一遍，验证“空库到最新版本”这条路径。' },
          { t: 'H2 的定位', d: 'H2 只适合冒烟与快速反馈，兼容模式也补不齐 JSONB、数组、窗口函数、序列与隔离级别的差异。' },
          { t: 'CI 成本', d: 'CI 里必须有 Docker（或 Testcontainers Cloud），镜像要预热、启动要有超时与重试，否则流水线会随机红。' }
        ],
        code: '@SpringBootTest\n@Testcontainers\nclass OrderRepositoryTest {\n\n    @Container\n    @ServiceConnection                       // 自动装配 DataSource\n    static PostgreSQLContainer<?> pg =\n            new PostgreSQLContainer<>(\"postgres:16-alpine\")\n                    .withStartupTimeout(Duration.ofSeconds(90));\n\n    @Autowired OrderRepository repository;\n\n    @Test\n    void flywayScriptShouldCreateSchema() {\n        assertThat(repository.count()).isZero();\n    }\n}',
        tip: '容器启动超时是 CI 最常见的假失败；把 withStartupTimeout 调大并把镜像预拉到本地，比事后重跑划算。',
        demo: { title: '本地起一个真库', steps: ['docker compose up -d pg', 'mvn -Dtest=OrderRepositoryTest test', 'docker compose down -v'] },
        guide: {
          goals: ['用 @Testcontainers + @ServiceConnection 跑通一个真库集成测试', '判断哪些用例必须上真库、哪些留在 H2 冒烟', '让 Flyway/Liquibase 脚本在测试里真实执行并被校验'],
          pitfalls: ['测试里手写建表 SQL，和迁移脚本两套结构逐渐漂移。', '容器用 latest 标签，某天 CI 拉到的镜像让测试全红。', 'CI 无 Docker 却把集成测试塞进单元测试阶段，流水线长期忽略失败。'],
          homework: ['给现有项目加一个 PostgreSQL 容器的集成测试，断言迁移脚本执行后表结构与索引都存在。', '故意写一个 H2 能过、PostgreSQL 过不去的 SQL（如 ON CONFLICT 或 JSONB 查询），在两种库上各跑一次并记录差异。']
        },
        quiz: [
          { q: '@ServiceConnection 的作用是？', options: ['启动容器', '把容器连接信息自动注册成应用的数据源等 Bean', '生成迁移脚本', '清理 Docker 镜像'], answer: 1, explain: '它把容器暴露的地址、端口、账号注册为对应的 ConnectionDetails，省掉 @DynamicPropertySource。' },
          { q: '为什么 H2 不能替代真库做集成测试？', options: ['H2 性能太差', '方言、类型、锁与隔离级别存在差异，兼容模式补不齐', 'H2 不支持 SQL', 'H2 无法在 CI 运行'], answer: 1, explain: '兼容模式只覆盖语法层，JSONB、数组、窗口函数和锁行为仍与目标库不同。' },
          { q: '测试容器启动超时的常见处理方式是？', options: ['直接删掉测试', '设置 withStartupTimeout 并预热镜像', '改成 H2', '关闭 CI'], answer: 1, explain: 'CI 网络与磁盘慢时启动会超时，显式调大超时并预拉镜像最有效。' }
        ]
      }),
      L({
        id: 'spring-ai', title: 'Spring AI 接入 LLM', minutes: 40, level: '进阶',
        intro: 'Spring AI 把模型调用抽象成可注入的客户端，让“换模型”变成改配置而不是改代码。重点不在调通一次对话，而在提示词、结构化输出、工具调用和 RAG 这几件事怎么落地。',
        points: [
          { t: '统一抽象', d: '<code>ChatClient</code> 提供流式与同步调用，底层 ChatModel 可替换 OpenAI、Anthropic、本地 Ollama 等实现。' },
          { t: '提示词模板', d: '用 <code>.system()</code>/.user() 与模板参数组织提示词，把角色约束、输出格式和少量示例写在系统提示里。' },
          { t: '结构化输出', d: '<code>.entity(Class)</code> 让模型输出映射成 record，失败要有校验与重试，不能直接信任模型返回的 JSON。' },
          { t: 'RAG', d: '文档切分 → 向量化 → 存入向量库 → 检索增强，检索质量取决于切分粒度与召回策略，不是换更大的模型。' },
          { t: '成本与稳定性', d: '设置超时、重试、token 上限与降级策略；把提示词与模型版本一起纳入配置管理，方便回归对比。' }
        ],
        code: '@Service\npublic class SupportService {\n    private final ChatClient chat;\n\n    public SupportService(ChatClient.Builder builder) {\n        this.chat = builder\n                .defaultSystem(\"你是电商客服，只回答订单与退换货问题。\")\n                .build();\n    }\n\n    public Ticket classify(String text) {\n        return chat.prompt()\n                .user(u -> u.text(\"给这段工单打标签：{t}\").param(\"t\", text))\n                .call()\n                .entity(Ticket.class);      // 结构化输出\n    }\n}\nrecord Ticket(String category, String urgency) {}',
        tip: '把模型当成一个不稳定、按 token 计费的外部服务：超时、重试、限流、可回放的提示词版本，一个都不能少。',
        demo: { title: '最小对话链路', steps: ['配置 spring.ai.openai.api-key', '注入 ChatClient.Builder', 'call().content() 打印结果'] },
        guide: {
          goals: ['用 ChatClient 完成一次带系统提示与参数的调用', '把模型输出映射成 record 并处理解析失败', '搭出一条可用的 RAG 检索链路并说明影响召回的因素'],
          pitfalls: ['把 API Key 写进代码或提交进 Git。', '直接信任模型返回的 JSON，解析失败就 500。', '把整份文档塞进上下文，成本和延迟一起爆。'],
          homework: ['写一个分类接口，用 .entity() 输出 record，并故意让模型返回非法内容观察异常与重试。', '用一篇 20 页的文档做切分与检索，比较 200 字与 800 字切分下的召回质量。']
        },
        quiz: [
          { q: 'Spring AI 中用于替代直接操作 ChatModel 的高层 API 是？', options: ['RestTemplate', 'ChatClient', 'JdbcTemplate', 'WebClient'], answer: 1, explain: 'ChatClient 提供流式调用、系统提示、结构化输出与工具调用等高层能力。' },
          { q: 'RAG 的核心流程是？', options: ['把模型换成更大的', '检索相关文档片段后拼进上下文再生成', '把提示词写得更长', '微调模型'], answer: 1, explain: 'RAG 先检索再生成，用外部知识补足模型参数里没有的信息。' },
          { q: '模型返回的结构化输出应该怎么处理？', options: ['直接强转', '用 Schema 约束并做校验与重试', '忽略异常', '永远当成字符串'], answer: 1, explain: '模型输出不保证合法，需要格式约束、校验和失败重试。' }
        ]
      }),
      L({
        id: 'mcp-tools', title: 'MCP 与工具编排', minutes: 35, level: '高级',
        intro: 'MCP（Model Context Protocol）把“模型能用哪些工具、能读哪些数据”标准化成一套客户端与服务端协议。理解它的三类原语和传输方式，才能判断一个工具该由谁来写、怎么限权。',
        points: [
          { t: '三类原语', d: 'tools（可执行动作）、resources（可读上下文）、prompts（可复用提示模板），分别对应“做”“看”“问”。' },
          { t: '传输方式', d: '本地进程用 stdio，远程用可流式 HTTP（早期是 HTTP+SSE）；选错传输会让部署与鉴权变复杂。' },
          { t: '工具契约', d: '名字、描述、输入 Schema 决定模型选不选它；描述含糊的工具几乎不会被正确调用。' },
          { t: '安全边界', d: '工具即权限：读写分离、参数校验、最小授权、审计日志，缺一不可；不要在工具里执行任意 SQL 或 shell。' },
          { t: 'Spring 侧接入', d: '把业务能力包成工具方法注册给模型，用 ToolCallback 描述参数，避免让模型直接拼 HTTP 调用。' }
        ],
        code: '// 一个最小工具定义：名字 + 描述 + 参数 Schema\nToolCallback lookupOrder = FunctionToolCallback.builder(\"lookupOrder\", (OrderQuery q) ->\n                orderService.find(q.orderNo()))\n        .description(\"按订单号查询订单状态，只读，不修改任何数据\")\n        .inputType(OrderQuery.class)\n        .build();\n\n// 编排：把只读工具交给模型，写操作留给人工确认\nChatClient client = builder.defaultTools(lookupOrder).build();',
        tip: '工具描述写得像接口文档，模型才选得对；写操作永远加一道人工确认或二次校验。',
        demo: { title: '本地 MCP 服务', steps: ['启动 stdio 服务端', '客户端 initialize 握手', 'tools/list 查看能力', 'tools/call 执行'] },
        guide: {
          goals: ['区分 MCP 的 tools/resources/prompts 三类原语', '判断场景该用 stdio 还是可流式 HTTP 传输', '为工具设计最小权限与审计方案'],
          pitfalls: ['把数据库连接或 shell 直接暴露成工具，等于给出任意执行权。', '工具描述写成内部黑话，模型永远选不中。', '写操作不做确认，模型一次幻觉就改了生产数据。'],
          homework: ['把一个只读查询包成工具并写清楚描述与参数 Schema，故意问一个模糊问题观察模型是否调用。', '为工具调用加一条审计日志（调用者、参数、耗时、结果摘要），并说明如何据此限权。']
        },
        quiz: [
          { q: 'MCP 的三类核心原语是？', options: ['tools / resources / prompts', 'get / post / put', 'class / object / method', 'query / mutate / watch'], answer: 0, explain: 'tools 是可执行动作，resources 是可读上下文，prompts 是可复用提示模板。' },
          { q: '本地进程式 MCP 服务端常用的传输方式是？', options: ['stdio', 'FTP', 'SMTP', 'UDP 广播'], answer: 0, explain: '本地子进程用标准输入输出通信；远程服务用可流式 HTTP 并配合鉴权。' },
          { q: '把写操作暴露给模型时，最必要的防护是？', options: ['提高温度', '人工确认或二次校验加最小权限', '关闭日志', '换成更大的模型'], answer: 1, explain: '工具即权限，写操作必须有确认、限权与审计，不能依赖模型自觉。' }
        ]
      }),
      L({
        id: 'otel-native', title: '可观测性与原生化部署', minutes: 35, level: '高级',
        intro: '现代 Java 服务的可观测性建立在 OpenTelemetry 的 trace/metrics/logs 三支柱上，而原生化部署则在追问启动时间与内存占用。这一课把两条线并到一起：Micrometer 埋点怎么接 OTel，GraalVM native image 又在哪些地方埋坑。',
        points: [
          { t: '三支柱', d: 'trace 串起一次请求的跨服务路径，metrics 看趋势与容量，logs 定位单点事件；三者靠 traceId 关联。' },
          { t: 'Micrometer 与 OTel', d: 'Boot 用 Micrometer 门面，通过 micrometer-tracing 与 OTLP exporter 上报到 Collector，避免业务代码绑定具体厂商。' },
          { t: '埋点原则', d: '优先自动埋点（HTTP、JDBC、消息），手工 span 只加在业务关键路径上，并控制属性基数。' },
          { t: 'native image', d: 'GraalVM 原生镜像把启动压到几十毫秒、内存显著下降，但反射、动态代理、资源文件需要注册或运行期配置。' },
          { t: '原生化的代价', d: '构建慢、调试难、部分库不兼容；峰值吞吐不一定更好，适合 Serverless 与弹性扩缩场景。' }
        ],
        code: '// 手工 span：只加在业务关键路径上\n@Observed(name = \"order.place\", contextualName = \"place-order\")\npublic Order place(OrderCommand cmd) {\n    return repository.save(Order.from(cmd));\n}\n\n// 上报链路：应用 -> OTLP -> Collector -> 后端\n// application.properties\nmanagement.otlp.tracing.endpoint=http://otel-collector:4318/v1/traces\nmanagement.tracing.sampling.probability=0.1   // 采样率别开 1.0',
        tip: '先把 traceId 打通再谈仪表盘；采样率和属性基数是成本炸掉的两个主要来源。',
        demo: { title: '本地观察链路', steps: ['docker run otel/opentelemetry-collector', '启动应用并打一次请求', '在 Jaeger 里看 span 树'] },
        guide: {
          goals: ['说清 trace/metrics/logs 的分工与关联方式', '用 Micrometer 与 OTLP 把链路接到 Collector', '判断一个服务适不适合做 GraalVM 原生镜像'],
          pitfalls: ['把用户 ID、URL 全量塞进 span 属性，后端存储直接爆。', '采样率 100% 用在生产，成本失控。', '原生镜像里忘记注册反射，运行期才崩。'],
          homework: ['给一个接口加自动埋点与一个手工 span，在 Collector 里确认父子关系与 traceId 关联。', '把一个简单服务编译成 native image，记录启动时间与内存并与 JVM 模式对比。']
        },
        quiz: [
          { q: 'OpenTelemetry 的三类信号是？', options: ['trace / metrics / logs', 'cpu / memory / disk', 'get / set / delete', 'dev / test / prod'], answer: 0, explain: 'trace 看请求路径，metrics 看趋势，logs 看单点事件，三者靠 traceId 关联。' },
          { q: '生产环境设置采样率的合理做法是？', options: ['固定 100%', '按比例采样并对错误请求强制采样', '完全不采样', '只采样慢请求'], answer: 1, explain: '按比例采样控制成本，同时对错误与慢请求强制采样以保留可诊断样本。' },
          { q: 'GraalVM 原生镜像最常见的运行期故障来源是？', options: ['反射与动态代理未注册', 'GC 太慢', '类加载器冲突', '线程数太多'], answer: 0, explain: '原生镜像在构建期做静态分析，反射、代理、资源文件需要显式注册。' }
        ]
      }),
      L({
        id: 'ai-quality-gates', title: 'AI 辅助开发与质量闸', minutes: 30, level: '进阶',
        intro: 'AI 写代码的速度已经超过人工评审的速度，团队真正的瓶颈从“写”变成了“验”。质量闸就是把“什么算通过”提前写成机器可判定的规则，让 AI 的产出必须先过闸再进主干。',
        points: [
          { t: '闸门分层', d: '格式化与静态检查（秒级）→ 单元测试与覆盖率（分钟级）→ 集成与契约测试（十分钟级）→ 人工评审，越贵的闸越靠后。' },
          { t: '可判定的标准', d: '“代码优雅”无法自动判定，“圈复杂度 ≤ 15、变异测试通过率 ≥ 60%”可以；闸门规则必须写成机器能执行的形式。' },
          { t: '测试先行', d: '让 AI 先写失败的测试再写实现，能把“看起来对”变成“跑得过”；对生成的测试本身也要评审断言质量。' },
          { t: '评审重点', d: '人审不再逐行看语法，而是看边界条件、错误处理、并发与安全，以及是否引入了新的依赖。' },
          { t: '可追溯', d: '提交信息、PR 描述、提示词与模型版本都要留痕，出问题时才能复盘是需求错、提示错还是实现错。' }
        ],
        code: '// 质量闸示例：架构约束写成可执行测试\n@AnalyzeClasses(packages = \"com.example\")\nclass ArchitectureTest {\n    @ArchTest\n    static final ArchRule domainMustNotDependOnWeb =\n            noClasses().that().resideInAPackage(\"..domain..\")\n                    .should().dependOnClassesThat().resideInAPackage(\"..web..\");\n\n    @ArchTest\n    static final ArchRule servicesNeedTests =\n            classes().that().haveSimpleNameEndingWith(\"Service\")\n                    .should().bePublic();\n}',
        tip: '闸门要能挡住“看起来对”的代码：覆盖率只能防遗漏，变异测试和契约测试才防假实现。',
        demo: { title: '最小闸门', steps: ['mvn -q spotless:check', 'mvn -q test', 'mvn -q verify -Pintegration'] },
        guide: {
          goals: ['设计一套按成本分层的质量闸', '把模糊的评审意见改写成机器可判定的规则', '建立 AI 产出的留痕与复盘流程'],
          pitfalls: ['只加覆盖率闸，AI 写出大量没有断言的测试也能过。', '闸门太慢，开发者习惯性跳过或等待时并行改代码。', '把 AI 生成的测试当成正确性证明，不审断言。'],
          homework: ['给现有项目加一条 ArchUnit 架构约束并让它先红后绿。', '为某个模块开启变异测试，记录存活变异体并说明哪些是测试断言不足导致的。']
        },
        quiz: [
          { q: '质量闸的合理分层顺序是？', options: ['人工评审 → 单元测试 → 静态检查', '静态检查 → 单元测试 → 集成测试 → 人工评审', '只做人工评审', '只做单元测试'], answer: 1, explain: '越便宜越早的闸先跑，快速反馈；昂贵的人工评审放在最后一层。' },
          { q: '为什么只靠覆盖率闸不足以保证质量？', options: ['覆盖率无法统计', '没有断言的测试也能提高覆盖率，掩盖错误实现', '覆盖率太慢', '覆盖率会漏编译错误'], answer: 1, explain: '覆盖率只说明代码被执行过，不说明断言有效；需配合变异测试与契约测试。' },
          { q: 'AI 生成的测试代码应该怎么处理？', options: ['直接合并', '评审其断言是否真的验证了行为', '全部删除', '只保留通过的'], answer: 1, explain: '生成测试可能存在空断言或把实现细节写死，必须人工评审断言质量。' }
        ]
      })
    ]
  };

  var at = -1;
  C.forEach(function (m, i) { if (m.id === 'm13') at = i; });
  if (at < 0) at = C.length;
  C.splice(at, 0, modern);
  C.forEach(function (m, i) { m.no = String(i + 1).padStart(2, '0'); });
})();
