/* 精读补充 2：核心类库 + 集合框架（12 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['string'] = {
    why: 'String 是最常用的类，也是面试和实际开发里最容易出错的地方：为什么“修改”字符串后原变量没变？为什么两个内容相同的字符串 == 是 false？答案都在不可变和常量池。',
    walk: [
      ['String a = "Java";', '字面量先进字符串常量池，相同字面量复用同一个对象。'],
      ['String b = "Java";', 'b 复用池中的同一个对象，所以 a == b 为 true。'],
      ['new String("Java")', '强制在堆上新建对象，内容相同但地址不同，== 为 false。'],
      ['a.equals(c)', 'String 重写了 equals，逐字符比较内容，所以为 true。'],
      ['a + "!"', '拼接产生新的 String 对象，a 本身不变；循环里用 + 会创建大量临时对象。'],
      ['intern()', '把堆上的字符串加入常量池并返回池中引用，适合大量重复字符串的场景。']
    ],
    summary: [
      'String 不可变，任何修改都返回新对象。',
      '字面量在常量池，new 在堆上；== 比地址，equals 比内容。',
      '循环拼接用 StringBuilder，不要用 +。'
    ]
  };

  D['builder-boxing'] = {
    why: '循环里用 + 拼字符串会把内存和 CPU 拖垮；包装类则藏着缓存和拆箱两个坑。这两个知识点几乎每个项目都会遇到。',
    walk: [
      ['new StringBuilder()', '内部维护可扩容的字符数组，append 在原对象上修改，不创建新字符串。'],
      ['sb.append("a").append("b")', '链式调用返回 this，可以一直追加；最后 toString 才生成 String。'],
      ['Integer i = 100;', '自动装箱，等价于 Integer.valueOf(100)，不是 new Integer(100)。'],
      ['Integer.valueOf(127)', '命中缓存返回同一个对象；超出 -128~127 每次新建。'],
      ['Integer n = null; int x = n;', '自动拆箱调用 intValue()，n 为 null 时抛 NullPointerException。'],
      ['a == b（包装类）', '比较地址，缓存范围内可能碰巧为 true；比较数值一律用 equals。']
    ],
    summary: [
      '大量拼接用 StringBuilder，线程共享才用 StringBuffer。',
      '包装类比较用 equals，拆箱前先判空。',
      'Integer 只缓存 -128~127，别依赖 ==。'
    ]
  };

  D['datetime'] = {
    why: '老 Date/Calendar 可变、线程不安全、月份从 0 开始，坑非常多。java.time 用不可变对象重新设计，新项目没有理由再用老 API。',
    walk: [
      ['LocalDate.of(2024, 1, 31)', '创建不可变日期；月份从 1 开始，符合直觉。'],
      ['d.plusMonths(1)', '返回新对象，d 本身不变；1 月 31 日加一个月得到 2 月 29 日。'],
      ['d.format(fmt)', '用 DateTimeFormatter 格式化；formatter 线程安全，可定义为静态常量。'],
      ['LocalDate.parse("2024-01-31")', '按 ISO 格式解析；自定义格式要传 formatter。'],
      ['ChronoUnit.DAYS.between(a, b)', '计算两个日期相差的天数，比手动减毫秒可靠。'],
      ['ZonedDateTime', '需要跨时区时使用；LocalDateTime 不带时区，不能直接表示某个瞬间。']
    ],
    summary: [
      '日期用 LocalDate，日期时间用 LocalDateTime，时间戳用 Instant。',
      '所有修改操作都返回新对象，必须用变量接住。',
      '格式化和解析用 DateTimeFormatter，别用 SimpleDateFormat 共享。'
    ]
  };

  D['regex'] = {
    why: '校验手机号、提取订单号、批量替换文本，正则是最省事的工具。但 Java 里反斜杠要写两次，matches 和 find 语义不同，新手很容易写错。',
    walk: [
      ['\\\\d', '正则里的数字；在 Java 字符串中必须写成两个反斜杠加 d。'],
      ['\\\\d{4}', '恰好 4 位数字；{n,m} 表示次数范围，+ 表示一次或多次。'],
      ['text.matches(regex)', '要求整个字符串完全匹配，适合校验格式。'],
      ['Pattern.compile(regex)', '预编译正则，重复使用时性能更好，线程安全。'],
      ['matcher.find()', '在字符串中查找子串，找到一段就返回 true，适合提取。'],
      ['replaceAll / split', '按正则替换或切分；注意特殊字符要转义。']
    ],
    summary: [
      '校验整串用 matches，提取子串用 find。',
      'Java 字符串里的反斜杠要写两次。',
      '复杂正则应预编译 Pattern，并写单元测试覆盖边界。'
    ]
  };

  D['arrays-tools'] = {
    why: '数组打印乱码、排序要自己写、金额计算出现 0.30000000000000004——这些都是不会用工具类、选错类型导致的。',
    walk: [
      ['Arrays.toString(nums)', '把一维数组转成 [1, 2, 3] 形式；二维要用 deepToString。'],
      ['Arrays.sort(nums)', '原地升序排序；对象数组可传 Comparator。'],
      ['Arrays.copyOf(nums, 10)', '复制并扩容，多出的位置补默认值；原数组不变。'],
      ['Objects.equals(a, b)', '安全比较，任意一边为 null 都不会抛 NPE。'],
      ['new BigDecimal("0.1")', '用字符串构造才能精确表示十进制小数，double 构造会带误差。'],
      ['a.compareTo(b)', 'BigDecimal 比较数值用 compareTo，equals 会连精度一起比。']
    ],
    summary: [
      '数组操作先找 Arrays，对象判空用 Objects。',
      '金额用 BigDecimal，字符串构造 + setScale 舍入。',
      'binarySearch 前必须先排序。'
    ]
  };

  D['modern-java'] = {
    why: 'Java 8 之后语言一直在进化。var、文本块、switch 表达式、record、sealed、模式匹配，能让代码更短、更安全，也是新项目面试的常见考点。',
    walk: [
      ['var list = new ArrayList<String>()', '编译器推断类型，变量仍强类型；只能用于局部变量。'],
      ['""" ... """', '文本块保留多行和缩进，写 SQL/JSON 不用满屏 \\n。'],
      ['switch (x) { case 1 -> ... }', '箭头语法不穿透，可以直接作为表达式返回值。'],
      ['yield value', '在 switch 的代码块分支里返回值。'],
      ['record Point(int x, int y)', '自动生成构造器、访问器、equals/hashCode/toString。'],
      ['sealed interface Shape permits Circle, Rect', '限制实现者，配合模式匹配可穷尽检查。'],
      ['obj instanceof String s', '模式匹配直接绑定变量，不用先判断再强转。']
    ],
    summary: [
      'var 只是类型推断，不是动态类型。',
      'switch 表达式必须穷尽，箭头不会穿透。',
      'record 表达不可变数据，sealed 表达封闭类型层次。'
    ]
  };

  D['collections'] = {
    why: '数组长度固定，业务数据却经常增删。集合框架用 List/Set/Map 三大接口解决“存一批对象”的问题，是后面所有代码的基础设施。',
    walk: [
      ['List<String> list = new ArrayList<>()', '声明接口、创建实现；后面换实现只需改右边。'],
      ['list.add("Java")', '追加到尾部，size 自动加一。'],
      ['list.add(1, "Rust")', '插入到下标 1，后面的元素整体后移，O(n)。'],
      ['list.set(0, "Go")', '替换下标 0，size 不变。'],
      ['list.remove(1)', '删除下标 1；remove(Integer.valueOf(1)) 才是删除值 1。'],
      ['for (String s : list)', '增强 for 底层是迭代器；遍历中 remove 会抛 CME。']
    ],
    summary: [
      'Collection 存单元素，Map 存键值对；List 有序可重复。',
      '优先用接口声明，方便替换实现。',
      'remove 有下标和对象两个重载，注意自动装箱歧义。'
    ]
  };

  D['arraylist-linkedlist'] = {
    why: '同样是 List，底层一个数组一个链表，性能差异可能是几十倍。选错结构，代码在数据量上来后会突然变慢。',
    walk: [
      ['ArrayList 内部数组', '连续内存，按下标访问 O(1)，CPU 缓存友好。'],
      ['array.add(e)', '尾部追加均摊 O(1)；容量满了创建约 1.5 倍新数组并复制。'],
      ['array.add(0, e)', '头部插入要移动所有元素，O(n)。'],
      ['LinkedList 节点', '每个节点保存 prev/item/next，内存不连续。'],
      ['linked.get(500)', '从头或尾逐个走 500 步，O(n)；for + get 遍历会退化成 O(n²)。'],
      ['怎么选', '默认 ArrayList；队列/栈用 ArrayDeque；只有已知节点附近频繁增删才用 LinkedList。']
    ],
    summary: [
      '随机访问多用 ArrayList，头部增删多才考虑 LinkedList。',
      'LinkedList 按索引访问慢，别用 get 遍历。',
      'ArrayDeque 是队列和栈的首选。'
    ]
  };

  D['hashmap'] = {
    why: 'HashMap 是 Java 最常用的容器，也是面试必问：数组 + 链表 + 红黑树怎么组织？hash 和 equals 为什么要一起重写？扩容为什么是 2 倍？',
    walk: [
      ['map.put(key, value)', '先算 key 的 hash，再与 capacity-1 做与运算定位桶。'],
      ['hash 扰动', '让高位参与运算，减少低位相同导致的冲突。'],
      ['桶为空', '直接放入；桶非空则沿链表比较 hash 和 equals。'],
      ['链表长度 ≥ 8 且容量 ≥ 64', '链表转红黑树，查找从 O(n) 降到 O(log n)。'],
      ['负载因子 0.75', '元素数超过容量 × 0.75 就扩容为 2 倍，所有节点重新分配。'],
      ['重写 equals 必须重写 hashCode', '否则内容相同的 key 落到不同桶，get 找不到。']
    ],
    summary: [
      'hash 定位桶，equals 在桶里找 key，两者缺一不可。',
      '容量是 2 的幂，扩容翻倍，链表过长会树化。',
      '多线程用 ConcurrentHashMap，不要并发写 HashMap。'
    ]
  };

  D['set-comparator'] = {
    why: 'Set 去重看起来简单，但“什么算重复”取决于实现：HashSet 看 equals，TreeSet 看比较器。不会比较器，就无法按业务规则排序。',
    walk: [
      ['new HashSet<>()', '无序、去重靠 hashCode + equals，增删查平均 O(1)。'],
      ['new LinkedHashSet<>()', '额外维护插入顺序，遍历按放入顺序。'],
      ['new TreeSet<>()', '红黑树，按比较结果排序，增删查 O(log n)。'],
      ['implements Comparable', '类自己定义自然顺序 compareTo，只有一种。'],
      ['Comparator.comparing(...)', '外部比较器，可写多个，还可用 thenComparing 组合。'],
      ['TreeSet 去重', 'compare 返回 0 就视为重复；按长度比较时同长度字符串只留一个。']
    ],
    summary: [
      'HashSet 最快但无序，TreeSet 有序但要求可比较。',
      'Comparable 是自然顺序，Comparator 是外部规则。',
      '比较器返回 0 会被 TreeSet 当成重复。'
    ]
  };

  D['iterator-queue'] = {
    why: '用 for-each 删元素会抛 ConcurrentModificationException，这是新手最常见的运行时异常之一。队列和优先队列则是任务调度、消息处理的基础。',
    walk: [
      ['Iterator<Integer> it = list.iterator()', '拿到迭代器，内部记录集合的 modCount。'],
      ['it.hasNext() / it.next()', '先判断再取；next 会检查 modCount 是否被改过。'],
      ['it.remove()', '通过迭代器删除，同步更新期望值，不会触发 CME。'],
      ['list.remove(x)（for-each 内）', '直接改集合，modCount 变化，下一次 next 抛 CME。'],
      ['new ArrayDeque<>()', '队列/栈首选，offer/poll/peek 失败返回特殊值。'],
      ['new PriorityQueue<>()', '小顶堆，poll 每次取最小值，遍历顺序不保证有序。']
    ],
    summary: [
      '遍历中删除用 iterator.remove 或 removeIf。',
      'ArrayDeque 比 LinkedList 更适合队列和栈。',
      'PriorityQueue 只保证堆顶最小，不保证整体有序。'
    ]
  };

  D['collections-advanced'] = {
    why: '业务里不只有 ArrayList 和 HashMap：排行榜要排序、状态映射要用枚举、配置要读文件。这些场景都有更合适的专用容器。',
    walk: [
      ['new TreeMap<>()', '按 key 排序的红黑树，支持 firstKey/lastKey。'],
      ['map.subMap("A", "T")', '范围查询，左闭右开；做区间统计很方便。'],
      ['new EnumMap<>(Level.class)', '枚举做 key 时用数组索引，速度最快、遍历按声明顺序。'],
      ['new Properties()', '键值都是 String，load/store 读写 .properties 配置。'],
      ['List.of("a", "b")', '创建不可变集合，任何修改抛 UnsupportedOperationException。'],
      ['Collections.unmodifiableList(list)', '包装成只读视图，原列表变化仍会反映。']
    ],
    summary: [
      '需要排序/范围查询用 TreeMap，枚举 key 用 EnumMap。',
      '配置用 Properties，只读常量用 List.of/Map.of。',
      '不可变集合不能存 null，修改会直接抛异常。'
    ]
  };
})();
