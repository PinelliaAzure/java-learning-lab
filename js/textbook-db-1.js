/* 教材正文：设计模式与工程实践（单例/工厂/建造者 · 策略/观察者/代理 · 数据库 · Web · 构建） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['patterns-creational'] = {
    meta: '本章约 8200 字 · 建议 35 分钟 · 单例、工厂、建造者 + 8 段示例',
    blocks: [
      { h: '1.1 为什么学创建型模式' },
      { p: '写第一个项目时，创建对象是一件很直接的事：需要用户就 <code>new User()</code>，需要订单就 <code>new Order()</code>。可当项目长到几千行，你会发现有些对象的创建并不简单：数据库连接池只能有一份，多一份就会把连接数翻倍；支付渠道要按用户的选择动态切换，如果每个调用点都写一遍 if-else，新增一种支付方式就要改十几处；一个订单对象有十几个字段，其中一半是可选的，构造器参数多到调用时只能靠数位置。' },
      { p: '创建型模式（Creational Patterns）处理的就是“对象怎么造出来”这件事。它们不改变对象本身的功能，而是把“用哪个类、按什么顺序、传哪些参数、造几个”这些决策从调用方手里拿走，集中到一处。这样做的直接收益是：调用方只依赖抽象，不依赖具体类；创建逻辑只有一份，改的时候只改一处；对象的合法性可以在创建时一次性校验完，而不是靠每个使用者自觉。' },
      { p: '本章讲三个最常用的创建型模式：单例解决“只能有一个”，工厂解决“用哪个实现”，建造者解决“参数太多怎么传”。它们也是阅读框架源码时出现频率最高的三个词，先掌握它们，后面看 Spring 的 BeanFactory、Lombok 的 @Builder 才不会一头雾水。' },
      { note: '<b>先记住一句话：</b>模式是给常见问题起的名字，不是必须套用的模板。代码里没有出现 <code>Singleton</code> 这个词，不代表你没有用单例思想。' },

      { h: '1.2 单例：一个类只造一个对象' },
      { p: '单例（Singleton）要保证一个类在运行期间只有一个实例，并提供一个全局访问点。典型场景包括：配置中心、日志对象、线程池、数据库连接池、缓存管理器，以及 Spring 中默认作用域为 singleton 的 Bean。这些对象的共同特点是“有状态且状态要共享”，或者“创建成本高，重复创建会浪费资源”。' },
      { p: '实现单例有三个固定动作，缺一不可：第一，把构造器声明为 <code>private</code>，让外部无法直接 new；第二，在类内部用一个静态字段保存唯一实例；第三，提供一个静态方法把这个实例交出去。下面是最短可以工作的版本，通常叫“饿汉式”：' },
      { lang: 'java', code: 'public class AppConfig {\n    // 类加载时就创建，JVM 保证只执行一次\n    private static final AppConfig INSTANCE = new AppConfig();\n\n    private AppConfig() {\n        // 私有构造器，外部无法 new\n    }\n\n    public static AppConfig getInstance() {\n        return INSTANCE;\n    }\n\n    public String get(String key) {\n        return System.getProperty(key);\n    }\n}', title: 'AppConfig.java' },
      { p: '调用方只能写 <code>AppConfig.getInstance()</code>，写 <code>new AppConfig()</code> 会直接编译失败。这里没有加锁，也没有任何判断，因为静态字段的初始化发生在类加载的初始化阶段，而 JVM 会保证一个类的初始化方法在多线程下只被执行一次，天然线程安全。' },

      { h: '1.3 饿汉式与懒汉式：从简单到并发' },
      { p: '饿汉式的“饿”，指的是它很着急：类一被加载就把对象造好，不管后面用不用。优点是实现极简、没有并发问题、获取实例的速度也最快，因为只是读一个静态字段。绝大多数场景下这就够了，尤其是配置类、常量表这类“程序启动就一定要用”的对象。' },
      { p: '它的代价有两个。第一，如果构造过程很重（比如要读大文件、建连接池），而程序这次运行根本没用到它，就白花了一次启动时间。第二，构造器里不能抛受检异常，也不能依赖运行期才知道的参数；一旦构造失败，类初始化失败，后续访问会抛 <code>NoClassDefFoundError</code>，排查起来比较绕。' },
      { note: '<b>选择建议：</b>实例创建便宜、一定会用到，用饿汉式；创建昂贵且可能用不到，才考虑懒加载。不要一上来就写双重检查锁，多数业务代码根本不需要。' },
      { p: '懒汉式（Lazy）把创建推迟到第一次调用。思路是：静态字段先不赋值，<code>getInstance()</code> 里判断是否为空，为空才 new。先看单线程下完全正确的写法：' },
      { lang: 'java', code: 'public class LazyConfig {\n    private static LazyConfig instance;\n\n    private LazyConfig() {}\n\n    public static LazyConfig getInstance() {\n        if (instance == null) {          // 线程 A 和 B 可能同时进来\n            instance = new LazyConfig();\n        }\n        return instance;\n    }\n}', title: 'LazyConfig.java' },
      { p: '问题出在并发。假设线程 A 和线程 B 同时执行到 <code>if (instance == null)</code>，此时字段都还是 null，两个线程都判断成立，于是各自执行一次 new。结果堆上出现两个对象，一个被 A 返回，一个被 B 返回，之后谁覆盖谁还取决于调度顺序。单例的前提被打破，而这种 bug 在测试环境几乎不会出现，只会在压测或生产环境偶发。' },
      { p: '最直接的修复是给整个方法加 <code>synchronized</code>，也就是把签名改成 <code>public static synchronized LazyConfig getInstance()</code>。这样确实安全了，因为同一时刻只有一个线程能进入方法。但代价是每次获取实例都要抢锁，哪怕实例早就创建好了。对于一个会被高频调用的全局对象，这把锁会变成不必要的串行点。于是就出现了“双重检查锁”：先不加锁判断一次，只有为空时才进同步块，进去后再判断一次。' },
      { table: { head: ['实现方式', '线程安全', '延迟加载', '主要问题'], rows: [
        ['饿汉式', '安全（类初始化保证）', '否', '可能白创建；构造失败难排查'],
        ['懒汉式（无锁）', '不安全', '是', '并发下可能创建多个实例'],
        ['同步方法懒汉', '安全', '是', '每次调用都加锁，性能差'],
        ['双重检查锁', '安全（需 volatile）', '是', '写法复杂，容易漏掉 volatile'],
        ['枚举单例', '安全', '否', '不能继承类，写法略陌生']
      ] } },

      { h: '1.4 双重检查锁与 volatile' },
      { p: '双重检查锁（Double-Checked Locking，简称 DCL）的代码如下。注意两个细节：第一，静态字段必须加 <code>volatile</code>；第二，同步块内部要再判断一次 null。少任何一个，这个写法都不成立。' },
      { lang: 'java', code: 'public class DclConfig {\n    private static volatile DclConfig instance;\n\n    private DclConfig() {}\n\n    public static DclConfig getInstance() {\n        if (instance == null) {                 // 第一次检查：避免每次都加锁\n            synchronized (DclConfig.class) {\n                if (instance == null) {         // 第二次检查：防止重复创建\n                    instance = new DclConfig();\n                }\n            }\n        }\n        return instance;\n    }\n}', title: 'DclConfig.java' },
      { p: '为什么需要 volatile？<code>new DclConfig()</code> 在字节码层面大致分三步：一，在堆上分配内存；二，调用构造器，把字段初始化成默认值或指定值；三，把这块内存的地址赋给静态字段 instance。编译器和 CPU 为了性能，可能把第二步和第三步重排成“先赋地址，再初始化”。' },
      { p: '一旦发生重排，另一个线程在第一次检查时就会看到 instance 已经非 null，于是直接返回这个对象。但它拿到的可能是一个“半成品”：内存分配好了，引用也赋了，构造器里的字段还没写完。这种错误极其隐蔽，可能表现为某个字段莫名是 0 或 null。加上 volatile 之后，写操作之前的指令不会被重排到写之后，同时保证一个线程的修改对另一个线程立即可见，问题才被真正堵住。' },
      { flow: ['调用 getInstance', '第一次判空', '为空则加锁', '锁内再判空', 'new 并赋值', '返回唯一实例'] },
      { p: '需要提醒的是，DCL 在今天更多是“理解并发”的经典案例。实际项目中，如果你只是要一个延迟加载的单例，用“静态内部类持有”更简单：外部类加载时不会初始化内部类，第一次调用 <code>getInstance()</code> 才触发内部类初始化，同样由 JVM 保证线程安全，而且不需要 volatile 和 synchronized。' },

      { h: '1.5 枚举单例与被破坏的单例' },
      { p: '《Effective Java》推荐的最简写法是枚举。枚举的每个常量在 JVM 中都是唯一实例，创建发生在类初始化阶段，天然线程安全；写法短到几乎不可能写错：' },
      { lang: 'java', code: 'public enum ConfigHolder {\n    INSTANCE;\n\n    private final Properties props = load();\n\n    private static Properties load() {\n        Properties p = new Properties();\n        try (InputStream in = ConfigHolder.class.getResourceAsStream("/app.properties")) {\n            if (in != null) p.load(in);\n        } catch (IOException e) {\n            throw new IllegalStateException("配置加载失败", e);\n        }\n        return p;\n    }\n\n    public String get(String key) {\n        return props.getProperty(key);\n    }\n}', title: 'ConfigHolder.java' },
      { p: '枚举单例还有一个容易被忽略的优势：它能防住反射和序列化。普通单例即使把构造器设为 private，别人仍可以用 <code>Constructor.setAccessible(true)</code> 强行调用；而 JDK 明确规定，对枚举类型调用 <code>newInstance</code> 会抛 <code>IllegalArgumentException</code>。序列化方面，普通单例反序列化会生成新对象，除非你写 <code>readResolve()</code>；枚举则按名字查找，反序列化后还是同一个常量。' },
      { p: '除了反射和序列化，单例还可能被两件事破坏：一是类加载器，同一个类被两个不同的 ClassLoader 各加载一次，就会有两份静态字段，也就是两个“单例”；二是克隆，如果单例类实现了 Cloneable 且没禁用 clone，复制出来的对象也是新实例。' },
      { list: [
        '<b>反射攻击：</b>用 setAccessible 调私有构造器；防御办法是在构造器里判断实例是否已存在，存在就抛异常。',
        '<b>序列化破坏：</b>反序列化会绕过构造器创建新对象；防御办法是加 <code>readResolve()</code> 返回既有实例。',
        '<b>多个类加载器：</b>每个加载器各有一份静态变量；分布式或插件化系统里要特别注意。',
        '<b>克隆：</b>实现 Cloneable 后 clone 会复制对象；单例类应避免实现它，或让 clone 直接抛异常。'
      ] },
      { note: '<b>结论：</b>单例的作用域是“一个类加载器”，不是“整个 JVM”，更不是“整个集群”。多实例部署时，每个进程各有一个单例，需要共享状态请用 Redis、数据库等外部存储。' },

      { h: '1.6 工厂：把 new 藏起来' },
      { p: '工厂模式要解决的是“创建哪个实现”的问题。假设系统要支持支付宝、微信、银联三种支付，最直觉的写法是在下单方法里写 if-else，按渠道 new 不同的类。这样写有三个问题：调用方必须知道所有实现类，依赖面很宽；新增渠道要改调用方代码，违反开闭原则；每个渠道的初始化步骤（读密钥、建客户端）散落在多处，容易漏。' },
      { p: '简单工厂的做法是：把“根据类型创建对象”集中到一个工厂类里，调用方只传类型、拿接口。' },
      { lang: 'java', code: 'public interface PayChannel {\n    void pay(long amountCents);\n}\n\npublic class AliPay implements PayChannel {\n    public void pay(long amountCents) {\n        System.out.println("支付宝支付 " + amountCents + " 分");\n    }\n}\n\npublic class WechatPay implements PayChannel {\n    public void pay(long amountCents) {\n        System.out.println("微信支付 " + amountCents + " 分");\n    }\n}\n\npublic class PayChannelFactory {\n    public static PayChannel create(String type) {\n        switch (type) {\n            case "ali":    return new AliPay();\n            case "wechat": return new WechatPay();\n            default: throw new IllegalArgumentException("不支持的支付渠道: " + type);\n        }\n    }\n}', title: 'SimpleFactory.java' },
      { p: '调用方现在只依赖 <code>PayChannel</code> 接口和工厂，不再 import 具体实现。工厂里集中处理参数校验、默认值、初始化，改起来只有一处。简单工厂的缺点也很明显：它自己成了新的变化点，每加一个渠道都要改 <code>create</code> 方法里的 switch，严格来说仍不满足开闭原则。' },

      { h: '1.7 工厂方法与抽象工厂' },
      { p: '工厂方法（Factory Method）把“创建”下放到子类：抽象工厂只声明 <code>create()</code>，每个具体工厂负责造一种产品。这样新增产品时，只需要新增一个产品类和一个工厂类，已有代码一行不改。' },
      { lang: 'java', code: 'public abstract class PayChannelFactory {\n    public abstract PayChannel create();\n\n    // 模板方法：创建之后的通用流程写在这里\n    public void payWithLog(long amountCents) {\n        PayChannel channel = create();\n        System.out.println("开始支付, 金额=" + amountCents);\n        channel.pay(amountCents);\n    }\n}\n\npublic class AliPayFactory extends PayChannelFactory {\n    public PayChannel create() { return new AliPay(); }\n}\n\npublic class WechatPayFactory extends PayChannelFactory {\n    public PayChannel create() { return new WechatPay(); }\n}\n\n// 使用\nPayChannelFactory f = new AliPayFactory();\nf.payWithLog(1990);', title: 'FactoryMethod.java' },
      { p: '抽象工厂（Abstract Factory）再往上走一层，解决的是“产品族”问题：同一个主题下有一组相互关联的产品，比如一套 UI 组件里的按钮、输入框、下拉框，必须保证风格一致。抽象工厂声明一组创建方法，具体工厂负责造一整套。它在 JDK 里的典型例子是 <code>java.sql.Connection</code> 和配套的 Statement、ResultSet，不同数据库驱动提供各自的实现。' },
      { p: '三种工厂的取舍可以这样理解：产品少、变化不频繁，简单工厂足够；产品会持续增加，用工厂方法；需要保证一组产品配套使用，才需要抽象工厂。抽象工厂的代价是接口臃肿，新增一种产品要改所有工厂类。' },
      { table: { head: ['形式', '解决什么', '新增产品要改哪里', '典型场景'], rows: [
        ['简单工厂', '把创建逻辑集中到一处', '改工厂里的 switch', '渠道少、内部工具类'],
        ['工厂方法', '新增产品不改已有代码', '新增产品类 + 工厂类', '插件、解析器、策略族'],
        ['抽象工厂', '保证一组产品风格配套', '改抽象接口 + 全部实现', '跨平台 UI、数据库驱动']
      ] } },

      { h: '1.8 建造者：参数很多时怎么办' },
      { p: '当一个类有十几个字段，其中大部分可选，构造器就会变灾难。常见做法是写多个重载构造器，参数从少到多，这叫“重叠构造器”。它的问题是可读性极差：调用处 <code>new Order("张三", 100, true, false, null, 3)</code>，没人知道第三个参数是“是否加急”还是“是否开票”，而且顺序写错编译器也发现不了。' },
      { p: '建造者（Builder）把“设置参数”拆成一个个具名方法，最后统一 build。它有四个要点：Builder 的构造器接收必填参数；可选参数用链式方法设置，每个方法返回 this；<code>build()</code> 里做合法性校验并一次性创建目标对象；目标对象字段设为 final，创建后不可变。' },
      { lang: 'java', code: 'public final class HttpRequest {\n    private final String url;\n    private final String method;\n    private final Map<String, String> headers;\n    private final int timeoutMs;\n\n    private HttpRequest(Builder b) {\n        this.url = b.url;\n        this.method = b.method;\n        this.headers = Collections.unmodifiableMap(new HashMap<>(b.headers));\n        this.timeoutMs = b.timeoutMs;\n    }\n\n    public static class Builder {\n        private final String url;              // 必填\n        private String method = "GET";\n        private final Map<String, String> headers = new HashMap<>();\n        private int timeoutMs = 3000;\n\n        public Builder(String url) {\n            if (url == null || url.isEmpty()) {\n                throw new IllegalArgumentException("url 不能为空");\n            }\n            this.url = url;\n        }\n\n        public Builder method(String method) {\n            this.method = method;\n            return this;\n        }\n\n        public Builder header(String name, String value) {\n            this.headers.put(name, value);\n            return this;\n        }\n\n        public Builder timeout(int timeoutMs) {\n            if (timeoutMs <= 0) throw new IllegalArgumentException("超时必须大于 0");\n            this.timeoutMs = timeoutMs;\n            return this;\n        }\n\n        public HttpRequest build() {\n            return new HttpRequest(this);\n        }\n    }\n}', title: 'HttpRequest.java' },
      { lang: 'java', code: 'HttpRequest req = new HttpRequest.Builder("https://example.com/api/orders")\n        .method("POST")\n        .header("Content-Type", "application/json")\n        .timeout(5000)\n        .build();', title: '使用建造者' },
      { flow: ['new Builder(必填项)', '链式设置可选项', 'build() 校验', '一次性创建不可变对象'] },
      { p: '建造者把“参数名”搬到了调用处，读代码时不需要来回翻构造器定义。它还有一个额外好处：可以先校验再创建，避免对象出现“创建成功但状态非法”的中间态。需要注意的是，Builder 本身是可变对象，不要在多线程间共享同一个 Builder；另外字段多但都必填时，直接用构造器反而更清楚，不必硬套。' },
      { note: '<b>Lombok 的 @Builder 就是这套东西的代码生成版。</b>理解手写版本后，你就知道它生成的 build() 里为什么会有必填字段校验，也能看懂 @Builder.Default 的作用。' },

      { h: '1.9 原型模式：复制一份现成的对象' },
      { p: '有些对象的成本不在构造器里，而在“造出来之前”：要查三张表拼一份报表配置，要解析几百 KB 的 JSON 模板，要调一次远程接口拿基础数据。这类对象如果每次使用都重新造，接口会慢到无法接受。原型模式（Prototype）的思路是：先造一个样板，之后需要新对象时复制样板，而不是重走一遍昂贵的创建流程。' },
      { p: 'Java 提供的复制入口是 <code>Object.clone()</code>，它按字段逐个复制：基本类型直接拷值，引用类型只拷地址，这叫浅拷贝。错误写法很典型：订单模板里有一个 <code>List&lt;Item&gt;</code> 字段，clone 之后两个订单指向同一个 List，改 A 的商品，B 也跟着变，而且这种 bug 往往在“复制完改了其中一个”时才暴露。<b>修正</b>有两条路：在 clone 里手动 new 一个集合并逐个复制元素，做成深拷贝；或者干脆放弃 clone，改用拷贝构造器 <code>public Order(Order other)</code> 显式复制每个字段。后者更推荐，因为 clone 的语义隐晦，还必须实现 <code>Cloneable</code>、处理受检异常，稍不留神就漏字段。' },
      { p: '原型适合“结构稳定、创建昂贵、需要大量相似实例”的场景，比如游戏里成批生成的敌人、报表模板、缓存里的基准配置；不适合字段里有不可复制资源的对象，例如数据库连接、文件句柄、线程。复制出来的对象会和原件抢同一个资源，用起来必然出问题。动手前先问一句：这个对象里有没有“不该被共享”的东西。' },

      { h: '1.10 三种模式怎么选：数量、类型、参数' },
      { p: '这三个模式经常被混用，判断标准其实很朴素：看你要控制的是“数量”“类型”还是“参数”。控制数量用单例，控制类型用工厂，控制参数用建造者。如果一个问题同时涉及多者，可以组合使用，比如工厂返回的对象内部用建造者创建。' },
      { table: { head: ['你的痛点', '首选模式', '不用的后果'], rows: [
        ['全局只能有一份，重复创建会浪费或出错', '单例', '资源翻倍、状态不一致'],
        ['要根据条件创建不同实现，且实现会不断增加', '工厂', 'if-else 扩散，改一处牵动全身'],
        ['字段多、可选参数多、构造器难读', '建造者', '参数顺序错、对象状态非法'],
        ['对象创建步骤固定但组合多变', '建造者 + 工厂', '创建逻辑散落，难复用']
      ] } },
      { list: [
        '先看有没有“唯一性”需求，再考虑单例；不要把它当成全局变量的方便入口。',
        '工厂的返回值应该是接口或抽象类，返回具体类等于没封装。',
        '建造者适合“可选参数多”，如果字段全是必填，普通构造器更直接。',
        '三种模式都不改变业务逻辑，只调整创建方式；如果为了套模式而增加一层，就是过度设计。'
      ] },

      { h: '1.11 常见坑与错误写法' },
      { p: '第一种错误是拿实例字段当锁。有人写 <code>synchronized (instance)</code>，想锁住创建过程，可第一次进入时 instance 还是 null，同步块直接抛 <code>NullPointerException</code>。锁对象必须是独立且不变的东西，<b>修正</b>是 <code>synchronized (DclConfig.class)</code>，或者声明一个 <code>private static final Object LOCK = new Object()</code> 专门用来加锁。' },
      { p: '第二种错误是把单例当缓存。在单例里放一个 <code>HashMap</code> 存“用户 ID 到用户对象”的映射，看似省事，实际上这个 Map 被所有线程共享，又没有淘汰策略，跑几天就内存溢出；更糟的是多线程同时写 HashMap，扩容时可能让链表成环，CPU 直接打满。<b>修正</b>是：请求级数据放方法局部变量，需要跨请求缓存就换成带容量上限与过期策略的缓存组件，容器至少用 <code>ConcurrentHashMap</code>。' },
      { p: '第三种错误是初始化顺序。静态字段按书写顺序赋值，如果唯一实例声明在它依赖的配置字段之前，构造器里读到的就是 null，表现为“启动就空指针，但字段明明写了值”。<b>修正</b>是把被依赖的字段声明在实例之前，或改用静态块按顺序初始化；更稳的是用静态内部类，把创建推迟到第一次调用，顺序问题自然消失。' },
      { p: '第四种错误是测试污染。单例的静态状态会在同一个 JVM 的所有测试用例之间残留，前一个用例改了配置，后一个用例莫名其妙失败，单独跑又都是绿的。<b>修正</b>是让单例只保存不可变配置，可变状态通过方法参数传入；确实需要重置时，提供一个包级可见的 reset 方法，并在测试的清理阶段调用。' },
      { p: '工厂的错误写法常见两种。第一种是把“类型判断”留在调用方：<code>if (type.equals("ali")) channel = new AliPay();</code>，工厂只是把 new 包了一层，调用方依旧 import 了所有实现类，新增渠道仍要改调用方。修正：调用方只传枚举或类型字符串，判断全部收进工厂，返回类型声明成接口。第二种是工厂类爆炸：每个产品都配一个只含一行 create 的工厂类，包里塞了几十个这样的类。修正：产品族稳定时退回简单工厂，用 Map 保存“类型到创建函数”的映射，新增产品只加一行注册。' },
      { p: '建造者的错误写法是“伪建造者”：每个设置方法返回 void，无法链式调用；或者 build() 只是把字段原样拷过去、不做任何校验，于是对象能以非法状态被创建出来，问题要到业务深处才炸。修正：链式方法一律返回 this，build() 里集中校验必填项与取值范围，私有构造器再兜一层，目标对象字段全部 final，创建完就不可变。' },
      { list: [
        '<b>单例构造器忘了私有：</b>外部照样能 new，单例形同虚设；用 IDE 的“查找用法”确认没有 new 调用。',
        '<b>DCL 漏写 volatile：</b>压测时才偶发拿到半初始化对象；代码评审时把 volatile 当成硬性检查项。',
        '<b>在单例里存请求数据：</b>单例被所有线程共享，用户 A 的数据会串到用户 B；请求级数据放方法局部变量。',
        '<b>工厂返回具体类型：</b>调用方仍能调用实现类特有方法，抽象就白做了；返回类型必须是接口。',
        '<b>Builder 忘记校验：</b>build 出来才在业务里空指针；把校验前移到 build()，并在构造器里再兜一层。',
        '<b>把简单工厂写成巨型 switch：</b>几十个分支说明该用注册表或工厂方法了；可以用 Map 存“类型 → 创建函数”。'
      ] },

      { h: '1.12 本章小结' },
      { list: [
        '创建型模式只负责“怎么造对象”，不改变对象的行为。',
        '单例三要素：私有构造器、静态实例、静态获取方法；饿汉最简单，DCL 必须配 volatile。',
        '枚举单例天然防反射与序列化，是《Effective Java》推荐写法。',
        '工厂把创建逻辑集中，返回接口而非实现；工厂方法新增产品不改旧代码。',
        '建造者用链式调用解决多参数问题，build() 里做校验并产出不可变对象。'
      ] },

      { h: '1.13 常见追问' },
      { list: [
        '<b>问：单例和静态类有什么区别？</b><br>答：静态类不能实现接口、不能被注入替换，也没法延迟初始化，所有状态都得挂在静态字段上，测试时无法换成假实现；单例是对象，能实现接口、能传参、能被容器管理或被 mock，需要面向接口、需要多态的地方只有它可用。反过来说，纯粹的工具方法用静态类更直接，因为根本没有状态需要维护。判断标准就两条：有没有状态、要不要在测试里替换实现。',
        '<b>问：Spring 的 singleton Bean 是单例模式吗？</b><br>答：是「容器内单例」，不是类意义上的单例：每个容器的每个 Bean 名只有一个实例，作用域限定在容器生命周期里；类本身没有私有构造器，你仍然可以自己 new 出第二个对象，容器也管不住。所以别把业务状态放进 Bean 的实例字段，那等于整个应用共享一份；多实例部署时更是每个进程各有一份。真要全局唯一，得靠数据库唯一约束或分布式锁。',
        '<b>问：为什么不用 synchronized 修饰整个方法？</b><br>答：能用，正确性上没有问题，代价是每次读取都要抢锁，哪怕对象早就创建好了。双重检查锁的价值就在于把加锁挪进「实例为空」这一个分支，创建完成之后走无锁快路径，它属于性能优化，不是正确性的必需。既然只是优化，就不要为了它牺牲可读性：不确定的话，饿汉式或枚举单例更简单，也天然线程安全。',
        '<b>问：工厂和策略有什么区别？</b><br>答：工厂关注「怎么造出来」，策略关注「用哪个算法」。工厂的入参通常是类型标识或配置，出参是对象；策略的入参是业务数据，出参是计算结果。实际项目里两者经常一起出现：策略接口定义能力，工厂或 Map 注册表按类型挑一个策略实例返回。分清的好处是职责不混——工厂里不该出现业务计算，策略里也不该出现对象组装。',
        '<b>问：建造者一定要静态内部类吗？</b><br>答：不一定。独立的 Builder 类、甚至外部工具类都能实现同样的链式调用；静态内部类的优势是能访问外部类的私有构造器，把「只能通过 Builder 创建」这件事强制住，封装更彻底，也不必在包里多暴露一个类。字段很多、必填项和可选项混在一起时，Builder 比一串重载构造器好读得多，代价是多写几十行样板代码。',
        '<b>问：这些模式在真实项目里用得多吗？</b><br>答：单例和建造者非常常见：前者的现代形态是容器管理的无状态 Bean，后者出现在任何参数超过四五个的配置类上。工厂更多以「注册表 + 反射」或依赖注入容器的形式出现，思想一致但名字消失了。原型模式在日常业务里少见，主要用在复制成本高的场景。学模式的价值在于认出用法，而不是在代码里凑齐那些名字。'
      ] },

      { h: '1.14 自测与练习' },
      { p: '先自己动手做一遍，再展开参考答案对照预期现象与判断依据。' },
      { ol: [
        '手写一个饿汉式单例和一个枚举单例，比较两者的代码量和线程安全性。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">final class Hungry {\n  private static final Hungry INSTANCE = new Hungry();\n\n  private Hungry() {}\n\n  static Hungry getInstance() {\n    return INSTANCE;\n  }\n}\n\nenum EnumSingleton {\n  INSTANCE;\n\n  int next() {\n    return 1;\n  }\n}\n\n// 两者都只有一个实例\nSystem.out.println(Hungry.getInstance()\n    == Hungry.getInstance());          // true\nSystem.out.println(EnumSingleton.INSTANCE\n    == EnumSingleton.INSTANCE);        // true</pre><b>要点</b>：饿汉的线程安全由类初始化保证（JVM 只执行一次 <code>&lt;clinit&gt;</code>），代价是启动即创建、用不上也占内存；枚举实例同样由 JVM 在类初始化时创建，天然单例、自带序列化保护，反射和反序列化都破不开，同样不能延迟加载。</div></details>',
        '把本章的 DCL 代码去掉 volatile，说明在什么情况下会出错，出错的现象是什么。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">final class Singleton {\n  private static Singleton instance;   // 缺 volatile\n\n  static Singleton getInstance() {\n    if (instance == null) {\n      synchronized (Singleton.class) {\n        if (instance == null) {\n          instance = new Singleton();\n        }\n      }\n    }\n    return instance;\n  }\n\n  private Singleton() {}\n}</pre><b>要点</b>：<code>instance = new Singleton()</code> 分三步：分配内存、初始化字段、写引用；没有 volatile 时后两步可能被重排，另一个线程看到引用非空就直接返回，拿到字段还是 0 / null 的半成品。单线程下这个窗口几乎不存在，只能靠压测和理论分析。</div></details>',
        '为支付场景写一个简单工厂，再改写成工厂方法，统计新增一种渠道分别要改几个文件。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">interface PayChannel {\n  void pay(long cents);\n}\n\n// 简单工厂：新增渠道必须改这个 switch\nfinal class PayFactory {\n  static PayChannel create(String type) {\n    return switch (type) {\n      case "alipay" -> new Alipay();\n      case "wxpay" -> new Wxpay();\n      default -> throw new IllegalArgumentException(type);\n    };\n  }\n}\n\n// 工厂方法：新增渠道只加一个类\ninterface PayChannelFactory {\n  PayChannel create();\n}\n\nfinal class AlipayFactory implements PayChannelFactory {\n  public PayChannel create() {\n    return new Alipay();\n  }\n}\n\nfinal class WxpayFactory implements PayChannelFactory {\n  public PayChannel create() {\n    return new Wxpay();\n  }\n}</pre><b>要点</b>：简单工厂新增一种渠道要改 1 个已有文件、并重跑全部渠道的测试；工厂方法新增 1 个新文件加 1 处登记，已有实现类一行不动。</div></details>',
        '给一个含 8 个字段（3 个必填、5 个可选）的类写 Builder，并在 build() 中校验金额不能为负。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">final class Order {\n  private final long id;         // 必填\n  private final long amount;     // 必填\n  private final String coupon;   // 可选\n  private final String remark;   // 可选\n  // 其余 3 个可选字段同构，省略\n\n  private Order(Builder b) {\n    this.id = b.id;\n    this.amount = b.amount;\n    this.coupon = b.coupon;\n    this.remark = b.remark;\n  }\n\n  static final class Builder {\n    private final long id;\n    private final long amount;\n    private String coupon = "";\n    private String remark = "";\n\n    Builder(long id, long amount) {\n      this.id = id;\n      this.amount = amount;\n    }\n\n    Builder coupon(String v) {\n      this.coupon = v;\n      return this;\n    }\n\n    Builder remark(String v) {\n      this.remark = v;\n      return this;\n    }\n\n    Order build() {\n      if (amount &lt; 0) {\n        throw new IllegalArgumentException("金额不能为负");\n      }\n      return new Order(this);\n    }\n  }\n}\n\nOrder o = new Order.Builder(1L, 9900)\n    .coupon("NEW20").build();</pre><b>要点</b>：必填放 Builder 构造器，漏填编译期就报错；可选字段给默认值，省掉后续到处判空；校验只写在 <code>build()</code> 里，因为那是对象真正成型的唯一时刻。</div></details>',
        '解释为什么单例在多实例部署时不再是「全局唯一」，以及如何用外部存储解决。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：本地只有一个实例时计数正常；部署两台机器后，同一个计数在两边各自累加，用户刷新时看到的数值来回跳。<b>为什么</b>：JVM 级单例的作用域只是一个进程，多实例、多容器、甚至热部署后的新旧类加载器都各有自己的一份，进程之间不共享内存。<b>要点</b>：把需要全局唯一的计数、锁、状态搬到外部——数据库唯一约束加乐观锁版本号、Redis 的 <code>INCR</code> 或分布式锁；本地单例只保留无状态工具或进程内缓存，并明确它的边界。</div></details>'
      ] }
    ]
  };

  T['patterns-behavioral'] = {
    meta: '本章约 7800 字 · 建议 35 分钟 · 策略、观察者、代理 + 6 段示例',
    blocks: [
      { h: '2.1 为什么学行为型模式' },
      { p: '如果说创建型模式关心“对象怎么造”，行为型模式关心的就是“对象之间怎么配合”。一个系统里，对象很少单独工作：下单要选一种优惠算法，订单状态变化要通知库存、积分、短信，方法调用前要记日志、开事务、做权限校验。这些协作如果全靠硬编码，代码会迅速缠成一团。' },
      { p: '本章讲三个最常用的行为型模式。策略（Strategy）把一组可替换的算法封装起来，让“用哪个”变成运行时决定；观察者（Observer）建立一对多的通知关系，让状态变化自动扩散；代理（Proxy）在不修改原类的前提下，给方法加上前后逻辑。这三个模式也是理解 Spring 的关键：依赖注入注入的常常是策略，事件机制是观察者，AOP 是代理。' },
      { p: '学习时请把注意力放在“变化点”上。设计模式的本质，是找到系统里会变化的部分，把它隔离出来，让不变的部分不受影响。策略隔离“算法”，观察者隔离“通知谁”，代理隔离“附加逻辑”。记住这个视角，比背 UML 图有用得多。' },
      { note: '<b>提醒：</b>模式是事后总结的产物。先写清楚能工作的代码，发现重复的变化点，再考虑引入模式；反过来先摆好模式框架再填逻辑，通常会把简单问题做复杂。' },

      { h: '2.2 策略：把算法变成可替换的零件' },
      { p: '先看一个真实感很强的需求：电商下单要计算优惠，普通用户打九折，VIP 打八折，新用户立减二十，大促期间还有满减。最初大家都会写成这样：<code>if (type.equals("vip")) { ... } else if (type.equals("new")) { ... }</code>。当优惠规则增加到十几种，这个方法的圈复杂度会高到没人敢改。' },
      { p: '策略模式把这个 if-else 拆开：定义一个统一接口，每种算法实现一个类，上下文持有一个策略引用，运行时把具体策略注入进来。调用方看到的只有 <code>discount(amount)</code> 这一个方法，不需要知道背后是哪套规则。' },
      { lang: 'java', code: 'public interface DiscountStrategy {\n    long discount(long amountCents);\n}\n\npublic class NormalDiscount implements DiscountStrategy {\n    public long discount(long amountCents) {\n        return amountCents * 90 / 100;      // 九折\n    }\n}\n\npublic class VipDiscount implements DiscountStrategy {\n    public long discount(long amountCents) {\n        return amountCents * 80 / 100;      // 八折\n    }\n}\n\npublic class NewUserDiscount implements DiscountStrategy {\n    public long discount(long amountCents) {\n        return Math.max(0, amountCents - 2000);   // 立减 20 元\n    }\n}\n\npublic class Checkout {\n    private DiscountStrategy strategy;\n\n    public void setStrategy(DiscountStrategy strategy) {\n        this.strategy = strategy;\n    }\n\n    public long pay(long amountCents) {\n        return strategy.discount(amountCents);\n    }\n}', title: 'DiscountStrategy.java' },
      { p: '注意 <code>Checkout</code> 只依赖接口，新增一种优惠只要写一个新实现类，付款流程一行不改。这就是“对扩展开放、对修改关闭”的具体样子。金额用“分”作为整数单位，避免 <code>double</code> 的精度误差，这是电商代码的基本功。' },

      { h: '2.3 从 if-else 到策略表' },
      { p: '策略模式的第一个问题随之而来：谁来选策略？如果客户端里还是一大串 if-else 决定 new 哪个实现，那只是把 if-else 从计算处挪到了选择处。更常见的做法是用一个 Map 注册表：启动时把“类型 → 策略对象”装进去，运行时按类型取。注册表可以用 <code>Map.of</code> 或 <code>computeIfAbsent</code> 维护，取不到就抛明确的业务异常。' },
      { lang: 'java', code: 'public class DiscountRegistry {\n    private final Map<String, DiscountStrategy> map = new HashMap<>();\n\n    public DiscountRegistry() {\n        map.put("normal", new NormalDiscount());\n        map.put("vip", new VipDiscount());\n        map.put("new", new NewUserDiscount());\n    }\n\n    public DiscountStrategy of(String type) {\n        DiscountStrategy s = map.get(type);\n        if (s == null) {\n            throw new IllegalArgumentException("未知优惠类型: " + type);\n        }\n        return s;\n    }\n}', title: 'DiscountRegistry.java' },
      { p: '在 Spring 项目里，这个注册表可以自动装配：把 <code>DiscountStrategy</code> 的所有实现注入成 <code>List&lt;DiscountStrategy&gt;</code> 或 <code>Map&lt;String, DiscountStrategy&gt;</code>，Map 的 key 默认是 Bean 名。这样新增实现类后不需要改注册表，容器会自动收集。代价是启动时多了一次扫描，好处是彻底消除了分支。' },
      { p: '再进一步，策略对象可以由配置驱动：数据库里存一张“优惠类型 → 实现类名”的表，启动时反射实例化。这样运营加一种活动，只需要配置一行数据，不用发版。代价是失去了编译期检查，类名写错要到运行时才暴露，所以必须配合启动自检或单测把所有配置项跑一遍。' },
      { p: '策略也有代价：类数量增加，每个策略都很小的时候会显得零碎；策略之间如果需要共享中间状态，接口会变得别扭。所以规则只有两三条、且短期不会增加时，老实写 if-else 反而更清晰。判断标准是“变化频率”和“规则数量”，不是“别人说要用模式”。' },
      { table: { head: ['维度', 'if-else 硬编码', '策略模式'], rows: [
        ['新增规则', '改原有方法，风险高', '新增一个类，不改旧代码'],
        ['可读性', '规则少时直观，多了难读', '每个类只含一条规则，易读'],
        ['可测试性', '要构造整个上下文', '每个策略可单独单元测试'],
        ['类数量', '少', '每种规则一个类']
      ] } },

      { h: '2.4 观察者：状态变化后通知谁' },
      { p: '订单支付成功后，系统要做一串事：扣库存、加积分、发短信、写审计日志。如果全写在支付方法里，支付服务就依赖了库存服务、积分服务、短信服务，任何一处改动都可能影响支付主流程。观察者模式把“通知”这件事抽出来：主题（Subject）只负责维护观察者列表，状态变化时逐个回调，具体谁关心、做什么，主题并不知情。' },
      { p: '观察者模式有两个角色：被观察的主题，和观察者接口。主题提供 <code>register</code>、<code>unregister</code>、<code>notifyAll</code> 三个动作；观察者只有一个 <code>update</code> 方法。主题内部通常用集合保存观察者，遍历时逐个调用。' },
      { lang: 'java', code: 'public interface OrderListener {\n    void onPaid(String orderNo, long amountCents);\n}\n\npublic class OrderSubject {\n    // 用写时复制集合，遍历时即使有人注册/注销也不会抛异常\n    private final List<OrderListener> listeners = new CopyOnWriteArrayList<>();\n\n    public void register(OrderListener l) {\n        listeners.add(l);\n    }\n\n    public void unregister(OrderListener l) {\n        listeners.remove(l);\n    }\n\n    public void paid(String orderNo, long amountCents) {\n        for (OrderListener l : listeners) {\n            try {\n                l.onPaid(orderNo, amountCents);\n            } catch (RuntimeException e) {\n                // 一个监听器失败不能影响其他监听器\n                System.err.println("监听器执行失败: " + e.getMessage());\n            }\n        }\n    }\n}', title: 'OrderSubject.java' },
      { p: '这段代码有两个容易忽略的细节。第一，用 <code>CopyOnWriteArrayList</code> 而不是 <code>ArrayList</code>：通知过程中如果某个监听器调用了 register 或 unregister，普通 ArrayList 会抛 <code>ConcurrentModificationException</code>，写时复制集合则遍历的是一份快照，安全但内存开销略大，适合“读多写少”的监听器列表。第二，单个监听器抛异常必须被捕获，否则后面的监听器全部收不到通知。' },

      { h: '2.5 观察者的坑：泄漏、顺序与事务' },
      { p: '观察者最隐蔽的问题是内存泄漏。主题持有观察者的强引用，如果观察者是一个短生命周期的对象（比如一个页面、一次请求的上下文），用完没有 unregister，它就会被主题一直引用，无法回收。解决办法有三个：用完显式注销、用弱引用（<code>WeakReference</code>）保存观察者、把生命周期交给容器管理。' },
      { p: '第二个问题是顺序。多个监听器之间如果有依赖（必须先扣库存再加积分），靠注册顺序保证是不可靠的，因为注册顺序可能被框架扫描打乱。正确的做法是给监听器加优先级（Spring 的 <code>@Order</code>），或者干脆拆成有明确先后关系的两步，而不是依赖隐式顺序。' },
      { p: '在 Spring 里，观察者的成熟形态是应用事件：业务代码注入 <code>ApplicationEventPublisher</code>，调用 <code>publishEvent</code> 发布事件，监听器用 <code>@EventListener</code> 订阅。它比手写观察者多做了三件事：按事件类型精确路由、支持 <code>@Order</code> 排序、支持 <code>@TransactionalEventListener</code> 在事务提交后再执行。分布式场景则把事件换成消息队列，主题变成 Topic，观察者变成消费者，代价是要自己处理重复消费和消息丢失。' },
      { p: '第三个问题是事务边界。支付事务还没提交就发通知，监听器去查订单可能查不到；事务提交后发通知，又可能因为进程崩溃丢消息。前者用“事务提交后回调”（Spring 的 <code>TransactionalEventListener</code>），后者用可靠消息表或消息队列。观察者模式本身不解决可靠性，它只解决解耦。' },
      { list: [
        '<b>同步通知会拖慢主流程：</b>十个监听器串行执行，支付接口的响应时间就是十段之和；重活应改为异步。',
        '<b>异常吞掉难排查：</b>捕获后至少记录日志和订单号，不要只打一行 message。',
        '<b>监听器里再发通知：</b>容易形成环，A 通知 B、B 又通知 A；必要时加事件链深度限制。',
        '<b>Spring 事件默认同步：</b><code>ApplicationEventPublisher</code> 默认在发布线程执行，需要异步要配线程池。'
      ] },

      { h: '2.6 代理：不改源码也能增强' },
      { p: '代理模式给目标对象提供一个替身，调用方访问替身，替身在把请求转发给目标前后插入额外逻辑。它的价值在于“开闭”：目标类的源码一行不改，就能加上日志、耗时统计、权限校验、事务、缓存。前提是调用方面向接口编程，这样把实现换成代理，调用方无感知。' },
      { p: '静态代理是最直白的写法：手写一个类，实现和目标相同的接口，内部持有目标对象。下面给用户服务加一个耗时统计代理：' },
      { lang: 'java', code: 'public interface UserService {\n    User findById(long id);\n}\n\npublic class UserServiceImpl implements UserService {\n    public User findById(long id) {\n        return new User(id, "用户" + id);\n    }\n}\n\npublic class TimingUserServiceProxy implements UserService {\n    private final UserService target;\n\n    public TimingUserServiceProxy(UserService target) {\n        this.target = target;\n    }\n\n    public User findById(long id) {\n        long start = System.nanoTime();\n        try {\n            return target.findById(id);\n        } finally {\n            long cost = (System.nanoTime() - start) / 1_000_000;\n            System.out.println("findById 耗时 " + cost + " ms");\n        }\n    }\n}', title: 'StaticProxy.java' },
      { p: '静态代理的缺点很致命：每加一个方法，代理类就要跟着实现一遍；每个要增强的接口都要写一个代理类。接口有二十个方法时，代理类就是二十段重复的模板代码。于是有了动态代理：代理类不在编译期存在，而是在运行时由 JDK 或字节码库生成。' },

      { h: '2.7 JDK 动态代理' },
      { p: 'JDK 动态代理的核心是 <code>java.lang.reflect.Proxy</code> 和 <code>InvocationHandler</code>。你提供一个类加载器、一组接口、一个处理器，<code>Proxy.newProxyInstance</code> 会在运行时生成一个实现了这些接口的类；对这个代理对象的每次方法调用，都会被转发到处理器的 <code>invoke</code> 方法，参数里带着方法对象和实参。' },
      { lang: 'java', code: 'public class TimingHandler implements InvocationHandler {\n    private final Object target;\n\n    public TimingHandler(Object target) {\n        this.target = target;\n    }\n\n    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {\n        long start = System.nanoTime();\n        try {\n            return method.invoke(target, args);\n        } catch (InvocationTargetException e) {\n            // 反射调用会把业务异常包一层，必须拆开抛出\n            throw e.getCause();\n        } finally {\n            long cost = (System.nanoTime() - start) / 1_000_000;\n            System.out.println(method.getName() + " 耗时 " + cost + " ms");\n        }\n    }\n}\n\nUserService target = new UserServiceImpl();\nUserService proxy = (UserService) Proxy.newProxyInstance(\n        target.getClass().getClassLoader(),\n        new Class<?>[]{UserService.class},\n        new TimingHandler(target));\n\nproxy.findById(1L);      // 实际调用的是 TimingHandler.invoke', title: 'JdkProxy.java' },
      { p: '这里有三个必须知道的细节。第一，JDK 动态代理只能代理接口，因为生成的类要 implements 这些接口；目标类没有接口时它无能为力。第二，<code>method.invoke</code> 抛出的 <code>InvocationTargetException</code> 是对业务异常的包装，不拆开的话，调用方收到的异常类型就变了，事务回滚规则也可能失效。第三，代理对象自己的 <code>equals</code>、<code>hashCode</code>、<code>toString</code> 也会进 invoke，处理器里要判断方法归属，避免死循环。' },
      { note: '<b>自调用陷阱：</b>在目标类内部用 <code>this.methodB()</code> 调用自己的另一个方法，不会经过代理，因此 methodB 上的事务、日志注解全部失效。这是 Spring AOP 最常见的“注解不生效”原因。' },

      { h: '2.8 AOP：代理在框架里的样子' },
      { p: 'Spring AOP 就是动态代理的产品化。它把“在哪些方法上、做什么增强”用切点表达式描述，容器启动时为匹配的 Bean 生成代理。几个术语需要分清：切面（Aspect）是增强逻辑的模块；连接点（Join Point）是程序执行中可以插入的点，Spring 只支持方法级；切点（Pointcut）是筛选连接点的表达式；通知（Advice）是具体动作，分前置、后置、异常、最终、环绕五类；织入（Weaving）是把切面应用到目标对象的过程。' },
      { lang: 'java', code: '@Aspect\n@Component\npublic class TimingAspect {\n\n    @Around("@annotation(com.example.Timed)")\n    public Object around(ProceedingJoinPoint pjp) throws Throwable {\n        long start = System.nanoTime();\n        try {\n            return pjp.proceed();\n        } finally {\n            long cost = (System.nanoTime() - start) / 1_000_000;\n            System.out.println(pjp.getSignature().getName() + " 耗时 " + cost + " ms");\n        }\n    }\n}', title: 'TimingAspect.java' },
      { p: 'Spring 生成代理有两种方式：目标类实现了接口时可以用 JDK 动态代理；没有接口或强制指定时用 CGLIB，通过继承目标类生成子类。Spring Boot 从 2.x 起默认 <code>proxyTargetClass=true</code>，也就是优先 CGLIB。CGLIB 的限制是不能代理 final 类和 final 方法，因为子类无法覆盖它们。' },
      { flow: ['调用方调用方法', '进入代理对象', '前置增强', '反射调用目标方法', '后置/异常增强', '返回结果'] },
      { p: '理解代理还要理解它的边界：代理只能拦截“从外部进来”的调用。对象内部的方法互调、构造函数里的调用、静态方法调用，都不会经过代理。另外代理会增加一层栈帧和一次反射（或字节码跳转），对绝大多数业务可以忽略，但在极端高频的路径上要实测，不要凭感觉优化。' },
      { p: '除了 Spring AOP，代理还出现在很多地方：MyBatis 的 Mapper 接口没有实现类，运行时用 JDK 动态代理生成，方法调用被转成 SQL 执行；RPC 框架给远程服务生成本地代理，调用方像调本地方法；事务、缓存、重试、限流，本质都是代理。' },

      { h: '2.9 模板方法：骨架不变，步骤可变' },
      { p: '模板方法（Template Method）处理的是“流程一样、细节不同”。比如导入数据固定五步：打开文件、校验表头、逐行解析、写入数据库、关闭资源；但打开的可能是本地 CSV，也可能是对象存储，解析的可能是用户，也可能是订单。把五步抽成抽象方法，父类只写流程骨架，子类填细节，就是模板方法。' },
      { p: '错误写法是让每个子类各复制一份完整流程，五步代码贴了四遍；后来发现关闭资源漏了 try-finally，得改四个地方，还容易漏一个。<b>修正</b>：父类用 final 修饰模板方法，禁止子类覆盖整个流程；真正变化的步骤声明为 <code>protected abstract</code>；允许子类“可选干预”的步骤留成钩子方法，也就是一个空的 <code>protected</code> 方法，子类想改就覆盖，不想改就用默认行为。' },
      { p: '两个注意点。第一，抽象步骤别超过五六个，超过说明这个骨架承担了太多职责，该拆成两条流程。第二，模板方法里父类调用子类实现，调试时调用栈会来回跳，所以每个步骤的日志要打全，出问题时才能看出卡在哪一步。' },

      { h: '2.10 命令与状态：把动作和状态都变成对象' },
      { p: '命令模式把“一次操作”封装成对象，对象里带着执行所需的全部参数。好处是操作可以被排队、记录、撤销、重放。错误写法是在 Controller 里直接调 service，等到想加“撤销上一步”时，才发现没有任何地方保存过参数和接收者。<b>修正</b>：定义 <code>Command</code> 接口，含 <code>execute()</code> 与 <code>undo()</code>；每个具体命令持有接收者和参数；调用方只依赖接口，再用一个栈保存已执行的命令，撤销时弹出并调用 undo。' },
      { p: '状态模式把“对象在不同状态下的不同行为”拆成状态类。错误写法是订单的 <code>pay()</code> 里判断“待支付 / 已支付 / 已取消”，还要拦住已取消的订单；每加一个状态，所有方法都要补分支，漏一个就是资损事故。<b>修正</b>：抽象出 <code>OrderState</code>，每个状态实现自己的 pay、cancel、ship，非法操作直接抛业务异常；上下文把请求委托给当前状态，下一个状态由状态自己决定。' },
      { p: '两者容易混：命令关注“做了什么、能不能撤销”，状态关注“现在是谁、允许做什么”。同一个“支付成功”，用命令表达这次调用，用状态表达订单进入已支付。真实项目里它们经常一起出现，命令负责审计与补偿，状态负责约束合法流转。' },

      { h: '2.11 责任链：让请求沿着处理者往下走' },
      { p: '责任链（Chain of Responsibility）把一串处理者首尾相连，请求从链头进入，谁能处理谁处理，处理完可以选择继续传递，也可以就此终止。典型场景有三个：参数校验，依次做非空、长度、敏感词；审批流，组长批完给经理，经理批完给总监；网关过滤器，先限流、再鉴权、最后路由。' },
      { p: '错误写法是把校验写成三层嵌套 if，新增一条规则就要往最里面插一段，缩进越来越深，最后没人敢动，也不敢删。<b>修正</b>：每个校验器实现 <code>handle(request, chain)</code>，不通过就抛异常或返回错误码，通过就调用 <code>chain.handle(request)</code> 交给下一个；链在启动时组装好，顺序写在配置里，一眼能看出谁先谁后。' },

      { h: '2.12 三个模式怎么分工，与 AOP 是什么关系' },
      { p: '策略、观察者、代理经常同时出现在一个业务里：下单时用策略算价，支付成功后用观察者通知下游，整个服务外面套一层代理做日志和事务。它们解决的是不同维度的问题，不要互相替代。' },
      { table: { head: ['模式', '解决的问题', '关键角色', '典型落地'], rows: [
        ['策略', '算法可替换，消除分支', '接口 + 多个实现 + 上下文', '优惠计算、支付渠道、排序规则'],
        ['观察者', '状态变化通知多方，解除耦合', '主题 + 观察者列表', 'Spring 事件、消息队列、监听器'],
        ['代理', '不修改源码增强方法', '接口 + 代理 + 目标', 'AOP、事务、RPC、MyBatis Mapper']
      ] } },
      { p: '代理的两种实现也有明确取舍，见下表。选型时先看目标有没有接口，再看是否需要代理类本身（final 类只能走接口代理）。' },
      { table: { head: ['对比项', '静态代理', 'JDK 动态代理', 'CGLIB'], rows: [
        ['代理类产生时机', '编译期手写', '运行时生成', '运行时生成子类'],
        ['是否需要接口', '需要', '必须需要', '不需要'],
        ['方法覆盖率', '手写哪些就有哪些', '接口方法', '非 final 方法'],
        ['主要缺点', '模板代码多', '只能代理接口', '不能代理 final 类/方法']
      ] } },
      { p: '前面讲代理时说过 AOP 是代理的产品化，这里补一层关联：模板方法、责任链、代理在框架里经常同时出现。一次带事务的请求，容器先让它经过过滤器链做鉴权和限流，这是责任链；接着进入代理对象开启事务，这是环绕通知；事务内部再按“开启、执行业务、提交或回滚、释放连接”的固定骨架走一遍，这是模板方法。看懂这三个模式，Spring 里一条请求链路就不再是黑盒。' },

      { h: '2.13 选型口诀与常见坑' },
      { p: '选型可以记一句话：流程固定、步骤可变，用模板方法；请求要经过一串可插拔的处理者，用责任链；操作要排队、撤销、审计，用命令；对象行为随内部状态大幅变化，用状态。反过来，只有一个处理者、只有两种状态、流程只有三步时，直接写代码比套模式清楚得多。' },
      { p: '几个高频坑：模板方法在构造器里调用抽象方法，此时子类字段还没初始化，拿到的是 null；责任链忘了写链尾的终止逻辑，请求走到最后一个处理者后返回 null，调用方直接空指针；命令对象里保存了可变的外部引用，等到撤销时数据早被改掉，撤销等于没撤；状态类之间互相 new，形成循环依赖，状态一多就理不清。这些问题的共同点是“模式用对了，边界没想清楚”，写的时候多问一句谁负责收尾。' },
      { list: [
        '<b>策略注入为 null：</b>自己 new 的上下文不会经过容器，字段注入不生效；用构造器注入并在容器里取 Bean。',
        '<b>观察者列表遍历时修改：</b>抛 ConcurrentModificationException；改用 CopyOnWriteArrayList 或先复制一份再遍历。',
        '<b>监听器没注销：</b>长生命周期主题持有短生命周期对象，内存持续上涨；用弱引用或在销毁钩子里注销。',
        '<b>自调用导致 AOP 失效：</b>同类内部 this 调用不经过代理；拆到另一个 Bean，或注入自身代理。',
        '<b>异常被代理吞掉：</b>环绕通知里 catch 后没有 rethrow，事务感知不到异常，该回滚的没回滚。',
        '<b>动态代理的 equals 出错：</b>代理对象与目标对象 equals 为 false；比较业务主键，不要比较对象本身。'
      ] },

      { h: '2.14 本章小结' },
      { list: [
        '行为型模式关注对象协作；核心是找到变化点并隔离它。',
        '策略把算法封装成实现同一接口的类，用注册表或容器消除分支。',
        '观察者维护监听器列表，注意并发修改、内存泄漏、通知顺序与事务边界。',
        '代理在不改源码的前提下增强方法；JDK 代理基于接口，CGLIB 基于继承。',
        'Spring AOP 是代理的产品化，自调用会绕过代理，是最常见失效原因。'
      ] },

      { h: '2.15 常见追问' },
      { list: [
        '<b>问：策略模式和简单工厂有什么区别？</b><br>答：工厂负责创建对象，策略负责选择算法；工厂常用来生产策略实例，两者是配合关系，不是替代关系。判断代码里是哪一个：方法签名收的是类型标识、返回的是对象，那是工厂；收的是业务数据、返回的是计算结果，那是策略。混在一起的典型写法是一个 switch 里既 new 对象又算金额，把它拆成工厂挑策略、策略算金额，两边都能单独测。',
        '<b>问：观察者模式和发布订阅一样吗？</b><br>答：不完全一样。观察者里主题直接持有观察者列表并同步调用，主题和观察者互相知道接口，是进程内的耦合；发布订阅中间隔着消息中间件或事件总线，发布者不知道谁在听，能做到跨进程、能削峰、能以异步方式投递。观察者实现简单、顺序可控；发布订阅解耦更彻底，代价是要自己处理重复投递、顺序与事务一致性。',
        '<b>问：JDK 动态代理为什么必须基于接口？</b><br>答：因为生成的代理类已经继承了 <code>Proxy</code>，而 Java 是单继承，一个类只能有一个父类，所以没法再继承你的目标类，只能实现它的接口。这也解释了目标类没实现任何接口时为什么代理会失败。要代理没有接口的类，就得换成 CGLIB 这类生成子类的方案，或者让目标类至少实现一个接口。',
        '<b>问：CGLIB 为什么不能代理 final 方法？</b><br>答：CGLIB 的原理是生成目标类的子类并覆盖方法，在覆盖方法里织入增强；final 方法不允许被覆盖，private 方法对子类不可见，这两类调用都会直接走父类原逻辑，增强静默失效——注意是失效而不是报错，这是排查时最容易误判的地方。同理 final 类根本无法被继承，整个类都代理不了。',
        '<b>问：Spring 事务在什么情况下会失效？</b><br>答：常见五种：方法不是 public，代理不拦；同类内部自调用，不走代理；异常被 try/catch 吞掉，代理看不到；异常类型不在 rollbackFor 范围内，默认只回滚 RuntimeException；类没被容器管理，自己 new 出来的没有代理。另外数据库引擎不支持事务、多数据源没配事务管理器也会失效。排查顺序是先确认调用经过代理，再看异常有没有抛到代理边界。',
        '<b>问：什么时候不该用观察者？</b><br>答：只有一两个固定后续动作、且顺序要求严格时，直接调用更简单可读：一个方法里两行代码，比注册两个监听器加一个事件类清楚得多。观察者适合订阅者数量会增长、或者需要运行时增删的场景。如果动作之间有严格的先后和事务一致性要求，也别用异步事件，同步的事件总线同样会把调用栈拉长、把异常传播变复杂。'
      ] },

      { h: '2.16 自测与练习' },
      { p: '先自己动手做一遍，再展开参考答案对照预期现象与判断依据。' },
      { ol: [
        '把一个含 5 个分支的优惠计算改写成策略模式，统计改动前后新增规则需要改几个文件。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">interface DiscountStrategy {\n  BigDecimal apply(BigDecimal amount);\n}\n\nfinal class NoDiscount implements DiscountStrategy {\n  public BigDecimal apply(BigDecimal a) {\n    return a;\n  }\n}\n\nfinal class Full100Minus20 implements DiscountStrategy {\n  public BigDecimal apply(BigDecimal a) {\n    return a.compareTo(new BigDecimal("100")) >= 0\n        ? a.subtract(new BigDecimal("20")) : a;\n  }\n}\n\nfinal class Vip95 implements DiscountStrategy {\n  public BigDecimal apply(BigDecimal a) {\n    return a.multiply(new BigDecimal("0.95"));\n  }\n}\n\nfinal class Discounts {\n  private final Map&lt;String, DiscountStrategy> map =\n      new HashMap&lt;>();\n\n  Discounts() {\n    map.put("none", new NoDiscount());\n    map.put("full100", new Full100Minus20());\n    map.put("vip", new Vip95());\n  }\n\n  BigDecimal calc(String type, BigDecimal amount) {\n    DiscountStrategy s = map.get(type);\n    if (s == null) {\n      throw new IllegalArgumentException("未知优惠：" + type);\n    }\n    return s.apply(amount);\n  }\n}</pre><b>要点</b>：改写前新增一种优惠要动那个 if-else，回归测试得全跑；改写后只新增一个实现类、在注册表 put 一行，已有分支一行不动，回归也只跑新规则。</div></details>',
        '给策略加一个 Map 注册表，要求未知类型抛出带类型的异常，并写单元测试覆盖。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">final class DiscountRegistry {\n  private final Map&lt;String, DiscountStrategy> map =\n      new HashMap&lt;>();\n\n  void register(String type, DiscountStrategy s) {\n    map.put(type, s);\n  }\n\n  DiscountStrategy get(String type) {\n    DiscountStrategy s = map.get(type);\n    if (s == null) {\n      throw new IllegalArgumentException(\n          "未注册的优惠类型：" + type);\n    }\n    return s;\n  }\n}\n\nclass DiscountRegistryTest {\n  private DiscountRegistry r;\n\n  @BeforeEach\n  void init() {\n    r = new DiscountRegistry();\n    r.register("half", a -> a.divide(new BigDecimal("2")));\n  }\n\n  @Test\n  void known() {\n    BigDecimal got = r.get("half").apply(new BigDecimal("100"));\n    assertEquals(0, new BigDecimal("50").compareTo(got));\n  }\n\n  @Test\n  void unknown() {\n    IllegalArgumentException e = assertThrows(\n        IllegalArgumentException.class, () -> r.get("gold"));\n    assertTrue(e.getMessage().contains("gold"));\n  }\n}</pre><b>要点</b>：取值后判空抛异常，别用 <code>getOrDefault</code> 兜底——静默返回 null 只是把失败推迟到调用处；测试走两条路径：已知类型断金额，未知类型断消息里带类型名。</div></details>',
        '实现一个观察者，要求某个监听器抛异常时其他监听器仍能收到通知，并说明为什么用 CopyOnWriteArrayList。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">interface Listener {\n  void on(String event);\n}\n\nfinal class Bus {\n  private final List&lt;Listener> ls =\n      new CopyOnWriteArrayList&lt;>();\n\n  void add(Listener l) { ls.add(l); }\n\n  void remove(Listener l) { ls.remove(l); }\n\n  void publish(String event) {\n    for (Listener l : ls) {\n      try {\n        l.on(event);\n      } catch (RuntimeException e) {\n        System.err.println("监听器失败：" + e);\n      }\n    }\n  }\n}\n\nBus bus = new Bus();\nbus.add(e -> { throw new IllegalStateException("boom"); });\nbus.add(e -> System.out.println("收到 " + e));\nbus.publish("order-created");   // 第二个照样打印</pre><b>要点</b>：每个回调单独 try/catch，一个炸了不影响后面的监听器；<code>CopyOnWriteArrayList</code> 的迭代走快照，监听器在回调里注册或注销自己也不会抛 <code>ConcurrentModificationException</code>，代价是本轮通知中新加的监听器收不到当前事件。</div></details>',
        '手写一个静态代理记录方法耗时，再改写成 JDK 动态代理，比较代码量。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">interface Svc { String hello(String n); }\n\nfinal class SvcImpl implements Svc {\n  public String hello(String n) {\n    return "hi " + n;\n  }\n}\n\n// 静态代理：每个接口各写一个类\nfinal class SvcProxy implements Svc {\n  private final Svc target;\n\n  SvcProxy(Svc t) { this.target = t; }\n\n  public String hello(String n) {\n    long t0 = System.nanoTime();\n    try {\n      return target.hello(n);\n    } finally {\n      System.out.println("hello "\n          + (System.nanoTime() - t0) + "ns");\n    }\n  }\n}\n\n// 动态代理：一个 handler 管所有接口\nfinal class Timing implements InvocationHandler {\n  private final Object target;\n\n  Timing(Object t) { this.target = t; }\n\n  public Object invoke(Object p, Method m, Object[] a)\n      throws Throwable {\n    long t0 = System.nanoTime();\n    try {\n      return m.invoke(target, a);\n    } finally {\n      System.out.println(m.getName() + " "\n          + (System.nanoTime() - t0) + "ns");\n    }\n  }\n}\n\nSvc svc = (Svc) Proxy.newProxyInstance(\n    Svc.class.getClassLoader(),\n    new Class&lt;?>[] {Svc.class},\n    new Timing(new SvcImpl()));</pre><b>要点</b>：静态代理的转发在编译期写死，接口加方法就得同步改代理类；动态代理运行时生成字节码，转发逻辑只写一次。业务方法抛的异常会被包成 <code>InvocationTargetException</code>，要在这里 <code>getCause()</code> 还原后再抛，否则调用方 catch 到的类型全变了。</div></details>',
        '解释为什么在 Service 内部调用自己的另一个方法时，@Transactional 不生效，并给出两种修复方案。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：外部调用带事务的方法能回滚，同类内部 <code>this.other()</code> 调同一个注解方法却不回滚，日志里也看不到事务开始。<b>为什么</b>：事务增强织在代理对象上，内部调用走的是 <code>this</code>，也就是原始对象，压根没经过代理，注解等于不存在。<b>要点</b>：方案一把内层方法挪到另一个 Bean，通过注入的代理调用；方案二注入自身代理或用 <code>AopContext.currentProxy()</code>；最省事的是把事务边界上移到唯一入口方法，内部只做纯计算。</div></details>'
      ] }
    ]
  };

  T['sql-jdbc'] = {
    meta: '本章约 3500 字 · 建议 20 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '3.1 JDBC 是什么：接口与驱动' },
      { p: 'JDBC 是一套标准接口，位于 <code>java.sql</code> 和 <code>javax.sql</code> 包中。核心接口有四个：<code>DriverManager</code> 负责根据 URL 找到合适的驱动并建立连接；<code>Connection</code> 代表一次数据库会话，能创建语句、控制事务；<code>Statement</code> / <code>PreparedStatement</code> 用来执行 SQL；<code>ResultSet</code> 承载查询结果，是一个可逐行移动的游标。' },
      { p: '接口由 JDK 提供，实现由数据库厂商提供。MySQL 的驱动是 <code>mysql-connector-j</code>，PostgreSQL 是 <code>postgresql</code>，它们都实现了同一套接口。所以你的代码里不应该出现 <code>com.mysql.cj.jdbc.Driver</code> 这样的具体类，除非在配置驱动类名。' },
      { p: '依赖坐标只有一组，写错 groupId 就拉不到新版本：<code>com.mysql:mysql-connector-j</code>（8.0.x 之后由 <code>mysql:mysql-connector-java</code> 改名而来，老教程还在抄旧坐标）。Spring Boot 4.0 的 <code>spring-boot-dependencies</code> 已把这个 artifact 收进 BOM，声明依赖时<b>不写 &lt;version&gt;</b>：版本由 Boot 决定，手写反而会和 BOM 管理的驱动版本打架，升级 Boot 时漏掉一处就是“编译能过、运行时找不到驱动”。' },
      { lang: 'xml', code: '<dependency>\n  <groupId>com.mysql</groupId>\n  <artifactId>mysql-connector-j</artifactId>\n  <!-- 版本以 Spring Boot BOM 为准：spring-boot-dependencies 已管理，无需手写 -->\n  <scope>runtime</scope>\n</dependency>', title: 'pom.xml（片段）' },
      { p: '两点细节：<code>&lt;scope&gt;runtime&lt;/scope&gt;</code> 表示编译期只用 <code>java.sql</code> 接口、运行期才需要驱动实现，写成默认的 compile 也能跑，只是把实现泄漏到编译期；脱离 Boot 单独用 Maven 时必须自己写 <code>&lt;version&gt;</code>，此时版本号以 MySQL 官方发布说明为准。' },
      { p: 'JDBC 4.0 之后，驱动会通过 SPI 机制自动注册：只要 classpath 里有驱动 jar，<code>DriverManager</code> 就能根据 URL 前缀找到它，<code>Class.forName</code> 加载驱动这一步通常可以省略。老教程里的这行代码不是错，只是不再必要；如果遇到“No suitable driver”，先检查依赖有没有打进运行环境，而不是急着加 forName。' },

      { h: '3.2 一次查询的五步流程' },
      { p: '一次完整的 JDBC 查询可以拆成五步，这是本章最需要背下来的流程：一，获取连接；二，创建 PreparedStatement 并写好带占位符的 SQL；三，设置参数；四，执行并拿到 ResultSet；五，遍历结果、关闭资源。' },
      { flow: ['获取 Connection', '创建 PreparedStatement', 'setXxx 绑定参数', 'executeQuery 拿 ResultSet', '遍历并关闭资源'] },
      { lang: 'java', code: 'import java.sql.*;\n\npublic class JdbcQueryDemo {\n    public static void main(String[] args) throws SQLException {\n        String url = "jdbc:mysql://localhost:3306/demo?sslMode=DISABLED&connectionTimeZone=Asia/Shanghai";\n        String user = "root";\n        String password = "123456";\n\n        String sql = "SELECT id, name, age FROM users WHERE age > ? ORDER BY id";\n\n        try (Connection conn = DriverManager.getConnection(url, user, password);\n             PreparedStatement ps = conn.prepareStatement(sql)) {\n\n            ps.setInt(1, 18);\n\n            try (ResultSet rs = ps.executeQuery()) {\n                while (rs.next()) {\n                    long id = rs.getLong("id");\n                    String name = rs.getString("name");\n                    int age = rs.getInt("age");\n                    System.out.println(id + "\\t" + name + "\\t" + age);\n                }\n            }\n        }\n    }\n}', title: 'JdbcQueryDemo.java' },
      { out: '1\t张三\t28\n2\t李四\t32\n3\t王五\t25' },
      { p: '这段代码可以直接运行，前提是本地有 MySQL、建好了 demo 库和 users 表、并把驱动 jar 放进 classpath。示例 out 就是样例数据 <code>users(id, name, age)</code> 取三行 <code>(1, 张三, 28)</code>、<code>(2, 李四, 32)</code>、<code>(3, 王五, 25)</code> 的结果：只有 <code>age &gt; 18</code> 的行返回，行序按 <code>ORDER BY id</code> 升序。URL 里的参数因数据库而异：MySQL 常带时区和 SSL 配置，PostgreSQL 默认端口是 5432，写法是 <code>jdbc:postgresql://localhost:5432/demo</code>。密码不要硬编码在源码里，真实项目从环境变量或配置中心读取。' },
      { p: '五步写三遍就该抽方法：把 SQL 与参数传进去、把结果交给回调处理，关闭交给 try-with-resources——Spring 的 JdbcTemplate 就是这么来的。' },

      { h: '3.3 五步的失败现场：异常出现在哪一步' },
      { p: '五步背下来只是开始，排错时要能说出每一步失败时异常长什么样。第一步拿连接失败多半不是代码问题：<code>Access denied</code> 是账号、密码或授权库不对；<code>Unknown database</code> 是库名拼错；<code>Communications link failure</code> 是端口不通、防火墙拦截或数据库没启动；<code>Public Key Retrieval is not allowed</code> 是 MySQL 8 的认证插件要求补上 <code>allowPublicKeyRetrieval=true</code>。' },
      { p: '第二步 <code>prepareStatement</code> 一般不会真的校验表名、列名和语法。Connector/J 默认 <code>useServerPrepStmts=false</code>，这时是客户端预编译，SQL 文本要到 <code>executeQuery</code> 才发给服务器，错误也在那一刻才抛出；只有开启服务端预编译（<code>useServerPrepStmts=true</code>）才会提前在服务端的 Prepare 阶段报错。所以这类错误通常在 <code>executeQuery</code> 抛出，排查时别只盯着 prepare 那一步。第三步绑参，少绑一个报 <code>No value specified for parameter 2</code>，多绑一个报 <code>Parameter index out of range</code>。第四步对 SELECT 调 <code>executeUpdate</code>、对 UPDATE 调 <code>executeQuery</code>，都会立刻抛异常。第五步漏关资源不会马上报错，只在高并发时表现为连接池耗尽。' },
      { p: '所以定位顺序是：先确认异常发生在第几步，再判断是环境、SQL、参数还是资源问题。一看到 <code>SQLException</code> 就改 SQL，往往改不到点上。' },

      { h: '3.4 ResultSet：游标与取值' },
      { p: 'ResultSet 不是“一个列表”，而是一个游标。刚拿到时，游标停在第一行之前，必须调用 <code>next()</code> 才能移动到第一行；<code>next()</code> 返回 true 表示当前行有数据，返回 false 表示已经遍历完。所以标准写法一定是 <code>while (rs.next())</code>，而不是先取再判断。' },
      { p: '取值有两种方式：按列名 <code>rs.getString("name")</code>，或按列下标 <code>rs.getString(1)</code>。下标从 1 开始，不是 0，这是新手最常犯的错。按列名可读性好、对列顺序变化不敏感，推荐优先使用；按下标略快，适合列非常多且固定的场景。' },
      { p: '类型要匹配：整数用 <code>getInt</code> / <code>getLong</code>，小数用 <code>getBigDecimal</code>（金额不要用 getDouble），字符串用 <code>getString</code>，时间用 <code>getTimestamp</code> 或 Java 8 之后的 <code>getObject("created_at", LocalDateTime.class)</code>。数据库里的 NULL 取出来是 Java 的 null（对象类型）或 0（基本类型），<code>getInt</code> 遇到 NULL 返回 0，无法区分“真的是 0”和“没有值”。要区分就用 <code>getObject</code> 或取完调用 <code>wasNull()</code>。' },
      { lang: 'java', code: 'while (rs.next()) {\n    long id = rs.getLong("id");\n    String email = rs.getString("email");\n    if (rs.wasNull()) {\n        email = "(未填写)";\n    }\n    System.out.println(id + " -> " + email);\n}', title: 'NullDemo.java' },
      { p: '除了查询，还有两种执行方式：<code>executeUpdate</code> 用于 INSERT、UPDATE、DELETE，返回受影响的行数；<code>execute</code> 返回 boolean，true 表示结果是一个 ResultSet，false 表示是更新计数，一般只在动态 SQL 或存储过程时用。插入后想拿自增主键，用 <code>conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)</code>，执行后从 <code>getGeneratedKeys()</code> 读取。' },

      { h: '3.5 Statement 与 PreparedStatement 的边界' },
      { p: 'Statement 不是完全不能用。执行不带参数的 DDL、查看执行计划、开关账号这类管理语句，用 Statement 更直接。判断标准只有一条：这条 SQL 的字符串是不是由外部变量拼出来的，是，就必须换成 PreparedStatement。' },
      { p: '错误写法是 <code>"SELECT * FROM users WHERE name = \'" + name + "\'"</code>，修正为 <code>"SELECT * FROM users WHERE name = ?"</code> 再 <code>ps.setString(1, name)</code>。安全不来自“过滤单引号”，而来自参数不参与语法解析。' },
      { p: '但占位符只能替值，不能替标识符。<code>ORDER BY</code> 的列名、<code>ASC</code> 或 <code>DESC</code>、表名都不能写成问号，驱动会把问号当字符串常量，排序失效或直接报错。这类动态需求用白名单：把允许的列名放进 Map，用户传的键查不到就拒绝，再用查到的固定字符串拼接。黑名单过滤关键字挡不住大小写、注释符、编码变形，白名单才可控。' },
      { p: '同一个 PreparedStatement 复用多次时参数不会自动清空，第二次没绑的列会沿用上一次的值；批量里传 null 要显式给出类型，<code>setNull(3, Types.VARCHAR)</code>，否则驱动可能拼出错误的字面量。' },

      { h: '3.6 ResultSet 到对象：映射、一对多与流式读取' },
      { p: '框架里的 RowMapper 本质就是一段 while 加一次 new。手写时注意三点：列名用查询里的别名，不要依赖原列名，别名是稳定契约；数字列取完立刻判 <code>wasNull</code>，再决定是否装箱；金额列用 <code>getBigDecimal</code>，不要 getDouble 再转。' },
      { p: '枚举和时间字段最容易出问题。数据库存字符串或 tinyint，映射成枚举时 <code>valueOf</code> 要捕获 <code>IllegalArgumentException</code>，否则一条脏数据会让整次查询失败；时间字段优先 <code>getObject("created_at", LocalDateTime.class)</code>，比 <code>getTimestamp</code> 再 <code>toLocalDateTime</code> 少一层时区心智负担。' },
      { p: '一对多不要在 while 里再查子表，那是一百行数据发一百零一条 SQL。两种做法：一次 JOIN 出扁平行，在内存里按主键分组；或先查主表拿 id，再用一条 IN 查询捞子表回来配对。前者注意行数膨胀，后者注意 IN 列表长度，超过几百个就分批。' },
      { p: '结果集很大时不要一次读进 List。驱动默认会把查询结果尽量取到客户端，百万行足以把堆撑爆；<code>setFetchSize</code> 设成几百并配合驱动的游标参数，才能边取边处理。多数业务其实不需要流式读取，分页查、每页处理完就丢弃，反而更简单可控。看到 <code>OutOfMemoryError</code> 先怀疑全量查询，不要急着调大堆。' },
      { p: '字段一多就更容易漏：映射时用全参构造器或 builder，让编译器替你数参数，比逐字段 <code>set</code> 更难漏。漏掉的字段是 null，而 null 往往要等业务跑到很远处才炸。' },

      { h: '3.7 资源关闭与 try-with-resources' },
      { p: '数据库连接是有限资源，用完必须归还，否则连接数耗尽后整个应用都会卡死。传统写法是在 finally 里逐个关闭，顺序与打开顺序相反：ResultSet → Statement → Connection。每个 close 还要各自 try-catch，代码又长又容易漏。' },
      { p: 'Java 7 引入的 try-with-resources 解决了这个问题：只要资源实现了 <code>AutoCloseable</code>，写在 try 的括号里，无论正常结束还是抛异常，都会自动按声明的逆序关闭。Connection、PreparedStatement、ResultSet 都实现了这个接口。' },
      { lang: 'java', code: 'try (Connection conn = DriverManager.getConnection(url, user, pwd);\n     PreparedStatement ps = conn.prepareStatement(sql);\n     ResultSet rs = ps.executeQuery()) {\n    while (rs.next()) {\n        System.out.println(rs.getString("name"));\n    }\n}   // 逆序关闭：rs → ps → conn', title: 'TryWithResources.java' },
      { p: '注意不要把 <code>Connection</code> 声明在 try 外面再用 try 包语句，那样连接不会被自动关闭。另外，关闭顺序有实际意义：先关 ResultSet，再关 Statement，最后关 Connection；如果先关连接，后面的 close 可能抛异常。try-with-resources 的逆序关闭正好符合这个要求。' },
      { note: '<b>连接池的 close 不是真关闭：</b>从 HikariCP 等连接池拿到的 Connection 是一个包装对象，调用 close 只是把连接还给池子。所以依然要 close，否则池子会被借空。' },

      { h: '3.8 连接池与连接参数' },
      { p: '每次 <code>DriverManager.getConnection</code> 都要建立 TCP 连接、做认证、初始化会话，耗时可能是几毫秒到几十毫秒。高并发下频繁创建连接会拖垮数据库，所以生产环境必须用连接池：启动时建好一批连接，用的时候借、用完还。常用实现是 HikariCP（Spring Boot 默认）和 Druid。连接池需要配置最大连接数、最小空闲、获取超时、空闲回收，最大连接数不是越大越好，超过数据库承载能力反而会互相拖慢。' },
      { p: '驱动版本要和数据库主版本匹配。MySQL 8 的库配 5.x 驱动常常连不上；反过来用 8.x 驱动连 5.7 虽然能通，认证插件和时区默认值也可能不同。依赖里同时出现两个版本的驱动，表现为“有时能连有时不能”，用 <code>mvn dependency:tree</code> 找出来排除旧版本。' },
      { p: 'URL 上有几个参数值得记：<code>connectionTimeZone</code> 决定时间字段按哪个时区解释，写成 <code>connectionTimeZone=Asia/Shanghai</code> 才不会因为服务器默认 UTC 差 8 小时；<code>sslMode</code> 控制链路加密，取值 DISABLED / PREFERRED / REQUIRED / VERIFY_CA，生产至少 REQUIRED，本地自测才写 <code>sslMode=DISABLED</code>。这两个参数是 Connector/J 8.0.13 起的新写法，旧参数 <code>useSSL</code> 与 <code>serverTimezone</code> 同时被取代（<code>serverTimezone</code> 在 8.0.23 并入新名，只留别名兼容），存量项目里还能见到那种老写法，新项目别再抄；<code>connectTimeout</code> 和 <code>socketTimeout</code> 分别控制建连与读写的等待上限。不设超时，网络抖动时线程会一直挂着，比直接报错更难排查。' },
      { p: '连接池只需先调四个参数：最大连接数、最小空闲、获取连接超时、空闲淘汰时间。最大连接数按数据库承受能力定，常见起点是 CPU 核数乘二再加磁盘数，再压测微调；设成几百，数据库侧的线程切换和锁竞争反而把吞吐压下去。获取超时建议设短，让池被借空时快速失败，而不是让请求排队半分钟。' },
      { p: '还有两个实用开关：<code>leakDetectionThreshold</code> 在连接借出超时后打印借出时的堆栈，专门抓忘记 close 的代码；池内连接的空闲存活时间要小于数据库的 <code>wait_timeout</code>，否则服务端先断开，池里留下的是死连接，借出去一次就报一次错。' },
      { p: '连接是借来的，不是临时造出来的。借出那一刻池会先做有效性校验，校验本身也要花时间，所以最小空闲不能设成零，否则每次高峰都要现场建连；但设得太大，又长期占着数据库的连接名额，别的应用借不到。空闲回收要避开业务高峰，别和工作线程的调度撞在一起。' },

      { h: '3.9 批量操作与事务边界' },
      { p: '批量插入时不要循环执行单条 INSERT。用 <code>addBatch()</code> 攒一批，再 <code>executeBatch()</code> 一次发送，配合 JDBC URL 里的 <code>rewriteBatchedStatements=true</code>（MySQL），性能可以提升一个数量级。批量大小控制在几百到几千，太大容易造成锁等待和内存压力。' },
      { p: '批处理有两个细节。<code>addBatch</code> 攒批没问题，但同一批要重复执行前必须 <code>clearBatch</code>，否则上一批会再发一次。<code>executeBatch</code> 返回的数组里可能出现 -2（SUCCESS_NO_INFO），表示驱动不告诉具体行数，这不是失败，不要拿它和 0 比较来判断有没有插入。' },
      { p: '批量失败抛的是 <code>BatchUpdateException</code>，<code>updateCounts</code> 只包含成功的那部分，后面的语句没有执行。外层开了事务，回滚即可；没开事务，已成功的几条就留在库里了。批量和事务必须一起考虑，只加 <code>addBatch</code> 不等于安全。' },
      { p: '自动提交的边界也要看清：一条 SQL 执行完立刻生效，所以“先插主表、再用回填的主键插子表”这种前后依赖的操作，必须显式关掉自动提交。判断标准很简单：这组 SQL 是否互为前提、缺一条就不完整，是就放进同一个事务，否则分开提交反而减少锁的持有时间。' },

      { h: '3.10 常见坑、排查顺序与上线自查' },
      { list: [
        '<b>SQL 拼接导致注入：</b>把用户输入直接拼进 SQL，输入 <code>1 OR 1=1</code> 就能绕过条件；必须用 PreparedStatement 占位符。',
        '<b>下标从 0 开始：</b><code>rs.getString(0)</code> 会抛异常，JDBC 的列下标从 1 开始。',
        '<b>忘记 next()：</b>拿到 ResultSet 直接 getString，抛“结果集没有当前行”。',
        '<b>用 getDouble 取金额：</b>精度丢失；金额统一用 BigDecimal。',
        '<b>连接不关闭：</b>连接池耗尽，表现为请求一直等待直到超时。',
        '<b>在循环里查数据库：</b>N+1 查询，一百条数据发一百零一次 SQL；改成一次 IN 查询或 JOIN。'
      ] },
      { p: '排查 JDBC 问题有一套固定顺序：先看异常类型和信息，<code>SQLException</code> 通常带 SQLState 和 vendor code；再看 SQL 本身能否在客户端工具里执行；然后确认参数是否传对、列名是否拼错；最后检查连接串、驱动版本、时区和字符集。把这几步走完，绝大多数问题都能定位。' },
      { p: '<code>SQLException</code> 除了 message 还有 SQLState 和 vendor code。SQLState 以 23 开头是约束冲突，08 开头是连接问题，40 开头是死锁或回滚。按前缀分类比字符串匹配可靠。一条异常还可能挂着 <code>nextException</code> 链，遍历到底才能看到根因。' },
      { p: '关闭资源三条规则：谁打开谁关闭、顺序与打开相反、关闭失败不能覆盖原始异常。try-with-resources 自带这三条，新代码不要手写 finally。必须手写时，每个 close 各自 try-catch，并用 <code>addSuppressed</code> 把关闭异常挂到主异常上，而不是吞掉。' },
      { p: '上线前自查：SQL 是否全部参数化、连接是否都来自池、批量与分页是否有上限、超时是否设置、异常是否带上下文、日志是否打印了 SQL 与参数并做了脱敏。清单不长，每一条都对应过真实事故。' },

      { h: '3.11 本章小结' },
      { list: [
        'JDBC 五步：取 Connection → 预编译语句 → setXxx 绑参 → 执行取 ResultSet → 关闭资源；SQL 语句本身的写法见上一课。',
        '连接从池里借、用完必须还：<code>close()</code> 不是真关闭，是把连接交回池子，不还就会把池借空。',
        '资源关闭交给 try-with-resources，按 ResultSet → Statement → Connection 逆序释放，抛异常也不会漏。',
        '带参数的 SQL 一律用 PreparedStatement 占位符绑定：参数不参与语法解析，注入和转义问题一起消失。',
        '事务边界：互为前提的几条 SQL 先 <code>setAutoCommit(false)</code>，全部成功 commit()，中途异常 rollback()。'
      ] },

      { h: '3.12 常见追问' },
      { list: [
        '<b>问：JDBC 和 MyBatis 是什么关系？</b><br>答：MyBatis 封装了 JDBC：帮你管理连接与资源、设置参数、把 ResultSet 映射成对象，底层仍然是 JDBC 那五步。所以 JDBC 的常识在 MyBatis 里照样成立：连接关闭其实是归还连接池、占位符参数化才是防注入的关键、批量与事务边界仍由你决定。遇到 MyBatis 报错看不懂时，把 SQL 日志打开看它实际执行的语句和参数，问题往往就落在 JDBC 那一层。',
        '<b>问：为什么推荐 PreparedStatement 而不是 Statement？</b><br>答：参数化防注入是首要原因：SQL 结构先编译、值后绑定，用户输入永远只是数据，不会被当成语法；其次是类型处理更安全，日期、NULL、二进制都不用自己拼引号，可预编译复用执行计划，也免去了转义地狱。Statement 现在只在执行 DDL 或确实没有参数的固定语句时才用得上，业务查询里基本没有它的位置。',
        '<b>问：ResultSet 能不能回头再读一遍？</b><br>答：默认只能向前、只读，游标走过就回不去了。要滚动必须在创建 Statement 时指定 <code>TYPE_SCROLL_INSENSITIVE</code> 和 <code>CONCUR_READ_ONLY</code>，但这会把结果集整体缓存到客户端，大结果集会撑爆内存。正确做法是遍历一次就映射成对象或集合，后续在内存里处理；需要多轮扫描就查两次，或者一次查全再在集合里分组。',
        '<b>问：close() 之后池里的连接还能被别人用？</b><br>答：从池里拿到的 Connection 是包装对象，close() 只是把连接归还并重置状态（回滚未提交事务、清理会话变量），物理 TCP 连接并没有断，所以下一个借用者接手的确实是同一条连接。这解释了两件事：为什么忘了 close 会把池借空并在池满时报等待超时，以及为什么不能在连接上留未提交事务或临时表状态。',
        '<b>问：批量插入 1 万条，addBatch/executeBatch 与逐条相比差在哪？</b><br>答：差在网络往返和事务提交的次数：自动提交下逐条插入是 1 万次往返 + 1 万次提交（每次都刷盘）；整批包进一个事务后提交只剩 1 次，瓶颈变成 1 万次往返与日志写入，这才需要 addBatch/rewriteBatchedStatements 把往返也压下来，通常快一个数量级。必须关掉自动提交的场景是多表、互为前提的写入——中途失败不会留下半条数据，而 BatchUpdateException 的 updateCounts 只覆盖已成功的部分，需要自己判断补偿。批量也要分批提交，一次几十万条会把日志和内存顶爆。',
        '<b>问：数据库连接池越大越好吗？</b><br>答：不是。连接数受数据库最大连接数、CPU 核数、磁盘 IO 共同限制，连接过多反而增加上下文切换、锁竞争和内存占用，数据库端的活跃会话排队也会变长。经验起点是个位数到十几，再按压测中的等待时间调整，同时把超时、最大生命周期和泄漏检测配好。真正的瓶颈通常在某条慢 SQL，而不是池太小。'
      ] },

      { h: '3.13 自测与练习' },
      { p: '先自己动手做一遍，再展开参考答案对照预期现象与判断依据。' },
      { ol: [
        '用 <code>DriverManager</code> 从零跑通五步：取 Connection、prepareStatement、setXxx 绑参、executeQuery、遍历 ResultSet，并从结果集里取出三列打印。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">String url = "jdbc:h2:mem:lab";\nString sql = "SELECT id, title, price FROM book "\n    + "WHERE price > ?";\n\ntry (Connection c = DriverManager.getConnection(url);\n     PreparedStatement ps = c.prepareStatement(sql)) {\n  ps.setBigDecimal(1, new BigDecimal("50"));\n  try (ResultSet rs = ps.executeQuery()) {\n    while (rs.next()) {\n      System.out.printf("%d\\t%s\\t%s%n",\n          rs.getLong("id"),\n          rs.getString("title"),\n          rs.getBigDecimal("price"));\n    }\n  }\n}</pre><b>要点</b>：<code>getConnection</code> 拿不到连接会立刻抛 <code>SQLException</code>，不会拖到遍历时才报；取值用列名比用下标抗字段顺序变化；三个资源都交给 try-with-resources，异常路径同样会关。</div></details>',
        '把连接来源换成 HikariCP 连接池，同一段代码各跑一百次，把建连耗时打印出来对比；再故意漏掉 close()，观察池被借空时报的错。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">HikariConfig cfg = new HikariConfig();\ncfg.setJdbcUrl("jdbc:h2:mem:lab");\ncfg.setMaximumPoolSize(10);\ncfg.setConnectionTimeout(3000);\nHikariDataSource ds = new HikariDataSource(cfg);\n\nlong t0 = System.nanoTime();\nfor (int i = 0; i &lt; 100; i++) {\n  try (Connection c = ds.getConnection();\n       PreparedStatement ps =\n           c.prepareStatement("SELECT 1")) {\n    ps.executeQuery().close();\n  }\n}\nSystem.out.println("pool "\n    + (System.nanoTime() - t0) / 1_000_000 + "ms");\n\n// 故意漏掉 close：借满 10 个后第 11 次超时\nList&lt;Connection> leak = new ArrayList&lt;>();\nfor (int i = 0; i &lt; 11; i++) {\n  leak.add(ds.getConnection());   // 抛超时\n}</pre><b>要点</b>：直连每次都要 TCP 握手加认证，池化把这份成本摊销掉；池容量是硬上限，借出不还就再也借不到，第 11 次直接抛获取连接超时。打开 <code>leakDetectionThreshold</code> 能打出漏关的调用栈。</div></details>',
        '用 JDBC 完成一次带条件的查询，要求用 try-with-resources 关闭资源，并打印结果。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">String sql = "SELECT title, price FROM book "\n    + "WHERE price BETWEEN ? AND ? ORDER BY price";\n\ntry (Connection c = ds.getConnection();\n     PreparedStatement ps = c.prepareStatement(sql)) {\n  ps.setBigDecimal(1, new BigDecimal("50"));\n  ps.setBigDecimal(2, new BigDecimal("100"));\n  try (ResultSet rs = ps.executeQuery()) {\n    while (rs.next()) {\n      System.out.println(rs.getString("title") + " "\n          + rs.getBigDecimal("price"));\n    }\n  }\n}</pre><b>要点</b>：try-with-resources 按声明的逆序关闭，抛异常时同样会关，比 finally 里手写 close 更不容易漏；条件一律用占位符，绝不拼字符串；空结果集是正常业务状态，不该当成错误。</div></details>',
        '开事务做两表写入：A 表插主记录、B 表插明细，第二步故意抛异常，验证 rollback 后两张表都没留数据；再改成手动 commit 验证成功路径。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">try (Connection c = ds.getConnection()) {\n  c.setAutoCommit(false);\n  try {\n    try (PreparedStatement a = c.prepareStatement(\n             "INSERT INTO orders (id, amt) VALUES (?, ?)");\n         PreparedStatement b = c.prepareStatement(\n             "INSERT INTO order_item (oid, sku) "\n             + "VALUES (?, ?)")) {\n      a.setLong(1, 1001L);\n      a.setBigDecimal(2, new BigDecimal("99.00"));\n      a.executeUpdate();\n\n      b.setLong(1, 1001L);\n      b.setString(2, "SKU-1");\n      b.executeUpdate();\n\n      if (true) {\n        throw new IllegalStateException("第二步失败");\n      }\n      c.commit();\n    }\n  } catch (RuntimeException e) {\n    c.rollback();\n    throw e;\n  } finally {\n    c.setAutoCommit(true);\n  }\n}</pre><b>要点</b>：两条 INSERT 必须在同一事务里，中途失败要整体撤销，否则主记录变成没有明细的孤儿；提交前别的连接看不到未提交的写入，验证要用另一个连接查；finally 里恢复 <code>setAutoCommit(true)</code> 再归还，别把脏状态还给连接池。</div></details>',
        '用 addBatch/executeBatch 插一万条，与逐条插入比耗时；再把一组互为前提的 SQL 关掉自动提交后批量执行，确认中途失败时 updateCounts 只覆盖已成功的部分。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">String sql = "INSERT INTO t (id, v) VALUES (?, ?)";\nlong t0 = System.nanoTime();\ntry (Connection c = ds.getConnection();\n     PreparedStatement ps = c.prepareStatement(sql)) {\n  c.setAutoCommit(false);\n  try {\n    for (int i = 1; i &lt;= 10000; i++) {\n      ps.setInt(1, i);\n      ps.setString(2, "v" + i);\n      ps.addBatch();\n      if (i % 1000 == 0) {\n        ps.executeBatch();\n        ps.clearBatch();\n      }\n    }\n    c.commit();\n  } catch (BatchUpdateException e) {\n    c.rollback();\n    System.out.println("已执行 "\n        + e.getUpdateCounts().length + " 条");\n  }\n}\nSystem.out.println((System.nanoTime() - t0) / 1_000_000);</pre><b>要点</b>：批量把多次往返合成一次，失败后驱动不再执行剩余语句，<code>getUpdateCounts()</code> 的长度只反映已执行的语句；整批包在事务里才保证「要么全成要么全不成」，只批量不开事务时前面的插入早已各自提交。</div></details>'
      ] }
    ]
  };

  T['prepared-transaction'] = {
    meta: '本章约 8100 字 · 建议 35 分钟 · PreparedStatement 与事务 + 6 段示例',
    blocks: [
      { h: '4.1 为什么学：一条 SQL 的两条命' },
      { p: '上一章学会了用 JDBC 查数据。但真实系统里，SQL 不只是“查出来看看”，它还要接受用户输入、修改多张表、保证要么全成功要么全失败。这两件事各自对应一个高频事故：SQL 注入和事务失控。前者会让攻击者读走整张用户表，后者会让钱转了一半就卡住。' },
      { p: 'SQL 注入的根源是“把数据当成了代码”。当用户输入被直接拼进 SQL 字符串，输入里的引号、OR、注释符就会改变语句结构，原本的查询条件被绕过。PreparedStatement 的做法是把 SQL 结构和参数值分开传输：结构先编译，参数只作为值填入，永远不参与语法解析。这不是“过滤敏感字符”，而是从机制上让注入不可能发生。' },
      { p: '事务要解决的是“一组操作要么全做、要么全不做”。转账扣款和入账必须同时成功；下单扣库存和创建订单必须一致；如果中间任何一步失败，前面已经执行的修改必须撤销。JDBC 默认是自动提交，每条 SQL 执行完立即生效，这种模式下根本无法保证一组操作的原子性，必须手动关掉自动提交。' },
      { note: '<b>一句话记住本章：</b>PreparedStatement 管“这条 SQL 安不安全”，事务管“这组 SQL 完不完整”。两者都是数据访问层的底线，不是可选优化。' },

      { h: '4.2 SQL 注入是怎么发生的' },
      { p: '先看一段“能跑但危险”的登录代码。它把用户名和密码直接拼进 SQL，然后用 Statement 执行：' },
      { lang: 'java', code: 'String sql = "SELECT id, name FROM users WHERE name = \'"\n        + name + "\' AND password = \'" + password + "\'";\nStatement st = conn.createStatement();\nResultSet rs = st.executeQuery(sql);\nif (rs.next()) {\n    System.out.println("登录成功: " + rs.getString("name"));\n}', title: 'UnsafeLogin.java' },
      { p: '正常输入没有问题。但如果用户在密码框里输入 <code>\' OR \'1\'=\'1</code>，拼出来的 SQL 就变成：<code>SELECT ... WHERE name = \'张三\' AND password = \'\' OR \'1\'=\'1\'</code>。由于 OR 的优先级，后半段恒为真，整条语句匹配所有用户，攻击者不需要知道密码就能登录。如果输入里再加 <code>; DROP TABLE users; --</code>，在允许一次执行多条语句的驱动配置下，后果更严重。' },
      { p: '注入的入口不只有登录框。凡是把外部输入拼进 SQL 的地方都危险：搜索关键词、排序字段、表名、IN 列表、LIKE 模式。排序字段和表名无法用占位符参数化，必须用白名单校验，只允许预先枚举的值，绝不能直接拼接。' },
      { list: [
        '<b>数字型注入：</b><code>WHERE id = </code> 直接拼数字，输入 <code>1 OR 1=1</code> 即可绕过。',
        '<b>字符型注入：</b>输入带单引号闭合字符串，再追加 OR 条件。',
        '<b>盲注：</b>页面不回显数据，攻击者通过“真假条件导致页面差异”逐位猜数据。',
        '<b>二次注入：</b>恶意数据先被存进库，之后在另一处拼接使用时触发；存储层过滤不等于安全。'
      ] },

      { h: '4.3 PreparedStatement 的预编译与占位符' },
      { p: 'PreparedStatement 用问号 <code>?</code> 作为占位符，SQL 模板先交给数据库（或驱动）编译，参数随后单独绑定。因为参数在语法解析阶段根本不存在，所以无论参数里是单引号、注释符还是 OR，都只会被当成一个普通字符串值。' },
      { lang: 'java', code: 'String sql = "SELECT id, name FROM users WHERE name = ? AND password = ?";\ntry (PreparedStatement ps = conn.prepareStatement(sql)) {\n    ps.setString(1, name);\n    ps.setString(2, password);\n    try (ResultSet rs = ps.executeQuery()) {\n        if (rs.next()) {\n            System.out.println("登录成功: " + rs.getString("name"));\n        }\n    }\n}', title: 'SafeLogin.java' },
      { p: '现在即使用户输入 <code>\' OR \'1\'=\'1</code>，它也只是被当作密码字段的字面值去比较，匹配不到任何记录。代码没有做任何“过滤”，安全来自协议设计。' },
      { p: '关于“预编译”要说清楚一点：PreparedStatement 在客户端一定做了参数分离，但服务端是否真的缓存了执行计划，取决于驱动和数据库。MySQL 默认在客户端做转义和拼接（<code>useServerPrepStmts=false</code>），开启服务端预编译需要显式配置。不过无论哪种模式，注入都已被杜绝，预编译复用只是额外收益。' },
      { note: '<b>常见误解：</b>“用了 PreparedStatement 就绝对安全。”如果 SQL 里仍用字符串拼接表名、列名或 ORDER BY 方向，注入依然存在，因为这些位置不能使用占位符。' },

      { h: '4.4 参数绑定：下标、类型与 null' },
      { p: '参数下标从 1 开始，按占位符出现的顺序编号。同一个占位符如果要使用两次，就要写两个问号、绑定两次；JDBC 不支持命名参数，这是它和 MyBatis 的一个明显区别。绑定方法要和数据库类型对应，选错类型可能导致隐式转换、索引失效，甚至报错。' },
      { table: { head: ['Java 类型', '绑定方法', '对应 SQL 类型'], rows: [
        ['int / long', 'setInt / setLong', 'INT / BIGINT'],
        ['String', 'setString', 'VARCHAR / CHAR / TEXT'],
        ['BigDecimal', 'setBigDecimal', 'DECIMAL / NUMERIC'],
        ['boolean', 'setBoolean', 'BOOLEAN / TINYINT(1)'],
        ['LocalDate', 'setObject', 'DATE'],
        ['LocalDateTime', 'setObject', 'DATETIME / TIMESTAMP'],
        ['null', 'setNull(index, Types.XXX)', '任意可空列']
      ] } },
      { p: '金额必须用 <code>setBigDecimal</code>，不要用 <code>setDouble</code>；时间优先用 Java 8 的 <code>java.time</code> 类型配合 <code>setObject</code>，比 <code>java.sql.Date</code> 更清晰。传 null 时不能直接 <code>setString(1, null)</code> 了事，规范写法是 <code>setNull(1, Types.VARCHAR)</code>，让驱动知道该用什么类型；某些数据库对“无类型的 NULL”会报错。' },
      { lang: 'java', code: 'ps.setLong(1, userId);\nps.setBigDecimal(2, new BigDecimal("99.90"));\nps.setObject(3, LocalDateTime.now());\nps.setNull(4, Types.VARCHAR);\nps.setString(5, "%" + keyword + "%");   // LIKE 的通配符由参数携带', title: 'BindParams.java' },
      { p: '最后一行值得展开：LIKE 查询的正确写法是 <code>WHERE name LIKE ?</code>，然后把 <code>"%" + keyword + "%"</code> 作为参数传进去。这样通配符是值的一部分，不会破坏 SQL 结构；同时也说明为什么 LIKE 以 % 开头会全表扫描——这是索引问题，不是安全问题，两者要分开考虑。' },
      { p: '绑参第一件事是数清问号。SQL 里几个问号就绑几次，少一个报 <code>No value specified</code>，多一个报 <code>Parameter index out of range</code>。同一个 PreparedStatement 执行第二次前要 <code>clearParameters</code>，否则没重新绑的位置会残留上一次的值，表现为“偶尔用了旧条件”，这种 bug 在单测里几乎复现不了。' },
      { p: '类型要贴合列定义。给 DECIMAL 列 <code>setDouble</code>，驱动会把二进制浮点转成十进制，0.1 可能变成 0.100000000000000005；给 DATETIME 列 <code>setString</code>，能否成功取决于数据库的宽松模式，换一个库就不可靠。金额用 <code>setBigDecimal</code>，时间用 <code>setObject(LocalDateTime)</code>，让类型在编译期对齐。' },
      { p: 'null 必须带类型。<code>setString(1, null)</code> 在部分驱动上能按 VARCHAR 处理，列是 DATE 时却可能报错；规范写法是 <code>setNull(1, Types.DATE)</code>。这一条和“参数个数要对”一样，属于写完就该检查的机械项。' },

      { h: '4.5 executeUpdate、executeQuery 与批量操作' },
      { p: 'PreparedStatement 有三个执行方法，用途不同：<code>executeQuery</code> 只用于 SELECT，返回 ResultSet；<code>executeUpdate</code> 用于 INSERT、UPDATE、DELETE，返回受影响行数；<code>execute</code> 返回 boolean，适合事先不知道语句类型的场景，比如动态 SQL 或调用存储过程。用错方法会直接抛异常，比如对 SELECT 调 executeUpdate。' },
      { p: '受影响行数是一个重要的校验点。更新订单状态时，如果返回 0，说明没有匹配的记录，可能是订单号错了，也可能是状态已经被别人改过。乐观锁就是利用这一点实现的：<code>UPDATE orders SET status = ? WHERE id = ? AND status = ?</code>，返回 0 就表示更新失败，需要重试或提示。' },
      { lang: 'java', code: 'String sql = "INSERT INTO orders (user_id, amount, status) VALUES (?, ?, ?)";\ntry (PreparedStatement ps = conn.prepareStatement(sql)) {\n    for (Order o : orders) {\n        ps.setLong(1, o.getUserId());\n        ps.setBigDecimal(2, o.getAmount());\n        ps.setString(3, o.getStatus());\n        ps.addBatch();\n    }\n    int[] result = ps.executeBatch();\n    System.out.println("影响行数: " + Arrays.toString(result));\n}', title: 'BatchInsert.java' },
      { p: '批量操作把多条语句攒起来一次发送，减少了网络往返，插入一万条数据时差距可能是几十倍。批量大小要控制，几百到几千比较稳妥；太大容易长时间持锁、占用大量内存。批量执行默认不在一个事务里，要保证全成或全败，仍需配合下一节的事务控制。' },
      { p: '插入后要拿自增主键，创建语句时加 <code>Statement.RETURN_GENERATED_KEYS</code>，执行后从 <code>getGeneratedKeys()</code> 读。批量插入时不是所有驱动都支持逐条返回主键，需要看驱动文档，必要时改成逐条插入或先在应用层生成 ID（如雪花算法）。' },

      { h: '4.6 事务与 ACID' },
      { p: '事务（Transaction）是一组要么全部成功、要么全部失败的操作。最经典的例子是转账：A 账户扣 100，B 账户加 100，两步必须同时生效。如果扣款成功、入账失败，钱就凭空消失了；如果扣款失败、入账成功，钱就凭空多出来。事务就是用来消除这种中间状态的。' },
      { p: '事务有四个特性，合称 ACID。原子性（Atomicity）指事务内的操作不可分割，要么全提交，要么全回滚；一致性（Consistency）指事务前后数据满足业务约束，比如转账前后总金额不变；隔离性（Isolation）指并发事务之间互不干扰，程度由隔离级别决定；持久性（Durability）指提交后的数据即使断电也不丢，靠日志和刷盘保证。' },
      { table: { head: ['特性', '含义', '靠什么保证'], rows: [
        ['原子性 A', '要么全做，要么全不做', 'undo log 回滚'],
        ['一致性 C', '数据满足约束与业务规则', '约束、触发器、应用校验'],
        ['隔离性 I', '并发事务互不干扰', '锁 + MVCC，隔离级别控制'],
        ['持久性 D', '提交后不丢', 'redo log、刷盘、副本']
      ] } },
      { p: '需要强调的是，数据库只能保证“事务内”的一致性，业务规则仍然要靠代码把关。比如转账金额不能为负、账户必须存在，这些检查要放在事务里、更新之前完成，否则事务提交了才发现数据不合法，回滚也救不回来。' },

      { h: '4.7 JDBC 事务：三行代码与边界画在哪一层' },
      { p: 'JDBC 的 Connection 默认 <code>autoCommit = true</code>，每条 SQL 执行完立刻提交。开启事务只需要一行：<code>conn.setAutoCommit(false)</code>。此后所有语句都在同一个事务里，直到调用 <code>commit()</code> 提交，或 <code>rollback()</code> 回滚。' },
      { flow: ['setAutoCommit(false)', '执行多条 SQL', '全部成功 commit()', '任一步失败 rollback()', '恢复 autoCommit 并归还连接'] },
      { lang: 'java', code: 'Connection conn = null;\ntry {\n    conn = dataSource.getConnection();\n    conn.setAutoCommit(false);          // 开启事务\n\n    try (PreparedStatement out = conn.prepareStatement(\n            "UPDATE account SET balance = balance - ? WHERE id = ? AND balance >= ?")) {\n        out.setBigDecimal(1, amount);\n        out.setLong(2, fromId);\n        out.setBigDecimal(3, amount);\n        if (out.executeUpdate() != 1) {\n            throw new IllegalStateException("余额不足或账户不存在");\n        }\n    }\n\n    try (PreparedStatement in = conn.prepareStatement(\n            "UPDATE account SET balance = balance + ? WHERE id = ?")) {\n        in.setBigDecimal(1, amount);\n        in.setLong(2, toId);\n        if (in.executeUpdate() != 1) {\n            throw new IllegalStateException("收款账户不存在");\n        }\n    }\n\n    conn.commit();                      // 两步都成功才提交\n} catch (SQLException | RuntimeException e) {\n    if (conn != null) {\n        try {\n            conn.rollback();            // 任一步失败整体回滚\n        } catch (SQLException ex) {\n            e.addSuppressed(ex);\n        }\n    }\n    throw e;\n} finally {\n    if (conn != null) {\n        try {\n            conn.setAutoCommit(true);   // 恢复默认，避免影响后续使用\n            conn.close();\n        } catch (SQLException ignored) {\n        }\n    }\n}', title: 'TransferService.java' },
      { p: '这段模板有几个关键点。第一，扣款 SQL 带了 <code>AND balance &gt;= ?</code>，把“余额是否足够”的判断交给数据库，避免先查后改之间的并发漏洞。第二，每一步都检查 <code>executeUpdate()</code> 的返回值，不等于 1 就主动抛异常，触发回滚。第三，catch 里先 rollback 再抛出，保证调用方知道失败。第四，finally 里恢复 autoCommit，因为连接可能来自连接池，状态会被下一个使用者继承。' },
      { p: '边界应该画在“一个业务用例”上。Service 方法开始时开启，方法结束前提交，中间所有 DAO 调用共享同一个连接。DAO 只写 SQL，不碰 commit；错误写法是在 DAO 里提交，Service 想把两个 DAO 调用组合成一个事务时，第一个已经落库，第二个失败也回滚不了。' },
      { p: '连接必须显式传递。同一事务的多条 SQL 要走同一个 Connection，如果每个 DAO 方法都从池里拿新连接，它们根本不在一个事务里。这也是框架把连接绑定到线程的原因：同一个线程里拿到的永远是同一条连接。' },
      { p: '传播行为解决“事务方法调用事务方法”。<code>REQUIRED</code> 是默认值，有事务就加入、没有就新建；<code>REQUIRES_NEW</code> 挂起外层、开独立事务，适合“外层失败也要留下”的流水；<code>NESTED</code> 用保存点，内层回滚不影响外层。选错的典型后果是日志跟着业务一起回滚，或者内层失败把外层一起拖死。' },

      { h: '4.8 提交、回滚与异常处理' },
      { p: 'commit 和 rollback 都可能抛 SQLException。提交失败通常意味着连接断了或数据库异常，此时事务状态不确定，不能假设“没提交就等于回滚了”，应该记录日志并让上层决定是否重试。回滚失败更麻烦，连接可能已经不可用，正确做法是丢弃这个连接（关闭并让池子重新创建），而不是继续使用。' },
      { p: '什么异常该回滚？原则是：任何导致业务不完整的异常都应该回滚，包括受检异常。JDBC 层面没有框架的自动规则，所以 catch 的范围要覆盖所有可能中断流程的异常。使用 Spring 的 <code>@Transactional</code> 时则要注意：默认只有 RuntimeException 和 Error 才回滚，受检异常需要显式写 <code>rollbackFor = Exception.class</code>。' },
      { p: '还有两个高级能力：保存点（Savepoint）和只读事务。保存点允许在一个事务内部设置标记，回滚到某个标记而不撤销整个事务，适合“批量处理中允许部分失败”的场景；只读事务通过 <code>conn.setReadOnly(true)</code> 声明，数据库可以做针对性优化，也防止误写。' },
      { lang: 'java', code: 'conn.setAutoCommit(false);\nSavepoint sp = conn.savepoint();\ntry {\n    insertOrder(conn, order);\n} catch (SQLException e) {\n    conn.rollback(sp);          // 只撤销这一段，前面的操作保留\n    log.warn("订单写入失败，跳过", e);\n}\nconn.commit();', title: 'SavepointDemo.java' },
      { note: '<b>事务要短：</b>不要在事务里调用远程接口、发消息、等用户输入、跑大循环。事务持有锁的时间越长，其他事务等待越久，死锁概率越高。' },

      { h: '4.9 隔离级别与并发问题' },
      { p: '并发事务会互相影响，典型问题有三个。脏读：事务 A 读到了事务 B 尚未提交的修改，B 回滚后 A 读到的就是不存在的数据。不可重复读：事务 A 内两次读同一行，结果不同，因为 B 在中间提交了更新。幻读：事务 A 两次按同一条件查询，第二次多出了 B 新插入的行，像幻觉一样。' },
      { p: 'SQL 标准定义了四个隔离级别，从低到高依次解决上述问题，但并发度也依次下降。级别越高，锁越多、等待越久、吞吐越低，所以不是越高越好，要按业务选择。' },
      { table: { head: ['隔离级别', '脏读', '不可重复读', '幻读', '典型使用'], rows: [
        ['READ UNCOMMITTED', '可能', '可能', '可能', '几乎不用，仅日志类场景'],
        ['READ COMMITTED', '避免', '可能', '可能', 'Oracle、PostgreSQL 默认'],
        ['REPEATABLE READ', '避免', '避免', '标准允许，InnoDB 基本避免', 'MySQL 默认'],
        ['SERIALIZABLE', '避免', '避免', '避免', '强一致、对账类操作']
      ] } },
      { p: 'MySQL 的 InnoDB 在 REPEATABLE READ 下通过 MVCC（多版本并发控制）让同一事务的多次读看到同一个快照，并用间隙锁（gap lock）阻止其他事务在范围内插入，因此在很多场景下连幻读也能避免。但这不等于可以随意依赖，涉及跨表约束时仍要显式加锁或提升隔离级别。' },
      { p: '在 JDBC 里设置隔离级别用 <code>conn.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ)</code>，必须在事务开始前设置。连接池会复用连接，隔离级别是连接级状态，用完要恢复，否则下一个借到这条连接的业务会莫名其妙地“变慢”或“看到旧数据”。HikariCP 默认会在归还时重置这些状态，自己管理连接时则要手动处理。' },

      { h: '4.10 锁、死锁与重试' },
      { p: 'InnoDB 的行锁是加在索引上的。如果 WHERE 条件没有走索引，锁会退化成表锁，这是很多“莫名其妙锁全表”的根源。所以更新语句一定要走索引，并且尽量用主键或唯一键定位，锁的范围最小。' },
      { p: '死锁发生在两个事务以相反顺序申请同一组锁时：事务 A 锁了行 1 等行 2，事务 B 锁了行 2 等行 1，双方都不释放，数据库只能检测并回滚其中一个。避免死锁的办法是统一加锁顺序：批量更新时按主键排序，多表操作时按固定表顺序，减少交叉持锁。真发生了死锁，捕获异常后重试通常是可行的。' },
      { list: [
        '<b>先查后改的竞态：</b>查余额判断够不够，再更新，两个请求可能都通过；用条件更新或 SELECT ... FOR UPDATE。',
        '<b>事务里做远程调用：</b>网络超时可能几秒，锁一直不释放；把远程调用移到事务外。',
        '<b>大事务：</b>一次更新十万行，undo log 膨胀、锁等待严重；拆成小批次提交。',
        '<b>嵌套事务误用：</b>以为内层 rollback 只回滚内层，实际可能把外层一起标记为回滚。'
      ] },
      { p: '死锁和锁等待超时要分开处理。死锁（MySQL 1213）是数据库主动回滚一方，重试通常能成功；锁等待超时（1205）是等太久主动放弃，说明有长事务或热点行，重试前要先找到持锁的人。无脑重试死锁可以，无脑重试超时只会放大问题。' },
      { p: '重试要满足三个条件：操作幂等、次数有上限、每次之间有短暂退避。转账如果已经提交但客户端超时，重试会重复扣款，必须靠唯一请求号去重，而不是靠“再试一次”。' },
      { p: '乐观锁和悲观锁的选择，本质看冲突概率。冲突少，用版本号条件更新，失败就重试，不占锁；冲突多，用 <code>SELECT ... FOR UPDATE</code> 直接排队，避免大量重试空转。两者都不解决“事务太长”，只是把等待换了位置。' },

      { h: '4.11 长事务：危害与拆法' },
      { p: '判断事务是否过长，可以看三个指标：事务持续时间、持有锁数量、undo log 增长量。生产上建议给事务加超时（<code>conn.setNetworkTimeout</code> 或数据库的 innodb_lock_wait_timeout），让异常尽早暴露，而不是无限等待。' },
      { p: '长事务有四个可见危害：undo log 持续膨胀、锁持有时间长、主从延迟变大、连接被长期占用。判断可以量化：单事务超过一秒要审视，超过十秒基本要拆。' },
      { p: '拆法有三种。把远程调用、发消息、生成文件挪到事务外，先落本地状态，再用补偿或消息推进；把十万行的大更新按主键区间分批，每批几千行单独提交；把“先查后改”改成一条带条件的更新，减少事务里的往返次数。' },

      { h: '4.12 分页、批量与一致性' },
      { p: '深分页的 <code>LIMIT offset</code> 越大越慢，因为数据库要数过前面所有行。改成 <code>WHERE id &gt; 上一页最后一个 id ORDER BY id LIMIT 20</code>，每页都是索引定位，代价稳定。前提是排序字段唯一且有序，否则要用排序值加 id 的组合游标。' },
      { p: '同一事务里翻页看到的是同一个快照，但页与页之间若有新数据插入，结果仍可能重复或漏行。对一致性要求高的导出，用一次性快照读，或按主键游标从头到尾推进，不要用 offset 分页。' },
      { p: '批量提交的批次大小要实测。批次太小，网络往返多；太大，锁等待和内存压力上升，失败回滚的成本也高。常见起点是五百到一千条，并给整批加一个总超时。' },
      { p: '批量更新撞上唯一键冲突时，整批不会静默跳过，而是抛异常并中断后面的语句。想“跳过重复、继续处理”，要么逐条 try-catch（慢），要么用 <code>INSERT ... ON DUPLICATE KEY UPDATE</code>，要么先把数据按唯一键去重再批处理。注意 <code>INSERT IGNORE</code> 会把其他错误一起吞掉，只适合确实能忽略的场景。' },
      { p: '分页查询常配一个总数查询，<code>COUNT(*)</code> 在条件复杂时可能比列表本身还慢。大表可以把总数换成“是否有下一页”的判断：多查一条，看能不能取到第 21 条。前端非要精确总数时，再单独维护统计表或缓存，别让每次翻页都扫一遍。' },

      { h: '4.13 常见坑、排查顺序与收尾硬规则' },
      { list: [
        '<b>忘记 setAutoCommit(false)：</b>每条 SQL 自动提交，rollback 不起作用；事务代码第一行就要关自动提交。',
        '<b>rollback 写在 finally：</b>成功时也回滚；应该放在 catch 里，只有失败才回滚。',
        '<b>只捕获 SQLException：</b>业务校验抛的 RuntimeException 没触发回滚；catch 要覆盖所有中断流程的异常。',
        '<b>连接池归还前没恢复状态：</b>autoCommit 或隔离级别被下一个使用者继承；finally 里恢复或依赖池的重置。',
        '<b>PreparedStatement 拼接表名：</b>占位符不能用于标识符，拼接就有注入风险；用白名单枚举。',
        '<b>批量执行没包事务：</b>中途失败留下半批数据；批量 + 事务要一起用。'
      ] },
      { p: '排查事务问题有一套顺序：先确认 autoCommit 是否真的关了（打日志或断点看 Connection 状态），再看异常有没有被吞掉，然后确认异常类型是否触发回滚，最后检查连接是否来自池、状态是否被复用污染。多数“事务不生效”都能在这四步里找到答案。' },
      { p: '事务里不要 catch 了异常还继续执行。吞掉异常后继续跑，事务可能已被数据库标记为只能回滚，后面的语句要么报错，要么在提交时才发现整个事务被回滚。要么明确知道可以继续，要么立刻抛出。' },
      { p: '还有三条：不在事务里等待用户输入或调用外部接口；不在事务里做全表扫描；提交或回滚之后不要再复用这条连接做业务操作。这三条守住，绝大多数事务事故可以避免。' },

      { h: '4.14 本章小结' },
      { list: [
        'SQL 注入源于把数据拼进语句结构；PreparedStatement 用占位符把结构和值分开，从机制上杜绝注入。',
        '参数下标从 1 开始；金额用 setBigDecimal，null 用 setNull 并指定类型。',
        'executeQuery 用于查询、executeUpdate 用于增删改并返回影响行数，批量用 addBatch/executeBatch。',
        'JDBC 默认自动提交；setAutoCommit(false) 开启事务，成功 commit，失败 rollback，finally 恢复状态。',
        'ACID 保证事务可靠；隔离级别在一致性与并发之间取舍，事务要短、更新要走索引。'
      ] },

      { h: '4.15 常见追问' },
      { list: [
        '<b>问：PreparedStatement 比 Statement 快吗？</b><br>答：不一定。它的首要价值是安全与类型处理，性能只是附带好处：能否复用执行计划取决于驱动和数据库配置，服务端预编译在某些连接池参数下会被关掉，甚至可能更慢。真正稳定变快的地方在批量——同一语句绑不同参数连续执行，省掉的是解析与往返。所以选它别拿性能当理由，理由是参数化防注入和不必手写转义。',
        '<b>问：为什么 MySQL 默认隔离级别是 REPEATABLE READ？</b><br>答：因为 InnoDB 的 MVCC 在这个级别上表现最好：同一事务内多次读的结果一致，读不加锁，写只锁必要的行，读多写少的业务几乎不用为一致性付锁的代价。常见解释是早期 STATEMENT 格式 binlog 依赖 RR 的加锁行为保证从库重放一致，这个理由在 5.7 之后已弱化；现在更实际的理由是 InnoDB 的 MVCC 在 RR 下给出稳定快照读，与行锁/间隙锁配合能挡住大部分并发异常，MySQL 也就一直没改默认值。代价是范围查询会加间隙锁，更容易死锁，所以高并发写入的场景常被建议降到 READ COMMITTED。',
        '<b>问：rollback 之后连接还能用吗？</b><br>答：通常可以：事务被撤销，连接本身仍然有效，可以继续执行新语句，池化环境下归还时也会自动回滚。但如果回滚本身失败、或者异常属于通信类错误（连接被重置、服务端断开），说明连接可能已经损坏，必须关闭重建，别放回池里。判断方法是看异常类型：业务异常回滚后继续用，IO 类或 SQLState 以 08 开头的错误直接丢弃连接。',
        '<b>问：事务和锁是什么关系？</b><br>答：事务是逻辑单位，锁是实现隔离的手段。事务在读写行时按隔离级别加锁，并持锁到提交或回滚，持锁时间越长，其他会话等待越久、死锁概率越高。所以优化事务的第一步永远是缩短它：把远程调用、文件操作、用户交互挪到事务外面，只包住必须原子的那几条 SQL。锁是结果，不是目的。',
        '<b>问：Spring 的 @Transactional 和手写 JDBC 事务冲突吗？</b><br>答：不要混用。框架已经通过代理接管了连接的获取、提交与回滚，方法里再 <code>setAutoCommit(false)</code> 或手动 commit 会破坏它的状态机：可能出现外层以为提交了、内层其实没有，或者连接归还时还带着未提交事务。要么统一交给 @Transactional，要么整段手写，别在同一个调用链里两套并用；确需细粒度控制就用 TransactionTemplate。',
        '<b>问：分布式事务怎么办？</b><br>答：单库事务解决不了跨服务一致性。按业务容忍度选方案：能接受最终一致就用本地消息表或事务消息加幂等消费；需要较强一致且流程短可用 TCC，但要写 Try/Confirm/Cancel 三套逻辑和补偿；长流程用 Saga，把每一步的补偿动作定义清楚。两阶段提交强一致但性能和可用性代价大，很少作为首选。关键是幂等与补偿，不是选一个听起来最强的名词。'
      ] },

      { h: '4.16 自测与练习' },
      { p: '先自己动手做一遍，再展开参考答案对照预期现象与判断依据。' },
      { ol: [
        '写一段存在 SQL 注入漏洞的登录代码，构造输入绕过它，再用 PreparedStatement 修复并验证。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">// 漏洞写法：用户输入被拼成 SQL 语法\nString sql = "SELECT id FROM users WHERE name=\'"\n    + name + "\' AND pwd=\'" + pwd + "\'";\ntry (Connection c = ds.getConnection();\n     Statement st = c.createStatement();\n     ResultSet rs = st.executeQuery(sql)) {\n  if (rs.next()) { /* 登录成功 */ }\n}\n// 输入 name = a\' OR \'1\'=\'1  pwd = x\n// 拼出来的条件变成 name=\'a\' OR \'1\'=\'1\' AND pwd=\'x\'\n// 条件恒真，不需要密码就登录成功\n\n// 修复写法：结构先编译，输入只当值\nString fix = "SELECT id FROM users "\n    + "WHERE name = ? AND pwd = ?";\ntry (Connection c = ds.getConnection();\n     PreparedStatement ps = c.prepareStatement(fix)) {\n  ps.setString(1, name);\n  ps.setString(2, pwd);\n  try (ResultSet rs = ps.executeQuery()) {\n    if (rs.next()) { /* 同样输入查不到人 */ }\n  }\n}</pre><b>要点</b>：占位符让语句结构先被编译固定，<code>a\' OR \'1\'=\'1</code> 只作为一个普通字符串值去比对，永远不参与语法解析；两种输入各跑一次，对比日志里最终执行的 SQL 就能看出差别。</div></details>',
        '实现转账事务：任一步失败都回滚，余额不足时抛业务异常，并用两个线程验证不会超扣。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">final class InsufficientException\n    extends RuntimeException {\n  InsufficientException(String m) { super(m); }\n}\n\nvoid transfer(long from, long to, BigDecimal amt)\n    throws SQLException {\n  try (Connection c = ds.getConnection()) {\n    c.setAutoCommit(false);\n    try {\n      // 条件更新：影响行数为 0 就是余额不足\n      try (PreparedStatement ps = c.prepareStatement(\n               "UPDATE acct SET bal = bal - ? "\n               + "WHERE id = ? AND bal >= ?")) {\n        ps.setBigDecimal(1, amt);\n        ps.setLong(2, from);\n        ps.setBigDecimal(3, amt);\n        if (ps.executeUpdate() == 0) {\n          throw new InsufficientException("余额不足");\n        }\n      }\n      try (PreparedStatement ps = c.prepareStatement(\n               "UPDATE acct SET bal = bal + ? "\n               + "WHERE id = ?")) {\n        ps.setBigDecimal(1, amt);\n        ps.setLong(2, to);\n        ps.executeUpdate();\n      }\n      c.commit();\n    } catch (RuntimeException e) {\n      c.rollback();\n      throw e;\n    } finally {\n      c.setAutoCommit(true);\n    }\n  }\n}\n\n// 两个线程各转 100 次，总额必须守恒\nExecutorService pool = Executors.newFixedThreadPool(2);\nfor (int i = 0; i &lt; 200; i++) {\n  pool.submit(() -> {\n    try {\n      transfer(1L, 2L, new BigDecimal("1"));\n    } catch (SQLException e) {\n      throw new RuntimeException(e);\n    }\n  });\n}</pre><b>要点</b>：余额判断交给 <code>UPDATE ... WHERE bal &gt;= ?</code> 的条件更新，影响行数为 0 才抛业务异常——先 SELECT 再判断会留下窗口；两条 UPDATE 必须同事务且加锁顺序一致，否则并发下要么超扣要么死锁。</div></details>',
        '把一千条插入改成批量执行，比较耗时；再包上事务，验证中途失败时数据不会残留。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">static final String SQL =\n    "INSERT INTO t (id, v) VALUES (?, ?)";\n\nlong run(boolean batch, boolean tx) throws SQLException {\n  long t0 = System.nanoTime();\n  try (Connection c = ds.getConnection();\n       PreparedStatement ps = c.prepareStatement(SQL)) {\n    if (tx) {\n      c.setAutoCommit(false);\n    }\n    for (int i = 1; i &lt;= 1000; i++) {\n      ps.setInt(1, i);\n      ps.setString(2, "v" + i);\n      if (batch) {\n        ps.addBatch();\n      } else {\n        ps.executeUpdate();\n      }\n    }\n    if (batch) {\n      ps.executeBatch();\n    }\n    if (tx) {\n      c.commit();\n    }\n  }\n  return (System.nanoTime() - t0) / 1_000_000;\n}\n\nSystem.out.println("逐条 " + run(false, false) + "ms");\nSystem.out.println("批量 " + run(true, true) + "ms");\n\n// 换一张空表，让第 500 条撞已有主键\ntry (Connection c = ds.getConnection();\n     Statement s = c.createStatement()) {\n  s.executeUpdate("CREATE TABLE IF NOT EXISTS t2 "\n      + "(id INT PRIMARY KEY, v VARCHAR(20))");\n  s.executeUpdate("DELETE FROM t2");\n  s.executeUpdate("INSERT INTO t2 VALUES (1, \'pre\')");\n}\n\ntry (Connection c = ds.getConnection()) {\n  c.setAutoCommit(false);\n  try (PreparedStatement ps = c.prepareStatement(\n           "INSERT INTO t2 (id, v) VALUES (?, ?)")) {\n    for (int i = 1; i &lt;= 1000; i++) {\n      ps.setInt(1, i == 500 ? 1 : i + 1000);   // 撞键\n      ps.setString(2, "v" + i);\n      ps.addBatch();\n    }\n    ps.executeBatch();\n    c.commit();\n  } catch (SQLException e) {\n    c.rollback();\n    System.out.println("失败在批次中间");\n  }\n}\n// 只剩预置那 1 行：前 499 条已执行的也没留下\nSystem.out.println(countOf("t2"));   // 1</pre><b>要点</b>：批量省的是往返次数，事务保的是「要么全成要么全不成」，两者不能互相替代——只批量不开事务时前 499 条早已各自提交，回滚也留得下残留；建表和清表要在事务外做，H2 的 DDL 会隐式提交，放在事务里会把回滚点冲掉。耗时用 <code>System.nanoTime()</code> 包住整段，跑三次取中位数。</div></details>',
        '设置不同的隔离级别，用两个连接复现脏读、不可重复读，记录各自的现象。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">BigDecimal read(Connection c) throws SQLException {\n  try (Statement s = c.createStatement();\n       ResultSet r = s.executeQuery(\n           "SELECT bal FROM acct WHERE id = 1")) {\n    r.next();\n    return r.getBigDecimal(1);\n  }\n}\n\nvoid show(int level, String name) throws SQLException {\n  try (Connection a = ds.getConnection();\n       Connection b = ds.getConnection()) {\n    a.setTransactionIsolation(level);\n    b.setTransactionIsolation(level);\n    a.setAutoCommit(false);\n    b.setAutoCommit(false);\n    try (Statement s = a.createStatement()) {\n      s.executeUpdate("UPDATE acct SET bal = 999 "\n          + "WHERE id = 1");\n    }\n    // 未提交时 B 读到的值：脏读就在这一行露出来\n    System.out.println(name + " 未提交读到: " + read(b));\n    BigDecimal first = read(b);\n    a.commit();\n    System.out.println(name + " 首次读到: " + first);\n    // 同一事务里再读一次：不可重复读在这行露出来\n    System.out.println(name + " 再次读到: " + read(b));\n    b.commit();\n  }\n}\n\nshow(Connection.TRANSACTION_READ_COMMITTED, "RC");\nshow(Connection.TRANSACTION_REPEATABLE_READ, "RR");</pre><b>要点</b>：隔离级别决定读操作看到哪个版本、以及读是否加锁，级别越低并发越高、异常越多；H2 与 MySQL 的 RU/RR 语义并不完全等同（MySQL RR 的快照读抑制幻读、当前读靠 next-key lock），把每次读到的值和级别记成一张表再逐档调高。</div></details>',
        '解释为什么“先 SELECT 判断余额再 UPDATE”在并发下不安全，并给出两种修复写法。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：两个线程同时判断余额充足后各自扣款，最终余额变成负数，或者两笔都成功但总额超支；日志里两条 UPDATE 的影响行数都是 1。<b>为什么</b>：SELECT 与 UPDATE 之间存在窗口，判断和修改不是原子的，没有锁时两个事务都基于同一个旧值做决策。<b>要点</b>：写法一是条件更新 <code>UPDATE acct SET bal = bal - ? WHERE id = ? AND bal &gt;= ?</code>，只有影响行数为 1 才算成功；写法二是 <code>SELECT bal FROM acct WHERE id = ? FOR UPDATE</code> 先锁行再判断；两种都要配合事务边界与失败重试。</div></details>'
      ] }
    ]
  };

  T['http-servlet'] = {
    meta: '本章约 9100 字 · 建议 38 分钟 · HTTP 报文、Servlet 生命周期与请求链路 + 7 段示例',
    blocks: [
      { h: '5.1 为什么学 HTTP 与 Servlet' },
      { p: '你在浏览器里输入一个网址、按下回车，几百毫秒后页面出现。这中间发生了什么？请求是怎么找到服务器、服务器又是怎么把一段 Java 代码的执行结果变成页面的？如果不理解这条链路，学 Spring MVC 就只是在背注解：不知道为什么要有 DispatcherServlet，不知道为什么参数能自动绑定，也不知道 404 和 500 到底是谁返回的。' },
      { p: 'HTTP 是浏览器和服务器之间的语言，Servlet 是 Java 侧接收这门语言的标准接口，Tomcat 则是把两者接起来的容器。三者分工明确：HTTP 规定报文格式，Servlet 规定 Java 类如何被调用，容器负责监听端口、解析报文、管理生命周期。Spring MVC 的底层仍然是一个 Servlet，只是在前面对请求做了更细的分发。' },
      { p: '这一章从一次真实的请求出发，先看报文长什么样，再看 Tomcat 如何把请求交给 Servlet，最后讲参数、响应、会话、过滤器和线程安全。学完之后，你应该能画出完整链路，并在遇到 404、乱码、登录态丢失时，知道该查哪一层。' },
      { note: '<b>先建立直觉：</b>服务器不会“调用页面”，它只会收到一段文本、返回一段文本。所谓网页，是浏览器把返回的 HTML 渲染出来的结果。' },

      { h: '5.2 从输入网址到看到页面' },
      { p: '第一步是解析 URL。浏览器把 <code>http://localhost:8080/app/hello?name=tom</code> 拆成协议 http、主机 localhost、端口 8080、路径 /app/hello、查询参数 name=tom。然后查 DNS 把域名变成 IP；localhost 直接是本机，跳过公网 DNS。' },
      { p: '第二步是建立 TCP 连接。HTTP/1.1 默认保持长连接，一次连接可以发多个请求；HTTPS 还要在 TCP 之上做 TLS 握手，协商密钥。连接建立后，浏览器按 HTTP 格式把请求写进 socket。' },
      { p: '第三步是服务器处理。Tomcat 在 8080 端口监听，接收到字节流后按 HTTP 协议解析出方法、路径、头、体，找到匹配的 Web 应用（context path 是 /app），再找到映射到 /hello 的 Servlet，调用它的 service 方法。Servlet 里可能查数据库、拼 HTML，最后通过响应对象写回数据。' },
      { p: '第四步是浏览器渲染。浏览器拿到状态码和响应体，如果是 HTML 就解析 DOM、加载 CSS 和 JS、布局绘制；如果是 JSON，通常由前端 JS 处理。整个过程中，TCP 连接可能被复用，静态资源可能命中缓存，所以“刷新页面”并不总是重新走完整流程。' },
      { flow: ['解析 URL 与 DNS', '建立 TCP 连接', '发送 HTTP 请求', 'Tomcat 解析并分发', 'Filter → Servlet', '写回 HTTP 响应', '浏览器渲染'] },

      { h: '5.3 HTTP 请求与响应的结构' },
      { p: 'HTTP 报文是纯文本，分为起始行、头部、空行、主体四部分。请求的起始行是“方法 路径 版本”，响应的是“版本 状态码 原因短语”。头部是一堆键值对，空行表示头部结束，后面是主体。GET 请求通常没有主体，POST 的表单或 JSON 放在主体里。' },
      { lang: 'http', code: 'POST /app/login HTTP/1.1\nHost: localhost:8080\nContent-Type: application/x-www-form-urlencoded\nContent-Length: 29\nCookie: JSESSIONID=8A3F9C2E\n\nusername=tom&password=123456', title: 'http-request.txt' },
      { lang: 'http', code: 'HTTP/1.1 200 OK\nContent-Type: text/html;charset=UTF-8\nContent-Length: 128\nSet-Cookie: JSESSIONID=8A3F9C2E; Path=/app; HttpOnly\n\n<html><body>登录成功</body></html>', title: 'http-response.txt' },
      { p: '几个头部值得记住。<code>Host</code> 是 HTTP/1.1 的必填项，一个 IP 上可能跑多个站点，靠它区分；<code>Content-Type</code> 说明主体的格式，常见有 <code>application/json</code>、<code>application/x-www-form-urlencoded</code>、<code>multipart/form-data</code>；<code>Content-Length</code> 是主体字节数；<code>Cookie</code> 携带客户端状态；响应里的 <code>Set-Cookie</code> 用来种 Cookie。' },
      { note: '<b>编码问题多半出在这里：</b>请求体按什么字符集解码、响应体声明什么字符集，必须两边一致。只在一处写 UTF-8，另一处仍可能乱码。' },

      { h: '5.4 方法与状态码' },
      { p: 'HTTP 方法表达“想做什么”。GET 获取资源，参数在 URL 上，应该是幂等的（多次请求结果一致）；POST 提交数据、创建资源，参数在 body 里，不保证幂等；PUT 整体替换资源，幂等；PATCH 局部更新；DELETE 删除资源，幂等；HEAD 只要响应头；OPTIONS 询问服务器支持哪些方法，跨域预检用的就是它。' },
      { table: { head: ['方法', '用途', '参数位置', '幂等'], rows: [
        ['GET', '查询资源', 'URL 查询串', '是'],
        ['POST', '创建资源、提交表单', '请求体', '否'],
        ['PUT', '整体替换', '请求体', '是'],
        ['PATCH', '局部更新', '请求体', '通常否'],
        ['DELETE', '删除资源', 'URL 或体', '是']
      ] } },
      { p: '状态码分五类：1xx 信息（很少直接接触）、2xx 成功、3xx 重定向、4xx 客户端错误、5xx 服务端错误。记住几个高频的就够日常排查：200 成功，201 已创建，204 成功但无内容，301 永久重定向，302 临时重定向，304 命中缓存，400 请求参数不合法，401 未认证，403 已认证但无权限，404 路径不存在，405 方法不允许，500 服务端异常，502 网关收到上游无效响应，503 服务不可用。' },
      { table: { head: ['状态码', '含义', '常见原因'], rows: [
        ['200', '成功', '正常返回'],
        ['302', '临时重定向', '登录后跳转、sendRedirect'],
        ['304', '未修改', '浏览器缓存仍然有效'],
        ['400', '请求错误', '参数缺失、JSON 格式错误'],
        ['401 / 403', '未认证 / 无权限', '没登录，或登录了但角色不够'],
        ['404', '未找到', 'URL 拼错、Servlet 映射不匹配'],
        ['500', '服务器内部错误', '代码抛异常，看服务端日志'],
        ['502 / 503', '网关错误 / 不可用', '后端挂了、超时、正在重启']
      ] } },
      { p: '区分 401 和 403 是面试常问：401 是“你是谁我不知道”，需要登录；403 是“我知道你是谁，但你不能做这件事”，登录了也没用。区分 404 和 405 也很实用：路径对但方法不对，返回 405，说明映射存在，只是没实现 doPost。' },

      { h: '5.5 Servlet 是什么：生命周期与单例多线程' },
      { p: 'Servlet 是 Java EE 规范里的一个接口，定义在 <code>javax.servlet</code>（Jakarta EE 9 之后改为 <code>jakarta.servlet</code>）包中。它规定了容器如何初始化、调用、销毁一个处理 HTTP 请求的组件。你写的类实现这个接口（通常继承 <code>HttpServlet</code>），打包成 war 放进 Tomcat，容器就会在合适的时机调用它。' },
      { p: 'Servlet 的生命周期由容器管理，分三个阶段。<code>init()</code> 在 Servlet 第一次被请求时调用（配置了 load-on-startup 则容器启动时调用），只调用一次，用来读配置、建连接池；<code>service()</code> 每次请求都调用，根据方法分派到 doGet、doPost 等；<code>destroy()</code> 在应用卸载或容器关闭时调用一次，用来释放资源。' },
      { p: '这里有一个关键事实：容器通常只创建一个 Servlet 实例，所有请求由不同线程并发调用同一个对象的 service 方法。这就是“单例多线程”模型。它节省内存、启动快，但也意味着实例字段是所有请求共享的，绝对不能拿来存当前用户、当前请求的数据。' },
      { note: '<b>对比 Spring：</b>Spring MVC 的 DispatcherServlet 也是一个 Servlet，同样单例多线程；Controller 默认也是单例，所以 Controller 里同样不能有可变实例字段。' },

      { h: '5.6 第一个 Servlet' },
      { p: '用 Maven 建一个 war 项目，引入 <code>jakarta.servlet-api</code>（scope 为 provided，因为容器会提供），写一个继承 HttpServlet 的类，用 <code>@WebServlet</code> 指定访问路径。部署到 Tomcat 后访问对应 URL 即可。' },
      { p: '依赖要先落地，Servlet API 由容器提供，所以 <code>&lt;scope&gt;provided&lt;/scope&gt;</code> 不是多余而是必须：编译期能看见 <code>jakarta.servlet.*</code>，打包时不带进 war；真打进去了，类从 war 还是从容器加载要看容器的委托顺序，轻则重复初始化，重则和 Tomcat 自带的实现撞版本，报 <code>NoSuchMethodError</code> 或 <code>LinkageError</code>。' },
      { lang: 'xml', code: '<dependency>\n  <groupId>jakarta.servlet</groupId>\n  <artifactId>jakarta.servlet-api</artifactId>\n  <scope>provided</scope>\n  <!-- 版本跟容器走：Tomcat 10.1 对应 Servlet 6.0，Tomcat 11 对应 Servlet 6.1；具体 patch 号以官方文档为准，本机未实测 -->\n</dependency>', title: 'pom.xml（片段）' },
      { p: '容器选 Tomcat 10.1 或 11，两者都是 <code>jakarta.*</code> 命名空间（10.1 要求 Java 11+，11 要求 Java 17+，与本章的 Java 25 环境都不冲突）。把项目打成 war 丢进 <code>webapps</code>，容器启动时自动解包，并用 war 文件名做 context path——<code>app.war</code> 对应 <code>/app</code>，正好对上本章例子里的 <code>http://localhost:8080/app/hello</code>。三步顺序不能颠倒：war 先就位、再启动、最后用 shutdown 收尾。' },
      { lang: 'shell', code: '# 以 Tomcat 11 为例（换 10.1 就把路径里的 11 改成 10.1）；版本号见 tomcat.apache.org/download-11.cgi，<VER> 换成实际值\ncurl -O https://dlcdn.apache.org/tomcat/tomcat-11/v<VER>/bin/apache-tomcat-11.<VER>.tar.gz\ntar -xzf apache-tomcat-11.<VER>.tar.gz\n\n# 第一步：war 放进 webapps，文件名决定 context path\ncp target/app.war apache-tomcat-11.<VER>/webapps/app.war\n\n# 第二步：启动（要盯前台日志就换成 ./bin/catalina.sh run）\ncd apache-tomcat-11.<VER> && ./bin/startup.sh\n\n# 第三步：关闭\ncd apache-tomcat-11.<VER> && ./bin/shutdown.sh', title: 'deploy.sh' },
      { p: '启动后先看 <code>logs/catalina.out</code>：解包失败、<code>ClassNotFoundException</code>、<code>@WebServlet</code> 没生效导致的 404 都写在这里。<code>shutdown.sh</code> 通过 8005 端口的 shutdown 命令让容器优雅停机，会触发 <code>destroy()</code>；直接 <code>kill -9</code> 不会，连接池里的连接和文件缓冲都来不及收尾。' },
      { lang: 'java', code: 'import jakarta.servlet.annotation.WebServlet;\nimport jakarta.servlet.http.*;\nimport java.io.IOException;\n\n@WebServlet("/hello")\npublic class HelloServlet extends HttpServlet {\n\n    @Override\n    protected void doGet(HttpServletRequest req, HttpServletResponse resp)\n            throws IOException {\n        String name = req.getParameter("name");\n        if (name == null || name.isEmpty()) {\n            name = "world";\n        }\n        resp.setContentType("text/html;charset=UTF-8");\n        resp.getWriter().println("<h1>Hello, " + name + "</h1>");\n    }\n}', title: 'HelloServlet.java' },
      { p: '访问 <code>http://localhost:8080/app/hello?name=tom</code>，浏览器会显示 Hello, tom。<code>@WebServlet</code> 是 Servlet 3.0 引入的注解，替代了 web.xml 里的 servlet 与 servlet-mapping 配置。如果项目还在用 Servlet 2.5 或更早，就必须在 web.xml 里配置，注解不会生效。' },
      { p: '注意 <code>setContentType</code> 必须在 <code>getWriter()</code> 之前调用。一旦拿到了 Writer，响应头就已经确定，再改 Content-Type 不会生效，中文就可能乱码。这是新手最常踩的坑之一。' },

      { h: '5.7 请求对象与请求体：参数、编码、上传下载' },
      { p: 'HttpServletRequest 封装了一次请求的所有信息。最常用的是 <code>getParameter</code>：它同时支持 URL 查询串和表单体，返回 String，参数不存在时返回 null，存在但没值时返回空串。<code>getParameterValues</code> 用于复选框这类一个名字多个值的情况，返回 String[]。' },
      { p: '除了参数，请求对象还能拿到方法（getMethod）、请求 URI（getRequestURI）、上下文路径（getContextPath）、查询串（getQueryString）、请求头（getHeader）、客户端 IP（getRemoteAddr）、Cookie 数组（getCookies）。做权限校验、日志记录、限流时，这些信息都会用到。' },
      { lang: 'java', code: '@Override\nprotected void doPost(HttpServletRequest req, HttpServletResponse resp)\n        throws IOException {\n    req.setCharacterEncoding("UTF-8");          // 必须在 getParameter 之前\n    String username = req.getParameter("username");\n    String[] hobbies = req.getParameterValues("hobby");\n\n    resp.setContentType("application/json;charset=UTF-8");\n    resp.getWriter().printf(\n            "{\\"username\\":\\"%s\\",\\"hobbyCount\\":%d}",\n            username, hobbies == null ? 0 : hobbies.length);\n}', title: 'FormServlet.java' },
      { out: '{"username":"tom","hobbyCount":2}' },
      { p: '处理 POST 表单时，<code>setCharacterEncoding("UTF-8")</code> 必须放在第一次 getParameter 之前。因为容器在第一次读取参数时就把请求体按当时的字符集解码了，之后再设置已经来不及。GET 请求的参数在 URL 上，由容器按 URI 编码解析，Tomcat 8 之后默认就是 UTF-8，一般不需要额外设置。' },
      { p: '文件上传不能用 getParameter 拿文件，因为 <code>multipart/form-data</code> 的请求体是分段二进制。Servlet 3.0 提供了 <code>req.getPart("file")</code>，需要在 Servlet 上标注 <code>@MultipartConfig</code> 并配置文件大小上限。Part 可以拿到文件名、头信息和输入流，保存时要注意文件名不能直接信任（可能含路径穿越字符）。' },
      { p: '<code>getParameter</code> 是一个会读请求体的方法。对 <code>application/x-www-form-urlencoded</code> 的 POST，容器在第一次调用它时就把整个 body 读出来解析成参数表，此后 <code>getInputStream</code> 再读只能得到空流；反过来，如果你先手动读完了 body，getParameter 也拿不到值。两者只能选一个，排查参数全是 null 时先确认这一点。' },
      { p: '上传必须用 multipart。Servlet 3.0 之后不必再引第三方库：给 Servlet 加 <code>@MultipartConfig(maxFileSize = 5 * 1024 * 1024, maxRequestSize = 20 * 1024 * 1024)</code>，然后用 <code>req.getPart("file")</code> 拿到 Part，<code>getSubmittedFileName()</code> 取原始文件名，<code>getInputStream()</code> 取内容。超过限制会抛 IllegalStateException，要在 Filter 或异常处理里转成友好的 400。' },
      { p: '文件名绝对不能直接拼进路径。攻击者可以把文件名写成 <code>../../webapps/ROOT/x.jsp</code>，你一拼接就等于把文件写进了站点目录。正确做法是用 UUID 重新生成文件名、只保留扩展名，存到 Web 根目录之外，原始文件名仅作为展示字段入库。' },
      { p: '下载要注意三件事。第一，设 <code>setContentType("application/octet-stream")</code> 并加 <code>Content-Disposition: attachment; filename=...</code>，浏览器才会弹保存框而不是尝试渲染。第二，中文文件名要做编码，现代浏览器认 RFC 5987 的 filename 星号写法并显式声明 UTF-8，直接塞中文可能变成乱码或问号。第三，写二进制用 <code>getOutputStream</code>，不要混用 Writer，也不要在前面多打空行，否则文件开头多出几个字节而损坏。' },

      { h: '5.8 响应对象：状态码、头与输出' },
      { p: 'HttpServletResponse 负责把结果写回客户端。常用操作有四类：设置状态码 <code>setStatus</code>、设置响应头 <code>setHeader</code> / <code>addHeader</code>、设置内容类型与编码 <code>setContentType</code>、写响应体 <code>getWriter</code>（字符）或 <code>getOutputStream</code>（字节）。两者不能同时使用，用了 Writer 再拿 OutputStream 会抛 IllegalStateException。' },
      { p: '重定向和转发是两件不同的事，务必分清。<code>resp.sendRedirect("/app/login")</code> 返回 302，浏览器收到后重新发起一个请求，地址栏会变，原请求的数据丢失；<code>req.getRequestDispatcher("/WEB-INF/views/ok.jsp").forward(req, resp)</code> 是服务器内部转发，同一个请求、同一个 request 对象，地址栏不变。登录成功后跳转通常用重定向，避免刷新重复提交；把数据交给视图渲染用转发。' },
      { p: '设置响应头时，<code>setHeader</code> 会覆盖同名头，<code>addHeader</code> 会追加。有一个特例：<code>setContentType("text/html;charset=UTF-8")</code> 会同时设置 Content-Type 和字符集，等价于再调一次 <code>setCharacterEncoding</code>，但必须在 getWriter 之前。' },
      { lang: 'java', code: 'resp.setStatus(HttpServletResponse.SC_CREATED);\nresp.setHeader("Location", "/app/orders/1001");\nresp.setHeader("Cache-Control", "no-store");\nresp.setContentType("application/json;charset=UTF-8");\nresp.getWriter().write("{\\"id\\":1001,\\"status\\":\\"CREATED\\"}");', title: 'ResponseDemo.java' },

      { h: '5.9 Filter 与完整请求链路' },
      { p: 'Filter 是 Servlet 规范里的另一类组件，它在请求到达 Servlet 之前、响应返回客户端之前执行，可以决定“放行”还是“拦截”。典型用途包括：统一设置编码、记录访问日志、登录校验、跨域头、压缩响应、限流。多个 Filter 组成一条链，按配置顺序依次执行，每个 Filter 调用 <code>chain.doFilter</code> 才会继续往下走。' },
      { lang: 'java', code: '@WebFilter("/*")\npublic class AuthFilter implements Filter {\n\n    @Override\n    public void doFilter(ServletRequest request, ServletResponse response,\n                         FilterChain chain) throws IOException, ServletException {\n        HttpServletRequest req = (HttpServletRequest) request;\n        HttpServletResponse resp = (HttpServletResponse) response;\n\n        HttpSession session = req.getSession(false);\n        if (session == null || session.getAttribute("user") == null) {\n            resp.sendRedirect(req.getContextPath() + "/login");\n            return;                       // 不调用 chain，请求到此为止\n        }\n        chain.doFilter(request, response);  // 放行\n    }\n}', title: 'AuthFilter.java' },
      { p: '这段代码里 <code>getSession(false)</code> 的含义是“有会话就返回，没有就返回 null，不要新建”。如果用无参的 <code>getSession()</code>，每个未登录请求都会创建一个新 Session，白白占用内存。判断登录态时用 false，登录成功后再用 <code>getSession()</code> 创建。' },
      { p: '完整链路可以这样串起来：浏览器 → DNS → TCP → Tomcat 连接器解析 HTTP → 根据 context path 找到 Web 应用 → 匹配 Filter 链 → 匹配 Servlet → Filter 前置逻辑 → Servlet 的 service → 业务代码 → Filter 后置逻辑 → 容器写响应 → 浏览器渲染。任何一环出问题，表现都不同：DNS 错是“找不到网站”，连接拒绝是“无法访问”，404 是路径没匹配，500 是代码抛了异常。' },
      { flow: ['浏览器发起请求', 'Tomcat 解析报文', '匹配 context 与 Filter', 'Filter 前置校验', 'Servlet 处理业务', 'Filter 后置处理', '写回响应'] },

      { h: '5.10 会话与登录：Cookie、Session 与分布式方案' },
      { p: 'HTTP 本身是无状态的：服务器处理完一个请求就忘了你是谁，下一个请求对它来说完全是新的。这在设计上是优点（简单、易扩展），但登录、购物车这类功能需要“记住”用户，于是有了 Cookie 和 Session。' },
      { p: 'Cookie 是服务器通过 <code>Set-Cookie</code> 响应头种在浏览器里的一小段文本，浏览器之后每次请求同一域名都会自动带上。它容量小（约 4KB）、明文可见，所以不能存密码等敏感信息。Session 是服务端的一块存储，每个会话一个 ID，通常通过名为 JSESSIONID 的 Cookie 传给客户端。客户端只拿 ID，真正的数据在服务器内存或 Redis 里。' },
      { p: '这套机制有三个必须知道的属性。<code>HttpOnly</code> 让 JS 读不到 Cookie，能防 XSS 窃取；<code>Secure</code> 限定只在 HTTPS 下发送；<code>SameSite</code> 限制跨站携带，缓解 CSRF。Session 有超时时间，默认 30 分钟不活动就失效；服务端调用 <code>invalidate()</code> 可以立即注销。' },
      { p: '分布式部署时，Session 存在单机内存里会出问题：用户第一次请求打到 A 机器，第二次打到 B 机器，B 上没有这个 Session，登录态就丢了。解决办法有三种：会话粘滞（同一用户固定打到一台，简单但有单点风险）、Session 复制（多台互相同步，浪费内存）、集中存储（Redis 存 Session，最常用）。另一种思路是彻底不用服务端 Session，改发 Token（如 JWT），由客户端每次携带、服务端验签。' },
      { p: '登录的本质是“让后续请求能证明自己是同一个人”。用 Session 的做法是：登录成功后把用户信息放进 Session，容器自动通过 JSESSIONID 关联后续请求；注销时调用 <code>invalidate()</code> 让会话立即失效。' },
      { lang: 'java', code: '// 登录成功\nHttpSession session = req.getSession();\nsession.setAttribute("user", user);\nsession.setMaxInactiveInterval(30 * 60);   // 30 分钟\n\n// 其他请求读取\nObject user = req.getSession(false) == null\n        ? null : req.getSession(false).getAttribute("user");\n\n// 注销\nreq.getSession().invalidate();', title: 'SessionDemo.java' },
      { p: 'Session 里只放必要的标识，比如用户 ID、角色，不要把整个用户对象塞进去。对象越大，内存占用越高，集群复制成本也越高；而且用户信息变更后，Session 里的旧数据不会自动刷新。需要最新信息时按 ID 回查，或者只缓存短时间。' },
      { p: '还有几个安全细节：登录成功后应调用 <code>req.changeSessionId()</code> 防止会话固定攻击；Cookie 要加 HttpOnly 和 Secure；注销时不仅要 invalidate，还要清掉客户端 Cookie；敏感操作要求二次验证，不能只靠 Session 判断。' },

      { h: '5.11 Listener：在容器事件上挂钩子' },
      { p: 'Filter 只在一个请求到来时才有机会执行，可有些事根本没有请求：应用启动时要预热缓存、加载字典，关闭时要关掉连接池、把缓冲区刷盘，用户会话创建和销毁时要统计在线人数。这些时机由 Listener 提供。它监听的是容器的生命周期事件而不是请求，所以比 Filter 介入得更早、退出得更晚。' },
      { p: '最常用的是 <code>ServletContextListener</code>：<code>contextInitialized</code> 在应用启动完成后调用，<code>contextDestroyed</code> 在停止时调用。可以在前者里读配置、建连接池、把共享对象放进 ServletContext，在后者里按相反顺序释放。要特别注意，这个方法里抛出的异常会让整个应用启动失败，所以要么当场处理干净，要么明确让它失败，千万不要 try-catch 之后只打一行日志继续往下走。' },
      { p: '统计在线人数用 <code>HttpSessionListener</code>：会话创建时计数加一，销毁时减一，计数器用 <code>AtomicInteger</code>，因为这两个回调可能在不同线程上同时执行。这里有个容易忽略的点：会话超时也会触发销毁回调，但只有容器扫描到过期时才触发；如果服务重启，内存里的会话直接消失，回调不一定执行，所以不能把持久化的在线数完全交给这个计数器。' },
      { p: '还有 <code>ServletRequestListener</code>，它在请求进入和离开时各触发一次，适合记录耗时、在结束时清理 ThreadLocal。新手常犯的错是把用户信息放进 ThreadLocal 却忘记 remove：Tomcat 的线程是复用的，下一个请求会读到上一个请求残留的值，表现为偶尔串数据，而且极难复现。' },
      { p: '注册方式和 Servlet 一样，用 <code>@WebListener</code> 注解或 web.xml 的 <code>&lt;listener&gt;</code> 元素。注解要生效，web.xml 不能设置 <code>metadata-complete="true"</code>，否则容器会跳过整个 jar 的注解扫描，连 @WebServlet 也一起失效。' },

      { h: '5.12 web.xml、初始化参数与启动顺序' },
      { p: '注解方便，但不是所有配置都能用注解表达；而且注解编译进 class 文件，改一个参数就得重新打包。web.xml 的价值是可外部化：运维改一行配置不用动 jar，还能覆盖注解。两者可以共存，规则是同名配置以 web.xml 为准。' },
      { p: '初始化参数分两个层级，读错就拿到 null。<code>@WebInitParam</code> 定义的是 Servlet 私有参数，用 <code>getServletConfig().getInitParameter</code> 读取；<code>&lt;context-param&gt;</code> 定义的是应用级参数，用 <code>getServletContext().getInitParameter</code> 读取，所有 Servlet 和 Filter 都能访问。分页大小、功能开关这类全局配置放应用级，只属于某个 Servlet 的放私有级。' },
      { p: '启动顺序也值得说清。默认 Servlet 在第一次被请求时才 init，第一个用户要承担初始化开销，初始化慢就会表现为首屏很卡。给 <code>@WebServlet</code> 加 <code>loadOnStartup = 1</code>（或 web.xml 里的 <code>&lt;load-on-startup&gt;</code>），容器启动时就初始化，数字越小越早；负数或省略表示惰性加载。' },
      { p: '整体时序是：容器创建 ServletContext，触发 contextInitialized，再初始化 Filter 与标了 load-on-startup 的 Servlet，最后才开始接收请求。所以 Listener 里不要假设某个 Servlet 已经就绪；反过来，Servlet 里可以安全使用 Listener 放进 context 的共享对象。' },

      { h: '5.13 线程安全与常见坑' },
      { p: 'Servlet 单例多线程，最常见的错误是在实例字段里存请求数据。比如 <code>private String currentUser;</code>，在 doGet 里赋值再使用，两个并发请求会互相覆盖，用户 A 可能看到用户 B 的数据。正确做法是把请求级数据放在方法局部变量里，或者放进 request 属性。' },
      { p: '需要共享且可变的资源要加同步或换成线程安全实现。计数器用 <code>AtomicLong</code>，缓存用 <code>ConcurrentHashMap</code>，不要在 Servlet 里直接操作非线程安全的 <code>HashMap</code> 和 <code>SimpleDateFormat</code>（后者应换成 <code>DateTimeFormatter</code>）。' },
      { list: [
        '<b>乱码：</b>请求没设 UTF-8，或响应 Content-Type 没带 charset；两边都要设，且在读写之前。',
        '<b>404：</b>URL 拼错、context path 少了、@WebServlet 的路径与访问路径不一致、war 没部署成功。',
        '<b>405：</b>表单用 POST 提交，但只实现了 doGet；补上 doPost 或让两者复用同一段逻辑。',
        '<b>刷新重复提交：</b>POST 后直接转发到结果页，刷新会再次提交；改成重定向（POST-Redirect-GET）。',
        '<b>中文文件名下载乱码：</b>Content-Disposition 里的 filename 要按 RFC 5987 编码，或用 URLEncoder 处理。',
        '<b>Session 丢失：</b>跨域、Cookie 被禁、上下文路径变化、集群未共享 Session，逐项排查。'
      ] },
      { p: '调试 Web 问题，浏览器开发者工具的 Network 面板是最好的入口：看请求方法、URL、状态码、请求头、响应头、响应体。服务端则看 Tomcat 日志和异常栈。两边对照，基本能定位到是“请求没发对”“路由没匹配”还是“代码抛异常”。' },

      { h: '5.14 异步处理与错误页' },
      { p: '默认一个请求占用一个容器线程，直到响应写完才归还。如果业务里有慢操作，比如调第三方接口、导出大文件，线程被长时间占着，并发一高线程池就满，表现是所有接口一起变慢甚至超时。Servlet 3.0 的异步支持就是为这个场景准备的。' },
      { p: '用法是 <code>AsyncContext ctx = req.startAsync();</code>，必要时调 <code>ctx.setTimeout(30000)</code>，把耗时任务交给另一个线程池，任务完成后用 <code>ctx.getResponse()</code> 写结果并调用 <code>ctx.complete()</code>。原线程立刻返回去处理别的请求。注意异步不等于自动并发：你仍需提供一个有界线程池，否则任务会堆在无界队列里，问题只是从线程耗尽变成内存耗尽。' },
      { p: '错误处理分两层。参数不合法、余额不足这类预期内的失败，应该返回 400 或带错误码的 JSON，而不是抛异常；只有真正没预料到的错误才让它冒泡成 500。容器可以配置错误页，在 web.xml 里用 <code>&lt;error-page&gt;</code> 把状态码或异常类型映射到页面，用户看到友好提示，日志里保留完整堆栈。' },
      { p: '排查 500 不要只看最后一行消息。从第一行的异常类型开始，顺着 caused by 往下看，最外层通常是框架包装的，根因藏在最深的一层。遇到 404 而代码明明写了，按顺序确认三件事：context path 对不对、war 包名与访问路径是否一致、注解扫描有没有被 metadata-complete 关掉。' },

      { h: '5.15 本章小结' },
      { list: [
        'HTTP 报文由起始行、头、空行、体组成；方法表达意图，状态码表达结果。',
        'HTTP 无状态，靠 Cookie + Session 或 Token 维持登录态；分布式下 Session 要集中存储。',
        'Servlet 生命周期：init 一次、service 每请求、destroy 一次；容器只创建一个实例。',
        '请求参数用 getParameter，响应要先设 Content-Type 再取 Writer；重定向与转发语义不同。',
        'Filter 在 Servlet 前后执行，可拦截或放行；Servlet 单例多线程，禁止用实例字段存请求数据。'
      ] },

      { h: '5.16 常见追问' },
      { list: [
        '<b>问：Servlet 和 Spring MVC 的 Controller 是什么关系？</b><br>答：DispatcherServlet 是业务请求的唯一入口 Servlet：容器里仍可额外注册别的 Servlet（监控/健康检查端点、Prometheus 抓取），只是业务 URL 都交给 DispatcherServlet 分发；它接住业务请求，再按 URL 找 HandlerMapping 挑出 Controller 方法；Controller 只是被 Spring 管理的普通对象，本身不是 Servlet，没有 init/service/destroy 那套生命周期。理解这层之后很多现象就顺了：Filter 一定在 DispatcherServlet 之前，Interceptor 在 DispatcherServlet 内部、还能拿到 Handler 信息。',
        '<b>问：forward 和 redirect 怎么选？</b><br>答：需要保留请求属性、地址栏不变、由服务端继续处理，用 forward：一次请求一次响应，request 域里的数据还在，但刷新会重复提交。需要改变地址栏、避免刷新重复提交、或者要跳到别的系统，用 redirect：浏览器发起第二次请求，request 域数据丢失，传值只能靠 session 或查询参数。表单提交成功后跳结果页，标准答案就是 redirect。',
        '<b>问：Session 和 Token 哪个好？</b><br>答：Session 存在服务端，可以主动失效、实现简单，但多实例部署要做共享存储，扩容和迁移都受牵制；Token 把状态放在客户端，天然适合分布式和跨端，服务端只需验签，代价是注销与续期要额外设计——签发出去的凭证在过期前默认一直有效，得配合黑名单或短有效期加刷新令牌。选哪个，先问自己要不要「立即踢人下线」。',
        '<b>问：为什么 Servlet 不设计成每次请求一个新实例？</b><br>答：创建对象有成本，一个请求一个实例会让高并发下的对象分配与 GC 压力陡增，而 Servlet 大多数时候是无状态的，复用一个实例足够。代价是线程安全要自己保证：不能把请求相关的数据放进实例字段，需要时用局部变量、request 属性或 ThreadLocal，并且 ThreadLocal 用完必须 remove。',
        '<b>问：Filter 和 Interceptor 的区别？</b><br>答：Filter 属于 Servlet 规范，在 DispatcherServlet 之前执行，能拦所有请求（包括静态资源），拿到的是 ServletRequest，改请求体或响应头都方便；Interceptor 属于 Spring MVC，在 DispatcherServlet 内部执行，能拿到 HandlerMethod，可以读到方法上的注解，粒度更细。需要跨框架的粗粒度处理用 Filter，需要按注解做权限用 Interceptor。',
        '<b>问：Tomcat 和 Servlet 是什么关系？</b><br>答：Servlet 是规范，是一组接口；Tomcat 是这套规范的实现之一，负责解析 HTTP、把字节流变成 HttpServletRequest、按 url-pattern 分发、管理 Servlet 的生命周期与线程池，Jetty、Undertow 也是同类容器。所以代码只依赖 Servlet API，换容器不用改业务代码，这也是 Servlet API 在 Maven 里用 provided 范围的原因。'
      ] },

      { h: '5.17 自测与练习' },
      { p: '先自己动手做一遍，再展开参考答案对照预期现象与判断依据。' },
      { ol: [
        '用浏览器开发者工具抓一次登录请求，抄下请求行、三个请求头和响应状态码。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="http"># 1. 勾选 Preserve log 后登录一次，抄下这条报文\nPOST /app/login HTTP/1.1\nHost: localhost:8080\nContent-Type: application/x-www-form-urlencoded\nCookie: JSESSIONID=8A1F3C9E2B7D4A60\n\nname=alice&amp;pwd=123\n\nHTTP/1.1 302 Found\nLocation: /app/profile\nSet-Cookie: JSESSIONID=1D4E8B70C2A93F65; Path=/app\n\n# 2. 还原成命令，方便反复重放\ncurl -i -X POST http://localhost:8080/app/login \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "name=alice&amp;pwd=123"</pre><b>要点</b>：抓包前勾选 Preserve log，否则 302 一跳就看不到原请求；「表单参数没带上」看请求体里有没有 name 与 pwd，「跳转后还是未登录」看响应里的 Set-Cookie 是否真的回来了。</div></details>',
        '写一个 Servlet，接收 name 参数并返回 JSON；分别用 GET 和 POST 访问，观察参数位置差异。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@WebServlet("/hello")\npublic class HelloServlet extends HttpServlet {\n  @Override\n  protected void doGet(HttpServletRequest req,\n                       HttpServletResponse resp)\n      throws IOException {\n    write(req, resp);\n  }\n\n  @Override\n  protected void doPost(HttpServletRequest req,\n                        HttpServletResponse resp)\n      throws IOException {\n    req.setCharacterEncoding("UTF-8");   // 读参数前\n    write(req, resp);\n  }\n\n  private void write(HttpServletRequest req,\n                     HttpServletResponse resp)\n      throws IOException {\n    String name = req.getParameter("name");\n    resp.setContentType("application/json;charset=UTF-8");\n    resp.getWriter().write("{\\"name\\":\\"" + name + "\\"}");\n  }\n}\n\n# GET：参数在 URL 查询串里\ncurl "http://localhost:8080/app/hello?name=alice"\n\n# POST：参数在请求体里，Content-Type 必须是表单\ncurl -X POST http://localhost:8080/app/hello \\\n  -d "name=alice"</pre><b>要点</b>：容器把查询串和请求体合并进同一张参数表，<code>getParameter</code> 两处都能取到；POST 请求体的解码发生在第一次读参数时，<code>setCharacterEncoding</code> 必须赶在那之前，拿到 Writer 之后再设就无效了。</div></details>',
        '实现一个编码 Filter，统一设置请求和响应的 UTF-8，验证去掉它之后中文是否乱码。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@WebFilter("/*")\npublic class EncFilter implements Filter {\n  @Override\n  public void doFilter(ServletRequest q,\n                       ServletResponse p,\n                       FilterChain chain)\n      throws IOException, ServletException {\n    q.setCharacterEncoding("UTF-8");\n    p.setCharacterEncoding("UTF-8");\n    chain.doFilter(q, p);\n  }\n}\n\n# 把上面两行 setCharacterEncoding 注释掉，同一请求各跑一次\ncurl -X POST http://localhost:8080/app/hello \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "name=%E5%BC%A0%E4%BC%9F"</pre><b>要点</b>：请求体解码发生在第一次读参数时、响应字符集必须在拿到 Writer 之前设置，所以两行都要放在 <code>chain.doFilter</code> 之前；注解方式没有顺序保证（Tomcat 按 Filter 名字典序执行），对顺序有要求就改到 web.xml 里显式声明。</div></details>',
        '做一个登录 + 注销流程，要求未登录访问受保护页面时跳转登录页，注销后 Session 立即失效。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@WebServlet("/login")\npublic class LoginServlet extends HttpServlet {\n  protected void doPost(HttpServletRequest req,\n                        HttpServletResponse resp)\n      throws IOException {\n    req.setCharacterEncoding("UTF-8");\n    String name = req.getParameter("name");\n    if (name == null || name.isBlank()) {\n      resp.sendRedirect(\n          req.getContextPath() + "/login.html");\n      return;\n    }\n    req.getSession().setAttribute("user", name);\n    resp.sendRedirect(\n        req.getContextPath() + "/profile");\n  }\n}\n\n@WebServlet("/logout")\npublic class LogoutServlet extends HttpServlet {\n  protected void doGet(HttpServletRequest req,\n                       HttpServletResponse resp)\n      throws IOException {\n    HttpSession s = req.getSession(false);\n    if (s != null) {\n      s.invalidate();\n    }\n    resp.sendRedirect(\n        req.getContextPath() + "/login.html");\n  }\n}\n\n@WebFilter("/profile")\npublic class AuthFilter implements Filter {\n  public void doFilter(ServletRequest q,\n                       ServletResponse p,\n                       FilterChain chain)\n      throws IOException, ServletException {\n    HttpServletRequest req = (HttpServletRequest) q;\n    HttpSession s = req.getSession(false);\n    if (s == null || s.getAttribute("user") == null) {\n      ((HttpServletResponse) p).sendRedirect(\n          req.getContextPath() + "/login.html");\n      return;                            // 必须立即返回\n    }\n    chain.doFilter(q, p);\n  }\n}</pre><b>要点</b>：注销必须调 <code>invalidate()</code>，只 <code>removeAttribute</code> 会留下会话里其他数据、旧 JSESSIONID 依然能用；Filter 里用 <code>getSession(false)</code> 不要顺手新建会话，重定向后必须 <code>return</code>，否则请求会继续走到 Servlet。</div></details>',
        '故意在 Servlet 实例字段里存用户名，用两个浏览器并发访问，观察数据串号，再改成局部变量修复。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">@WebServlet("/who")\npublic class WhoServlet extends HttpServlet {\n  private String user;   // 容器只有一个实例\n\n  protected void doGet(HttpServletRequest req,\n                       HttpServletResponse resp)\n      throws IOException, InterruptedException {\n    user = req.getParameter("u");   // ① 写共享字段\n    Thread.sleep(50);               // 放大时间窗\n    resp.getWriter().write(user);   // ② 可能读到别人的\n  }\n}\n\n// 两个标签页同时访问 /who?u=A 与 /who?u=B\n// 两次都有机会打印出对方的名字\n\n// 修复：状态只活在本次请求里\n@WebServlet("/who2")\npublic class WhoFixedServlet extends HttpServlet {\n  protected void doGet(HttpServletRequest req,\n                       HttpServletResponse resp)\n      throws IOException {\n    String u = req.getParameter("u");\n    resp.getWriter().write(u);\n  }\n}</pre><b>要点</b>：容器对同一个 Servlet 只创建一个实例，所有请求共用它的实例字段，两个线程写同一个变量就是竞态；用户信息放局部变量或 request 属性，确实需要线程内共享时用 ThreadLocal 并在 finally 里 remove。字段版几乎必现，是 sleep 把写与读之间的窗口拉到了毫秒级。</div></details>'
      ] }
    ]
  };

  T['build-test'] = {
    meta: '本章约 9300 字 · 建议 38 分钟 · Maven 生命周期、Gradle 与 JUnit 5 + 8 段示例',
    blocks: [
      { h: '6.1 为什么学：从手工命令到构建工具' },
      { p: '写第一个 Java 程序时，我们用 javac 编译、java 运行，两个命令就够了。但真实项目有几十个源文件、十几个第三方库、多个环境、还要打包部署。如果还靠手工敲命令，很快会遇到三个问题：依赖从哪来、编译顺序怎么定、怎么保证改完没弄坏旧功能。构建工具和单元测试就是解决这三件事的。' },
      { p: 'Maven 和 Gradle 负责“把源码变成可交付产物”：下载依赖、编译、跑测试、打包、发布。它们把一套约定固化成命令，让任何人 clone 代码后执行一条命令就能得到相同结果。单元测试负责“证明代码还对”：每次改动后自动验证行为，把回归问题挡在提交之前。' },
      { p: '很多人把构建当成运维的事，其实它是日常开发的一部分。依赖冲突导致 NoSuchMethodError、测试没跑导致线上回归、打包漏了资源文件，这些问题都源于对构建过程不清楚。学完这一章，你应该能看懂 pom 和 build.gradle，能解释 mvn package 到底做了什么，也能写出有价值的单元测试而不是为了覆盖率凑数。' },
      { note: '<b>一句话：</b>构建工具保证“别人拿到代码能跑起来”，单元测试保证“改完之后还能跑”。两者共同构成工程化的底线。' },
      { p: '先看手工方式。假设项目有两个类，Main 依赖 Util，都在 src 目录下。编译要指定输出目录和源码路径：<code>javac -d out src/Util.java src/Main.java</code>，运行要指定 classpath：<code>java -cp out Main</code>。如果用到第三方 jar，还要把 jar 路径加到 -cp 里，多个用冒号（Windows 用分号）分隔。' },
      { p: '文件一多，问题就来了。每次都要列出所有源文件，或者用通配符；依赖的 jar 要手动下载、手动放进 lib 目录；版本升级要一个个替换；不同人机器上的路径还不一样。更麻烦的是“传递依赖”：你用 A，A 依赖 B，B 又依赖 C，手工维护这条链几乎不可能。' },
      { p: '构建工具做了四件事：用标准目录结构省去配置、用坐标声明依赖并自动解析传递依赖、用生命周期把编译测试打包串起来、用仓库统一存放产物。Maven 是“约定优于配置”的代表，Gradle 是“用代码描述构建”的代表。' },
      { lang: 'shell', code: '# 手工编译与运行\njavac -encoding UTF-8 -d out src/main/java/com/example/*.java\njava -cp out com.example.Main\n\n# 带第三方依赖\njavac -cp "lib/*" -d out src/main/java/com/example/*.java\njava -cp "out:lib/*" com.example.Main', title: 'build.sh' },

      { h: '6.2 Maven 的约定：目录结构' },
      { p: 'Maven 最核心的设计是“约定”。只要按约定放文件，几乎不用写配置就能构建。标准结构是：<code>src/main/java</code> 放主代码，<code>src/main/resources</code> 放配置文件，<code>src/test/java</code> 放测试代码，<code>src/test/resources</code> 放测试配置，编译产物输出到 <code>target</code> 目录。' },
      { p: '这套约定的价值在于“可预测”。任何人进入项目，不用问就知道代码在哪、测试在哪、配置在哪；IDE 也能直接识别。你可以改，但改了就要在 pom 里显式配置，属于给自己找麻烦，除非有历史遗留原因，否则不建议。' },
      { list: [
        '<b>src/main/java：</b>主源码，包名与目录层级对应。',
        '<b>src/main/resources：</b>配置文件、SQL、模板，会被复制进 classpath。',
        '<b>src/test/java：</b>测试源码，只在测试阶段编译，不会打进产物。',
        '<b>src/test/resources：</b>测试专用配置，优先级高于主配置。',
        '<b>target：</b>构建输出，可随时删除，不要提交到 Git。',
        '<b>pom.xml：</b>项目描述文件，坐标、依赖、插件都在这里。'
      ] },
      { p: 'pom 是 Maven 项目的身份证。最外层是 project 根元素，<code>modelVersion</code> 固定为 4.0.0，然后是三个坐标：groupId（组织，通常是反写域名）、artifactId（项目名）、version（版本号）。这三个合起来唯一标识一个构件，仓库就是按这个路径存放 jar 的。' },
      { lang: 'xml', code: '<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0"\n         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0\n                             http://maven.apache.org/xsd/maven-4.0.0.xsd">\n  <modelVersion>4.0.0</modelVersion>\n\n  <groupId>com.example</groupId>\n  <artifactId>demo-shop</artifactId>\n  <version>1.0.0</version>\n  <packaging>jar</packaging>\n\n  <properties>\n    <maven.compiler.release>17</maven.compiler.release>\n    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>\n  </properties>\n\n  <dependencies>\n    <dependency>\n      <groupId>org.junit.jupiter</groupId>\n      <artifactId>junit-jupiter</artifactId>\n      <version>5.10.2</version>\n      <scope>test</scope>\n    </dependency>\n  </dependencies>\n</project>', title: 'pom.xml' },
      { p: 'packaging 决定产物类型：jar 打成 jar，war 打成 war（Web 项目），pom 表示只做聚合不产出构件（多模块的父工程）。properties 里可以定义变量，后面用 <code>${...}</code> 引用——注意这只是 Maven 的占位符，和前端模板字符串无关。' },
      { p: '依赖写在 dependencies 里，每个依赖同样用三坐标定位。Maven 会先查本地仓库（默认 ~/.m2/repository），没有再查中央仓库下载，下载后缓存到本地。公司内网通常配置私服（Nexus），在 settings.xml 里用 mirror 把中央仓库指向私服。' },

      { h: '6.3 依赖范围：compile、provided、runtime、test' },
      { p: 'scope 决定一个依赖在哪些阶段可见、是否会被传递、是否打进最终产物。选错 scope 的典型后果是：测试库被打进生产包、Servlet API 和容器冲突、编译期找不到类。' },
      { table: { head: ['scope', '编译', '测试', '运行', '打进产物', '典型例子'], rows: [
        ['compile（默认）', '是', '是', '是', '是', 'Spring、Jackson、工具库'],
        ['provided', '是', '是', '否', '否', 'servlet-api、lombok'],
        ['runtime', '否', '是', '是', '是', 'JDBC 驱动、日志实现'],
        ['test', '否', '是', '否', '否', 'JUnit、Mockito、H2'],
        ['system', '是', '是', '是', '否', '本地 jar，已废弃，不建议用']
      ] } },
      { p: 'provided 的含义是“编译时需要，运行时由环境提供”。Servlet API 就是典型：你写代码要引用 HttpServlet，但部署到 Tomcat 时容器自带这个 jar，如果打进 war 反而可能冲突。lombok 也常设为 provided，因为它只在编译期生成代码，运行时不需要。' },
      { p: 'runtime 表示“编译时不用直接引用，但运行时需要”。JDBC 驱动最典型：代码里只有 <code>java.sql.*</code> 和 <code>Class.forName</code> 或 SPI，不直接 import MySQL 的类，所以编译期不需要，但运行时必须有。test 只用于测试，不会传递到使用方，也不会打进产物。' },
      { note: '<b>常见错误：</b>把 JUnit 写成默认 scope，结果测试框架被打进生产 jar；或者忘记给驱动加 runtime，本地能跑、打包后连不上数据库。' },

      { h: '6.4 Maven 生命周期与常用命令' },
      { p: 'Maven 有三套生命周期：clean（清理）、default（构建）、site（文档）。每套由若干阶段（phase）组成，阶段有先后顺序，执行某个阶段时，它前面的阶段会自动依次执行。这就是为什么 <code>mvn package</code> 会自动编译并跑测试——package 之前的阶段都被触发了。' },
      { flow: ['clean', 'validate', 'compile', 'test', 'package', 'verify', 'install', 'deploy'] },
      { p: 'default 生命周期的核心阶段依次是：validate 校验项目、compile 编译主代码、test 跑单元测试、package 打包、verify 校验产物、install 安装到本地仓库、deploy 发布到远程仓库。中间还有很多细粒度阶段（如 process-resources、test-compile），平时不用记，知道主链路即可。' },
      { lang: 'shell', code: '# 清理并打包，跳过测试执行\nmvn clean package -DskipTests\n\n# 连测试代码都不编译（更快，但更容易漏问题）\nmvn clean package -Dmaven.test.skip=true\n\n# 只跑测试\nmvn test\n\n# 查看依赖树，定位冲突\nmvn dependency:tree\n\n# 安装到本地仓库，供其他项目引用\nmvn clean install', title: 'maven-commands.sh' },
      { p: '两个跳过测试的参数要分清：<code>-DskipTests</code> 仍然编译测试代码，只是不执行；<code>-Dmaven.test.skip=true</code> 连编译都跳过，速度更快，但如果测试代码本身有编译错误，用前者能提前发现。CI 上应该老老实实跑测试，跳过只用于本地应急。' },
      { p: '插件是生命周期的执行者。每个阶段绑定一个或多个插件的目标（goal），比如 compile 阶段默认绑定 maven-compiler-plugin 的 compile 目标，test 阶段绑定 maven-surefire-plugin 的 test 目标，package 阶段 jar 打包绑定 maven-jar-plugin。要改行为就配插件，比如指定 Java 版本、设置 surefire 的参数。' },

      { h: '6.5 依赖冲突与传递依赖' },
      { p: 'Maven 会自动解析传递依赖：你声明 A，A 的 pom 里声明了 B，B 也会被引入。这很方便，但也带来冲突——同一个库的不同版本可能同时出现在依赖树里，Maven 必须选一个，选错了就可能 NoSuchMethodError 或 ClassNotFoundException。' },
      { p: 'Maven 的调解规则有两条。第一是“最短路径优先”：直接声明的依赖深度为 1，传递来的为 2、3，路径短的胜出。第二是“先声明优先”：路径长度相同时，pom 里写在前面的胜出。这解释了一个常见困惑：明明升级了 B 的版本，运行时却还是旧版，因为另一个依赖以更短路径引入了旧版。' },
      { p: '解决冲突的手段有四种。用 <code>mvn dependency:tree</code> 先看清楚谁引入了谁；用 <code>&lt;exclusions&gt;</code> 排除某个传递依赖；用 <code>&lt;dependencyManagement&gt;</code> 统一声明版本（不实际引入，只锁定版本）；用 BOM（<code>&lt;scope&gt;import&lt;/scope&gt;</code> 导入 spring-boot-dependencies 这类清单）批量管理版本。' },
      { lang: 'xml', code: '<dependency>\n  <groupId>com.example</groupId>\n  <artifactId>module-a</artifactId>\n  <version>1.2.0</version>\n  <exclusions>\n    <exclusion>\n      <groupId>commons-logging</groupId>\n      <artifactId>commons-logging</artifactId>\n    </exclusion>\n  </exclusions>\n</dependency>', title: 'exclusion.xml' },
      { p: '还要认识 SNAPSHOT 版本。以 -SNAPSHOT 结尾的版本表示开发中的快照，每次构建都可能变化，Maven 会按更新策略重新拉取；正式版本一旦发布就不应该再改内容，否则同一版本号对应不同代码，构建就不可重现了。生产依赖不要用 SNAPSHOT。' },

      { h: '6.6 Gradle：用代码描述构建' },
      { p: 'Gradle 是另一种构建工具，用 Groovy 或 Kotlin DSL 写构建脚本，比 XML 更灵活。它的核心概念是“任务（task）”：编译、测试、打包都是任务，任务之间有依赖关系，Gradle 据此构建有向无环图并决定执行顺序，还能跳过没有变化的任务，也就是增量构建。' },
      { lang: 'props', code: 'plugins {\n    java\n    id("org.springframework.boot") version "3.2.5"\n}\n\ngroup = "com.example"\nversion = "1.0.0"\n\nrepositories {\n    mavenCentral()\n}\n\ndependencies {\n    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.0")\n    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")\n    testRuntimeOnly("org.junit.platform:junit-platform-launcher")\n}\n\njava {\n    toolchain {\n        languageVersion = JavaLanguageVersion.of(17)\n    }\n}\n\ntasks.test {\n    useJUnitPlatform()\n}', title: 'build.gradle.kts' },
      { p: '配置里的 implementation 和 testImplementation 对应 Maven 的 scope：implementation 类似 compile，但不会暴露给使用方的编译期（更利于封装）；testImplementation 对应 test；还有 compileOnly（类似 provided）、runtimeOnly（类似 runtime）。repositories 声明仓库，mavenCentral() 是中央仓库。' },
      { p: '实际项目要用 Wrapper：执行 <code>gradle wrapper</code> 生成 gradlew 脚本和配置，之后统一用 <code>./gradlew build</code>。Wrapper 会锁定 Gradle 版本，保证团队和 CI 用同一个版本构建，避免“我这能跑”。常用命令有 <code>./gradlew build</code>（编译+测试+打包）、<code>./gradlew test</code>、<code>./gradlew clean</code>、<code>./gradlew dependencies</code>。' },
      { p: '两者都能胜任绝大多数项目，差别主要在配置风格、性能和学习成本。Maven 的 XML 冗长但结构固定、插件生态成熟、IDE 支持稳定；Gradle 脚本简洁灵活、增量构建快，但灵活也意味着不同项目写法差异大，排查问题需要懂 Groovy/Kotlin。' },
      { table: { head: ['维度', 'Maven', 'Gradle'], rows: [
        ['配置方式', 'XML，约定强', 'Groovy/Kotlin DSL，灵活'],
        ['学习成本', '低，结构固定', '中，需要懂脚本语言'],
        ['构建速度', '一般，全量为主', '快，增量与缓存强'],
        ['生态', '插件极多，老项目多', 'Android 事实标准，新项目多'],
        ['可读性', '冗长但一致', '简洁但风格差异大'],
        ['适合场景', '传统企业项目、多模块', 'Android、需要定制构建的项目']
      ] } },
      { p: '选择建议很朴素：公司已有体系就用哪个，别为了尝鲜混用；新项目如果团队不熟 Gradle，Maven 更稳；Android 或需要复杂构建逻辑，Gradle 更合适。面试时能说清两者生命周期/任务模型的差异，比背命令更有价值。' },

      { h: '6.7 单元测试与 JUnit 5' },
      { p: '单元测试是“针对最小可测单元写的自动化验证”。它不启动整个应用、不连真实数据库、不发网络请求，只调用一个类或方法，断言输出符合预期。好处是快、稳定、失败时能直接定位到哪一行逻辑错了。' },
      { p: 'JUnit 5 由三部分组成：Jupiter 是新的编程模型和扩展模型（你写的注解都来自这里），Platform 是运行测试的基础设施，Vintage 用于兼容 JUnit 4 的老测试。日常说“JUnit 5”通常指 Jupiter。' },
      { lang: 'java', code: 'import org.junit.jupiter.api.*;\nimport static org.junit.jupiter.api.Assertions.*;\n\nclass CalculatorTest {\n\n    private Calculator calculator;\n\n    @BeforeEach\n    void setUp() {\n        calculator = new Calculator();\n    }\n\n    @Test\n    @DisplayName("两个正数相加")\n    void add_positiveNumbers() {\n        assertEquals(5, calculator.add(2, 3));\n    }\n\n    @Test\n    void divide_byZero_throws() {\n        ArithmeticException ex = assertThrows(\n                ArithmeticException.class,\n                () -> calculator.divide(1, 0));\n        assertEquals("除数不能为 0", ex.getMessage());\n    }\n}', title: 'CalculatorTest.java' },
      { out: '[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0' },
      { p: '注意 assertEquals 的参数顺序是“期望值在前、实际值在后”，写反了失败信息会误导人。测试方法命名建议用“行为_条件_期望”的风格，比如 <code>withdraw_insufficientBalance_throws</code>，失败时一眼能看出场景。方法上加 @DisplayName 可以让报告更可读。' },
      { p: '生命周期注解要分清：@BeforeAll / @AfterAll 在每个测试类前后各执行一次，方法必须是 static（除非测试类标注了 @TestInstance(PER_CLASS)）；@BeforeEach / @AfterEach 在每个测试方法前后执行，用来准备和清理数据。测试方法本身必须无参、返回 void、不能是 private。' },

      { h: '6.8 断言、参数化与异常测试' },
      { p: '断言是测试的核心。JUnit 提供了 assertEquals、assertNotEquals、assertTrue/False、assertNull/NotNull、assertSame、assertArrayEquals、assertIterableEquals、assertThrows、assertDoesNotThrow、assertTimeout 等。断言失败会抛 AssertionFailedError，测试立即结束，后面的代码不执行。' },
      { p: '一组相关断言用 <code>assertAll</code> 包起来，可以让所有断言都执行完再汇总失败项，而不是第一个失败就停。这在验证对象的多个字段时很有用。要注意 assertAll 里的断言是“软失败”，不会中断流程，但如果里面有异常抛出，仍然会中断。' },
      { lang: 'java', code: '@ParameterizedTest\n@CsvSource({\n    "1, 1, 2",\n    "2, 3, 5",\n    "-1, 1, 0"\n})\nvoid add_variousInputs(int a, int b, int expected) {\n    assertEquals(expected, calculator.add(a, b));\n}\n\n@Test\nvoid userFields_areCorrect() {\n    User u = new User("tom", 20);\n    assertAll(\n        () -> assertEquals("tom", u.getName()),\n        () -> assertEquals(20, u.getAge()),\n        () -> assertNotNull(u.getId())\n    );\n}', title: 'ParameterizedTest.java' },
      { p: '参数化测试用 @ParameterizedTest 替代 @Test，配合 @ValueSource（单值列表）、@CsvSource（逗号分隔多参数）、@MethodSource（方法提供数据）、@EnumSource 等。它能用一份逻辑覆盖多组输入，比复制粘贴多个测试方法更易维护。每组参数在报告里单独计数。' },
      { p: '测试异常有两个层次：只关心“抛了某个异常”用 assertThrows；还要校验异常消息或状态用返回值。不要用 try-catch 加 fail() 的老写法，断言失败信息不清晰。测试超时用 assertTimeout，但要注意它不会强制中断正在执行的代码，只是事后判断。' },

      { h: '6.9 测试替身与 Mockito' },
      { p: '真实单元测试要隔离外部依赖：数据库、HTTP 接口、文件系统、时间。把这些换成“测试替身”，测试才能快且稳定。替身分几种：Stub 提供预设返回值，Mock 还能验证调用行为，Fake 是有简化实现的真对象（如内存数据库），Spy 是包在真对象外面记录调用。' },
      { p: 'Mockito 是 Java 最常用的 mock 框架。用 <code>mock(Class)</code> 创建替身，<code>when(...).thenReturn(...)</code> 设定行为，<code>verify(...)</code> 验证调用次数和参数。配合 <code>@ExtendWith(MockitoExtension.class)</code> 和 <code>@Mock</code> 注解可以自动注入，减少样板代码。' },
      { lang: 'java', code: '@ExtendWith(MockitoExtension.class)\nclass OrderServiceTest {\n\n    @Mock\n    private OrderRepository repository;\n\n    @InjectMocks\n    private OrderService service;\n\n    @Test\n    void createOrder_savesWithPendingStatus() {\n        when(repository.save(any(Order.class)))\n                .thenAnswer(inv -> inv.getArgument(0));\n\n        Order order = service.create(1001L, new BigDecimal("99.90"));\n\n        assertEquals("PENDING", order.getStatus());\n        verify(repository, times(1)).save(order);\n    }\n}', title: 'OrderServiceTest.java' },
      { p: 'Mock 的边界要把握好：只 mock 你拥有的依赖的“边界”，不要 mock 值对象，也不要 mock 被测类自己。过度 mock 会让测试与实现细节耦合——重构一改，测试全红，但它其实没验证任何业务价值。判断标准是：这个测试是为了验证“行为正确”，还是为了验证“我按这个顺序调了这些方法”。' },

      { h: '6.10 测试金字塔：三层各测什么' },
      { p: '测试金字塔是分配比例的经验模型：底层大量单元测试，中层适量集成测试，顶层少量端到端测试。比例没有硬指标，但它描述的取舍是对的，越往上越接近真实用户，也越慢、越脆、越难定位。' },
      { p: '单元测试测一个类或方法的逻辑分支，外部依赖全部替换掉，应当毫秒级完成，失败时直接指出哪一行判断错了。它适合覆盖金额计算、状态机流转、参数校验、边界条件；不适合用来验证 SQL 写得对不对，那需要真实数据库。' },
      { p: '集成测试验证组件协作：映射文件能不能查出数据、事务注解有没有生效、Bean 能不能装配起来。它需要真实或接近真实的环境，常用内存数据库或临时容器。这类测试慢一些，却能抓出单元测试永远抓不到的配置错误。' },
      { p: '端到端测试从外部入口发起，走完整条链路，适合覆盖登录后下单支付这类关键路径。数量要少，因为任何一处文案改动都可能让它失败，维护成本最高。倒金字塔是常见反模式：大量端到端、几乎没有单元测试，结果是流水线跑半小时、红一片却说不清是谁的问题，最后大家开始忽略失败。修正方向不是删掉端到端测试，而是把其中的业务判断下沉成单元测试。' },

      { h: '6.11 覆盖率怎么读：JaCoCo、门禁与陷阱' },
      { p: '覆盖率衡量“测试执行了多少代码”，常见指标有行覆盖、分支覆盖、方法覆盖。工具用 JaCoCo，Maven 里加插件后在 package 阶段生成报告。覆盖率是参考指标，不是目标：100% 覆盖也可能一个断言都没有，关键业务的分支没测到，覆盖率再高也没用。' },
      { p: 'JaCoCo 通过字节码插桩记录哪些指令被执行过，产出类、方法、行、分支四个层级的覆盖数据。Maven 里加 jacoco-maven-plugin，把 prepare-agent 绑到 initialize、report 绑到 test 之后，执行 mvn test 就会在 <code>target/site/jacoco</code> 下生成 HTML 报告，点进去能看到每一行是否被执行、每个分支走了哪个方向。' },
      { p: '指标含义要分清。行覆盖看这行有没有被执行，分支覆盖看 if 的两个方向是否都走过，方法覆盖看哪些方法一次没被调用。分支覆盖通常更能暴露问题：一行 <code>a &amp;&amp; b</code> 即使行覆盖百分之百，也可能只测了 a 为真的情况，b 为假的分支从未执行。' },
      { p: '覆盖率有三个陷阱。第一，它只说明代码被执行过，不说明结果被断言过，把所有方法调一遍再不断言，数字能到九成以上而测试毫无价值。第二，getter 方法、异常兜底、日志分支会拉低分母或永远无法覆盖，追求满分往往要写一堆无意义测试。第三，总量下降不等于质量下降，看本次改动的增量覆盖率比看总量更有意义。' },
      { p: '门禁的正确用法是设下限而不是设目标：整体不低于六成，本次增量不低于八成，低于就让流水线失败，同时把报告归档，评审时能看到哪些分支没被覆盖。数字是手段，逼人回答这个分支为什么没测，才是目的。' },

      { h: '6.12 TDD 的节奏与测试常见坑' },
      { p: 'TDD（测试驱动开发）的节奏是“红-绿-重构”：先写一个失败的测试，再写最少的代码让它通过，最后在测试保护下重构。它的价值不在于“测试多”，而在于逼你先想清楚接口和行为，再动手实现。实践中不必教条，但新功能先写测试确实能减少返工。' },
      { list: [
        '<b>测试相互依赖：</b>后一个测试依赖前一个留下的数据，单独跑就失败；每个测试要能独立运行。',
        '<b>依赖真实环境：</b>连开发库、调外部接口，导致时快时慢、时红时绿；用内存库或 mock 隔离。',
        '<b>断言太弱：</b>只 assertNotNull 不校验内容，等于没测；断言要覆盖关键字段和边界。',
        '<b>只测 happy path：</b>不测空值、越界、异常分支；缺陷往往藏在这些地方。',
        '<b>测试方法名含糊：</b>test1、testAdd，失败后不知道场景；用行为描述命名。',
        '<b>忽略测试执行：</b>CI 里跳过测试、或 surefire 没匹配到测试类；确认测试真的跑了。'
      ] },
      { p: 'Maven 的 surefire 插件默认只识别 <code>*Test.java</code>、<code>Test*.java</code>、<code>*Tests.java</code>、<code>*TestCase.java</code> 这几种命名。测试类叫 <code>CalculatorCheck.java</code> 就不会被执行，报告里显示 0 个测试，很容易误以为“全过了”。JUnit 5 还需要 surefire 版本足够新（3.x），否则会找不到测试引擎。' },

      { h: '6.13 多模块工程：聚合、继承与 reactor' },
      { p: '项目一大，单模块就变成一坨：Web 层、业务层、数据访问层混在一个 jar 里，改一行要全量编译，也没法单独复用其中一层。多模块工程按职责拆成若干子模块，用父工程统一管理版本与插件，各自独立编译，最后按依赖顺序组装。' },
      { p: '父工程的关键是 <code>&lt;packaging&gt;pom&lt;/packaging&gt;</code>：它本身不产出 jar，只做两件事，用 <code>&lt;modules&gt;</code> 列出子模块（聚合），用 <code>&lt;dependencyManagement&gt;</code> 与 <code>&lt;pluginManagement&gt;</code> 锁定版本（继承）。子模块在 <code>&lt;parent&gt;</code> 里写父工程坐标与 relativePath，就自动获得这些约定，声明依赖时连 version 都可以省略。' },
      { p: '常见错误是每个子模块各写一套版本。父工程把 Spring 升到 6，某个子模块还停在 5，编译能过、运行才炸。正确做法是版本只在父工程的 dependencyManagement 里出现一次，子模块只写 groupId 与 artifactId；编译器版本、源码编码这类插件配置同样放 pluginManagement，不要每个模块各配一份。' },
      { p: '构建顺序不用手工指定。Maven 读取模块间的依赖，把参与本次构建的模块排成有向无环图，按拓扑序依次构建，这个机制叫 reactor。A 依赖 B，执行 <code>mvn install</code> 时一定先构建 B；只想构建某块及其上游依赖，用 <code>-pl 模块名 -am</code>，只构建某块本身则去掉 -am。' },
      { p: '还有个坑：在根目录执行时，子模块之间用的是 reactor 里的最新产物；单独进入某个子模块目录执行，它会去本地仓库找依赖，可能拿到旧版本。所以日常构建尽量在根目录跑，或者先 install 一次再进子目录。' },

      { h: '6.14 CI：让每次提交都经过同一套检查' },
      { p: '持续集成解决的是“在我机器上是好的”。每次推送都由一台干净机器从零拉取、构建、跑测试，结果对所有人可见，把过去每周一次的集成痛苦拆成每次提交的小步验证。' },
      { p: '一条典型流水线分几段：拉代码、还原依赖缓存、编译、跑单元测试、跑集成测试、静态检查与覆盖率门禁、打包归档、发布到制品库。任何一段失败就立刻停止并通知提交者，不要配成失败也继续，那等于没有门禁。' },
      { p: '缓存是提速关键。Maven 缓存 <code>~/.m2/repository</code>，Gradle 缓存 <code>~/.gradle/caches</code>，缓存的 key 取 pom 或锁文件的哈希，依赖变了自动失效。但不要把 target 目录一起缓存，增量编译的旧产物混进新构建，会产出难以复现的问题。' },
      { p: '构建要可复现：JDK 版本在流水线里显式指定，不依赖机器默认；用 mvnw 或 gradlew 锁定构建工具版本；版本号从 git tag 推导，不手工改 pom；依赖全部固定版本，禁止 SNAPSHOT 进生产。做到这些，同一个提交在任何机器上产出的包才应该一致。' },
      { p: '还有两个安全细节：密钥、数据库密码不能写进仓库或构建脚本，应该放在流水线的加密变量里运行时注入；日志里不要打印完整的环境变量与连接串，很多泄露都是从日志里翻出来的。构建产物要归档保留，出问题时能拿到当时那一份 jar 复现。' },
      { p: '本地与流水线不一致是排查成本最高的问题之一。养成提交前跑一遍相同命令的习惯，用 mvn verify 或 gradlew build，而不是只跑单个测试类；如果线上失败而本地通过，先对比 JDK 版本、环境变量、时区、文件编码这四项。' },

      { h: '6.15 本章小结' },
      { list: [
        'Maven 用约定目录 + 坐标管理项目；pom 描述坐标、依赖、插件与打包方式。',
        'scope 决定依赖在编译、测试、运行期的可见性与是否打包；provided 与 runtime 最易配错。',
        '生命周期按阶段顺序执行，执行后面的阶段会自动触发前面的；插件在阶段上绑定目标。',
        '依赖冲突按“最短路径优先、先声明优先”调解，用 dependency:tree 排查、exclusion 与 dependencyManagement 解决。',
        'Gradle 以任务和依赖图为核心，支持增量构建；用 Wrapper 锁定版本。',
        'JUnit 5 用注解组织测试，断言验证行为，参数化覆盖多组输入，Mockito 隔离外部依赖；覆盖率是参考不是目标。'
      ] },

      { h: '6.16 常见追问' },
      { list: [
        '<b>问：mvn package 和 mvn install 的区别？</b><br>答：package 只把产物打到 target 目录，供本机直接运行或部署；install 在 package 之后多做一步，把产物复制进本地仓库，让同机的其他项目能按坐标依赖它。多模块工程里，install 还是让 reactor 之外的模块拿到最新版本的前提。日常开发用 package 就够，联调多个工程时才需要 install，注意它会污染本地仓库，发布前记得 clean。',
        '<b>问：为什么 Servlet API 用 provided？</b><br>答：因为运行时由 Tomcat 提供，容器自己的类加载器里已经有这套类。打进 war 就会重复甚至版本冲突：应用带着 4.0 的 API 跑在只支持 3.1 的容器上，启动时直接抛 NoSuchMethodError 或 LinkageError。provided 的含义正是「编译和测试时需要，打包和运行时不带」。lombok 是编译期注解处理器，作用域常写 provided 或 optional，取决于构建工具约定，别把它和「容器提供」的 Servlet API 并列成同一类原因。',
        '<b>问：依赖冲突怎么快速定位？</b><br>答：先 <code>mvn dependency:tree -Dverbose</code> 找出同一个 groupId:artifactId 出现两次以上、版本不同的位置，看它从哪条路径被传进来；再按优先级处理——直接声明覆盖传递依赖、用 <code>exclusion</code> 切断来源、或者在 <code>dependencyManagement</code> 里统一版本。定位到具体路径再改，比一个个试版本快得多。',
        '<b>问：单元测试和集成测试怎么分？</b><br>答：单元测试隔离所有外部依赖（数据库、HTTP、文件系统），毫秒级，失败时能直接指向一段逻辑；集成测试验证真实组件之间的协作，比如 DAO 打真库、Controller 起容器，慢但能抓出配置和 SQL 的问题。分界的实际意义在反馈速度：单元测试每次提交都跑，集成测试放在流水线后段。用命名和目录区分，别混在一个测试类里。',
        '<b>问：Mock 和 Stub 的区别？</b><br>答：Stub 只提供预设返回值，让被测代码能走下去；Mock 额外记录交互，可以断言「这个方法被调了几次、参数是什么」。严格区分只在写测试时有用：需要验证副作用，比如发了通知、写了审计，就用 Mock 的验证能力；只需要让依赖返回数据，用 Stub，后者更不容易让测试和实现细节绑死。实践里常统称 mock，但要清楚自己在断言什么。',
        '<b>问：覆盖率要求多少合适？</b><br>答：没有通用数字。行覆盖率 80% 在一些团队是门禁，在另一些团队毫无意义，因为它只说明代码被执行过，不说明断言有效。更该关注核心模块的分支覆盖和关键路径：金额计算、权限判断、状态流转这类地方值得逼到接近全覆盖，DTO 和 getter 不必。把覆盖率当趋势看——突然下降说明新代码没测；不要为了数字写没有断言的测试。'
      ] },

      { h: '6.17 自测与练习' },
      { p: '先自己动手做一遍，再展开参考答案对照预期现象与判断依据。' },
      { ol: [
        '新建一个 Maven 项目，写出包含 junit-jupiter（test scope）的 pom，执行 mvn clean package 并找到 target 下的 jar。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="xml">&lt;project\n    xmlns="http://maven.apache.org/POM/4.0.0"\n    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0\n      https://maven.apache.org/xsd/maven-4.0.0.xsd">\n  &lt;modelVersion>4.0.0&lt;/modelVersion>\n  &lt;groupId>lab&lt;/groupId>\n  &lt;artifactId>demo&lt;/artifactId>\n  &lt;version>1.0.0&lt;/version>\n\n  &lt;properties>\n    &lt;maven.compiler.release>25&lt;/maven.compiler.release>\n    &lt;project.build.sourceEncoding>UTF-8&lt;/project.build.sourceEncoding>\n  &lt;/properties>\n\n  &lt;dependencies>\n    &lt;dependency>\n      &lt;groupId>org.junit.jupiter&lt;/groupId>\n      &lt;artifactId>junit-jupiter&lt;/artifactId>\n      &lt;version>5.11.0&lt;/version>\n      &lt;scope>test&lt;/scope>\n    &lt;/dependency>\n  &lt;/dependencies>\n&lt;/project>\n\nmvn clean package\nls target/*.jar</pre><b>要点</b>：<code>src/main/java</code> 放源码、<code>src/test/java</code> 放测试，Maven 只按这套约定找；<code>&lt;scope&gt;test&lt;/scope&gt;</code> 让 junit 只出现在编译测试和跑测试的 classpath 上，不会被打进 jar；<code>release</code> 写 25 要求构建机装 JDK 25，Maven 3.9+ 自带的 compiler 插件才认这个值。</div></details>',
        '故意引入两个版本的同一依赖，用 dependency:tree 找出冲突，再用 exclusion 解决并验证。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="shell"># 先看树：同 artifact 两个版本，旧的标 omitted\nmvn dependency:tree -Dverbose \\\n  -Dincludes=org.apache.xmlbeans:xmlbeans\n\n&lt;!-- 在引入方排除掉那条传递依赖 -->\n&lt;dependency>\n  &lt;groupId>org.apache.poi&lt;/groupId>\n  &lt;artifactId>poi-ooxml&lt;/artifactId>\n  &lt;version>5.3.0&lt;/version>\n  &lt;exclusions>\n    &lt;exclusion>\n      &lt;groupId>org.apache.xmlbeans&lt;/groupId>\n      &lt;artifactId>xmlbeans&lt;/artifactId>\n    &lt;/exclusion>\n  &lt;/exclusions>\n&lt;/dependency>\n\n&lt;!-- 更省事的做法：全局钉死版本 -->\n&lt;dependencyManagement>\n  &lt;dependencies>\n    &lt;dependency>\n      &lt;groupId>org.apache.xmlbeans&lt;/groupId>\n      &lt;artifactId>xmlbeans&lt;/artifactId>\n      &lt;version>5.3.0&lt;/version>\n    &lt;/dependency>\n  &lt;/dependencies>\n&lt;/dependencyManagement>\n\nmvn dependency:tree -Dincludes=org.apache.xmlbeans:xmlbeans</pre><b>要点</b>：Maven 按「路径最近优先、同深度先声明优先」在冲突里挑一个，不开 <code>-Dverbose</code> 看不到被丢掉的那个；<code>exclusions</code> 只对当前这条链路有效，要全局统一版本就用 <code>dependencyManagement</code> 钉死，改完必须再跑一次树确认只剩一个版本。</div></details>',
        '把同一个项目改造成 Gradle 工程，用 ./gradlew build 构建，比较两份构建脚本的差异。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">plugins {\n  id "java"\n}\n\njava {\n  toolchain {\n    languageVersion = JavaLanguageVersion.of(25)\n  }\n}\n\nrepositories {\n  mavenCentral()\n}\n\ndependencies {\n  testImplementation platform(\n      "org.junit:junit-bom:5.11.0")\n  testImplementation "org.junit.jupiter:junit-jupiter"\n}\n\ntasks.withType(JavaCompile).configureEach {\n  options.encoding = "UTF-8"\n}\n\ntest {\n  useJUnitPlatform()\n}\n\ngradle wrapper --gradle-version 9.1\n./gradlew build\nls build/libs/*.jar</pre><b>要点</b>：依赖同样是 test 范围，但 Gradle 用配置名 <code>testImplementation</code> 表达，不是 <code>&lt;scope&gt;</code>；BOM 用 <code>platform(...)</code> 引入后不必逐条写版本。产物目录从 target 变成 build，源码目录一套约定两边通用，同一份源码可以被两种构建脚本消费。</div></details>',
        '为一个包含“余额不足”“账户不存在”“正常扣款”三种分支的提现方法写测试，覆盖异常与正常路径。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">class WithdrawTest {\n  private final WithdrawService svc =\n      new WithdrawService();\n  private Account acct;\n\n  @BeforeEach\n  void setup() {\n    acct = new Account("A1", new BigDecimal("100"));\n  }\n\n  @Test\n  void ok() {\n    svc.withdraw(acct, new BigDecimal("30"));\n    assertEquals(0, new BigDecimal("70")\n        .compareTo(acct.balance()));\n  }\n\n  @Test\n  void insufficient() {\n    assertThrows(BizException.class, () ->\n        svc.withdraw(acct, new BigDecimal("101")));\n    // 异常路径也要断余额没动\n    assertEquals(0, new BigDecimal("100")\n        .compareTo(acct.balance()));\n  }\n\n  @Test\n  void notFound() {\n    assertThrows(BizException.class, () ->\n        svc.withdraw(null, new BigDecimal("1")));\n  }\n\n  @ParameterizedTest\n  @CsvSource({"100,0,0", "100,100,0", "100,30,70"})\n  void edge(String bal, String amt, String left) {\n    Account a = new Account("A2", new BigDecimal(bal));\n    svc.withdraw(a, new BigDecimal(amt));\n    assertEquals(0, new BigDecimal(left)\n        .compareTo(a.balance()));\n  }\n}</pre><b>要点</b>：每条用例先把余额构造成已知值，异常路径既断异常类型、也断余额没变——只断异常的话「扣了钱再抛」这种 bug 检不出来；把判断逻辑改坏一行至少有一个用例变红，测试才算有效保护。</div></details>',
        '用 Mockito 为依赖 Repository 的 Service 写测试，验证保存时状态被正确设置，并说明哪些东西不该 mock。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">class PayServiceTest {\n  @Mock Repository repo;\n  @InjectMocks PayService svc;\n\n  @BeforeEach\n  void init() {\n    MockitoAnnotations.openMocks(this);\n  }\n\n  @Test\n  void pays() {\n    Order o = new Order(1L, new BigDecimal("9.9"));\n    when(repo.findById(1L))\n        .thenReturn(Optional.of(o));\n\n    svc.pay(1L);\n\n    ArgumentCaptor&lt;Order> cap =\n        ArgumentCaptor.forClass(Order.class);\n    verify(repo, times(1)).save(cap.capture());\n    assertEquals(Order.Status.PAID,\n        cap.getValue().status());\n  }\n}</pre><b>要点</b>：用 <code>@Mock</code> + <code>@InjectMocks</code> 只替掉外部依赖，失败才只可能来自被测逻辑；实体、枚举、String、List 都不该 mock——mock 它们只会让测试和实现细节绑死。抓参数用 <code>ArgumentCaptor</code>，比在 save 里加断言更贴近真实调用。</div></details>'
      ] }
    ]
  };

})();
