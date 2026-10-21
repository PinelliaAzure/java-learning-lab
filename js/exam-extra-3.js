/* =====================================================================
   exam-extra-3.js · 题库补充（模块 m10 ~ m14）
   ---------------------------------------------------------------------
   本文件只做数据补充，不改动课程本身：
   - EXAM_EXTRA[模块 id]：模块级补充题，每题 {q, options[4], answer, explain}
   - LESSON_EXTRA[课程 id]：课程级补充题，用于把不足 3 题的课补到 3 题

   模块 id 对照（以课程数据里的 id 为准）：
     m10 反射与设计模式（4 课 / 原 8 题）→ 补到 18
     m11 数据库与 Web   （5 课 / 原 11 题）→ 补到 18
     m12 Spring 生态    （5 课 / 原 10 题）→ 补到 18
     m13 项目实战       （2 课 / 原 6 题）→ 补到 18

   注意：m14（现代 Java 与 AI 工程，8 课）没有模块级补充题，
   它的每课在 lesson.quiz 里已有 3 题，这里保留空数组 m14，消费方
   读取 EXAM_EXTRA.m14 不会拿到 undefined。模块 id 与页面显示序号无关：
   实际顺序由 js/curriculum-order.js 决定（m14 显示为 19）。
   ===================================================================== */
(function () {
  'use strict';

  window.EXAM_EXTRA = window.EXAM_EXTRA || {};
  Object.assign(window.EXAM_EXTRA, {

    /* ================================================================
       m10 · 反射与设计模式（原 8 题，补 10 题 → 18 题）
       ================================================================ */
    m10: [
      {
        q: '反射中 <code>Class.forName("com.demo.User")</code> 的作用是？',
        options: ['根据全限定名加载类并返回 Class 对象', '创建 User 对象', '调用 User 的构造器', '编译 User 类'],
        answer: 0,
        explain: 'forName 会加载并初始化类（默认 initialize=true），然后返回 Class 对象；但它不会创建实例，要创建对象还得再调用构造器。'
      },
      {
        q: '用反射调用方法时，<code>method.invoke(obj)</code> 里的 obj 表示？',
        options: ['方法参数', '方法所属的对象实例', 'Class 对象', '返回值'],
        answer: 1,
        explain: 'invoke 需要知道“在哪个对象上调用这个方法”；调用静态方法时可以传 null。'
      },
      {
        q: '下面哪种场景最适合用反射？',
        options: ['业务代码里创建普通对象', '替换所有 if-else', '框架根据配置动态加载并创建类', '给变量改名'],
        answer: 2,
        explain: '框架（Spring、MyBatis）要到运行时才知道用哪个类，所以用反射；普通业务代码直接 new 更清晰也更快。'
      },
      {
        q: '<code>clazz.getMethods()</code> 与 <code>clazz.getDeclaredMethods()</code> 的主要区别是？',
        options: [
          '前者只返回本类方法，后者返回父类方法',
          '前者返回本类及父类的 public 方法，后者只返回本类声明的方法',
          '两者完全一样',
          '后者只能返回 static 方法'
        ],
        answer: 1,
        explain: 'getMethods 包含继承来的 public 方法；getDeclaredMethods 只返回当前类自己声明的方法，不论访问修饰符，但不包含继承的方法。'
      },
      {
        q: '自定义注解里给属性设置默认值，用哪个关键字？',
        options: ['default', 'static', 'final', 'optional'],
        answer: 0,
        explain: '注解属性可以写成 <code>int age() default 18;</code>；使用时没写这个属性，就取默认值。'
      },
      {
        q: '<code>@Target(ElementType.METHOD)</code> 表示这个注解？',
        options: ['只能标在类上', '只能标在方法上', '运行时可读', '可以继承'],
        answer: 1,
        explain: '@Target 限制注解能出现的位置；METHOD 表示只能标在方法上，标到别处会编译报错。'
      },
      {
        q: '自定义注解不写 <code>@Retention</code> 时，默认策略是？',
        options: ['SOURCE', 'RUNTIME', 'CLASS', '没有默认值'],
        answer: 2,
        explain: '默认是 CLASS：注解保留在 class 文件里，但运行时反射读不到。想在运行时读取，必须显式写 RUNTIME。'
      },
      {
        q: '单例模式把构造器声明为 private，主要目的是？',
        options: ['提高运行速度', '让类不能被继承', '支持序列化', '禁止外部 new，只能通过静态方法拿唯一实例'],
        answer: 3,
        explain: '构造器私有后外部无法 new，实例只能由类自己创建，再通过 getInstance 统一暴露。'
      },
      {
        q: '工厂模式主要解决什么问题？',
        options: ['把对象创建逻辑集中起来，调用方不用关心具体类', '让方法执行更快', '自动生成数据库表', '替代接口'],
        answer: 0,
        explain: '调用方只说“我要一个支付对象”，由工厂决定 new 哪个实现；新增实现时改工厂，不用改调用方。'
      },
      {
        q: '观察者模式中，发布者状态变化后会做什么？',
        options: ['自动修改订阅者的代码', '通知所有订阅者，让它们各自更新', '删除订阅者', '重新创建发布者'],
        answer: 1,
        explain: '发布者维护一份订阅者列表，状态变化时逐个通知；订阅者只依赖通知接口，双方因此解耦。'
      }
    ],

    /* ================================================================
       m11 · 数据库与 Web（原 11 题，补 7 题 → 18 题）
       ================================================================ */
    m11: [
      {
        q: 'SQL 中 <code>WHERE</code> 和 <code>HAVING</code> 的区别是？',
        options: ['没有区别', 'HAVING 只能用于 INSERT', 'WHERE 过滤行，HAVING 过滤分组后的结果', 'WHERE 只能用于查询'],
        answer: 2,
        explain: 'WHERE 在分组前过滤行；HAVING 在 GROUP BY 之后过滤分组，常配合聚合函数使用。'
      },
      {
        q: '<code>SELECT COUNT(*) FROM book;</code> 的结果是？',
        options: ['第一行的 id', '所有列的和', '表的列数', 'book 表的总行数'],
        answer: 3,
        explain: 'COUNT(*) 统计行数，不管列里是不是 NULL；COUNT(列名) 会跳过该列为 NULL 的行。'
      },
      {
        q: 'JDBC 中资源关闭的推荐顺序是？',
        options: ['ResultSet → Statement → Connection', 'Connection → Statement → ResultSet', '顺序无所谓', '只关 Connection 就行'],
        answer: 0,
        explain: '后开的先关：先关结果集，再关语句，最后关连接；用 try-with-resources 会自动按这个顺序关闭。'
      },
      {
        q: 'JDBC 里 <code>DriverManager.getConnection(...)</code> 返回的是？',
        options: ['ResultSet', 'Connection', 'Statement', 'Driver'],
        answer: 1,
        explain: 'getConnection 建立一次数据库连接并返回 Connection，后续用它创建 Statement、管理事务。'
      },
      {
        q: '事务的原子性（Atomicity）指？',
        options: ['事务必须很快执行完', '事务只能读不能写', '事务里的操作要么全部成功，要么全部回滚', '事务不能被并发访问'],
        answer: 2,
        explain: '原子性保证一组操作不可分割；中途失败会回滚到事务开始前的状态，不会只做一半。'
      },
      {
        q: 'HTTP 中 GET 和 POST 的主要区别是？',
        options: ['GET 不能带参数', 'POST 只能传 JSON', '两者完全一样', 'GET 参数通常放 URL，POST 通常放请求体'],
        answer: 3,
        explain: 'GET 一般用于查询，参数拼在 URL 上；POST 一般用于提交，数据放请求体，更私密也能传更大的内容。'
      },
      {
        q: 'Maven 依赖的 <code>test</code> scope 表示？',
        options: ['只在测试编译和测试运行时可用，不会打进最终包', '运行和打包都需要', '只在编译主代码时可用', '永久排除该依赖'],
        answer: 0,
        explain: 'JUnit 这类依赖写 test scope：主代码用不到，打包也不带上，能减小产物体积。'
      }
    ],

    /* ================================================================
       m12 · Spring 生态（原 10 题，补 8 题 → 18 题）
       ================================================================ */
    m12: [
      {
        q: '<code>@RestController</code> 相当于哪两个注解的组合？',
        options: ['@Service + @Repository', '@Controller + @ResponseBody', '@Component + @Autowired', '@Configuration + @Bean'],
        answer: 1,
        explain: '@RestController 让方法返回值直接写入响应体（默认转成 JSON），而不是去找页面模板。'
      },
      {
        q: '请求地址是 <code>/books?page=2</code>，Controller 里取 page 用什么注解？',
        options: ['@PathVariable', '@RequestBody', '@RequestParam', '@RequestHeader'],
        answer: 2,
        explain: '? 后面的查询参数用 @RequestParam；路径变量（如 /books/{id}）才用 @PathVariable。'
      },
      {
        q: 'Spring MVC 中负责接收请求并分发给对应 Controller 的核心组件是？',
        options: ['Tomcat', 'ViewResolver', 'DataSource', 'DispatcherServlet'],
        answer: 3,
        explain: 'DispatcherServlet 是前端控制器：接收所有请求，按路径找到处理器，再调用对应的 Controller。'
      },
      {
        q: '<code>@Bean</code> 和 <code>@Component</code> 的区别是？',
        options: ['@Bean 用在配置类方法上，适合注册第三方类；@Component 标在自己的类上', '完全一样', '@Bean 只能用于测试', '@Component 只能用于 Controller'],
        answer: 0,
        explain: '自己写的类加 @Component 让扫描发现；第三方类改不了源码，就在 @Configuration 类里写 @Bean 方法注册。'
      },
      {
        q: 'Spring Boot 中修改端口、数据库地址等配置，通常写在？',
        options: ['main 方法里', 'application.properties 或 application.yml', 'pom.xml 的注释里', 'Java 文件的注释里'],
        answer: 1,
        explain: '配置文件由 Spring Boot 自动读取，也可以用命令行参数、环境变量覆盖，不必改代码。'
      },
      {
        q: '想按环境启用不同配置（比如换成生产库），通常用？',
        options: ['new Profile()', '修改 main 方法名', 'spring.profiles.active=prod', '只能改代码'],
        answer: 2,
        explain: 'application-prod.properties 配合 spring.profiles.active=prod 激活；不同环境用不同配置文件。'
      },
      {
        q: '下面四个常用日志级别，按严重程度从低到高排列正确的是？',
        options: ['ERROR < WARN < INFO < DEBUG', 'INFO < DEBUG < ERROR < WARN', 'WARN < ERROR < DEBUG < INFO', 'DEBUG < INFO < WARN < ERROR'],
        answer: 3,
        explain: '级别越低输出越详细；配置成 INFO 时 DEBUG 日志不会打印，生产环境常用 INFO 或 WARN。'
      },
      {
        q: 'MyBatis 的 Mapper 接口没有实现类，为什么还能调用？',
        options: ['MyBatis 用动态代理在运行时生成实现', '编译器自动生成实现类文件', '接口方法会自动变成 SQL', '必须手写实现，不能省略'],
        answer: 0,
        explain: 'MyBatis 扫描 Mapper 接口，用 JDK 动态代理生成代理对象；调用方法时按注解或 XML 执行对应 SQL。'
      }
    ],

    /* ================================================================
       m13 · 项目实战（原 6 题，补 12 题 → 18 题）
       ================================================================ */
    m13: [
      {
        q: '三层架构中，Controller 层的主要职责是？',
        options: ['写业务规则', '接收请求参数、调用 Service、返回响应', '直接操作数据库', '管理数据库连接池'],
        answer: 1,
        explain: 'Controller 只做协议转换和参数接收；业务规则放 Service，数据访问放 Repository。'
      },
      {
        q: '项目中负责和数据库/文件打交道的是哪一层？',
        options: ['Controller', 'Service', 'Repository（DAO）', '启动类'],
        answer: 2,
        explain: 'Repository 只关心数据怎么存、怎么取；换存储方式时尽量只改这一层。'
      },
      {
        q: '控制台图书管理系统中，按 id 查找一本书，用 <code>Map&lt;Integer, Book&gt;</code> 比 List 好的原因是？',
        options: ['Map 能自动排序', 'Map 不能存对象', 'List 不能存对象', '按键查找更快，不用遍历整个集合'],
        answer: 3,
        explain: 'Map 用哈希按键直接定位；List 按 id 查找要逐个比较，数据一多就明显更慢。'
      },
      {
        q: '控制台录入书名（书名可能包含空格），应该用哪个方法读取整行？',
        options: ['next()', 'nextInt()', 'nextLine()', 'nextBoolean()'],
        answer: 2,
        explain: 'next() 遇到空白就停止，只能读到第一个词；nextLine() 一直读到行尾，能保留书名中的空格。'
      },
      {
        q: '控制台程序退出前要把数据写回文件，主要是因为？',
        options: ['文件比内存快', '内存里的数据会随进程结束丢失', 'Java 不允许一直用内存', '写文件能自动去重'],
        answer: 1,
        explain: '程序运行时数据在内存，进程一结束就没了；启动时读回、修改后写回，数据才能持久保存。'
      },
      {
        q: '<code>@Service</code> 注解的作用是？',
        options: ['自动生成数据库表', '开启事务', '把类标记为业务层 Bean，交给 Spring 容器管理', '把类变成单例的工具类'],
        answer: 2,
        explain: '@Service 是 @Component 的语义化写法，表示业务层组件；是否单例由作用域决定，默认就是单例。'
      },
      {
        q: '<code>@RestControllerAdvice</code> 常用来做什么？',
        options: ['拦截所有 SQL', '自动生成接口文档', '替代 Service', '统一处理 Controller 抛出的异常并返回统一格式'],
        answer: 3,
        explain: '配合 @ExceptionHandler，可以把异常转成统一的错误响应，避免每个接口都写一遍 try-catch。'
      },
      {
        q: '接口返回 HTTP 500 通常表示？',
        options: ['请求的资源不存在', '服务器内部错误', '没有权限', '请求成功'],
        answer: 1,
        explain: '500 Internal Server Error 表示服务端处理请求时出错；404 是资源不存在，401/403 是认证/授权问题。'
      },
      {
        q: '用 POST 成功创建一个新资源，常见的返回状态码是？',
        options: ['200', '201', '302', '500'],
        answer: 1,
        explain: '201 Created 表示资源创建成功，通常还会在 Location 响应头里给出新资源的地址。'
      },
      {
        q: 'Spring Boot 项目连接数据库的地址、用户名、密码通常配置在？',
        options: ['Controller 方法里', 'pom.xml', 'application.properties 的 spring.datasource.*', 'README'],
        answer: 2,
        explain: '数据源配置放配置文件，由 Spring Boot 自动装配 DataSource；不要把密码硬编码进代码。'
      },
      {
        q: 'Controller 参数加了 <code>@Valid</code>，请求体校验失败时 Spring 默认返回？',
        options: ['200', '400', '404', '500'],
        answer: 1,
        explain: '校验失败会抛 MethodArgumentNotValidException，Spring 默认映射为 400 Bad Request；可以用 @RestControllerAdvice 自定义错误响应格式。'
      },
      {
        q: '项目里为什么常用 DTO 而不是直接返回 Entity？',
        options: ['只暴露需要的字段，避免泄露表结构和敏感信息', 'DTO 能自动加密', 'DTO 查询更快', 'Entity 不能转 JSON'],
        answer: 0,
        explain: '直接返回 Entity 会暴露数据库字段，还可能带出密码等敏感信息；DTO 只挑需要的字段返回。'
      }
    ],

    /* 课程数据里没有 m14 模块：保留空数组，避免消费方读到 undefined。
       页面编号 14 的“项目实战”对应 id m13，补充题已写在上面。 */
    m14: []
  });

  window.LESSON_EXTRA = window.LESSON_EXTRA || {};
  Object.assign(window.LESSON_EXTRA, {

    /* ---------- m10 四课原本各 2 题，各补 1 题 → 3 题 ---------- */
    reflection: [
      {
        q: '用反射创建对象，下面哪种写法正确？',
        options: ['new Class()', 'clazz.getDeclaredConstructor(String.class).newInstance("Tom")', 'clazz.new()', 'Class.create(clazz)'],
        answer: 1,
        explain: '先拿到构造器（可按参数类型精确匹配），再调用 newInstance 传参；框架创建 Bean 走的就是这条链路。'
      }
    ],
    annotations: [
      {
        q: '下面哪个不是元注解（用来修饰注解的注解）？',
        options: ['@Retention', '@Target', '@Override', '@Documented'],
        answer: 2,
        explain: '@Override 是给方法用的普通注解；元注解有 @Retention、@Target、@Documented、@Inherited 等。'
      }
    ],
    'patterns-creational': [
      {
        q: '饿汉式和懒汉式单例的主要区别是？',
        options: ['饿汉线程不安全', '懒汉不能保证唯一', '两者完全一样', '饿汉在类加载时就创建实例，懒汉在第一次使用时才创建'],
        answer: 3,
        explain: '饿汉写法简单、天然线程安全，但可能提前占用资源；懒汉延迟创建，但要自己处理并发（如双重检查加 volatile）。'
      }
    ],
    'patterns-behavioral': [
      {
        q: '静态代理和动态代理的区别是？',
        options: ['静态代理的代理类要手写，动态代理在运行时生成', '静态代理在运行时生成，动态代理要手写', '两者都必须实现接口', '动态代理不能增强方法'],
        answer: 0,
        explain: '静态代理一个类对应一个代理类，代码量大；动态代理（JDK / CGLIB）在运行时生成代理，Spring AOP 就靠它。'
      }
    ],

    /* ---------- m11：sql-basics 已 3 题，其余四课各补 1 题 ---------- */
    'sql-jdbc': [
      {
        q: 'JDBC 用 try-with-resources 的好处是？',
        options: ['让 SQL 跑得更快', '自动关闭资源，即使抛异常也会关', '自动提交事务', '自动重连数据库'],
        answer: 1,
        explain: '写在 try(...) 里的 Connection、Statement、ResultSet 会在代码块结束时自动按相反顺序关闭，避免连接泄漏。'
      }
    ],
    'prepared-transaction': [
      {
        q: '事务执行到一半失败，需要撤销已做的修改，应调用？',
        options: ['commit()', 'close()', 'rollback()', 'clearBatch()'],
        answer: 2,
        explain: 'setAutoCommit(false) 后，全部成功才 commit 提交；中途异常要 rollback 回滚，撤销本次事务内的修改。'
      }
    ],
    'http-servlet': [
      {
        q: 'Servlet 生命周期中，负责处理每次请求的方法是？',
        options: ['init', 'destroy', 'main', 'service'],
        answer: 3,
        explain: '容器先调 init 初始化，之后每个请求调 service（再分派到 doGet/doPost），销毁前调 destroy。'
      }
    ],
    'build-test': [
      {
        q: 'JUnit 5 中标记一个测试方法的注解是？',
        options: ['@Test', '@Run', '@UnitTest', '@BeforeAll'],
        answer: 0,
        explain: '@Test 标记测试方法；@BeforeEach / @BeforeAll 用来做测试前的准备。'
      }
    ],

    /* ---------- m12 五课原本各 2 题，各补 1 题 → 3 题 ---------- */
    'ioc-di': [
      {
        q: '容器里有多个同类型 Bean 时，@Autowired 默认怎么选？',
        options: ['随机选一个', '先按类型匹配，仍有多个时再按字段名/参数名匹配', '一定报错', '选第一个创建的'],
        answer: 1,
        explain: '按类型注入；同类型有多个候选时，Spring 用字段名或参数名与 Bean 名称匹配，也可以用 @Qualifier 明确指定。'
      }
    ],
    'boot-autoconfig': [
      {
        q: '@SpringBootApplication 通常标在哪个类上？',
        options: ['任意工具类', '每个 Controller', '包含 main 方法的启动类', '配置文件对应的类'],
        answer: 2,
        explain: '启动类上标 @SpringBootApplication，main 里调用 SpringApplication.run，容器从这里开始扫描和自动配置。'
      }
    ],
    'mvc-flow': [
      {
        q: '@RequestBody 的作用是？',
        options: ['读取 URL 路径变量', '读取请求头', '写入响应体', '读取请求体并反序列化成对象'],
        answer: 3,
        explain: '@RequestBody 把请求体（如 JSON）交给 HttpMessageConverter 转成 Java 对象；返回对象写响应体靠 @ResponseBody。'
      }
    ],
    'mybatis-jpa': [
      {
        q: 'JPA 中 @Entity 表示？',
        options: ['该类是实体，映射到数据库表', '该类是 Controller', '该类不能被继承', '该类自动创建数据库连接'],
        answer: 0,
        explain: '@Entity 标记实体类，字段映射到表的列；通常还要配合 @Id 指定主键。'
      }
    ],
    deploy: [
      {
        q: 'Maven 打包时想跳过测试，可以加哪个参数？',
        options: ['-X', '-DskipTests', '-o', '-U'],
        answer: 1,
        explain: '-DskipTests 跳过测试执行但仍编译测试代码；-Dmaven.test.skip=true 连编译都跳过。'
      }
    ]

    /* m13 两课原本各 3 题，无需补。 */
  });
})();
