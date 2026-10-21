/* 新手精讲 4：JVM + 反射注解 + 数据库 Web + Spring（17 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['jvm-memory'] = {
    goals: ['画出 JVM 运行时内存区域', '区分线程私有与共享区域', '根据报错定位是堆、栈还是元空间'],
    pitfalls: [
      '把 StackOverflowError 当成内存不足去调大 -Xmx。',
      '无限创建对象却只看栈，忽略堆和 GC 日志。',
      '以为元空间属于堆，用 -Xmx 去限制它。'
    ],
    homework: '用一段无限递归触发 StackOverflowError，再用一个不断 add byte[] 的循环触发 heap OOM；分别用 -Xss 和 -Xmx 调整参数复现。'
  };

  G['gc'] = {
    goals: ['解释可达性分析与 GC Roots', '说清新生代/老年代回收流程', '知道 G1 与常见收集器的差异'],
    pitfalls: [
      '频繁 Full GC 却只调大堆，不查内存泄漏。',
      '把 System.gc() 当常规手段，触发不必要的停顿。',
      '用 -Xmn 过小导致对象过早晋升。'
    ],
    homework: '用 -Xlog:gc* 打印一次程序运行的 GC 日志，找出 Minor GC 次数、耗时和每次回收后的堆占用；再用 jcmd GC.heap_info 查看堆分区。'
  };

  G['classloading'] = {
    goals: ['说出类加载五个阶段', '解释双亲委派的作用', '理解 Class.forName 与 ClassLoader 的区别'],
    pitfalls: [
      '以为 Class.forName 只加载不初始化（默认会初始化）。',
      '自定义类加载器破坏双亲委派却不理解后果。',
      '把静态变量的声明值当成准备阶段就赋好。'
    ],
    homework: '写一个带 static 代码块的类，分别用 new、Class.forName、声明数组三种方式触发，打印 static 块执行次数。'
  };

  G['bytecode-tuning'] = {
    goals: ['看懂 javap 反汇编的基本指令', '解释解释执行与 JIT 的分工', '按“测量 → 定位 → 再调参”的顺序排查性能'],
    pitfalls: [
      '一上来就调 -Xmx，掩盖了内存泄漏。',
      '用 jmap -histo:live 频繁触发 Full GC。',
      '把 JIT 预热阶段的性能当成稳态性能。'
    ],
    homework: '写一个简单类，用 javap -c 查看方法字节码；再用 jps + jstack 观察一个死循环线程的栈，找出它卡在哪一行。'
  };

  G['reflection'] = {
    goals: ['用三种方式拿到 Class 对象', '反射创建对象、调用方法和访问字段', '说清反射的代价与适用场景'],
    pitfalls: [
      'Class.forName 传错包名，抛 ClassNotFoundException。',
      '对私有方法不 setAccessible 就 invoke，抛 IllegalAccessException。',
      '把反射当万能工具，代码可读性和性能都变差。'
    ],
    homework: '写一个工具方法，传入任意对象，用反射打印它的所有字段名和值；再反射调用一个私有方法并修改一个私有字段。'
  };

  G['annotations'] = {
    goals: ['定义带属性的注解', '正确设置 Retention 与 Target', '在运行时读取注解并产生行为'],
    pitfalls: [
      'Retention 用默认 CLASS，运行时 getAnnotation 返回 null。',
      '@Target 漏写 METHOD，贴到方法上编译报错。',
      '以为加了注解就自动生效，其实没有处理器。'
    ],
    homework: '定义 @LogTime 注解（RUNTIME、METHOD），贴在一个方法上；用反射读取它并打印注解里的 value，再思考如何用动态代理在方法前后计时。'
  };

  G['patterns-creational'] = {
    goals: ['写出线程安全的单例', '用工厂隐藏创建细节', '用建造者解决多参数构造'],
    pitfalls: [
      'DCL 单例漏写 volatile，可能拿到半初始化对象。',
      '工厂里用字符串硬编码类型，写错只能运行时发现。',
      'Builder 忘记校验必填参数。'
    ],
    homework: '分别用双重检查锁和枚举实现单例，用反射尝试破坏私有构造器，观察两种写法的差异；再为一个 6 参数的类写 Builder。'
  };

  G['patterns-behavioral'] = {
    goals: ['用策略替代大量 if-else', '用观察者实现事件通知', '理解动态代理与 AOP 的关系'],
    pitfalls: [
      '策略类里又写长 if-else，等于没抽。',
      '观察者回调里做耗时操作，阻塞主题线程。',
      '对 final 类用 CGLIB 代理，代理失败。'
    ],
    homework: '写一个折扣策略接口和三个实现（无折扣、满减、打折），用 Map 根据用户等级选择策略；再写一个简单的观察者，订单创建时通知邮件和短信两个监听器。'
  };

  G['sql-jdbc'] = {
    goals: ['说清 JDBC 五步与 Driver/Connection/Statement/ResultSet 各自的职责', '用 try-with-resources 按 ResultSet → Statement → Connection 关闭资源', '从连接池借连接，并划清一次事务的边界'],
    pitfalls: [
      '用 Statement 拼接 SQL，既慢又有注入风险。',
      '忘记关闭 ResultSet/Connection，连接池被耗尽。',
      '在循环里反复创建连接，而不是从池里借。',
      '把互为前提的几条 SQL 放在自动提交下执行，失败后留下半条数据。'
    ],
    homework: '用 JDBC 连接 H2 或 MySQL，对已有的 users 表跑完一次查询的五步（取连接 → 预编译 → 绑参 → 取结果 → 关资源），全程 try-with-resources；再把连接换成 HikariCP 连接池，最后加一段 setAutoCommit(false) 的批量插入，故意让第二条失败，确认 rollback 后库里没留残留数据。'
  };

  G['prepared-transaction'] = {
    goals: ['用 PreparedStatement 绑定参数防注入', '用 commit/rollback 控制事务', '理解 ACID 与隔离级别'],
    pitfalls: [
      '异常时只打印不回滚，数据只改了一半。',
      '在事务里调用 HTTP 接口，锁持有时间过长。',
      '用字符串拼接表名/排序字段，参数绑定管不了这些位置。'
    ],
    homework: '用 JDBC 写一个转账：A 扣 100、B 加 100，放在同一事务里；故意让第二步抛异常，验证 rollback 后两边余额都没变。'
  };

  G['http-servlet'] = {
    goals: ['说清一次 HTTP 请求的完整链路', '理解 Servlet 生命周期', '知道 Cookie/Session 如何维持登录态'],
    pitfalls: [
      '在 Servlet 实例字段里存用户名，多个用户互相覆盖。',
      'GET 请求里传密码，出现在 URL 和日志中。',
      '把 Session 当缓存存大对象，内存膨胀。'
    ],
    homework: '用原生 Servlet 写一个 /hello 接口，读取 name 参数返回问候；再写一个 Filter 打印请求耗时，观察执行顺序。'
  };

  G['build-test'] = {
    goals: ['理解 Maven 生命周期与依赖坐标', '用 JUnit 5 写独立可重复的测试', '用依赖树排查版本冲突'],
    pitfalls: [
      '测试依赖数据库/网络，换台机器就失败。',
      '测试之间共享静态状态，执行顺序一变就挂。',
      '用 System.out 判断测试结果，而不是断言。'
    ],
    homework: '为一个计算器类写 5 个 JUnit 测试（正常、边界、异常），用 mvn test 运行；再故意改坏一个方法，确认测试变红。'
  };

  G['ioc-di'] = {
    goals: ['解释控制反转与依赖注入', '用构造器注入组织 Bean', '说清单例 Bean 为什么要无状态'],
    pitfalls: [
      '在 Service 里 new 另一个 Service，绕过容器，事务/代理失效。',
      '单例 Bean 里存用户请求数据，线程不安全。',
      '字段注入导致循环依赖和空指针，优先构造器注入。'
    ],
    homework: '用注解写 OrderService 依赖 PayService 和 OrderRepository，全部用构造器注入；写一个测试直接 new OrderService(mockPay, mockRepo)，验证不启动 Spring 也能测。'
  };

  G['boot-autoconfig'] = {
    goals: ['解释 @SpringBootApplication 的组合注解', '说清自动配置的加载与条件装配', '用 --debug 排查未生效的配置'],
    pitfalls: [
      '自己定义了 DataSource 却奇怪默认配置还生效（检查是否同名/同类型）。',
      '启动类放错包，@ComponentScan 扫不到业务类。',
      '引入 starter 却排除关键依赖，自动配置静默不生效。'
    ],
    homework: '用 --debug 启动一次，找到自动配置报告里 Negative matches 的一项，解释它为什么没生效；再自定义一个 @Bean 覆盖默认配置。'
  };

  G['mvc-flow'] = {
    goals: ['画出 DispatcherServlet 的调度链路', '正确使用 @PathVariable/@RequestParam/@RequestBody', '用 @ControllerAdvice 统一处理异常'],
    pitfalls: [
      'GET 请求用 @RequestBody 接收，前端却放在 URL 上。',
      'Controller 返回 String 以为会转 JSON，结果被当成视图名。',
      '异常没有统一处理，前端收到 500 HTML。'
    ],
    homework: '写一个 /api/books/{id} 接口和 /api/books?name= 查询接口，分别用 @PathVariable 和 @RequestParam；再加一个全局异常处理器，把“图书不存在”转成 404 JSON。'
  };

  G['mybatis-jpa'] = {
    goals: ['用 MyBatis Mapper 写查询', '用 JPA 实体和 Repository 做 CRUD', '理解 @Transactional 失效的常见原因'],
    pitfalls: [
      'MyBatis 的 #{} 写成 ${}，参数直接拼进 SQL，产生注入。',
      'JPA 实体没有无参构造器，框架创建失败。',
      '在 Controller 上写 @Transactional，事务边界过宽。'
    ],
    homework: '分别用 MyBatis 和 Spring Data JPA 实现“按价格区间查图书”，比较两种写法；再写一个会回滚的转账事务，验证异常时数据不变。'
  };

  G['deploy'] = {
    goals: ['用 SLF4J 记录结构化日志', '打出可执行 jar 并启动', '用 Docker 让环境一致'],
    pitfalls: [
      '用 System.out 代替日志，线上无法按级别过滤。',
      '把数据库密码写进代码或提交到 Git。',
      '容器里用 latest 标签，构建结果不可复现。'
    ],
    homework: '为一个 Spring Boot 项目配置 logback 按天滚动、保留 7 天；打出 jar 并用 java -jar 启动；再写一个 Dockerfile 构建镜像并运行。'
  };
})();
