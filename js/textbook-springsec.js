/* 教材正文：Spring AOP 与 Spring Security（两章，每章约 5500 字） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['spring-aop'] = {
    meta: '本章约 5500 字 · 建议 30 分钟 · 配套流程图与 3 道习题',
    blocks: [

      { h: '1.1 为什么学 AOP：从重复的日志说起' },
      { p: '一个 Service 里十个方法，每个开头打印入参、结尾计算耗时、抛异常再记一笔。需求一改成“只记录慢方法”，就要改十处；漏改一处，日志就少一条。' },
      { p: '日志、事务、权限、缓存、限流有一个共同点：它们不属于某个具体业务，却横跨大量方法。这类逻辑叫横切关注点。抄进每个方法，业务代码被淹没；抽成工具方法，又得手动调用、容易漏。' },
      { p: 'AOP 把横切逻辑集中写一次，由框架在运行时织入目标方法前后。类还是那些类，方法还是那些方法，只是调用时中间多了一个代理对象。' },
      { note: '<b>一句话：</b>AOP 让“每个方法都要做、但和业务无关”的事只写一遍，并由框架保证不漏。' },

      { h: '1.2 术语：五个核心概念，加上目标、代理、顾问与引入' },
      { p: '切面（Aspect）：横切逻辑的封装，通常是一个带 <code>@Aspect</code> 的类。' },
      { p: '连接点（Join Point）：程序执行中可以插入增强的点。Spring AOP 只支持方法执行，所以基本等于“每个可能被拦截的方法”。' },
      { p: '切点（Pointcut）：一个表达式，从所有连接点里挑出真正要拦的。它回答“在哪拦”。' },
      { p: '通知（Advice）：拦截之后做什么、什么时候做——前、后、环绕、异常时。它回答“做什么”。' },
      { p: '织入（Weaving）：把切面和目标对象组合、生成代理的过程。Spring 在运行时织入，AspectJ 可以在编译期完成。' },
      { list: [
        '<b>切点</b>决定拦不拦，<b>通知</b>决定做什么，<b>切面</b>把两者装在一起。',
        '<b>连接点</b>是客观候选，<b>切点</b>是你选中的子集。',
        '<b>织入</b>是动作，产物是代理；没有代理就没有 AOP。'
      ] },
      { p: '物业比喻：每户人家是连接点，选中的几户是切点，上门维修是通知，整份服务方案是切面，派人上门就是织入。' },
      { p: '目标对象（Target）：真正写业务逻辑的那个实例，也就是被代理包裹的对象。它自己并不知道外面还有一层代理。' },
      { p: '代理对象（Proxy）：容器交给调用方的那个实例，负责在调用前后插入通知，再把调用转发给目标。你注入的、你调用的，基本都是它。' },
      { p: '顾问（Advisor）：把切点和通知绑在一起的最小单位。一个切面在框架内部会被拆成若干顾问，按顺序逐个匹配、逐个套在代理上。' },
      { p: '引入（Introduction）：给目标类额外“添加”一个接口和实现，让原本没有这个能力的对象也能被当成该接口使用。它超出了普通方法拦截的范围，业务里很少用，但概念上要能和通知区分开。' },

      { h: '1.3 第一个切面：统计方法耗时' },
      { p: '下面这个切面拦截 service 包的所有方法，无论正常返回还是抛异常，都打印方法名和耗时。' },
      { lang: 'java', code: '@Aspect\n@Component\npublic class LogAspect {\n\n    @Around("execution(* com.example.service.*.*(..))")\n    public Object log(ProceedingJoinPoint pjp) throws Throwable {\n        long start = System.currentTimeMillis();\n        try {\n            return pjp.proceed();\n        } finally {\n            System.out.println(pjp.getSignature().toShortString()\n                    + " 耗时 " + (System.currentTimeMillis() - start) + "ms");\n        }\n    }\n}', title: 'LogAspect.java' },
      { out: 'OrderService.create 耗时 12ms\nOrderService.cancel 耗时 3ms' },
      { p: '<code>@Aspect</code> 声明切面，<code>@Component</code> 交给容器，<code>@Around</code> 是环绕通知，<code>pjp.proceed()</code> 才真正调用目标方法，<code>finally</code> 保证异常时也打印。' },
      { p: '必须写 <code>return pjp.proceed()</code>。如果写成 <code>pjp.proceed(); return null;</code>，调用方拿到 null，业务立刻出错，这是新手最常见的事故之一。' },
      { p: '还要确认有 <code>spring-boot-starter-aop</code> 依赖、切面所在包被扫描到。切面没被扫描，AOP 会静默不生效，不报错，只表现为“日志怎么没打”。' },

      { h: '1.4 五种通知：什么时候做什么' },
      { table: { head: ['类型', '注解', '时机', '典型用途'], rows: [
        ['前置', '@Before', '方法执行前', '参数校验、打印入参'],
        ['后置返回', '@AfterReturning', '正常返回后', '记录结果、审计'],
        ['后置异常', '@AfterThrowing', '抛出异常后', '统一告警、补上下文'],
        ['最终', '@After', '结束后，无论成败', '释放资源'],
        ['环绕', '@Around', '包住整个方法', '计时、事务、缓存']
      ] } },
      { p: '只有 <code>@Around</code> 能控制“要不要执行目标方法”，也只有它能改参数和返回值。需要这些能力才用环绕，否则用更具体的通知，意图更清楚。' },
      { p: '<code>@Before</code> 拿不到返回值，也改不了参数——除非参数是可变对象，在通知里改它的字段。它的返回值会被忽略，写 <code>return</code> 没有任何作用。' },
      { p: '<code>@AfterReturning</code> 用 <code>returning = "result"</code> 绑定返回值，方法签名再加一个 <code>Object result</code>。注意这里改的只是局部变量，调用方拿到的仍是原值；想替换返回值只能用 <code>@Around</code> 显式 return 新对象。' },
      { p: '<code>@AfterThrowing</code> 用 <code>throwing = "ex"</code> 绑定异常。它只能观察，不能吞掉异常；想让异常变成别的类型或不再抛出，位置只能在 <code>@Around</code> 的 try-catch 里。' },
      { p: '<code>@After</code> 相当于 finally，成败都执行，适合清理 ThreadLocal、关闭自己打开的资源。它既拿不到返回值也拿不到异常，别在里面做依赖结果的动作。' },
      { p: '<code>@Around</code> 的形参必须是 <code>ProceedingJoinPoint</code>，返回类型必须是 <code>Object</code>；写成 <code>JoinPoint</code> 会在启动时报错。它必须自己调用 <code>proceed()</code>，不调用就等于“拦下来不执行”——缓存命中直接返回，靠的正是这一点。' },
      { p: '选择原则很简单：能用 <code>@Before</code> 就别上 <code>@Around</code>。环绕把“进”和“出”写在一个方法里，异常路径要自己维护，最容易漏 <code>finally</code>、漏返回，或者把异常吞掉。' },
      { p: '<code>@Around</code> 里把 <code>proceed()</code> 调两次，目标方法就会执行两次。只有做重试时才这么写，而且要想清楚幂等和事务边界，否则一次下单会扣两次库存。' },
      { p: '<code>@Before</code> 抛异常时目标方法根本不会执行，后面的通知也不会走。如果它做的是权限校验，这正是想要的效果；但别在 <code>@After</code> 里假设业务已经跑过。' },

      { h: '1.5 切点表达式：在哪拦' },
      { p: '最常用的是 <code>execution</code>，格式是“修饰符 返回类型 包.类.方法(参数)”。日常不用写全，记住几种组合就够。' },
      { p: '<code>execution(* com.example.service.*.*(..))</code> 表示 service 包下任意类的任意方法。三个星号分别是返回值、类名、方法名，<code>(..)</code> 表示参数不限。' },
      { p: '<code>execution(public * com.example..*Service.*(..))</code> 里 <code>..</code> 表示当前包及所有子包，<code>*Service</code> 按类名匹配，比写死包名耐用。' },
      { p: '<code>@annotation(com.example.Loggable)</code> 拦截标了该注解的方法；<code>bean(*Service)</code> 按 Bean 名称匹配。多个条件可以用 <code>&amp;&amp;</code>、<code>||</code>、<code>!</code> 组合。' },
      { p: '<code>within(com.example.service..*)</code> 只看类型，表示这个包及子包里所有类的方法，不关心方法名和返回值。想整包拦截又懒得逐个写方法时，它比 execution 短，也不容易漏掉以后新增的类。' },
      { p: '<code>args</code> 按运行时参数类型匹配，还能顺手把参数绑进通知。例如切点写 <code>execution(* com.example.service.*.*(..)) &amp;&amp; args(userId,..)</code>，通知方法再加一个 <code>long userId</code> 形参，就能直接拿到第一个参数，不用自己解析参数数组。' },
      { p: '注解切点要分清 <code>@annotation</code> 和 <code>@within</code>：前者看方法上有没有注解，后者看方法所在类上有没有。给整个类打标记、类里所有方法都生效，用 <code>@within</code>；只标几个方法，用 <code>@annotation</code>。用错的表现是“注解明明加了却没反应”。' },
      { p: '<code>bean(*Service)</code> 按容器里的 Bean 名称匹配，写起来短，但它依赖命名习惯，类一改名拦截就悄悄失效。跨模块的公共切面优先用包路径加注解，把规则建立在结构上，而不是建立在名字上。' },
      { p: '表达式里的 <code>*</code> 只匹配一层，<code>..</code> 才跨层级。包路径少写一个点，子包就整个漏掉，这是“拦不到子包”最常见的原因。' },
      { p: '切点越宽越容易拦到框架内部方法，可能重复记录甚至循环调用。先写窄再放宽；把切点抽成 <code>@Pointcut</code> 方法，通知里只引用方法名，改规则只改一处。全拦的 <code>execution(* *(..))</code> 尤其危险：它会连框架自己的 Bean 一起代理，启动变慢、日志翻倍，严重时还会拦到事务管理器造成递归。' },
      { p: '切点写错时通常不报错，只是不匹配。验证办法是先把切点临时放宽到一定能命中，确认通知本身没问题，再逐步收紧；这比盯着表达式逐字猜要快得多。' },

      { h: '1.6 代理：AOP 运行时做了什么' },
      { p: '注入到 Controller 的不是原始对象，而是代理：调用先到代理，代理执行通知，再转发给目标。JDK 动态代理基于接口，CGLIB 基于继承。' },
      { lang: 'java', code: 'public class JdkProxyDemo {\n    interface PayService { String pay(String user); }\n\n    static class AlipayService implements PayService {\n        public String pay(String user) { return user + " 支付成功"; }\n    }\n\n    public static void main(String[] args) {\n        PayService target = new AlipayService();\n        PayService proxy = (PayService) Proxy.newProxyInstance(\n                PayService.class.getClassLoader(),\n                new Class<?>[]{PayService.class},\n                (p, method, a) -> {\n                    System.out.println("调用前：" + method.getName());\n                    Object r = method.invoke(target, a);\n                    System.out.println("调用后");\n                    return r;\n                });\n        System.out.println(proxy.pay("张三"));\n    }\n}', title: 'JdkProxyDemo.java' },
      { out: '调用前：pay\n张三 支付成功\n调用后' },
      { p: '这段没有 Spring，只有 JDK 的 <code>Proxy</code> 和反射，却暴露了 AOP 的核心：代理负责前后插逻辑，业务仍在 target 里。' },
      { p: 'CGLIB 生成目标类的子类并覆盖方法，不要求接口，但类和方法不能是 <code>final</code>，private 方法也覆盖不到。这是字节码层面的限制，不是配置问题：看到“注解加在 private 方法上不生效”，别再调配置，改可见性就行。' },
      { table: { head: ['维度', 'JDK 动态代理', 'CGLIB'], rows: [
        ['机制', '实现相同接口的类', '目标类的子类'],
        ['前提', '必须实现接口', '类和方法不能 final'],
        ['依赖', 'JDK 自带', '第三方库，Spring 已内置'],
        ['适用', '面向接口编程', '无接口的类']
      ] } },
      { p: 'Spring 默认有接口用 JDK、无接口用 CGLIB；Spring Boot 2.x 起默认 <code>proxyTargetClass=true</code> 强制 CGLIB，也可以显式写 <code>spring.aop.proxy-target-class=true</code> 或 <code>@EnableAspectJAutoProxy(proxyTargetClass = true)</code>；改全局之前，先确认没有代码依赖接口代理。用 JDK 代理时容器里放的是接口类型的代理，按实现类注入会找不到 Bean。' },
      { p: '构造器里调用被增强的方法，通知不会执行：此时代理还没初始化完成。这类调用挪到 <code>@PostConstruct</code> 之后，或者干脆不在构造期做业务，比加一堆注解可靠。' },
      { p: '判断一个 Bean 是不是代理，可以打印它的类名：带 CGLIB 或 <code>$Proxy</code> 字样就是代理；更稳的办法是用 <code>AopUtils.isAopProxy(bean)</code> 和 <code>AopUtils.isCglibProxy(bean)</code>，不依赖类名格式。' },
      { p: '断点位置也要选对：断在业务方法里，看到的 <code>this</code> 是目标对象；断在通知里，看到的是切面。想看代理怎么转发，把断点下在代理类的 invoke 或 intercept 上。' },
      { p: '同一个 Bean 被多个切面增强时，Spring 只创建一个代理，把所有顾问串成一条调用链。代理数量取决于 Bean，不取决于切面，所以别指望“每个切面各有一层代理”来隔离故障。' },

      { h: '1.7 自调用为什么会失效' },
      { p: '最常见的“注解不生效”场景：<code>create</code> 调用同类的 <code>addLog</code>，<code>addLog</code> 标了 <code>@Transactional</code>，你以为事务会开启，实际没有。' },
      { lang: 'java', code: '@Service\npublic class OrderService {\n\n    public void create(String orderNo) {\n        this.addLog(orderNo); // 直接调用目标对象，不经过代理\n    }\n\n    @Transactional\n    public void addLog(String orderNo) {\n        // 期望：在独立事务里写日志\n    }\n}', title: 'SelfInvocationDemo.java' },
      { out: '日志正常写入\n事务没有开启：addLog 与 create 在同一个调用栈里直接执行' },
      { flow: ['外部调用方', '代理对象拦截', '执行通知（如开启事务）', 'pjp.proceed() 进入目标对象', '内部 this.addLog() 直接执行', 'addLog 上的注解被跳过', '返回代理', '执行通知后半段（如提交）'] },
      { p: '原因一句话：<code>this</code> 指向目标对象本身，不是代理。代理只拦外部进来的调用，类内部调用没经过代理，通知没有机会执行。' },
      { p: '边界很清楚：调用方手里拿的是代理才生效。Controller 注入的 <code>OrderService</code> 是代理，所以 Controller 调它有效；内部的 <code>this.addLog</code> 是目标对象，无效。' },
      { p: '修法：拆到另一个 Bean 最干净；注入自身代理（<code>@Lazy</code> 或 <code>AopContext.currentProxy()</code>）能解决但依赖 Spring；AspectJ 编译期织入可彻底绕过代理，代价是构建更复杂。' },
      { p: '同类问题：private 和 protected 方法拦不到，<code>new</code> 出来的对象、static 方法、final 方法也不在代理范围。排查先问：调用方是代理吗？方法能被覆盖吗？' },

      { h: '1.8 AOP 与事务：@Transactional 的真相' },
      { p: '<code>@Transactional</code> 本身不开启任何事务，它只是一个标记；真正干活的是 <code>TransactionInterceptor</code>，被织入到标了注解的方法上。' },
      { ol: [
        '进入代理，拦截器收到方法调用。',
        '按传播级别决定加入现有事务还是新建，并从连接池取连接。',
        '执行 <code>pjp.proceed()</code>，调用业务方法。',
        '正常返回则提交，抛 RuntimeException 则回滚，最后释放连接。'
      ] },
      { p: '所以事务也会自调用失效：同一套代理机制，同一个边界。查事务不生效，和查 AOP 不生效是同一张清单。' },
      { p: '默认只对 RuntimeException 和 Error 回滚，受检异常不回滚，要写 <code>rollbackFor = Exception.class</code>。异常被 catch 吞掉时，代理看不到异常，会当成成功提交，这是线上“报错了却没回滚”的高频原因。' },
      { lang: 'java', code: '@Service\npublic class TransferService {\n\n    private final AccountMapper accountMapper;\n\n    public TransferService(AccountMapper accountMapper) {\n        this.accountMapper = accountMapper;\n    }\n\n    @Transactional(rollbackFor = Exception.class)\n    public void transfer(long from, long to, BigDecimal amount) throws Exception {\n        accountMapper.deduct(from, amount);\n        if (amount.signum() <= 0) {\n            throw new Exception("金额必须大于 0");\n        }\n        accountMapper.add(to, amount);\n    }\n}', title: 'TransferService.java' },
      { out: '转账失败：金额必须大于 0\nfrom 账户余额未变，deduct 已回滚' },
      { p: '事务加在 Service 的 public 方法上。加 Controller 边界过宽，参数校验和序列化都被包进去，连接占用更久；加 Mapper 粒度太细，跨多次操作没有原子性。传播级别 REQUIRED 最常用，REQUIRES_NEW 会多占连接，慎用。' },

      { h: '1.9 切面顺序：一层套一层的括号' },
      { p: '多个切面套在同一个方法上时，代理是层层包装的。最外层先执行前置、最后执行后置，<code>@Order</code> 数字越小越靠外，整体像一个括号：小的在外，大的在内。' },
      { p: '执行顺序：环绕开始 → 前置 → 目标方法 → 后置返回或异常 → 最终 → 环绕结束。多个切面用 <code>@Order</code> 定顺序，数字越小越靠外。' },
      { p: '<code>@Order</code> 要写在切面类上，写到通知方法上不参与排序；也可以实现 <code>Ordered</code> 接口，效果一样。两个切面都不写顺序时，谁先谁后取决于注册顺序，换个版本就可能变。' },
      { p: '顺序会改变结果。日志切面放在事务外层，统计到的耗时包含事务提交；放在内层，提交时间就不算进去。两种都能用，但要明确自己要哪个，别等对不上账才回头查。' },
      { p: '事务切面默认是最低优先级，也就是最内层。自定义切面不写 <code>@Order</code> 时同样是这个级别，于是谁在内层变得不确定；只要和事务有交互，就显式写下顺序。' },
      { p: '排查顺序别靠猜，给每个切面加一条进入和退出日志，看括号是否配对。出现“进 A、进 B、退 A、退 B”这种交叉，说明某个切面内部又发起了一次经过代理的调用，嵌套关系和你想的不一样。' },
      { p: '顺序只对同一个连接点上的多个通知有意义。两个切点毫无交集，讨论谁先谁后是白费功夫，先确认它们是否真的会拦到同一个方法。' },

      { h: '1.10 异常处理：通知、事务与统一异常的三方关系' },
      { p: '通知里抛出的异常会一路传给调用方：<code>@AfterThrowing</code> 先执行，然后异常继续向上。它不能把异常“吃掉”，在方法体里写 catch 也不会改变这个事实。' },
      { p: '想把受检异常转成业务异常，就在 <code>@Around</code> 里 catch 后抛新的，但要保留 cause。只抛一句“系统繁忙”而不带原始异常，日志里就只剩结论、没有根因，排查成本翻倍。' },
      { p: '顺序很关键：异常转换切面应放在事务切面外层。这样事务先看到原始异常、按规则决定回滚，再由外层翻译成对外的错误；反过来，异常在事务内层就被转成受检异常，默认不回滚，数据就脏了。' },
      { p: '统一异常处理（<code>@RestControllerAdvice</code>）和切面是两条路：前者接 Controller 层抛出的异常，后者能拦到 Service。别在切面里直接返回统一响应体，那会把 Service 的返回类型改掉，调用方拿到的是响应对象而不是业务对象。' },
      { p: '事务是否回滚，看的是异常有没有穿出代理。切面里 catch 住再正常返回，事务一定提交——这和业务方法里吞异常是同一个机制，只是发生的位置换成了切面。' },
      { p: '还有一类静默失败：<code>@AfterThrowing</code> 里又抛了新异常。原异常被替换，事务按新异常判断回滚，日志里却只看到新异常。写通知时要么只记录，要么明确抛出，别把两件事混在一起。' },
      { p: '<code>Error</code>（例如栈溢出）同样会触发异常通知，默认也在回滚范围内。但不要 catch 住 <code>Error</code> 继续跑业务，那通常意味着 JVM 已经处于不可信状态。' },

      { h: '1.11 性能与调试：把开销花在看得见的地方' },
      { p: '代理本身的成本很小，一次调用多一次转发，通常在纳秒到微秒级。真正拖慢接口的是通知里的动作：同步写日志、查数据库、序列化大对象、抢分布式锁，这些才是要优化的地方。' },
      { p: '统计耗时用 <code>System.nanoTime()</code> 算差值，别用 <code>currentTimeMillis()</code> 做高精度比较，它会被系统时间调整影响。并且只在超过阈值时打印，否则日志本身就成了瓶颈。' },
      { p: '确认切面生效按顺序排查：切面类有没有进容器、方法是不是从代理外部调用、切点能不能命中、通知有没有执行。多数“没生效”死在第二步，代码本身没问题。' },
      { p: '线上别临时加切面再发版。把记录逻辑做成配置开关，或者用现成的链路追踪；临时切面很容易因为切点过宽把接口拖慢，故障时雪上加霜。' },
      { p: '看日志顺序也能判断嵌套是否正确：前置、业务、后置、最终、环绕退出。只看到前置没有后置，多半是业务抛了异常，先去看异常通知有没有打日志，而不是怀疑切点。' },
      { p: '切面里用到 ThreadLocal 一定要在 finally 清理，异步任务和线程池场景尤其如此。不清会污染下一个任务，而且这种问题在测试环境几乎复现不出来。' },

      { h: '1.12 十一个高频坑与容易忽略的细节' },
      { list: [
        '<b>切面没被扫描：</b>包不在启动类扫描范围，或漏了 <code>@Component</code>，不报错也不生效。',
        '<b>忘了 return proceed：</b>返回值被丢掉，调用方拿到 null。',
        '<b>切点太宽：</b>连 Controller 和框架方法一起拦，日志爆炸甚至递归。',
        '<b>自调用：</b>优先把方法拆到另一个 Bean，而不是急着注入自身代理。',
        '<b>异常被吞：</b>通知里 catch 后不再抛出，事务和上层都以为成功。',
        '<b>顺序靠猜：</b>多个切面不写 <code>@Order</code>，换版本后行为跟着变。'
      ] },
      { p: '切面里注入的 Bean 也可能是代理，在切面里调用被增强的方法同样受自调用规则约束。别以为站在切面里就有“上帝视角”。' },
      { p: '<code>@Around</code> 里改参数数组不会影响目标方法，必须显式重新调用 <code>proceed(新参数)</code>，而且类型和顺序要与方法签名一致，否则运行时直接报参数不匹配。' },
      { p: '多个切面都改返回值时，只有最外层 <code>@Around</code> 的 return 是最终结果。内层改完又被外层覆盖，是“返回值怎么不对”的常见来源。' },
      { p: '切面里不要吞掉 <code>InterruptedException</code>，也不要在 <code>finally</code> 里 return：前者丢掉中断标志，后者会覆盖 try 里的返回值和异常。' },
      { p: '单元测试里 <code>new</code> 出来的 Service 没有代理，注解当然不生效。要测切面行为就用 Spring 的测试上下文，或者直接测切面类，别把“测试没生效”当成“代码有问题”。' },

      { h: '1.13 本章小结' },
      { list: [
        'AOP 把横切逻辑集中到切面，通过代理在运行时织入。',
        '切点选“在哪拦”，通知管“做什么、何时做”，环绕能力最强。',
        'JDK 代理基于接口，CGLIB 基于继承，Spring 按是否有接口选择。',
        '代理只拦外部调用，<code>this</code> 自调用、private、final 方法都不生效。',
        '<code>@Transactional</code> 就是 AOP：开启、执行、提交或回滚，同样受代理边界限制。'
      ] },

      { h: '1.14 常见追问' },
      { list: [
        '<b>问：AOP 和装饰器模式什么关系？</b><br>答：思想同源，代价不同。装饰器是手动包装：想给一个接口加日志，就写一个装饰类持有原对象，在调用前后插代码，客户端要改成用装饰类。AOP 把「哪些方法要插什么逻辑」写成切点和通知，由框架在运行期统一生成代理，业务类完全不知道自己被包了一层，新增一个切面不用改任何调用点。手动包装可读性最好、调试最直观，切面胜在横切逻辑集中、不会漏掉某个类，适合日志、事务、鉴权这种到处都要的东西。',
        '<b>问：为什么 Spring AOP 只支持方法级连接点？</b><br>答：因为它基于代理。代理能拦截的最小单位就是一次方法调用，字段读写、构造器执行、静态初始化这些根本没有可以让代理插入的入口。想拦字段访问或构造器，只能靠 AspectJ 在编译期或类加载期做字节码织入。这也是 Spring 文档把「方法执行」列为唯一受支持连接点的原因，写切面时把切点定义在方法签名上就够了，别指望能监听对象内部的状态变化。',
        '<b>问：切面影响性能吗？</b><br>答：代理本身的成本很小，一次调用多一次转发和若干通知执行，量级在纳秒到微秒，业务方法里只要有一次数据库访问就被完全淹没。真正拖慢系统的是通知里做的事：在环绕通知里查库、打同步日志、序列化大对象，或者把本来可以批量执行的逻辑拆成逐条调用。要做的是给切面加条件，比如只对慢请求记录、按包名收窄切点，并用压测确认切面带来的增量，而不是凭感觉砍掉切面。',
        '<b>问：多个切面作用在同一方法上，谁先执行？</b><br>答：默认顺序不确定，必须显式指定。实现 <code>Ordered</code> 接口或加 <code>@Order</code>，数值小的在外层、先进后出：进入时从小到大，退出时从大到小，像套娃一样。这一点对事务很关键：事务切面必须包住业务和日志，否则日志在事务外提交、回滚时就留下了误导性的记录。生产上给每个切面固定一个编号区间，别依赖类名或声明顺序。',
        '<b>问：切面里能改参数和返回值吗？</b><br>答：能，但要非常克制。环绕通知拿到的 <code>ProceedingJoinPoint</code> 可以传新参数数组给 <code>proceed</code>，也可以丢弃原始返回值换成自己的，甚至不调 proceed 直接短路。这正是权限切面能「不满足就抛异常」的原理。风险在于修改是隐式的：业务方看到的是被改过的参数和返回值，排错时完全想不到。除了鉴权、脱敏、统一包装这类明确意图，不要在切面里悄悄改数据。'
      ] },

      { h: '1.15 自测与练习' },
      { ol: [
        '写一个切面统计 Service 方法耗时，超过 500 毫秒才打印，并说明切点为什么这样写。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@Aspect\n@Component\npublic class SlowAspect {\n  private static final Logger log =\n      LoggerFactory.getLogger(SlowAspect.class);\n\n  @Around("execution(* com.demo.service..*(..))")\n  public Object cost(ProceedingJoinPoint p)\n      throws Throwable {\n    long t0 = System.nanoTime();\n    try {\n      return p.proceed();\n    } finally {\n      long ms = (System.nanoTime() - t0) / 1000000;\n      if (ms > 500) {\n        log.warn("{} 耗时 {} ms",\n            p.getSignature().toShortString(), ms);\n      }\n    }\n  }\n}</pre><b>要点</b>：切点收窄到 service 包，别用 *..* 把 controller 和切面自己也织进去；统计放 finally 才能覆盖异常路径；阈值判断放通知内部，切点只负责「拦哪些方法」。</div></details>',
        '用手写 JDK 动态代理实现权限检查：不是管理员就直接抛异常，不调用目标方法。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">interface OrderService { void pay(long id); }\n\nOrderService target = new OrderServiceImpl();\n\nOrderService proxy = (OrderService) Proxy.newProxyInstance(\n    OrderService.class.getClassLoader(),\n    new Class&lt;?>[] { OrderService.class },\n    (p, m, args) -> {\n      if (!isAdmin()) {\n        throw new SecurityException("无权限：" + m.getName());\n      }\n      return m.invoke(target, args);\n    });\n\nproxy.pay(1L);   // 非管理员：目标方法一次没执行</pre><b>要点</b>：不调 m.invoke 就是目标方法根本没执行，这才是「短路」，而不是执行完在出口拦；JDK 代理只认接口，没有接口的类要用 CGLIB；异常类型要能被全局处理器转成 403。</div></details>',
        '构造自调用失效的例子，用日志证明注解没生效，再用「拆到另一个 Bean」修复；并解释 <code>@Transactional</code> 方法 catch 住异常后为什么仍会提交。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@Service\npublic class OrderService {\n  public void create() {\n    save();   // this.save()：切面与事务全不生效\n  }\n\n  @Transactional\n  public void save() {\n    log.info("in tx: {}",\n        TransactionSynchronizationManager\n            .isActualTransactionActive());   // false\n  }\n}\n\n// 修复：拆到另一个 Bean，调用经过代理\n@Service\npublic class OrderTx {\n  @Transactional\n  public void save() { insertOrder(); }\n}</pre><b>要点</b>：自调用走的是 this 引用而不是代理对象，代理拿不到这次调用自然没有通知；也可用 AopContext.currentProxy() 或注入自身代理，但拆 Bean 最稳；@Transactional 默认只回滚 RuntimeException，受检异常要写 rollbackFor，catch 住异常等于告诉代理一切正常。</div></details>'
      ] }
    ]
  };

  T['spring-security'] = {
    meta: '本章约 5500 字 · 建议 32 分钟 · 含 2 张表、1 张流程图与 5 段代码',
    blocks: [

      { h: '2.1 为什么学 Spring Security：两个问题' },
      { p: '任何后台系统都要回答两个问题：你是谁（认证 Authentication），你能做什么（授权 Authorization）。前者解决“登录没登录”，后者解决“有没有权限做这件事”。' },
      { p: '手写也不难：查库、发 token、拦截器校验。难的是需求一多就开始漏：忘校验的接口、明文密码、越权漏洞。Spring Security 把这些做成一条过滤器链和一套上下文，默认偏安全，代价是概念多。' },
      { note: '<b>先记住：</b>认证回答“你是谁”，授权回答“你能干什么”。401 是没认证，403 是认证了但没权限。' },

      { h: '2.2 一条过滤器链，以及顺序为什么不能乱' },
      { p: '核心是 Filter（<code>DelegatingFilterProxy</code>），把请求交给 <code>SecurityFilterChain</code>，每个过滤器负责一件事。' },
      { flow: ['HTTP 请求', 'DelegatingFilterProxy 接管', '恢复 SecurityContext', '认证过滤器处理登录请求', 'JWT 过滤器解析 token', 'AuthorizationFilter 校验权限', '通过则进入 DispatcherServlet', '失败返回 401 或 403'] },
      { p: '安全校验在 Controller 之前完成。请求还没进 Spring MVC，权限就判完了，所以未授权请求根本不会出现在 Controller 的日志里。' },
      { p: '前面那张流程图里的顺序不是随手排的。Spring Security 用一张内部注册表固定了每个内置过滤器的位置，自定义过滤器只能插到某个已知过滤器的前面或后面，不能插到“链的任意位置”。' },
      { p: '原因很实际：上下文要先建立，认证才有地方写结果；授权要读认证结果；异常转换要包住后面所有可能抛异常的人。顺序错一位，症状通常不是报错，而是“什么都没发生”。' },
      { p: '每个过滤器只回答一个问题。<code>SecurityContextHolderFilter</code> 管进出时存取上下文；<code>UsernamePasswordAuthenticationFilter</code> 只看表单登录地址；<code>BasicAuthenticationFilter</code> 只看 Basic 头；Bearer 过滤器只看 Bearer 头；<code>AuthorizationFilter</code> 最后逐条比对规则。' },
      { p: '<code>ExceptionTranslationFilter</code> 的位置最关键：它排在授权之前，专门捕获后面抛出的认证异常和拒绝异常，翻译成 401 或 403。换句话说，401 和 403 的长相由它决定，不由你的 Controller 决定。' },
      { p: '最常见的错误是把解析令牌的过滤器放到授权之后：授权执行时上下文还是空的，所有请求都按未认证处理，表现为“令牌明明带了却一直 401”。另一种是过滤器没注册成 Bean，或者既加了 <code>@Component</code> 又手动 <code>addFilter</code>，于是执行两遍。' },

      { h: '2.3 最小可运行配置' },
      { p: 'Spring Security 6 起推荐 Lambda DSL，<code>authorizeRequests</code> 已换成 <code>authorizeHttpRequests</code>；新项目按 Spring Boot 4.0.x（Spring Security 7）起步，直接写成下面这一套。' },
      { lang: 'java', code: '@Configuration\n@EnableWebSecurity\npublic class SecurityConfig {\n\n    @Bean\n    SecurityFilterChain chain(HttpSecurity http, JwtService jwtService) throws Exception {\n        http.csrf(csrf -> csrf.disable())\n            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n            .authorizeHttpRequests(auth -> auth\n                .requestMatchers("/auth/login", "/public/**").permitAll()\n                .requestMatchers("/admin/**").hasRole("ADMIN")\n                .anyRequest().authenticated())\n            .addFilterBefore(new JwtAuthFilter(jwtService),\n                    UsernamePasswordAuthenticationFilter.class)\n            .exceptionHandling(ex -> ex.authenticationEntryPoint(\n                    (req, res, e) -> res.sendError(401)));\n        return http.build();\n    }\n\n    @Bean\n    PasswordEncoder passwordEncoder() {\n        return new BCryptPasswordEncoder();\n    }\n}', title: 'SecurityConfig.java' },
      { out: 'POST /auth/login（用户名密码） → 200 + 令牌\nGET /public/hello           → 200\nGET /admin/users           → 401（未登录）\nGET /admin/users + 管理员   → 200\nGET /admin/users + 普通用户 → 403' },
      { p: '关闭 CSRF 是因为前后端分离用 token、不用 Cookie 会话；<code>permitAll</code> 放行登录；<code>anyRequest</code> 是兜底，规则从上到下匹配，第一条命中就生效。entry point 指定未登录返回 401；不配时默认入口点可能返回 403，容易和后面“401 与 403”那一节混淆。' },
      { p: '三行装配各管一件事，缺哪一行症状都不同：<code>addFilterBefore</code> 决定 <code>JwtAuthFilter</code> 插在链的哪个位置，写在授权过滤器之后就只能看到空上下文；<code>sessionCreationPolicy(STATELESS)</code> 关掉会话创建，不写这一行，容器照样给每个请求发 <code>JSESSIONID</code>，所谓无状态只剩半套；<code>csrf</code> 关闭只对不靠 Cookie 携带的凭证成立，判断标准见后面「CSRF」那一节。' },

      { p: '<code>hasRole("ADMIN")</code> 会自动加 <code>ROLE_</code> 前缀，实际比对 <code>ROLE_ADMIN</code>；<code>hasAuthority</code> 不加，混用是常见 403 原因。' },

      { h: '2.4 认证：用户名密码怎么变成登录态' },
      { p: '认证核心是 <code>AuthenticationManager</code>，常用实现 <code>ProviderManager</code> 把工作交给 <code>DaoAuthenticationProvider</code>：查用户、比对密码、组装 <code>Authentication</code>。' },
      { p: '<code>AuthenticationManager</code> 只有一个方法：拿一个“未认证”的凭证进去，返回一个“已认证”的结果；认不出来就抛异常。<code>ProviderManager</code> 是它的默认实现，自己不干活，而是挨个问手下的 provider 谁能处理。' },
      { p: '<code>DaoAuthenticationProvider</code> 处理用户名密码，做三件事：调 <code>UserDetailsService</code> 查用户，用 <code>PasswordEncoder</code> 比对密文，然后组装一个带权限的 <code>UsernamePasswordAuthenticationToken</code>。三步缺一步，认证都会失败。' },
      { p: '查用户靠 <code>UserDetailsService</code>，实现 <code>loadUserByUsername</code>，返回 <code>UserDetails</code>：用户名、密文密码、权限。' },
      { lang: 'java', code: '@Service\npublic class DbUserService implements UserDetailsService {\n\n    private final UserMapper userMapper;\n\n    public DbUserService(UserMapper userMapper) { this.userMapper = userMapper; }\n\n    @Override\n    public UserDetails loadUserByUsername(String username) {\n        User u = userMapper.findByUsername(username);\n        if (u == null) {\n            throw new UsernameNotFoundException("用户不存在");\n        }\n        return User.withUsername(u.getUsername())\n                .password(u.getPassword())\n                .roles(u.getRole())\n                .build();\n    }\n}', title: 'DbUserService.java' },
      { out: '输入 admin / 123456 → 认证成功\nSecurityContext 中保存 UsernamePasswordAuthenticationToken' },
      { p: '<code>password</code> 必须是数据库里的密文，不要在这里再加密，否则 <code>matches</code> 永远失败。用户不存在抛 <code>UsernameNotFoundException</code>，对外只提示“用户名或密码错误”。' },
      { p: '认证成功后的令牌会把密码抹掉，因为后续流程只需要身份和权限。这也是为什么在 Controller 里打印 <code>getCredentials()</code> 常常是 null，那不是 bug。' },
      { p: '认证成功后，<code>SecurityContextHolder.getContext().getAuthentication()</code> 就能拿到当前用户；Controller 里也可以用 <code>@AuthenticationPrincipal</code> 直接注入 <code>UserDetails</code>。' },
      { p: '自定义登录接口就按这个流程写：用用户名密码构造一个未认证的令牌，交给 <code>AuthenticationManager</code> 认证，成功后再放进上下文并保存会话。不要自己查库比对，那样等于绕过了编码器、锁定策略和各类 provider。' },
      { p: '常见配置错误是自己创建 <code>ProviderManager</code> 却没给它 provider，于是启动正常、一登录就抛“找不到可处理的 provider”。另一个是父子容器各有一套安全配置，注入到的是旧实例，改了配置不生效。' },

      { h: '2.5 密码：为什么必须用 BCrypt' },
      { p: '明文存密码不用多说。MD5、SHA-1 也算得太快，每秒能试上亿次，加盐挡得住彩虹表，挡不住高速暴力破解。' },
      { p: 'BCrypt 专为密码设计：自带随机盐、可调计算成本（strength，默认 10）、输出里带盐和成本，校验时按同样的参数重算。' },
      { p: '强度参数每加一，计算量翻倍，登录耗时也翻倍。从 10 提到 12，单次校验大概从几十毫秒变成几百毫秒；这既是防护也是成本，要按登录并发量评估，不要盲目拉满。' },
      { lang: 'java', code: 'public class BcryptDemo {\n    public static void main(String[] args) {\n        PasswordEncoder encoder = new BCryptPasswordEncoder();\n        String raw = "123456";\n        String h1 = encoder.encode(raw);\n        String h2 = encoder.encode(raw);\n        System.out.println(h1.equals(h2));\n        System.out.println(encoder.matches(raw, h1));\n        System.out.println(encoder.matches("wrong", h1));\n    }\n}', title: 'BcryptDemo.java' },
      { out: 'false\ntrue\nfalse\n（h1 与 h2 都是 $2a$10$ 开头的 60 位字符串，但内容不同）' },
      { p: '两次加密结果不同，因为盐不同；<code>matches</code> 都能通过，因为它从密文里读出盐再算一遍。不要用 <code>equals</code> 比对密码。字段留够 60 位，建议 <code>varchar(100)</code>，被截断会表现为永远登录失败。' },
      { p: '实际项目里很少直接创建 BCrypt 编码器，更常见的是委托式编码器：密文前带一个算法标记，例如 {bcrypt} 这样的花括号前缀，校验时按标记选算法。好处是让新旧算法共存，慢慢迁移。' },
      { p: '迁移的常规做法是“登录时重哈希”：用户下次登录、明文密码短暂可用的那一刻，用新算法重新编码并写回数据库。存量用户不用强制改密码，也不用停机刷库。' },
      { p: '几个必须避免的写法：把已经编码的结果再编码一次，永远对不上；用固定盐的哈希，等于没有盐；把明文或密文打进日志；用等号比较密文，盐不同必然不等。' },
      { p: '初始化管理员账号时，密码要在代码里编码后再入库，而不是把明文写进建表脚本。脚本会进版本库、会被复制到测试环境，这是泄露的高发点。' },

      { h: '2.6 授权：路径规则与方法级注解' },
      { table: { head: ['写法', '含义', '典型路径'], rows: [
        ['permitAll()', '任何人都能访问', '/auth/login、/public/**'],
        ['authenticated()', '登录即可', '/profile'],
        ['hasRole("ADMIN")', '需要 ROLE_ADMIN', '/admin/**'],
        ['hasAnyRole("A","B")', '任一角色即可', '/report/**'],
        ['hasAuthority("order:read")', '需要具体权限点', '/orders/export'],
        ['denyAll()', '一律拒绝，作为兜底', '/internal/**']
      ] } },
      { p: '角色是粗粒度岗位，权限是细粒度动作。小系统用角色就够；中大型系统通常两者一起用。' },
      { p: '路径规则适合整块接口的保护；它管不了“A 只能看自己的订单”，那属于数据级权限，必须在业务代码里判断。' },
      { p: '先在配置类加 <code>@EnableMethodSecurity</code>；Spring Security 6 之前的 <code>@EnableGlobalMethodSecurity</code> 已过时。' },
      { lang: 'java', code: '@RestController\n@RequestMapping("/orders")\npublic class OrderController {\n\n    private final OrderService orderService;\n\n    public OrderController(OrderService orderService) {\n        this.orderService = orderService;\n    }\n\n    @GetMapping("/{id}")\n    @PreAuthorize("hasRole(\'USER\') and #id > 0")\n    public Order get(@PathVariable long id) {\n        return orderService.getById(id);\n    }\n\n    @DeleteMapping("/{id}")\n    @PreAuthorize("hasAuthority(\'order:delete\')")\n    public void delete(@PathVariable long id) {\n        orderService.delete(id);\n    }\n}', title: 'OrderController.java' },
      { out: '普通用户 GET /orders/1        → 200\n普通用户 DELETE /orders/1    → 403\n管理员 DELETE /orders/1      → 200' },
      { p: '<code>@PreAuthorize</code> 在方法执行前判断，失败抛 <code>AccessDeniedException</code>，最终 403。还有 <code>@PostAuthorize</code>、<code>@PreFilter</code>、<code>@PostFilter</code>，表达式可引用参数 <code>#id</code>，也能调用自定义 Bean。' },
      { p: '方法级注解与路径规则是叠加的，任何一层拒绝都返回 403，排查时两层都要看，不要只盯着注解。' },
      { p: '路径规则像大楼的门禁，方法级注解像每个抽屉上的锁。门禁挡住外部来的人，抽屉锁防的是内部人员走错房间——比如另一个 Controller 或某个定时任务间接调到了这个方法。' },
      { p: '两层都留的理由是容错：路径规则写错一个通配符就可能整片放开，而方法级注解贴在代码旁边，改代码时更容易被看见；反过来，注解漏写时路径规则还能兜住整块接口。' },
      { p: '表达式里可以引用容器中的 Bean，把复杂判断挪到普通类里。这样权限逻辑能用单元测试覆盖，注解本身保持一行，读代码的人一眼知道这里要什么权限。' },
      { p: '失效场景和 AOP 完全一样：加在私有方法上不生效，同类内部自调用不生效，加在 Controller 上却绕过 Controller 直接调 Service 也不生效。判断方法只有一句：这次调用经过代理了吗？' },
      { p: '配置思路上，默认拒绝比默认放行安全：兜底写拒绝，然后一条条显式放行。反过来先全放开再补限制，漏掉一条就是一个越权漏洞，而且很难被测出来。' },

      { h: '2.7 登录态：会话、JWT 与取舍' },
      { p: '会话方案里，登录态存在服务端，浏览器只拿一个编号，默认放在名为 JSESSIONID 的 Cookie 里。之后的请求带着编号来，服务端按编号找回上下文。用户看不到内容，也很难伪造。' },
      { p: '单机没问题，多实例就暴露了：会话在 A 机器的内存里，请求被负载均衡打到 B，B 不认识这个编号，于是刚登录就“未登录”。三种解法：让同一用户固定打到同一台、把会话集中存到 Redis、或者干脆改成无状态。' },
      { p: '还有两个容易忽略的点：登录成功后应更换会话编号，防的是会话固定——攻击者预先塞一个编号给受害者，等他登录后共用；注销时上下文和会话都要清，只清上下文的话，下次请求还能从会话里恢复出来。' },
      { p: 'JWT 把用户信息签名后交给客户端，服务端不存状态；请求带 <code>Authorization: Bearer 令牌</code>，验签通过即已认证。' },
      { p: 'JWT 分三段：header.payload.signature。前两段只是 Base64URL 编码，不是加密，任何人都能解开，所以不要放密码和手机号。' },
      { lang: 'java', code: '@Service\npublic class JwtService {\n\n    private final SecretKey key = Keys.hmacShaKeyFor(\n            "change-me-please-change-me-32bytes!".getBytes(StandardCharsets.UTF_8));\n\n    public String create(String username, String role) {\n        return Jwts.builder()\n                .subject(username)\n                .claim("role", role)\n                .expiration(new Date(System.currentTimeMillis() + 3600_000))\n                .signWith(key)\n                .compact();\n    }\n\n    public String parse(String token) {\n        return Jwts.parser().verifyWith(key).build()\n                .parseSignedClaims(token).getPayload().getSubject();\n    }\n}', title: 'JwtService.java' },
      { out: 'create("alice", "USER") → eyJhbGciOi...（三段）\nparse(合法 token)        → alice\nparse(被篡改的 token)    → 抛 JwtException' },
      { p: '<code>JwtAuthFilter</code> 继承 <code>OncePerRequestFilter</code>，一份实现只做三件事：从 <code>Authorization</code> 头里取出 <code>Bearer</code> 后面的那串字符、调用上面这个 <code>parse</code>、把结果包成 <code>UsernamePasswordAuthenticationToken</code> 塞进 <code>SecurityContextHolder</code>。头里没有令牌、验签失败、已经过期这三种情况都直接放行，不抛全局异常，让 <code>AuthorizationFilter</code> 按“未认证”处理，401 的出口才只剩一个。' },
      { p: '过滤器写完不等于接线完成：它必须出现在某条 <code>SecurityFilterChain</code> 的 <code>addFilterBefore</code> 里，Spring 才知道它存在。最省事的写法是 <code>new JwtAuthFilter(jwtService)</code> 直接传进链，这个对象不进容器，也就不会有第二份注册；若更愿意让它成为 <code>@Component</code> 或 <code>@Bean</code>，就要接受它同时被注册到最外层 Servlet 链的事实——同一份逻辑被执行两遍，解析和被拉多的查询都翻倍，排查时还容易误判成过滤器写错了，这时要用 <code>FilterRegistrationBean</code> 把容器那一份 <code>setEnabled(false)</code> 关掉。' },

      { p: '把会话和 JWT 放在一起比，看的不是谁更安全，而是四种代价：状态存在哪、能不能立刻撤销、跨域好不好办、每次请求要传多少字节。' },
      { p: 'JWT 的“无状态”来自服务端不存东西：验签通过就相信内容。代价是无法主动失效——签发出去的令牌在过期前一直有效，改密码、封号、强制下线都管不住它。缓解手段是短有效期配 refresh token，再加上一个很小的黑名单；签名密钥要 32 字节以上，放在环境变量或密钥管理系统里，不要写进代码。' },
      { p: '要撤销就得上黑名单：把令牌的唯一编号存进 Redis，过期时间设成令牌剩余寿命，注销时写入，每次请求查一下。这样能踢人了，但每次请求多一次远程查询，本质上又变回有状态，只是状态更小。' },
      { p: '载荷里放什么也有讲究：只放用户标识、过期时间、角色这类“变了也能接受短暂不一致”的信息。余额、手机号、权限明细会过期；而且前两段只是编码不是加密，任何人都能解开看。' },
      { p: '另一个细节是时钟偏移：多台机器时间差几秒，就可能出现“刚签发就提示过期”。签发的过期时间留几十秒余量，验签时允许一点偏差，能省掉很多莫名其妙的 401。' },
      { p: '配成无状态后，服务端不再创建会话，每个请求都必须自带凭证并重新认证。好处是扩容简单、跨域省事；代价是注销和踢人要靠额外机制，不能像会话那样删掉就完事。' },

      { p: '会话策略显式写成 <code>STATELESS</code> 之后，响应里不再出现 <code>Set-Cookie: JSESSIONID</code>，<code>SecurityContext</code> 只活一个请求。副作用是所有依赖会话的东西都会静默变空：靠会话记住“登录前想去哪一页”的默认实现存不进去，要保留登录后跳回原页，就得自己用查询参数或前端路由传递；手动调 <code>getSession()</code> 会另建一个空会话，那又回到有状态，等于白配。' },

      { h: '2.8 SecurityContext：当前用户到底存在哪' },
      { p: '<code>SecurityContext</code> 就是“这次请求的当前用户”。它默认存在 <code>SecurityContextHolder</code> 里，底层是一个 ThreadLocal：一个请求一个线程，所以 Controller 里随手就能取到，不必层层传参。' },
      { p: 'ThreadLocal 带来两个必须知道的后果。第一，请求结束要清理，否则线程被线程池复用，下一个请求会读到上一个用户的身份，这叫身份串号，是很严重的安全问题。框架的过滤器负责清理，所以不要自己接管上下文却不清理。' },
      { p: '第二，换线程就丢。在 <code>@Async</code> 方法、<code>CompletableFuture</code>、手写的 <code>new Thread</code> 里取 <code>getAuthentication()</code> 常常是 null，因为 ThreadLocal 不跨线程传递。需要时用可委托的包装类，或让线程池带上上下文装饰。' },
      { p: '还有一个常见误解：以为把 <code>Authentication</code> 塞进上下文就算登录了。那只改了一个线程里的变量，没有校验密码、没有生成会话，刷新就没了。真正的登录必须走 <code>AuthenticationManager</code>。' },

      { h: '2.9 CSRF：浏览器为什么会“借用身份”' },
      { p: 'CSRF 的前提是浏览器会自动带 Cookie。用户登录了某个站点，又打开一个恶意页面，页面里藏一个自动提交的表单指向那个站点；浏览器照规矩把 Cookie 附上，服务端看到的是一个“完全合法”的请求。' },
      { p: '所以防御思路不是识别请求来源，来源本身可以伪造；而是要求请求里带一个攻击者拿不到的随机值，或者要求在自定义请求头里带值——跨站表单没法设置自定义请求头，攻击就断了。' },
      { p: '前后端分离常关掉 CSRF，是因为凭证放在 Authorization 头里，浏览器不会自动附带，攻击前提不成立。但如果同时把令牌存进 Cookie 又关掉 CSRF，就等于把门锁拆了还把钥匙插在门上。' },
      { p: '<code>csrf(csrf -> csrf.disable())</code> 关掉的是那个一次性令牌校验，能不能关只看一条：凭证是不是靠浏览器自动携带。纯 JWT 无状态接口把令牌放在 <code>Authorization</code> 头里，跨站表单设不了自定义请求头，攻击前提不成立，所以这一行和数据面的 <code>STATELESS</code> 是配套的；只要接口还从 Cookie 读凭证，这一行就不能关。' },

      { p: 'Cookie 的三个属性值得记住：HttpOnly 让脚本读不到，Secure 只在加密连接上发送，SameSite 限制跨站携带。它们不能替代 CSRF 防护，但能明显缩小攻击面。' },
      { p: '排查时也要记得：CSRF 校验失败返回的是 403，不是 401。看到 403 就只怀疑角色，很容易在错误的方向上耗很久。' },

      { h: '2.10 CORS：跨域不是权限问题' },
      { p: '同源指协议、域名、端口三者全同。浏览器默认禁止页面读取跨源响应，这是保护用户的浏览器行为，不是服务端的权限控制。理解这一点，就不会把 CORS 当成安全机制。' },
      { p: '跨源的复杂请求会先发一个 OPTIONS 预检，问服务端“允不允许这个来源、这个方法、这些头”。服务端要在响应里明确回答，浏览器才放行真正的请求。' },
      { p: '最常见的坑是：安全链把 OPTIONS 也当成需要登录的请求拦掉，预检直接返回 401。浏览器拿不到允许头，控制台只报跨域错误，真实状态码被藏起来，于是有人以为是前端地址写错了。正确做法是放行预检，或用框架自带的跨域配置统一处理。' },
      { p: '另一个坑是“允许携带凭证”和“允许任意来源”不能同时成立：前者要求明确写出具体来源，不能写星号。这条限制由浏览器强制，服务端写错只会得到一次静默失败。' },
      { p: '最后区分清楚：CORS 管“能不能读响应”，CSRF 管“能不能借你的身份发请求”。关掉 CORS 一点也不能防 CSRF，两者不是一回事。' },

      { h: '2.11 账号的四个状态开关' },
      { p: '<code>UserDetails</code> 除了用户名、密码、权限，还带四个布尔值：是否启用、账号是否过期、凭证是否过期、账号是否锁定。任何一个为 false，认证都会在密码比对之后继续拒绝。' },
      { p: '放在这里而不是散落在业务代码里，是因为认证是统一入口：表单登录、接口登录、后续可能的扫码登录都经过它，状态判断写一次就全覆盖。' },
      { p: '排查“密码明明对却登录失败”时，先看抛的是哪种异常：锁定、过期、禁用各有独立类型，日志里能区分开，不要一律当成密码错。' },
      { p: '失败计数与锁定要配合使用：连续失败若干次锁一段时间，能明显抬高撞库成本；但阈值和时长必须可配置，否则第一个被挡在门外的往往是正常用户。' },

      { h: '2.12 401 与 403：区分、排查与统一返回' },
      { table: { head: ['状态', '含义', '常见原因', '排查方向'], rows: [
        ['401', '未认证，不知道你是谁', '没带 token、过期、签名错、过滤器没注册', '看请求头、看过滤器有没有执行'],
        ['403', '已认证，但没有权限', '角色不匹配、hasRole 与 hasAuthority 混用、CSRF 拦截', '打印当前 Authentication 的权限']
      ] } },
      { p: '“带了 token 还 401”的第一原因不是密钥不对、也不是过期，而是这个 JWT 过滤器根本没进链：类写完了、也标了 <code>@Component</code>，却没有出现在任何一条 <code>SecurityFilterChain</code> 的 <code>addFilterBefore</code> 里，安全框架对它一无所知，请求照样一路走到授权，上下文是空的，于是被判未认证。第二常见的原因是 <code>Bearer</code> 前缀没剥掉，第三才是密钥和时钟偏移。' },
      { list: [
        '<b>第一步，先看它怎么创建的：</b><code>@Component</code> 或 <code>@Bean</code> 只说明它是个 Bean，不代表它在链里；用 <code>new</code> 传进链的则只存在于链里。这一步只回答“对象在哪”，不回答“有没有接上”。',
        '<b>第二步，再搜 addFilterBefore：</b>配置类里有没有把同一个实例传给 <code>addFilterBefore</code> 或 <code>addFilterAfter</code>；只把过滤器 <code>@Autowired</code> 进来却忘了注册，是最常见的漏接。',
        '<b>第三步，确认没被别的链覆盖：</b>存在多条 <code>SecurityFilterChain</code> 时先匹配到的那条说了算，另一条里的注册根本不会执行；用 <code>web.ignoring()</code> 摘出去的路径连安全链都不进。',
        '<b>最后才看上下文：</b>在 <code>doFilterInternal</code> 里打日志，确认 <code>Authorization</code> 头到了、解析成功、<code>SecurityContextHolder</code> 里真有 <code>Authentication</code>；这四步都过了还 401，才轮到密钥、过期和时钟。'
      ] },

      { p: '403 先打印权限：<code>getAuthorities()</code>。期望 <code>ROLE_ADMIN</code>、实际只有 <code>ADMIN</code>，一眼就清楚。CSRF 也会造成 403，用 Cookie 会话时别关。' },
      { p: '先看响应头有没有认证挑战信息。如果响应里带着要求认证的头，说明请求在认证阶段就被拦下了，根本没走到授权；没有这个头却返回 403，才更像权限不足。' },
      { p: '把安全框架的日志级别调到调试，能看到每个过滤器是否执行、命中了哪条规则、最终由谁拒绝。这比在代码里到处打日志快得多，也是排查这类问题的第一手段。' },
      { p: '然后按层验证，一层一层排除：请求有没有进入过滤器链、令牌有没有解析成功、上下文里有没有身份、身份带的权限列表到底是什么、规则或注解期望的又是什么。五步之内基本能定位。' },
      { p: '还有一个高频误判：用浏览器直接访问接口，看到跳转到登录页就以为“返回 401 了”。表单登录模式下未认证的默认行为是重定向，不是 401。用命令行工具或接口测试工具看真实状态码。' },
      { p: '别忘了错误页：框架转发到错误路径时，如果这个路径也被安全规则拦住，最终状态码可能变成另一个 401 或 403，把真正的原因盖住。错误路径要放行。' },
      { p: '默认行为往往不合前端预期：未认证时可能弹出一个内置登录页，无权限时返回一个白页错误。前后端分离需要的是稳定的状态码加固定结构的响应体。' },
      { p: '框架留了两个扩展点，分工是固定的：入口点处理“没认证”，拒绝处理器处理“认证了但被拒绝”。写反对象，401 会变成 403，或者反过来，前端拦截器就跟着错。' },
      { p: '它们由异常转换过滤器调用，所以只对过滤器链里抛出的异常生效。Controller 里自己抛的异常走全局异常处理器，两条路径要返回同样的结构，否则前端得写两套判断。' },
      { p: '不要为了让前端好处理就在入口点里返回 200，也不要只返回一句提示却不给状态码。前端拦截器通常按状态码决定是否跳登录，状态码错了，正常业务请求也会被跳走。' },

      { h: '2.13 常见坑与常见配置错误' },
      { list: [
        '<b>放行不完整：</b>忘了放行静态资源或错误页，登录页自己 401 循环。',
        '<b>规则顺序写反：</b><code>anyRequest</code> 提前，后面规则失效。',
        '<b>角色前缀混用：</b><code>hasRole("ADMIN")</code> 对应 <code>ROLE_ADMIN</code>。',
        '<b>密码字段太短：</b>60 位密文被截断，表现为永远登录失败。',
        '<b>用 equals 比对密码：</b>盐不同密文必不同，必须用 <code>matches</code>。',
        '<b>JWT 密钥硬编码：</b>泄露即全站失守，有效期建议不超过一天。'
      ] },
      { p: '配了多条安全链，却既没写顺序也没写匹配范围，结果第一条匹配了所有请求，后面的链永远不执行。多条链必须各自声明管哪些路径，并用顺序明确优先级。' },
      { p: '为了放行静态资源，直接用忽略配置把一大批路径从整条链里摘出去。这等于绕过所有安全过滤器，包括那些你以为还在生效的。能用放行表达的，就不要用忽略。' },
      { p: '改了配置却没生效，先确认配置类在扫描范围内，再确认没有遗留的旧式配置类同时存在——两套配置各建一条链，行为会互相干扰。' },
      { p: '密码编码器声明了两个 Bean，注入时按类型找不到唯一候选；或者为了图省事用了不加密的实现，测试能跑通，上线就是明文。编码器全项目只应有一个。' },

      { h: '2.14 本章小结' },
      { list: [
        '安全校验在过滤器链里完成，发生在 Controller 之前。',
        '认证把用户名密码变成 <code>Authentication</code> 存进 <code>SecurityContext</code>。',
        '路径规则按顺序匹配，<code>anyRequest</code> 放最后；方法级用 <code>@PreAuthorize</code>。',
        '密码用 BCrypt 存储与校验，永远不要明文。',
        'JWT 适合无状态多实例场景，代价是无法主动失效，密钥必须外置。'
      ] },

      { h: '2.15 常见追问' },
      { list: [
        '<b>问：认证和授权哪个先？</b><br>答：先认证再授权，顺序不能反。认证回答「你是谁」，授权回答「你能做什么」，没有身份就无从判断权限。落到响应码上：未登录访问受限接口返回 401，客户端据此引导去登录；登录了但角色不够返回 403，客户端不该重复登录。把两者混在一个 403 里，前端只能瞎猜，用户也会被反复弹登录框。过滤器链里认证过滤器排在授权之前，就是要保证进入授权判断时 SecurityContext 里已经有身份。',
        '<b>问：关掉 CSRF 会不会带来越权？</b><br>答：不会，也不会减少越权，因为它俩防的根本不是同一件事。CSRF 防的是「浏览器自动带上 Cookie 帮别人发请求」，越权防的是「这个人能不能动这条数据」。关掉 CSRF 之后，路径规则、方法级注解、数据级归属校验一条都不能少，尤其数据级校验：只按主键查而不带 user_id 条件，越权照样发生。前后端分离用 Token 放请求头时关掉 CSRF 是合理的，因为它本来就不是靠 Cookie 认证的。',
        '<b>问：路径规则和方法级注解，哪个更可靠？</b><br>答：两个都要，谁也不能单独靠。路径规则按 URL 一刀切，通配符写错一位就可能整片放开，而且新增接口容易忘记加规则；注解贴着代码，改接口时不容易漏，但漏写就没人兜底，默认还是放行。可维护的组合是：兜底规则写 <code>anyRequest().authenticated()</code>，路径规则管粗粒度分区，注解管具体方法的角色，数据级再判一次归属。任何一层单独存在都有盲区。',
        '<b>问：为什么密码要用 BCrypt 而不是 MD5 加盐？</b><br>答：差别在「验证一次要多久」。MD5 这类通用哈希设计目标是快，加盐只能挡住彩虹表，挡不住离线暴力破解，一张显卡每秒能算几十亿次。BCrypt 故意把成本做高，内置盐值并带一个强度因子，验证一次要几十毫秒，攻击者能试的次数被压到极低，而正常登录完全感受不到。强度因子还要随硬件提升而调高，这样老库在下次登录时也能平滑升级。',
        '<b>问：JWT 登出真的做不到吗？</b><br>答：严格意义上做不到即时失效，因为它无状态、签发后服务端不再持有任何记录。最常用的组合是短 TTL 加 refresh token：访问令牌只活十几分钟，登出时删掉 refresh token，之后无法再续期，代价是登出后的十几分钟内旧令牌仍可用。确实需要「立即失效」时才上更重的机制：把 jti 塞进 Redis 黑名单直到过期，代价是每次请求多一次查询，等于部分放弃了无状态；或者给用户维护一个 token 版本号，改密码、强制下线时递增，旧版本一律拒绝。这几种都是工程惯例，没有唯一正确答案，按业务对失效时效与额外开销的容忍度取舍。'
      ] },

      { h: '2.16 自测与练习' },
      { ol: [
        '配置 <code>SecurityFilterChain</code>：<code>/public/**</code> 放行，<code>/admin/**</code> 需要管理员，其余需登录，并说明顺序理由。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@Bean\nSecurityFilterChain chain(HttpSecurity http)\n    throws Exception {\n  http.authorizeHttpRequests(a -> a\n        .requestMatchers("/public/**").permitAll()\n        .requestMatchers("/admin/**").hasRole("ADMIN")\n        .anyRequest().authenticated())\n      .formLogin(Customizer.withDefaults());\n  return http.build();\n}</pre><b>要点</b>：规则按声明顺序匹配，一旦命中后面不再判断，anyRequest 必须放最后；hasRole("ADMIN") 会自动补 ROLE_ 前缀，库里存的是 ROLE_ADMIN；Spring Security 6 起没有 WebSecurityConfigurerAdapter，这条链就是唯一入口。</div></details>',
        '实现 <code>UserDetailsService</code>，把数据库中的密文密码交给 Spring 校验，解释为什么不能在这里再加密。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@Service\npublic class DbUserDetailsService\n    implements UserDetailsService {\n  private final UserDao dao;\n\n  public UserDetails loadUserByUsername(String name) {\n    User u = dao.findByName(name);\n    if (u == null) {\n      throw new UsernameNotFoundException(name);\n    }\n    return User.withUsername(u.getName())\n        .password(u.getPassword())      // 库里已是密文\n        .roles(u.getRoles().toArray(new String[0]))\n        .build();\n  }\n}\n\n@Bean\nPasswordEncoder encoder() {\n  return new BCryptPasswordEncoder();\n}</pre><b>要点</b>：这里只负责把密文原样交给 DaoAuthenticationProvider 用 matches 比对，再 encode 一次等于把密文当明文，永远对不上；注册时才是 encode 的地方；登录失败信息统一，别暴露用户名不存在。</div></details>',
        '编写 JWT 签发与解析工具，处理过期与签名错误，说明无效 token 为什么不直接抛全局。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">String jwt = Jwts.builder()\n    .subject("u1")\n    .claim("role", "ADMIN")\n    .issuedAt(new Date())\n    .expiration(new Date(now + 3600_000L))\n    .signWith(key)          // HS256，key 至少 256 位\n    .compact();\n\ntry {\n  Claims c = Jwts.parser().verifyWith(key).build()\n      .parseSignedClaims(jwt).getPayload();\n  return c.getSubject();\n} catch (ExpiredJwtException e) {\n  throw new AuthException("token 过期");\n} catch (JwtException | IllegalArgumentException e) {\n  throw new AuthException("token 无效");\n}</pre><b>要点</b>：过期抛 ExpiredJwtException、密钥不对抛 SignatureException，两者都属于 JwtException，别让它们冒到全局变成 500；过滤器里清空上下文后交给 AuthenticationEntryPoint 统一返回 401；密钥从配置中心读，别硬编码。</div></details>',
        '给接口同时加路径规则和 <code>@PreAuthorize</code>，构造 401 与 403 并写出排查步骤。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">http.authorizeHttpRequests(a -> a\n    .requestMatchers("/api/admin/**").hasRole("ADMIN")\n    .anyRequest().authenticated());\n// 方法级注解要先开\n// @EnableMethodSecurity\n\n@PreAuthorize("hasRole(\'ADMIN\')")\n@GetMapping("/api/admin/users")\npublic List&lt;String> users() { return dao.names(); }\n\n// 排查：不带 token 401，普通用户 403\ncurl -i localhost:8080/api/admin/users\ncurl -i -H "Authorization: Bearer demoTk" \\\n     localhost:8080/api/admin/users</pre><b>要点</b>：401 是「身份缺失或无效」，在认证过滤器阶段就结束；403 是「身份有效但权限不足」，发生在授权阶段；路径规则与方法注解是 AND 关系，@EnableMethodSecurity 没开则注解静默失效。</div></details>'
      ] }
    ]
  };
})();
