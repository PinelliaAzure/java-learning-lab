/* =====================================================================
   课程数据：集合框架 / 异常与泛型 / 函数式编程
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
     模块 4 · 集合框架
     ================================================================ */
  C.push({
    id: 'm4',
    no: '04',
    title: '集合框架',
    desc: 'List / Map / Set 的选型与底层',
    lessons: [

      {
        id: 'collections',
        title: '集合体系与 List',
        minutes: 7,
        level: '入门',
        intro: '数组长度固定，集合长度可变。Java 集合框架用一组接口把“存一批对象”这件事抽象出来，List 是最常用的那个。',
        points: [
          { t: '两大接口', d: '<code>Collection</code> 存单个元素的序列（List / Set / Queue）；<code>Map</code> 存键值对，不属于 Collection。' },
          { t: 'List 的特点', d: '有序、可重复、支持下标访问。常用实现：<code>ArrayList</code>（数组）、<code>LinkedList</code>（双向链表）。' },
          { t: '泛型约束', d: '<code>List&lt;String&gt;</code> 只能放 String，取出时不用强转。集合不能存基本类型，<code>List&lt;Integer&gt;</code> 会自动装箱。' },
          { t: '常用操作', d: '<code>add / get / set / remove / size / contains / indexOf</code>。删除元素时注意 <code>remove(int)</code> 与 <code>remove(Object)</code> 的重载区别。' }
        ],
        code: `List<String> list = new ArrayList<>();
list.add("Java");
list.add("Go");
list.add(1, "Rust");       // 插到下标 1，后面的元素后移
list.set(0, "Kotlin");     // 替换
list.remove("Go");         // 按内容删除

System.out.println(list);        // [Kotlin, Rust]
System.out.println(list.get(1)); // Rust`,
        tip: '写代码时优先声明接口类型：<code>List&lt;String&gt; list = new ArrayList&lt;&gt;();</code>，方便以后换实现。',
        demo: S(`List<String> list = new ArrayList<>();
list.add("Java");
list.add("Go");
list.add(1, "Rust");
list.set(0, "Kotlin");
System.out.println(list);`, [
          [0, { list: '[]' }, '创建 ArrayList，此时底层数组还没分配（首次 add 才分配）。'],
          [1, { list: '[Java]' }, 'add 追加到尾部，size 变成 1。'],
          [2, { list: '[Java, Go]' }, '再追加一个，size = 2。'],
          [3, { list: '[Java, Rust, Go]' }, 'add(1, "Rust")：下标 1 及之后的元素整体后移，再放入 Rust。'],
          [4, { list: '[Kotlin, Rust, Go]' }, 'set(0, "Kotlin") 替换下标 0，size 不变。'],
          [5, { list: '[Kotlin, Rust, Go]' }, '打印列表。', '[Kotlin, Rust, Go]']
        ], 'List 的增删改', '注意 add(index, e) 会引起元素移动，这也是 ArrayList 插入慢的原因。'),
        quiz: [
          {
            q: '下面哪组接口 / 类的关系是正确的？',
            options: ['Map 继承 Collection', 'List 继承 Map', 'ArrayList 实现 List', 'Set 允许重复元素'],
            answer: 2,
            explain: 'Map 不属于 Collection；List 和 Set 都继承 Collection；ArrayList 是 List 的数组实现；Set 不允许重复。'
          },
          {
            q: '<code>List&lt;Integer&gt; list = new ArrayList&lt;&gt;(); list.add(1);</code> 中 1 发生了什么？',
            options: ['直接存 int', '自动装箱成 Integer', '编译错误', '被转成 String'],
            answer: 1,
            explain: '集合只能存对象，int 会自动装箱为 Integer；取出时再自动拆箱。'
          }
        ]
      },

      {
        id: 'arraylist-linkedlist',
        title: 'ArrayList 与 LinkedList',
        minutes: 7,
        level: '进阶',
        intro: '同样是 List，底层一个用数组、一个用链表，性能差异天差地别。选错结构，代码可能慢几十倍。',
        points: [
          { t: 'ArrayList = 动态数组', d: '随机访问 O(1)，尾部追加均摊 O(1)，中间插入/删除 O(n)（要搬移元素）。扩容时按约 1.5 倍复制到新数组。' },
          { t: 'LinkedList = 双向链表', d: '头尾插入删除 O(1)，按索引访问 O(n)（要逐节点走）。每个节点额外存 prev/next 两个引用，内存开销更大。' },
          { t: '实际选型', d: '绝大多数场景用 ArrayList：缓存友好、常数小。只有频繁在头部插入/删除、或当队列用时才考虑 LinkedList / ArrayDeque。' },
          { t: '遍历方式', d: 'ArrayList 用普通 for 或增强 for 都很快；LinkedList 不要用 <code>get(i)</code> 遍历，会退化成 O(n²)。' }
        ],
        code: `List<Integer> array = new ArrayList<>();
array.add(10);
array.get(0);              // O(1)

List<Integer> linked = new LinkedList<>();
linked.addFirst(1);        // O(1)
linked.get(500);           // O(n)，要一步步走

// LinkedList 当队列用（更推荐 ArrayDeque）
Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1);
queue.poll();`,
        tip: '默认用 ArrayList；需要队列用 ArrayDeque；LinkedList 更多是教学和面试里的对比对象。',
        demo: D([
          { id: 'a0', label: '10', sub: '下标 0', x: 6, y: 8, w: 10, h: 10, tone: 'teal', info: 'ArrayList 底层是连续数组，内存地址连续，CPU 缓存命中率高。' },
          { id: 'a1', label: '20', sub: '下标 1', x: 18, y: 8, w: 10, h: 10, tone: 'teal', info: '通过 起始地址 + 下标 × 元素大小 直接算出位置，所以随机访问是 O(1)。' },
          { id: 'a2', label: '30', sub: '下标 2', x: 30, y: 8, w: 10, h: 10, tone: 'teal', info: '中间插入要先把后面的元素整体后移，O(n)。' },
          { id: 'a3', label: '40', sub: '下标 3', x: 42, y: 8, w: 10, h: 10, tone: 'teal', info: '容量不够时创建更大的数组并复制，均摊到每次 add 仍是 O(1)。' },
          { id: 'n1', label: 'Node A', sub: 'prev | item | next', x: 12, y: 52, w: 18, h: 12, tone: 'violet', info: 'LinkedList 的每个节点保存前驱和后继引用，内存不连续。' },
          { id: 'n2', label: 'Node B', sub: 'prev | item | next', x: 40, y: 52, w: 18, h: 12, tone: 'violet', info: '访问下标 1 要从头节点走一步；访问下标 500 就要走 500 步。' },
          { id: 'n3', label: 'Node C', sub: 'prev | item | next', x: 68, y: 52, w: 18, h: 12, tone: 'violet', info: '在已知节点旁插入/删除只需要改几个引用，O(1)。' }
        ], [
          { from: 'a0', to: 'a1' },
          { from: 'a1', to: 'a2' },
          { from: 'a2', to: 'a3' },
          { from: 'n1', to: 'n2', label: 'next' },
          { from: 'n2', to: 'n3', label: 'next' },
          { from: 'n2', to: 'n1', label: 'prev', dashed: true },
          { from: 'n3', to: 'n2', label: 'prev', dashed: true }
        ], '上排是连续数组，下排是双向链表。点击节点看性能差异。', '数组 vs 链表'),
        quiz: [
          {
            q: '在列表中间频繁插入、删除，同时很少按索引访问，理论上更适合？',
            options: ['ArrayList', 'LinkedList', 'HashSet', '数组'],
            answer: 1,
            explain: 'LinkedList 在已知位置插入/删除只需改指针 O(1)；ArrayList 需要搬移后续元素 O(n)。但注意 LinkedList 按索引定位本身是 O(n)。'
          },
          {
            q: '用 <code>for (int i = 0; i &lt; list.size(); i++) list.get(i)</code> 遍历 LinkedList，复杂度是？',
            options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'],
            answer: 2,
            explain: '每次 get(i) 都要从头走 i 步，累加起来是 O(n²)。应改用增强 for 或迭代器。'
          }
        ]
      },

      {
        id: 'hashmap',
        title: 'HashMap 的底层原理',
        minutes: 9,
        level: '进阶',
        intro: 'HashMap 是 Java 里最常用的容器之一。它为什么能做到接近 O(1) 的查找？哈希冲突怎么处理？为什么重写 equals 必须重写 hashCode？',
        points: [
          { t: '数组 + 链表 + 红黑树', d: '用 key 的 hash 定位数组下标；冲突时挂到链表；JDK 8 起链表长度 ≥ 8 且容量 ≥ 64 时转红黑树，查找从 O(n) 降到 O(log n)。' },
          { t: '下标计算', d: '<code>index = hash &amp; (capacity - 1)</code>，容量必须是 2 的幂，等价于对容量取模但更快。' },
          { t: '扩容', d: '默认容量 16、负载因子 0.75。元素数超过阈值就扩容为 2 倍，所有节点重新分配（rehash）。' },
          { t: 'key 的约定', d: '作为 key 的对象必须正确重写 <code>equals</code> 和 <code>hashCode</code>，否则内容相同的两个对象会被当成两个 key。' },
          { t: '线程安全', d: 'HashMap 非线程安全；多线程读多写少用 <code>ConcurrentHashMap</code>，不要用 Hashtable。' }
        ],
        code: `Map<String, Integer> map = new HashMap<>();
map.put("Java", 1995);
map.put("Go", 2009);

Integer year = map.get("Java");     // 1995
map.getOrDefault("Rust", 0);        // 0

for (Map.Entry<String, Integer> e : map.entrySet()) {
    System.out.println(e.getKey() + " -> " + e.getValue());
}`,
        tip: '一句话：HashMap 用 hash 找桶，用 equals 在桶里找那个 key。两者缺一不可。',
        demo: { type: 'widget', widget: 'hashmap', title: '亲手往 HashMap 里放几个 key', hint: '试试依次放入 "Aa" 和 "BB"，它们的 hashCode 相同，会落进同一个桶。' },
        quiz: [
          {
            q: 'HashMap 的数组容量为什么通常要求是 2 的幂？',
            options: ['为了节省内存', '为了让 hash & (capacity-1) 等价于取模且更快', '为了支持红黑树', '为了线程安全'],
            answer: 1,
            explain: '容量为 2 的幂时，capacity-1 的低位全是 1，hash & (capacity-1) 正好等价于 hash % capacity，而且位运算更快。'
          },
          {
            q: '自定义对象作为 HashMap 的 key，只重写了 equals 没重写 hashCode，可能出现什么？',
            options: ['编译错误', '内容相同的对象被当成不同 key，get 不到', 'HashMap 自动修复', '一定抛异常'],
            answer: 1,
            explain: 'hashCode 不同会落到不同的桶，即使 equals 相等也找不到。两个方法必须一起重写，并保持一致。'
          },
          {
            q: 'JDK 8 中，链表在什么条件下会转成红黑树？',
            options: ['链表长度 ≥ 8 且容量 ≥ 64', '只要长度 ≥ 8', '容量 ≥ 16', '永远不转'],
            answer: 0,
            explain: '链表长度达到 8 时先尝试扩容；如果容量已经 ≥ 64，才把链表转成红黑树，避免树化后又频繁扩容。'
          }
        ]
      },

      {
        id: 'set-comparator',
        title: 'Set、TreeSet 与比较器',
        minutes: 7,
        level: '进阶',
        intro: 'Set 保证元素不重复，但“重复”的判定标准不一样：HashSet 看 hashCode+equals，TreeSet 看比较器返回是不是 0。',
        points: [
          { t: '三种 Set', d: '<code>HashSet</code> 无序、最快；<code>LinkedHashSet</code> 保留插入顺序；<code>TreeSet</code> 按大小排序，增删查 O(log n)。' },
          { t: 'Comparable vs Comparator', d: 'Comparable 是类自己实现 <code>compareTo</code>（自然顺序）；Comparator 是外部比较器，可写多个、可用 lambda。' },
          { t: 'TreeSet 去重规则', d: '比较结果为 0 就视为重复。用“按长度比较”的比较器时，长度相同的不同字符串只能留下一个。' },
          { t: '排序稳定性', d: '<code>Collections.sort</code> / <code>List.sort</code> 是稳定排序；TreeSet 本身只保证有序，不保证相同比较值元素的顺序。' }
        ],
        code: `List<String> names = new ArrayList<>(List.of("Tom", "Anna", "Bob"));
names.sort(Comparator.comparing(String::length));
// [Tom, Bob, Anna]  长度相同保持原顺序（稳定）

Set<String> byLength = new TreeSet<>(Comparator.comparing(String::length));
byLength.add("bbb");
byLength.add("a");
byLength.add("cc");
// [a, cc, bbb]`,
        tip: 'Comparator.comparing(...).thenComparing(...) 可以串出多级排序，比手写 compareTo 清晰得多。',
        demo: S(`Set<String> set = new TreeSet<>();
set.add("Java");
set.add("Go");
set.add("Rust");
System.out.println(set);`, [
          [0, { set: '[]' }, 'TreeSet 底层是红黑树，插入时就按自然顺序维护。'],
          [1, { set: '[Java]' }, '第一个元素成为根节点。'],
          [2, { set: '[Go, Java]' }, 'Go < Java，插入到左子树。'],
          [3, { set: '[Go, Java, Rust]' }, 'Rust 比 Java 大，插入到右子树；树保持有序。'],
          [4, { set: '[Go, Java, Rust]' }, '按中序遍历输出，天然有序。', '[Go, Java, Rust]']
        ], 'TreeSet 自动排序', '每次插入都会比较，所以 TreeSet 的 add 是 O(log n)。'),
        quiz: [
          {
            q: '<code>new TreeSet&lt;&gt;(Comparator.comparing(String::length))</code> 依次加入 "aa"、"bb"，结果会怎样？',
            options: ['两个都保留', '只保留 "aa"（比较结果为 0 视为重复）', '抛异常', '按字母序排好'],
            answer: 1,
            explain: 'TreeSet 用比较器判断重复，两个字符串长度相同 → compare 返回 0 → 视为重复，第二个加不进去。'
          },
          {
            q: '需要“按分数降序、分数相同按姓名升序”排序，最合适的写法是？',
            options: ['实现多个 Comparable', 'Comparator.comparingInt(...).reversed().thenComparing(...)', '用 TreeSet 自动排序', '手写冒泡排序'],
            answer: 1,
            explain: 'Comparator 支持链式组合：先按分数降序，再 thenComparing 按姓名升序，清晰且可复用。'
          }
        ]
      },

      {
        id: 'iterator-queue',
        title: '迭代器、Queue 与 PriorityQueue',
        minutes: 7,
        level: '进阶',
        intro: '用 for-each 遍历集合时删元素，为什么会抛 ConcurrentModificationException？队列和优先队列又该怎么选？',
        points: [
          { t: '迭代器', d: 'for-each 本质是 Iterator。集合维护 <code>modCount</code>，迭代过程中结构被修改就会 fail-fast 抛 CME。' },
          { t: '正确删除', d: '用 <code>iterator.remove()</code>，或 JDK 8+ 的 <code>list.removeIf(...)</code>；不要用 for-each 里的 list.remove。' },
          { t: 'Queue / Deque', d: '<code>ArrayDeque</code> 是栈和队列的首选；<code>offer/poll/peek</code> 失败返回特殊值，<code>add/remove/element</code> 失败抛异常。' },
          { t: 'PriorityQueue', d: '小顶堆，poll 每次取最小值，增删 O(log n)。它不是有序列表，遍历顺序不保证有序。' }
        ],
        code: `List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
Iterator<Integer> it = list.iterator();
while (it.hasNext()) {
    if (it.next() == 2) it.remove();   // 正确
}

Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.pop();                           // 2

Queue<Integer> pq = new PriorityQueue<>();
pq.offer(5); pq.offer(1);
pq.poll();                             // 1`,
        tip: '增强 for 里删元素 = 埋雷；用 <code>removeIf</code> 或迭代器，一行解决。',
        demo: S(`List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
for (Integer n : list) {
    if (n == 2) list.remove(n);
}`, [
          [0, { list: '[1, 2, 3]', modCount: '3' }, '创建列表，modCount 记录结构修改次数。'],
          [1, { list: '[1, 2, 3]', n: '1', modCount: '3' }, '第一次迭代取到 1，不满足条件。'],
          [2, { list: '[1, 2, 3]', n: '2', modCount: '3' }, '取到 2，准备删除。'],
          [3, { list: '[1, 3]', modCount: '4' }, 'list.remove 修改了结构，modCount 变成 4。'],
          [2, { list: '[1, 3]', modCount: '4' }, '下一次 it.next() 检查到 modCount 变了，抛 ConcurrentModificationException。', 'ConcurrentModificationException']
        ], 'for-each 删除元素的陷阱', '集合的 modCount 和迭代器期望值不一致时就会 fail-fast。'),
        quiz: [
          {
            q: '在增强 for 循环中直接调用 <code>list.remove(x)</code> 通常会？',
            options: ['正常删除', '抛 ConcurrentModificationException', '编译错误', '删除最后一个元素'],
            answer: 1,
            explain: 'for-each 底层是迭代器，直接修改集合会改变 modCount，下一次迭代检查时抛 CME。'
          },
          {
            q: '下面哪个最适合作为栈使用？',
            options: ['ArrayList', 'LinkedList', 'ArrayDeque', 'HashMap'],
            answer: 2,
            explain: 'ArrayDeque 是 Deque 的高效实现，push/pop 都是 O(1)，比 Stack 类更推荐。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 5 · 异常与泛型
     ================================================================ */
  C.push({
    id: 'm5',
    no: '05',
    title: '异常与泛型',
    desc: '错误处理与类型安全',
    lessons: [

      {
        id: 'exceptions',
        title: '异常体系与 try-catch-finally',
        minutes: 8,
        level: '入门',
        intro: '异常不是“出错就完蛋”，而是 Java 提供的一套错误传递机制。分清 checked / unchecked，才能写出既健壮又不啰嗦的代码。',
        points: [
          { t: '体系', d: '<code>Throwable</code> 分两支：<code>Error</code>（OOM、StackOverflow，通常不处理）和 <code>Exception</code>。' },
          { t: '受检 vs 非受检', d: 'Exception 下除 RuntimeException 外都是受检异常，编译器强制 try 或 throws；RuntimeException 不强制。' },
          { t: 'finally', d: '无论是否异常、是否 return，finally 都会执行（除非 JVM 退出）。常用于释放资源，但更推荐 try-with-resources。' },
          { t: '捕获顺序', d: '子类异常要写在父类前面；多 catch 从具体到宽泛，否则编译报错。' }
        ],
        code: `try {
    int x = 10 / 0;
} catch (ArithmeticException e) {
    System.out.println("除零：" + e.getMessage());
} finally {
    System.out.println("finally 一定执行");
}

// 多资源自动关闭
try (BufferedReader br = Files.newBufferedReader(path)) {
    return br.readLine();
} catch (IOException e) {
    throw new UncheckedIOException(e);
}`,
        tip: '不要用 <code>catch (Exception e) {}</code> 吞掉异常；至少记录日志，或包装成业务异常继续抛。',
        demo: D([
          { id: 'th', label: 'Throwable', sub: '所有可抛出对象', x: 36, y: 6, w: 28, h: 12, tone: 'amber', info: 'Throwable 是异常体系的根，只有它的子类才能被 throw / catch。' },
          { id: 'err', label: 'Error', sub: 'OOM / StackOverflow', x: 8, y: 32, w: 24, h: 12, tone: 'rose', info: '严重问题，程序通常无法恢复。不要捕获 Error，应该排查根因（内存、递归深度）。' },
          { id: 'exc', label: 'Exception', sub: '程序可处理的异常', x: 56, y: 32, w: 30, h: 12, tone: 'teal', info: 'Exception 及其子类是可处理的异常，分为受检和非受检两类。' },
          { id: 'rt', label: 'RuntimeException', sub: '非受检', x: 38, y: 60, w: 24, h: 12, tone: 'violet', info: 'NPE、越界、类型转换、算术异常等。编译器不强制捕获，通常是代码 bug。' },
          { id: 'io', label: 'IOException', sub: '受检', x: 74, y: 60, w: 20, h: 12, tone: 'blue', info: '文件、网络等外部资源问题。编译器强制处理：try-catch 或 throws。' }
        ], [
          { from: 'th', to: 'err', label: '继承' },
          { from: 'th', to: 'exc', label: '继承' },
          { from: 'exc', to: 'rt', label: '继承' },
          { from: 'exc', to: 'io', label: '继承' }
        ], '点击节点看每一类的典型场景。记住：Error 不处理，RuntimeException 多半是 bug。', '异常家族'),
        quiz: [
          {
            q: '下面哪个是受检异常（checked exception）？',
            options: ['NullPointerException', 'ArithmeticException', 'IOException', 'ClassCastException'],
            answer: 2,
            explain: 'IOException 直接继承 Exception，属于受检异常，编译器强制 try-catch 或 throws。其余三个都是 RuntimeException。'
          },
          {
            q: 'try 块中执行了 return，finally 还会执行吗？',
            options: ['不会', '会，除非 JVM 退出', '只有抛异常时才执行', '取决于返回值类型'],
            answer: 1,
            explain: 'finally 在 return 之前执行（除非 System.exit 等终止 JVM）。不要在 finally 里写 return，会覆盖 try 的返回值。'
          },
          {
            q: '下面哪种 catch 写法最糟糕？',
            options: ['catch (IOException e) { log.error(...); throw e; }', 'catch (Exception e) {}', 'catch (NumberFormatException e) { ... }', 'multi-catch (IOException | SQLException e)'],
            answer: 1,
            explain: '空 catch 会静默吞掉异常，问题被隐藏，排查时毫无线索。至少记录日志并决定是否继续抛。'
          }
        ]
      },

      {
        id: 'custom-exception',
        title: '自定义异常与最佳实践',
        minutes: 6,
        level: '进阶',
        intro: '业务代码需要表达“余额不足”“订单已取消”这类语义，而不是抛一个笼统的 RuntimeException。自定义异常让错误可读、可分类、可处理。',
        points: [
          { t: '怎么定义', d: '继承 <code>RuntimeException</code>（非受检，业务异常常用）或 <code>Exception</code>（受检）。提供带 message 和 cause 的构造器。' },
          { t: '何时用受检', d: '调用方必须处理的、可恢复的外部问题用受检（如支付超时）；编程错误或业务规则拒绝用非受检。' },
          { t: '包装而非吞掉', d: '底层异常应保留 cause：<code>throw new OrderException("下单失败", e);</code>，这样堆栈链完整。' },
          { t: '不要用异常做流程', d: '异常开销大、语义重；能用返回值表达的正常分支不要用 throw。' }
        ],
        code: `public class BalanceException extends RuntimeException {
    public BalanceException(String message) {
        super(message);
    }
}

public void withdraw(int amount) {
    if (amount > balance) {
        throw new BalanceException("余额不足：需要 " + amount + "，当前 " + balance);
    }
    balance -= amount;
}

// 调用方
try {
    account.withdraw(1000);
} catch (BalanceException e) {
    System.out.println(e.getMessage());
}`,
        tip: '异常信息要写“发生了什么 + 关键数据”，不要只写“失败”。',
        demo: S(`Account acc = new Account(100);
try {
    acc.withdraw(300);
} catch (BalanceException e) {
    System.out.println(e.getMessage());
}`, [
          [0, { balance: '100' }, '账户余额 100。'],
          [1, { balance: '100', amount: '300' }, '进入 try，准备取 300。'],
          [2, { balance: '100', amount: '300' }, 'withdraw 检测到 300 > 100，new BalanceException 并 throw。', '', [
            { title: 'BalanceException', rows: [['message', '"余额不足：需要 300，当前 100"']] }
          ]],
          [3, { balance: '100', e: 'BalanceException' }, 'throw 之后的代码不会执行，直接跳到匹配的 catch。'],
          [4, { balance: '100', e: 'BalanceException' }, '把异常信息打印给用户/日志。', '余额不足：需要 300，当前 100']
        ], '异常如何中断正常流程', '注意 withdraw 的扣款语句没有执行，余额仍是 100。'),
        quiz: [
          {
            q: '业务规则“余额不足”通常更适合定义为？',
            options: ['继承 Exception 的受检异常', '继承 RuntimeException 的非受检异常', '继承 Error', '返回 null'],
            answer: 1,
            explain: '业务规则拒绝属于调用方难以提前预知的情况，通常用非受检异常，避免每层方法都声明 throws；同时保留清晰 message。'
          },
          {
            q: '包装底层异常时，正确的做法是？',
            options: ['只保留 message，丢弃 cause', '把原异常作为 cause 传入新异常', '打印后返回 null', '把原异常改成 Error'],
            answer: 1,
            explain: 'new XxxException("...", e) 保留异常链，日志里能看到根因堆栈，排查问题离不开它。'
          }
        ]
      },

      {
        id: 'generics',
        title: '泛型类、方法与通配符',
        minutes: 8,
        level: '进阶',
        intro: '泛型让“类型”变成参数：一个 Box 类可以装 String、Integer 或任意类型，而且编译期就能发现类型错误，不用到处强转。',
        points: [
          { t: '泛型类/方法', d: '<code>class Box&lt;T&gt;</code>、<code>&lt;T&gt; T[] toArray(...)</code>。T 只是编译期占位符，运行时会被擦除。' },
          { t: '上界', d: '<code>&lt;T extends Number&gt;</code> 限定 T 必须是 Number 或其子类，方法里就能调用 Number 的 API。' },
          { t: '通配符', d: '<code>? extends T</code> 适合“只读”（生产者），<code>? super T</code> 适合“只写”（消费者）——PECS 原则。' },
          { t: '不能做什么', d: '不能 <code>new T()</code>、<code>new T[]</code>，不能对泛型类型做 <code>instanceof</code>，static 成员不能用类的类型参数。' }
        ],
        code: `class Box<T> {
    private T value;
    void set(T value) { this.value = value; }
    T get() { return value; }
}

Box<String> box = new Box<>();
box.set("Java");
String s = box.get();      // 不需要强转
// box.set(123);           // 编译错误，类型安全

static <T extends Comparable<T>> T max(List<T> list) {
    T best = list.get(0);
    for (T t : list) if (t.compareTo(best) > 0) best = t;
    return best;
}`,
        tip: 'PECS：Producer Extends, Consumer Super。只从集合里读用 extends，只往里写用 super。',
        demo: S(`Box<String> box = new Box<>();
box.set("Java");
String s = box.get();
System.out.println(s);`, [
          [0, { box: 'Box<String>{}' }, '声明 Box<String>，编译器记住 T = String。'],
          [1, { box: 'Box<String>{value=null}' }, '创建对象，value 默认为 null。'],
          [2, { box: 'Box<String>{value="Java"}' }, 'set 的参数类型被检查为 String，传入 "Java"。'],
          [3, { box: 'Box<String>{value="Java"}', s: '"Java"' }, 'get 返回 String，编译期就知道类型，无需强转。'],
          [3, { box: 'Box<String>{value="Java"}', s: '"Java"' }, '输出结果。', 'Java']
        ], '泛型如何保证类型安全', '把 T 换成具体类型后，set/get 都会做编译期检查。'),
        quiz: [
          {
            q: '<code>List&lt;? extends Number&gt; list</code>，下面哪个操作是安全的？',
            options: ['list.add(1)', 'list.add(1.0)', 'Number n = list.get(0)', 'list.add(null) 以外的写入'],
            answer: 2,
            explain: '? extends Number 表示元素类型是 Number 的某个未知子类，读取可以当 Number 用；写入编译器无法确认具体子类型，除 null 外都不允许。'
          },
          {
            q: '下面哪个是泛型的不合法用法？',
            options: ['Box<String> b = new Box<>();', 'new T[10]', 'static <T> T id(T t)', 'List<? super Integer> list'],
            answer: 1,
            explain: '泛型类型参数在运行时被擦除，无法创建泛型数组 new T[]；通常用 List<T> 或反射替代。'
          }
        ]
      },

      {
        id: 'erasure',
        title: '类型擦除与泛型限制',
        minutes: 6,
        level: '进阶',
        intro: '泛型是“编译期的语法糖”：编译完成后，List<String> 和 List<Integer> 在 JVM 眼里都是 List。理解擦除，才能解释那些看似奇怪的限制。',
        points: [
          { t: '擦除是什么', d: '编译后类型参数被替换成它的上界（没有上界就是 Object），并在需要处插入强制转换。' },
          { t: '运行时不可见', d: '<code>list.getClass() == ArrayList.class</code> 恒为 true；不能写 <code>if (obj instanceof List&lt;String&gt;)</code>。' },
          { t: '桥方法', d: '子类重写泛型方法时，编译器会生成桥方法保证多态调用正确，这也是反射里偶尔看到 synthetic 方法的原因。' },
          { t: '后果', d: '不能 new T[]、不能重载仅泛型参数不同的方法（<code>f(List&lt;String&gt;)</code> 与 <code>f(List&lt;Integer&gt;)</code> 冲突）。' }
        ],
        code: `List<String> a = new ArrayList<>();
List<Integer> b = new ArrayList<>();

System.out.println(a.getClass() == b.getClass());  // true
// 都是 class java.util.ArrayList

// 编译后大致相当于：
// List a = new ArrayList();
// String s = (String) a.get(0);`,
        tip: '泛型只存在于编译期；运行时想拿类型信息，只能靠反射 + 方法签名 / 泛型父类。',
        demo: D([
          { id: 'src', label: 'List<String>', sub: '源码', x: 8, y: 12, w: 24, h: 14, tone: 'amber', info: '源码里写清楚元素类型，编译器据此做类型检查。' },
          { id: 'compile', label: 'javac 擦除', sub: 'T → Object / 上界', x: 38, y: 12, w: 24, h: 14, tone: 'teal', info: '编译期把类型参数替换成上界，并在读取处插入 (String) 强转。' },
          { id: 'bytecode', label: 'List', sub: '字节码里没有 String', x: 68, y: 12, w: 24, h: 14, tone: 'violet', info: '字节码中的方法签名是 List.get(Object) / List.add(Object)，运行时无法区分。' },
          { id: 'cast', label: 'checkcast', sub: '取出时强转', x: 38, y: 52, w: 24, h: 14, tone: 'rose', info: '取元素时插入 checkcast 指令；如果放了错误类型，会在运行时抛 ClassCastException。' },
          { id: 'info', label: '反射仍可见', sub: '方法签名可读', x: 68, y: 52, w: 24, h: 14, tone: 'blue', info: '字段、方法参数上的泛型信息会保留在 class 文件的 Signature 属性里，反射可以读到。' }
        ], [
          { from: 'src', to: 'compile', label: '编译' },
          { from: 'compile', to: 'bytecode', label: '擦除' },
          { from: 'bytecode', to: 'cast', label: '取值', dashed: true },
          { from: 'compile', to: 'info', label: '保留签名', dashed: true }
        ], '点击节点理解“编译期存在、运行期消失”。', '类型擦除'),
        quiz: [
          {
            q: '<code>new ArrayList&lt;String&gt;().getClass() == new ArrayList&lt;Integer&gt;().getClass()</code> 的结果是？',
            options: ['true', 'false', '编译错误', '运行时异常'],
            answer: 0,
            explain: '泛型被擦除，两个对象在运行时都是 ArrayList，getClass 返回同一个 Class 对象。'
          },
          {
            q: '为什么不能写 <code>new T[10]</code>？',
            options: ['数组不支持泛型语法', '运行时 T 已被擦除，JVM 不知道要创建什么类型的数组', '数组长度必须编译期确定', 'T 只能是基本类型'],
            answer: 1,
            explain: '类型擦除后 T 没有运行时类型信息，无法创建具体类型的数组；可以创建 Object[] 再强转，但不安全。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 6 · 函数式编程
     ================================================================ */
  C.push({
    id: 'm6',
    no: '06',
    title: '函数式编程',
    desc: 'Lambda、Stream 与 Optional',
    lessons: [

      {
        id: 'lambda',
        title: 'Lambda 与函数式接口',
        minutes: 7,
        level: '进阶',
        intro: 'Lambda 把“一段行为”当成参数传出去。它的背后是一个只有一个抽象方法的接口——函数式接口。',
        points: [
          { t: '函数式接口', d: '只有一个抽象方法的接口，如 <code>Runnable</code>、<code>Comparator</code>、<code>Function</code>、<code>Predicate</code>。可用 <code>@FunctionalInterface</code> 校验。' },
          { t: 'Lambda 语法', d: '<code>(参数) -&gt; 表达式</code> 或 <code>(参数) -&gt; { 语句; return ...; }</code>。参数类型可省略，由编译器推断。' },
          { t: '方法引用', d: '<code>String::length</code>、<code>System.out::println</code>、<code>User::new</code>，是 lambda 的进一步简写。' },
          { t: '变量捕获', d: 'lambda 只能捕获 effectively final 的局部变量；修改外部变量请用数组 / 成员变量 / AtomicInteger。' }
        ],
        code: `List<String> names = new ArrayList<>(List.of("Tom", "Anna", "Bob"));

names.sort((a, b) -> a.length() - b.length());
names.forEach(System.out::println);

Runnable task = () -> System.out.println("run in lambda");
new Thread(task).start();

int base = 10;
// base++;               // 编译错误：lambda 捕获的变量必须 effectively final
Function<Integer, Integer> add = x -> x + base;`,
        tip: 'Lambda 不是匿名内部类的语法糖：它没有自己的 this，也不会生成独立的 class 文件（用 invokedynamic）。',
        demo: S(`List<String> names = new ArrayList<>(List.of("Tom", "Anna", "Bob"));
names.sort((a, b) -> a.length() - b.length());
System.out.println(names);`, [
          [0, { names: '[Tom, Anna, Bob]' }, '创建列表，顺序是 Tom、Anna、Bob。'],
          [1, { names: '[Tom, Anna, Bob]', lambda: '(a,b) -> a.length()-b.length()' }, '传入比较器：按长度升序。Tom=3，Anna=4，Bob=3。'],
          [2, { names: '[Tom, Bob, Anna]' }, '排序后：长度 3 的 Tom、Bob 保持原相对顺序（稳定），Anna 在最后。'],
          [2, { names: '[Tom, Bob, Anna]' }, '输出结果。', '[Tom, Bob, Anna]']
        ], 'Lambda 作为参数', '比较器只关心“怎么比”，排序算法由 sort 负责。'),
        quiz: [
          {
            q: '一个接口要能用 lambda 实现，必须满足？',
            options: ['有且只有一个抽象方法', '所有方法都是 default', '必须继承 Runnable', '必须有泛型'],
            answer: 0,
            explain: '函数式接口的定义就是“只有一个抽象方法”；default/static 方法不算抽象方法。'
          },
          {
            q: '下面哪个 lambda 写法能通过编译？',
            options: ['int base = 1; base++; Runnable r = () -> System.out.println(base);', 'int base = 1; Runnable r = () -> System.out.println(base);', 'Runnable r = (x) -> System.out.println(x);', 'Runnable r = () -> return 1;'],
            answer: 1,
            explain: 'lambda 捕获的局部变量必须 effectively final；A 修改了 base，C 参数个数不对，D 的 Runnable 不返回值。'
          }
        ]
      },

      {
        id: 'stream',
        title: 'Stream 流水线',
        minutes: 9,
        level: '进阶',
        intro: 'Stream 让“对一批数据做过滤、转换、排序、汇总”变成一条声明式的流水线。它不修改原集合，而且很多操作是惰性的。',
        points: [
          { t: '三段式', d: '数据源（集合 / 数组 / 文件）→ 中间操作（filter/map/sorted/distinct，返回 Stream）→ 终止操作（collect/forEach/reduce/count）。' },
          { t: '惰性求值', d: '没有终止操作时，中间操作不会执行；遇到终止操作才一次性把元素“流”过去，且每个元素尽量只遍历一次。' },
          { t: '常用收集器', d: '<code>Collectors.toList()</code>、<code>toSet()</code>、<code>joining(",")</code>、<code>groupingBy(...)</code>、<code>counting()</code>。' },
          { t: '注意', d: '流只能消费一次；<code>parallelStream</code> 不是万能加速，涉及共享状态或顺序要求时要谨慎。' }
        ],
        code: `List<String> names = List.of("Tom", "Anna", "Bob", "Lily", "Jack");

List<String> result = names.stream()
        .filter(n -> n.length() > 3)
        .map(String::toUpperCase)
        .sorted()
        .collect(Collectors.toList());

// [ANNA, JACK, LILY]
Map<Integer, List<String>> byLen = names.stream()
        .collect(Collectors.groupingBy(String::length));`,
        tip: 'Stream 处理数据，集合存储数据。别为了用 Stream 而把简单循环写复杂。',
        demo: { type: 'widget', widget: 'stream', title: '把每一步拆开看', hint: '点击“下一步”，观察每个元素在流水线上的变化；filter 会丢掉不满足条件的元素。' },
        quiz: [
          {
            q: '下面哪个是终止操作？',
            options: ['filter', 'map', 'sorted', 'collect'],
            answer: 3,
            explain: 'filter / map / sorted 都是中间操作，返回新的 Stream；collect 触发真正执行并返回结果。'
          },
          {
            q: '一个 Stream 被 collect 消费后，还能再次使用吗？',
            options: ['可以，自动重置', '不可以，流只能消费一次', '可以，但结果为空', '只有 parallelStream 可以'],
            answer: 1,
            explain: 'Stream 是一次性的，消费后关闭；需要再操作就从数据源重新创建。'
          },
          {
            q: '<code>names.stream().filter(...).map(...)</code> 中没有终止操作，会发生什么？',
            options: ['立即执行 filter 和 map', '什么都不执行（惰性）', '编译错误', '自动 collect'],
            answer: 1,
            explain: '中间操作只是记录配方，惰性求值；只有遇到终止操作才会真正遍历数据。'
          }
        ]
      },

      {
        id: 'optional',
        title: 'Optional 与空值处理',
        minutes: 6,
        level: '进阶',
        intro: 'NullPointerException 是 Java 最常见的运行时异常。Optional 用类型系统提醒你“这里可能没有值”，但用错反而更啰嗦。',
        points: [
          { t: '创建', d: '<code>Optional.of(x)</code> 要求非空；<code>Optional.ofNullable(x)</code> 允许空；<code>Optional.empty()</code> 表示没有值。' },
          { t: '安全取值', d: '<code>orElse(default)</code>、<code>orElseGet(supplier)</code>、<code>orElseThrow()</code>、<code>ifPresent</code>、<code>map</code>。' },
          { t: '不要这样用', d: '<code>if (opt.isPresent()) opt.get()</code> 等于换了个写法的 null 判断；<code>Optional</code> 不适合做字段、方法参数和集合元素。' },
          { t: '适用场景', d: '主要用作“可能查不到”的方法返回值，提醒调用方显式处理缺失情况。' }
        ],
        code: `Map<String, String> map = new HashMap<>();
map.put("Tom", "tom@example.com");

Optional<String> email = Optional.ofNullable(map.get("Tom"));
String value = email.orElse("未登记");

Optional<String> missing = Optional.ofNullable(map.get("Bob"));
String name = missing.orElseGet(() -> "匿名用户");

// 链式转换
Optional<Integer> len = email.map(String::length);`,
        tip: 'Optional 的价值在“返回值签名”上；别把它当万能空指针药。',
        demo: S(`Optional<String> opt = Optional.ofNullable(null);
String name = opt.orElse("匿名");
System.out.println(name);
System.out.println(opt.isPresent());`, [
          [0, { opt: 'Optional.empty' }, 'ofNullable(null) 返回 empty，而不是抛异常。'],
          [1, { opt: 'Optional.empty', name: '"匿名"' }, 'orElse 在为空时返回默认值。'],
          [2, { opt: 'Optional.empty', name: '"匿名"' }, '输出默认值。', '匿名'],
          [3, { opt: 'Optional.empty', name: '"匿名"' }, 'isPresent() 判断是否有值，这里是 false。', 'false']
        ], 'Optional 的安全取值', 'orElse 无论是否为空都会计算参数；有开销时用 orElseGet 延迟计算。'),
        quiz: [
          {
            q: '下面哪个会直接抛 NullPointerException？',
            options: ['Optional.ofNullable(null)', 'Optional.empty()', 'Optional.of(null)', 'Optional.of("x")'],
            answer: 2,
            explain: 'Optional.of 要求值非空，传 null 立即抛 NPE；允许空要用 ofNullable。'
          },
          {
            q: '关于 Optional 的使用，下面哪种做法不推荐？',
            options: ['作为查询方法的返回值', '作为实体类的字段', '用 orElseThrow 抛业务异常', '用 map 做链式转换'],
            answer: 1,
            explain: 'Optional 不适合做字段、参数和集合元素，它会增加包装开销且序列化不友好；主要用于返回值。'
          }
        ]
      }
    ]
  });
})();
