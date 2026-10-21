/* 新手精讲 4：JVM + 反射注解 + 数据库 Web + Spring（17 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['jvm-memory'] = {
    goals: ['画出 JVM 运行时内存区域', '区分线程私有与共享区域', '根据报错定位是堆、栈还是元空间'],
    flow: '内存区域决定报错类型：<b>堆 → OutOfMemoryError，栈 → StackOverflowError，元空间 → Metaspace OOM</b>。',
    sections: [
      { h: '线程私有的三块', p: '程序计数器记录当前字节码行号；虚拟机栈为每个方法压入栈帧（局部变量、操作数栈）；本地方法栈服务 native 方法。线程结束就释放。' },
      { h: '线程共享的两块', p: '堆存所有 new 出来的对象，是 GC 主战场；方法区（JDK 8+ 由元空间实现）存类元数据、常量、静态变量。' },
      { h: '堆外还有直接内存', p: 'NIO 的 DirectByteBuffer 分配在堆外，不受 -Xmx 限制但受物理内存限制。大量 Netty/NIO 应用要单独关注。' }
    ],
    pitfalls: [
      '把 StackOverflowError 当成内存不足去调大 -Xmx。',
      '无限创建对象却只看栈，忽略堆和 GC 日志。',
      '以为元空间属于堆，用 -Xmx 去限制它。'
    ],
    homework: '用一段无限递归触发 StackOverflowError，再用一个不断 add byte[] 的循环触发 heap OOM；分别用 -Xss 和 -Xmx 调整参数复现。'
  };

  G['gc'] = {
    goals: ['解释可达性分析与 GC Roots', '说清新生代/老年代回收流程', '知道 G1 与常见收集器的差异'],
    flow: 'GC 只回收“从 GC Roots 走不到”的对象；分代假说让新对象在 Eden 快速回收，活下来的晋升老年代。',
    sections: [
      { h: '怎么判断垃圾', p: '从栈引用、静态变量、JNI 引用等 GC Roots 出发做可达性分析，走不到的对象才可回收。引用计数无法处理循环引用，所以不用它。' },
      { h: '一次 Minor GC', p: 'Eden 满了触发 Minor GC，存活对象复制到 Survivor，年龄加一；年龄到阈值或大对象直接进老年代。老年代满了触发 Full GC，停顿更长。' },
      { h: '收集器怎么选', p: 'JDK 9+ 默认 G1，按 Region 管理、可设目标停顿；ZGC/Shenandoah 追求超低停顿。调优先看 GC 日志和监控，不要背参数。' }
    ],
    pitfalls: [
      '频繁 Full GC 却只调大堆，不查内存泄漏。',
      '把 System.gc() 当常规手段，触发不必要的停顿。',
      '用 -Xmn 过小导致对象过早晋升。'
    ],
    homework: '用 -Xlog:gc* 打印一次程序运行的 GC 日志，找出 Minor GC 次数、耗时和每次回收后的堆占用；再用 jcmd GC.heap_info 查看堆分区。'
  };

  G['classloading'] = {
    goals: ['说出类加载五个阶段', '解释双亲委派的作用', '理解 Class.forName 与 ClassLoader 的区别'],
    flow: '类加载 = <b>加载 → 验证 → 准备 → 解析 → 初始化</b>；双亲委派保证核心类安全、避免重复加载。',
    sections: [
      { h: '准备阶段赋的是零值', p: 'static int x = 10 在准备阶段只是 0，真正的 10 在初始化阶段执行 <clinit> 时赋值。static final 常量在编译期就写进常量池。' },
      { h: '双亲委派怎么走', p: '收到加载请求先交给父加载器，父加载不了才自己加载。Bootstrap 负责 java.lang.*，Application 负责 classpath；同一个类由“加载器 + 全限定名”共同确定。' },
      { h: '什么时候初始化', p: 'new、访问静态字段/方法、反射 Class.forName、初始化子类时触发；声明数组不会初始化元素类。' }
    ],
    pitfalls: [
      '以为 Class.forName 只加载不初始化（默认会初始化）。',
      '自定义类加载器破坏双亲委派却不理解后果。',
      '把静态变量的声明值当成准备阶段就赋好。'
    ],
    homework: '写一个带 static 代码块的类，分别用 new、Class.forName、声明数组三种方式触发，打印 static 块执行次数。'
  };

  G['bytecode-tuning'] = {
    goals: ['看懂 javap 反汇编的基本指令', '解释解释执行与 JIT 的分工', '按“测量 → 定位 → 再调参”的顺序排查性能'],
    flow: 'JVM 先解释执行，热点代码由 JIT 编译成本地机器码；调优的本质是<b>找瓶颈</b>，不是背参数。',
    sections: [
      { h: '字节码长什么样', p: 'javap -c 能看到方法里的 load/store、算术、invoke、return 指令。局部变量表和操作数栈是栈帧的核心，理解它们有助于看懂 JIT 优化。' },
      { h: 'JIT 做了哪些优化', p: '方法内联、逃逸分析、锁消除、常量折叠。热点方法由 C1/C2 编译，冷代码继续解释执行；这也是“预热”重要性的来源。' },
      { h: '排查顺序', p: '先压测确认 CPU/内存/IO/锁哪类瓶颈，再看 GC 日志和线程栈，最后才调 JVM 参数。线上优先用 jcmd/jstack 这类低开销工具。' }
    ],
    pitfalls: [
      '一上来就调 -Xmx，掩盖了内存泄漏。',
      '用 jmap -histo:live 频繁触发 Full GC。',
      '把 JIT 预热阶段的性能当成稳态性能。'
    ],
    homework: '写一个简单类，用 javap -c 查看方法字节码；再用 jps + jstack 观察一个死循环线程的栈，找出它卡在哪一行。'
  };

  G['reflection'] = {
    goals: ['用三种方式拿到 Class 对象', '反射创建对象、调用方法和访问字段', '说清反射的代价与适用场景'],
    flow: '反射让程序在运行时“看见并操作”类：<b>Class → Constructor/Method/Field → invoke/get/set</b>。',
    sections: [
      { h: 'Class 是入口', p: 'Class.forName("全限定名") 会加载并初始化类；obj.getClass() 和 User.class 不会触发初始化。同一个类加载器下，一个类只有一个 Class 对象。' },
      { h: '访问私有成员', p: 'getDeclaredXxx 能拿到私有成员，调用前要 setAccessible(true) 关闭访问检查。模块化（JPMS）下可能被拒绝。' },
      { h: '代价', p: '反射绕过编译期检查、性能低于直接调用、破坏封装。框架用它做通用逻辑，业务代码能直调就直调。' }
    ],
    pitfalls: [
      'Class.forName 传错包名，抛 ClassNotFoundException。',
      '对私有方法不 setAccessible 就 invoke，抛 IllegalAccessException。',
      '把反射当万能工具，代码可读性和性能都变差。'
    ],
    homework: '写一个工具方法，传入任意对象，用反射打印它的所有字段名和值；再反射调用一个私有方法并修改一个私有字段。'
  };

  G['annotations'] = {
    goals: ['定义带属性的注解', '正确设置 Retention 与 Target', '在运行时读取注解并产生行为'],
    flow: '注解只是<b>贴在代码上的标签</b>；真正干活的是反射、AOP 或编译期处理器。',
    sections: [
      { h: '定义注解', p: '用 @interface 声明，属性写成方法并提供默认值。@Retention(RUNTIME) 才能被反射读到，@Target 限制能贴的位置。' },
      { h: '处理注解', p: '运行时用 getAnnotation 读取，Spring 据此生成代理或注册 Bean；编译期处理器（Lombok、MapStruct）在编译时生成代码。' },
      { h: '常见内置注解', p: '@Override 让编译器检查重写，@Deprecated 标记过时，@SuppressWarnings 抑制警告，@FunctionalInterface 校验函数式接口。' }
    ],
    pitfalls: [
      'Retention 用默认 CLASS，运行时 getAnnotation 返回 null。',
      '@Target 漏写 METHOD，贴到方法上编译报错。',
      '以为加了注解就自动生效，其实没有处理器。'
    ],
    homework: '定义 @LogTime 注解（RUNTIME、METHOD），贴在一个方法上；用反射读取它并打印注解里的 value，再思考如何用动态代理在方法前后计时。'
  };

  G['patterns-creational'] = {
    goals: ['写出线程安全的单例', '用工厂隐藏创建细节', '用建造者解决多参数构造'],
    flow: '创建型模式解决“对象怎么造”：<b>单例控制数量，工厂解耦创建，建造者解决参数爆炸</b>。',
    sections: [
      { h: '单例的三种写法', p: '饿汉式简单但可能浪费；双重检查锁要加 volatile 防止重排；枚举单例最简、天然防反射和序列化破坏。' },
      { h: '工厂', p: '把 new 的细节藏到工厂里，按参数返回不同实现。Spring 的 BeanFactory 就是工厂，调用方只依赖接口。' },
      { h: '建造者', p: '参数多、可选参数多时，用链式调用逐步构建，最后 build。Lombok 的 @Builder 就是它的自动化版本。' }
    ],
    pitfalls: [
      'DCL 单例漏写 volatile，可能拿到半初始化对象。',
      '工厂里用字符串硬编码类型，写错只能运行时发现。',
      'Builder 忘记校验必填参数。'
    ],
    homework: '分别用双重检查锁和枚举实现单例，用反射尝试破坏私有构造器，观察两种写法的差异；再为一个 6 参数的类写 Builder。'
  };

  G['patterns-behavioral'] = {
    goals: ['用策略替代大量 if-else', '用观察者实现事件通知', '理解动态代理与 AOP 的关系'],
    flow: '行为型模式关注“对象怎么协作”：<b>策略换算法，观察者发通知，代理做增强</b>。',
    sections: [
      { h: '策略', p: '把一组算法封装成同一接口，运行时注入。支付方式、折扣规则、排序规则都适合；新增算法只需加类，不改调用方。' },
      { h: '观察者', p: '主题维护监听器列表，状态变化时逐个回调。Spring 的 ApplicationEvent、消息队列都是它的变体。' },
      { h: '代理与 AOP', p: 'JDK 动态代理基于接口，CGLIB 基于继承；Spring AOP 在方法前后织入日志、事务、权限，业务代码保持干净。' }
    ],
    pitfalls: [
      '策略类里又写长 if-else，等于没抽。',
      '观察者回调里做耗时操作，阻塞主题线程。',
      '对 final 类用 CGLIB 代理，代理失败。'
    ],
    homework: '写一个折扣策略接口和三个实现（无折扣、满减、打折），用 Map 根据用户等级选择策略；再写一个简单的观察者，订单创建时通知邮件和短信两个监听器。'
  };

  G['sql-jdbc'] = {
    goals: ['用 JDBC 完成一次查询', '正确关闭 Connection/Statement/ResultSet', '理解连接池的作用'],
    flow: 'JDBC 五步：<b>拿连接 → 建语句 → 设参数 → 执行取结果 → 关闭资源</b>。',
    sections: [
      { h: '面向接口编程', p: 'Connection、PreparedStatement、ResultSet 都是接口，具体实现由数据库驱动提供。换数据库只需换驱动和 URL。' },
      { h: 'ResultSet 是游标', p: '初始指向第一行之前，next() 移到下一行并返回是否有数据；按列名或下标取值。遍历完必须关闭。' },
      { h: '连接池', p: '创建连接代价高，HikariCP/Druid 预先建好连接复用。配置最大连接数、超时和泄漏检测，比每次 DriverManager.getConnection 快得多。' }
    ],
    pitfalls: [
      '用 Statement 拼接 SQL，既慢又有注入风险。',
      '忘记关闭 ResultSet/Connection，连接池被耗尽。',
      '在循环里反复创建连接。'
    ],
    homework: '用 JDBC 连接 H2 或 MySQL，建一张 user 表，完成插入一条、按 id 查询、更新、删除；全程使用 try-with-resources。'
  };

  G['prepared-transaction'] = {
    goals: ['用 PreparedStatement 绑定参数防注入', '用 commit/rollback 控制事务', '理解 ACID 与隔离级别'],
    flow: '事务保证一组操作<b>要么全成功、要么全回滚</b>；PreparedStatement 让参数只作为值，不参与 SQL 语法解析。',
    sections: [
      { h: '注入是怎么发生的', p: '拼接字符串时，用户输入一个单引号再加 OR 条件，就可能把条件改成永真。预编译后 SQL 结构固定，参数再古怪也只当成值。' },
      { h: '手动事务', p: 'setAutoCommit(false) 开启事务，全部成功 commit，捕获异常 rollback，finally 恢复 autoCommit。事务要短，不要在里面做远程调用。' },
      { h: '隔离级别', p: 'READ COMMITTED 解决脏读，REPEATABLE READ 解决不可重复读，SERIALIZABLE 最高但并发最差。级别越高一致性越强、吞吐越低。' }
    ],
    pitfalls: [
      '异常时只打印不回滚，数据只改了一半。',
      '在事务里调用 HTTP 接口，锁持有时间过长。',
      '用字符串拼接表名/排序字段，参数绑定管不了这些位置。'
    ],
    homework: '用 JDBC 写一个转账：A 扣 100、B 加 100，放在同一事务里；故意让第二步抛异常，验证 rollback 后两边余额都没变。'
  };

  G['http-servlet'] = {
    goals: ['说清一次 HTTP 请求的完整链路', '理解 Servlet 生命周期', '知道 Cookie/Session 如何维持登录态'],
    flow: '浏览器 → DNS/TCP → Tomcat → Filter → Servlet → 业务 → 响应；HTTP 本身无状态，靠 Cookie/Session/Token 记住用户。',
    sections: [
      { h: 'HTTP 的组成', p: '请求行（方法 + 路径）、请求头、请求体；响应行（状态码）、响应头、响应体。GET 参数在 URL，POST 数据在请求体。' },
      { h: 'Servlet 是单例多线程', p: '容器只创建一个 Servlet 实例，多个请求线程共享它。所以不要在实例字段里保存请求级数据，否则会串号。' },
      { h: '登录态怎么保持', p: '服务端创建 Session，浏览器保存 JSESSIONID Cookie，每次请求带上；前后端分离更常用 JWT，把身份信息签名后放在请求头。' }
    ],
    pitfalls: [
      '在 Servlet 实例字段里存用户名，多个用户互相覆盖。',
      'GET 请求里传密码，出现在 URL 和日志中。',
      '把 Session 当缓存存大对象，内存膨胀。'
    ],
    homework: '用原生 Servlet 写一个 /hello 接口，读取 name 参数返回问候；再写一个 Filter 打印请求耗时，观察执行顺序。'
  };

  G['build-test'] = {
    goals: ['理解 Maven 生命周期与依赖坐标', '用 JUnit 5 写独立可重复的测试', '用依赖树排查版本冲突'],
    flow: 'Maven 按<b>约定</b>组织项目，执行后面的阶段会自动执行前面的阶段；JUnit 让每次改动都能快速回归。',
    sections: [
      { h: '坐标与目录', p: 'groupId/artifactId/version 唯一确定一个依赖；src/main/java 放主代码，src/test/java 放测试，target 是构建产物。' },
      { h: '生命周期', p: 'validate → compile → test → package → verify → install → deploy。mvn package 会先编译并跑测试，测试失败就中断。' },
      { h: '依赖冲突', p: 'Maven 按最短路径优先、先声明优先调解版本。mvn dependency:tree 看完整依赖树，排除冲突用 exclusions。' }
    ],
    pitfalls: [
      '测试依赖数据库/网络，换台机器就失败。',
      '测试之间共享静态状态，执行顺序一变就挂。',
      '用 System.out 判断测试结果，而不是断言。'
    ],
    homework: '为一个计算器类写 5 个 JUnit 测试（正常、边界、异常），用 mvn test 运行；再故意改坏一个方法，确认测试变红。'
  };

  G['ioc-di'] = {
    goals: ['解释控制反转与依赖注入', '用构造器注入组织 Bean', '说清单例 Bean 为什么要无状态'],
    flow: '对象不再自己 new 依赖，而是<b>声明需要什么</b>，由 Spring 容器创建并注入。',
    sections: [
      { h: 'IoC 与 DI', p: 'IoC 是把创建权交给容器；DI 是容器把依赖传进来。构造器注入最推荐：依赖 final、不为空、测试可直接传 mock。' },
      { h: 'Bean 与作用域', p: '默认 singleton，整个容器一个实例；prototype 每次获取新建。单例 Bean 必须无状态，否则并发请求会串数据。' },
      { h: '注解分工', p: '@Component/@Service/@Repository/@Controller 标记 Bean；@Autowired 注入；@Configuration + @Bean 注册第三方类。' }
    ],
    pitfalls: [
      '在 Service 里 new 另一个 Service，绕过容器，事务/代理失效。',
      '单例 Bean 里存用户请求数据，线程不安全。',
      '字段注入导致循环依赖和空指针，优先构造器注入。'
    ],
    homework: '用注解写 OrderService 依赖 PayService 和 OrderRepository，全部用构造器注入；写一个测试直接 new OrderService(mockPay, mockRepo)，验证不启动 Spring 也能测。'
  };

  G['boot-autoconfig'] = {
    goals: ['解释 @SpringBootApplication 的组合注解', '说清自动配置的加载与条件装配', '用 --debug 排查未生效的配置'],
    flow: '启动时读取 AutoConfiguration.imports，按<b>类路径 + 已有 Bean + 配置项</b>三个条件筛选，符合条件的配置类才注册 Bean。',
    sections: [
      { h: '组合注解', p: '@SpringBootApplication = @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan，分别负责配置类、自动配置、包扫描。' },
      { h: '条件注解', p: '@ConditionalOnClass 类路径有才生效；@ConditionalOnMissingBean 用户没定义才注册默认值；@ConditionalOnProperty 配置开关打开才生效。' },
      { h: 'Starter 只是依赖聚合', p: 'spring-boot-starter-web 带来 MVC、Tomcat、Jackson；自动配置发现这些类，才创建对应的 Bean。' }
    ],
    pitfalls: [
      '自己定义了 DataSource 却奇怪默认配置还生效（检查是否同名/同类型）。',
      '启动类放错包，@ComponentScan 扫不到业务类。',
      '引入 starter 却排除关键依赖，自动配置静默不生效。'
    ],
    homework: '用 --debug 启动一次，找到自动配置报告里 Negative matches 的一项，解释它为什么没生效；再自定义一个 @Bean 覆盖默认配置。'
  };

  G['mvc-flow'] = {
    goals: ['画出 DispatcherServlet 的调度链路', '正确使用 @PathVariable/@RequestParam/@RequestBody', '用 @ControllerAdvice 统一处理异常'],
    flow: '请求进入 DispatcherServlet → HandlerMapping 找方法 → HandlerAdapter 绑定参数并调用 → 返回值由消息转换器写回。',
    sections: [
      { h: '三个核心组件', p: 'HandlerMapping 负责“找谁处理”，HandlerAdapter 负责“怎么调用”，HttpMessageConverter 负责“怎么把对象变成 JSON”。' },
      { h: '参数注解别用混', p: '路径变量用 @PathVariable，查询参数用 @RequestParam，请求体用 @RequestBody，请求头用 @RequestHeader。用错会得到 null 或 400。' },
      { h: '统一异常', p: '@RestControllerAdvice + @ExceptionHandler 把业务异常转成统一 JSON 错误结构，避免把堆栈直接暴露给前端。' }
    ],
    pitfalls: [
      'GET 请求用 @RequestBody 接收，前端却放在 URL 上。',
      'Controller 返回 String 以为会转 JSON，结果被当成视图名。',
      '异常没有统一处理，前端收到 500 HTML。'
    ],
    homework: '写一个 /api/books/{id} 接口和 /api/books?name= 查询接口，分别用 @PathVariable 和 @RequestParam；再加一个全局异常处理器，把“图书不存在”转成 404 JSON。'
  };

  G['mybatis-jpa'] = {
    goals: ['用 MyBatis Mapper 写查询', '用 JPA 实体和 Repository 做 CRUD', '理解 @Transactional 失效的常见原因'],
    flow: 'MyBatis 手写 SQL、控制力强；JPA 用对象映射、开发快。两者最终都落到 JDBC。',
    sections: [
      { h: 'MyBatis 的工作方式', p: 'Mapper 接口只声明方法，SQL 写在注解或 XML；MyBatis 运行时生成代理，把参数绑定到 SQL、把结果映射成对象。' },
      { h: 'JPA 的工作方式', p: '@Entity 映射表，JpaRepository 提供 CRUD 和派生查询；复杂查询用 @Query 写 JPQL，再复杂就退回原生 SQL。' },
      { h: '事务为什么失效', p: '@Transactional 基于代理，同类内部 this.method() 不经过代理；非 public 方法、异常被吞掉、数据库引擎不支持事务，也都会导致失效。' }
    ],
    pitfalls: [
      'MyBatis 的 #{} 写成 ${}，参数直接拼进 SQL，产生注入。',
      'JPA 实体没有无参构造器，框架创建失败。',
      '在 Controller 上写 @Transactional，事务边界过宽。'
    ],
    homework: '分别用 MyBatis 和 Spring Data JPA 实现“按价格区间查图书”，比较两种写法；再写一个会回滚的转账事务，验证异常时数据不变。'
  };

  G['deploy'] = {
    goals: ['用 SLF4J 记录结构化日志', '打出可执行 jar 并启动', '用 Docker 让环境一致'],
    flow: '开发完成只是开始：<b>日志能排查、jar 能交付、容器能复现环境</b>，才算真正上线。',
    sections: [
      { h: '日志级别怎么用', p: 'ERROR 需要人处理，WARN 可能有问题，INFO 记录关键流程，DEBUG 给调试。生产默认 INFO，敏感信息（密码、身份证）绝不能进日志。' },
      { h: '可执行 jar', p: 'spring-boot-maven-plugin 把依赖和内嵌 Tomcat 打进 fat jar，java -jar app.jar 即可启动；配置用 --spring.profiles.active 区分环境。' },
      { h: '容器化', p: 'Dockerfile 基于 eclipse-temurin 镜像，COPY jar 后 ENTRYPOINT 启动；镜像保证开发、测试、生产环境一致，K8s 负责扩缩容和滚动发布。' }
    ],
    pitfalls: [
      '用 System.out 代替日志，线上无法按级别过滤。',
      '把数据库密码写进代码或提交到 Git。',
      '容器里用 latest 标签，构建结果不可复现。'
    ],
    homework: '为一个 Spring Boot 项目配置 logback 按天滚动、保留 7 天；打出 jar 并用 java -jar 启动；再写一个 Dockerfile 构建镜像并运行。'
  };
})();
