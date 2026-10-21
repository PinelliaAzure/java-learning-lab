/* =====================================================================
   补充 2：现代 Java / 进阶集合 / 网络与 JSON
   ===================================================================== */
(function () {
  'use strict';

  var C = window.JAVA_COURSE;
  if (!C) return;

  function S(code, frames, title, hint) {
    return {
      type: 'steps', title: title, hint: hint, code: code,
      frames: frames.map(function (f) {
        return { line: f[0], vars: f[1], note: f[2], out: f[3] || '', heap: f[4] || null };
      })
    };
  }

  function mod(id) {
    for (var i = 0; i < C.length; i++) if (C[i].id === id) return C[i];
    return null;
  }

  var modern = {
    id: 'modern-java',
    title: 'Java 8~25 新特性速览',
    minutes: 8,
    level: '进阶',
    intro: 'Java 不是停在 Java 8。var、文本块、switch 表达式、record、sealed、模式匹配，让代码更短也更安全；面试和新项目里越来越常见。',
    points: [
      { t: 'var 只做局部变量推断', d: '<code>var list = new ArrayList&lt;String&gt;();</code> 编译器根据右边推断类型，变量仍然强类型。不能用于字段、方法参数，也不能赋 null。' },
      { t: '文本块', d: '三个双引号包住多行字符串，自动处理缩进和换行，写 SQL、JSON、HTML 时不再满屏 \\n。' },
      { t: 'switch 表达式', d: 'JDK 14+ 用箭头语法返回值，不再需要 break；用 <code>yield</code> 从代码块返回。case 可以一次列多个值。' },
      { t: 'record 与 sealed', d: 'record 一行定义不可变数据载体；sealed 限制谁能继承，配合模式匹配可以穷尽所有子类型。' }
    ],
    code: `var names = List.of("Tom", "Anna");

String json = """
        {"name": "Tom", "age": 18}
        """;

int level = switch (score / 10) {
    case 10, 9 -> 1;
    case 8 -> 2;
    default -> 3;
};

if (obj instanceof String s && !s.isBlank()) {
    System.out.println(s.length());
}`,
    tip: 'var 不是动态类型，只是少写一次类型名；团队里仍要保证右边一眼能看出类型。',
    demo: S(`var names = List.of("Tom", "Anna");
var upper = names.stream().map(String::toUpperCase).toList();
int score = 87;
String level = switch (score / 10) {
    case 10, 9 -> "优秀";
    case 8 -> "良好";
    default -> "继续加油";
};
System.out.println(upper + " " + level);`, [
          [0, { names: '[Tom, Anna]' }, 'var 推断出 List<String>，变量仍然是强类型。'],
          [1, { names: '[Tom, Anna]', upper: '[TOM, ANNA]' }, 'Stream 转大写并用 toList() 收集；var 推断出 List<String>。'],
          [2, { names: '[Tom, Anna]', upper: '[TOM, ANNA]', score: '87' }, '准备一个分数 87。'],
          [3, { names: '[Tom, Anna]', upper: '[TOM, ANNA]', score: '87', level: '"良好"' }, 'switch 表达式：87/10 = 8，命中 case 8，直接返回值。'],
          [4, { upper: '[TOM, ANNA]', level: '"良好"' }, '输出结果。', '[TOM, ANNA] 良好']
        ], '更短但更强的 Java', '箭头 switch 不会穿透，也不需要 break。'),
    guide: {
      goals: ['用 var、文本块、switch 表达式简化代码', '理解 record 和 sealed 的适用场景', '在 instanceof 中直接绑定变量'],
      flow: '新特性不是炫技：<b>能减少样板、能表达约束</b>的地方才用。团队项目先确认 JDK 版本。',
      sections: [
        { h: 'var 的边界', p: 'var 只能用于局部变量和 for 循环变量，必须有初始值。它不是 Object，也不能重新赋成别的类型；用得好减少重复，用不好让类型变得不可读。' },
        { h: 'switch 表达式解决了什么', p: '传统 switch 是语句，容易忘 break；表达式必须返回值，编译器检查穷尽性，箭头语法天然不穿透，代码更接近“查表”。' },
        { h: 'sealed 的意义', p: 'sealed interface Shape permits Circle, Rect 明确限定实现者，配合 switch 模式匹配，编译器能检查你是否处理了所有子类型。' }
      ],
      pitfalls: [
        '把 var 用在字段或方法参数上，编译报错。',
        '文本块结尾的三个引号位置影响缩进和换行。',
        'switch 表达式漏掉 default，且不是穷尽枚举时编译报错。'
      ],
      homework: '把一段传统 switch 改写成箭头 switch 表达式；再用文本块写一段 JSON 字符串并打印，观察缩进和换行。'
    },
    quiz: [
      {
        q: '关于 var，说法正确的是？',
        options: ['var 是动态类型，可以随时改变类型', 'var 只能用于局部变量，类型在编译期确定', 'var 可以声明字段', 'var 可以赋 null'],
        answer: 1,
        explain: 'var 只是局部变量的类型推断，编译后类型固定；不能用于字段、参数，也不能没有初始值。'
      },
      {
        q: 'switch 箭头语法相比传统写法，主要好处是？',
        options: ['性能更高', '不会 case 穿透，且可直接作为表达式返回值', '只能用于字符串', '必须写 break'],
        answer: 1,
        explain: '箭头 case 执行完即结束，不会穿透；整个 switch 可以作为表达式赋值给变量。'
      },
      {
        q: 'sealed 关键字的作用是？',
        options: ['让类不可变', '限制哪些类可以继承/实现', '自动生成 getter', '让类线程安全'],
        answer: 1,
        explain: 'sealed 配合 permits 明确列出允许的子类型，便于穷尽检查和领域建模；不可变是 record/final 的职责。'
      }
    ]
  };

  var advancedCollections = {
    id: 'collections-advanced',
    title: 'TreeMap、EnumMap 与 Properties',
    minutes: 7,
    level: '进阶',
    intro: '除了 ArrayList 和 HashMap，JDK 还有几种“看场景选”的容器：要排序用 TreeMap，键是枚举用 EnumMap，读配置文件用 Properties。',
    points: [
      { t: 'TreeMap', d: '按 key 排序的红黑树，支持 <code>firstKey/lastKey/subMap/headMap</code> 范围查询，增删查 O(log n)。key 必须可比较或传入 Comparator。' },
      { t: 'EnumMap', d: '专门用枚举做 key，内部是数组，极快且省内存；遍历顺序就是枚举声明顺序。比 HashMap 更适合状态机、星期、级别映射。' },
      { t: 'Properties', d: '键值都是 String，提供 <code>load/store</code> 读写 .properties 配置；常用来存数据库连接、开关项。注意它是 Hashtable 子类，线程安全但性能一般。' },
      { t: '不可变集合', d: '<code>List.of / Set.of / Map.of</code> 创建后不能增删改，任何修改抛 UnsupportedOperationException；适合常量表和防御性返回。' }
    ],
    code: `TreeMap<String, Integer> scores = new TreeMap<>();
scores.put("Tom", 90);
scores.put("Anna", 95);
scores.firstKey();                 // Anna
scores.subMap("A", "T");           // 范围查询

EnumMap<Level, String> labels = new EnumMap<>(Level.class);
labels.put(Level.HIGH, "高优先级");

Properties props = new Properties();
props.load(new FileInputStream("app.properties"));
String url = props.getProperty("db.url");

List<String> fixed = List.of("a", "b");   // 不可变`,
    tip: '需要排序/范围查询 → TreeMap；枚举 key → EnumMap；配置文件 → Properties；只读常量 → List.of。',
    demo: S(`TreeMap<String, Integer> map = new TreeMap<>();
map.put("Tom", 90);
map.put("Anna", 95);
map.put("Bob", 88);
System.out.println(map);
System.out.println(map.firstKey());`, [
          [0, { map: '{}' }, 'TreeMap 按 key 的自然顺序维护红黑树。'],
          [1, { map: '{Tom=90}' }, 'Tom 成为根节点。'],
          [2, { map: '{Anna=95, Tom=90}' }, 'Anna < Tom，插入左子树。'],
          [3, { map: '{Anna=95, Bob=88, Tom=90}' }, 'Bob 插到 Anna 和 Tom 之间，树始终有序。'],
          [4, { map: '{Anna=95, Bob=88, Tom=90}' }, '按 key 升序输出。', '{Anna=95, Bob=88, Tom=90}'],
          [5, { map: '{Anna=95, Bob=88, Tom=90}' }, 'firstKey 返回最小 key。', 'Anna']
        ], 'TreeMap 自动排序', 'HashMap 不保证顺序，TreeMap 保证按 key 排序。'),
    guide: {
      goals: ['用 TreeMap 做排序和范围查询', '用 EnumMap 替代枚举 key 的 HashMap', '用 Properties 读取配置文件'],
      flow: '选容器先问三件事：<b>要不要顺序？key 是什么类型？要不要线程安全？</b>',
      sections: [
        { h: 'TreeMap 的范围查询', p: 'subMap(from, to) 返回左闭右开区间，headMap 取小于某 key 的部分，tailMap 取大于等于的部分。做排行榜、时间区间统计很方便。' },
        { h: 'EnumMap 为什么快', p: '枚举的 ordinal 是连续整数，EnumMap 直接用数组下标存取，没有哈希冲突，遍历也按声明顺序。' },
        { h: 'Properties 的编码坑', p: 'load(InputStream) 默认按 ISO-8859-1 解码，中文会乱码；JDK 9+ 可用 load(Reader) 指定 UTF-8，或使用 UTF-8 编码的配置文件。' }
      ],
      pitfalls: [
        'TreeMap 的 key 不可比较，运行时 ClassCastException。',
        'List.of 里放 null，直接 NPE。',
        'Properties 用 InputStream 读中文配置，出现乱码。'
      ],
      homework: '用 TreeMap 保存 5 个学生的分数，输出最高分、最低分和 80~90 分区间的人；再用 EnumMap 给 Level 枚举映射中文标签。'
    },
    quiz: [
      {
        q: '需要按 key 排序并支持范围查询，应该用？',
        options: ['HashMap', 'LinkedHashMap', 'TreeMap', 'Hashtable'],
        answer: 2,
        explain: 'TreeMap 基于红黑树，按 key 有序，支持 subMap/headMap 等范围操作。'
      },
      {
        q: '枚举作为 key 时，性能最好的 Map 是？',
        options: ['HashMap', 'TreeMap', 'EnumMap', 'WeakHashMap'],
        answer: 2,
        explain: 'EnumMap 内部用数组按枚举 ordinal 索引，没有哈希计算和冲突，速度最快。'
      },
      {
        q: '<code>List.of("a", "b").add("c")</code> 会怎样？',
        options: ['正常添加', '抛 UnsupportedOperationException', '返回新列表', '编译错误'],
        answer: 1,
        explain: 'List.of 创建的是不可变集合，任何修改操作都会抛 UnsupportedOperationException。'
      }
    ]
  };

  var networkJson = {
    id: 'network-json',
    title: '网络编程与 JSON',
    minutes: 8,
    level: '进阶',
    intro: '后端服务之间、前端与后端之间，最常见的通信方式就是 HTTP + JSON。会用 HttpClient 发请求、会用 Jackson 解析 JSON，是从“会语法”到“能干活”的关键一步。',
    points: [
      { t: 'TCP 与 Socket', d: 'Socket 是 TCP 连接的编程接口，负责可靠字节流；HTTP 是建立在 TCP 之上的应用层协议。日常开发很少直接写 Socket。' },
      { t: 'HttpClient', d: 'JDK 11 内置 <code>java.net.http.HttpClient</code>，支持同步/异步、超时、请求头、JSON body，不需要额外依赖。' },
      { t: 'JSON 的结构', d: '对象 <code>{}</code>、数组 <code>[]</code>、字符串、数字、布尔、null。字段名用双引号，不能有注释，最后一项不能多逗号。' },
      { t: 'Jackson', d: 'Spring Boot 默认的 JSON 库：<code>ObjectMapper</code> 的 <code>writeValueAsString</code> 序列化、<code>readValue</code> 反序列化。字段需要 getter/setter 或无参构造器。' }
    ],
    code: `HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();

HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("https://api.example.com/books/1"))
        .header("Accept", "application/json")
        .GET()
        .build();

HttpResponse<String> response =
        client.send(request, HttpResponse.BodyHandlers.ofString());

if (response.statusCode() == 200) {
    Book book = new ObjectMapper()
            .readValue(response.body(), Book.class);
}`,
    tip: '网络调用三件套：超时、状态码判断、异常兜底。不要假设对方一定返回 200。',
    demo: S(`HttpClient client = HttpClient.newHttpClient();
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/books/1"))
    .GET().build();
HttpResponse<String> res =
    client.send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(res.statusCode());
System.out.println(res.body());`, [
          [0, { client: 'HttpClient' }, '创建客户端；真实项目要设置连接超时和线程池。'],
          [1, { client: 'HttpClient', req: 'GET /books/1' }, '构造请求：URI、方法、请求头。'],
          [2, { client: 'HttpClient', req: 'GET /books/1' }, 'send 是同步阻塞调用；异步用 sendAsync 返回 CompletableFuture。'],
          [3, { client: 'HttpClient', req: 'GET /books/1', status: '200' }, '拿到响应状态码 200，表示成功。', '200'],
          [4, { status: '200', body: '{"id":1,"title":"Java"}' }, '响应体是 JSON 字符串，下一步用 Jackson 转成对象。', '{"id":1,"title":"Java"}']
        ], '一次 HTTP 请求', '网络会失败：超时、404、500、连接拒绝都要处理。'),
    guide: {
      goals: ['用 HttpClient 发起 GET/POST 请求', '判断状态码并处理超时', '用 Jackson 在 JSON 与对象之间转换'],
      flow: '调用链路：<b>建客户端 → 建请求 → send → 判状态码 → 解析 body → 处理异常</b>。',
      sections: [
        { h: '为什么必须设超时', p: '默认没有连接超时，对方不响应时线程会一直卡住。连接超时管“连不上”，请求超时管“连上了但迟迟不返回”，两个都要设。' },
        { h: 'JSON 与 Java 对象的映射', p: 'Jackson 按字段名匹配，getter/setter 或 record 组件都能用；字段名不一致用 @JsonProperty 指定。日期、枚举、泛型集合需要额外配置。' },
        { h: '异常怎么处理', p: '网络异常（IOException）和业务错误（4xx/5xx）要分开：前者重试或降级，后者读错误信息给用户。不要把所有异常都 catch 成“系统繁忙”。' }
      ],
      pitfalls: [
        '不判断状态码，直接把 404 的错误页当 JSON 解析。',
        'HttpClient 每次请求都 new 一个，连接池无法复用。',
        'JSON 字段名大小写不一致，反序列化后字段全是 null。'
      ],
      homework: '用 HttpClient 调用一个公开 API（如天气或 GitHub），打印状态码和响应体前 200 个字符；再用 Jackson 把响应映射成 Map，取出其中一个字段。'
    },
    quiz: [
      {
        q: 'HttpClient 发送请求后，正确做法是？',
        options: ['直接解析 body，不管状态码', '先判断 statusCode，再决定解析还是报错', '只捕获 Exception 不处理', '每次请求都新建客户端'],
        answer: 1,
        explain: '4xx/5xx 的 body 往往不是业务数据，必须先看状态码；客户端应复用，内部有连接池。'
      },
      {
        q: 'JSON 对象的标准写法是？',
        options: ['{name: "Tom"}', '{"name": "Tom"}', '{"name": Tom}', "{'name': 'Tom'}"],
        answer: 1,
        explain: 'JSON 的键必须用双引号，字符串值也用双引号；单引号和裸标识符都不合法。'
      },
      {
        q: 'Jackson 把 JSON 转成对象时，类通常需要？',
        options: ['必须是 record', '无参构造器和 getter/setter（或 record 组件）', '必须实现 Serializable', '必须继承 ObjectMapper'],
        answer: 1,
        explain: 'Jackson 通过无参构造器创建对象，再用 setter 或字段注入；record 用规范构造器也能工作。'
      }
    ]
  };

  var m3 = mod('m3');
  if (m3) m3.lessons.push(modern);
  var m4 = mod('m4');
  if (m4) m4.lessons.push(advancedCollections);
  var m7 = mod('m7');
  if (m7) m7.lessons.push(networkJson);
})();
