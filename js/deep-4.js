/* 精读补充 4：JVM + 反射设计模式 + 数据库 Web + Spring + 项目（20 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['jvm-memory'] = {
    why: 'OOM 和 StackOverflow 发生在不同区域。不画出 JVM 的内存地图，就无法根据报错判断该调 -Xmx、-Xss 还是查内存泄漏。',
    walk: [
      ['程序计数器', '线程私有，记录当前字节码行号；唯一不会 OOM 的区域。'],
      ['虚拟机栈', '每个方法一个栈帧，放局部变量表和操作数栈；递归过深抛 StackOverflowError。'],
      ['堆', '所有 new 出来的对象，GC 主战场；持续增长会抛 heap OOM。'],
      ['方法区 / 元空间', '类元数据、常量、静态变量；类太多可能 Metaspace OOM。'],
      ['直接内存', 'NIO DirectByteBuffer 分配在堆外，不受 -Xmx 限制。'],
      ['参数', '-Xmx 管堆上限，-Xss 管栈深度，-XX:MaxMetaspaceSize 管元空间。']
    ],
    summary: [
      '计数器/栈/本地方法栈线程私有，堆/方法区共享。',
      '栈溢出调 -Xss，堆溢出调 -Xmx 并排查泄漏。',
      '直接内存和元空间是堆外容易忽略的两块。'
    ]
  };

  D['gc'] = {
    why: 'Java 自动回收内存，但“自动”不等于“免费”。不理解可达性、分代和收集器，就看不懂 GC 日志，也无法解释线上为什么突然停顿。',
    walk: [
      ['GC Roots', '栈引用、静态变量、JNI 引用等；从它们出发能走到的对象才存活。'],
      ['可达性分析', '走不到的对象可回收；引用计数处理不了循环引用。'],
      ['Eden', '新对象出生地；Eden 满触发 Minor GC。'],
      ['Survivor', 'Minor GC 后存活对象复制过来，年龄加一；两个 Survivor 交替使用。'],
      ['老年代', '年龄达到阈值或大对象直接晋升；满了触发 Full GC。'],
      ['G1 / ZGC', 'JDK 9+ 默认 G1，可预测停顿；ZGC 追求超低停顿。']
    ],
    summary: [
      'GC 回收的是从 GC Roots 不可达的对象。',
      '新生代复制，老年代标记整理/标记清除。',
      '调优先看日志和监控，别背参数。'
    ]
  };

  D['classloading'] = {
    why: '类不是凭空出现的：加载、验证、准备、解析、初始化，每一步都有讲究。双亲委派保证了核心类安全，也是 Tomcat、SPI 等框架的基础。',
    walk: [
      ['加载', '按全限定名找到 .class，读入内存并生成 Class 对象。'],
      ['验证', '检查字节码格式和语义，防止破坏 JVM。'],
      ['准备', '为静态变量分配内存并赋零值，不是代码里的初始值。'],
      ['解析', '把常量池的符号引用替换成直接引用。'],
      ['初始化', '执行 static 块和静态赋值，真正赋上代码里的值。'],
      ['双亲委派', '先交给父加载器，父加载不了才自己加载，保证核心类不被覆盖。']
    ],
    summary: [
      '准备阶段赋零值，初始化阶段才执行 static 赋值。',
      '类由“加载器 + 全限定名”共同确定唯一性。',
      '双亲委派保证安全，SPI/Tomcat 会按需打破。'
    ]
  };

  D['bytecode-tuning'] = {
    why: 'JVM 先解释字节码，再把热点代码 JIT 编译成本地机器码。理解这条链路，才能分清问题出在代码、GC 还是锁，而不是一上来就调参数。',
    walk: [
      ['javap -c', '反汇编 class 文件，查看方法里的字节码指令。'],
      ['解释器', '逐条执行，启动快，适合只跑一次的冷代码。'],
      ['JIT', '统计热点方法，编译成本地机器码并做内联、逃逸分析。'],
      ['jps -l', '找到 Java 进程 pid。'],
      ['jstack <pid>', '打印线程栈，查死锁、卡顿、线程在干什么。'],
      ['jstat -gcutil <pid> 1000', '每秒打印 GC 统计，观察停顿和堆使用。']
    ],
    summary: [
      '先测量定位瓶颈，再决定是否调参。',
      'jstack 看线程，jstat 看 GC，jmap 看对象。',
      'JIT 需要预热，压测时别把预热阶段当稳态。'
    ]
  };

  D['reflection'] = {
    why: 'Spring、MyBatis、JUnit 都靠反射工作：运行时才知道创建哪个类、调用哪个方法。理解反射，才能看懂框架的“魔法”。',
    walk: [
      ['Class.forName("com.demo.User")', '按全限定名加载并初始化类，返回 Class 对象。'],
      ['clazz.getDeclaredConstructor(...)', '拿到构造器，包括 private 的。'],
      ['ctor.newInstance("Tom")', '反射创建对象，等价于 new User("Tom")。'],
      ['getDeclaredMethod("sayHello")', '按方法名和参数类型查找方法。'],
      ['method.setAccessible(true)', '关闭访问检查，才能调用私有方法。'],
      ['method.invoke(user)', '执行方法；参数不匹配会抛 IllegalArgumentException。']
    ],
    summary: [
      'Class 是反射入口，Constructor/Method/Field 是操作对象。',
      '访问私有成员要 setAccessible(true)。',
      '反射慢、破坏封装，业务代码能直调就直调。'
    ]
  };

  D['annotations'] = {
    why: '注解本身不干活，它只是贴在代码上的标签。Spring 的 @Service、@Transactional 之所以生效，是因为框架用反射或代理读取了这些标签。',
    walk: [
      ['@interface LogTime', '定义注解，本质是继承 Annotation 的接口。'],
      ['@Retention(RUNTIME)', '保留到运行时，反射才能读到；SOURCE 只存在于源码。'],
      ['@Target(METHOD)', '限制注解能贴的位置，贴错编译报错。'],
      ['String value() default ""', '注解属性，使用时可以省略属性名直接写值。'],
      ['method.getAnnotation(LogTime.class)', '运行时读取注解，拿到属性值。'],
      ['处理器', '反射/AOP/编译期处理器读取注解并执行逻辑，没有处理器注解就是摆设。']
    ],
    summary: [
      '注解是元数据，必须有人读取才生效。',
      '运行时读取必须 RUNTIME 保留策略。',
      '自定义注解三步：定义、元注解、处理器。'
    ]
  };

  D['patterns-creational'] = {
    why: '创建型模式解决“对象怎么造”：单例控制数量，工厂解耦创建，建造者解决参数爆炸。它们是阅读框架源码的常见套路。',
    walk: [
      ['private static volatile Singleton instance', '静态字段保存唯一实例；volatile 防止重排。'],
      ['if (instance == null) synchronized ...', '双重检查：第一次避免每次加锁，第二次防止重复创建。'],
      ['private Singleton() {}', '私有构造器阻止外部 new。'],
      ['static Factory create(String type)', '按参数返回不同实现，调用方不关心 new 的细节。'],
      ['Builder.name(...).age(...).build()', '链式设置可选参数，最后统一校验并创建。'],
      ['枚举单例', '最简、天然防反射和序列化破坏。']
    ],
    summary: [
      '单例控制实例数量，DCL 必须加 volatile。',
      '工厂把创建细节藏起来，调用方依赖接口。',
      '参数多且可选时用 Builder。'
    ]
  };

  D['patterns-behavioral'] = {
    why: '行为型模式关注对象怎么协作：策略替换算法，观察者传播事件，代理增强功能。Spring AOP 就是动态代理的典型应用。',
    walk: [
      ['interface PayStrategy', '把支付算法抽象成统一接口。'],
      ['class AliPay implements PayStrategy', '每种算法一个类，新增不改调用方。'],
      ['order.setStrategy(new AliPay())', '运行时注入具体策略，替代 if-else。'],
      ['listeners.forEach(l -> l.onEvent(e))', '观察者：主题状态变化时通知所有监听器。'],
      ['Proxy.newProxyInstance(...)', 'JDK 动态代理，基于接口生成代理对象。'],
      ['InvocationHandler.invoke', '在方法调用前后插入日志、事务等增强逻辑。']
    ],
    summary: [
      '策略模式把变化点抽成接口。',
      '观察者用于事件通知，注意回调不要阻塞。',
      '代理是 AOP 的底层，JDK 基于接口，CGLIB 基于继承。'
    ]
  };

  D['sql-jdbc'] = {
    why: 'Java 后端的另一半是数据库。JDBC 是最底层的标准接口，MyBatis、JPA 都在它之上封装。学会 JDBC，才能理解框架到底做了什么。',
    walk: [
      ['DriverManager.getConnection(url, user, pwd)', '获取数据库连接；生产环境从连接池借。'],
      ['conn.prepareStatement(sql)', '预编译带 ? 的 SQL，防止注入并复用执行计划。'],
      ['ps.setInt(1, 18)', '把参数绑定到第 1 个占位符，参数只作为值。'],
      ['ps.executeQuery()', '执行查询，返回 ResultSet 游标。'],
      ['rs.next()', '移到下一行，返回 false 表示遍历结束。'],
      ['try-with-resources', '自动关闭 ResultSet、Statement、Connection，避免连接泄漏。']
    ],
    summary: [
      'JDBC 五步：连接、语句、参数、执行、关闭。',
      '永远用 PreparedStatement，不要拼接 SQL。',
      '生产环境必须用连接池。'
    ]
  };

  D['prepared-transaction'] = {
    why: '转账要么全成功、要么全失败，这就是事务。不会手动控制事务，一次异常就会让数据只改一半。',
    walk: [
      ['conn.setAutoCommit(false)', '关闭自动提交，后续 SQL 属于同一个事务。'],
      ['update A - 100', '第一步扣款，变更只在当前事务可见。'],
      ['update B + 100', '第二步入账，两步都成功。'],
      ['conn.commit()', '提交后变更对所有连接可见。'],
      ['catch { conn.rollback(); }', '任何一步失败都回滚，撤销前面的修改。'],
      ['隔离级别', 'READ COMMITTED 解决脏读，REPEATABLE READ 解决不可重复读。']
    ],
    summary: [
      '事务保证原子性，异常必须 rollback。',
      '事务要短，不要在里面做远程调用。',
      'PreparedStatement 防注入，参数不参与 SQL 解析。'
    ]
  };

  D['http-servlet'] = {
    why: '浏览器输入网址后，请求怎么一步步到达你的 Java 代码？理解 HTTP 和 Servlet 容器，是学 Spring MVC 的前置知识。',
    walk: [
      ['浏览器 → DNS → TCP', '解析域名、建立连接，然后发送 HTTP 请求。'],
      ['Tomcat', '监听端口、解析 HTTP，把请求交给对应的 Servlet。'],
      ['Filter 链', '在 Servlet 前后执行编码、鉴权、日志。'],
      ['Servlet.service', '根据请求方法分发到 doGet/doPost，执行业务。'],
      ['HttpServletResponse', '写状态码、响应头、响应体，容器再写回 socket。'],
      ['Session / Cookie', 'HTTP 无状态，用 JSESSIONID 或 Token 维持登录态。']
    ],
    summary: [
      'HTTP 请求行、头、体，响应状态码、头、体。',
      'Servlet 单例多线程，不要用实例字段存请求数据。',
      '登录态靠 Cookie/Session/Token。'
    ]
  };

  D['build-test'] = {
    why: '项目变大后靠 javac 一个个编译不现实。Maven 管依赖和构建，JUnit 让你改代码时心里有底，这两样是工程化的起点。',
    walk: [
      ['pom.xml', '声明坐标、依赖、插件；groupId/artifactId/version 唯一定位。'],
      ['mvn compile', '编译 src/main/java 到 target/classes。'],
      ['mvn test', '编译并运行 src/test/java，测试失败中断构建。'],
      ['mvn package', '打包成 jar/war；会自动先跑 test。'],
      ['dependency:tree', '查看依赖树，定位版本冲突。'],
      ['@Test + assertEquals', '一个测试只验证一个行为，独立、快速、可重复。']
    ],
    summary: [
      'Maven 生命周期有序，后面的阶段自动执行前面的。',
      '测试要独立、快速、不依赖外部环境。',
      '依赖冲突用 dependency:tree 排查。'
    ]
  };

  D['ioc-di'] = {
    why: 'Spring 最核心的思想：对象不要自己 new 依赖，而是把控制权交给容器。理解 IoC/DI，才能看懂 @Service、@Autowired 背后的装配过程。',
    walk: [
      ['@Service', '标记为 Bean，启动时被组件扫描发现。'],
      ['构造器注入', '依赖声明在构造器参数里，容器创建时传入。'],
      ['private final PayService payService', '依赖不可变、不为空，测试可直接传 mock。'],
      ['@Configuration + @Bean', '第三方类无法加注解时，用 @Bean 方法手动注册。'],
      ['singleton 作用域', '默认整个容器一个实例，所以 Bean 应该无状态。'],
      ['prototype', '每次获取新建，适合有状态的短生命周期对象。']
    ],
    summary: [
      'IoC 是控制反转，DI 是依赖注入。',
      '构造器注入最推荐，依赖 final 且便于测试。',
      '单例 Bean 不要保存请求级状态。'
    ]
  };

  D['boot-autoconfig'] = {
    why: '一个 @SpringBootApplication 就能启动整个应用，自动配置到底怎么“猜”出你需要什么？理解条件装配，才能排查“为什么我的配置没生效”。',
    walk: [
      ['@SpringBootApplication', '组合了配置类、自动配置、组件扫描三个注解。'],
      ['AutoConfiguration.imports', '启动时读取候选配置类列表。'],
      ['@ConditionalOnClass', '类路径有某个类才生效，比如有 DataSource 才配数据源。'],
      ['@ConditionalOnMissingBean', '用户没定义才注册默认 Bean，允许覆盖。'],
      ['@ConditionalOnProperty', '配置开关打开才生效。'],
      ['--debug', '打印条件评估报告，看哪些配置生效、哪些没生效。']
    ],
    summary: [
      '自动配置 = 候选配置类 + 条件注解筛选。',
      '类路径、已有 Bean、配置项共同决定是否生效。',
      '排查用 --debug 看 Negative matches。'
    ]
  };

  D['mvc-flow'] = {
    why: '一个 @RestController 方法是怎么被调用的？理解 DispatcherServlet 的调度链路，排查 404/400/500 就不用靠猜。',
    walk: [
      ['DispatcherServlet', '前端控制器，接收所有请求。'],
      ['HandlerMapping', '根据 URL 和方法找到对应的 Controller 方法。'],
      ['HandlerAdapter', '解析 @PathVariable/@RequestBody，反射调用方法。'],
      ['Controller', '调用 Service，返回对象。'],
      ['HttpMessageConverter', '把对象序列化成 JSON 写入响应体。'],
      ['@ControllerAdvice', '统一捕获异常，返回结构化错误 JSON。']
    ],
    summary: [
      '请求先到 DispatcherServlet，再找 HandlerMapping。',
      '路径变量、查询参数、请求体分别用不同注解。',
      '前后端分离时返回值由消息转换器转 JSON。'
    ]
  };

  D['mybatis-jpa'] = {
    why: 'Spring 里操作数据库有两大流派：MyBatis 手写 SQL、控制力强；JPA 对象映射、开发快。理解差异才能选对工具。',
    walk: [
      ['@Mapper interface UserMapper', '只声明方法，SQL 写在注解或 XML。'],
      ['@Select("... #{id}")', '#{} 是预编译参数，${} 是字符串拼接，后者有注入风险。'],
      ['@Entity class User', '类映射表，字段映射列。'],
      ['extends JpaRepository<User, Long>', '自带 CRUD，方法名可派生查询。'],
      ['@Query("...")', '复杂查询写 JPQL，再复杂退回原生 SQL。'],
      ['@Transactional', 'Service 层事务；同类自调用不经过代理会失效。']
    ],
    summary: [
      'MyBatis 控制 SQL，JPA 控制对象映射。',
      'MyBatis 用 #{}，别用 ${}。',
      '@Transactional 基于代理，自调用会失效。'
    ]
  };

  D['deploy'] = {
    why: '代码写完只是开始：日志能排查、jar 能交付、容器能复现环境，才算真正上线。',
    walk: [
      ['LoggerFactory.getLogger(X.class)', '用 SLF4J 门面，底层可换 Logback/Log4j2。'],
      ['log.info("...")', '生产默认 INFO；ERROR 需要人处理，DEBUG 用于调试。'],
      ['spring-boot-maven-plugin', '打出包含依赖和内嵌 Tomcat 的可执行 jar。'],
      ['java -jar app.jar', '启动应用；--spring.profiles.active 切换环境。'],
      ['Dockerfile', '基于 eclipse-temurin，COPY jar，ENTRYPOINT 启动。'],
      ['健康检查 / 滚动发布', '容器编排负责探活、扩缩容、回滚。']
    ],
    summary: [
      '日志分级、按天滚动，敏感信息不能打印。',
      'Spring Boot 打成 fat jar，java -jar 即可运行。',
      'Docker 保证环境一致，避免“在我机器上能跑”。'
    ]
  };

  D['project-console'] = {
    why: '学完语法和集合，最缺的是把知识拼成一个能跑的东西。这个项目不依赖数据库和框架，只用 Java SE 完成增删查改和文件持久化。',
    walk: [
      ['Book 实体', '只放字段和 getter/setter，不写业务逻辑。'],
      ['BookService', '负责业务规则：校验 id、判断是否已借出、维护集合。'],
      ['Main', '只做菜单、读输入、调用 Service、显示结果。'],
      ['List<Book>', '启动时从文件加载，修改后写回。'],
      ['异常处理', '数字解析失败、id 不存在，给用户可读提示。'],
      ['保存格式', '每行一条记录，用分隔符拆分；数据量大再换数据库。']
    ],
    summary: [
      '分三层：实体、服务、入口，职责清晰。',
      '业务规则放 Service，Main 只做交互。',
      '先跑通主流程，再补校验和持久化。'
    ]
  };

  D['project-spring'] = {
    why: '把控制台项目升级成浏览器能调用的 Web 接口，是走向后端开发的关键一步。Spring Boot 负责启动和装配，你只需关注分层和接口。',
    walk: [
      ['@SpringBootApplication', '启动类，开启自动配置和组件扫描。'],
      ['@RestController', '控制器，返回值自动转 JSON。'],
      ['@GetMapping("/{id}")', 'GET 查询；路径变量用 @PathVariable 接收。'],
      ['@PostMapping + @RequestBody', 'POST 新增，请求体 JSON 转成对象。'],
      ['Service + Repository', '业务和数据访问分层，Controller 保持薄。'],
      ['curl / Postman', '没有前端也能验证接口：状态码、响应体。']
    ],
    summary: [
      'Controller 只做协议转换，业务放 Service。',
      'GET 用路径/查询参数，POST 用请求体。',
      '先跑通 HTTP，再接入数据库。'
    ]
  };

  D['sql-basics'] = {
    why: 'Java 后端的另一半是数据库。不会 SQL，JDBC、MyBatis、JPA 都无从谈起。先掌握增删改查，再谈索引和优化。',
    walk: [
      ['SELECT name, price FROM book', '选择列和表；* 表示所有列，生产环境尽量写明列。'],
      ['WHERE price > 50', '过滤行；支持 =、>、LIKE、IN、BETWEEN。'],
      ['ORDER BY price DESC', '按价格降序；默认 ASC 升序。'],
      ['LIMIT 2', '只取前两条，常用于分页。'],
      ['INSERT INTO ... VALUES', '新增一行；列和值一一对应。'],
      ['UPDATE / DELETE 带 WHERE', '不带 WHERE 会作用全表，线上最危险的误操作。']
    ],
    summary: [
      '查询四件套：SELECT、WHERE、ORDER BY、LIMIT。',
      'UPDATE/DELETE 先写 WHERE，再用 SELECT 验证范围。',
      '主键唯一标识一行，常用查询字段适合建索引。'
    ]
  };
})();
