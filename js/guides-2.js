/* 新手精讲 2：核心类库 + 集合 + 异常泛型（13 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['string'] = {
    goals: ['解释 String 为什么不可变', '区分常量池对象与 new 出来的对象', '正确使用 == 和 equals'],
    flow: 'String 只有一条铁律：<b>内容比较用 equals，永远别用 ==</b>。再记住每次“修改”都会产生新对象。',
    sections: [
      { h: '不可变带来什么', p: '内部字符数组是 final 的，任何拼接、替换、截取都返回新 String。好处是线程安全、可安全共享、hashCode 可缓存；代价是循环里用 + 会创建大量临时对象。' },
      { h: '常量池与 new 的区别', p: '字面量 "Java" 会先进字符串常量池，相同字面量复用同一个对象；new String("Java") 一定在堆上新建对象，哪怕内容一样。' },
      { h: '什么时候用 intern', p: 'intern() 把堆上的字符串加入常量池并返回池中引用，适合大量重复字符串去重；但池有开销，不要见字符串就调用。' }
    ],
    pitfalls: [
      '用 == 判断两个字符串内容，地址不同就误判为不相等。',
      '循环里 s += i 拼接上千次，性能急剧下降。',
      '调用 str.equals("x") 时 str 为 null，抛 NPE；应写 "x".equals(str)。'
    ],
    homework: '分别用字面量和 new 创建内容相同的字符串，打印 == 与 equals 的结果；再用循环把 1000 个数字拼成一个字符串，分别用 String 和 StringBuilder 计时。'
  };

  G['builder-boxing'] = {
    goals: ['用 StringBuilder 高效拼接字符串', '理解自动装箱与拆箱', '说清 Integer 缓存的坑'],
    flow: '可变用 StringBuilder，对象用包装类；包装类比较用 equals，拆箱前先判空。',
    sections: [
      { h: 'StringBuilder 是可变缓冲区', p: 'append/insert/delete 都在同一个字符数组上操作，只在 toString 时生成最终 String。循环拼接、SQL 拼接、日志拼接都该用它。' },
      { h: '包装类让基本类型变成对象', p: '集合、泛型只能存对象，所以 int 要装箱成 Integer。JDK 5 起自动装箱，但 null 拆箱会抛 NullPointerException。' },
      { h: 'Integer 缓存 -128~127', p: '这个范围内的 Integer 指向缓存对象，== 可能为 true；超出范围每次都是新对象。所以包装类比较一律用 equals。' }
    ],
    pitfalls: [
      '用 == 比较两个 Integer 的数值。',
      'Integer 为 null 时直接参与算术运算，触发拆箱 NPE。',
      '在循环里用 StringBuffer 却要求线程安全，其实单线程场景 StringBuilder 更快。'
    ],
    homework: '用 StringBuilder 拼出 1~100 的逗号分隔字符串；再写两个 Integer 变量分别赋值 127 和 128，比较 == 与 equals 的结果并解释。'
  };

  G['datetime'] = {
    goals: ['选择合适的日期时间类型', '理解 java.time 的不可变性', '完成格式化、解析和日期间隔计算'],
    flow: '新项目统一用 <b>java.time</b>：LocalDate 管日期，LocalDateTime 管日期 + 时间，Instant 管时间戳，ZonedDateTime 管时区。',
    sections: [
      { h: '不可变意味着每次操作都返回新对象', p: 'd.plusDays(1) 不会修改 d，而是返回新对象。所以必须用变量接住返回值，否则“看起来没生效”。' },
      { h: '格式化和解析用同一个 Formatter', p: 'DateTimeFormatter.ofPattern("yyyy-MM-dd") 线程安全，可以定义成静态常量复用。解析失败会抛 DateTimeParseException。' },
      { h: '算间隔用 Duration / Period / ChronoUnit', p: 'Duration 算时分秒，Period 算年月日，ChronoUnit.DAYS.between(a,b) 直接得到天数。不要自己用毫秒相减处理时区。' }
    ],
    pitfalls: [
      '调用 plusDays 却不接收返回值，以为日期变了。',
      '用 yyyy 格式化跨年周的日期时混淆 YYYY（周历年份）。',
      '在 Java 8 之后继续用 SimpleDateFormat 做全局共享，线程不安全。'
    ],
    homework: '计算从今天到你生日还有多少天（用 ChronoUnit.DAYS）；再把一个 "2024-01-31" 字符串解析成 LocalDate，加一个月并格式化输出。'
  };

  G['regex'] = {
    goals: ['看懂常用正则元字符', '区分 matches 与 find', '在 Java 中正确转义反斜杠'],
    flow: '正则先想清楚“要匹配整段还是找子串”，再选 matches / find / replaceAll；Java 字符串里的反斜杠要写两次。',
    sections: [
      { h: '元字符是“规则字符”', p: '\\d 数字、\\w 字母数字下划线、\\s 空白、. 任意字符；+ 一次或多次、* 零次或多次、? 零或一次、{n,m} 次数范围。^ 和 $ 锚定整行。' },
      { h: 'matches 与 find 的区别', p: 'String.matches 要求整个字符串完全匹配；Matcher.find 只要找到一段子串就返回 true。校验手机号用 matches，提取订单号用 find。' },
      { h: '转义是最容易错的地方', p: '正则里的 \\d 在 Java 源码中要写成 "\\\\d"（两个反斜杠），因为 Java 字符串本身会先处理一次转义。' }
    ],
    pitfalls: [
      '用 matches 判断“包含数字”，结果因为前后有字母而失败。',
      '忘了转义点号：a.b 会匹配 axb。',
      '贪婪匹配 .* 把整段吃光，需要 .*? 非贪婪。'
    ],
    homework: '写一个手机号校验（1 开头、11 位数字）；再从一段文本中提取所有日期（yyyy-MM-dd），用 Pattern + Matcher 循环打印。'
  };

  G['collections'] = {
    goals: ['分清 Collection 与 Map 两大体系', '熟练使用 List 的增删改查', '避开 remove 重载的坑'],
    flow: '集合解决“长度可变 + 一堆对象”的问题。先选接口（List/Set/Map），再选实现（ArrayList/HashSet/HashMap）。',
    sections: [
      { h: '两大体系', p: 'Collection 存单个元素，下分 List（有序可重复）、Set（不可重复）、Queue（队列）；Map 存键值对，独立于 Collection。' },
      { h: 'List 的常用操作', p: 'add 追加、add(index,e) 插入、set 替换、get 读取、remove 删除、size 长度、contains 判断存在。插入/删除中间元素会移动后续元素。' },
      { h: 'remove(int) 与 remove(Object)', p: 'List<Integer> 里 remove(1) 删的是下标 1，remove(Integer.valueOf(1)) 删的是值 1。这是自动装箱带来的经典歧义。' }
    ],
    pitfalls: [
      '把数组当集合用，忘了集合长度可变。',
      '在 for-each 里 list.remove，抛 ConcurrentModificationException。',
      '声明成具体实现 ArrayList 而不是接口 List，后期换实现要改很多地方。'
    ],
    homework: '用 List<String> 保存 5 个城市，完成：插入到第 2 位、替换第一个、删除指定城市、倒序打印；再用 List<Integer> 验证 remove(1) 的两种含义。'
  };

  G['arraylist-linkedlist'] = {
    goals: ['说清数组与链表的底层差异', '根据操作特点选择 List 实现', '避免 LinkedList 的遍历陷阱'],
    flow: 'ArrayList = 连续数组，查得快；LinkedList = 双向链表，改指针快但定位慢。绝大多数业务选 ArrayList。',
    sections: [
      { h: 'ArrayList 的扩容', p: '内部数组满了会创建约 1.5 倍的新数组并复制，均摊到每次 add 仍是 O(1)；中间插入要搬移后面所有元素，O(n)。' },
      { h: 'LinkedList 的节点开销', p: '每个节点额外保存 prev/next 两个引用，内存更大；按下标 get(i) 要从头走 i 步，遍历时用 get 会退化成 O(n²)。' },
      { h: '选择建议', p: '默认 ArrayList；需要队列/栈用 ArrayDeque；只有频繁在已知节点附近插入删除时才考虑 LinkedList。' }
    ],
    pitfalls: [
      '用 for + get(i) 遍历 LinkedList。',
      '以为 LinkedList 插入永远 O(1)：定位到插入点本身可能是 O(n)。',
      'ArrayList 一边遍历一边删，忘记用迭代器。'
    ],
    homework: '分别用 ArrayList 和 LinkedList 保存 10 万个整数，测试头部插入 1000 次和随机 get 1000 次的耗时，记录并解释差异。'
  };

  G['hashmap'] = {
    goals: ['说清数组 + 链表 + 红黑树的结构', '解释 hash 与 equals 的配合', '理解扩容与负载因子'],
    flow: 'HashMap 用 <b>hash 找桶，用 equals 在桶里找 key</b>。两个方法必须一起重写，并保持一致。',
    sections: [
      { h: '定位一个 key 的全过程', p: '先算 key.hashCode()，经过扰动后与 capacity-1 做与运算得到桶下标；桶里为空就直接放，有冲突就沿链表找 equals 相等的节点。' },
      { h: '为什么容量是 2 的幂', p: 'capacity-1 的二进制低位全是 1，hash & (capacity-1) 等价于取模但更快。扩容时容量翻倍，节点要么留在原位置，要么移动一个旧容量。' },
      { h: '树化条件', p: '链表长度达到 8 且容量 ≥ 64 才转红黑树，查找从 O(n) 降到 O(log n)；容量不足时优先扩容，避免频繁树化。' }
    ],
    pitfalls: [
      '自定义 key 只重写 equals 不重写 hashCode，get 永远找不到。',
      '用可变对象当 key，放进去后修改字段，hash 变了就再也取不出来。',
      '多线程并发写 HashMap，可能丢数据甚至死循环（JDK 7），应使用 ConcurrentHashMap。'
    ],
    homework: '用页面上的 HashMap 组件依次放入 Aa、BB，观察冲突；再写一个自定义 Key 类，只重写 equals，验证 get 失败，然后补上 hashCode 再试。'
  };

  G['set-comparator'] = {
    goals: ['按场景选择 HashSet/LinkedHashSet/TreeSet', '用 Comparable 和 Comparator 排序', '解释 TreeSet 的去重规则'],
    flow: 'Set 去重靠“相等判断”：HashSet 看 hashCode+equals，TreeSet 看比较器是否返回 0。',
    sections: [
      { h: '三种 Set 的差别', p: 'HashSet 最快但无序；LinkedHashSet 保留插入顺序；TreeSet 按大小排序，增删查 O(log n)。' },
      { h: 'Comparable 与 Comparator', p: 'Comparable 是类自己实现 compareTo，只有一种自然顺序；Comparator 是外部比较器，可以写多个，还能用 thenComparing 组合。' },
      { h: 'TreeSet 的去重陷阱', p: '比较器返回 0 就视为重复。用“按长度比较”时，"aa" 和 "bb" 只能留一个，即使内容不同。' }
    ],
    pitfalls: [
      '往 TreeSet 放不可比较的对象，抛 ClassCastException。',
      'Comparator 减法写反，排序结果颠倒；用 Integer.compare 避免溢出。',
      'HashSet 存自定义对象却没重写 equals/hashCode，去重失效。'
    ],
    homework: '创建 5 个学生（姓名、分数），分别用“分数降序”“姓名升序”两个 Comparator 排序；再用 TreeSet 按分数去重，观察同分学生只保留一个。'
  };

  G['iterator-queue'] = {
    goals: ['用迭代器安全地遍历和删除', '解释 fail-fast 机制', '选择 Deque 与 PriorityQueue'],
    flow: '增强 for 是迭代器的语法糖；遍历中改结构会 fail-fast。队列用 offer/poll/peek，栈用 push/pop。',
    sections: [
      { h: 'modCount 是什么', p: '集合内部记录结构修改次数，迭代器创建时记下期望值；每次 next 都检查两者是否一致，不一致立即抛 ConcurrentModificationException。' },
      { h: '正确删除的两种写法', p: '用 Iterator.remove()，或 JDK 8+ 的 list.removeIf(条件)。不要在 for-each 里直接调用集合的 remove。' },
      { h: 'Queue 与 PriorityQueue', p: 'ArrayDeque 是队列/栈的首选；PriorityQueue 是小顶堆，poll 每次取最小值，但遍历顺序不保证有序。' }
    ],
    pitfalls: [
      '在增强 for 里删元素，抛 CME。',
      '把 PriorityQueue 当有序列表遍历，输出顺序不对。',
      'offer 失败返回 false，add 失败抛异常，混用后不检查返回值。'
    ],
    homework: '用 Iterator 删除 List 中所有偶数；再用 ArrayDeque 实现一个括号匹配检查器；最后用 PriorityQueue 取出 5 个数中的最小值。'
  };

  G['exceptions'] = {
    goals: ['分清 Error、受检异常、运行时异常', '正确使用 try-catch-finally', '避免吞异常和 finally 覆盖返回值'],
    flow: '异常是错误传递机制：<b>能处理的捕获，不能处理的往上抛，绝不静默吞掉</b>。',
    sections: [
      { h: '三类异常的处理策略', p: 'Error（OOM、栈溢出）通常无法恢复，不捕获；受检异常编译器强制处理，适合外部资源问题；RuntimeException 多是代码 bug，应修复而不是到处 catch。' },
      { h: 'finally 一定执行吗', p: '除非 JVM 退出（System.exit）或线程被杀，finally 都会执行。不要在 finally 里写 return，它会覆盖 try 里的返回值。' },
      { h: 'try-with-resources', p: '资源实现 AutoCloseable 就能放在 try 括号里，自动按相反顺序关闭，还能把关闭异常作为抑制异常保留。' }
    ],
    pitfalls: [
      'catch (Exception e) {} 空捕获，问题被隐藏。',
      '先 catch 父类再 catch 子类，编译报错。',
      'finally 里 return，吞掉异常或覆盖结果。'
    ],
    homework: '写一个除法方法，捕获除零异常并返回友好提示；再用 try-with-resources 读取一个不存在的文件，打印异常类型和 message。'
  };

  G['custom-exception'] = {
    goals: ['定义带 message 和 cause 的业务异常', '判断用受检还是非受检', '保留异常链而不是吞掉'],
    flow: '业务异常要能回答三个问题：<b>发生了什么、关键数据是什么、根因是什么</b>。',
    sections: [
      { h: '继承谁', p: '业务规则拒绝（余额不足、库存不够）用 RuntimeException，避免每层都写 throws；必须让调用方处理的外部问题（支付超时）用受检 Exception。' },
      { h: '保留 cause', p: '包装底层异常时传 cause：new OrderException("下单失败", e)。日志里才能看到完整堆栈链，否则根因丢失。' },
      { h: '异常信息怎么写', p: '写“操作 + 关键参数 + 期望”，例如“余额不足：需要 300，当前 100”。不要只写“失败”，也不要拼接密码等敏感信息。' }
    ],
    pitfalls: [
      '用异常控制正常流程（用异常做循环退出）。',
      '捕获后只打印 e.getMessage()，丢掉堆栈。',
      '自定义异常没有序列化 ID，跨进程传输时可能警告。'
    ],
    homework: '定义 InsufficientBalanceException，在 withdraw 中抛出并携带“需要/当前”金额；在调用方捕获后打印 message，并用 e.getCause() 检查是否保留了底层异常。'
  };

  G['generics'] = {
    goals: ['定义泛型类和泛型方法', '用上界限制类型参数', '按 PECS 原则使用通配符'],
    flow: '泛型把类型变成参数，让错误在<b>编译期</b>暴露。T 是占位符，运行时会被擦除。',
    sections: [
      { h: '泛型类与泛型方法', p: 'class Box<T> 里的 T 可以用于字段、参数、返回值；泛型方法在返回类型前声明 <T>。调用时编译器自动推断，也可显式指定。' },
      { h: '上界让方法能调用更多 API', p: '<T extends Comparable<T>> 表示 T 必须可比较，因此方法里能调用 compareTo；不加限制只能当 Object 用。' },
      { h: 'PECS 通配符', p: 'Producer Extends：只读的集合用 ? extends T；Consumer Super：只写的集合用 ? super T。这样既能接收子类型，又能安全写入。' }
    ],
    pitfalls: [
      'new T()、new T[] 都不允许，运行时不知道具体类型。',
      '把 List<String> 赋给 List<Object>，泛型不支持协变。',
      '对泛型类型做 instanceof（List<String>）不合法。'
    ],
    homework: '写一个泛型方法 <T> T last(List<T> list) 返回最后一个元素；再写 <T extends Comparable<T>> T max(List<T>)，分别用整数和字符串测试。'
  };

  G['erasure'] = {
    goals: ['解释类型擦除发生在什么时候', '说明运行时为什么拿不到泛型参数', '理解擦除带来的限制'],
    flow: '泛型只活在编译期：编译后 T 被替换成上界（通常是 Object），并在读取处插入强制转换。',
    sections: [
      { h: '擦除后剩下什么', p: 'List<String> 和 List<Integer> 的字节码都是 List；方法签名里的泛型信息保留在 Signature 属性中，反射可以读到，但对象本身不知道元素类型。' },
      { h: '桥方法', p: '子类重写泛型方法时，编译器生成一个 synthetic 桥方法，保证通过父类引用调用时能转到子类实现。反射里看到多出来的方法不必惊讶。' },
      { h: '由此产生的限制', p: '不能 new T[]、不能对泛型类型 instanceof、不能重载仅泛型参数不同的方法。需要数组时用 List<T> 或反射数组。' }
    ],
    pitfalls: [
      '以为运行时能通过 getClass() 区分 List<String> 和 List<Integer>。',
      '把泛型数组强转成 T[]，运行时可能 ClassCastException。',
      '在静态成员里使用类的类型参数，编译报错。'
    ],
    homework: '打印 new ArrayList<String>().getClass() 与 new ArrayList<Integer>().getClass() 是否相等；再尝试写 new T[10]，记录编译错误信息。'
  };
})();
