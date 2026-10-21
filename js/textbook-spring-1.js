/* 教材正文：Spring 生态（IoC / 自动配置 / MVC / 数据访问 / 部署，每章约 6000 字） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['ioc-di'] = {
    meta: '本章约 10000 字 · 建议 40 分钟 · 含 3 张表、1 张流程图与 7 段代码',
    blocks: [

      { h: '1.1 为什么先学 IoC：从一行 new 说起' },
      { p: '假设你在写一个下单功能。OrderService 需要 PayService 扣款、OrderRepository 存订单、InventoryService 扣库存、MailService 发通知。最直觉的写法，是在每个类里自己把需要的对象 new 出来：<code>this.payService = new PayService();</code>。程序能跑，代码也不长，看起来没有任何问题。' },
      { p: '但只要需求动一下，代价就来了。PayService 的构造器多加一个参数，所有 new 它的地方都要跟着改；测试时想换成一个不会真正扣钱的假实现，却发现 new 写死在类内部，根本换不掉；两个 Service 各自 new 了一个 OrderRepository，于是内存里出现好几份承担同一职责的对象，缓存和计数器全部对不上。' },
      { p: '这些问题的共同根源，是“谁来创建依赖、谁来组装对象”这件事被分散写在了业务代码里。IoC（Inversion of Control，控制反转）要做的，就是把这件事从业务代码中抽出去，交给一个统一的容器。业务代码只声明“我需要一个 PayService”，不再关心它怎么被造出来、什么时候被造出来、用完怎么销毁。' },
      { p: '一个真实的例子：某项目的 OrderService 在构造器里直接 new 了四个依赖，而 MailService 又 new 了 TemplateEngine，TemplateEngine 又在构造时读取配置目录。结果是，想测一个简单的金额计算，测试必须先准备好邮件服务器地址和模板路径，否则对象连构造都完不成。很多“测试成本高到没人愿意写测试”的项目，起点就是这几行看起来无害的 new。' },
      { p: 'Spring 出现之前，企业级 Java 用 EJB，业务类必须继承框架基类、实现生命周期接口，连测试都要跑在容器里。Spring 当年的卖点正是“普通 Java 对象也能被容器管理”，不强迫你继承任何东西。理解这段历史，就能明白为什么“POJO 加注入”会被反复强调。' },
      { note: '<b>先记住一句话：</b>IoC 是一种设计原则，不是某个框架的专利。Spring 只是把它做成了一套开箱即用的容器实现。' },

      { h: '1.2 反转的到底是哪几项控制权' },
      { p: '传统写法里，一个对象对它的依赖握有三项控制权：创建（new 出来）、装配（把依赖放进字段或构造器）、生命周期（什么时候创建、什么时候销毁）。IoC 把这三项全部收走：容器负责创建，容器负责按声明装配，容器负责在关闭时回调销毁方法。你从“主动找零件的人”变成了“提交零件清单的人”。' },
      { p: '软件工程里有一个形象的说法叫“好莱坞原则”：Don\u0027t call us, we will call you。翻成中文就是“别来找我们，我们会找你”。对应到代码上：你不要主动去 new 依赖，容器在合适的时机把准备好的依赖递给你。' },
      { p: '换一个角度理解“反转”：以前是代码控制流程，代码说“我现在要一个支付对象”，于是自己造一个；现在控制权到了容器手里，容器读完声明后说“这个类需要一个支付对象，我把它送进去”。代码从“指挥者”变成了“被装配者”，这就是“反转”二字的由来，也是它和“自己动手”最本质的区别。' },
      { p: '还有一层容易被忽略：反转的不只是“创建权”，还有“装配权”。对象之间的依赖关系从代码里搬到了配置或注解里，容器成了唯一的装配者。依赖关系集中后，才可能出现“统一加事务、统一加日志”这类能力。' },
      { p: 'IoC 有两种落地方式。第一种是<b>依赖注入</b>（Dependency Injection，简称 DI），容器把依赖从外部传进来，业务类被动接收；第二种是<b>依赖查找</b>（Dependency Lookup），业务类主动向容器要对象，例如 <code>context.getBean(UserService.class)</code>。日常开发应该只用注入，因为 getBean 会把业务类和容器 API 绑死，单元测试时还得先造一个容器。' },
      { p: '依赖查找并非一无是处。框架内部、命令行工具、以及需要按名字动态选择实现的场景，仍然会用到它。判断标准很简单：这段代码是不是业务逻辑？是，就用注入；不是，才考虑查找。把这条标准记住，就不会在 Service 里写出 getBean 这种把容器当全局变量的代码。' },
      { p: '面试里常问“IoC 和 DI 是什么关系”。IoC 是设计思想，DI 是它最主流的实现方式；除了 DI，还有依赖查找。回答时说清“思想与实现”的区别，比背定义更有说服力。' },
      { p: '很多人把 IoC 和 DI 当成同义词，严格说二者是目标与手段的关系：IoC 是“控制权转移”这个目标，DI 是实现这个目标最常用的手段。面试时能说清这层关系，比背定义更有说服力。' },

      { h: '1.3 容器到底是什么' },
      { p: 'Spring 的容器本质上是一个“对象登记处 + 装配流水线”。最底层的接口是 BeanFactory，负责按名称或类型取出 Bean；日常使用的是它的子接口 ApplicationContext，在 BeanFactory 之上额外提供了事件发布、国际化消息、资源加载、自动注册 BeanPostProcessor 等能力。' },
      { p: 'ApplicationContext 有多个实现：AnnotationConfigApplicationContext 用于注解配置，ClassPathXmlApplicationContext 用于 XML 配置，Spring Boot 启动时用的是 AnnotationConfigServletWebServerApplicationContext（Web 场景）或它的非 Web 版本。名字很长，但职责都一样：装载配置、创建 Bean、管理生命周期。' },
      { p: '容器并不是一启动就把所有对象都 new 出来。启动时它先读配置（注解或 XML），把每个 Bean 的“图纸”解析成 BeanDefinition：类名、作用域、构造器参数、依赖关系、初始化方法、是否懒加载。图纸收齐之后，才按依赖顺序实例化、注入、初始化，最后把单例放进单例池。' },
      { p: '理解“图纸”和“实例”的区别非常重要。<code>@Service</code> 只是给类贴了一张“可以被扫描”的标签，真正让对象诞生的是容器在刷新阶段执行的实例化流程。这也解释了一个高频疑问：为什么我在 new 出来的对象里，<code>@Autowired</code> 的字段是 null？因为那个对象根本没有经过容器，自然没有人替它注入。' },
      { p: '容器启动失败时，日志里最常见的关键词是 BeanCreationException 和 UnsatisfiedDependencyException。前者说明某个 Bean 在创建过程中出错，后者说明它的某个依赖没有被找到。顺着异常里的 bean 名称和类名往下看，通常一两层就能定位到具体字段，比通读整个启动日志快得多。' },
      { code: 'import org.springframework.context.annotation.AnnotationConfigApplicationContext;\n\npublic class Main {\n    public static void main(String[] args) {\n        // try-with-resources：退出时自动 close，触发销毁回调\n        try (AnnotationConfigApplicationContext ctx =\n                 new AnnotationConfigApplicationContext(AppConfig.class)) {\n            OrderService orderService = ctx.getBean(OrderService.class);\n            orderService.checkout();\n        }\n    }\n}', title: 'Main.java' },
      { out: '容器已启动\n支付 99.00' },

      { h: '1.4 把 Bean 注册进容器：两条路' },
      { p: '第一条路是组件扫描：自己写的类加上 <code>@Component</code>、<code>@Service</code>、<code>@Repository</code>、<code>@Controller</code>，容器扫描到就注册。注解本身不带任何逻辑，它只是给扫描器看的标记。' },
      { p: '第二条路是 <code>@Configuration</code> 加 <code>@Bean</code>，用于第三方类：连接池、RestTemplate、ObjectMapper 这些都是别人的代码，你没法给它们加注解，就在配置类里写一个返回该对象的方法，方法名默认就是 Bean 名称。' },
      { p: '@Bean 方法本身也可以带参数，容器会按类型自动注入。例如 dataSource(DataSourceProperties props) 这种写法，参数由容器提供，不需要自己 new。这样配置类就能把“读配置”和“建对象”串起来，代码也更短。' },
      { code: '@Configuration\npublic class DataSourceConfig {\n\n    @Bean\n    public DataSource dataSource() {\n        HikariDataSource ds = new HikariDataSource();\n        ds.setJdbcUrl("jdbc:mysql://localhost:3306/shop");\n        ds.setUsername("app");\n        ds.setPassword(System.getenv("DB_PASSWORD"));\n        ds.setMaximumPoolSize(10);\n        return ds;\n    }\n}', title: 'DataSourceConfig.java' },
      { p: '这里有个容易踩的坑：<code>@Configuration</code> 类在运行时会被 CGLIB 增强，保证 <code>@Bean</code> 方法之间互相调用时返回同一个实例，这叫 full 模式。如果只加 <code>@Component</code> 而不加 <code>@Configuration</code>，方法之间的调用会真的执行两次，可能造出两个连接池。' },
      { p: 'Bean 的名称默认是类名首字母小写（OrderService 对应 orderService）。需要改名时用 <code>@Service("orderSvc")</code> 或 <code>@Bean("orderSvc")</code>。当同一类型有多个 Bean 时，注入需要靠名称或 <code>@Qualifier</code> 区分，否则容器会抛 NoUniqueBeanDefinitionException。' },

      { h: '1.5 第一个可运行的例子' },
      { p: '下面三个类构成一个最小工程：PayService 提供支付能力，OrderService 依赖它，AppConfig 负责开启组件扫描。请特别注意，OrderService 里没有一行 new PayService。' },
      { code: 'package com.example.shop;\n\nimport org.springframework.stereotype.Service;\nimport java.math.BigDecimal;\n\n@Service\npublic class PayService {\n    public void pay(BigDecimal amount) {\n        System.out.println("支付 " + amount);\n    }\n}', title: 'PayService.java' },
      { code: 'package com.example.shop;\n\nimport org.springframework.stereotype.Service;\n\n@Service\npublic class OrderService {\n    private final PayService payService;\n\n    // 只有一个构造器时，@Autowired 可以省略\n    public OrderService(PayService payService) {\n        this.payService = payService;\n    }\n\n    public void checkout() {\n        payService.pay(new java.math.BigDecimal("99.00"));\n    }\n}', title: 'OrderService.java' },
      { code: 'package com.example.shop;\n\nimport org.springframework.context.annotation.ComponentScan;\nimport org.springframework.context.annotation.Configuration;\n\n@Configuration\n@ComponentScan("com.example.shop")   // 扫描本包及子包\npublic class AppConfig {\n}', title: 'AppConfig.java' },
      { p: '几点说明。第一，<code>@Service</code> 是 <code>@Component</code> 的特化，语义上表示业务层；<code>@Repository</code> 表示数据访问层，<code>@Controller</code> 表示 Web 层。四者功能相同，区别只在可读性和分层约定。' },
      { p: '第二，<code>@ComponentScan</code> 告诉容器去哪个包下找带注解的类，不写值时默认扫描配置类所在包及其子包。第三，Spring 4.3 之后，如果一个类只有一个构造器，<code>@Autowired</code> 可以省略，容器会自动使用它完成注入，这也是现在最推荐的写法。' },
      { p: '把程序跑起来，输出顺序是先“容器已启动”再“支付 99.00”。如果你把 OrderService 上的 @Service 删掉，getBean 会抛 NoSuchBeanDefinitionException；这就是排查问题的第一条线索：Bean 到底有没有被注册。' },
      { p: '实际项目里，包结构建议按业务划分（order、pay、user），而不是按技术分层（controller、service、dao）。按业务分包时，一个功能的类聚在一起，扫描范围清晰，后续要拆成独立模块也更容易；按技术分层则容易出现一个包下几十个类、改一个功能要跳好几个目录的情况。' },

      { h: '1.6 三种注入方式与为什么推荐构造器注入' },
      { p: 'Spring 支持三种把依赖送进来的姿势：构造器注入、Setter 注入、字段注入。它们都能让程序跑起来，但在可测试性、不可变性和错误暴露程度上差别很大。' },
      { table: { head: ['方式', '写法', '优点', '缺点'], rows: [
        ['构造器注入', '依赖写在构造器参数上，字段声明为 final', '依赖不可变、创建即完整、测试无需容器', '参数过多时构造器很长；循环依赖无法解决'],
        ['Setter 注入', '为每个依赖写 set 方法并加 @Autowired', '可以后期替换，适合可选依赖', '对象可能处于半成品状态，依赖可能为 null'],
        ['字段注入', '直接在字段上写 @Autowired', '代码最短，教程最常见', '无法 final、脱离容器不可用、隐藏依赖关系']
      ] } },
      { p: '字段注入之所以在教程里泛滥，是因为它看起来最省事。但它有三个硬伤：字段不能声明为 final，对象创建完依赖仍可能为空；一旦脱离容器，这个类就无法正常构造，单元测试必须启动 Spring 或者用反射硬塞；依赖关系藏在类内部，从构造器签名完全看不出这个类到底需要什么。' },
      { p: '还有一个常被忽略的差异：字段注入无法注入 final 字段，也无法在构造器里做依赖合法性校验。比如支付渠道必须非空，构造器注入可以直接写 if (payService == null) throw new IllegalStateException(...)，字段注入只能等到真正调用那一行才发现问题，错误暴露得更晚。' },
      { p: 'Setter 注入适合“可选依赖”和“需要运行时重新设置”的场景，比如一个可以热切换的短信通道。代价是对象在构造完成之后还可能处于不完整状态，调用方必须记得先 set 再 use。' },
      { list: [
        '<b>依赖不为空：</b>对象一旦创建成功，所有必需依赖都已就位，不会出现调用时才 NullPointerException。',
        '<b>依赖不可变：</b>字段声明为 final，编译期就禁止重新赋值，线程安全多一层保障。',
        '<b>便于测试：</b>不用启动容器，直接传 mock 或假实现，测试启动时间从几秒降到几毫秒。',
        '<b>暴露设计问题：</b>构造器参数越来越多，说明这个类承担的职责太多，该拆了。'
      ] },
      { p: '落到代码上就是 <code>new OrderService(new FakePayService())</code>：测试时一行构造，不需要启动 Spring 上下文。上面这些好处叠加起来，就是官方推荐构造器注入的全部理由。' },
      { p: '构造器注入还有一个“副作用”值得知道：两个单例 Bean 用构造器互相依赖时，容器无法先造出任何一个，会抛 BeanCurrentlyInCreationException。这不是框架的缺陷，而是设计在提醒你：这两个类的职责纠缠在一起了，应该抽出第三个类，或者改用事件解耦。' },
      { p: '字段注入能靠 Spring 的三级缓存把循环依赖“糊”过去，但问题只是被藏起来，运行时的行为依然难以预测。所以看到循环依赖报错，第一反应应该是调整设计，而不是去搜“如何开启循环依赖”。' },
      { p: '顺便说清“三级缓存”是什么。Spring 用 singletonObjects、earlySingletonObjects、singletonFactories 三层 Map，提前暴露“刚实例化但还没注入属性”的对象，让字段注入的循环依赖能够完成装配。它解决的是“能不能启动”，而不是“设计是否合理”，所以不要把“能跑”当成“没问题”。' },
      { p: '如果确实需要延迟获取依赖，可以注入 <code>ObjectProvider&lt;PayService&gt;</code>，调用 <code>getObject()</code> 时才真正向容器要实例。这样既保留了构造器注入的整洁，又避免了启动期的强依赖。' },

      { h: '1.7 作用域：一个还是很多个' },
      { p: '作用域决定容器为这个 Bean 创建几个实例、存活多久。默认是 singleton，也就是整个容器里只有一个实例，所有请求共享它。' },
      { table: { head: ['作用域', '实例数量', '典型用途', '注意点'], rows: [
        ['singleton', '容器内唯一', 'Service、Repository、配置类', '必须无状态，不能存请求数据'],
        ['prototype', '每次获取都新建', '有状态的短生命周期对象、任务对象', '容器不管理销毁，用完自己清理'],
        ['request', '每个 HTTP 请求一个', '请求上下文、当前用户信息', '只在 Web 环境有效'],
        ['session', '每个会话一个', '登录状态、购物车', '只在 Web 环境有效，注意内存占用']
      ] } },
      { p: '单例意味着共享。因此单例 Bean 必须无状态：不能把用户 id、请求参数、临时结果存到成员变量里，否则并发请求会互相覆盖，出现“张三看到李四的数据”这种极难复现的 bug。状态要么放在方法局部变量里，要么随参数传递。' },
      { p: '判断一个类有没有状态，看它有没有可变的成员变量。只有 final 依赖、常量、无状态工具对象的类，就是无状态；只要有 int count、Map cache 这类会被修改的字段，就要考虑加锁、改成局部变量，或者干脆换成 prototype。这一步判断，比事后查并发 bug 便宜得多。' },
      { p: '还有一个高频陷阱：单例 Bean 注入 prototype Bean 时，注入只发生一次，此后一直使用同一个 prototype 实例，看起来像“作用域失效”。这不是 bug，而是因为单例只创建一次，它的依赖自然也只在创建时取一次。' },
      { code: '@Component\n@Scope("prototype")\npublic class Task {\n    private static int seq = 0;\n    private final int id = ++seq;\n    public int getId() { return id; }\n}\n\n@Component\npublic class Runner {\n    private final ObjectProvider<Task> provider;\n\n    public Runner(ObjectProvider<Task> provider) {\n        this.provider = provider;\n    }\n\n    public void run() {\n        System.out.println(provider.getObject().getId());\n        System.out.println(provider.getObject().getId());\n    }\n}', title: 'ScopeDemo.java' },
      { out: '1\n2' },
      { p: '解决方式有三种：注入 <code>ObjectProvider</code>（如上）、使用 <code>@Lookup</code> 方法让容器在每次调用时查找、或者给 prototype 加 scoped proxy。前两种最常用，第三种适合必须直接注入的场景。' },

      { h: '1.8 Bean 的一生' },
      { p: '理解生命周期，才能解释“为什么初始化方法里拿不到某个 Bean”“为什么销毁方法没执行”“AOP 代理是什么时候套上去的”这类问题。' },
      { flow: ['扫描注解', '解析 BeanDefinition', '实例化', '属性注入', 'Aware 回调', 'BeanPostProcessor 前置', '@PostConstruct', '初始化完成', '使用', '@PreDestroy'] },
      { p: '实例化阶段调用构造器，此时依赖还没注入；属性注入阶段才把依赖塞进字段或调用 Setter；Aware 回调让 Bean 拿到容器相关的对象，例如 BeanNameAware、ApplicationContextAware。' },
      { p: '<code>BeanPostProcessor</code> 是 Spring 扩展能力的核心，AOP 代理就是在它的后置处理阶段生成的。这也是为什么在 <code>@PostConstruct</code> 里通过 this 调用带事务的方法会失效：那时代理还没套上，你拿到的是原始对象。' },
      { p: '初始化方法的执行顺序是：@PostConstruct，然后 InitializingBean.afterPropertiesSet，最后是自定义 init-method。三者做同一件事时按这个顺序执行；日常优先用 @PostConstruct，注解最直观，也不需要让类去实现框架接口。' },
      { table: { head: ['阶段', '做什么', '常见用途'], rows: [
        ['实例化', '调用构造器创建对象', '注入构造器依赖'],
        ['属性注入', '填充字段与 Setter 依赖', '处理循环依赖（仅字段/Setter）'],
        ['初始化', '@PostConstruct、InitializingBean', '校验配置、预热缓存、建立连接'],
        ['使用', '被业务代码调用', '正常业务逻辑'],
        ['销毁', '@PreDestroy、DisposableBean', '关闭线程池、释放连接']
      ] } },
      { code: '@Component\npublic class CacheWarmer {\n\n    @PostConstruct\n    public void init() {\n        System.out.println("加载字典到本地缓存");\n    }\n\n    @PreDestroy\n    public void destroy() {\n        System.out.println("释放缓存资源");\n    }\n}', title: 'CacheWarmer.java' },
      { out: '加载字典到本地缓存\n释放缓存资源' },
      { p: '注意：prototype Bean 的销毁回调不会自动执行，容器只负责创建，不负责追踪它的生命周期。需要清理的资源要在业务代码里显式关闭，或者改用 try-with-resources。' },

      { h: '1.9 初学者最常见的六个错误' },
      { list: [
        '<b>在 Service 里 new 另一个 Service：</b>被 new 出来的对象不经过容器，依赖为 null、事务和 AOP 全部失效。',
        '<b>忘了加 @Service：</b>类没有被扫描到，注入时报 NoSuchBeanDefinitionException。',
        '<b>启动类放错包：</b>@SpringBootApplication 默认只扫描自己所在包及子包，业务类在兄弟包下就扫不到。',
        '<b>同类型多个 Bean 直接注入：</b>容器不知道选哪个，需要 @Primary 或 @Qualifier 指定。',
        '<b>单例 Bean 保存请求数据：</b>并发时数据互相覆盖，且极难复现。',
        '<b>构造器循环依赖：</b>启动直接失败，应该调整设计而不是强行开启循环依赖。'
      ] },
      { p: '排查这类问题的顺序建议是：先确认 Bean 是否注册（看启动日志或 Actuator 的 beans 端点），再确认注入点是否在容器管理的对象里，最后确认类型和名称是否唯一。三步走完，绝大多数“注入失败”都能定位。' },
      { p: '再补充一个隐蔽情况：通过 @Bean 方法返回的对象，如果方法内部又 new 了别的类，那些被 new 出来的对象同样不受容器管理。容器只管它亲手创建的那一层，依赖链上的手动 new 会形成“容器外孤岛”，注入、事务、AOP 全都作用不到。' },
      { p: '用 Lombok 的 @RequiredArgsConstructor 可以少写构造器：把依赖声明成 final 字段，注解会自动生成构造器，Spring 仍然走构造器注入。它只是省代码，不改变注入语义，团队里用与不用都可以，但不要在同一层混着两种风格。' },
      { p: '构造器注入还有一个限制：子类必须显式调用父类构造器，父子类依赖多时构造器会变长。遇到这种情况，优先考虑拆分职责，而不是退回字段注入。构造器长本身就是“这个类做的事太多”的信号。' },

      { h: '1.10 本章小结' },
      { list: [
        'IoC 是把创建、装配、生命周期的控制权交给容器；DI 是最常用的实现手段。',
        '容器先解析 BeanDefinition 图纸，再实例化、注入、初始化，最后放入单例池。',
        '构造器注入是首选：依赖 final、不为空、易测试，还能暴露职责过重的问题。',
        '@Component 家族用于自己的类，@Configuration + @Bean 用于第三方类。',
        '默认 singleton 必须无状态；prototype 每次新建，容器不负责销毁。'
      ] },

      { h: '1.11 常见追问' },
      { list: [
        '<b>问：@Autowired 和 @Resource 有什么区别？</b>答：@Autowired 是 Spring 的注解，默认按类型注入，配合 @Qualifier 按名称；@Resource 是 JDK 规范，默认按名称注入，名称找不到再按类型。新项目统一用构造器注入即可，两者都不需要写。',
        '<b>问：Bean 太多会不会拖慢启动？</b>答：会。单例 Bean 在启动时全部创建，数量上千时启动时间明显上升。可以按需懒加载，但懒加载会把错误推迟到第一次调用，核心 Bean 不要懒加载。',
        '<b>问：@Component 和 @Bean 能混用吗？</b>答：能。自己的类用 @Component，第三方类用 @Bean。同一个类型不要既扫描又手动注册，否则会出现两个 Bean。',
        '<b>问：单例 Bean 线程安全吗？</b>答：容器只保证创建一次，不保证线程安全。Bean 无状态就天然安全；有共享可变字段就需要自己加锁或改用局部变量。',
        '<b>问：为什么单元测试里注入的依赖是 null？</b>答：直接 new 出来的对象不经过容器。要么用构造器注入手动传依赖，要么用 Spring 的测试支持启动容器。',
        '<b>问：Bean 名称冲突会怎样？</b>答：同名 Bean 后注册的会覆盖先注册的，但覆盖会把问题藏起来；更推荐改名或用 @Qualifier 明确指定，不要依赖覆盖顺序。',
        '<b>问：@Autowired(required = false) 什么时候用？</b>答：只适合可选能力，依赖缺失时字段为 null；核心依赖绝不能用它，否则启动期的错误会被推迟到运行期。',
        '<b>问：启动慢和 Bean 太多有关吗？</b>答：有关。可以在排查时开启懒加载，或把非关键 Bean 标记为 @Lazy；但生产环境要谨慎，问题会推迟到第一次调用才暴露。'
      ] },

      { h: '1.12 自测与练习' },
      { ol: [
        '把本章的 OrderService 改成 Setter 注入，比较两种写法在单元测试中的差异。',
        '新增一个 SmsService，用 @Configuration + @Bean 注册，并在 OrderService 中注入使用。',
        '故意让两个 Service 构造器互相依赖，观察启动报错信息，再抽一个 NotificationService 解开循环。',
        '用 @Lazy 标注一个慢初始化的 Bean，观察启动时间和首次调用时间的变化。',
        '把一个字段注入的类改成构造器注入，对比改造前后单元测试代码的差异。',
        '用 @Primary 和 @Qualifier 分别解决同类型多 Bean 的注入冲突，记录两种写法的区别。',
        '给一个单例 Bean 加上可变的计数器字段，用两个线程各调用一百次，观察结果是否等于两百。',
        '用 @Scope("prototype") 改造 Task，分别用直接注入和 ObjectProvider 获取，比较 id 的变化。'
      ] }
    ]
  };
  T['boot-autoconfig'] = {
    meta: '本章约 11500 字 · 建议 42 分钟 · 含 3 张表、1 张流程图与 7 段代码',
    blocks: [

      { h: '2.1 为什么学自动配置：从配置地狱说起' },
      { p: '在 Spring Boot 出现之前，搭一个 Web 项目要写大量 XML：配置 DispatcherServlet、配置视图解析器、配置数据源、配置事务管理器、配置 MyBatis 的 SqlSessionFactory。这些配置彼此关联，抄错一个属性名，启动时就报一堆看不懂的异常。' },
      { p: '更麻烦的是“抄配置”这件事本身没有创造力。十个项目里九个的数据源配置几乎一样，剩下那个只是因为数据库地址不同。于是 Spring Boot 提出一个思路：把常见组合的默认配置提前写好，放在框架里；只有当你的环境和默认值不一样时，才需要显式覆盖。' },
      { p: '这套思路叫“约定优于配置”。它带来两个直接结果：新建项目几乎零配置就能跑起来；同时，一旦默认行为不符合预期，你必须知道它从哪里来、为什么生效、怎么关掉。这正是本章要解决的问题。' },
      { p: 'Spring Boot 并不是一个新框架，它建立在 Spring Framework 之上，只是把“常用配置 + 依赖管理 + 内嵌容器”打包好了。版本演进上，1.x 奠定基础，2.x 引入 WebFlux 与新配置体系，3.x 要求 JDK 17 起步并把命名空间迁移到 Jakarta。学习时先确认版本，再看文档，否则很容易照着 2.x 的教程在 3.x 上踩坑。' },
      { p: '3.x 还有几个硬变化：javax.servlet 变成 jakarta.servlet，spring.factories 的自动配置键被移除，路径匹配默认不再忽略结尾斜杠。升级时先改依赖坐标和 import，再处理这些行为差异，否则会得到一堆“类找不到”和“莫名 404”。' },

      { h: '2.2 一个注解，三个注解' },
      { p: '每个 Spring Boot 项目的入口都长这样：一个 main 方法，一行 <code>SpringApplication.run(App.class, args)</code>，类上顶着 <code>@SpringBootApplication</code>。看起来只有一个注解，其实它是三个注解的组合。' },
      { code: '@SpringBootApplication\npublic class App {\n    public static void main(String[] args) {\n        SpringApplication.run(App.class, args);\n    }\n}', title: 'App.java' },
      { out: '2026-10-20T21:30:00  INFO 12345 --- [main] com.example.App : Starting App using Java 17.0.9\n2026-10-20T21:30:02  INFO 12345 --- [main] com.example.App : Started App in 1.834 seconds (process running for 2.31)' },
      { code: '// @SpringBootApplication 的等价展开\n@SpringBootConfiguration   // 本质是 @Configuration，标记配置类\n@EnableAutoConfiguration   // 开启自动配置，导入候选配置类\n@ComponentScan             // 扫描当前包及子包\npublic class App {\n    public static void main(String[] args) {\n        SpringApplication.run(App.class, args);\n    }\n}', title: '展开写法' },
      { table: { head: ['成员注解', '作用', '不写会怎样'], rows: [
        ['@SpringBootConfiguration', '把启动类标记为配置类，可定义 @Bean', '启动类里的 @Bean 不生效'],
        ['@EnableAutoConfiguration', '导入自动配置候选类并按条件筛选', '所有 starter 的默认配置都不生效'],
        ['@ComponentScan', '扫描启动类所在包及子包', '自己写的 @Service 全部找不到']
      ] } },
      { p: '三个成员各管一段：配置类负责“我可以定义 Bean”，组件扫描负责“找到我写的 Bean”，自动配置负责“补上框架的默认 Bean”。三者叠加，才有了“一个注解启动整个应用”的效果。' },
      { p: '组合注解的原理是“元注解”：Spring 在解析注解时会递归查找注解上的注解。@SpringBootApplication 上标注了 @SpringBootConfiguration、@EnableAutoConfiguration、@ComponentScan，解析器把这三层展开，效果等同于同时写三个注解。你自己也可以定义这样的组合注解，把一串常用注解收成一个。' },
      { p: '组合注解的价值在团队规范：把 @RestController、@RequestMapping、统一响应包装、权限注解合成一个 @ApiController，新人就不会漏写。但组合得太厚会让人看不懂一个注解到底做了什么，适度即可。' },
      { note: '<b>关键细节：</b>@ComponentScan 的默认范围是启动类所在的包及其子包。启动类放在 com.example 下，com.example.order 能被扫到，com.example 的兄弟包 com.other 就扫不到。' },

      { h: '2.3 启动的那几秒钟发生了什么' },
      { p: '<code>SpringApplication.run</code> 不是简单地 new 一个容器。它要推断应用类型、准备环境、创建上下文、刷新容器、启动内嵌服务器、发布事件。理解这条链路，才能解释“为什么我的 Bean 在启动时就创建了”“为什么 Tomcat 端口被占用会启动失败”。' },
      { flow: ['创建 SpringApplication', '推断应用类型', '准备 Environment', '创建 ApplicationContext', '刷新容器', '组件扫描 + 自动配置', '启动内嵌 Tomcat', '发布就绪事件'] },
      { p: '第一步，创建 SpringApplication 对象，并从 <code>META-INF/spring.factories</code> 里加载 ApplicationContextInitializer 和 ApplicationListener 扩展点。第二步，根据类路径判断应用类型：有 Servlet API 就是 SERVLET，只有 WebFlux 就是 REACTIVE，否则是 NONE。' },
      { p: 'Spring 的启动过程大量使用事件：ApplicationStartingEvent、ApplicationEnvironmentPreparedEvent、ApplicationPreparedEvent、ApplicationReadyEvent。写一个实现 ApplicationListener 的 Bean，或者用 @EventListener 注解的方法，就能在对应阶段插入逻辑，比在 main 里写代码更稳。' },
      { p: '第三步，准备 Environment：读取命令行参数、系统属性、环境变量、application.yml，形成统一的配置来源。第四步，创建并准备 ApplicationContext，把启动类注册成 BeanDefinition。' },
      { p: '第五步是核心的 refresh。容器在这里完成 BeanFactory 的后置处理、注册 BeanPostProcessor、初始化所有非懒加载的单例。内嵌 Tomcat 在 <code>onRefresh</code> 阶段创建并启动，所以端口被占用会在这一步抛异常。' },
      { p: '启动失败大致分三类：端口被占用，报 Web server failed to start；依赖缺失，报 UnsatisfiedDependencyException；配置错误，报 BindingException 或 IllegalArgumentException。看日志时先找最后一段的 Caused by，那才是真正的根因，前面的异常往往只是包装。' },
      { p: '启动日志还有一段“APPLICATION FAILED TO START”的描述，是 Spring Boot 专门写给人看的总结，通常直接给出原因和建议。先读它，再读堆栈，顺序反了就容易在无关的框架调用里迷路。' },
      { p: '第六步，发布 ApplicationReadyEvent，此时项目才算真正可用。如果你需要“启动后做点什么”，监听这个事件比在 main 方法里写代码更可靠，因为那时所有 Bean 都已就绪。' },
      { p: '如果只是想“启动后跑一段逻辑”，实现 CommandLineRunner 或 ApplicationRunner 更简单。区别是前者拿到原始字符串参数，后者拿到解析后的 ApplicationArguments。多个 Runner 可以用 @Order 控制执行顺序。' },
      { p: 'Runner 里抛异常会导致应用启动失败，所以适合做“必须成功才能对外服务”的初始化，比如预热缓存、校验配置。耗时长的任务不要放在 Runner 里同步执行，会拖慢启动并影响健康检查。' },

      { h: '2.4 自动配置的候选清单从哪来' },
      { p: '<code>@EnableAutoConfiguration</code> 内部通过 <code>@Import(AutoConfigurationImportSelector.class)</code> 导入配置类。这个 Selector 会去读类路径下所有 jar 包里的候选清单文件。' },
      { p: 'Spring Boot 2.7 之前，清单写在 <code>META-INF/spring.factories</code> 的 EnableAutoConfiguration 键下；2.7 起引入新文件 <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code>，一行一个配置类全限定名，3.x 已完全取代旧方式。' },
      { p: 'AutoConfigurationImportSelector 还会做两件事：去掉重复的配置类，再按 @AutoConfigureBefore、@AutoConfigureAfter、@AutoConfigureOrder 排序。排序很重要，比如数据源配置必须早于 JPA 配置，否则 EntityManagerFactory 拿不到 DataSource。' },
      { p: '自动配置类之间还有“先后”隐含依赖：Web 相关配置依赖 Servlet 环境判断，数据访问依赖 DataSource，事务依赖事务管理器。理解这条链，看到“某 Bean 不存在”时就能顺着依赖往上找，而不是逐个排除 starter。' },
      { code: '# 文件：META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\norg.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration\norg.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration\norg.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration', title: 'AutoConfiguration.imports' },
      { p: '注意，清单里的类只是“候选”。一个典型项目会加载一百多个候选配置类，但最终真正生效的往往只有二三十个。筛选的依据，就是下一节要讲的条件注解。' },
      { p: '这也解释了一个常见现象：明明引入了某个 starter，默认 Bean 却没出现。不是清单没读到，而是条件判断没通过——比如缺少某个类、用户已经自己定义了同类型 Bean、或者配置开关没打开。' },
      { p: '条件判断有一个容易被忽略的边界：@ConditionalOnBean 只根据“已经处理过的 Bean 定义”判断。如果两个配置类互相依赖对方的 Bean，判断结果就可能与书写顺序有关。所以自定义自动配置时，尽量依赖类路径和配置项，少依赖其他自动配置产出的 Bean。' },

      { h: '2.5 条件装配：满足条件才生效' },
      { p: '条件注解是自动配置的灵魂。它让框架可以“猜”，但猜得有依据：类路径有什么、容器里已有什么、配置项是什么、当前是不是 Web 环境。' },
      { p: '条件注解的底层是 @Conditional 加上 Condition 接口。自己实现 matches 方法，就能写出任意判断逻辑，比如“只在特定操作系统生效”“只在某个环境变量存在时生效”。不过大多数场景用内置注解就够了，自定义条件要谨慎，因为它会让启动行为更难预测。' },
      { table: { head: ['条件注解', '判断依据', '典型场景'], rows: [
        ['@ConditionalOnClass', '类路径存在指定类', '有 HikariCP 才配置连接池'],
        ['@ConditionalOnMissingBean', '容器中没有该类型 Bean', '用户没自定义时才注册默认实现'],
        ['@ConditionalOnProperty', '配置项存在或等于指定值', 'app.pay.enabled=true 才启用支付'],
        ['@ConditionalOnWebApplication', '当前是 Web 应用', '只在 Servlet 环境注册过滤器'],
        ['@ConditionalOnBean', '容器中已有该类型 Bean', '依赖某个 Bean 才能创建的衍生 Bean']
      ] } },
      { p: '其中最重要的是 <code>@ConditionalOnMissingBean</code>。它体现了自动配置的“让位”原则：框架先提供默认值，一旦用户定义了自己的 Bean，默认配置就自动退场。所以覆盖默认配置最正规的方式，不是改框架源码，而是自己声明一个同类型 Bean。' },
      { p: '条件注解还有一个实用技巧：在 @ConditionalOnProperty 上写 matchIfMissing = true，让“配置缺失”等同于“开启”，适合默认就要生效的能力；写 false 则要求显式开启，适合危险操作。语义写清楚，比在文档里解释更可靠。' },
      { p: '条件的判断顺序也有讲究。Spring Boot 会先做类路径判断，再做 Bean 判断，最后做属性判断；配置类上的条件先于 @Bean 方法上的条件。写自定义自动配置时，把 @ConditionalOnClass 放在类上、@ConditionalOnMissingBean 放在方法上，是最常见的组合。' },
      { code: '@AutoConfiguration\n@ConditionalOnClass(PayClient.class)\n@EnableConfigurationProperties(PayProperties.class)\n@ConditionalOnProperty(prefix = "app.pay", name = "enabled",\n        havingValue = "true", matchIfMissing = true)\npublic class PayAutoConfiguration {\n\n    @Bean\n    @ConditionalOnMissingBean\n    public PayClient payClient(PayProperties props) {\n        return new PayClient(props.getAppId(), props.getSecret());\n    }\n}', title: 'PayAutoConfiguration.java' },
      { p: '这段代码可以这样读：类路径里有 PayClient 这个类，配置项 app.pay.enabled 不是 false，才进入这个配置类；容器里没有别人定义 PayClient 时，才注册这个默认实例。三个条件缺一不可，任何一个不满足，整段配置静默跳过。' },

      { h: '2.6 条件装配的三个坑：互相掩盖与覆盖默认实现' },
      { p: '条件装配最大的好处是“不满足就静默跳过”，最大的麻烦也在这里：跳过不报错，只表现为 Bean 不存在。下面三类情况最容易把人带偏。' },
      { p: '条件注解写多了会互相掩盖：A 不生效导致 B 的 @ConditionalOnBean 也不生效。排查时先看最外层候选为什么被跳过，再往下逐层看，不要一上来就怀疑最里层。' },
      { p: '让位原则对使用者非常友好：你不需要关掉默认配置，只要自己声明一个同类型 Bean，默认实现就自动退场。代价是“我以为它生效了”这种情况变多，所以覆盖默认配置后，最好在启动日志或测试里确认一次，别让两个实现同时存在。' },
      { p: '覆盖默认实现时，常见错误是“只覆盖了一半”：比如自定义了 DataSource，却没配置连接池参数，结果是能启动但性能很差。覆盖前先读原自动配置类做了什么，把必要的部分补齐，而不是只满足于“能跑”。' },
      { p: '“静默跳过”是自动配置的优点，也是排查困难的来源。跳过不会报错，只会表现为“Bean 不存在”。所以排查的第一步不是猜，而是让框架把判断过程打印出来——本章“让自动配置说人话”那一节会专门讲。' },

      { h: '2.7 Starter 到底是什么' },
      { p: '很多人以为 starter 是一个有魔法的框架模块，其实它通常只是一个空的 Maven 依赖，作用是把一组相关的 jar 聚合进来。真正的逻辑在配套的 autoconfigure 模块里。' },
      { p: '以 <code>spring-boot-starter-web</code> 为例：它带来 spring-webmvc、内嵌 Tomcat、Jackson、校验 API。自动配置类检测到这些类存在，就创建 DispatcherServlet、消息转换器、内嵌容器工厂。你写的代码只有 Controller，其余全部由“依赖 + 条件”推导出来。' },
      { p: 'starter 还会带来自动配置的“默认值”，比如 Jackson 的日期格式、Tomcat 的线程数。想改默认值，优先用配置项；配置项覆盖不了，再自己定义 Bean。直接改源码或复制整个配置类，都会让升级变成噩梦。' },
      { p: '升级 Spring Boot 时，先用依赖管理统一版本，再跑测试。跨大版本升级不要一次改完，按迁移指南逐项处理，每一步都保持可运行，出问题才知道是哪一步引入的。' },
      { table: { head: ['Starter', '带来什么', '自动配置的结果'], rows: [
        ['spring-boot-starter-web', 'Spring MVC、Tomcat、Jackson', 'DispatcherServlet、内嵌 Tomcat、JSON 转换器'],
        ['spring-boot-starter-data-jpa', 'Hibernate、Spring Data JPA、连接池', 'EntityManagerFactory、事务管理器、数据源'],
        ['spring-boot-starter-test', 'JUnit、AssertJ、Mockito、Spring Test', '测试上下文、MockMvc'],
        ['spring-boot-starter-actuator', '监控端点', '/actuator/health、/actuator/metrics']
      ] } },
      { p: '自定义 starter 的目录结构通常是两个模块：<code>xxx-spring-boot-autoconfigure</code> 放配置类和条件注解，<code>xxx-spring-boot-starter</code> 只放依赖。命名上，官方 starter 叫 spring-boot-starter-xxx，第三方叫 xxx-spring-boot-starter，避免和官方混淆。' },
      { p: '如果你只是想在自己的项目里复用一套配置，不必拆成两个模块，把自动配置类和 imports 文件放在同一个 jar 里即可。拆模块的好处是别人可以只引 autoconfigure 而不用整个 starter。' },
      { p: '日常最常做的依赖调整是换内嵌容器：排除 spring-boot-starter-tomcat，再引入 spring-boot-starter-jetty 或 undertow。排除时要确认新容器提供了 Servlet 实现，否则启动会报缺少 ServletWebServerFactory。类似地，排除日志实现再引入 Log4j2，也要同步调整配置文件。' },
      { p: 'starter 的排除要写在依赖声明里，用 exclusion 精确到 groupId 和 artifactId。排除错了会得到 ClassNotFoundException，而不是配置错误，所以改完先跑一次完整启动，别只看编译是否通过。' },

      { h: '2.8 配置从哪里来：外部化配置' },
      { p: 'Spring Boot 支持把配置写在 yml、properties、环境变量、命令行参数里。它按固定优先级合并：命令行参数最高，其次是 Java 系统属性，再次是操作系统环境变量，然后是 application-{profile}.yml、application.yml，最后是代码里的默认值。' },
      { code: '# application.yml\nserver:\n  port: 8080\n\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/shop\n    username: app\n\napp:\n  pay:\n    enabled: true\n    app-id: wx-123456\n    secret: change-me\n\n---\n# 生产环境覆盖\nspring:\n  config:\n    activate:\n      on-profile: prod\nserver:\n  port: 80', title: 'application.yml' },
      { p: '配置文件里的短横线命名（app-id）会自动绑定到 Java 字段的驼峰命名（appId），这叫宽松绑定。因此 appId、app-id、APP_ID 都能绑定成功，不需要手动转换。' },
      { p: 'profile 的使用建议是：默认配置放 application.yml，环境差异放 application-{profile}.yml，敏感值放环境变量。不要为每个环境复制一整份配置，那样改一个公共项要改五遍。激活方式有 --spring.profiles.active、环境变量 SPRING_PROFILES_ACTIVE、以及配置文件里的 spring.profiles.active。' },
      { p: 'profile 不要用来表达“代码分支”，它只该表达环境差异。用 profile 区分“开启某个功能”会让配置组合爆炸，最终没人说得清某个环境到底加载了什么。功能开关用 @ConditionalOnProperty，环境差异才用 profile。' },
      { code: '@ConfigurationProperties(prefix = "app.pay")\npublic class PayProperties {\n    private boolean enabled = true;\n    private String appId;\n    private String secret;\n\n    public boolean isEnabled() { return enabled; }\n    public void setEnabled(boolean enabled) { this.enabled = enabled; }\n    public String getAppId() { return appId; }\n    public void setAppId(String appId) { this.appId = appId; }\n    public String getSecret() { return secret; }\n    public void setSecret(String secret) { this.secret = secret; }\n}', title: 'PayProperties.java' },
      { p: '使用 <code>@ConfigurationProperties</code> 需要让容器知道这个类：在配置类上加 <code>@EnableConfigurationProperties(PayProperties.class)</code>，或者加 <code>@ConfigurationPropertiesScan</code>，或者直接给类加 <code>@Component</code>。三种方式选一种即可。' },
      { p: '比起在业务代码里散落 <code>@Value</code> 占位符，集中绑定到一个类有三个好处：字段有类型、IDE 能补全、配置有默认值。再配合 <code>spring-boot-configuration-processor</code>，编辑器里还能给出提示。' },
      { p: '配置类还可以加 @Validated 和 JSR-303 注解做启动校验，比如 @NotBlank 的 secret 为空时直接启动失败，而不是等到第一次调用支付才报错。这属于“尽早失败”，比运行期排查便宜得多。配合 spring-boot-configuration-processor，IDE 还能提示可用的配置项。' },
      { p: '配置绑定失败时，异常会指出是哪个字段、哪个值、期望什么类型。比如把布尔值写成 yes，绑定会失败并提示合法取值。看到这类错误不要急着重启，先按提示改配置，通常一次就对。' },
      { p: '@Configuration 默认用 CGLIB 代理配置类，保证 @Bean 方法之间互相调用时拿到的是同一个实例。3.x 推荐显式写 proxyBeanMethods = false，减少启动开销；但关掉后，@Bean 方法内部直接调用另一个 @Bean 方法会得到新对象，不再是单例。' },
      { note: '<b>安全提醒：</b>密钥、数据库密码不要写进 application.yml 再提交到 Git。用环境变量、配置中心或启动参数注入，仓库里只保留占位符和示例值。' },

      { h: '2.9 让自动配置“说人话”：条件评估报告' },
      { p: '自动配置不生效时，不要靠猜。Spring Boot 提供了条件评估报告，会逐条列出每个候选配置类是否匹配、为什么不匹配。' },
      { code: '# 方式一：启动时加 --debug\njava -jar app.jar --debug\n\n# 方式二：只打开自动配置的日志\n# application.yml\n# logging:\n#   level:\n#     org.springframework.boot.autoconfigure: DEBUG\n\n# 方式三：Actuator 端点\n# GET /actuator/conditions', title: '开启条件评估报告' },
      { p: '报告分为 Positive matches 和 Negative matches 两部分。前者是生效的配置，后者是没生效的。找问题时直接搜 Negative matches 里的类名，看它给出的原因，例如“did not find required class com.mysql.cj.jdbc.Driver”。' },
      { p: '常见的 Negative 原因有四种：类路径缺类（依赖没引或版本不对）、已有同类型 Bean（你自己定义了，框架让位）、配置项不满足（开关没开或拼错）、环境不符（不是 Web 应用却引了 Web 配置）。原因写得很直白，比在网上搜半天有效。' },
      { p: '条件评估报告也可以输出到文件：启动时加 --debug，或者配置 debug=true，报告会打印在日志里。报告很长，建议重定向到文件再用关键字搜索类名，比在终端里翻页高效。' },
      { p: '另外，报告里的 Positive matches 不一定是“你期望的那个配置”。同名能力可能被多个配置类提供，看生效的那一条的类名，才能确认到底是谁注册了 Bean。' },
      { p: 'Spring Boot 还有 FailureAnalyzer 机制：启动失败时不只抛异常，还会打印一段人话解释，例如“端口 8080 已被占用，请换端口或停止占用进程”。很多常见错误都有对应的分析器，所以启动失败时先读那段描述，往往比读堆栈更快。' },

      { h: '2.10 六个高频坑' },
      { list: [
        '<b>启动类不在根包：</b>扫描范围不够，业务类全部找不到；把启动类移到最外层包。',
        '<b>自己写了 @ComponentScan：</b>它会覆盖默认扫描范围，忘记加回启动类所在包就会漏扫。',
        '<b>自己 new 了对象却没注册：</b>手动 new 的数据源不进入容器，自动配置仍然按“没有 Bean”处理，最后可能创建两份连接池。',
        '<b>配置项拼写错误：</b>yml 里写成 datasorce，绑定失败但不会报错；加配置处理器能提前发现。',
        '<b>版本不匹配：</b>手动指定了某个依赖的版本，与 Spring Boot 管理的版本冲突；优先用 BOM 管理版本。',
        '<b>排除依赖后没补替代品：</b>排除 Tomcat 却没引入 Jetty，启动时报缺少 Servlet 容器实现。'
      ] },
      { p: '排查顺序建议是：先看启动日志最后一段的异常，再看条件评估报告，最后才怀疑依赖版本。绝大多数“配置没生效”都能在前两步定位，不需要重装环境或换 JDK。' },
      { p: '一个真实案例：团队引入了数据库依赖，但忘了配 url，启动时报 Failed to configure a DataSource。有人以为是驱动版本问题，折腾了半天。其实日志里已经写明“未指定 url，无法配置数据源”。这类问题的共同点是：框架已经给出了结论，人却跳过了结论直接去搜异常类名。' },

      { h: '2.11 本章小结' },
      { list: [
        '@SpringBootApplication 是配置类、自动配置、组件扫描三个注解的组合。',
        '自动配置的候选清单来自 AutoConfiguration.imports，筛选依据是条件注解。',
        '条件注解看三件事：类路径有什么、容器里已有什么、配置项是什么。',
        '@ConditionalOnMissingBean 让框架的默认配置为用户自定义让位。',
        'Starter 只是依赖聚合，真正的装配逻辑在 autoconfigure 模块。',
        '不生效就用 --debug 看条件评估报告，而不是猜。'
      ] },

      { h: '2.12 常见追问' },
      { list: [
        '<b>问：自动配置类和普通 @Configuration 有什么区别？</b>答：@AutoConfiguration 本质是 @Configuration，额外增加了“必须在用户配置之后处理”的排序语义，并禁止被组件扫描直接扫到，避免重复注册。',
        '<b>问：@Configuration 里的 @Bean 方法能是 private 吗？</b>答：不能。CGLIB 代理需要可继承的方法，private 或 final 方法会导致代理失效或启动报错，写成 public 或包级可见。',
        '<b>问：自动配置类能直接改吗？</b>答：不要改框架源码。正确做法是自己声明同类型 Bean，或用 @AutoConfigureBefore 写自己的配置类，升级时才不会痛苦。',
        '<b>问：为什么我定义了 Bean，默认配置还在生效？</b>答：检查类型是否完全一致、是否真的注册进了容器、条件是不是 @ConditionalOnMissingBean。只 new 不注册，框架看不见。',
        '<b>问：能关掉某个自动配置吗？</b>答：可以。用 @SpringBootApplication(exclude = DataSourceAutoConfiguration.class) 或配置 spring.autoconfigure.exclude。但关掉之后要自己补上对应的 Bean。',
        '<b>问：yml 和 properties 哪个好？</b>答：yml 层级清晰、适合复杂结构；properties 简单直白、排查时不容易被缩进坑到。团队统一即可，不要混着写同一份配置。',
        '<b>问：为什么 @ComponentScan 会覆盖默认扫描？</b>答：显式写 @ComponentScan 后，启动类上的默认扫描规则不再生效，只按你写的包扫描；需要保留默认范围时，把启动类所在包也加进去。',
        '<b>问：spring.factories 还能用吗？</b>答：3.x 仍兼容部分旧机制，但自动配置已统一到 imports 文件；自己写 starter 时直接用新文件，不要混用两套。',
        '<b>问：如何只关掉一个自动配置？</b>答：用 exclude 指定类，或配置 spring.autoconfigure.exclude；关掉后要自己补上等价 Bean，否则会出现新的缺依赖错误。',
        '<b>问：配置会泄露到日志里吗？</b>答：Actuator 的 env 端点默认会对敏感键做脱敏，但自定义键不一定被识别；最稳妥的做法是密钥不落到配置文件里。'
      ] },

      { h: '2.13 自测与练习' },
      { ol: [
        '新建一个 Spring Boot 项目，只保留启动类，用 --debug 启动，统计 Positive 和 Negative 各有多少条。',
        '自己写一个 PayProperties 并绑定配置，改一次 yml、改一次环境变量、改一次命令行参数，验证优先级。',
        '写一个自定义自动配置类，用 @ConditionalOnMissingBean 让用户能覆盖默认实现，并写测试验证两种分支。',
        '故意把启动类移到子包，观察哪些 Bean 消失了，并解释原因。',
        '把一个自动配置类的条件复制到自己的配置类上，观察它与原配置的生效顺序。',
        '把 @Configuration 改成 proxyBeanMethods = false，验证两个 @Bean 方法互相调用时的对象是否还是同一个。',
        '用一个自定义 Condition 实现“只在 dev 环境注册的 Bean”，并验证 prod 下不生效。',
        '把某个自动配置类加入 exclude，观察启动变化，再手动补一个等价 Bean。',
        '在 Negative matches 里找一条记录，说明它缺少哪个类或哪项配置。'
      ] }
    ]
  };
  T['mvc-flow'] = {
    meta: '本章约 12300 字 · 建议 42 分钟 · 含 3 张表、1 张流程图与 5 段代码',
    blocks: [

      { h: '3.1 为什么学请求链路' },
      { p: '写一个 Controller 只要几分钟：类上加 <code>@RestController</code>，方法上加 <code>@GetMapping</code>，return 一个对象，浏览器就能拿到 JSON。但“能用”和“知道为什么能用”之间，隔着一条完整的调度链路。' },
      { p: '把一次请求拆成时间线：浏览器发 TCP 请求，Tomcat 的 Connector 接收并解析成 HttpServletRequest，Filter 链先过一遍，然后交给 DispatcherServlet，它查映射表找到方法，用 HandlerAdapter 解析参数并调用，Service 访问数据库，返回对象被消息转换器写成 JSON，再反向经过 Filter 和 Connector 回到浏览器。任何一环出问题，现象都可能表现为“接口挂了”，但位置完全不同。' },
      { p: '这条链路决定了三件事。第一，请求为什么会被这个方法处理，而不是另一个方法——这是 HandlerMapping 的工作。第二，URL 里的 id、查询字符串、JSON 请求体分别怎么变成方法参数——这是参数解析器的工作。第三，返回的对象怎么变成 JSON、异常怎么变成状态码——这是消息转换器和异常解析器的工作。' },
      { p: 'Tomcat 用线程池处理请求，默认最大 200 个线程。Controller 方法在这个工作线程上执行，所以方法里的局部变量天然线程安全，而注入进来的单例 Service 不是。很多人第一次遇到“并发下数据串了”，原因就是往单例字段里塞了请求相关的数据。' },
      { p: '不理解链路，排查问题就只能靠猜：404 是路径写错还是没扫描到？400 是参数类型不对还是校验没通过？415 是 Content-Type 没设还是缺少转换器？这些问题在链路上都有明确的位置，知道位置就能一步定位。' },
      { p: '线上排查时，先确认请求有没有到应用：看访问日志里有没有这条路径。到了应用却 404，是映射问题；到了映射却 500，是方法内部异常；方法返回了却前端拿不到，是序列化或响应头问题。按这个顺序排除，比盯着代码猜快得多。' },
      { p: '日志里最好带上方法、路径、状态码和耗时四个字段。只打“请求进入”没有意义，出了问题还是要靠状态码和耗时判断是参数错、业务错还是下游慢。字段固定后，日志平台可以直接做聚合面板。' },
      { p: '一次请求的耗时应该分段记录：进入应用、调用下游、写响应。只记总耗时，出了问题仍然不知道慢在哪。分段埋点不需要很重，几个时间戳相减就够，关键是字段名统一。' },

      { h: '3.2 从 Tomcat 到 DispatcherServlet' },
      { p: 'Spring MVC 建立在 Servlet 规范之上。Tomcat 接收 TCP 连接、解析 HTTP 报文，把请求封装成 <code>HttpServletRequest</code>，然后交给匹配的 Servlet。Spring Boot 默认把 DispatcherServlet 映射到根路径 <code>/</code>，所以几乎所有请求都会先进入它。' },
      { p: 'Servlet 的生命周期是 init、service、destroy，容器启动时 init 一次，之后每个请求调用 service，最后销毁。DispatcherServlet 的 init 阶段会初始化九大组件，这也是为什么映射表在启动时就建好了，而不是第一次请求才建。' },
      { p: 'DispatcherServlet 是单例的，多个请求共用一个实例，所以它内部不能保存请求相关的状态。它的线程安全靠的是把状态放在方法参数和 ThreadLocal 里，而不是靠加锁。' },
      { p: '这个模式叫“前端控制器”（Front Controller）：不再让每个业务类各自实现一个 Servlet，而是由一个统一入口接收所有请求，再分发给具体的处理器。好处是把公共逻辑（编码、参数解析、异常处理、视图渲染）集中到一处，业务代码只关心业务。' },
      { p: '前端控制器不是 Spring 发明的，Struts 的 ActionServlet 也是同一思路：所有请求先集中，再分发。区别在于 Spring 把分发拆成了可替换的组件，你可以换 HandlerMapping、换视图解析器，而不用改 DispatcherServlet 本身。' },
      { p: '九大组件里，LocaleResolver、ThemeResolver 现在很少用，MultipartResolver 用于文件上传，FlashMapManager 用于重定向传参。老教程会花很多篇幅讲它们，实际项目里天天打交道的是映射、适配器、消息转换器和异常解析器。' },
      { p: '在 Spring Boot 里，DispatcherServlet 由 <code>DispatcherServletAutoConfiguration</code> 自动注册，你通常看不到它的配置。如果要改映射路径或关闭它，才需要写定制代码。' },
      { p: '改 DispatcherServlet 的映射路径通常在 spring.mvc.servlet.path 里配置，比如改成 /api，此时 Controller 上的路径会拼在它后面。没有特殊需求不要改，改了容易和静态资源、健康检查路径冲突。' },

      { h: '3.3 九个组件，各管一段' },
      { p: 'DispatcherServlet 本身不干活，它把职责分给九个策略组件。初学不用背全，但要知道每个组件大概负责什么，排查时才知道该看哪里。' },
      { table: { head: ['组件', '职责', '出问题时表现为'], rows: [
        ['HandlerMapping', '根据请求找到处理方法', '404，方法根本没被匹配到'],
        ['HandlerAdapter', '调用方法并绑定参数', '400，参数类型或格式不对'],
        ['HandlerExceptionResolver', '把异常转成响应', '500，异常没人接'],
        ['HttpMessageConverter', '对象与 JSON 互转', '415 或 406，媒体类型不支持'],
        ['ViewResolver', '把视图名解析成页面', '前后端分离时几乎用不到'],
        ['HandlerInterceptor', '方法前后插入逻辑', '登录校验、耗时统计不生效'],
        ['MultipartResolver', '解析文件上传', '上传接口拿不到文件'],
        ['LocaleResolver', '解析语言区域', '国际化文案不切换'],
        ['FlashMapManager', '重定向时传递一次性数据', '重定向后提示信息丢失']
      ] } },
      { p: '在注解驱动的项目里，最常用的是前五个。HandlerMapping 的具体实现是 <code>RequestMappingHandlerMapping</code>，它在启动时扫描所有 <code>@RequestMapping</code> 方法，建立“路径 + 方法 + 条件”到处理器的映射表。' },

      { h: '3.4 一次请求的完整旅程' },
      { p: '下面这条链路是本章的主干。建议顺着流程走一遍，把每个组件的职责记成一句话。' },
      { flow: ['HTTP 请求', 'Filter 链', 'DispatcherServlet', 'HandlerMapping 找方法', 'HandlerAdapter 绑定参数', 'Controller 执行业务', '返回值处理', 'HttpMessageConverter 序列化', 'HTTP 响应'] },
      { p: '第一步，请求先经过 Filter 链。Filter 属于 Servlet 规范，能改写请求、做编码设置、记录耗时、做鉴权。它工作在 DispatcherServlet 之前，此时还没有“Controller 方法”这个概念。' },
      { p: '映射注册发生在启动阶段。如果两个方法写了同样的路径和方法类型，启动会直接报 Ambiguous mapping，而不是等到请求进来才冲突。看到这个错，去搜报错里列出的两个方法名，改掉其中一个的路径即可。' },
      { p: '第二步，DispatcherServlet 的 <code>doDispatch</code> 方法开始工作。它先调用 HandlerMapping，根据 URL、HTTP 方法、请求头匹配到一个 Handler（通常是一个 Controller 方法加上拦截器链）。' },
      { p: '第三步，找到能执行这个 Handler 的 HandlerAdapter，然后依次执行拦截器的 <code>preHandle</code>。第四步，HandlerAdapter 调用参数解析器，把请求里的路径变量、查询参数、请求体、请求头绑定成方法参数，再通过反射调用 Controller 方法。' },
      { p: '参数解析由一组 HandlerMethodArgumentResolver 完成：@PathVariable、@RequestParam、@RequestBody、@ModelAttribute 各有一个解析器。你也可以实现自己的解析器，把登录用户从 Token 直接注入方法参数，这就是很多项目里“当前用户”参数的来源。' },
      { p: '自定义参数解析器要注册到 WebMvcConfigurer 的 addArgumentResolvers 里。写之前先确认内置解析器是否已经覆盖，比如 @RequestAttribute、@SessionAttribute 都是现成的，重复造轮子容易和框架行为冲突。' },
      { p: '第五步，Controller 返回一个对象或 <code>ResponseEntity</code>。如果方法带 <code>@ResponseBody</code>（<code>@RestController</code> 已包含），返回值交给 HttpMessageConverter 序列化成 JSON 写入响应体；否则被当成视图名，交给 ViewResolver 渲染页面。' },
      { p: '第六步，执行拦截器的 <code>postHandle</code>，再执行 <code>afterCompletion</code>。如果过程中抛了异常，会先交给 HandlerExceptionResolver 处理，处理完仍然会走 afterCompletion 做资源清理。' },
      { p: '如果方法返回 Callable 或 DeferredResult，DispatcherServlet 会释放 Tomcat 线程，等结果就绪再继续处理。这在调用慢下游时能显著提高吞吐，但也会让异常处理和拦截器行为变得不一样，用之前先读清楚文档。' },
      { p: '异步请求期间，拦截器的 preHandle 和 postHandle 在不同线程执行，ThreadLocal 里的用户信息可能拿不到。需要在异步线程里重新设置上下文，或者干脆把需要的参数在进入异步前取出来。' },

      { h: '3.5 第一个 Controller' },
      { p: '下面这个类覆盖了最常见的四种操作：按 id 查询、按条件分页查询、创建、更新。注意类上的 <code>@RestController</code> 和 <code>@RequestMapping</code> 前缀。' },
      { code: '@RestController\n@RequestMapping("/api/users")\npublic class UserController {\n\n    private final UserService service;\n\n    public UserController(UserService service) {\n        this.service = service;\n    }\n\n    @GetMapping("/{id}")\n    public User get(@PathVariable long id) {\n        return service.findById(id);\n    }\n\n    @GetMapping\n    public List<User> list(@RequestParam(defaultValue = "0") int page,\n                           @RequestParam(defaultValue = "20") int size) {\n        return service.page(page, size);\n    }\n\n    @PostMapping\n    @ResponseStatus(HttpStatus.CREATED)\n    public User create(@RequestBody @Valid UserForm form) {\n        return service.create(form);\n    }\n\n    @PutMapping("/{id}")\n    public User update(@PathVariable long id, @RequestBody UserForm form) {\n        return service.update(id, form);\n    }\n}', title: 'UserController.java' },
      { out: 'GET /api/users/1\nHTTP/1.1 200\nContent-Type: application/json\n\n{"id":1,"name":"张三","age":28}' },
      { p: '<code>@RestController</code> 等于 <code>@Controller</code> 加 <code>@ResponseBody</code>。少了 @ResponseBody，返回的字符串会被当成视图名，于是你得到 404 或者一个找不到模板的异常——这是新手最常见的“返回 JSON 变成 404”的原因。' },
      { p: '判断一个 Controller 是“返回页面”还是“返回数据”，看它有没有 @ResponseBody（类上是 @RestController 就自带）。返回字符串时，有 @ResponseBody 就写响应体，没有就当成视图名去拼模板路径，这是两套完全不同的处理分支。' },
      { p: '同一个方法既想返回页面又想返回 JSON，通常说明职责没拆开。页面请求和接口请求的缓存策略、错误格式、鉴权方式都不同，混在一个方法里，最后往往两边都做不好。' },
      { p: '判断标准可以更简单：这个接口会不会被浏览器直接打开？会，就考虑页面；只在代码或前端里调用，就只返回数据。别为了“省一个方法”把两种消费者塞进同一条链路。' },
      { p: '类上的 <code>@RequestMapping("/api/users")</code> 是前缀，方法上的路径会拼在它后面。因此 <code>GET /api/users/1</code> 命中 get 方法，<code>GET /api/users?page=0</code> 命中 list 方法。' },
      { p: '@GetMapping、@PostMapping 都是 @RequestMapping 的派生注解，等价于指定 method。用派生注解可读性更好，也能让 IDE 和文档工具正确识别方法类型。混用两种写法没问题，但一个项目里最好统一。' },
      { p: '路径设计也有约定：资源用名词复数，动作用 HTTP 方法表达，层级不要超过三层。比如按用户查订单写成 /users/1/orders，比 /getOrdersByUserId 更符合 REST 习惯，也更容易被网关和文档工具识别。' },

      { h: '3.6 参数从哪来：四类注解' },
      { p: 'HTTP 请求里的信息分布在四个位置：URL 路径、查询字符串、请求体、请求头。Spring MVC 用不同的注解把它们绑定到方法参数，用错位置就会得到 null 或 400。' },
      { p: '参数绑定失败默认返回 400，且响应体往往没有细节。想看具体是哪个参数出错，可以打开 server.error.include-binding-errors=always（仅开发环境），或者在 @ExceptionHandler 里处理 MethodArgumentNotValidException。' },
      { p: '全局异常处理器要注意别把框架异常全部吞掉：找不到处理器的异常应该转 404，方法不支持的异常应该转 405，而不是一律 500。状态码错了，前端和监控都会误判。' },
      { table: { head: ['注解', '数据来源', '示例', '常见错误'], rows: [
        ['@PathVariable', 'URL 路径中的占位符', '/users/{id} 取 id', '路径里没有同名占位符，启动报错'],
        ['@RequestParam', '查询字符串或表单', '?page=1&size=20', '参数名不一致又没写 name'],
        ['@RequestBody', '请求体（通常是 JSON）', 'POST 的 JSON 对象', 'GET 请求没有请求体，绑定为 null'],
        ['@RequestHeader', '请求头', 'Authorization、User-Agent', '大小写或名称写错'],
        ['@ModelAttribute', '表单字段绑定到对象', 'HTML 表单提交', '和 @RequestBody 混用导致绑定失败']
      ] } },
      { p: '几个实用细节。<code>@RequestParam</code> 默认要求参数必须存在，缺失会抛 MissingServletRequestParameterException，返回 400；加 <code>required = false</code> 或 <code>defaultValue</code> 可以放宽。' },
      { p: '<code>@PathVariable</code> 支持类型转换，<code>/users/abc</code> 绑定到 long 会抛 MethodArgumentTypeMismatchException，同样是 400。想让 404 更准确，应该在 Service 里查不到时抛业务异常，而不是返回 null。' },
      { p: '用 Optional 或包装类型表达“可能没有”，比返回 null 更明确；但 REST 接口里更常见的做法是查不到就抛业务异常，由统一异常处理转成 404，这样 Controller 不需要到处判空。' },
      { p: '统一异常处理的另一个好处是错误结构一致：前端只需要解析一种 JSON，监控可以按 errorCode 聚合。定义错误码时按业务域分段，比如 10xxx 用户、20xxx 订单，排查时一眼能看出属于哪块。' },
      { p: '错误码不要复用一个“系统繁忙”。业务错误、参数错误、下游超时、限流拒绝应该分开，前端才能决定是提示用户重试、跳转登录还是展示具体原因。' },
      { p: '当请求体是 JSON 时，必须设置 <code>Content-Type: application/json</code>，否则会得到 415。这条规则经常被忽略：用 Postman 或 curl 测试时忘了加请求头，代码没错但就是调不通。' },

      { h: '3.7 参数校验：把 400 说清楚' },
      { p: '参数绑定成功不代表数据合法。用户名不能为空、年龄必须大于 0、邮箱格式要对，这些规则应该写在 DTO 上，而不是散落在 Service 的 if 里。' },
      { code: 'public class UserForm {\n\n    @NotBlank(message = "用户名不能为空")\n    @Size(max = 20, message = "用户名不能超过 20 个字符")\n    private String name;\n\n    @NotNull(message = "年龄不能为空")\n    @Min(value = 1, message = "年龄必须大于 0")\n    @Max(value = 150, message = "年龄不合法")\n    private Integer age;\n\n    @Email(message = "邮箱格式不正确")\n    private String email;\n\n    // getter / setter 省略\n}', title: 'UserForm.java' },
      { p: '在 Controller 参数上加 <code>@Valid</code>（或 <code>@Validated</code>），校验不通过会抛 MethodArgumentNotValidException，默认返回 400。但默认响应体只有一句“Bad Request”，前端拿不到具体哪个字段错了。' },
      { p: '想要友好的错误信息，有两种做法：在参数后面紧跟一个 <code>BindingResult</code> 自己处理，或者在全局异常处理器里捕获 MethodArgumentNotValidException，把字段错误收集成结构化 JSON。后者更统一，推荐使用。' },
      { p: '同一个 DTO 在新增和修改时校验规则不同，可以用分组：定义 Create、Update 两个接口，在字段上写 groups，Controller 参数上加 @Validated(Create.class)。不分组时所有规则都会生效，容易出现“修改时被新增规则拦住”的问题。' },
      { note: '<b>注意：</b>@Valid 只对 @RequestBody 的对象和部分方法参数生效。对 @RequestParam 的简单参数做校验，需要在类上加 @Validated，并在参数上直接写约束注解。' },

      { h: '3.8 返回值怎么变成 JSON' },
      { p: 'Controller 返回一个 User 对象，浏览器收到的是 JSON，中间做转换的是 <code>HttpMessageConverter</code>。Spring Boot 引入 Jackson 后，自动注册了 <code>MappingJackson2HttpMessageConverter</code>。' },
      { p: '转换器根据两件事选择：方法返回的类型，以及请求的 <code>Accept</code> 头。客户端要 JSON 就给 JSON，要 XML 而项目没装 XML 转换器，就会得到 406 Not Acceptable。' },
      { p: '415 Unsupported Media Type 是请求头 Content-Type 与转换器不匹配，406 是响应端没有能写出该类型的转换器。两个错误都在“转换器”这一层，先看请求头和 @Produces、@Consumes 声明，再看依赖里有没有对应的 Jackson 或 XML 模块。' },
      { code: '@GetMapping("/{id}")\npublic ResponseEntity<User> get(@PathVariable long id) {\n    User user = service.findById(id);\n    if (user == null) {\n        return ResponseEntity.notFound().build();\n    }\n    return ResponseEntity.ok()\n            .header("X-Trace-Id", "abc123")\n            .body(user);\n}', title: 'ResponseEntity 用法' },
      { p: '<code>ResponseEntity</code> 让你完全控制状态码、响应头和响应体。创建成功返回 201 并带 Location 头，删除成功返回 204 无响应体，这些 REST 语义用 ResponseEntity 表达最清楚。' },
      { p: '返回 void 或 null 时要小心：void 表示你自己往响应里写内容，null 在 @ResponseBody 下通常得到空响应体。如果前端期待 JSON，空响应体会让它解析失败。' },
      { p: '删除成功常用 204 No Content，创建成功常用 201 Created 并带 Location 头。这些不是强制规范，但前后端约定清楚后，前端就能按状态码分支处理，而不是解析响应体里的 code 字段。' },

      { h: '3.9 统一异常处理' },
      { p: '异常不处理，Spring Boot 会返回默认的 /error 页面或 JSON，带着堆栈和内部类名。这对前端不友好，也可能泄露实现细节。正确做法是用 <code>@RestControllerAdvice</code> 集中兜底。' },
      { code: '@RestControllerAdvice\npublic class GlobalExceptionHandler {\n\n    @ExceptionHandler(NotFoundException.class)\n    @ResponseStatus(HttpStatus.NOT_FOUND)\n    public ErrorResponse handleNotFound(NotFoundException e) {\n        return new ErrorResponse("NOT_FOUND", e.getMessage());\n    }\n\n    @ExceptionHandler(MethodArgumentNotValidException.class)\n    @ResponseStatus(HttpStatus.BAD_REQUEST)\n    public ErrorResponse handleInvalid(MethodArgumentNotValidException e) {\n        String msg = e.getBindingResult().getFieldErrors().stream()\n                .map(f -> f.getField() + ": " + f.getDefaultMessage())\n                .collect(Collectors.joining("; "));\n        return new ErrorResponse("INVALID_ARGUMENT", msg);\n    }\n\n    @ExceptionHandler(Exception.class)\n    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)\n    public ErrorResponse handleOther(Exception e) {\n        log.error("未处理异常", e);\n        return new ErrorResponse("INTERNAL_ERROR", "服务器开小差了");\n    }\n}', title: 'GlobalExceptionHandler.java' },
      { out: 'GET /api/users/999\n{\n  "code": "NOT_FOUND",\n  "message": "用户不存在"\n}' },
      { p: '三个要点。第一，异常处理方法要按“从具体到宽泛”排列，Spring 会选择最匹配的那个。第二，返回 500 时不要把 e.getMessage() 直接给前端，内部细节应该只进日志。第三，日志里要带 traceId，否则线上排查时对不上请求。' },
      { p: '如果继承了 <code>ResponseEntityExceptionHandler</code>，框架自带的异常（参数缺失、方法不支持、媒体类型不支持）也能被统一改写，得到一致的错误结构。' },
      { p: 'Spring 6 引入了 ProblemDetail，按 RFC 7807 输出 type、title、status、detail 字段，比自定义错误结构更标准。新项目可以直接用它，老项目继续用自定义 Result 包装也没问题，关键是全站统一。' },

      { h: '3.10 过滤器、拦截器、AOP 怎么选' },
      { p: '三者都能在请求前后插入逻辑，位置和能力不同。选错位置，会出现“拿不到 Controller 注解”“改了响应体不生效”之类的问题。' },
      { p: 'Filter 属于 Servlet 规范，在 DispatcherServlet 之前执行；Interceptor 属于 Spring MVC，在 HandlerMapping 之后、方法调用前后执行。需要读请求体、改请求头用 Filter；需要知道“将要执行哪个 Controller 方法”用 Interceptor。' },
      { table: { head: ['机制', '所处位置', '能拿到什么', '典型用途'], rows: [
        ['Filter', 'Servlet 容器层，DispatcherServlet 之前', 'ServletRequest/Response，拿不到 Handler', '编码、跨域、请求体包装、全链路 traceId'],
        ['Interceptor', 'DispatcherServlet 内，Handler 已知', 'HandlerMethod，可读方法注解', '登录校验、权限、接口耗时'],
        ['AOP 切面', 'Bean 方法调用层', '方法参数、返回值、异常', '事务、日志、重试、限流']
      ] } },
      { code: '@Configuration\npublic class WebConfig implements WebMvcConfigurer {\n\n    private final AuthInterceptor authInterceptor;\n\n    public WebConfig(AuthInterceptor authInterceptor) {\n        this.authInterceptor = authInterceptor;\n    }\n\n    @Override\n    public void addInterceptors(InterceptorRegistry registry) {\n        registry.addInterceptor(authInterceptor)\n                .addPathPatterns("/api/**")\n                .excludePathPatterns("/api/login", "/api/health");\n    }\n}', title: 'WebConfig.java' },
      { p: '拦截器的 <code>preHandle</code> 返回 false 表示中断请求，此时不会调用 Controller；<code>postHandle</code> 在 Controller 正常返回后执行；<code>afterCompletion</code> 无论成功失败都会执行，适合清理 ThreadLocal。' },
      { p: '注意：拦截器拿不到 @RequestBody 已经反序列化的对象，它只能看到原始请求；需要读取请求体又不想消费流，得用 ContentCachingRequestWrapper 包装。' },
      { p: '包装请求体缓存会占用内存，大文件上传时尤其危险。记录日志要设上限，只记前几 KB，并且避免记录密码、token 等敏感字段。生产环境通常只记路径、状态码、耗时，不记完整请求体。' },

      { h: '3.11 按状态码定位问题' },
      { list: [
        '<b>404 Not Found：</b>路径不匹配（前缀、斜杠、大小写）、HTTP 方法不对、Controller 没被扫描到、被拦截器或安全框架拦截。',
        '<b>400 Bad Request：</b>参数类型转换失败、必填参数缺失、JSON 格式错误、@Valid 校验不通过。',
        '<b>405 Method Not Allowed：</b>路径对但方法不对，例如用 GET 调了 @PostMapping。',
        '<b>415 Unsupported Media Type：</b>Content-Type 缺失或不是 application/json，导致找不到消息转换器。',
        '<b>406 Not Acceptable：</b>客户端 Accept 要求 XML，但项目只注册了 JSON 转换器。',
        '<b>500 Internal Server Error：</b>业务异常没被捕获、空指针、数据库连接失败；先看日志第一段堆栈。'
      ] },
      { p: '一个实用技巧：在浏览器开发者工具的 Network 面板里看请求的完整 URL、方法、请求头和响应体。很多“接口 404”其实是前端拼错了路径，或者多了一个斜杠。' },
      { p: '用 curl 复现时加 -i 看响应头、-v 看握手和重定向。很多“接口 404”是多了一次斜杠或少了 context-path；很多“跨域失败”其实是预检请求 OPTIONS 没有被放行。' },

      { h: '3.12 本章小结' },
      { list: [
        'DispatcherServlet 是前端控制器，所有请求先到它，再分发。',
        'HandlerMapping 找方法，HandlerAdapter 绑参数并调用，消息转换器写响应。',
        '路径变量、查询参数、请求体、请求头分别用 @PathVariable、@RequestParam、@RequestBody、@RequestHeader。',
        '@RestController = @Controller + @ResponseBody，少了后者会把返回值当视图名。',
        '参数校验用 @Valid + 约束注解，错误信息在全局异常处理器里统一组装。',
        'Filter 在 Servlet 层，Interceptor 在 MVC 层，AOP 在 Bean 方法层。'
      ] },

      { h: '3.13 常见追问' },
      { list: [
        '<b>问：@Controller 和 @RestController 能同时用吗？</b>答：不需要。@RestController 已经包含 @Controller，重复标注没有意义；需要返回页面时才用 @Controller。',
        '<b>问：@RequestBody 和 @ModelAttribute 怎么区分？</b>答：前者读请求体并按 JSON 反序列化，后者把表单或查询参数按字段绑定，两者适用的 Content-Type 不同。',
        '<b>问：@RequestParam 和 @PathVariable 能混用吗？</b>答：能。路径变量来自 URL 模板，查询参数来自问号后面的键值对，一个方法里同时用两者很常见，注意名字不要重复。',
        '<b>问：GET 请求能用 @RequestBody 吗？</b>答：语法上可以，但 GET 通常没有请求体，很多客户端和代理会丢弃它。查询条件应该用 @RequestParam 或路径变量。',
        '<b>问：为什么我的异常处理器没生效？</b>答：检查它是否在扫描范围内、异常类型是否匹配、是否被更具体的处理器抢先；还要注意 @RestControllerAdvice 与 @ControllerAdvice 的返回方式不同。',
        '<b>问：跨域怎么处理？</b>答：可以在 Controller 上加 @CrossOrigin，或实现 WebMvcConfigurer 的 addCorsMappings，或在网关统一处理。生产环境更推荐网关统一配置。',
        '<b>问：@RestController 和 @Controller 的区别？</b>答：@RestController 等于 @Controller 加 @ResponseBody，类里所有方法默认写响应体，返回视图名会被当成字符串写出去。',
        '<b>问：拦截器里能改响应体吗？</b>答：preHandle 阶段还没有响应体；postHandle 时视图已确定但未渲染；要改响应内容，用 ResponseBodyAdvice 或 Filter 包装响应。',
        '<b>问：静态资源为什么也被 DispatcherServlet 处理？</b>答：默认映射是根路径，静态资源由 ResourceHttpRequestHandler 处理；如果自定义了映射路径，静态资源可能落到 404，需要额外配置。',
      { p: '如果项目里同时有页面和接口，可以把视图解析器配成前后缀，接口方法用 @ResponseBody 明确返回数据。不要依赖“方法返回字符串就一定是视图”这种隐式规则，显式标注能让接手的人少踩坑。' },
        '<b>问：前后端分离还需要 ViewResolver 吗？</b>答：通常不需要。返回值由消息转换器写回；只有需要服务端渲染模板时才配置视图解析器。',
        '<b>问：接口耗时统计放哪一层？</b>答：想统计到具体方法用拦截器或 AOP；想统计包含容器开销的完整耗时用 Filter。'
      ] },

      { h: '3.14 自测与练习' },
      { ol: [
        '写一个 /api/books/{id} 接口和一个 /api/books?name= 查询接口，分别用 @PathVariable 和 @RequestParam，并用 curl 验证。',
        '给创建接口加上 @Valid 校验，故意传空名字和负年龄，观察默认 400 响应，再改写成统一错误结构。',
        '实现一个参数解析器，把请求头里的用户 id 直接注入 Controller 方法参数。',
        '给接口加上分段耗时日志，分别记录参数解析、业务调用和序列化的时间。',
        '写一个登录拦截器，对 /api/** 生效、放行 /api/login，验证未登录时返回 401 JSON。',
        '写一个 HandlerInterceptor 记录每个请求耗时，并观察它与 Filter 的执行顺序。',
        '用 @ControllerAdvice 把参数校验异常转换成统一 JSON，并用 curl 验证状态码。',
        '用 Filter 给每个请求生成 traceId 放进 MDC，在日志里输出，观察同一次请求的日志能否串起来。',
        '分别制造 404、400、415、500，记录每种情况下的响应体和日志，整理成排查清单。'
      ] }
    ]
  };
  T['mybatis-jpa'] = {
    meta: '本章约 10800 字 · 建议 45 分钟 · 含 2 张表、1 张流程图与 8 段代码',
    blocks: [

      { h: '4.1 为什么学数据访问层' },
      { p: '几乎所有业务系统都绕不开数据库。登录要查用户，下单要写订单，报表要聚合统计。Java 访问数据库的标准接口是 JDBC，但直接手写 JDBC 代码非常啰嗦：拿连接、拼 SQL、设参数、执行、遍历结果集、处理异常、关闭资源，七步里有五步是重复劳动。' },
      { p: 'Spring 的 JdbcTemplate 把七步压缩成三步：定义 SQL、传参数、取结果。连接获取、异常转换、资源关闭都由模板完成。它不是 ORM，不理解对象和表的映射，但足以应付小工具和报表场景，也是理解 MyBatis 底层的好起点。' },
      { p: 'JdbcTemplate 的 queryForObject 在查不到时会抛 EmptyResultDataAccessException，而不是返回 null。这个设计逼你显式处理“没有数据”，比返回 null 更早暴露问题。' },
      { p: '于是出现了两类框架。一类以 MyBatis 为代表，帮你把“SQL 与 Java 对象之间的搬运”自动化，SQL 仍然由你写；另一类以 JPA / Hibernate 为代表，帮你把“表与对象之间的映射”自动化，SQL 由框架生成。' },
      { p: 'ORM 的核心是“对象与表的映射”，但两边并不完全对等：对象有继承、有引用，表只有行和列；对象可以双向导航，表只能靠外键关联。这种不对等叫“阻抗失配”，所有 ORM 框架的复杂点都来自这里。理解这一点，就不会指望框架能自动解决所有映射问题。' },
      { p: '映射的复杂度往往不在字段，而在关系：一对一、一对多、多对多，加载策略又会互相影响。先把表设计清楚，再谈框架，否则再好的 ORM 也只能把混乱映射得更快。' },
      { p: '这两条路线没有绝对优劣，只有适用场景。国内业务系统用 MyBatis 更多，因为 SQL 可控、优化方便；互联网外的企业应用、以及需要跨数据库的项目，用 JPA 更多，因为开发快、可移植。本章把两者都讲清楚，最后给出选型建议。' },
      { p: '数据访问层的职责很窄：把“查询/写入”翻译成数据库操作，并把结果转成对象。业务规则、事务边界、缓存策略都不应该塞进 Mapper 或 Repository。层次清楚，测试和替换实现才容易。' },
      { p: 'Repository 返回实体还是 DTO，是团队要提前定的规则。返回实体方便，但会把持久化结构泄露到上层；返回 DTO 多一层转换，却能让接口稳定。中大型项目建议在边界处转换。' },
      { p: '在事务内把实体转成 DTO 还有一个好处：可以在会话关闭前触发必要的懒加载，避免上层拿到代理对象后抛异常。转换代码放在 Service 里，Controller 只负责接收和返回。' },

      { h: '4.2 JDBC 的七步与它的痛点' },
      { p: '先看一段没有框架的 JDBC 代码。它能把数据查出来，但也能让你直观感受到重复在哪里。' },
      { p: '注意示例里的 SQL 用的是问号占位符，而不是把参数拼进字符串。这不是风格问题：拼接出来的 SQL 一旦遇到单引号或 OR 1=1，条件就会被改写。预编译占位符把“结构”和“值”分开传输，注入无从下手。' },
      { code: 'public User findById(long id) throws SQLException {\n    String sql = "SELECT id, name, age FROM users WHERE id = ?";\n    try (Connection conn = dataSource.getConnection();\n         PreparedStatement ps = conn.prepareStatement(sql)) {\n        ps.setLong(1, id);\n        try (ResultSet rs = ps.executeQuery()) {\n            if (!rs.next()) return null;\n            User u = new User();\n            u.setId(rs.getLong("id"));\n            u.setName(rs.getString("name"));\n            u.setAge(rs.getInt("age"));\n            return u;\n        }\n    }\n}', title: 'JdbcDemo.java' },
      { out: 'id=1, name=张三, age=28\nid=2, name=李四, age=31' },
      { p: '痛点有四。第一，结果集到对象的映射要手写，字段一多就是几十行 setter。第二，连接、语句、结果集三层资源都要关闭，漏一个就泄漏。第三，SQL 散落在 Java 代码里，字符串拼接容易出错，也不利于 DBA 审核。第四，分页、动态条件、批量插入这些常见需求，每种数据库写法都不一样。' },
      { p: 'JDBC 的异常是受检的 SQLException，调用方必须处理；资源关闭还得写在 finally 里，顺序错了会泄漏连接。这两件事都很机械，正是框架最适合接管的部分。MyBatis 把 SQLException 转成运行时异常，连接交给 SqlSession 管理。' },
      { p: 'MyBatis 的 SqlSession 不是线程安全的，不能做成单例字段共享。Spring 通过 SqlSessionTemplate 为每次操作获取或复用会话，并和事务绑定，这也是为什么不要在 Controller 里手动 openSession。' },
      { p: 'Spring 提供的 <code>JdbcTemplate</code> 解决了资源管理和参数绑定，但映射和 SQL 组织仍然要自己写。MyBatis 和 JPA 则分别从两个方向把剩下的痛点接了过去。' },
      { p: '两者的分野可以用一句话概括：MyBatis 把 SQL 的控制权留给你，JPA 把 SQL 的生成权拿走。前者适合 SQL 复杂、性能敏感、需要精细控制的场景；后者适合领域模型清晰、以 CRUD 为主、希望数据库可替换的场景。没有绝对优劣，只有匹配与否。' },
      { p: '一个常见误区是“用了 JPA 就不能写 SQL”。JPA 允许 nativeQuery，也允许把复杂查询放到自定义 Repository 实现里。关键不是“纯不纯”，而是把复杂 SQL 集中管理，别散落在 Service 中。' },

      { h: '4.3 MyBatis：SQL 由你写，搬运交给它' },
      { p: 'MyBatis 的核心思路是“SQL 可见、映射自动”。你写一个 Mapper 接口，只声明方法；SQL 写在注解或 XML 里；运行时 MyBatis 为接口生成代理，把方法调用翻译成 SQL 执行，再把结果集映射成对象。' },
      { p: 'MyBatis 的入口是 SqlSessionFactory，它由配置文件和数据源构建，线程安全，全局一个即可。每次操作从它拿到 SqlSession，用完关闭。Spring Boot 的 starter 会自动创建 SqlSessionFactory 并扫描 Mapper 接口，通常你不需要手写这段。' },
      { code: '@Mapper\npublic interface UserMapper {\n\n    @Select("SELECT id, name, age FROM users WHERE id = #{id}")\n    User findById(long id);\n\n    @Select("SELECT id, name, age FROM users ORDER BY id LIMIT #{offset}, #{size}")\n    List<User> page(@Param("offset") int offset, @Param("size") int size);\n\n    @Insert("INSERT INTO users(name, age) VALUES(#{name}, #{age})")\n    @Options(useGeneratedKeys = true, keyProperty = "id")\n    int insert(User user);\n}', title: 'UserMapper.java' },
      { p: '注解适合短 SQL，复杂 SQL 一般写在 XML 里，与接口放在同一包下、同名。MyBatis 启动时会解析这些 XML，把每个方法绑定到一条 SQL 语句上。' },
      { p: 'XML 的 namespace 必须等于 Mapper 接口的全限定名，语句 id 必须等于方法名，两者对不上就会报 Invalid bound statement。这是 MyBatis 最常见的配置错误，排查时先看 namespace 和 id，再看 XML 有没有被扫描到。' },
      { code: '<?xml version="1.0" encoding="UTF-8" ?>\n<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"\n  "http://mybatis.org/dtd/mybatis-3-mapper.dtd">\n<mapper namespace="com.example.mapper.UserMapper">\n\n  <resultMap id="userMap" type="com.example.domain.User">\n    <id property="id" column="id"/>\n    <result property="name" column="name"/>\n    <result property="age" column="age"/>\n  </resultMap>\n\n  <select id="findById" resultMap="userMap">\n    SELECT id, name, age FROM users WHERE id = #{id}\n  </select>\n</mapper>', title: 'UserMapper.xml' },
      { p: '如果表字段是下划线命名（user_name），对象是驼峰命名（userName），可以开启 <code>map-underscore-to-camel-case: true</code>，省掉大量 resultMap。字段差异较大时，再用 resultMap 显式指定。' },
      { p: '开启 map-underscore-to-camel-case 后，user_name 会自动映射到 userName，省掉大量 resultMap。但字段类型不一致、枚举、嵌套对象仍然需要 resultMap 或 TypeHandler。不要为了省事把映射问题留给“猜”，显式映射在重构时更安全。' },

      { h: '4.4 #{} 与 ${}：一个字符的生死之差' },
      { p: 'MyBatis 有两种参数占位写法。<code>#{}</code> 会被编译成 JDBC 的 <code>?</code>，参数通过 PreparedStatement 设置，天然防注入；<code>${}</code> 是纯字符串替换，参数直接拼进 SQL 文本。' },
      { p: '因此，凡是来自用户输入的值，一律用 <code>#{}</code>。只有表名、列名、排序字段这类“SQL 结构”无法用预编译参数表示的地方，才可能用到 <code>${}</code>，而且必须先用白名单校验。' },
      { p: '一个真实案例：排序参数直接拼进 ORDER BY，攻击者传 (case when ... then 1 else 2 end) 就能根据响应时间推断数据。排序字段、表名、列名都属于 SQL 结构，不能参数化，只能白名单。白名单要写成固定集合，不能用黑名单过滤关键字。' },
      { note: '<b>记住一句话：</b>值用 #{}，结构用 ${} 且必须白名单。看到 ${} 出现在用户可控的位置，就当成安全漏洞处理。' },

      { h: '4.5 动态 SQL：一个语句应付多种条件' },
      { p: '列表查询的条件往往是可选的：有时按名字查，有时按年龄区间查，有时什么都不传。如果用 Java 拼字符串，很快会变成一堆 if 和空格处理。MyBatis 的动态 SQL 标签就是为这件事准备的。' },
      { code: '<select id="search" resultType="com.example.domain.User">\n  SELECT id, name, age FROM users\n  <where>\n    <if test="name != null and name != \'\'">\n      AND name LIKE CONCAT(\'%\', #{name}, \'%\')\n    </if>\n    <if test="minAge != null">\n      AND age &gt;= #{minAge}\n    </if>\n    <if test="maxAge != null">\n      AND age &lt;= #{maxAge}\n    </if>\n  </where>\n  ORDER BY id DESC\n  LIMIT #{offset}, #{size}\n</select>', title: '动态查询' },
      { p: '<code>&lt;where&gt;</code> 会自动去掉开头多余的 AND，并在有条件时补上 WHERE 关键字。类似的还有 <code>&lt;set&gt;</code>（更新时去掉多余逗号）、<code>&lt;foreach&gt;</code>（IN 查询）、<code>&lt;choose&gt;</code>（多分支）。' },
      { p: '动态 SQL 还有 sql 片段与 include 复用，适合把公共列清单抽出来。但不要过度抽象，把一条 SQL 拆成七八个片段后，阅读时要来回跳转，反而更难维护。片段的边界应该是“稳定的公共部分”，而不是“能拆就拆”。' },
      { p: '使用 foreach 时要注意集合大小。一次传入一万个 id，SQL 会变得极长，数据库可能拒绝解析。批量场景应该分批，或者改用临时表、JOIN 等方式。' },
      { p: '批量插入用 foreach 拼 values 列表比逐条 insert 快一个数量级，但要受 max_allowed_packet 和 SQL 长度限制。更稳的做法是用 ExecutorType.BATCH，让 JDBC 驱动批量发送，同时控制每批条数。' },

      { h: '4.6 JPA：让对象自己会持久化' },
      { p: 'JPA 是规范，Hibernate 是最常用的实现。它的思路与 MyBatis 相反：你定义实体类，用注解描述它和表的对应关系；框架根据实体状态自动生成 SQL，你不再手写增删改查。' },
      { p: 'JPA 的实体有四种状态：新建、托管、游离、删除。只有托管状态的对象才会被脏检查跟踪，事务提交时自动生成 UPDATE。把实体查出事务后继续改，再 save，看起来也能更新，但那是 merge 的语义，和脏检查不是一回事。' },
      { code: '@Entity\n@Table(name = "users")\npublic class User {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n\n    @Column(nullable = false, length = 20)\n    private String name;\n\n    private Integer age;\n\n    // JPA 要求无参构造器\n    protected User() {}\n\n    public User(String name, Integer age) {\n        this.name = name;\n        this.age = age;\n    }\n\n    // getter / setter 省略\n}', title: 'User.java' },
      { p: '实体类必须有无参构造器（可以是 protected），因为框架要通过反射创建实例；字段不能是 final；主键要标注生成策略。这些约束经常被忽略，表现是启动或保存时报“no default constructor”。另外不要用 Lombok 的 <code>@Data</code> 生成 equals 和 hashCode，它会把所有字段算进去，实体放进集合或参与比对时行为会异常；需要时用业务主键或 id 实现，或者干脆不重写。' },
      { code: 'public interface UserRepository extends JpaRepository<User, Long> {\n\n    // 方法名派生查询：WHERE name = ?\n    List<User> findByName(String name);\n\n    // WHERE age > ? ORDER BY age DESC\n    List<User> findByAgeGreaterThanOrderByAgeDesc(int age);\n\n    // 复杂查询用 JPQL\n    @Query("SELECT u FROM User u WHERE u.name LIKE %:kw%")\n    List<User> search(@Param("kw") String keyword);\n\n    // 原生 SQL\n    @Query(value = "SELECT * FROM users WHERE age > ?1", nativeQuery = true)\n    List<User> findOlderThan(int age);\n}', title: 'UserRepository.java' },
      { out: 'Hibernate: select u1_0.id,u1_0.age,u1_0.name from users u1_0 where u1_0.id=?\nUser{id=1, name=张三, age=28}' },
      { p: '继承 <code>JpaRepository</code> 就自带了 save、findById、findAll、delete、count 等方法，连实现都不用写。方法名派生查询支持 And、Or、GreaterThan、Like、OrderBy 等关键字，简单查询几乎零成本。' },
      { p: '方法名查询很方便，但名字一长就可读性骤降，比如 findTop10ByStatusAndCreatedAtAfterOrderByCreatedAtDesc。超过三个条件就该写 @Query，让 SQL 或 JPQL 直接表达意图，别让方法名变成密码。' },
      { p: '需要说明的是，JPA 的“自动”不等于“没有 SQL”。复杂报表、多表聚合、窗口函数，JPA 生成的 SQL 往往不如手写直观，最后还是要退回 nativeQuery。这时 JPA 的优势就只剩下对象映射了。' },
      { p: '复杂报表用 nativeQuery 时，返回 Object 数组或接口投影，不要硬塞回实体。接口投影只声明 getter，Spring Data 会用代理填充，既避免多余列，也让代码意图更清楚。' },

      { h: '4.7 持久化上下文、懒加载与 N+1' },
      { p: 'JPA 有一个 MyBatis 没有的概念：持久化上下文（Persistence Context）。在同一个事务里，通过 find 查出的实体被缓存起来，第二次 find 不会再发 SQL；修改实体字段后不需要调用 update，事务提交时框架会自动比对快照并生成 UPDATE，这叫脏检查。' },
      { p: 'MyBatis 的一级缓存默认开启，作用域是同一个 SqlSession；Spring 集成后，一次事务内多次相同查询可能只发一次 SQL。二级缓存跨 Session，但需要手动开启并处理失效，分布式环境下很容易读到旧数据，生产环境慎用。' },
      { p: '这也带来一个陷阱：实体在事务外变成游离态，此时访问未加载的懒加载关联会抛 LazyInitializationException。解决办法不是把会话开得更久，而是在事务内完成数据组装、用 DTO 投影（不要把实体直接丢给前端），或者在需要的地方用 <code>JOIN FETCH</code> / <code>EntityGraph</code> 一次取回关联。' },
      { p: '另一个高频性能问题是 N+1 查询：查出一百个订单，再循环访问每个订单的用户，JPA 会额外发一百条 SQL。用 <code>@EntityGraph</code> 或 JPQL 的 <code>JOIN FETCH</code> 可以一次取回关联数据。' },
      { code: '// N+1：每次循环都查一次用户\nList<Order> orders = orderRepository.findAll();\nfor (Order o : orders) {\n    System.out.println(o.getUser().getName());\n}\n\n// 优化：一次 JOIN FETCH 取回\n@Query("SELECT o FROM Order o JOIN FETCH o.user")\nList<Order> findAllWithUser();', title: 'N+1 与 JOIN FETCH' },
      { p: 'MyBatis 没有这个问题，因为关联数据要不要查、怎么查，完全由你的 SQL 决定。这也是很多团队在复杂查询场景偏爱 MyBatis 的原因：性能表现更可预测。' },

      { h: '4.8 MyBatis 与 JPA 对比' },
      { table: { head: ['维度', 'MyBatis', 'JPA / Hibernate'], rows: [
        ['SQL 控制', '完全手写，可精确优化', '框架生成，复杂查询需退回原生 SQL'],
        ['开发效率', '简单 CRUD 也要写 SQL', '继承接口即得 CRUD，派生查询快'],
        ['学习曲线', '会 SQL 就能上手', '要理解实体状态、懒加载、级联'],
        ['数据库移植', 'SQL 方言差异要自己处理', '方言由框架适配，移植更容易'],
        ['性能可预测性', '高，执行计划一目了然', '中，需要看生成的 SQL'],
        ['典型场景', '复杂报表、既有库、SQL 优化', '领域模型清晰、CRUD 为主']
      ] } },
      { p: '选择时可以问三个问题：团队更擅长 SQL 还是领域建模？查询是简单 CRUD 还是复杂报表？数据库会不会换？三个问题答完，答案通常就出来了。' },
      { p: '选型还要看人：团队里 SQL 熟手多，MyBatis 的维护成本更低；领域建模经验多，JPA 的收益更大。最怕的是“两个都用一半”：JPA 里塞大量 nativeQuery，MyBatis 里又手写对象映射，两边的优点都没拿到。' },
      { p: '两者也可以共存：核心交易用 MyBatis 精确控制，后台管理用 JPA 快速开发。前提是事务和连接池统一管理，不要各自建一套数据源。' },
      { p: '混用时必须共享 DataSource 和事务管理器，否则 MyBatis 的 SqlSession 与 JPA 的 EntityManager 各自开连接，跨框架操作不在一个事务里，回滚只回滚一半。' },

      { h: '4.9 事务：@Transactional 到底做了什么' },
      { p: '事务保证一组操作要么全成功、要么全失败。Spring 把事务管理抽象成 <code>PlatformTransactionManager</code>，你只需要在方法上加 <code>@Transactional</code>，剩下的开启、提交、回滚由 AOP 代理完成。' },
      { p: '传播级别里最常用的是 REQUIRED 和 REQUIRES_NEW。前者加入现有事务，后者挂起当前事务另开一个，适合“记日志不受主流程回滚影响”的场景。但 REQUIRES_NEW 会占用额外连接，嵌套深了容易把连接池耗光。' },
      { flow: ['调用代理对象', '开启事务', '执行业务方法', '正常返回则提交', '抛异常则回滚', '释放连接'] },
      { code: '@Service\npublic class TransferService {\n\n    private final AccountMapper accountMapper;\n\n    public TransferService(AccountMapper accountMapper) {\n        this.accountMapper = accountMapper;\n    }\n\n    @Transactional\n    public void transfer(long from, long to, BigDecimal amount) {\n        accountMapper.deduct(from, amount);\n        if (amount.compareTo(BigDecimal.ZERO) <= 0) {\n            throw new IllegalArgumentException("金额必须大于 0");\n        }\n        accountMapper.add(to, amount);\n    }\n}', title: 'TransferService.java' },
      { p: '默认行为是：传播级别 REQUIRED（有事务就加入，没有就新建），隔离级别用数据库默认，遇到 RuntimeException 和 Error 回滚，遇到受检异常不回滚。需要受检异常也回滚时，写 <code>@Transactional(rollbackFor = Exception.class)</code>。' },
      { p: '受检异常默认不回滚，这是很多“数据没回滚”问题的根源。要么在方法里把受检异常包装成运行时异常，要么显式写 rollbackFor。团队里最好统一约定，不要一个方法一个写法。' },
      { p: '事务应该加在 Service 层，因为一个业务用例往往包含多次数据库操作。加在 Controller 上会让事务边界过宽，把参数校验、序列化都包进去，连接被占用更久；加在 Mapper 上则粒度太细，跨多次操作无法保证原子性。' },
      { p: '自调用失效的原因是代理：类内部调用不走代理对象，注解自然不生效。常见修法是把方法拆到另一个 Bean，或者注入自身代理。后者能解决问题，但会让代码依赖 Spring，优先选拆分。' },
      { table: { head: ['失效场景', '原因', '正确做法'], rows: [
        ['同类内部调用', 'this.method() 不经过代理', '拆到另一个 Bean，或注入自身代理'],
        ['方法不是 public', 'Spring 代理拦截不到', '改为 public，或改用 AspectJ'],
        ['异常被 catch 吞掉', '代理看不到异常，认为成功', '捕获后重新抛出，或手动 setRollbackOnly'],
        ['对象不是 Bean', 'new 出来的对象没有代理', '交给容器管理'],
        ['子线程执行', '事务绑定在当前线程', '在子线程内单独开启事务'],
        ['数据库引擎不支持', '如 MyISAM 无事务', '改用 InnoDB']
      ] } },
      { p: '传播行为里最常用的是 REQUIRED 和 REQUIRES_NEW。前者加入当前事务，后者挂起当前事务、独立开一个新事务，适合“记录日志不能因为主业务回滚而丢失”这类场景。NESTED 依赖保存点，用法更复杂，初学可以先跳过。' },
      { p: '隔离级别从低到高是读未提交、读已提交、可重复读、串行化。级别越高一致性越好、并发越差。MySQL 默认可重复读，PostgreSQL 默认读已提交。跨数据库迁移时，别假设默认级别一样，显式声明更稳。' },
      { note: '<b>只读优化：</b>纯查询方法加 @Transactional(readOnly = true)，框架会跳过脏检查、提示数据库用只读连接，能减少不必要的开销。' },

      { h: '4.10 连接池、分页与批量' },
      { p: '无论用哪种框架，底层都是 JDBC 连接。连接的创建成本很高，所以必须用连接池。Spring Boot 默认使用 HikariCP，核心参数是最大连接数、最小空闲连接、连接超时。最大连接数不是越大越好，超过数据库承载能力反而会拖慢整体。' },
      { p: '连接池的核心参数是最大连接数、最小空闲、获取超时、空闲检测。最大连接数要按数据库上限和实例数倒推，不是拍脑袋写 100。连接泄漏的表现是“跑一段时间后全部超时”，要配合泄漏检测排查。' },
      { p: 'MyBatis 分页常用 PageHelper 插件，它会拦截 SQL 自动加 LIMIT 和 count 查询；JPA 用 <code>Pageable</code> 参数，返回 <code>Page&lt;T&gt;</code> 对象，自带总数和总页数。两者都要注意深分页问题：limit 100000, 20 会扫描大量行，应该改用游标或基于 id 的范围查询。' },
      { p: 'JPA 这边用 <code>Pageable</code> 参数，返回 <code>Page</code> 对象，Spring Data 自动拼 limit 和 count。分页要注意 count 查询可能很慢，大表上先优化 count 或改用“是否有下一页”的判断。' },
      { p: '深分页（比如跳过十万行再取二十行）会扫描前十万行再丢弃，越翻越慢。优化方式是按 id 游标（where id > lastId order by id limit 20），或者先查主键再回表。业务上限制最大页数也是常见做法。' },
      { p: '批量插入时，逐条 insert 会产生大量网络往返。MyBatis 用 foreach 拼多值 INSERT，JPA 开启 <code>hibernate.jdbc.batch_size</code> 并避免逐条 flush。批量操作要控制单批大小，几百到一千条比较稳妥。' },
      { p: '批量操作要和事务配合：一个事务里插入一万条，锁和 undo 日志都会膨胀。分批提交、每批几百条，既控制内存也缩短锁持有时间。批量和事务不是越多越好，要看数据库的承受能力。' },

      { h: '4.11 本章小结' },
      { list: [
        'JDBC 的痛点是映射、资源、SQL 组织；MyBatis 解决映射和 SQL 组织，JPA 解决映射和 CRUD。',
        'MyBatis 的 #{} 是预编译参数，${} 是字符串拼接，用户输入只能用前者。',
        '动态 SQL 用 where、if、foreach，注意空值和集合大小。',
        'JPA 用实体描述表，Repository 提供 CRUD，复杂查询用 JPQL 或原生 SQL。',
        '@Transactional 基于代理，同类自调用、非 public 方法、异常被吞都会失效。',
        'N+1 是 JPA 的常见性能问题，用 JOIN FETCH 或 EntityGraph 解决。'
      ] },

      { h: '4.12 常见追问' },
      { list: [
        '<b>问：MyBatis 的 Mapper 接口没有实现类，为什么能调用？</b>答：MyBatis 用 JDK 动态代理生成实现，方法调用被转发到 MapperMethod，根据接口全限定名和方法名找到对应 SQL 执行。',
        '<b>问：为什么 MyBatis 的更新返回 0？</b>答：可能是条件没匹配到行，也可能是值没变化被数据库判定为无更新；先看影响行数和实际参数，再怀疑事务。',
        '<b>问：JPA 的 EntityManager 能注入到 Controller 吗？</b>答：技术上可以，但会延长持久化上下文、破坏分层，也让事务边界变得模糊。只在 Service 层使用。',
        '<b>问：JPA 的 save 到底是插入还是更新？</b>答：主键为空时走 persist（插入），主键不为空时走 merge（先查再更新）。所以不要手动给新对象设一个不存在的 id。',
        '<b>问：为什么查询结果字段是 null？</b>答：列名与属性名不匹配，且没开驼峰映射或没写 resultMap。先用日志打印实际 SQL 和结果集确认。',
        '<b>问：@Transactional 能加在接口上吗？</b>答：可以但不推荐。Spring 默认用 CGLIB 代理类，接口上的注解在某些配置下不生效；写在实现类的方法上最稳妥。',
        '<b>问：两个框架能一起用吗？</b>答：可以，但要共享同一个 DataSource 和事务管理器，否则跨框架的操作不在同一个事务里。',
        '<b>问：Mapper 能被扫描到，调用却报 Invalid bound statement？</b>答：namespace 或语句 id 与接口方法不匹配，或 XML 不在 mapper-locations 覆盖的路径下。',
        '<b>问：JPA 的 save 会立刻发 SQL 吗？</b>答：不一定，可能延迟到事务提交或 flush；想立刻拿到自增 id，可以用 saveAndFlush。',
        '<b>问：@Transactional 和 @Async 能一起用吗？</b>答：可以，但异步方法在新线程执行，事务上下文不会自动传播，需要各自管理事务边界。',
        '<b>问：懒加载异常怎么彻底避免？</b>答：在事务内把需要的数据转成 DTO，或者用 EntityGraph 一次性取回；不要依赖 Open Session in View 这种延长会话的做法。'
      ] },

      { h: '4.13 自测与练习' },
      { ol: [
        '用原生 JDBC 写一次按 id 查询，再分别用 MyBatis 和 JPA 实现，比较三者的代码量。',
        '用 JdbcTemplate 实现一个查询，再对比 MyBatis 版本的代码量。',
        '对比 MyBatis 与 JPA 在同一个分页查询上的 SQL 日志，记录各自发了几条语句。',
        '把一条 MyBatis 查询里的 ${} 改成 #{}，构造一个带 OR 1=1 的参数，观察行为差异。',
        '写一个带三个可选条件的动态查询，验证不传任何条件时 SQL 是否仍然合法。',
        '把一条拼接排序字段的 SQL 改成白名单校验，尝试传入非法字段并验证被拒绝。',
        '造一个自调用场景让 @Transactional 失效，再用拆分 Bean 的方式修复并对比。',
        '给转账方法加 @Transactional，故意在扣款后抛异常，验证两边余额都没有变化。',
        '构造一个 N+1 场景，用日志统计 SQL 条数，再用 JOIN FETCH 优化并对比。'
      ] }
    ]
  };
  T['deploy'] = {
    meta: '本章约 10000 字 · 建议 45 分钟 · 含 3 张表、1 张流程图与 7 段代码',
    blocks: [

      { h: '5.1 为什么学部署：代码写完只是开始' },
      { p: '在本地跑通一个项目，和在服务器上稳定运行一个项目，是两件难度完全不同的事。本地只有你一个用户、一个进程、一份配置；服务器上有并发、有网络抖动、有磁盘写满、有内存限制，还有随时可能出现的线上告警。' },
      { p: '“在我机器上是好的”是最典型的部署问题：开发机装了三套 JDK、本地 MySQL 版本和测试环境不同、系统时区是北京时间而服务器是 UTC。这些问题不会在代码评审里暴露，只会在上线那一刻集中出现。把运行环境标准化，本质上是把这类不确定性提前消灭。' },
      { p: '标准化不是追求“所有环境完全一样”，而是把差异显式化：JDK 版本、时区、字符集、内存上限、依赖服务地址，全部写进配置或镜像，而不是靠人记住。' },
      { p: '部署这件事由三块拼成：日志让你在出问题时能看见现场，打包把源码变成可交付的产物，容器化让开发、测试、生产使用同一份运行环境。三块缺一块，都会在上线后以“诡异问题”的形式补回来。' },
      { p: '三块能力之间还有依赖关系：没有结构化日志，出了问题只能靠猜；没有稳定打包，每次发布都像手工实验；没有容器化，环境差异永远存在。建议按“日志、打包、容器”的顺序补，因为前一步的产出正好是后一步的输入。' },
      { p: '发布流程的可重复性比“快”更重要。一次手工操作成功不代表下次也能成功，把步骤写进脚本或流水线，才能让“回滚”和“重发”变成确定动作。' },
      { p: '这一章不讲 Kubernetes 的高级调度，只讲一名 Java 开发者必须亲手会的部分：怎么打日志、怎么打 jar、怎么用 Docker 跑起来、出问题先看哪里。' },

      { h: '5.2 日志：不要再用 System.out' },
      { p: '<code>System.out.println</code> 能打印，但它没有级别、没有时间、没有线程名、不能按天切分、不能按包过滤，也不能在运行时关掉。生产环境用它，等于把排查线索扔进一个不断增长且无法检索的黑洞。' },
      { p: '接入日志时最常见的问题是“多套实现打架”：类路径里同时有 logback 和 log4j2，启动时会提示多个 SLF4J 绑定，实际生效的可能是你不想要的那个。解决办法是排除多余的实现，只保留一个，并确认桥接包版本匹配。' },
      { p: 'Java 生态的日志分两层：门面（facade）和实现（implementation）。门面是 SLF4J，只提供统一的 API；实现是 Logback、Log4j2 等，真正决定日志输出到哪里、什么格式。业务代码只依赖门面，将来换实现不用改一行业务代码。' },
      { p: '一条好的日志应该能独立回答：谁在什么时候、对什么对象、做了什么、结果如何。时间由框架加，线程名和 traceId 由 MDC 加，业务代码只需要写清楚“对象”和“结果”。字段固定下来，日志平台才能做聚合和告警。' },
      { p: '日志格式推荐 JSON：字段可检索、可聚合，采集端不需要正则解析。人读的体验稍差，但线上排查多数时候是在日志平台里搜索，而不是盯着终端。' },
      { code: 'import org.slf4j.Logger;\nimport org.slf4j.LoggerFactory;\n\n@RestController\npublic class OrderController {\n\n    private static final Logger log =\n            LoggerFactory.getLogger(OrderController.class);\n\n    @PostMapping("/orders")\n    public Order create(@RequestBody OrderForm form) {\n        log.info("创建订单 userId={} amount={}", form.getUserId(), form.getAmount());\n        try {\n            return service.create(form);\n        } catch (Exception e) {\n            log.error("创建订单失败 userId={}", form.getUserId(), e);\n            throw e;\n        }\n    }\n}', title: 'OrderController.java' },
      { p: '注意 <code>log.info</code> 的写法：用 <code>{}</code> 占位而不是字符串拼接。占位符只在对应级别开启时才会被替换，日志被关掉时几乎没有开销；字符串拼接则无论日志开不开都要执行。' },
      { p: '还有一个细节：<code>log.error("失败", e)</code> 把异常作为最后一个参数传入，框架会打印完整堆栈；写成 <code>log.error(e.getMessage())</code> 只会留下一行文字，堆栈全丢，线上根本没法定位。' },
      { p: '打印异常要用 log.error("下单失败，orderId={}", orderId, e)，把异常对象作为最后一个参数传进去，框架才会输出完整堆栈。写成字符串拼接再传，堆栈就丢了。另外，日志里不要打印密码、token、身份证号，脱敏要在入口处做。' },
      { note: '<b>硬性规范：</b>密码、身份证号、银行卡号、完整手机号、Token 一律不允许进日志。需要排查时打印脱敏后的尾号或哈希值。' },

      { h: '5.3 级别怎么用，才不会刷屏' },
      { p: '日志级别从低到高是 TRACE、DEBUG、INFO、WARN、ERROR。配置成某个级别后，比它低的日志不会输出。生产环境通常配置 INFO，需要排查时临时把某个包调到 DEBUG。' },
      { p: '生产上临时调级别有两种做法：改配置文件后重启，或者用 Actuator 的 loggers 端点在运行时调整。后者不需要重启，但调完要记得改回去，否则日志量会在无人察觉时涨上来，把磁盘写满。' },
      { p: '调整级别后要设一个自动恢复的时间点，或者把这次调整记进值班记录。很多“磁盘突然满了”的事故，源头就是某次临时开的 DEBUG 忘了关。' },
      { table: { head: ['级别', '含义', '使用场景', '生产是否开启'], rows: [
        ['ERROR', '需要人介入的错误', '支付失败、数据库连不上、消息堆积', '是，并接告警'],
        ['WARN', '可能有问题但不影响主流程', '重试成功、降级触发、参数异常值', '是'],
        ['INFO', '关键业务节点', '订单创建、任务开始结束、配置加载', '是，控制数量'],
        ['DEBUG', '调试细节', '入参出参、SQL 与参数、分支走向', '默认关闭，按需打开'],
        ['TRACE', '极细粒度', '循环内每一步、协议细节', '几乎不用']
      ] } },
      { p: '判断该用哪个级别，问自己一个问题：这条日志出现时，需不需要有人半夜爬起来处理？需要就是 ERROR；只是提醒可能有问题就是 WARN；记录正常业务流程就是 INFO；只有排查特定问题时才想看就是 DEBUG。' },
      { p: '高并发服务还要考虑日志采样：每个请求都打一条“收到请求”，QPS 一万时就是一万行。可以对同类日志做限流或按比例采样，错误日志则必须全量保留。采样的目标是“保留趋势和异常”，不是“保留每一行”。' },
      { p: '比级别更容易被忽略的是“日志内容”。一条好的日志应该包含：谁（用户或请求 id）、做了什么、结果如何、关键参数、耗时。只写“开始处理”“处理完成”，等于什么都没写。' },

      { h: '5.4 用 logback-spring.xml 管好输出' },
      { p: 'Spring Boot 默认加载 <code>classpath:logback-spring.xml</code>。带 -spring 后缀的版本可以使用 <code>&lt;springProfile&gt;</code> 标签，按环境切换配置，比写死更灵活。' },
      { code: '<?xml version="1.0" encoding="UTF-8"?>\n<configuration>\n\n  <property name="LOG_DIR" value="/var/log/shop"/>\n\n  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">\n    <encoder>\n      <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n</pattern>\n    </encoder>\n  </appender>\n\n  <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">\n    <file>${LOG_DIR}/app.log</file>\n    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">\n      <fileNamePattern>${LOG_DIR}/app.%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>\n      <maxFileSize>100MB</maxFileSize>\n      <maxHistory>7</maxHistory>\n      <totalSizeCap>2GB</totalSizeCap>\n    </rollingPolicy>\n    <encoder>\n      <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n</pattern>\n    </encoder>\n  </appender>\n\n  <springProfile name="prod">\n    <root level="INFO">\n      <appender-ref ref="FILE"/>\n    </root>\n  </springProfile>\n\n  <springProfile name="!prod">\n    <root level="DEBUG">\n      <appender-ref ref="CONSOLE"/>\n    </root>\n  </springProfile>\n\n</configuration>', title: 'logback-spring.xml' },
      { p: '这个配置做了四件事：控制台输出、文件输出、按天加大小滚动、生产只写文件。滚动策略里 <code>maxHistory</code> 控制保留天数，<code>totalSizeCap</code> 控制总大小，两者必须都设，否则磁盘迟早被日志写满。' },
      { p: '滚动策略要配合磁盘容量估算：单条日志约 200 字节，每天一千万条就是 2G。按这个量级设置单文件大小和保留天数，别等磁盘告警了才回头删日志。容器环境更推荐输出到标准输出，由运行时统一收集和轮转。' },
      { p: '容器里写文件日志要挂卷，否则容器一删日志就没了；更推荐直接输出到标准输出，由 Docker 或 K8s 的日志驱动接管，采集和轮转都不用自己维护。' },
      { p: '高并发服务还可以加 <code>AsyncAppender</code>，把日志写入放到独立线程，避免磁盘慢时阻塞业务线程。代价是进程崩溃时可能丢掉队列里最后几条日志，所以队列大小和丢弃策略要评估。' },
      { p: '异步日志的队列满了以后，默认策略是阻塞或丢弃，两者都有代价：阻塞会拖慢业务线程，丢弃会丢日志。生产环境通常选“队列满时丢弃 DEBUG、保留 ERROR”，并监控丢弃计数。' },

      { h: '5.5 打包：从源码到可执行 jar' },
      { p: 'Java 的交付物通常是 jar。普通 jar 只包含自己的 class，依赖需要额外提供；Spring Boot 打的是“可执行 jar”（也叫 fat jar），把依赖、内嵌 Tomcat、启动器全部塞进一个文件，<code>java -jar</code> 就能跑。' },
      { table: { head: ['形式', '特点', '适用场景'], rows: [
        ['普通 jar', '只有自身 class，依赖靠 classpath 提供', '作为库被其他项目引用'],
        ['可执行 fat jar', '含依赖与内嵌容器，单文件启动', 'Spring Boot 独立部署，最常用'],
        ['war', '部署到外部 Tomcat', '必须复用公司既有容器时'],
        ['原生镜像', 'GraalVM 编译成本地可执行文件', '追求启动速度与低内存，构建复杂']
      ] } },
      { code: '<!-- pom.xml 片段 -->\n<build>\n  <plugins>\n    <plugin>\n      <groupId>org.springframework.boot</groupId>\n      <artifactId>spring-boot-maven-plugin</artifactId>\n      <configuration>\n        <mainClass>com.example.App</mainClass>\n      </configuration>\n    </plugin>\n  </plugins>\n</build>', title: 'pom.xml' },
      { p: '执行 <code>mvn clean package</code>，会在 target 下得到 app.jar。用 <code>java -jar</code> 运行时，Spring Boot 的 JarLauncher 会读取 BOOT-INF/lib 下的嵌套 jar，构造一个自定义类加载器加载它们，这就是“一个文件装下所有依赖”的实现方式。' },
      { p: 'Spring Boot 3 支持分层 jar：依赖、快照依赖、应用类、资源分别放在不同层。Docker 构建时把变化最少的一层放前面，改代码只会重建最后一层，镜像推送和拉取都能快很多。这不是微优化，在频繁发布时收益很明显。' },
      { p: '如果想打 war，把打包方式改成 war，并让启动类继承 SpringBootServletInitializer。除非公司强制要求外部 Tomcat，否则优先用 jar：更简单，也更容易容器化。' },

      { h: '5.6 启动参数与 JVM 调优' },
      { p: '启动命令有两类参数：JVM 参数在 <code>-jar</code> 之前，由 JVM 消费；应用参数在 <code>-jar</code> 之后，由 Spring Boot 消费。两者位置写反，参数就不会生效。' },
      { code: '# JVM 参数在前，应用参数在后\njava -Xms512m -Xmx512m \\\n     -XX:MaxRAMPercentage=75 \\\n     -Duser.timezone=Asia/Shanghai \\\n     -Dfile.encoding=UTF-8 \\\n     -jar app.jar \\\n     --spring.profiles.active=prod \\\n     --server.port=8080', title: '启动命令' },
      { out: 'java -jar app.jar --spring.profiles.active=prod\nStarted App in 2.104 seconds (process running for 2.68)' },
      { p: '<code>-Xms</code> 和 <code>-Xmx</code> 设成一样，可以避免堆反复扩容收缩；在容器里更推荐 <code>-XX:MaxRAMPercentage</code>，让 JVM 按容器内存上限的百分比计算堆大小，避免写死 2G 而容器只有 1G 被 OOM Kill。' },
      { p: '垃圾收集器选择也有讲究：低延迟优先用 G1，大堆且停顿敏感可以试 ZGC；JDK 8 默认是 Parallel，很多老项目从没改过。开启容器感知后，JVM 会按 cgroup 限制计算默认堆大小，但显式设置仍然更可控。' },
      { p: '时区参数经常被忽略。默认时区取决于操作系统，容器镜像通常是 UTC，于是日志时间和业务时间差八小时。显式指定 <code>-Duser.timezone=Asia/Shanghai</code>，或者在镜像里设置 TZ 环境变量，能省掉很多“时间对不上”的排查。' },
      { p: '编码问题同样常见：文件读取用了平台默认编码，在 Windows 上正常、在 Linux 上乱码。启动参数加 -Dfile.encoding=UTF-8，并在读写文件时显式指定字符集，能避免大部分“只有线上才出现”的乱码。' },
      { p: '应用参数用 <code>--key=value</code> 形式，优先级高于配置文件。临时改端口、切 profile、调日志级别，都可以不改包直接加参数，这在应急时非常有用。' },

      { h: '5.7 用 Docker 固化运行环境' },
      { p: '“在我机器上能跑”是部署里最经典的问题，根源是环境不一致：JDK 版本不同、时区不同、系统库不同。Docker 把 JDK、jar、启动脚本、环境变量一起打进镜像，任何机器上跑出来的行为都一致。' },
      { code: '# 第一阶段：构建\nFROM maven:3.9-eclipse-temurin-21 AS build\nWORKDIR /src\nCOPY pom.xml .\nRUN mvn -q dependency:go-offline\nCOPY src ./src\nRUN mvn -q clean package -DskipTests\n\n# 第二阶段：运行\nFROM eclipse-temurin:21-jre-jammy\nWORKDIR /app\n\nRUN useradd -r -u 10001 appuser\nCOPY --from=build /src/target/app.jar app.jar\nRUN mkdir -p /var/log/shop && chown -R appuser:appuser /app /var/log/shop\nUSER appuser\n\nENV TZ=Asia/Shanghai \\\n    JAVA_OPTS="-Xms256m -Xmx512m"\n\nEXPOSE 8080\nHEALTHCHECK --interval=30s --timeout=3s --retries=3 \\\n  CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1\n\nENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]', title: 'Dockerfile' },
      { out: 'docker build -t demo:1.0.0 .\n => exporting to image\n => => naming to docker.io/library/demo:1.0.0\ndocker run -p 8080:8080 demo:1.0.0\n2026-10-20T21:30:00  INFO 1 --- [main] o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port 8080 (http)' },
      { p: '这份 Dockerfile 有几个值得注意的点。第一，多阶段构建：构建阶段用带 Maven 的镜像，运行阶段只保留 JRE，最终镜像小很多，也不会把源码带进生产环境。' },
      { p: '镜像构建要利用缓存：先复制 pom 或依赖清单，再复制源码，这样改代码不会让依赖层失效。配合 .dockerignore 排除 target、.git、日志文件，避免把几百兆的构建产物塞进构建上下文。' },
      { p: '第二，先 COPY pom.xml 再下载依赖，利用 Docker 层缓存：源码改动不会导致依赖重新下载。第三，用非 root 用户运行，降低容器被攻破后的影响。第四，<code>exec</code> 让 java 成为 1 号进程，能正确接收停止信号并优雅关闭。' },
      { p: '容器里不要用 root 运行 Java 进程：创建普通用户，切换后再启动。这样即使应用被攻破，攻击者拿到的权限也有限。同时设置合理的停止宽限期，让 Spring 有时间处理完手头请求。' },
      { p: '还有一条经验：基础镜像不要用 latest 标签，应该固定到具体版本甚至 digest，否则某天上游更新会让构建结果悄悄变化，问题极难复现。' },

      { h: '5.8 用 compose 拉起完整环境' },
      { p: '本地或测试环境通常需要应用加数据库。docker compose 用一个 yml 描述多个容器、网络和依赖关系，一条命令全部拉起。' },
      { code: 'services:\n  db:\n    image: mysql:8.0\n    environment:\n      MYSQL_DATABASE: shop\n      MYSQL_ROOT_PASSWORD: root-pass\n    volumes:\n      - db-data:/var/lib/mysql\n    healthcheck:\n      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]\n      interval: 10s\n      retries: 5\n\n  app:\n    image: registry.example.com/shop/app:1.0.0\n    ports:\n      - "8080:8080"\n    environment:\n      SPRING_PROFILES_ACTIVE: prod\n      DB_PASSWORD: change-me\n      TZ: Asia/Shanghai\n    depends_on:\n      db:\n        condition: service_healthy\n    volumes:\n      - ./logs:/var/log/shop\n\nvolumes:\n  db-data:', title: 'docker-compose.yml' },
      { p: 'environment 里的配置会覆盖 application.yml 的同名项，这就是“配置外置”：镜像只打一次，不同环境通过环境变量注入差异。数据库密码、第三方密钥都不要打进镜像。' },
      { p: 'compose 里的网络要注意服务名解析：应用配置里的数据库地址写服务名 mysql，而不是 localhost。数据用命名卷持久化，否则容器删了数据也没了。环境变量可以放在 .env 文件里，但不要提交到仓库。' },
      { p: '<code>depends_on</code> 配合 <code>condition: service_healthy</code> 能保证数据库真正可用后再启动应用，否则应用先启动、连不上库直接退出，是本地部署最常见的一类失败。' },

      { h: '5.9 可观测性：日志、指标、健康检查' },
      { p: '线上出问题时，你需要三样东西：日志告诉你“发生了什么”，指标告诉你“影响多大”，健康检查告诉运维“这个实例还能不能接流量”。' },
      { code: '# application.yml\nmanagement:\n  endpoints:\n    web:\n      exposure:\n        include: health,info,metrics,prometheus\n  endpoint:\n    health:\n      show-details: when-authorized\n      probes:\n        enabled: true\n  health:\n    livenessstate:\n      enabled: true\n    readinessstate:\n      enabled: true', title: 'Actuator 配置' },
      { p: 'Actuator 的 health 端点会聚合数据库、磁盘、Redis 等检查项。liveness 探针判断进程是否需要重启，readiness 探针判断是否可以接收流量。两者分开，才能做到“启动慢但不重启”和“依赖挂了先摘流量”。' },
      { p: '探针配置要留足启动时间：initialDelaySeconds 太短会让慢启动应用被反复重启，failureThreshold 太小会被一次抖动误杀。就绪探针检查依赖（数据库、下游），存活探针只检查进程本身，两者职责不要混。' },
      { p: '指标方面，Micrometer 把 JVM 内存、GC、HTTP 请求耗时、连接池状态暴露成统一格式，再接 Prometheus 和 Grafana 做面板与告警。日志量大时，用 Filebeat 或 Fluent Bit 采集到 Elasticsearch，按 traceId 串起一次请求的全部日志。' },
      { p: 'traceId 要在入口生成：网关或 Filter 里取请求头，没有就生成一个，放进 MDC，响应头也带回去。这样用户报障时提供一个 id，就能把整条链路的日志捞出来，不用靠时间范围大海捞针。' },
      { p: 'Actuator 默认只暴露 health 和 info，开启其他端点时要配合鉴权或只在内网端口暴露。生产环境至少把 env、heapdump、threaddump 保护起来，它们能读到配置甚至导出内存快照，泄露的后果比想象中严重。' },

      { h: '5.10 一次完整的发布流程' },
      { p: '真正的上线不是“把 jar 传上去”这么简单，而是一条可重复、可回滚的流水线。下面这条是大多数团队的最小实践。' },
      { flow: ['提交代码', 'CI 构建与测试', '打出 jar', '构建镜像', '推送镜像仓库', '部署到目标环境', '健康检查', '观察日志与指标', '必要时回滚'] },
      { p: '提交代码后，CI 拉取代码、跑单元测试、执行打包。测试不通过就不产出制品，这是第一道闸门；跳过测试直接打包，等于把风险推迟到线上。' },
      { p: '镜像构建完成后打上版本号（通常是 git commit 短哈希或语义化版本），推送到镜像仓库。部署时用版本号拉取，而不是覆盖 latest，这样任何一次发布都能精确回溯到代码。' },
      { p: '部署完成后先做健康检查：进程是否活着、端口是否监听、<code>/actuator/health</code> 是否返回 UP、关键接口能否跑通。健康检查通过再把流量切过来，失败就立即回滚到上一个版本。' },
      { p: '流量切换有几种做法：蓝绿部署准备两套环境，切 DNS 或网关权重；灰度发布先放 1% 流量，观察错误率和耗时再逐步放大；滚动发布则逐个替换实例。无论哪种，回滚都必须是“一条命令”，而不是重新走一遍发布流程。' },
      { p: '最后是观察期。发布后的前十分钟最容易出问题，重点看错误日志、接口耗时、数据库连接数、GC 频率。没有问题再离开，不要部署完就关电脑。' },

      { h: '5.11 上线后最常见的六个问题' },
      { table: { head: ['现象', '常见原因', '排查方向'], rows: [
        ['时间差 8 小时', '容器默认 UTC，未设时区', '检查 TZ 与 -Duser.timezone'],
        ['中文乱码', '编码未统一为 UTF-8', 'file.encoding、数据库连接串、响应头'],
        ['启动即退出', '连不上数据库或端口被占用', '看启动日志最后 50 行与 exit code'],
        ['内存持续上涨后被 Kill', '堆设置超过容器限额，或存在泄漏', '对比容器上限与 Xmx，看 GC 与堆转储'],
        ['配置没生效', 'profile 没激活或环境变量名写错', '看启动日志里的 active profiles'],
        ['日志文件写不进去', '目录权限或磁盘满', '检查挂载目录属主与 df -h']
      ] } },
      { p: '排查顺序建议固定下来：先看进程在不在，再看端口通不通，再看日志有没有异常，最后看资源和依赖。按这个顺序走，比一上来就重启服务有效得多。' },
      { p: '告警阈值要基于历史数据设定，而不是拍脑袋。CPU 80% 持续五分钟、错误率超过 1%、P99 超过 500 毫秒，这些阈值要随业务变化定期校准。告警太多会让人麻木，太少又会漏掉真问题。' },
      { p: '部署能力不是靠一次成功建立的，而是靠每次失败后补上的检查项积累起来的。所以每次发布都记录版本号和变更内容；每次线上问题处理完，都应该留下三样东西：一条可检索的日志、一个监控指标、一条写入发布检查清单的规则。下次同类问题发生时，至少能更快发现、更快定位。这比写一份没人看的复盘文档有用得多。' },

      { h: '5.12 本章小结' },
      { list: [
        '日志用 SLF4J 门面 + Logback 实现，占位符写法，异常对象作为最后一个参数。',
        '生产用 INFO，ERROR 接告警；日志按天和大小滚动，必须设保留天数与总大小上限。',
        'Spring Boot 打可执行 fat jar，java -jar 即可运行，JVM 参数在前、应用参数在后。',
        'Docker 多阶段构建减小镜像，非 root 运行，固定基础镜像版本。',
        '配置外置到环境变量，镜像只构建一次，多环境复用。',
        '发布要有健康检查、观察期和回滚方案；Actuator 只暴露必要端点。'
      ] },

      { h: '5.13 常见追问' },
      { list: [
        '<b>问：日志里要不要打印完整请求体？</b>答：调试时可以，生产要谨慎：请求体可能含敏感信息，也可能非常大。更稳妥的做法是打印关键字段和请求 id。',
        '<b>问：Docker 镜像越小越好吗？</b>答：小意味着拉取快、攻击面小，但不要为了小牺牲可调试性；保留 jcmd、jstack 等工具，或使用 distroless 加临时调试容器，都是可接受的折中。',
        '<b>问：-Xmx 设置多大合适？</b>答：容器里让堆占容器内存的 60% 到 75%，留出元空间、线程栈、直接内存和系统缓存的空间；设置后用压测验证，而不是凭感觉。',
        '<b>问：为什么容器里的 Java 看起来内存超了限制？</b>答：堆只是一部分，还有元空间、线程栈、Netty 直接内存、JIT 代码缓存。JDK 8 早期版本不识别容器限制，需要升级或显式设置。',
        '<b>问：jar 和镜像哪个是交付物？</b>答：jar 是构建产物，镜像是部署产物。CI 里两者都应该有版本号，镜像里包含 jar，保证可追溯。',
        '<b>问：为什么容器里日志时间差八小时？</b>答：容器默认时区常是 UTC，JVM 也跟着走。设置 TZ=Asia/Shanghai 或挂载 /etc/localtime，日志时间才对得上。',
        '<b>问：健康检查通过就一定没问题吗？</b>答：不一定。健康检查只说明进程和关键依赖可用，业务正确性还要靠监控指标和冒烟测试。',
        '<b>问：滚动发布时旧实例还能接请求吗？</b>答：可以，但需要 readiness 探针和优雅停机。收到停止信号后先摘流量，再等待处理中的请求完成。',
        '<b>问：日志采集会不会影响性能？</b>答：同步写磁盘在大流量下会有影响，可以用异步 appender 或直接输出到标准输出，由容器运行时统一采集。'
      ] },

      { h: '5.14 自测与练习' },
      { ol: [
        '给一个项目配置 logback-spring.xml，实现控制台加文件双输出、按天滚动、保留 7 天，并验证滚动是否生效。',
        '把日志格式改成 JSON，并在日志平台里按 traceId 查询一次完整请求。',
        '用 mvn clean package 打出 jar，分别在本地和另一台机器上用 java -jar 启动，记录两次的 JVM 版本与默认时区。',
        '写一个 Dockerfile，用多阶段构建把镜像体积压到只含 JRE 和 jar，并用非 root 用户运行。',
        '给日志加上 traceId：在 Filter 里生成并放进 MDC，验证同一次请求的多行日志能串起来。',
        '把镜像改成非 root 用户运行，并配置优雅停机，观察停止时是否还有请求被中断。',
        '用 docker compose 拉起应用和 MySQL，故意不配健康检查，观察应用启动失败的过程，再补上依赖条件。',
        '开启 Actuator，只暴露 health 和 metrics，用 curl 检查 liveness 与 readiness 的返回。',
        '模拟一次发布失败（例如把数据库密码改错），按本章的顺序排查，并写出回滚步骤。'
      ] }
    ]
  };
})();
