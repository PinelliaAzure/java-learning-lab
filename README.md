# Java 学习地图

一个**纯本地、零依赖**的 Java 全栈学习网站：20 个模块、84 个知识点、252 道习题。面向零基础，按「读教材 → 看流程图 → 勾选 → 做习题」的顺序一路学完。

![夜间模式](preview.png)

![日间模式 · 准备篇](preview-light.png)

## 怎么打开

直接**双击 `index.html`**（推荐 Chrome / Edge / Safari）。

不需要安装、不需要联网、不需要启动服务器。整个站点只有 HTML / CSS / JS 文件，没有任何 CDN 或外部字体。

## 三种主题

右上角可以在三种模式之间切换，选择会保存在本机：

- **☀ 日间**：暖白纸张底色，适合白天和明亮环境。
- **☾ 夜间**：深色底 + 低亮度代码画布，适合晚上长时间阅读。
- **◐ 跟随系统**：读取操作系统的 `prefers-color-scheme`，系统切换时页面同步变化。

## 导航与功能入口

顶栏只放两件事：**搜索**和**学习状态**。

- 左侧是站点标题；右侧依次是搜索框、主题切换、进度圆环（已学完 / 84）和小字统计（已学完、课已通过）。
- 搜索框可以点开，也可以直接按 `/` 聚焦：输入课程名、模块名、知识点或代码关键词，结果按相关度列出，摘要会定位到命中位置。`↑` `↓` 选择、`Enter` 直达对应课程、`Esc` 收起。
- 其余功能都收在右下角的「**☰ 更多**」悬浮菜单里，一屏之内看全，也不占正文空间。菜单按用途分三组，组内按常用程度排序：

| 分组 | 菜单项 | 作用 |
|---|---|---|
| 练习与测验 | 模块测验 | 按模块抽 15 题，20 分钟，答对 2/3（≥66%）通过 |
| | 结业考试 | 综合卷，交卷后给评分与逐题解析 |
| | 错题本 | 做错的题集中重做，附解析 |
| | 代码练习 | 输出预测 / 找错 / 填空，31 题 |
| 我的资料 | 书签 | 收藏的课程，一键跳回 |
| | 笔记 | 每课一条笔记，保存在本机 |
| | 进度数据 | 导出 / 导入 JSON，重置学习进度 |
| 拓展内容 | 排序算法实验室 | 跳到 `sorting.html`，12 种排序的逐步动画 |

原来那个把书签、笔记、数据包在一起的「学习工具」弹窗已经拆开了：三项各自是菜单里的一项，点开只显示这一项，不再需要先开弹窗再切标签。

**重置学习进度**在「进度数据」页底部：只清空勾选与考试成绩，书签、笔记和代码练习记录会保留，避免误删自己的笔记。

## 排序算法实验室（`sorting.html`）

课程里的排序算法只有静态流程图，所以单独做了一个可视化实验室：12 种排序的逐步动画、辅助数组展示、复杂度对比与 Java 实现，同样是本地文件，双击即可用。

![排序算法实验室](preview-sorting.png)

- 侧栏切换 12 种算法：冒泡、选择、插入、鸡尾酒、希尔、归并、快速、堆、计数、桶、基数、梳排序。
- 播放 / 暂停、单步前进后退、拖动进度条回看，速度与数据规模可调，还有随机 / 近乎有序 / 完全逆序 / 少量重复四种预设。
- 每一步都告诉你「正在比较哪两个元素」，气泡图上的颜色对应已排序、基准、比较、交换四种状态。
- 与课程页共用同一套配色、圆角与三种主题；入口只有一个：首页右下角「☰ 更多」菜单里的「排序算法实验室」。它属于拓展内容，不占课程目录。

## 已移除交互动画

原来的「交互动画」标签页、步骤播放器、可点击图解、HashMap/Stream 小组件已**全部删除**，不再占用页面和注意力。只在讲流程的地方保留**静态流程图**，一眼看完，不需要操作。

当前共 88 张流程图，84 章全部有图（零缺口）；最后补上的正是「SQL 基础」那章缺的「一条查询走完的路径」。会画的是概念与语法章里真正需要视觉锚点的那一张，不硬凑。例如：

1. 准备篇：下载 JDK → 安装 → 环境变量 → 验证 → IDE 运行
2. JDK 篇：源码 → 字节码 → 类加载 → 解释/JIT → 机器码
3. 方法：调用 → 压栈 → 执行 → 返回 → 回调用处
4. 类与对象：new → 堆分配 → 构造器 → 返回引用
5. 继承：子类构造 → super → 父类初始化 → 子类初始化
6. 多态：调用 → 实际类型 → 方法表 → 执行
7. Scanner：键盘 → 缓冲区 → 解析 → 变量
8. 循环：初始化 → 条件 → 循环体 → 更新 → 回到条件

## 教材式章节：84 章，纯汉字 ≥4500 的章节 83/84

20 个模块、84 章已全部教材化，纯汉字 ≥4500 的章节 83/84；内容从准备篇一路覆盖到 Spring 生态、Spring Security 与现代 Java 与 AI 工程，最后以项目实战收尾。唯一例外是 `sql-jdbc`（3816 字）：它原本在模块 12 里重复讲 SQL，现已把 SQL 部分整体让给同模块的 `sql-basics`、只留 JDBC 本身，这是有意做的减法。

| 模块 | 章节 |
|---|---|
| 01 准备篇 | 从零安装 JDK 并跑通第一个程序 |
| 02 Java 起步 | JDK、JRE 与 JVM；变量、基本类型与字面量；运算符、类型转换与精度；输入输出与 Scanner；流程控制与数组 |
| 03 面向对象 | 方法、参数传递与重载；类、对象与构造器；封装、this 与 static；继承、super 与方法重写；多态与动态绑定；抽象类、接口与默认方法；枚举、record 与内部类；包、访问权限与 JavaBean |
| 04 核心类库 | String 与字符串常量池；StringBuilder 与包装类；日期时间 API；正则；Math 与常用工具；Arrays、Objects 与 BigDecimal；Java 8~25 新特性速览 |
| 05 集合框架 | 集合体系与 List；ArrayList 与 LinkedList；HashMap 的底层原理；Set、TreeSet 与比较器；迭代器、Queue 与 PriorityQueue；TreeMap、EnumMap 与 Properties |
| 06 异常与泛型 | 异常体系与 try-catch-finally；自定义异常与最佳实践；泛型类、方法与通配符；类型擦除与泛型限制 |
| 07 函数式编程 | Lambda 与函数式接口；Stream 流水线；Optional 与空值处理 |
| 08 IO 与 NIO | 字节流与字符流；缓冲流与 try-with-resources；文件与 NIO：Path / Files；序列化与 JSON；网络编程与 JSON |
| 09 并发编程 | 线程的创建与生命周期；synchronized、volatile 与原子性；线程池与 ExecutorService；并发集合与 CompletableFuture；死锁与 JMM 基础 |
| 10 网络编程 | TCP/IP、Socket 与端口；HttpClient 与 HttpServer；NIO：Channel、Buffer 与 Selector |
| 11 JVM | 运行时内存区域；垃圾回收与常见收集器；类加载与双亲委派；字节码与性能调优入门 |
| 12 反射与设计模式 | 反射：在运行时操作类；注解与元注解；单例、工厂与建造者；策略、观察者与代理 |
| 13 数据库与 Web | SQL 基础：增删改查；JDBC：接口、五步与连接池；PreparedStatement 与事务；HTTP 与 Servlet 请求链路；Maven、Gradle 与单元测试 |
| 14 数据库进阶 | 索引、B+ 树与执行计划；事务隔离、MVCC 与锁；慢查询、分页与数据库优化 |
| 15 Redis 与消息队列（选修） | Redis 缓存与分布式锁；消息队列：解耦、削峰与幂等 |
| 16 安全与加密 | 编码、哈希与密码存储；对称加密、非对称加密与签名；HTTPS 与常见 Web 漏洞 |
| 17 Spring 生态 | IoC 与依赖注入；Spring Boot 自动配置；Spring MVC 请求链路；MyBatis 与 JPA 数据访问；日志、打包与部署 |
| 18 Spring AOP 与 Security | Spring AOP 与动态代理；Spring Security 认证与授权 |
| 19 现代 Java 与 AI 工程 | Java 21–25 语言演进与 LTS 迁移；虚拟线程落地与并发选型；Spring Boot 4 / Framework 7 迁移；Testcontainers 与数据库迁移脚本；Spring AI 接入 LLM；MCP 与工具编排；可观测性与原生化部署；AI 辅助开发与质量闸 |
| 20 项目实战 | 项目实战一：控制台图书管理系统；项目实战二：Spring Boot REST 接口 |

每章包含：

- 12~34 个小节，从“为什么”讲到语法、边界和设计取舍
- 4~10 段可运行代码、运行结果
- 类型范围表、访问权限表、重载规则表、继承对比表等
- 一个综合案例（如员工薪资体系、购物车、命令行计算器、图书管理）
- 常见追问与自测练习
- 静态流程图（按需）
- 章末小结

学习页只有两个标签：**知识讲解** 和 **练习验证**。练习仍然需要先勾选「我已学完」才能解锁。

## 学习流程

1. **读教材**：目标、路线、分段正文、代码、流程图。
2. **勾选完成**：点「勾选：我已学完本知识点」。
3. **做习题**：3 道题，逐题判分、附解析；答对 2 题（≥2/3）标记为「已掌握」。
4. **进度保存**：勾选、分数、上次学到哪一课都存进 localStorage。

## 覆盖范围

| 模块 | 内容 |
|---|---|
| 01 准备篇 | 安装 JDK、环境变量、IDE、第一个程序（教材） |
| 02 Java 起步 | JDK/JRE/JVM、变量与类型、运算符、Scanner、流程控制与数组（教材） |
| 03 面向对象 | 方法与重载、类与对象、封装、继承、多态、抽象类/接口、枚举/record、包与 JavaBean（教材） |
| 04 核心类库 | String、StringBuilder/包装类、日期时间、正则、Arrays/BigDecimal、现代 Java |
| 05 集合框架 | List、ArrayList vs LinkedList、HashMap、Set/比较器、迭代器/队列、TreeMap/EnumMap |
| 06 异常与泛型 | 异常体系、自定义异常、泛型与通配符、类型擦除 |
| 07 函数式编程 | Lambda、Stream、Optional |
| 08 IO 与 NIO | 字节流/字符流、缓冲流、Path/Files、序列化、网络与 JSON |
| 09 并发编程 | 线程生命周期、synchronized/volatile、线程池、并发容器、死锁与 JMM |
| 10 网络编程 | TCP/Socket、HttpClient/HttpServer、NIO Selector |
| 11 JVM | 内存区域、垃圾回收、类加载、字节码与调优 |
| 12 反射与设计模式 | 反射、注解、单例/工厂/建造者、策略/观察者/代理 |
| 13 数据库与 Web | SQL、JDBC、PreparedStatement 与事务、HTTP/Servlet、Maven/JUnit |
| 14 数据库进阶 | B+ 树索引、EXPLAIN、MVCC/锁、慢查询与分库分表 |
| 15 Redis 与消息队列（选修） | 缓存三坑、分布式锁、Kafka/RabbitMQ、幂等与积压 |
| 16 安全与加密 | 编码/哈希、AES/RSA/签名、HTTPS 与 Web 漏洞 |
| 17 Spring 生态 | IoC/DI、Boot 自动配置、Spring MVC、MyBatis/JPA、日志与部署 |
| 18 Spring AOP 与 Security | 切面与代理、过滤器链、认证授权、JWT、BCrypt |
| 19 现代 Java 与 AI 工程 | LTS 与语言演进、虚拟线程、Boot 4 迁移、Testcontainers、Spring AI、MCP、可观测性与原生化、AI 质量闸（教材） |
| 20 项目实战 | 控制台图书管理系统、Spring Boot REST 接口 |

## 内容统计

- **20** 个模块
- **84** 个知识点
- **84** 章教材正文（正文纯汉字 5025~7731，84 章全部 ≥4500）
- **252** 道单选题（每题都有解析）
- **31** 道代码练习（输出预测 / 找错 / 填空）
- **88** 张静态流程图（84 章全部有图）
- **12** 种排序算法的可视化实验室（独立页面 `sorting.html`）

## 文件结构

```text
java-learning-lab/
├── index.html                    页面骨架（双击打开）
├── sorting.html                  排序算法实验室（12 种排序的逐步动画）
├── README.md
├── preview.png                   夜间模式首页
├── preview-light.png             日间模式准备篇
├── preview-sorting.png           排序算法实验室
├── css/
│   ├── style.css                 样式、日夜主题、教材与流程图排版
│   └── sorting.css               实验室样式（复用同一套设计令牌与主题）
├── js/
    ├── engine.js                 路由、主题、进度、教材渲染、练习引擎
    ├── search.js                 顶栏搜索：索引、命中摘要、键盘选择
    ├── menu.js                   右下角「更多」菜单（收集各模块注册的入口）
    ├── tools.js                  书签 / 笔记 / 进度数据三个弹窗
    ├── code-lab.js               代码练习弹窗：作答、判分、记录
    ├── code-exercises.js         代码练习题库 31 题（输出预测 / 找错 / 填空）
    ├── exams.js                  模块测验、结业考试、错题本
    ├── exam-extra-1.js           补充考题：m0–m4 模块
    ├── exam-extra-2.js           补充考题：m5–m9 模块
    ├── exam-extra-3.js           补充考题：m10–m14 模块
    ├── exam-extra-4.js           补充考题：m15–m19 模块
    ├── sorting-algorithms.js     12 种排序的动画步骤生成器
    ├── sorting-lab.js            实验室交互：播放、单步、对比、代码高亮
    ├── curriculum-1.js           课程数据：Java 起步 / 面向对象 / 核心类库
    ├── curriculum-2.js           课程数据：集合框架 / 异常与泛型 / 函数式编程
    ├── curriculum-3.js           课程数据：IO 与 NIO / 并发编程 / JVM
    ├── curriculum-4.js           课程数据：反射与设计模式 / 数据库与 Web / Spring 生态
    ├── curriculum-5.js           课程数据：准备篇、项目实战，并给已有模块补课
    ├── curriculum-6.js           课程数据：现代 Java、进阶集合、网络与 JSON 补课
    ├── curriculum-7.js           课程数据：网络编程 / 安全与加密 / Spring AOP 与 Security / 数据库进阶 / Redis 与消息队列
    ├── curriculum-14-modern.js    课程数据：现代 Java 与 AI 工程（8 课，插在 Spring 与项目实战之间）
    ├── guides-1.js               非教材章节的精讲与作业
    ├── guides-2.js               非教材章节的精讲与作业
    ├── guides-3.js               非教材章节的精讲与作业
    ├── guides-4.js               非教材章节的精讲与作业
    ├── guides-5.js               非教材章节的精讲与作业
    ├── deep-1.js                 非教材章节的逐步拆解与小结
    ├── deep-2.js                 非教材章节的逐步拆解与小结
    ├── deep-3.js                 非教材章节的逐步拆解与小结
    ├── deep-4.js                 非教材章节的逐步拆解与小结
    ├── textbook-basics-1.js      教材：准备篇、JDK 篇
    ├── textbook-basics-2.js      教材：变量与运算符
    ├── textbook-basics-3.js      教材：Scanner、流程控制
    ├── textbook-basics-extra.js  基础篇补充（目录、字节码、进制、位运算等）
    ├── textbook-oop-1.js         教材：方法与类对象
    ├── textbook-oop-2.js         教材：封装与继承
    ├── textbook-oop-3.js         教材：多态、抽象类与接口
    ├── textbook-oop-4.js         教材：枚举 record、包与 JavaBean
    ├── textbook-oop-extra.js     面向对象的案例、追问与自测
    ├── textbook-flows.js         面向对象的流程图
    ├── textbook-topup.js         早期补写的教材小节
    ├── textbook-topup-2.js       补写批次二（新增知识点）
    ├── textbook-topup-3.js       补写批次三（新增知识点）
    ├── textbook-projects-1.js    教材：控制台项目、Spring Boot 项目、SQL 基础
    ├── textbook-core-1.js        教材：String 到现代 Java
    ├── textbook-collections-1.js 教材：集合框架 6 章
    ├── textbook-exceptions-1.js  教材：异常、泛型、类型擦除、Lambda
    ├── textbook-fp-io-1.js       教材：Stream 到序列化
    ├── textbook-concurrency-1.js 教材：网络与 JSON、线程、并发容器、死锁与 JMM
    ├── textbook-jvm-1.js         教材：JVM 内存到注解
    ├── textbook-db-1.js          教材：设计模式到 JDBC、事务、构建与测试
    ├── textbook-db-adv-1.js      教材：索引与锁
    ├── textbook-db-adv-2.js      教材：数据库优化与 Redis
    ├── textbook-spring-1.js      教材：IoC 到部署
    ├── textbook-modern-1.js      教材：现代 Java 第 1–4 章（LTS 迁移、虚拟线程、Boot 4、Testcontainers）
    ├── textbook-modern-2.js      教材：现代 Java 第 5–8 章（Spring AI、MCP、可观测性、AI 质量闸）
    ├── textbook-net-1.js         教材：TCP/Socket、HttpClient/HttpServer
    ├── textbook-net-2.js         教材：NIO Selector、安全基础
    ├── textbook-sec.js           教材：加密与 Web 安全
    ├── textbook-springsec.js     教材：Spring AOP 与 Security
    └── textbook-mq.js            教材：消息队列
└── tools/
    ├── verify.js                 一致性校验器：node tools/verify.js .（零依赖，退出码 0/1）
    ├── audit-sections.js         章内结构体检：node tools/audit-sections.js [章id…]
    ├── audit-tail.js             章尾两节体检：node tools/audit-tail.js [章id…]
    ├── tag-audit.js              代码块语言标注普查：node tools/tag-audit.js（列非 java 块与疑似错标）
    └── run-blocks.js             可选闸门：node tools/run-blocks.js [--chapter 章id] [--strict]（每块独立目录 javac --release 25 真编译、真跑、比对 out）
```

## 关于内容与版权

课程的知识点顺序参考了廖雪峰 Java 教程、菜鸟教程 Java 和 Java 学习笔记的公开目录，正文为原创重写，没有整段复制；那三家站点的正文受版权保护，不能直接搬运。

## 想自己加知识点？

在任意 `curriculum-*.js` 里向对应模块的 `lessons` 数组添加对象；精讲写在 `guides-*.js` 与 `deep-*.js`，教材正文写在 `textbook-*.js`，流程图用 <code>{ flow: ['步骤1', '步骤2'] }</code> 块。侧边栏、首页统计、模块进度会自动更新。

## 已验证

- 20 个模块、84 个知识点、252 道题、84 章教材与 88 张流程图全部通过脚本校验：`node tools/verify.js .` 16 条规则（10 条必测 + 6 条附加）全 PASS、退出码 0；另有 `node tools/audit-tail.js` 84 章逐章体检 PASS 84 / FAIL 0。
- 无头 Chrome 全量回归 **84 章 × 1440 / 430 两个视口**（168 次加载、0 控制台报错）：909 个 .cb 代码块全部带复制按钮且点击出提示；430px 下逐章 documentElement.scrollWidth 全部 ≤ 430（此前 34 章溢出，最坏一处 3005）；.tb-out 运行结果长行改为折行、不再被右缘裁掉（此前 89 个块溢出、命中 32 章）；A4 打印宽度下 0 章溢出；折叠答案 374 块展开无横向滚动；表格 84/84 章包裹；非法 hash 三种形态回首页无异常。
- 84 章正文纯汉字 5025~7731（口径同 `tools/audit-sections.js`：正文段落、列表、提示与表格文字，含章尾问答与题面，不含代码块与运行结果；最低 `sql-jdbc`、最高 `hashmap`，84 章全部 ≥4500）。2026-10 的 P1/P2 两轮又给 24 章补了依赖坐标、前置参数与实测口径，这条区间随之从 3390~6078 上移。
- 84 章章内结构：小节 1197 个、其中只有 1 个正文块的「占位小节」仅剩章尾三节（章尾之外的占位小节为 0）；`code` 块 548 个、紧跟 `out` 的 343 个（62.6%）、`flow` 块 88 个无丢失。这一轮做的是章内重排与同主题合并：小节数从 1473 降到 1197，正文汉字只下降 0.2%，没有靠删代码块或砍知识点瘦身。
- 84 章章尾两节格式统一：倒数第二节「常见追问」一律为 1 个 3~6 条的问答列表（共 450 条，每条「问：…／答：…」，答案 50~320 汉字）；末节「自测与练习」一律为 1 个 3~9 题的列表（共 413 题），每题用原生 `<details class="tb-ans">` 折叠参考答案。
- 折叠答案分两种形态，按题目语义选：**要产出一份能直接复制执行的东西**（写方法/类/枚举/record、写 SQL、写 `javac`/`jcmd`/`jmap`/`mvn`/`gradle`/`docker`/`curl` 命令、写 `pom.xml`/`@Bean`/`yml`/`Dockerfile` 片段，含「故意制造编译错误或运行异常来观察」）→ `<pre class="tb-ans-code">` 给代码，后面最多跟一句「要点」讲坑位，**不再写「预期现象」**；纯解释、原理、取舍、画图类 → 保留「预期现象 / 为什么 / 要点」三段式（80~190 汉字，中位数 111）。实测 413 题 = 代码形态 **374 题** + 三段式 **39 题**，代码块 6~91 行（中位 23 行）、374 条全部带「要点」、无一处残留「预期现象」。样式是 `css/style.css` 里的 `.tb-ans > .ans-body pre.tb-ans-code`（恒暗底、等宽、独立横向滚动）。这两条格式已固化成 `tools/verify.js` 的规则 13、14（规则 14 形态化校验：① 单个代码块 ② 代码 + 紧邻命令块 ③ 纯命令块（题库里 11 题本来就是纯命令答案）；最多 3 块、每块语言两两不同、命令块必须在最后、两块之间只允许空白，并且「代码块之外不得有残留文本」「pre 开闭必须配平」（实测开 436 / 闭 436）；代码块须闭合、java 侧非空白 ≥20 字符、内部不得有未转义 `<`；三段式三要素齐全），改坏会直接 FAIL。
- 三处代码容器（教材 `code` 块 / 折叠答案代码块 / 代码练习）已收敛成同一个 `.cb` 组件：头部三圆点 + 语言标签（Java / 命令 / SQL / XML / 配置 / HTTP / Dockerfile / 文本）+ 常显复制按钮。复制的是纯内容——命令块剥掉 `$ ` 提示符、答案块只复制代码不复制「要点」，点击后按钮显示「已复制」1.4 秒复原。旧的三套类名（`.tb-code*`、`.code-block`/`.copy-btn`、答案块独立样式）已全部拆除，只留 `.cb` 一套；顺带修掉一个旧缺陷：一页多块时，代码练习的复制按钮以前总是复制整课代码。
- 548 个教材 `code` 块与 436 条答案代码块**全部显式声明语言**，不做内容嗅探（嗅探会把 `abstract class Employee {` 误判成非 Java）：教材 java 459 / sql 25 / props 21 / shell 16 / xml 18 / text 4 / http 3 / docker 2，答案 436 块：java 329 / shell 69 / sql 16 / xml 10 / props 9 / http 1 / docker 2，缺标注 0、非法值 0。目录树这类非代码块用 `text`（不套提示符也不高亮），Gradle/ini/yaml 统一归 `props`。已固化为 `tools/verify.js` 规则 15，另有 `node tools/tag-audit.js` 做全量普查（当前疑似错标 0）。
**2026 实用性整改（P1）**：
- 8 章补齐第三方依赖坐标：com.mysql:mysql-connector-j、jakarta.servlet:jakarta.servlet-api（provided）、spring-retry + @EnableKafka、redis.clients:jedis（含 JedisPool 借还与非线程安全提示）、org.testcontainers:testcontainers-bom、org.springframework.ai:spring-ai-bom、org.mybatis.spring.boot:mybatis-spring-boot-starter、com.tngtech.archunit:archunit-junit5 与 io.rest-assured:rest-assured。版本号一律写「以官方 BOM / 发布说明为准，本机未实测」，不编造精确号。
- 版本标尺统一：Java 侧全站 Java 25（--release 25、eclipse-temurin:25-jre、maven:3.9-eclipse-temurin-25），21 只作存量口径；Spring 侧「Boot 4.0.x（2025-11-20 GA，Framework 7 / Jakarta EE 11）是新项目目标，3.x 只作存量」；并写明下一个 LTS 是 Java 29（2027-09），26/27/28 都不是 LTS。
- 接线补齐：JwtAuthFilter 现在真的注册了（addFilterBefore + sessionManagement(STATELESS) + 401 处理 + FilterRegistrationBean 防双跑）；project-console 的 BookStore 改为集合走参数、Main 真调 load()/save()、临时文件原子移动落盘；deploy 的 finalName=app 与 Dockerfile 的 COPY --from=build /src/target/app.jar 三处同名；otel-native 的多阶段构建补上了 build 阶段。
- 7 章补上静态流程图（变量、运算符、封装、抽象类与接口、枚举 record、包与 JavaBean、SQL 基础），全站 88 张、84 章全部有图。
- meta 文案改为渲染期重算：字数、建议分钟、题量、是否有流程图之外，「N 段代码 / N 张表(格)」也由引擎按实际块数改写（84 章逐章校验「渲染值 == 实际块数」全一致、同章连渲三次幂等、缺该段的 meta 不会被凭空追加）。
- 搜索同一课最多占 2 条名额：搜 HashMap 的 8 条命中从「6 条同一小节」变成覆盖 6 个知识点（HashMap×2 + collections-advanced / optional / concurrent-collections / encapsulation / modern-java）。
- 新增可选闸门 node tools/run-blocks.js：按 index.html 顺序加载数据，每块独立临时目录 javac --release 25 真编、真跑，stdout 与紧跟的 out 逐行比对；全量样本 792、跳过 248（其中「混入命令行」已降到 0）、送编 540、编译通过 453、编译失败 87（多数是「引用前文块的类」这类逐段演进风格）、可直跑 389、输出全对 170、OUT-DIFF 34。默认退出码 0，只有 --strict 才把编译失败与 OUT-DIFF 当失败。
**2026 精度层整改（P2）**：
- 逐个跑通 792 个代码块的 `tools/run-blocks.js` 先修了自己：`tools/run-blocks.js:458` 在 stdout 已带尾换行时又拼一个 `\n`，凭空插进空行，让「stdout+stderr 才对得上」的块恒判失配。修完全量 OUT-DIFF 从 48 降到 **34**、输出全对从 155 升到 **170**。
- 34 条差异逐块归因后 **0 条真错**：外部前提 14 条（要 `--add-opens`、要输入文件、要外部服务、要第三方 jar、要 `javap` 输出、要 `-Xmx` 限堆）、时序与耗时数值 19 条、教材有意截断 1 条。这类块的做法是保留 out、紧跟一个 note 把「复现前提」或「为什么会变」讲清，而不是把 out 改成某台机器的快照。
- 修真错的 5 处：`PriorityQueue` 的 `toString` 是堆数组顺序（`iterator-queue#b77` out 由 `[5, 6, 4]` 改为实测 `[4, 6, 5]`、p 重写为真实 poll 轨迹）、`#b55` 尾随空格（code 改成 `(pq.isEmpty() ? "" : " ")`）、桥方法签名（`public java.lang.Object StringNode.get()` → `java.lang.Object BridgeDemo$StringNode.get()`，并补 javap 的 `ACC_BRIDGE` / `ACC_SYNTHETIC` 取证）、两处 CCE 消息被截断的 out 补回 module/loader 后缀与栈帧。
- 补前置参数说明 10 处：反射读 `HashMap.table` 要 `java --add-opens java.base/java.util=ALL-UNNAMED`（JEP 396/403 之后只剩这条路）、SPI 演示要 mysql-connector jar 在 classpath、缓冲流/字符流例子要先造 `big.bin` / `input.txt` / `note.txt`、selector 例子占 9000 端口、`-Xmx` 限堆才能看到 `OutOfMemoryError`。
- 修掉一批「跑一遍就发现不对」的教材事实：jstat `-gcutil` 是 13 列不是 11 列（`-gc` 是 19 列）、`CompileThreshold=1500` 是 Client VM 历史值（分层编译实际是 Tier3 200 / Tier4 5000）、`MetaSpaceDemo` 的池列表（JDK 11 起 CodeCache 拆成三个 CodeHeap）、`PrintEscapeAnalysis` 是 develop-only 选项、`ConcatDemo` 的 88890 字符、`sendAsync` 每个 HttpClient 自建缓存池、MCP 最新协议是 2026-07-28（取消 initialize 握手）。
- 另修一个只在渲染时才暴露的 P0 缺陷：正文与习题解析是 innerHTML 直插，`List<String>` 这种裸尖括号会被当未知标签吞掉，数据层扫描出 **21 处**（正文 7、表格单元格 2、习题解析/选项 12），全部改为 `&lt;` 转义后复扫归零。


- 命令行块逐行判定：带 `$ ` 前缀、首词命中命令词表（`java` `javac` `mvn` `gradle` `docker` `curl` `jcmd` `jdeps` `echo` 等）、`VAR=` 赋值、`::` 注释行才按命令渲染并补 `$ ` 提示符；程序输出与 `#`/`//` 注释压暗；**反斜杠续行按「同一条命令的后续行」渲染**（不加第二个提示符、不压暗）。命令词表含 shell 关键字（for / while / if / case / do / done / esac / time…）、路径形态首词（`/…` `./…` `~/…` `C:\…` `$VAR/bin/…`）、以及去掉引号后的 `"$VAR/bin/java" -cp out Hello`；`pay:` / `plugins {` / `maximum-pool-size: 10` 这类配置行仍判为非命令。教材 16 个 shell 块与答案里的 69 个命令块走同一套判定（答案块此前根本不进判定路径、整块退化成纯文本，P3 才接通），提示符、续行与复制出的文本逐字节一致。已固化为规则 16。

**2026 代码块语言纯度整改（P3）**：
- 「Java 与命令混在同一个代码块」的答案拆成 `java` + 紧邻 `shell` 两块，共 43 块（26 块被 `tools/run-blocks.js` 判为「混入命令行」，另 17 块把命令写成以 `#` 开头的注释段落而被归到「游离语句」）；另修 5 处整块语言误标。拆完后 run-blocks 的「混入命令行」26→**0**、跳过总数 289→**248**，OUT-DIFF 仍 34 条且章分布与上一轮基线逐章一致（拆块零回归）。
- 三种形态都合法、且都被规则拦住：单个 java 代码块、代码 + 紧邻命令块、纯命令块（题库里 11 题本来就只该给命令，不许为了凑形态编造 Java）。答案里现在 单块 314 题 / 双块 58 题 / 三块 2 题。
- 答案命令块接上了渲染：`js/engine.js` 的 `decorateCodeBlocks` 以前只对 `lang === 'java'` 重写 innerHTML，非 java 一律保留纯文本——命令块因此在页面上既没有 `$` 提示符也不压暗。补上 shell 分支后，六章实测 `cb-prompt`：setup 9→19、deploy 1→16、boot4-migration 0→10、mvc-flow 0→10；436 个答案块复制出的文本与改动前逐字节相同。
- 顺手补掉拆块中途产生的事故：4 行把命令段复制到了 `</pre>` 外面还多留一个孤儿 `</pre>`（`js/textbook-db-1.js:713`/`:714`、`js/textbook-modern-2.js:343`/`:344`），已删重复段，并让规则 14 以后能拦住这类残留。
- 完整走通「勾选 → 答题 → 100 分 → 写入 localStorage → 刷新恢复」。
- 日间/夜间/跟随系统三种主题均实测，系统深浅色切换与刷新记忆正常。
- 桌面（1440 宽）与手机（430 宽）布局均已截图检查。
- 新版导航：顶栏搜索（含 `/` 聚焦、↑↓ 选择）、悬浮「更多」菜单三组 8 项、书签 / 笔记 / 进度数据三个独立弹窗与重置卡均已无头截图核对；桌面 1440 与手机 500 宽布局正常。
- 排序算法实验室：无头 Chrome 实测 12 种算法全部加载、播放/单步/进度条正常、代码高亮与对比表可切换；日间与夜间（1440 宽）、窄屏（500 宽）均已截图检查；顶栏单一入口在桌面与窄屏都不折行。
