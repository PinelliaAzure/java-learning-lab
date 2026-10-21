/* 精读补充 4：JVM + 反射设计模式 + 数据库 Web + Spring + 项目（20 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['jvm-memory'] = {
    summary: [
      '计数器/栈/本地方法栈线程私有，堆/方法区共享。',
      '栈溢出调 -Xss，堆溢出调 -Xmx 并排查泄漏。',
      '直接内存和元空间是堆外容易忽略的两块。'
    ]
  };

  D['gc'] = {
    summary: [
      'GC 回收的是从 GC Roots 不可达的对象。',
      '新生代复制，老年代标记整理/标记清除。',
      '调优先看日志和监控，别背参数。'
    ]
  };

  D['classloading'] = {
    summary: [
      '准备阶段赋零值，初始化阶段才执行 static 赋值。',
      '类由“加载器 + 全限定名”共同确定唯一性。',
      '双亲委派保证安全，SPI/Tomcat 会按需打破。'
    ]
  };

  D['bytecode-tuning'] = {
    summary: [
      '先测量定位瓶颈，再决定是否调参。',
      'jstack 看线程，jstat 看 GC，jmap 看对象。',
      'JIT 需要预热，压测时别把预热阶段当稳态。'
    ]
  };

  D['reflection'] = {
    summary: [
      'Class 是反射入口，Constructor/Method/Field 是操作对象。',
      '访问私有成员要 setAccessible(true)。',
      '反射慢、破坏封装，业务代码能直调就直调。'
    ]
  };

  D['annotations'] = {
    summary: [
      '注解是元数据，必须有人读取才生效。',
      '运行时读取必须 RUNTIME 保留策略。',
      '自定义注解三步：定义、元注解、处理器。'
    ]
  };

  D['patterns-creational'] = {
    summary: [
      '单例控制实例数量，DCL 必须加 volatile。',
      '工厂把创建细节藏起来，调用方依赖接口。',
      '参数多且可选时用 Builder。'
    ]
  };

  D['patterns-behavioral'] = {
    summary: [
      '策略模式把变化点抽成接口。',
      '观察者用于事件通知，注意回调不要阻塞。',
      '代理是 AOP 的底层，JDK 基于接口，CGLIB 基于继承。'
    ]
  };

  D['sql-jdbc'] = {
    summary: [
      'JDBC 五步：连接、语句、参数、执行、关闭。',
      '永远用 PreparedStatement，不要拼接 SQL。',
      '生产环境必须用连接池。'
    ]
  };

  D['prepared-transaction'] = {
    summary: [
      '事务保证原子性，异常必须 rollback。',
      '事务要短，不要在里面做远程调用。',
      'PreparedStatement 防注入，参数不参与 SQL 解析。'
    ]
  };

  D['http-servlet'] = {
    summary: [
      'HTTP 请求行、头、体，响应状态码、头、体。',
      'Servlet 单例多线程，不要用实例字段存请求数据。',
      '登录态靠 Cookie/Session/Token。'
    ]
  };

  D['build-test'] = {
    summary: [
      'Maven 生命周期有序，后面的阶段自动执行前面的。',
      '测试要独立、快速、不依赖外部环境。',
      '依赖冲突用 dependency:tree 排查。'
    ]
  };

  D['ioc-di'] = {
    summary: [
      'IoC 是控制反转，DI 是依赖注入。',
      '构造器注入最推荐，依赖 final 且便于测试。',
      '单例 Bean 不要保存请求级状态。'
    ]
  };

  D['boot-autoconfig'] = {
    summary: [
      '自动配置 = 候选配置类 + 条件注解筛选。',
      '类路径、已有 Bean、配置项共同决定是否生效。',
      '排查用 --debug 看 Negative matches。'
    ]
  };

  D['mvc-flow'] = {
    summary: [
      '请求先到 DispatcherServlet，再找 HandlerMapping。',
      '路径变量、查询参数、请求体分别用不同注解。',
      '前后端分离时返回值由消息转换器转 JSON。'
    ]
  };

  D['mybatis-jpa'] = {
    summary: [
      'MyBatis 控制 SQL，JPA 控制对象映射。',
      'MyBatis 用 #{}，别用 ${}。',
      '@Transactional 基于代理，自调用会失效。'
    ]
  };

  D['deploy'] = {
    summary: [
      '日志分级、按天滚动，敏感信息不能打印。',
      'Spring Boot 打成 fat jar，java -jar 即可运行。',
      'Docker 保证环境一致，避免“在我机器上能跑”。'
    ]
  };

  D['project-console'] = {
    summary: [
      '分三层：实体、服务、入口，职责清晰。',
      '业务规则放 Service，Main 只做交互。',
      '先跑通主流程，再补校验和持久化。'
    ]
  };

  D['project-spring'] = {
    summary: [
      'Controller 只做协议转换，业务放 Service。',
      'GET 用路径/查询参数，POST 用请求体。',
      '先跑通 HTTP，再接入数据库。'
    ]
  };

  D['sql-basics'] = {
    summary: [
      '查询四件套：SELECT、WHERE、ORDER BY、LIMIT。',
      'UPDATE/DELETE 先写 WHERE，再用 SELECT 验证范围。',
      '主键唯一标识一行，常用查询字段适合建索引。'
    ]
  };
})();
