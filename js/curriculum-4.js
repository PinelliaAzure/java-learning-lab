/* =====================================================================
   模块 10–12：反射注解与设计模式 / 数据库与 Web / Spring 生态
   ===================================================================== */
(function () {
  'use strict';

  var C = window.JAVA_COURSE || (window.JAVA_COURSE = []);

  function S(code, frames, title, hint) {
    return {
      type: 'steps', title: title, hint: hint, code: code,
      frames: frames.map(function (f) {
        return { line: f[0], vars: f[1], note: f[2], out: f[3] || '', heap: f[4] || null };
      })
    };
  }

  function D(nodes, edges, hint, title) {
    return { type: 'diagram', title: title, hint: hint, nodes: nodes, edges: edges };
  }

  /* ================================================================
     模块 10 · 反射、注解与设计模式
     ================================================================ */
  C.push({
    id: 'm10',
    no: '10',
    title: '反射与设计模式',
    desc: '框架的底层魔法与常用套路',
    lessons: [

      {
        id: 'reflection',
        title: '反射：在运行时操作类',
        minutes: 8,
        level: '高级',
        intro: 'Spring、MyBatis、JUnit 都靠反射工作：程序运行时才知道要创建哪个类、调用哪个方法。它强大，但也慢、容易破坏封装。',
        points: [
          { t: '入口', d: '三种拿到 Class 的方式：<code>Class.forName("全限定名")</code>、<code>obj.getClass()</code>、<code>User.class</code>。同一个类在 JVM 中只有一个 Class 对象。' },
          { t: '创建与调用', d: '<code>getDeclaredConstructor(...).newInstance(...)</code> 创建对象；<code>getDeclaredMethod(...).invoke(obj, args)</code> 调用方法。' },
          { t: '访问私有成员', d: '需要 <code>setAccessible(true)</code>，会关闭访问检查；模块化（JPMS）下可能被拒绝。' },
          { t: '代价', d: '反射绕过编译期检查、性能低于直接调用、破坏封装；只在框架、通用工具里用，业务代码少用。' }
        ],
        code: `Class<?> clazz = Class.forName("com.demo.User");
Constructor<?> ctor = clazz.getDeclaredConstructor(String.class);
Object user = ctor.newInstance("Tom");

Method method = clazz.getDeclaredMethod("sayHello");
method.setAccessible(true);
method.invoke(user);

Field field = clazz.getDeclaredField("name");
field.setAccessible(true);
String name = (String) field.get(user);`,
        tip: '反射不是“随便改私有字段”的借口；框架用它做通用逻辑，业务代码能直接调用就直调。',
        demo: S(`Class<?> clazz = Class.forName("com.demo.User");
Constructor<?> ctor = clazz.getDeclaredConstructor(String.class);
Object user = ctor.newInstance("Tom");
Method m = clazz.getDeclaredMethod("sayHello");
m.invoke(user);`, [
          [0, { clazz: 'class com.demo.User' }, '根据全限定名加载类，拿到唯一的 Class 对象。'],
          [1, { clazz: 'User', ctor: 'User(String)' }, '按参数类型查找构造器；getDeclaredConstructor 能拿到 private 的。'],
          [2, { clazz: 'User', user: '#1' }, 'newInstance("Tom") 等价于 new User("Tom")，但类型在运行时才确定。', '', [
            { title: '#1 User', rows: [['name', '"Tom"']] }
          ]],
          [3, { user: '#1', m: 'sayHello()' }, '按方法名和参数类型查找方法。'],
          [4, { user: '#1', m: 'sayHello()' }, 'invoke 执行方法，输出 Hello。', 'Hello, Tom']
        ], '反射的四步', 'Class → Constructor → Object → Method，框架启动时大量重复这个流程。'),
        quiz: [
          {
            q: '同一个类被不同方式加载，<code>getClass()</code> 得到的 Class 对象？',
            options: ['每次都是新的', '同一个类加载器下是同一个', '取决于 new 的次数', '一定不同'],
            answer: 1,
            explain: '类由“类加载器 + 全限定名”唯一确定；同一个加载器下，同一个类只有一个 Class 实例。'
          },
          {
            q: '调用私有方法前通常需要？',
            options: ['重写方法', 'setAccessible(true)', '把方法改成 static', '使用 final'],
            answer: 1,
            explain: '反射访问私有成员需要关闭访问检查（setAccessible(true)）；否则抛 IllegalAccessException。'
          }
        ]
      },

      {
        id: 'annotations',
        title: '注解与元注解',
        minutes: 7,
        level: '高级',
        intro: '注解本身不干活，它只是“贴在代码上的标签”；真正让它生效的是反射或编译期处理器（APT）。Spring 的 @Service、@Transactional 都是这个套路。',
        points: [
          { t: '定义', d: '用 <code>@interface</code> 声明；可以带属性，属性本质是方法，可写默认值。' },
          { t: '元注解', d: '<code>@Retention</code> 控制保留到哪（SOURCE / CLASS / RUNTIME）；<code>@Target</code> 限制能贴在哪；<code>@Documented</code>、<code>@Inherited</code>。' },
          { t: '运行时读取', d: '只有 <code>RetentionPolicy.RUNTIME</code> 的注解能被反射读到；<code>getAnnotation</code> / <code>getAnnotations</code>。' },
          { t: '处理方式', d: '反射 + AOP（Spring）、编译期 APT（Lombok、MapStruct）、字节码增强。注解只是元数据，必须有处理器。' }
        ],
        code: `@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LogTime {
    String value() default "";
}

// 使用
@LogTime("queryUser")
public User queryUser(long id) { ... }

// 读取
Method m = UserService.class.getMethod("queryUser", long.class);
LogTime ann = m.getAnnotation(LogTime.class);
System.out.println(ann.value());   // queryUser`,
        tip: '自定义注解三步：定义 @interface、加上 @Retention(RUNTIME) 和 @Target、写反射/AOP 处理逻辑。',
        demo: D([
          { id: 'def', label: '@interface', sub: '定义注解', x: 6, y: 10, w: 20, h: 14, tone: 'amber', info: '注解本质是一个继承 Annotation 的接口，属性是它的方法。' },
          { id: 'ret', label: '@Retention', sub: '保留策略', x: 32, y: 10, w: 18, h: 14, tone: 'teal', info: 'SOURCE 编译后丢弃；CLASS 留在 class 文件但反射不可见；RUNTIME 才能被反射读取。' },
          { id: 'target', label: '@Target', sub: '可用位置', x: 56, y: 10, w: 16, h: 14, tone: 'teal', info: '限制注解能贴在类、方法、字段、参数等位置，写错位置编译报错。' },
          { id: 'use', label: '@LogTime', sub: '贴在方法上', x: 8, y: 52, w: 18, h: 12, tone: 'violet', info: '注解只携带元数据，本身不会执行任何逻辑。' },
          { id: 'proc', label: '处理器', sub: '反射 / AOP / APT', x: 34, y: 52, w: 20, h: 12, tone: 'rose', info: 'Spring AOP 在运行时读取注解并生成代理；Lombok 在编译期修改 AST。' },
          { id: 'effect', label: '生效', sub: '日志 / 事务 / 校验', x: 62, y: 52, w: 18, h: 12, tone: 'blue', info: '真正做事的是处理器，注解只是“告诉处理器该做什么”。' }
        ], [
          { from: 'def', to: 'ret', label: '标注' },
          { from: 'def', to: 'target', label: '标注' },
          { from: 'use', to: 'proc', label: '被读取' },
          { from: 'proc', to: 'effect', label: '产生行为' }
        ], '点击节点：注解定义、元注解、处理器、最终效果。', '注解是怎么生效的'),
        quiz: [
          {
            q: '想让注解在运行时被反射读取，Retention 必须是？',
            options: ['SOURCE', 'CLASS', 'RUNTIME', '默认即可'],
            answer: 2,
            explain: '只有 RUNTIME 策略的注解会保留在 class 文件中并在运行时可见；SOURCE 只存在于源码。'
          },
          {
            q: '注解本身会自动执行逻辑吗？',
            options: ['会，JVM 自动执行', '不会，必须有反射、AOP 或编译期处理器', '只有 @Override 会', '取决于方法名'],
            answer: 1,
            explain: '注解只是元数据，必须由框架或工具读取后执行相应逻辑；没有处理器，注解只是摆设。'
          }
        ]
      },

      {
        id: 'patterns-creational',
        title: '单例、工厂与建造者',
        minutes: 7,
        level: '进阶',
        intro: '设计模式不是炫技，而是给常见问题起个名字。创建型模式解决“怎么把对象造出来”，先看最常用的单例、工厂和建造者。',
        points: [
          { t: '单例 Singleton', d: '全局唯一实例。饿汉式简单但可能浪费；懒汉式要处理线程安全；枚举单例最简洁、天然防反射和序列化破坏。' },
          { t: '双重检查 DCL', d: '<code>volatile</code> + 两次 null 判断 + synchronized。volatile 防止“分配内存、初始化、赋引用”重排导致拿到半成品。' },
          { t: '工厂 Factory', d: '把 new 的细节藏起来，按参数返回不同实现；简单工厂、工厂方法、抽象工厂。Spring 的 BeanFactory 就是工厂。' },
          { t: '建造者 Builder', d: '参数多、可选参数多时，用链式调用逐步构建，避免超长构造器。Lombok 的 @Builder 就是它。' }
        ],
        code: `public class Singleton {
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                 // 第一次检查
            synchronized (Singleton.class) {
                if (instance == null) {         // 第二次检查
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}`,
        tip: '单例的私有构造器挡不住反射；枚举单例是《Effective Java》推荐的最简写法。',
        demo: S(`class Singleton {
    private static volatile Singleton instance;
    private Singleton() {}
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) instance = new Singleton();
            }
        }
        return instance;
    }
}`, [
          [1, { instance: 'null' }, '类加载时静态字段为 null，还没有创建对象。'],
          [3, { instance: 'null' }, '第一次调用 getInstance，instance 为空。'],
          [4, { instance: 'null', lock: '未加锁' }, '进入 synchronized，锁住 Singleton.class。'],
          [5, { instance: '#1', lock: '已加锁' }, '第二次检查仍为 null，创建唯一实例并赋给静态字段。', '', [
            { title: '#1 Singleton', rows: [['唯一实例', 'true']] }
          ]],
          [8, { instance: '#1', lock: '已释放' }, '后续调用直接返回同一个 #1，不再进入同步块。']
        ], '双重检查锁单例', 'volatile 不能省：它禁止 new 的重排，避免其他线程看到未初始化完成的对象。'),
        quiz: [
          {
            q: '双重检查单例中，instance 为什么必须加 volatile？',
            options: ['提高性能', '防止指令重排导致其他线程拿到半初始化对象', '让构造器变成私有', '支持序列化'],
            answer: 1,
            explain: 'new 对象分分配内存、初始化、赋引用三步，可能重排；volatile 禁止这种重排，保证可见性和有序性。'
          },
          {
            q: '参数很多、很多可选参数时，最适合用？',
            options: ['超长构造器', '建造者 Builder', '单例', '反射'],
            answer: 1,
            explain: 'Builder 链式设置可选参数，最后 build，可读性好且避免构造器参数顺序写错。'
          }
        ]
      },

      {
        id: 'patterns-behavioral',
        title: '策略、观察者与代理',
        minutes: 7,
        level: '进阶',
        intro: '行为型模式关注“对象之间怎么协作”。策略让算法可替换，观察者实现事件通知，代理在不改原类的前提下增强功能——Spring AOP 就是代理。',
        points: [
          { t: '策略 Strategy', d: '把一组算法封装成统一接口，运行时选择。替代大量 if-else；支付方式、排序规则都是典型场景。' },
          { t: '观察者 Observer', d: '主题维护监听者列表，状态变化时通知所有观察者。Spring 的 ApplicationEvent、消息队列都是它的变体。' },
          { t: '代理 Proxy', d: '静态代理手写包装类；动态代理在运行时生成代理类（JDK Proxy 基于接口，CGLIB 基于继承）。' },
          { t: 'AOP', d: '把日志、事务、权限等横切关注点从业务代码里抽出来，通过代理在方法前后织入。' }
        ],
        code: `interface PayStrategy {
    void pay(int amount);
}

class AliPay implements PayStrategy {
    public void pay(int amount) { System.out.println("支付宝 " + amount); }
}

class WechatPay implements PayStrategy {
    public void pay(int amount) { System.out.println("微信 " + amount); }
}

class Order {
    private PayStrategy strategy;
    Order(PayStrategy strategy) { this.strategy = strategy; }
    void checkout(int amount) { strategy.pay(amount); }
}`,
        tip: '策略模式的关键不是“写接口”，而是把变化点抽出来，让新增算法不用改调用方。',
        demo: D([
          { id: 'ctx', label: 'Order', sub: '持有策略接口', x: 8, y: 36, w: 20, h: 14, tone: 'amber', info: '上下文只依赖 PayStrategy 接口，不知道具体是支付宝还是微信。' },
          { id: 'strategy', label: 'PayStrategy', sub: 'pay(int)', x: 38, y: 36, w: 22, h: 14, tone: 'violet', info: '统一接口，新增支付方式实现它即可，不用改 Order。' },
          { id: 'ali', label: 'AliPay', sub: '支付宝', x: 72, y: 14, w: 18, h: 12, tone: 'teal', info: '具体策略 A；运行时由客户端注入。' },
          { id: 'wx', label: 'WechatPay', sub: '微信', x: 72, y: 58, w: 18, h: 12, tone: 'teal', info: '具体策略 B；同样实现接口。' },
          { id: 'observer', label: 'Observer', sub: '状态变化通知', x: 8, y: 72, w: 22, h: 12, tone: 'blue', info: '观察者模式：主题维护监听器列表，事件发生时逐个回调。' },
          { id: 'proxy', label: 'Proxy / AOP', sub: '增强而不改源码', x: 38, y: 72, w: 22, h: 12, tone: 'rose', info: '代理在方法调用前后插入日志、事务等逻辑，Spring AOP 的核心。' }
        ], [
          { from: 'ctx', to: 'strategy', label: '依赖' },
          { from: 'ali', to: 'strategy', label: '实现' },
          { from: 'wx', to: 'strategy', label: '实现' }
        ], '策略解决“算法可替换”，观察者解决“状态通知”，代理解决“功能增强”。', '三个常用行为型模式'),
        quiz: [
          {
            q: '把 if-else 里的多种支付方式改成可扩展结构，最适合用？',
            options: ['单例模式', '策略模式', '建造者模式', '代理模式'],
            answer: 1,
            explain: '策略模式把每种支付方式封装成实现同一接口的类，新增方式只需加类，不用改 if-else。'
          },
          {
            q: 'Spring AOP 底层主要依赖？',
            options: ['继承', '动态代理', '反射调用 main', '枚举'],
            answer: 1,
            explain: 'Spring AOP 通过 JDK 动态代理（接口）或 CGLIB（类）生成代理对象，在方法前后织入增强逻辑。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 11 · 数据库与 Web
     ================================================================ */
  C.push({
    id: 'm11',
    no: '11',
    title: '数据库与 Web',
    desc: 'JDBC、HTTP、构建与测试',
    lessons: [

      {
        id: 'sql-jdbc',
        title: 'SQL 基础与 JDBC',
        minutes: 8,
        level: '进阶',
        intro: 'Java 程序要和数据库打交道，JDBC 是最底层的一套标准接口。Spring 的 JdbcTemplate、MyBatis 都是在它之上做的封装。',
        points: [
          { t: 'JDBC 五步', d: '加载驱动（JDK 6+ 可省略）→ 获取 Connection → 创建 Statement → 执行 SQL 拿 ResultSet → 关闭资源。' },
          { t: '核心接口', d: '<code>Connection</code>、<code>PreparedStatement</code>、<code>ResultSet</code>。面向接口编程，具体实现由数据库驱动提供。' },
          { t: 'ResultSet', d: '游标初始指向第一行之前，<code>next()</code> 返回 false 表示没有更多行；按列名或下标取值。' },
          { t: '连接池', d: '频繁创建连接代价高，生产环境用 HikariCP / Druid 等连接池复用连接，并配置最大连接数、超时。' }
        ],
        code: `String url = "jdbc:mysql://localhost:3306/demo";
try (Connection conn = DriverManager.getConnection(url, "root", "pwd");
     PreparedStatement ps = conn.prepareStatement(
             "SELECT id, name FROM users WHERE age > ?")) {

    ps.setInt(1, 18);
    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getLong("id") + " " + rs.getString("name"));
        }
    }
}`,
        tip: '永远使用 PreparedStatement 传参，不要拼接 SQL 字符串——这是防 SQL 注入的第一道门。',
        demo: S(`Connection conn = DriverManager.getConnection(url, user, pwd);
PreparedStatement ps = conn.prepareStatement(
    "SELECT name FROM users WHERE id = ?");
ps.setInt(1, 1);
ResultSet rs = ps.executeQuery();
rs.next();
System.out.println(rs.getString("name"));`, [
          [0, { conn: '已连接' }, '通过驱动获取数据库连接；真实项目从连接池借。'],
          [1, { conn: '已连接', ps: 'SQL 已预编译' }, 'SQL 带 ? 占位符，先发给数据库预编译。'],
          [2, { conn: '已连接', ps: '参数 1 = 1' }, 'setInt 把参数绑定到第 1 个占位符，参数值不会被当成 SQL 解析。'],
          [3, { conn: '已连接', rs: '结果集（游标在首行前）' }, 'executeQuery 返回 ResultSet，此时还没读取任何行。'],
          [4, { conn: '已连接', rs: '第 1 行' }, 'rs.next() 把游标移到第一行，返回 true。'],
          [5, { conn: '已连接', name: '"Tom"' }, '按列名取出 name 并输出。', 'Tom']
        ], 'JDBC 查询的完整流程', '关闭顺序：ResultSet → Statement → Connection，try-with-resources 会自动处理。'),
        quiz: [
          {
            q: 'JDBC 中执行带参数的查询，应该用？',
            options: ['Statement 拼接字符串', 'PreparedStatement + setXxx', '直接执行 SQL 文件', 'ResultSet 写 SQL'],
            answer: 1,
            explain: 'PreparedStatement 预编译并绑定参数，能防止 SQL 注入，还能复用执行计划。'
          },
          {
            q: 'ResultSet 的 <code>next()</code> 返回 false 表示？',
            options: ['查询出错', '没有更多行了', '当前行是 null', '连接已关闭'],
            answer: 1,
            explain: 'ResultSet 是游标，next() 移到下一行并返回是否有数据；false 表示结果集遍历完毕。'
          }
        ]
      },

      {
        id: 'prepared-transaction',
        title: 'PreparedStatement 与事务',
        minutes: 7,
        level: '进阶',
        intro: '转账要么全成功、要么全失败，这就是事务。JDBC 默认自动提交，每条 SQL 单独生效；要保证一组操作原子性，必须手动控制。',
        points: [
          { t: 'SQL 注入', d: '拼接 <code>"WHERE name = \'" + input + "\'"</code> 时，输入 <code>\' OR \'1\'=\'1</code> 就能绕过条件。PreparedStatement 用参数绑定，彻底避免。' },
          { t: '事务 ACID', d: '原子性、一致性、隔离性、持久性。JDBC 中 <code>setAutoCommit(false)</code> 开启事务。' },
          { t: '提交与回滚', d: '全部成功 <code>commit()</code>；捕获异常后 <code>rollback()</code>。finally 里恢复 autoCommit 和关闭连接。' },
          { t: '隔离级别', d: 'READ UNCOMMITTED / READ COMMITTED / REPEATABLE READ / SERIALIZABLE。级别越高一致性越强，并发越低。' }
        ],
        code: `conn.setAutoCommit(false);
try {
    try (PreparedStatement out = conn.prepareStatement(
            "UPDATE account SET balance = balance - ? WHERE id = ?")) {
        out.setInt(1, 100);
        out.setInt(2, 1);
        out.executeUpdate();
    }

    try (PreparedStatement in = conn.prepareStatement(
            "UPDATE account SET balance = balance + ? WHERE id = ?")) {
        in.setInt(1, 100);
        in.setInt(2, 2);
        in.executeUpdate();
    }

    conn.commit();
} catch (SQLException e) {
    conn.rollback();
    throw e;
} finally {
    conn.setAutoCommit(true);
}`,
        tip: '事务要短：不要在事务里做远程调用、发消息、等用户输入，否则会长时间占着锁。',
        demo: S(`conn.setAutoCommit(false);
update("A", -100);
update("B", +100);
conn.commit();`, [
          [0, { autoCommit: 'false', 事务: '开始' }, '关闭自动提交，后续 SQL 属于同一个事务。'],
          [1, { A: '900', B: '1000', 事务: '未提交' }, 'A 账户扣 100，变更只在当前事务可见。'],
          [2, { A: '900', B: '1100', 事务: '未提交' }, 'B 账户加 100，两步都成功。'],
          [3, { A: '900', B: '1100', 事务: '已提交' }, 'commit 后变更对所有连接可见，转账完成。'],
          [3, { A: '900', B: '1100', 事务: '已提交' }, '如果第二步失败，catch 里 rollback，A 的扣款也会撤销。']
        ], '一次转账事务', '原子性：要么 A-100 且 B+100 都生效，要么都不生效。'),
        quiz: [
          {
            q: 'PreparedStatement 能防止 SQL 注入的根本原因是？',
            options: ['它会转义单引号', 'SQL 结构先预编译，参数只作为值传入，不参与语法解析', '它比 Statement 快', '它自动加密'],
            answer: 1,
            explain: 'SQL 模板先编译，参数通过占位符绑定为值；即使参数里有 SQL 关键字，也不会被当成语句结构。'
          },
          {
            q: 'JDBC 默认的提交方式是？',
            options: ['手动提交', '自动提交，每条 SQL 独立生效', '批量提交', '由数据库决定'],
            answer: 1,
            explain: 'Connection 默认 autoCommit=true，每条语句执行完立即提交；要事务必须显式 setAutoCommit(false)。'
          }
        ]
      },

      {
        id: 'http-servlet',
        title: 'HTTP 与 Servlet 请求链路',
        minutes: 8,
        level: '进阶',
        intro: '浏览器输入网址后，请求是怎么一步步到达你的 Java 代码的？理解 HTTP 和 Servlet 容器，是学 Spring MVC 的前置知识。',
        points: [
          { t: 'HTTP 基础', d: '请求 = 方法 + 路径 + 头 + 体；响应 = 状态码 + 头 + 体。常见方法 GET / POST / PUT / DELETE，状态码 200 / 301 / 404 / 500。' },
          { t: 'Servlet 容器', d: 'Tomcat / Jetty 负责监听端口、解析 HTTP、管理 Servlet 生命周期（init → service → destroy）。' },
          { t: '请求流程', d: '浏览器 → DNS → TCP → Tomcat → Filter 链 → Servlet → 业务代码 → 响应。' },
          { t: '无状态', d: 'HTTP 本身不保存状态，靠 Cookie / Session / Token 维持登录态；这也是 RESTful 设计的基础。' }
        ],
        code: `@WebServlet("/hello")
public class HelloServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String name = req.getParameter("name");
        resp.setContentType("text/plain;charset=UTF-8");
        resp.getWriter().println("Hello, " + name);
    }
}`,
        tip: 'Servlet 是单例多线程：不要在 Servlet 里用实例字段保存请求数据，否则会串号。',
        demo: D([
          { id: 'browser', label: '浏览器', sub: '发起请求', x: 4, y: 12, w: 16, h: 13, tone: 'blue', info: '输入 URL，浏览器解析域名、建立 TCP 连接，发送 HTTP 请求。' },
          { id: 'tomcat', label: 'Tomcat', sub: '监听端口 / 解析 HTTP', x: 24, y: 12, w: 18, h: 13, tone: 'amber', info: 'Servlet 容器：把字节流解析成 HttpServletRequest，管理 Servlet 生命周期。' },
          { id: 'filter', label: 'Filter 链', sub: '编码 / 鉴权 / 日志', x: 46, y: 12, w: 18, h: 13, tone: 'violet', info: '在 Servlet 前后执行，Spring Security、字符编码过滤器都在这一层。' },
          { id: 'servlet', label: 'Servlet', sub: '业务入口', x: 68, y: 12, w: 16, h: 13, tone: 'teal', info: '接收请求参数、调用 Service、写出响应；单例多线程，注意线程安全。' },
          { id: 'resp', label: 'HTTP 响应', sub: '状态码 + 头 + 体', x: 68, y: 56, w: 16, h: 13, tone: 'rose', info: '容器把响应写回 socket，浏览器渲染页面或处理 JSON。' },
          { id: 'session', label: 'Session / Cookie', sub: '维持登录态', x: 24, y: 56, w: 18, h: 13, tone: 'blue', info: 'HTTP 无状态；通过 JSESSIONID Cookie 关联服务端 Session。' }
        ], [
          { from: 'browser', to: 'tomcat', label: 'HTTP' },
          { from: 'tomcat', to: 'filter', label: '分发' },
          { from: 'filter', to: 'servlet', label: '放行' },
          { from: 'servlet', to: 'resp', label: '写回' },
          { from: 'browser', to: 'session', label: 'Cookie', dashed: true }
        ], '点击节点：请求从左到右，响应再回来。', '一次 HTTP 请求的旅程'),
        quiz: [
          {
            q: 'Servlet 默认是单例还是每次请求创建一个？',
            options: ['每个请求一个实例', '单例，多线程处理请求', '每个线程一个实例', '由浏览器决定'],
            answer: 1,
            explain: '容器通常只创建一个 Servlet 实例，多个请求线程共享它；所以不要在实例字段里存请求级数据。'
          },
          {
            q: 'HTTP 本身是无状态协议，靠什么维持登录态？',
            options: ['TCP 连接', 'Cookie / Session / Token', 'DNS', '端口号'],
            answer: 1,
            explain: 'HTTP 不记忆状态；服务端用 Session，客户端用 Cookie 或 Token（如 JWT）在每次请求时携带身份信息。'
          }
        ]
      },

      {
        id: 'build-test',
        title: 'Maven、Gradle 与单元测试',
        minutes: 7,
        level: '进阶',
        intro: '项目变大后，靠 javac 一个个编译不现实。构建工具管依赖、编译、测试、打包；JUnit 则让你改代码时心里有底。',
        points: [
          { t: 'Maven', d: '约定大于配置：src/main/java、src/test/java、pom.xml。坐标 groupId / artifactId / version 唯一定位依赖。' },
          { t: '生命周期', d: 'validate → compile → test → package → verify → install → deploy。执行后面的阶段会自动执行前面的阶段。' },
          { t: '依赖冲突', d: 'Maven 按“最短路径优先、先声明优先”调解版本冲突；用 <code>mvn dependency:tree</code> 排查。' },
          { t: 'JUnit 5', d: '<code>@Test</code>、<code>@BeforeEach</code>、<code>@ParameterizedTest</code>、断言 API；测试应该独立、快速、可重复。' }
        ],
        code: `// pom.xml 片段
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>

// 测试类
class CalculatorTest {
    @Test
    void addsTwoNumbers() {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
    }

    @Test
    void divideByZeroThrows() {
        assertThrows(ArithmeticException.class,
                () -> new Calculator().divide(1, 0));
    }
}`,
        tip: '测试不是“写完再补”的负担：先写一个失败的测试，再写实现让它通过，代码质量会完全不同。',
        demo: D([
          { id: 'validate', label: 'validate', sub: '校验项目', x: 4, y: 10, w: 16, h: 11, tone: 'teal', info: '检查项目结构、pom 配置是否合法。' },
          { id: 'compile', label: 'compile', sub: '编译主代码', x: 22, y: 10, w: 16, h: 11, tone: 'teal', info: '编译 src/main/java 到 target/classes。' },
          { id: 'test', label: 'test', sub: '运行单元测试', x: 40, y: 10, w: 16, h: 11, tone: 'amber', info: '编译并运行 src/test/java；测试失败会中断构建。' },
          { id: 'package', label: 'package', sub: '打成 jar / war', x: 58, y: 10, w: 16, h: 11, tone: 'violet', info: '把编译结果和依赖打成可分发的包。' },
          { id: 'install', label: 'install', sub: '装进本地仓库', x: 76, y: 10, w: 18, h: 11, tone: 'blue', info: '供本机其他项目依赖；deploy 则发布到远程仓库。' },
          { id: 'junit', label: 'JUnit 5', sub: '断言 + 生命周期', x: 22, y: 58, w: 20, h: 13, tone: 'rose', info: '@Test 标记测试方法；每个测试独立运行，可用 @BeforeEach 准备数据。' },
          { id: 'ci', label: 'CI 流水线', sub: '自动构建 + 测试', x: 52, y: 58, w: 20, h: 13, tone: 'violet', info: '提交代码后自动跑 mvn test，失败就阻止合并——这是团队质量的底线。' }
        ], [
          { from: 'validate', to: 'compile' },
          { from: 'compile', to: 'test' },
          { from: 'test', to: 'package' },
          { from: 'package', to: 'install' },
          { from: 'junit', to: 'test', label: '执行', dashed: true },
          { from: 'ci', to: 'test', label: '触发', dashed: true }
        ], '点击节点看每个阶段做什么。注意：执行 package 会自动先跑 test。', '构建生命周期'),
        quiz: [
          {
            q: '执行 <code>mvn package</code> 时，Maven 会自动执行哪些阶段？',
            options: ['只执行 package', 'validate → compile → test → package', '只执行 test', 'install 和 deploy'],
            answer: 1,
            explain: 'Maven 生命周期是有序的，执行某个阶段会自动执行它之前的所有阶段；install / deploy 在 package 之后。'
          },
          {
            q: '单元测试最重要的特性是？',
            options: ['依赖数据库', '快速、独立、可重复', '必须覆盖所有代码', '只能由作者运行'],
            answer: 1,
            explain: '好的单元测试不依赖外部环境、彼此独立、随时可重复运行；覆盖率是手段，不是唯一目标。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 12 · Spring 生态
     ================================================================ */
  C.push({
    id: 'm12',
    no: '12',
    title: 'Spring 生态',
    desc: 'IoC、Boot、MVC 与数据访问',
    lessons: [

      {
        id: 'ioc-di',
        title: 'IoC 与依赖注入',
        minutes: 8,
        level: '进阶',
        intro: 'Spring 最核心的思想：对象不要自己 new 依赖，而是把控制权交给容器，由容器在启动时把依赖“注入”进来。',
        points: [
          { t: 'IoC 控制反转', d: '对象的创建、组装、生命周期交给 Spring 容器管理，业务代码只声明“我需要什么”。' },
          { t: 'DI 依赖注入', d: '构造器注入（推荐）、Setter 注入、字段注入（不推荐）。构造器注入能保证依赖不为空、便于测试。' },
          { t: 'Bean 与作用域', d: '默认单例 singleton；还有 prototype、request、session。Bean 默认在容器启动时创建（可配懒加载）。' },
          { t: '常见注解', d: '<code>@Component / @Service / @Repository / @Controller</code> 标记 Bean；<code>@Autowired</code> 注入；<code>@Configuration + @Bean</code> 手动注册。' }
        ],
        code: `@Service
public class OrderService {
    private final PayService payService;

    // 构造器注入：依赖不可变，测试时可传入 mock
    public OrderService(PayService payService) {
        this.payService = payService;
    }

    public void checkout(Order order) {
        payService.pay(order.total());
    }
}

@Service
public class PayService { ... }`,
        tip: '不要再写 <code>new OrderService(new PayService())</code>；把依赖声明在构造器参数里，容器会帮你装配。',
        demo: D([
          { id: 'container', label: 'Spring 容器', sub: '创建 / 装配 / 管理 Bean', x: 32, y: 8, w: 36, h: 14, tone: 'amber', info: '启动时扫描注解，创建单例 Bean，按类型/名称注入依赖。' },
          { id: 'order', label: 'OrderService', sub: '@Service', x: 8, y: 48, w: 24, h: 14, tone: 'teal', info: '声明自己依赖 PayService；容器创建它时会把 PayService 传进构造器。' },
          { id: 'pay', label: 'PayService', sub: '@Service', x: 40, y: 48, w: 22, h: 14, tone: 'teal', info: '被容器创建并注入到 OrderService；业务代码不 new。' },
          { id: 'repo', label: 'OrderRepository', sub: '@Repository', x: 70, y: 48, w: 24, h: 14, tone: 'teal', info: '数据访问层也是一个 Bean，可被 Service 注入。' },
          { id: 'config', label: '@Configuration', sub: '@Bean 手动注册', x: 8, y: 76, w: 24, h: 12, tone: 'violet', info: '第三方类无法加注解时，用 @Bean 方法在配置类里注册。' },
          { id: 'scope', label: '作用域', sub: '默认 singleton', x: 40, y: 76, w: 22, h: 12, tone: 'blue', info: '单例 Bean 全局一个；prototype 每次获取都新建。单例 Bean 必须无状态。' }
        ], [
          { from: 'container', to: 'order', label: '创建' },
          { from: 'container', to: 'pay', label: '创建' },
          { from: 'container', to: 'repo', label: '创建' },
          { from: 'order', to: 'pay', label: '注入' },
          { from: 'order', to: 'repo', label: '注入', dashed: true }
        ], '点击节点：容器先创建所有 Bean，再按依赖关系注入。', 'IoC 容器做了什么'),
        quiz: [
          {
            q: '构造器注入相比字段注入的主要优势是？',
            options: ['代码更短', '依赖不可变、不为 null，且便于单元测试', '启动更快', '可以循环依赖'],
            answer: 1,
            explain: '构造器注入把依赖声明为 final，对象创建即完整；测试时可以直接传 mock，不依赖 Spring 容器。'
          },
          {
            q: 'Spring 默认的 Bean 作用域是？',
            options: ['prototype', 'request', 'singleton', 'session'],
            answer: 2,
            explain: '默认 singleton：整个容器只有一个实例。因此单例 Bean 应该无状态，避免并发串数据。'
          }
        ]
      },

      {
        id: 'boot-autoconfig',
        title: 'Spring Boot 自动配置',
        minutes: 8,
        level: '进阶',
        intro: '@SpringBootApplication 一个注解就能启动整个应用：自动配置到底是怎么“猜”出你需要什么的？答案藏在条件注解和 starter 里。',
        points: [
          { t: '组合注解', d: '<code>@SpringBootApplication</code> = <code>@SpringBootConfiguration</code> + <code>@EnableAutoConfiguration</code> + <code>@ComponentScan</code>。' },
          { t: '自动配置入口', d: '启动时读取 <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code>，加载候选配置类。' },
          { t: '条件装配', d: '<code>@ConditionalOnClass</code>、<code>@ConditionalOnMissingBean</code>、<code>@ConditionalOnProperty</code>：类路径有驱动、用户没自己定义 Bean、配置开关打开，才生效。' },
          { t: 'Starter', d: 'starter 只是依赖聚合：引入 spring-boot-starter-web 就带来 Spring MVC、Tomcat、Jackson，自动配置随之生效。' }
        ],
        code: `@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}

// 自定义自动配置（简化）
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
public class DataSourceAutoConfig {
    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource() {
        return new HikariDataSource();
    }
}`,
        tip: '自动配置不是魔法：类路径有什么、你定义了什么、配置项是什么，三者共同决定 Bean 装不装。',
        demo: S(`@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}`, [
          [0, { 注解: '@SpringBootApplication' }, '组合注解：配置类 + 自动配置 + 组件扫描。'],
          [2, { 阶段: '启动' }, 'main 方法调用 SpringApplication.run，创建 ApplicationContext。'],
          [3, { 阶段: '扫描' }, '扫描启动类所在包及子包，注册 @Component / @Service / @Controller。'],
          [3, { 阶段: '自动配置' }, '读取 AutoConfiguration.imports，按条件注解筛选配置类。'],
          [3, { 阶段: '条件判断' }, '类路径有 HikariCP 且用户没定义 DataSource，才注册默认数据源。'],
          [3, { 阶段: '就绪' }, '所有单例 Bean 创建完成，内嵌 Tomcat 启动，开始接收请求。']
        ], 'Spring Boot 启动做了什么', '启动失败时，条件评估报告（--debug）能告诉你哪个自动配置没生效。'),
        quiz: [
          {
            q: '@SpringBootApplication 不包含下面哪个注解？',
            options: ['@EnableAutoConfiguration', '@ComponentScan', '@SpringBootConfiguration', '@Transactional'],
            answer: 3,
            explain: '@Transactional 是事务注解，和启动注解无关；前三个是 @SpringBootApplication 的组合成员。'
          },
          {
            q: '@ConditionalOnMissingBean 的作用是？',
            options: ['类不存在时才生效', '容器里没有该类型 Bean 时才注册默认 Bean', '配置项缺失时报错', '只在测试环境生效'],
            answer: 1,
            explain: '它让自动配置“让位”于用户自定义：你定义了自己的 Bean，默认配置就不生效。'
          }
        ]
      },

      {
        id: 'mvc-flow',
        title: 'Spring MVC 请求链路',
        minutes: 8,
        level: '进阶',
        intro: '一个 @RestController 方法是怎么被调用的？从 DispatcherServlet 到参数绑定、返回值处理，理解这条链路，排查 404 / 400 就不再靠猜。',
        points: [
          { t: '前端控制器', d: '<code>DispatcherServlet</code> 接收所有请求，是 Spring MVC 的总调度。' },
          { t: '核心组件', d: 'HandlerMapping 找哪个方法处理；HandlerAdapter 调用方法；参数解析器绑定请求参数；ViewResolver（前后端分离时由 HttpMessageConverter 输出 JSON）。' },
          { t: '常用注解', d: '<code>@RequestMapping / @GetMapping / @PostMapping</code>、<code>@PathVariable</code>、<code>@RequestParam</code>、<code>@RequestBody</code>、<code>@ResponseBody</code>。' },
          { t: '异常处理', d: '<code>@ControllerAdvice + @ExceptionHandler</code> 统一兜底，返回结构化错误信息，而不是 500 堆栈。' }
        ],
        code: `@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) { this.service = service; }

    @GetMapping("/{id}")
    public User get(@PathVariable long id) {
        return service.findById(id);   // 自动转 JSON
    }

    @PostMapping
    public User create(@RequestBody User user) {
        return service.save(user);
    }
}`,
        tip: '404 先看路径是否匹配、包是否被扫描；400 看参数绑定；500 看 @ControllerAdvice 和日志。',
        demo: D([
          { id: 'req', label: 'HTTP 请求', sub: 'GET /api/users/1', x: 3, y: 12, w: 17, h: 12, tone: 'blue', info: '浏览器或前端发来的请求，由 Tomcat 接收并转交 DispatcherServlet。' },
          { id: 'ds', label: 'DispatcherServlet', sub: '前端控制器', x: 23, y: 12, w: 18, h: 12, tone: 'amber', info: 'Spring MVC 的总入口：统一接收请求、分发给合适的处理器。' },
          { id: 'hm', label: 'HandlerMapping', sub: '找到 @GetMapping', x: 44, y: 12, w: 17, h: 12, tone: 'violet', info: '根据 URL 和方法匹配到 UserController#get。' },
          { id: 'ha', label: 'HandlerAdapter', sub: '参数绑定 + 调用', x: 64, y: 12, w: 17, h: 12, tone: 'teal', info: '解析 @PathVariable、@RequestBody，反射调用 Controller 方法。' },
          { id: 'ctrl', label: 'Controller', sub: '业务入口', x: 84, y: 12, w: 13, h: 12, tone: 'teal', info: '调用 Service，返回 User 对象。' },
          { id: 'json', label: 'HttpMessageConverter', sub: '对象 → JSON', x: 64, y: 56, w: 18, h: 12, tone: 'rose', info: 'MappingJackson2HttpMessageConverter 把 User 序列化成 JSON。' },
          { id: 'resp', label: 'HTTP 响应', sub: '200 + JSON', x: 84, y: 56, w: 13, h: 12, tone: 'blue', info: '响应写回客户端；异常则由 @ControllerAdvice 统一处理。' }
        ], [
          { from: 'req', to: 'ds', label: '转发' },
          { from: 'ds', to: 'hm', label: '查询' },
          { from: 'hm', to: 'ha', label: '匹配到方法' },
          { from: 'ha', to: 'ctrl', label: '调用' },
          { from: 'ctrl', to: 'json', label: '返回值' },
          { from: 'json', to: 'resp', label: '序列化' }
        ], '点击节点看每一步。前后端分离时，ViewResolver 换成了 JSON 消息转换器。', 'DispatcherServlet 的调度'),
        quiz: [
          {
            q: '@PathVariable 用于绑定什么？',
            options: ['请求体 JSON', 'URL 路径中的变量，如 /users/{id}', '请求头', 'Cookie'],
            answer: 1,
            explain: '@PathVariable 取路径变量；@RequestParam 取查询参数；@RequestBody 取请求体。'
          },
          {
            q: '前后端分离项目中，Controller 返回对象后由谁转成 JSON？',
            options: ['ViewResolver', 'HttpMessageConverter', 'DispatcherServlet 自己', 'Tomcat'],
            answer: 1,
            explain: '@RestController 下，返回值由 HttpMessageConverter（通常是 Jackson）序列化成 JSON 写入响应体。'
          }
        ]
      },

      {
        id: 'mybatis-jpa',
        title: 'MyBatis 与 JPA 数据访问',
        minutes: 8,
        level: '进阶',
        intro: 'Spring 里操作数据库有两大流派：MyBatis 手写 SQL、控制力强；JPA / Hibernate 用对象映射、少写 SQL。选哪个取决于团队和业务。',
        points: [
          { t: 'MyBatis', d: 'Mapper 接口 + XML / 注解写 SQL；结果自动映射到对象；动态 SQL（if / foreach）灵活，适合复杂查询和 SQL 优化。' },
          { t: 'JPA / Hibernate', d: '用 <code>@Entity</code> 映射表，<code>JpaRepository</code> 提供 CRUD；JPQL 面向对象查询；自动建表、级联、懒加载。' },
          { t: '对比', d: 'MyBatis 对 SQL 完全掌控、学习成本低；JPA 开发快、可移植，但复杂查询和性能调优更绕。国内业务系统 MyBatis 更常见。' },
          { t: '事务', d: 'Service 层加 <code>@Transactional</code>，默认遇到 RuntimeException 回滚；注意自调用失效、只对 public 方法生效。' }
        ],
        code: `// MyBatis
@Mapper
public interface UserMapper {
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(long id);
}

// JPA
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;
    private String name;
}

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);
}`,
        tip: '@Transactional 基于代理：同类内部方法直接调用不会开启新事务，这就是“事务失效”的常见原因。',
        demo: D([
          { id: 'mapper', label: 'Mapper 接口', sub: 'MyBatis', x: 6, y: 14, w: 22, h: 13, tone: 'teal', info: '只声明方法，SQL 写在注解或 XML 里；运行时由 MyBatis 生成代理实现。' },
          { id: 'sql', label: 'SQL / 动态 SQL', sub: '完全可控', x: 32, y: 14, w: 22, h: 13, tone: 'amber', info: '可以精确控制 JOIN、索引、分页；复杂报表查询更有优势。' },
          { id: 'jdbc', label: 'JDBC', sub: '底层执行', x: 58, y: 14, w: 18, h: 13, tone: 'violet', info: 'MyBatis 内部仍走 JDBC，连接来自连接池。' },
          { id: 'entity', label: '@Entity', sub: 'JPA 实体', x: 6, y: 60, w: 22, h: 13, tone: 'blue', info: '一个类映射一张表，字段映射列；由 Hibernate 管理持久化状态。' },
          { id: 'repo', label: 'JpaRepository', sub: 'CRUD + 派生查询', x: 32, y: 60, w: 22, h: 13, tone: 'teal', info: 'findByName 这类方法名会自动生成查询；复杂查询用 @Query 写 JPQL。' },
          { id: 'tx', label: '@Transactional', sub: 'Service 层事务', x: 58, y: 60, w: 20, h: 13, tone: 'rose', info: '通过 AOP 代理开启/提交/回滚事务；同类自调用不经过代理会失效。' }
        ], [
          { from: 'mapper', to: 'sql', label: '绑定' },
          { from: 'sql', to: 'jdbc', label: '执行' },
          { from: 'entity', to: 'repo', label: '映射' },
          { from: 'repo', to: 'jdbc', label: '持久化', dashed: true },
          { from: 'tx', to: 'repo', label: '包裹', dashed: true }
        ], '上排 MyBatis，下排 JPA；两条路最终都落到 JDBC。', '两种数据访问方式'),
        quiz: [
          {
            q: '需要写复杂报表 SQL、精确控制执行计划，通常更适合？',
            options: ['JPA 派生查询', 'MyBatis', 'Hibernate 自动建表', 'JdbcTemplate 都不用'],
            answer: 1,
            explain: 'MyBatis 直接写 SQL，JOIN、子查询、索引提示都能精确控制；JPA 的复杂查询往往要退回原生 SQL。'
          },
          {
            q: '为什么同类内部调用 @Transactional 方法可能不生效？',
            options: ['注解没加 @Retention', '自调用不经过 Spring 代理', '方法必须是 static', '事务只支持 MyBatis'],
            answer: 1,
            explain: 'Spring 事务基于代理对象，外部调用才经过代理；this.method() 绕过了代理，事务增强不会执行。'
          }
        ]
      },

      {
        id: 'deploy',
        title: '日志、打包与部署',
        minutes: 7,
        level: '进阶',
        intro: '代码写完只是开始：日志让你能排查线上问题，打包把应用变成可交付物，容器化让部署环境一致。这是一名 Java 开发者要走的最后一段路。',
        points: [
          { t: '日志门面', d: 'SLF4J 是门面，Logback / Log4j2 是实现。用 <code>LoggerFactory.getLogger(X.class)</code>，不要用 System.out。' },
          { t: '日志级别', d: 'ERROR 需要人处理；WARN 可能有问题；INFO 关键流程；DEBUG 调试细节。生产默认 INFO，避免日志刷屏。' },
          { t: '打包', d: 'Spring Boot 用 spring-boot-maven-plugin 打成可执行 fat jar：<code>java -jar app.jar</code> 即可运行，内嵌 Tomcat。' },
          { t: '容器化', d: 'Dockerfile 基于 eclipse-temurin 镜像，COPY jar 后 ENTRYPOINT 启动；环境变量注入配置，容器编排用 K8s。' }
        ],
        code: `@RestController
public class HelloController {
    private static final Logger log =
            LoggerFactory.getLogger(HelloController.class);

    @GetMapping("/hello")
    public String hello() {
        log.info("收到请求");          // 不要用 System.out
        return "hello";
    }
}

// 打包与运行
// mvn clean package
// java -jar target/app.jar --spring.profiles.active=prod`,
        tip: '日志里不要打印密码、身份证、完整卡号；生产日志按天滚动并保留有限天数。',
        demo: D([
          { id: 'code', label: '业务代码', sub: 'Controller / Service', x: 4, y: 12, w: 18, h: 12, tone: 'teal', info: '通过 SLF4J 打印日志，运行时绑定具体实现。' },
          { id: 'log', label: 'Logback', sub: '级别 / 格式 / 文件', x: 26, y: 12, w: 18, h: 12, tone: 'amber', info: '决定日志输出到控制台还是文件、按天滚动、保留多少天。' },
          { id: 'jar', label: '可执行 jar', sub: '内嵌 Tomcat', x: 48, y: 12, w: 18, h: 12, tone: 'violet', info: 'Spring Boot fat jar 包含依赖和容器，java -jar 即可启动。' },
          { id: 'docker', label: 'Docker 镜像', sub: '环境一致', x: 70, y: 12, w: 18, h: 12, tone: 'blue', info: '把 JDK + jar 打进镜像，开发/测试/生产使用同一份产物。' },
          { id: 'server', label: '服务器 / K8s', sub: '运行与扩缩容', x: 70, y: 56, w: 18, h: 12, tone: 'rose', info: '容器编排负责健康检查、滚动发布、扩缩容。' },
          { id: 'monitor', label: '监控与日志平台', sub: 'ELK / Prometheus', x: 26, y: 56, w: 20, h: 12, tone: 'teal', info: '集中收集日志和指标，出问题时能快速定位。' }
        ], [
          { from: 'code', to: 'log', label: '记录' },
          { from: 'log', to: 'monitor', label: '采集', dashed: true },
          { from: 'code', to: 'jar', label: '打包' },
          { from: 'jar', to: 'docker', label: '构建' },
          { from: 'docker', to: 'server', label: '部署' },
          { from: 'server', to: 'monitor', label: '指标', dashed: true }
        ], '点击节点：从一行日志到一次可回滚的发布。', '从代码到线上'),
        quiz: [
          {
            q: 'Java 项目里推荐使用哪种日志方式？',
            options: ['System.out.println', 'e.printStackTrace()', 'SLF4J + Logback', '把日志写进数据库'],
            answer: 2,
            explain: 'SLF4J 是门面，底层可替换实现；相比 System.out，它有级别、格式、异步、滚动等能力。'
          },
          {
            q: 'Spring Boot 默认可执行 jar 的特点是？',
            options: ['必须放到 Tomcat 里运行', '内嵌容器，java -jar 即可启动', '只能包含源码', '不支持配置文件'],
            answer: 1,
            explain: 'Spring Boot fat jar 包含应用、依赖和内嵌 Tomcat，直接 java -jar 启动，不需要外置容器。'
          }
        ]
      }
    ]
  });
})();
