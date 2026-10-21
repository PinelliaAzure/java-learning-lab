/* 精读补充 2：核心类库 + 集合框架（12 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['string'] = {
    summary: [
      'String 不可变，任何修改都返回新对象。',
      '字面量在常量池，new 在堆上；== 比地址，equals 比内容。',
      '循环拼接用 StringBuilder，不要用 +。'
    ]
  };

  D['builder-boxing'] = {
    summary: [
      '大量拼接用 StringBuilder，线程共享才用 StringBuffer。',
      '包装类比较用 equals，拆箱前先判空。',
      'Integer 只缓存 -128~127，别依赖 ==。'
    ]
  };

  D['datetime'] = {
    summary: [
      '日期用 LocalDate，日期时间用 LocalDateTime，时间戳用 Instant。',
      '所有修改操作都返回新对象，必须用变量接住。',
      '格式化和解析用 DateTimeFormatter，别用 SimpleDateFormat 共享。'
    ]
  };

  D['regex'] = {
    summary: [
      '校验整串用 matches，提取子串用 find。',
      'Java 字符串里的反斜杠要写两次。',
      '复杂正则应预编译 Pattern，并写单元测试覆盖边界。'
    ]
  };

  D['arrays-tools'] = {
    summary: [
      '数组操作先找 Arrays，对象判空用 Objects。',
      '金额用 BigDecimal，字符串构造 + setScale 舍入。',
      'binarySearch 前必须先排序。'
    ]
  };

  D['modern-java'] = {
    summary: [
      'var 只是类型推断，不是动态类型。',
      'switch 表达式必须穷尽，箭头不会穿透。',
      'record 表达不可变数据，sealed 表达封闭类型层次。'
    ]
  };

  D['collections'] = {
    summary: [
      'Collection 存单元素，Map 存键值对；List 有序可重复。',
      '优先用接口声明，方便替换实现。',
      'remove 有下标和对象两个重载，注意自动装箱歧义。'
    ]
  };

  D['arraylist-linkedlist'] = {
    summary: [
      '随机访问多用 ArrayList，头部增删多才考虑 LinkedList。',
      'LinkedList 按索引访问慢，别用 get 遍历。',
      'ArrayDeque 是队列和栈的首选。'
    ]
  };

  D['hashmap'] = {
    summary: [
      'hash 定位桶，equals 在桶里找 key，两者缺一不可。',
      '容量是 2 的幂，扩容翻倍，链表过长会树化。',
      '多线程用 ConcurrentHashMap，不要并发写 HashMap。'
    ]
  };

  D['set-comparator'] = {
    summary: [
      'HashSet 最快但无序，TreeSet 有序但要求可比较。',
      'Comparable 是自然顺序，Comparator 是外部规则。',
      '比较器返回 0 会被 TreeSet 当成重复。'
    ]
  };

  D['iterator-queue'] = {
    summary: [
      '遍历中删除用 iterator.remove 或 removeIf。',
      'ArrayDeque 比 LinkedList 更适合队列和栈。',
      'PriorityQueue 只保证堆顶最小，不保证整体有序。'
    ]
  };

  D['collections-advanced'] = {
    summary: [
      '需要排序/范围查询用 TreeMap，枚举 key 用 EnumMap。',
      '配置用 Properties，只读常量用 List.of/Map.of。',
      '不可变集合不能存 null，修改会直接抛异常。'
    ]
  };
})();
