/* 新手精讲 2：核心类库 + 集合 + 异常泛型（13 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['string'] = {
    goals: ['解释 String 为什么不可变', '区分常量池对象与 new 出来的对象', '正确使用 == 和 equals'],
    pitfalls: [
      '用 == 判断两个字符串内容，地址不同就误判为不相等。',
      '循环里 s += i 拼接上千次，性能急剧下降。',
      '调用 str.equals("x") 时 str 为 null，抛 NPE；应写 "x".equals(str)。'
    ],
    homework: '分别用字面量和 new 创建内容相同的字符串，打印 == 与 equals 的结果；再用循环把 1000 个数字拼成一个字符串，分别用 String 和 StringBuilder 计时。'
  };

  G['builder-boxing'] = {
    goals: ['用 StringBuilder 高效拼接字符串', '理解自动装箱与拆箱', '说清 Integer 缓存的坑'],
    pitfalls: [
      '用 == 比较两个 Integer 的数值。',
      'Integer 为 null 时直接参与算术运算，触发拆箱 NPE。',
      '在循环里用 StringBuffer 却要求线程安全，其实单线程场景 StringBuilder 更快。'
    ],
    homework: '用 StringBuilder 拼出 1~100 的逗号分隔字符串；再写两个 Integer 变量分别赋值 127 和 128，比较 == 与 equals 的结果并解释。'
  };

  G['datetime'] = {
    goals: ['选择合适的日期时间类型', '理解 java.time 的不可变性', '完成格式化、解析和日期间隔计算'],
    pitfalls: [
      '调用 plusDays 却不接收返回值，以为日期变了。',
      '用 yyyy 格式化跨年周的日期时混淆 YYYY（周历年份）。',
      '在 Java 8 之后继续用 SimpleDateFormat 做全局共享，线程不安全。'
    ],
    homework: '计算从今天到你生日还有多少天（用 ChronoUnit.DAYS）；再把一个 "2024-01-31" 字符串解析成 LocalDate，加一个月并格式化输出。'
  };

  G['regex'] = {
    goals: ['看懂常用正则元字符', '区分 matches 与 find', '在 Java 中正确转义反斜杠'],
    pitfalls: [
      '用 matches 判断“包含数字”，结果因为前后有字母而失败。',
      '忘了转义点号：a.b 会匹配 axb。',
      '贪婪匹配 .* 把整段吃光，需要 .*? 非贪婪。'
    ],
    homework: '写一个手机号校验（1 开头、11 位数字）；再从一段文本中提取所有日期（yyyy-MM-dd），用 Pattern + Matcher 循环打印。'
  };

  G['collections'] = {
    goals: ['分清 Collection 与 Map 两大体系', '熟练使用 List 的增删改查', '避开 remove 重载的坑'],
    pitfalls: [
      '把数组当集合用，忘了集合长度可变。',
      '在 for-each 里 list.remove，抛 ConcurrentModificationException。',
      '声明成具体实现 ArrayList 而不是接口 List，后期换实现要改很多地方。'
    ],
    homework: '用 List<String> 保存 5 个城市，完成：插入到第 2 位、替换第一个、删除指定城市、倒序打印；再用 List<Integer> 验证 remove(1) 的两种含义。'
  };

  G['arraylist-linkedlist'] = {
    goals: ['说清数组与链表的底层差异', '根据操作特点选择 List 实现', '避免 LinkedList 的遍历陷阱'],
    pitfalls: [
      '用 for + get(i) 遍历 LinkedList。',
      '以为 LinkedList 插入永远 O(1)：定位到插入点本身可能是 O(n)。',
      'ArrayList 一边遍历一边删，忘记用迭代器。'
    ],
    homework: '分别用 ArrayList 和 LinkedList 保存 10 万个整数，测试头部插入 1000 次和随机 get 1000 次的耗时，记录并解释差异。'
  };

  G['hashmap'] = {
    goals: ['说清数组 + 链表 + 红黑树的结构', '解释 hash 与 equals 的配合', '理解扩容与负载因子'],
    pitfalls: [
      '自定义 key 只重写 equals 不重写 hashCode，get 永远找不到。',
      '用可变对象当 key，放进去后修改字段，hash 变了就再也取不出来。',
      '多线程并发写 HashMap，可能丢数据甚至死循环（JDK 7），应使用 ConcurrentHashMap。'
    ],
    homework: '用页面上的 HashMap 组件依次放入 Aa、BB，观察冲突；再写一个自定义 Key 类，只重写 equals，验证 get 失败，然后补上 hashCode 再试。'
  };

  G['set-comparator'] = {
    goals: ['按场景选择 HashSet/LinkedHashSet/TreeSet', '用 Comparable 和 Comparator 排序', '解释 TreeSet 的去重规则'],
    pitfalls: [
      '往 TreeSet 放不可比较的对象，抛 ClassCastException。',
      'Comparator 减法写反，排序结果颠倒；用 Integer.compare 避免溢出。',
      'HashSet 存自定义对象却没重写 equals/hashCode，去重失效。'
    ],
    homework: '创建 5 个学生（姓名、分数），分别用“分数降序”“姓名升序”两个 Comparator 排序；再用 TreeSet 按分数去重，观察同分学生只保留一个。'
  };

  G['iterator-queue'] = {
    goals: ['用迭代器安全地遍历和删除', '解释 fail-fast 机制', '选择 Deque 与 PriorityQueue'],
    pitfalls: [
      '在增强 for 里删元素，抛 CME。',
      '把 PriorityQueue 当有序列表遍历，输出顺序不对。',
      'offer 失败返回 false，add 失败抛异常，混用后不检查返回值。'
    ],
    homework: '用 Iterator 删除 List 中所有偶数；再用 ArrayDeque 实现一个括号匹配检查器；最后用 PriorityQueue 取出 5 个数中的最小值。'
  };

  G['exceptions'] = {
    goals: ['分清 Error、受检异常、运行时异常', '正确使用 try-catch-finally', '避免吞异常和 finally 覆盖返回值'],
    pitfalls: [
      'catch (Exception e) {} 空捕获，问题被隐藏。',
      '先 catch 父类再 catch 子类，编译报错。',
      'finally 里 return，吞掉异常或覆盖结果。'
    ],
    homework: '写一个除法方法，捕获除零异常并返回友好提示；再用 try-with-resources 读取一个不存在的文件，打印异常类型和 message。'
  };

  G['custom-exception'] = {
    goals: ['定义带 message 和 cause 的业务异常', '判断用受检还是非受检', '保留异常链而不是吞掉'],
    pitfalls: [
      '用异常控制正常流程（用异常做循环退出）。',
      '捕获后只打印 e.getMessage()，丢掉堆栈。',
      '自定义异常没有序列化 ID，跨进程传输时可能警告。'
    ],
    homework: '定义 InsufficientBalanceException，在 withdraw 中抛出并携带“需要/当前”金额；在调用方捕获后打印 message，并用 e.getCause() 检查是否保留了底层异常。'
  };

  G['generics'] = {
    goals: ['定义泛型类和泛型方法', '用上界限制类型参数', '按 PECS 原则使用通配符'],
    pitfalls: [
      'new T()、new T[] 都不允许，运行时不知道具体类型。',
      '把 List<String> 赋给 List<Object>，泛型不支持协变。',
      '对泛型类型做 instanceof（List<String>）不合法。'
    ],
    homework: '写一个泛型方法 <T> T last(List<T> list) 返回最后一个元素；再写 <T extends Comparable<T>> T max(List<T>)，分别用整数和字符串测试。'
  };

  G['erasure'] = {
    goals: ['解释类型擦除发生在什么时候', '说明运行时为什么拿不到泛型参数', '理解擦除带来的限制'],
    pitfalls: [
      '以为运行时能通过 getClass() 区分 List<String> 和 List<Integer>。',
      '把泛型数组强转成 T[]，运行时可能 ClassCastException。',
      '在静态成员里使用类的类型参数，编译报错。'
    ],
    homework: '打印 new ArrayList<String>().getClass() 与 new ArrayList<Integer>().getClass() 是否相等；再尝试写 new T[10]，记录编译错误信息。'
  };
})();
