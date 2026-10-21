/* 教材正文：函数式与 IO（Stream / Optional / 字节流 / 缓冲流 / NIO / 序列化与 JSON） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['stream'] = {
    meta: '本章约 12800 字 · 建议 50 分钟 · 15 节 · 8 段代码 · 2 张表',
    blocks: [
      { h: '1.1 为什么学 Stream' },
      { p: '初学者处理集合，通常从 for 循环开始：声明一个结果集合，遍历源集合，用 if 过滤，把合格元素 add 进去，循环结束后再排序或拼接。这段代码没有错，但它把“要什么”和“怎么循环”混在了一起。业务规则只有一句“保留成绩大于等于 60 的学生”，代码里却出现了下标、临时变量、add 调用和三层缩进。读的人必须先在大脑里把循环执行一遍，才能确认它究竟做了什么。' },
      { p: 'Stream 的思路是把“做什么”单独描述出来：先取流，再 filter、map、sorted，最后 collect。每一步都是一个独立、可命名、可替换的环节，循环细节被封装进类库。这种写法常被称为声明式风格。它不承诺更快，但通常更短、更难写错，也更容易在中间插入或删除一个步骤——想加日志就插一个 peek，想改排序规则就换一个 Comparator，主流程几乎不用动。' },
      { p: '不过 Stream 不是银弹。创建流、创建 lambda 对象都有开销，只是遍历一次并用一下元素，for 循环往往更直接；流也不能修改源集合、不能复用、不能随意 break。把它当成“集合上的查询语言”，而不是“循环的替代品”，心态就对了：它适合表达筛选、转换、聚合、分组这类数据流水线，不适合复杂状态机或需要精确控制下标与提前退出的重逻辑。' },
      { p: '举个更具体的例子：从一万条日志里找出所有 ERROR 行，提取时间戳并按小时计数。命令式写法要建 Map、循环、截字符串、处理 merge；流式写法是 filter、map、collect(groupingBy(counting))，意图直接写在方法名里。代码变短只是表面，真正的好处是“可组合”：需求从按小时改成按天，只需要换分类函数；要再加一个来源过滤，只需要多一行 filter。' },
      { h: '1.2 一条流的三段结构' },
      { p: '一条 Stream 流水线由三段组成：数据源、零个或多个中间操作、恰好一个终端操作。数据源把集合、数组、文件行或生成器变成流；中间操作接收一个流并返回一个新流，所以可以链式串联；终端操作触发真正的遍历，返回 void、单个值、Optional 或一个集合。注意“返回新流”这四个字：每一步都不修改上一步，而是在描述一条新的流水线。' },
      { p: '正因为如此，中间操作可以无限追加，却一个都不会立刻执行。只有终端操作出现时，JVM 才会从数据源取元素，让每个元素依次经过所有中间环节，最后交给终端操作。这个模型叫“循环合并”：不是先 filter 出一整个集合、再 map 出另一个集合，而是一个元素走完全程再处理下一个，因此内存里不会产生中间集合，数据量大时也不会出现“每步一个临时 List”的浪费。' },
      { flow: ['数据源 collection.stream()', 'filter / map 组装', 'sorted / limit 继续串联', '终端操作 collect', '遍历并产生结果'] },
      { table: { head: ['组成部分', '作用', '典型写法'], rows: [
        ['数据源', '产生元素，本身不存储数据', 'collection.stream()、Arrays.stream()、Files.lines()'],
        ['中间操作', '接收流、返回新流，可串联，惰性', 'filter、map、flatMap、sorted、limit'],
        ['终端操作', '触发遍历，返回非流结果，只能有一次', 'collect、forEach、count、reduce、findFirst']
      ] } },
      { p: '如果只写中间操作而不写终端操作，编译器不会报错，但什么也不会发生。这是新手最常见的困惑之一：代码里明明写了 filter 和 map，控制台却没有任何输出。排查时先看最后一步是不是 collect、forEach、count、reduce、anyMatch 这类终端操作。只要没有终端操作，整条流水线就只是一张“图纸”，永远不会开工。' },
      { p: '还有一点常被忽略：流不存储元素。它只是对数据源的一个视图，数据仍然在集合、数组或文件里。所以对流做任何操作都不会改变源；反过来，如果在终端操作执行期间源被其他线程修改，结果就没有保证。需要并发安全时，应该用并发集合或在流操作前做快照，而不是指望流自动帮你加锁。' },
      { h: '1.3 惰性求值：不调用终端操作就什么都不发生' },
      { p: '流的惰性有两层含义。第一层是“延迟执行”：中间操作只记录规则，不碰数据。第二层是“循环合并”：终端操作触发后，每个元素依次经过全部中间环节，而不是每步生成一个中间集合。这两点合起来，让流可以用很小的内存处理很大的数据，甚至处理无限流——因为 limit 一旦满足，后面的元素根本不会被生成。' },
      { p: '有状态的中间操作会打破“一个元素走完全程”的简单图景。sorted 必须看到全部元素才能排序，distinct 必须记住已经出现过的元素，limit 和 skip 需要计数，它们会在内部缓冲。但缓冲仍然发生在终端操作执行期间，流水线整体依旧是惰性的，不会因为写了 sorted 就提前开始跑。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class LazyDemo {
    public static void main(String[] args) {
        Stream<Integer> stream = Stream.of(1, 2, 3)
                .filter(n -> {
                    System.out.println("filter " + n);
                    return n % 2 == 1;
                });

        System.out.println("流水线已组装，但还没执行");

        List<Integer> odd = stream.collect(Collectors.toList());
        System.out.println("结果 " + odd);
    }
}`, title: 'LazyDemo.java' },
      { out: '流水线已组装，但还没执行\nfilter 1\nfilter 2\nfilter 3\n结果 [1, 3]' },
      { note: '<b>流只能消费一次：</b>终端操作执行后流就关闭了，再对它调用任何方法都会抛 <code>IllegalStateException: stream has already been operated upon or closed</code>。需要重复使用就把结果收集成集合，或者每次重新 <code>stream()</code>。' },
      { p: '运行结果清楚地展示了执行顺序：先打印“流水线已组装”，说明 filter 一次都没执行；collect 出现后，1、2、3 依次进入 filter，偶数被丢弃，奇数进入结果列表。这也说明 lambda 里的打印属于副作用，真实项目里应尽量避免在流中间做副作用操作，否则并行执行时输出顺序会乱，逻辑也难以测试。' },
      { p: '理解了惰性，就能解释一个常见现象：给流加上打印语句后，输出顺序和“先 filter 全部、再 map 全部”的直觉不一致。实际顺序是元素 1 走完 filter、map，元素 2 再走完，如此往复。调试复杂流水线时，把中间结果 collect 成列表再打印，比在每一步塞 peek 更可靠，也更方便对照预期。' },
      { h: '1.4 创建流的五种方式' },
      { p: '创建流的方式取决于数据来源。集合调用 stream() 或 parallelStream()；数组用 Arrays.stream()；几个零散的值用 Stream.of()；需要 1 到 n 的整数序列用 IntStream.range() 或 rangeClosed()，前者右开、后者右闭；文件用 Files.lines() 按行读取，正则可以配合 Pattern.splitAsStream()。选错创建方式通常不会报错，但会带来装箱或类型上的麻烦。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class StreamCreate {
    public static void main(String[] args) {
        List<String> names = List.of("Tom", "Jerry", "Lucy");

        Stream<String> fromList = names.stream();                  // 1. 集合
        Stream<String> fromArray = Arrays.stream(new String[]{"a", "b"}); // 2. 数组
        Stream<Integer> ofValues = Stream.of(1, 2, 3);             // 3. 零散值
        IntStream range = IntStream.range(1, 5);                   // 4. 1,2,3,4
        Stream<Integer> powers = Stream.iterate(1, n -> n * 2).limit(5); // 5. 无限流 + 截断

        System.out.println(fromList.count());   // 3
        System.out.println(range.sum());        // 10
        System.out.println(powers.collect(Collectors.toList())); // [1, 2, 4, 8, 16]
    }
}`, title: 'StreamCreate.java' },
      { out: '3\n10\n[1, 2, 4, 8, 16]' },
      { p: '代码第 10 行的 Arrays.stream 接收的是 String 数组，得到 Stream<String>；第 12 行的 range(1, 5) 不包含 5，所以 sum 是 1+2+3+4=10；第 13 行的 iterate 从 1 开始不断乘 2，如果没有 limit(5)，这行代码本身不会死循环，但后面任何终端操作都会永远跑下去。两个细节值得单独记：Stream.of(new int[]{1,2,3}) 得到的是一个元素的流，元素类型是 int[]，因为可变参数把整个数组当成了一个参数，基本类型数组必须用 Arrays.stream；无限流必须截断，否则终端操作不会结束。' },
      { p: '实际读取文件时，Files.lines(path) 返回的流持有文件句柄，必须用 try-with-resources 关闭；这一点和集合流不同，集合流没有需要释放的资源，BufferedReader.lines() 也一样。忘记关闭在 Windows 上会表现为文件删不掉，在 Linux 上则可能耗尽文件描述符，这类问题排查起来比语法错误麻烦得多。' },
      { note: '<b>提示：</b>集合的 <code>stream()</code> 是默认方法，任何 <code>Collection</code> 实现都有；Map 没有，需要先 <code>map.entrySet().stream()</code> 或 <code>map.keySet().stream()</code>。' },
      { h: '1.5 中间操作：筛选、映射、扁平化' },
      { p: 'filter 的参数是 Predicate&lt;T&gt;，也就是“给一个元素、返回 boolean”的函数；返回 true 的元素进入下游，false 的被丢弃。map 的参数是 Function&lt;T,R&gt;，把元素一对一换成另一种类型或另一个值，元素个数不变。flatMap 的参数是 Function&lt;T,Stream&lt;R&gt;&gt;，先把每个元素展开成一个流，再把这些流首尾拼成一个流，所以元素个数可以变多也可以变少。' },
      { p: '这三个操作构成绝大多数数据转换的骨架。想“挑出符合条件的”用 filter，想“把 A 变成 B”用 map，想“把嵌套结构拍平”用 flatMap。判断该用哪个，只需问一句：我的映射函数返回的是普通值，还是一个流？返回普通值用 map，返回流用 flatMap。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class IntermediateDemo {
    public static void main(String[] args) {
        List<String> lines = List.of("java,stream", "optional,io");

        // map：一行文本 -> 一个 String[]，结果仍是两层
        List<String[]> nested = lines.stream()
                .map(line -> line.split(","))
                .collect(Collectors.toList());
        System.out.println(nested.size());          // 2

        // flatMap：一行文本 -> 多个单词，结果拍平为一层
        List<String> words = lines.stream()
                .flatMap(line -> Arrays.stream(line.split(",")))
                .collect(Collectors.toList());
        System.out.println(words);                  // [java, stream, optional, io]

        // sorted + limit + skip
        List<String> names = List.of("tom", "Jerry", "lucy", "bob");
        List<String> top2 = names.stream()
                .sorted(Comparator.comparing(String::length)
                                  .thenComparing(Comparator.naturalOrder()))
                .limit(2)
                .collect(Collectors.toList());
        System.out.println(top2);                   // [bob, tom]
        System.out.println(names.stream().skip(2).collect(Collectors.toList()));
    }
}`, title: 'IntermediateDemo.java' },
      { out: '2\n[java, stream, optional, io]\n[bob, tom]\n[lucy, bob]' },
      { p: 'map 版本得到的是 List&lt;String[]&gt;，长度是 2，因为每一行只被换成了一个数组对象；flatMap 版本把每个数组摊开成流再合并，得到 4 个单词。如果把 flatMap 换成 map，下游拿到的是 Stream&lt;String[]&gt;，还得再套一层循环，这正是“该扁平化却没扁平化”的典型症状。另外，split 的参数是正则表达式，逗号本身不是元字符，直接写逗号没问题；如果分隔符是竖线或点号，必须转义。' },
      { h: '1.6 中间操作：去重、排序、截断' },
      { p: 'distinct 基于 equals 和 hashCode 判断重复，所以自定义类必须正确重写这两个方法，否则去重不生效——两个内容相同的对象会被当成不同元素保留下来。sorted() 无参版本要求元素实现 Comparable，否则运行时抛 ClassCastException；更常用的是 sorted(Comparator.comparing(...))，可以用 thenComparing 追加次级排序，用 reversed() 反转顺序。' },
      { p: 'limit(n) 最多保留前 n 个，skip(n) 丢掉前 n 个，两者的参数都必须是非负数，否则抛 IllegalArgumentException。skip 超过流长度只会得到空流，limit 超过长度也不会报错，这两个边界经常被面试问到。peek 接收 Consumer，元素流过时看一眼，主要用于调试；不要用它做真正的业务处理，因为 Java 9 之后 count() 在能直接算出个数时可能根本不遍历元素，peek 里的代码就不会执行。' },
      { p: '回到上面的代码，第 21 行先按长度升序，长度相同的 bob 和 tom 再用 naturalOrder() 按字典序，b 在 t 前面，所以 top2 是 bob、tom。如果只按长度排序，两个长度相同的元素顺序取决于排序的稳定性，虽然结果可预期，但不应该依赖。最后一行 skip(2) 丢掉前两个元素，剩下 lucy 和 bob；注意 skip 只影响流的结果，原 names 仍然是四个元素，一个都没少。' },
      { h: '1.7 终端操作与短路' },
      { p: '终端操作可以分成几类：消费型 forEach；计数 count；聚合 reduce、min、max；匹配 anyMatch、allMatch、noneMatch；查找 findFirst、findAny；收集 collect；转换 toArray。它们都会触发遍历，但返回类型和是否短路不同。理解这些差异，才能写出既正确又不做无用功的代码。' },
      { p: 'anyMatch、allMatch、noneMatch、findFirst、findAny 都会短路：一旦能确定结果就停止遍历。对一个很大的流做 anyMatch，可能只处理第一个元素就返回。这里有两个容易被忽略的边界：空流上 allMatch 返回 true（“所有元素都满足”在没有元素时视为真），anyMatch 返回 false；findFirst 和 findAny 在没有元素时返回 Optional.empty()，直接 get 会抛 NoSuchElementException。' },
      { p: 'reduce 有三种常见形态：带初始值的 reduce(identity, accumulator) 一定返回具体类型；不带初始值的 reduce(accumulator) 返回 Optional；三参数的 reduce(identity, accumulator, combiner) 主要给并行流用，combiner 负责合并各段结果。初学者容易在字符串拼接时用带初始值的版本，结果多出一个前缀；或者在求和时把初始值写成 1，导致结果整体偏移。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class TerminalDemo {
    public static void main(String[] args) {
        List<Integer> nums = List.of(3, 8, 1, 9, 4);

        long count = nums.stream().filter(n -> n > 3).count();      // 3
        int sum = nums.stream().reduce(0, Integer::sum);            // 25
        Optional<Integer> max = nums.stream().max(Integer::compareTo);
        boolean hasTen = nums.stream().anyMatch(n -> n == 10);
        boolean allPositive = nums.stream().allMatch(n -> n > 0);

        System.out.println(count);
        System.out.println(sum);
        System.out.println(max.orElse(-1));
        System.out.println(hasTen);
        System.out.println(allPositive);
    }
}`, title: 'TerminalDemo.java' },
      { out: '3\n25\n9\nfalse\ntrue' },
      { p: '第 8 行的 reduce(0, Integer::sum) 以 0 为初始值，把每个元素累加进去；如果去掉初始值写成 reduce(Integer::sum)，返回类型会变成 Optional&lt;Integer&gt;，因为空流没有结果可返回。第 9 行的 max 需要 Comparator，Integer::compareTo 就是自然顺序；max 返回 Optional，所以第 13 行用 orElse(-1) 给出空流时的兜底值，而不是直接 get。' },
      { note: '<b>常见错误：</b>对可能为空的流调用 <code>get()</code>。正确做法是 <code>orElse</code>、<code>orElseGet</code>、<code>orElseThrow</code>，或者先用 <code>isPresent()</code> 判断。细节见 Optional 一章。' },
      { h: '1.8 collect 与 Collectors' },
      { p: 'collect 是最常用的终端操作，它把流中的元素“收”进一个容器。最基础的写法是 collect(Collectors.toList())，Java 16 起 Stream 也提供了更短的 toList()，得到的是不可变列表。Collectors 是一个工厂类，提供了大量预置收集器：toSet、toMap、joining、groupingBy、partitioningBy、counting、summingInt、averagingInt 等，几乎覆盖了日常统计需求。' },
      { p: 'groupingBy 按分类函数把元素分到不同的 List，返回 Map&lt;K,List&lt;T&gt;&gt;；它的第二个参数是下游收集器，可以把每组继续聚合，例如 counting 求个数、summingInt 求和、mapping 提取字段。toMap 把元素转成键值对，两个参数的版本遇到重复键会抛 IllegalStateException，三个参数的版本允许你提供合并函数来决定保留哪一个。' },
      { p: '选择收集器时先想清楚结果的形状：要 List 还是 Set？要 Map 还是要一个字符串？Map 的键是什么、值是什么？groupingBy 与 toMap 最容易混淆：前者一定返回“键到列表”的映射（除非给了下游收集器），后者要求你明确指定键和值。实际项目里还常见 Collectors.mapping(字段, toList()) 作为下游，用来在分组后只保留某个字段，避免把整个对象塞进列表。' },
      { p: '如果预置收集器不够用，可以自己实现 Collector 接口，但那属于进阶内容。日常开发中更常见的做法是先 collect 成集合，再用普通代码处理；真正需要自定义收集器的场景通常是性能敏感或结果结构特殊，例如把流直接写进一个自定义的摘要对象。初学阶段先把 groupingBy、toMap、joining 用熟，比手写 Collector 划算得多。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class CollectorsDemo {
    public static void main(String[] args) {
        List<String> names = List.of("Tom", "Jerry", "Lucy", "Bob");

        Map<Integer, List<String>> byLength = names.stream()
                .collect(Collectors.groupingBy(String::length));
        System.out.println(byLength);

        String joined = names.stream()
                .collect(Collectors.joining(", ", "[", "]"));
        System.out.println(joined);

        Map<String, Integer> lengths = names.stream()
                .collect(Collectors.toMap(n -> n, String::length, (a, b) -> a));
        System.out.println(lengths.get("Jerry"));
    }
}`, title: 'CollectorsDemo.java' },
      { out: '{3=[Tom, Bob], 4=[Lucy], 5=[Jerry]}\n[Tom, Jerry, Lucy, Bob]\n5' },
      { table: { head: ['收集器', '返回结果', '典型用途'], rows: [
        ['toList / toSet', 'List / Set', '把流收成集合'],
        ['toMap', 'Map', '按某个字段建索引'],
        ['groupingBy', 'Map<K, List<T>>', '按部门、类型分组'],
        ['joining', 'String', '拼接成一行文本'],
        ['counting / summingInt', 'Long / Integer', '计数、求和'],
        ['partitioningBy', 'Map<Boolean, List<T>>', '按条件一分为二']
      ] } },
      { p: '第 7 行的 groupingBy 以名字长度为键，Tom 和 Bob 长度都是 3，被分到同一组；打印顺序取决于 HashMap 的遍历顺序，不要假设它按插入顺序输出。第 12 行的 joining 三个参数分别是分隔符、前缀、后缀。第 15 行的 toMap 第三个参数 (a,b) -&gt; a 表示键冲突时保留先出现的值；如果省略这个参数，遇到重复键会直接抛异常。另外 toMap 不允许值为 null，因为底层用 Map.merge 实现，null 会触发 NullPointerException。' },
      { h: '1.9 基本类型流' },
      { p: 'Stream&lt;Integer&gt; 里的每个元素都是装箱对象，大量数值计算时会产生频繁的装箱、拆箱和垃圾回收。为此 Java 提供了三条专用流：IntStream、LongStream、DoubleStream，元素以基本类型存储。它们有通用流没有的 sum()、average()、max()、min()、summaryStatistics()，其中 average 返回 OptionalDouble，空流时为空。' },
      { p: '通用流和基本类型流之间可以互相转换：mapToInt、mapToLong、mapToDouble 把对象流转成基本类型流；boxed() 把基本类型流转回对象流；asLongStream、asDoubleStream 在数值类型之间转换。选择原则很简单：只做数值聚合就用基本类型流，需要收集成 List&lt;Integer&gt; 或参与对象操作时再 boxed。' },
      { p: '还有一个小陷阱：IntStream 的 map 接收 IntUnaryOperator，参数和返回值都是 int；如果想映射成对象，要用 mapToObj；反过来 Stream&lt;Integer&gt; 想变成 IntStream 用 mapToInt。类型不匹配时编译器会提示“不兼容的类型”，看到这类错误先检查是不是在基本类型流和对象流之间用错了方法名，而不是怀疑泛型坏了。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class PrimitiveDemo {
    public static void main(String[] args) {
        int[] scores = {88, 92, 76, 95};

        IntSummaryStatistics stats = Arrays.stream(scores).summaryStatistics();
        System.out.println(stats.getCount());      // 4
        System.out.println(stats.getSum());        // 351
        System.out.println(stats.getMax());        // 95
        System.out.println(stats.getAverage());    // 87.75

        List<Integer> boxed = Arrays.stream(scores)
                .boxed()
                .collect(Collectors.toList());
        System.out.println(boxed);                 // [88, 92, 76, 95]
    }
}`, title: 'PrimitiveDemo.java' },
      { out: '4\n351\n95\n87.75\n[88, 92, 76, 95]' },
      { p: 'summaryStatistics 只遍历一次就同时算出个数、总和、最小值、最大值和平均值，比分别调用 count、sum、max 高效得多，这在统计报表类代码里很实用。注意 getAverage 返回 double，即使没有元素也返回 0.0 而不是 NaN；如果业务上需要区分“没有数据”和“平均值为 0”，应该用 average() 返回的 OptionalDouble 判断。' },
      { h: '1.10 并行流与高频错误清单' },
      { p: 'parallelStream() 或 stream().parallel() 会把数据切成多段，交给 ForkJoinPool.commonPool 里的多个线程分别处理，最后合并结果。默认并行度是 CPU 核数减一，因为 commonPool 还要留给其他并行任务。切分依赖 Spliterator，ArrayList、数组这类支持随机访问的数据源切分成本低，LinkedList 或 IO 流切分效果差。' },
      { p: '并行不是免费加速。它适合“数据量大、每个元素计算密集、没有共享可变状态、不依赖元素顺序、不涉及阻塞 IO”的场景。数据量小的时候，线程调度和结果合并的开销会超过收益；元素计算很轻的时候同样如此。最典型的错误是在 parallel 流里往同一个 ArrayList 里 add，多个线程同时扩容会导致数据丢失甚至抛异常。' },
      { p: '另一个常见误区是把 parallelStream 当成“加了就快”的开关。实际上并行流对数据源结构很敏感：ArrayList、数组、IntStream.range 切分均匀，适合并行；LinkedList、Stream.iterate、BufferedReader.lines 很难均分，并行后可能比串行还慢。判断要不要并行，最靠谱的办法是写一个基准测试，用真实数据量和真实 JVM 参数跑一遍，而不是凭感觉。' },
      { code: `import java.util.stream.*;

public class ParallelDemo {
    public static void main(String[] args) {
        long sum = LongStream.rangeClosed(1, 1_000_000L)
                .parallel()
                .filter(n -> n % 2 == 0)
                .sum();
        System.out.println(sum);          // 250000500000

        IntStream.range(1, 6)
                .parallel()
                .forEachOrdered(n -> System.out.print(n + " "));
        System.out.println();
    }
}`, title: 'ParallelDemo.java' },
      { out: '250000500000\n1 2 3 4 5' },
      { note: '<b>并行流三条铁律：</b>不要在 lambda 里修改共享变量；需要顺序就用 <code>forEachOrdered</code>；不要占用 commonPool 执行阻塞任务（数据库、HTTP、文件），否则会影响整个应用里所有并行流。' },
      { p: '第 4 到 7 行是标准的并行聚合：rangeClosed 生成 1 到 100 万，parallel 开启并行，filter 保留偶数，sum 合并各段结果。偶数之和等于 2×(1+2+…+500000)=250000500000。第 9 到 11 行用 forEachOrdered 保证按源顺序输出；如果换成 forEach，并行下输出顺序是乱的，这不是 bug，而是并行流本来就不承诺顺序。需要“第一个匹配”时用 findFirst，它要维护顺序所以更慢；只关心“任意一个匹配”就用 findAny。' },
      { list: [
        '<b>忘记终端操作：</b>只写 filter/map，没有 collect，代码不报错但什么也不做。',
        '<b>复用同一条流：</b>第二次调用终端操作抛 IllegalStateException，应对集合重新 stream()。',
        '<b>在 lambda 里改外部变量：</b>编译器要求捕获的局部变量是 effectively final，想累加就用 reduce 或 collect。',
        '<b>用 peek 做业务处理：</b>count 等操作可能跳过遍历，peek 不执行，副作用丢失。',
        '<b>toMap 键重复或值为 null：</b>前者抛 IllegalStateException，后者抛 NullPointerException，要提供合并函数并避免 null 值。',
        '<b>并行流里写共享集合：</b>ArrayList 非线程安全，结果可能少数据，应改用 collect 或并发容器。',
        '<b>把有状态的 lambda 当无状态用：</b>并行流里每个元素执行顺序不确定，依赖上一次结果的写法在串行下正确、并行下必错。'
      ] },
      { h: '1.11 实战：订单统计' },
      { p: '把上面的知识串起来做一个小需求：给定订单列表，统计每个用户的总金额，找出金额大于等于 100 的用户名（去重、排序），再找出金额最大的一笔订单。需求本身不复杂，但用流表达后，每一段业务规则都独立成一行，修改和维护都很直观。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class OrderStats {
    static class Order {
        final String user;
        final int amount;
        Order(String user, int amount) { this.user = user; this.amount = amount; }
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(
                new Order("tom", 120),
                new Order("lucy", 80),
                new Order("tom", 200),
                new Order("bob", 50));

        Map<String, Integer> totalByUser = orders.stream()
                .collect(Collectors.groupingBy(o -> o.user,
                         Collectors.summingInt(o -> o.amount)));
        System.out.println(totalByUser.get("tom"));      // 320

        List<String> richUsers = orders.stream()
                .filter(o -> o.amount >= 100)
                .map(o -> o.user)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        System.out.println(richUsers);                   // [tom]

        Optional<Order> top = orders.stream()
                .max(Comparator.comparingInt(o -> o.amount));
        System.out.println(top.map(o -> o.user + ":" + o.amount).orElse("无订单"));
    }
}`, title: 'OrderStats.java' },
      { out: '320\n[tom]\ntom:200' },
      { p: '第一段用 groupingBy 加下游收集器 summingInt，一次遍历就得到每个用户的总金额，比“先分组再循环求和”少写很多代码。第二段 filter 保留大额订单，map 取出用户名，distinct 去重，sorted 排序，最后收集；注意顺序：先 filter 再 map 可以减少后续处理的数据量，把 filter 放在越前面越好。第三段 max 返回 Optional，用 map 把订单转成展示字符串，再用 orElse 处理空列表，全程没有出现 null 判断。' },
      { p: '这段代码还可以继续扩展：按金额区间一分为二用 partitioningBy(o -&gt; o.amount &gt;= 100)；统计每人订单数用 groupingBy(o -&gt; o.user, counting())；取金额前三用 sorted(comparingInt(Order::amount).reversed()).limit(3)。但要提醒一句：流不是越长越优雅，一条链超过六七个操作时，抽成有名字的方法或中间变量，比硬凑一行更容易读，也更容易调试。' },
      { h: '1.12 本章小结' },
      { list: [
        '流由数据源、中间操作、终端操作三段组成，没有终端操作就不会执行。',
        '中间操作惰性且返回新流；一个元素走完整条流水线，不产生中间集合。',
        'filter/map/flatMap 是筛选、转换、扁平化的核心；distinct 依赖 equals/hashCode。',
        'collect 配合 Collectors 完成分组、求和、拼接、分区等聚合。',
        '基本类型流避免装箱；并行流只适合大数据量、无共享状态、计算密集的场景。',
        '惰性求值是流的核心：没有终端操作，一切都不会发生；流执行完即关闭，不能复用。'
      ] },
      { h: '1.13 常见追问' },
      { list: [
        '<b>stream() 和 for 循环哪个快？</b>简单遍历 for 通常更快；流的价值在可读性和组合性，性能要靠基准测试说话。',
        '<b>为什么流不能重复使用？</b>流是对数据源的一次性视图，终端操作后已消费，设计上就不支持重放。',
        '<b>中间操作顺序重要吗？</b>重要。filter 越靠前，后续处理的数据越少；sorted 是有状态操作，尽量放在过滤之后。',
        '<b>forEach 能替代所有循环吗？</b>不能，它不能 break、不能 continue，也不保证顺序（并行时）。',
        '<b>无限流怎么安全使用？</b>必须配合 limit 或短路操作（findFirst、anyMatch），否则永远不结束。'
      ] },
      { h: '1.14 自测与练习' },
      { ol: [
        '把一个用 for 循环求平均分的程序改写成 IntStream 加 average，并处理空列表。',
        '用 flatMap 把 List&lt;List&lt;Integer&gt;&gt; 拍平成 List&lt;Integer&gt;，再用 distinct 去重、sorted 排序。',
        '用 groupingBy 统计一段文本里每个单词出现的次数（提示：下游用 counting）。',
        '写一段代码复现 IllegalStateException，并说明如何修复。',
        '构造一个 100 万元素的列表，分别用串行和并行求和，比较耗时并解释差异。',
        '用 toMap 建立“学号 → 学生”的索引，处理重复学号并说明合并函数的作用。'
      ] }
    ]
  };

  T['optional'] = {
    meta: '本章约 12700 字 · 建议 45 分钟 · 14 节 · 7 段代码 · 3 张表',
    blocks: [
      { h: '2.1 Optional 是什么、不是什么' },
      { p: 'Optional&lt;T&gt; 是一个最多装一个元素的容器：要么是 Optional.of(value)，要么是 Optional.empty()。它装的元素本身不允许是 null，Optional.of(null) 会立刻抛 NullPointerException。这是设计者有意的选择——如果允许“装着 null 的 Optional”，那么“空”就有了两种表示，判空逻辑会重新变得混乱。' },
      { p: '它也不是“可空引用”的替代品，更不是语法糖。每次创建 Optional 都会多一个对象，在极热的循环里滥用会带来额外分配。它最适合的位置是返回值，尤其是“查不到”属于正常业务分支的场景，例如按 id 查用户、从配置里读可选项、解析可能失败的字符串。把它塞进实体字段、方法参数或集合元素，通常会带来更多麻烦，而不是更少。' },
      { p: '还有一个容易被忽略的细节：Optional 只能装引用类型。Optional&lt;Integer&gt; 里的 Integer 会自动装箱，如果这段代码在数值密集的循环里，装箱开销比 Optional 对象本身更值得关注。JDK 为此提供了 OptionalInt、OptionalLong、OptionalDouble 三个特化版本，它们用 hasValue 加 value 两个字段避免装箱，但没有 map、flatMap 那套完整的链式 API，只适合简单场景。日常业务里 Optional&lt;Integer&gt; 完全够用，只有确认它是热点后再考虑特化。' },
      { table: { head: ['常见说法', '是否正确', '说明'], rows: [
        ['Optional 能彻底消灭 NPE', '错误', '只覆盖返回值缺失，字段和集合元素仍可能是 null'],
        ['Optional 可以装 null', '错误', 'of(null) 抛 NPE，ofNullable(null) 得到 empty'],
        ['Optional 实现了 Serializable', '错误', '设计上不支持序列化，不要放进需要序列化的实体'],
        ['Optional 适合做返回值', '正确', '明确表达“可能查不到”，强制调用方处理'],
        ['Optional 适合做方法参数', '不建议', '调用方仍要判空，不如重载或直接要求非空']
      ] } },
      { p: '关于序列化要特别强调：Optional 没有实现 Serializable。把它放进需要走 Java 序列化、RPC 框架或缓存序列化的对象里，运行时会直接报 NotSerializableException。这也是“Optional 只做返回值”这条建议的重要理由之一——返回值通常不参与序列化，而字段会。' },
      { p: '还有一个实践上的分歧：Optional 是否应该出现在集合里。List&lt;Optional&lt;T&gt;&gt; 的支持者认为每个元素都能表达“缺失”，反对者认为应该直接过滤掉空值，让集合只装有效元素。多数场景下后者更简单，因为集合本身已经有“没有元素”的表达方式——空集合，再给每个元素套一层容器，遍历时就要多一次解包。只有当“缺失”和“元素值为 null”需要区分对待时，Optional 才有意义。' },
      { h: '2.2 为什么用 Optional：与传统 null 检查的对比' },
      { p: 'NullPointerException 大概是 Java 里最常见的运行时异常。它的触发条件很单一：对一个为 null 的引用调用方法、访问字段或取数组长度。但它的出现位置极其分散：可能是方法返回了 null，可能是字段忘了初始化，可能是 Map 里没有这个键，也可能是上游接口少传了一个值。堆栈只告诉你“哪一行炸了”，不告诉你“这个值为什么是 null”。' },
      { p: 'Java 8 引入 Optional，思路是把“可能没有值”写进类型里。一个返回 Optional&lt;User&gt; 的方法，等于在签名上声明：我可能找不到用户，调用方必须处理这种情况。相比在文档里写一句“找不到返回 null”，类型声明更难被忽略，也更适合被编译器、IDE 和静态分析工具检查。' },
      { p: '但 Optional 不是消除 NPE 的魔法。它只覆盖“方法返回值可能缺失”这一种场景；字段、方法参数、集合元素、数组元素仍然可能是 null。真正的价值有两点：一是把“可能为空”变成签名的一部分，让调用方在写代码时就看见；二是提供一套链式 API，让一连串可能为空的取值可以平铺着写，任何一步为空就整条链短路，而不是层层嵌套 if。' },
      { p: '从语言演进看，Optional 更像是“给 API 作者的工具”，而不是“给所有代码的通用容器”。它的主要使用者是类库和框架：JDK 自己的 Stream.findFirst、Collectors.maxBy 都返回 Optional，Spring Data 的 findById 也返回 Optional。框架这么做，是因为它无法预知调用方把“查不到”当错误还是当正常分支，只能把决定权交回去。业务代码跟着这个约定走，就能在读写之间形成一致的风格：谁返回 Optional，谁就负责说明“空”是合法结果。' },
      { p: '传统写法用 null 表示“没有”，靠注释和口头约定传递这个信息。调用方如果忘了判空，错误会在使用处爆发；如果判空了但判的是另一个变量，错误依旧。Optional 把这件事前移到签名：返回类型写着 Optional，调用方就知道必须处理空的情况，IDE 也会提示。' },
      { table: { head: ['维度', '返回 null', '返回 Optional'], rows: [
        ['可读性', '多层判空，嵌套深', '链式调用，主流程扁平'],
        ['编译期提示', '看不到，只能靠注释', '返回类型直接写明可能为空'],
        ['遗漏风险', '忘判空就 NPE', '不调用 get 就不会 NPE'],
        ['性能', '几乎零开销', '每个实例一个对象，热路径慎用'],
        ['序列化', '可以传 null', '不支持，不能进实体字段']
      ] } },
      { p: '团队落地时最好约定一条明确规则，例如“对外 service 方法返回 Optional，内部工具方法允许返回 null，实体字段一律不用 Optional”。规则写进编码规范，代码评审时才有依据。没有约定的团队最容易出现两种极端：一种是全项目 Optional 泛滥，连 getter 都返回 Optional；另一种是完全不用，继续靠注释传递空值信息。两者都比“边界清晰、内部简单”的折中方案更难维护。' },
      { h: '2.3 创建：of、ofNullable 与 empty' },
      { p: '创建 Optional 只有三个入口。Optional.of(value) 要求 value 非 null，适合你已经确定有值的场景；Optional.ofNullable(value) 接受 null，null 会变成 empty，适合包装一个来路不明的值；Optional.empty() 直接得到一个空容器，适合“明确没有结果”的分支。三者的选择不是风格问题，而是语义问题。' },
      { p: '最常见的用法是把可能为 null 的返回值包起来：return Optional.ofNullable(map.get(key))。这里不能写 Optional.of(map.get(key))，因为键不存在时 get 返回 null，of 会立刻抛 NPE，反而把一个“查不到”变成了异常。同样，方法内部如果已经判断了“找不到”，直接 return Optional.empty() 比 return Optional.ofNullable(null) 更清楚。' },
      { p: '声明 Optional 变量时建议把泛型写全：Optional&lt;User&gt; u = find(id); 而不是 Optional u = find(id);。后者会产生原始类型警告，取出来还得强转，等于把类型安全丢掉了。另一个常见困惑是 Optional 变量本身也可以是 null——Optional&lt;User&gt; u = null; 完全合法，此时 u.isPresent() 会 NPE。所以“用 Optional 就不会 NPE”这句话并不绝对，方法内部不要返回 null 的 Optional，也不要给 Optional 变量赋 null。' },
      { code: `import java.util.Optional;

public class CreateDemo {
    public static void main(String[] args) {
        Optional<String> a = Optional.of("hello");     // 必须有值
        Optional<String> b = Optional.ofNullable(null); // null -> empty
        Optional<String> c = Optional.empty();         // 直接空

        System.out.println(a);              // Optional[hello]
        System.out.println(b);              // Optional.empty
        System.out.println(c.isPresent());  // false
        System.out.println(a.get());        // hello

        // Optional.of(null);  // 运行时抛 NullPointerException
    }
}`, title: 'CreateDemo.java' },
      { out: 'Optional[hello]\nOptional.empty\nfalse\nhello' },
      { p: '第 4 行的 of 在参数为 null 时立刻失败，属于“快速失败”：错误发生在创建处，而不是几十行之后调用 get 的地方，排查成本低得多。第 5 行的 ofNullable 则把 null 转成 empty，适合包装外部数据。第 8 行打印 Optional 的 toString，有值时是 Optional[值]，空时是 Optional.empty；这个格式只适合调试，不要拿它去做业务展示。' },
      { h: '2.4 取值：get 的危险与 orElse 家族' },
      { p: 'Optional 最直接的取值方式是 get()，但它在空容器上会抛 NoSuchElementException。这个异常和 NPE 一样，属于“本可以避免”的运行时错误：既然类型已经告诉你可能为空，再直接 get 就等于把类型提供的信息扔掉了。所以除了“刚刚才判断过一定有值”的极少数场景，都应该用 orElse 系列方法。' },
      { p: '还有一个更隐蔽的坑：orElse 返回的是 T，如果 T 本身是可变对象，默认值会被多个调用方共享。比如 orElse(new ArrayList&lt;&gt;()) 每次调用都会新建一个列表，看似安全；可如果写成 orElse(SHARED_LIST)，所有拿到默认值的调用方会往同一个列表里写，产生极难排查的数据污染。要么用 orElseGet(() -> new ArrayList&lt;&gt;())，要么确认默认值是不可变对象。' },
      { p: 'orElse(T other) 在空时返回传入的默认值，注意这个默认值在调用前就已经被求值了，哪怕 Optional 有值，默认值表达式也已经执行过。orElseGet(Supplier) 接收一个工厂，只有真正为空时才调用它，适合默认值需要计算、查库或创建对象的场景。orElseThrow 则在空时抛异常，分无参和带 Supplier 两个版本，后者可以抛自定义异常并附带业务提示。' },
      { code: `import java.util.Optional;

public class OrElseDemo {
    static String slowDefault() {
        System.out.println("计算默认值");
        return "default";
    }

    public static void main(String[] args) {
        Optional<String> empty = Optional.empty();
        Optional<String> name = Optional.of("Tom");

        System.out.println(empty.orElse(slowDefault()));   // 默认值被计算
        System.out.println(name.orElse(slowDefault()));    // 有值也算了一次
        System.out.println(name.orElseGet(() -> slowDefault())); // 有值，不计算
        try {
            empty.orElseThrow();
        } catch (Exception e) {
            System.out.println(e.getClass().getSimpleName());
        }
    }
}`, title: 'OrElseDemo.java' },
      { out: '计算默认值\ndefault\n计算默认值\nTom\nTom\nNoSuchElementException' },
      { p: '输出里出现了两次“计算默认值”，第一次是空容器真的需要默认值，第二次是 name 明明有值，但 orElse 的参数已经先算好了。如果 slowDefault 换成一次数据库查询，这就是一次完全浪费的 IO。这类问题在压测时才会暴露，平时很难察觉，所以只要默认值不是常量，就优先用 orElseGet。' },
      { table: { head: ['方法', '空容器时', '适用场景'], rows: [
        ['get()', '抛 NoSuchElementException', '已确认有值，一般不用'],
        ['orElse(v)', '返回 v，v 总会先求值', '默认值是常量或现成对象'],
        ['orElseGet(s)', '调用 s 取默认值', '默认值需要计算、查库'],
        ['orElseThrow()', '抛 NoSuchElementException', '缺失属于异常（Java 10+）'],
        ['orElseThrow(s)', '抛 s 生成的异常', '需要自定义异常与提示'],
        ['ifPresent(c)', '什么也不做', '只关心有值时做事']
      ] } },
      { p: 'orElseThrow 的 Supplier 版本还有一个实用价值：异常消息可以携带上下文。比如 orElseThrow(() -> new NotFoundException(“用户不存在: ” + id))，异常里直接带上出错的 id，日志里一眼能看出是哪条数据出的问题。如果写成无参的 orElseThrow()，得到的是没有消息的 NoSuchElementException，排查时还得回代码里找调用点。生产代码更推荐带 Supplier 的写法，配合全局异常处理器统一转成 404 之类的响应。' },
      { h: '2.5 转换：map、flatMap 与 filter' },
      { p: 'map 接收一个 Function，把容器里的值转换成另一个值，再用 ofNullable 包回 Optional。如果容器本来是空的，map 直接返回 empty，函数根本不会执行。这一点非常关键：它让链式取值天然安全，你不需要在每一步前面加判空。flatMap 与 map 类似，但要求函数返回 Optional，用于避免出现 Optional&lt;Optional&lt;T&gt;&gt; 这种嵌套。' },
      { p: 'filter 接收 Predicate，值满足条件就保留，不满足就变成 empty。它常和 map 搭配，用来在取值之后追加业务校验，例如“金额必须大于 0”。注意 filter 不会抛异常，只是把不合格的值变成空，所以它适合表达“不满足条件就当作没有”，而不是“不满足条件就报错”。后者应该用 orElseThrow 或显式的 if。' },
      { code: `import java.util.Optional;

public class TransformDemo {
    static class Address {
        final String city;
        Address(String city) { this.city = city; }
    }
    static class User {
        final String name;
        final Address address;
        User(String name, Address address) { this.name = name; this.address = address; }
    }

    static Optional<User> findUser(String name) {
        if ("tom".equals(name)) return Optional.of(new User("tom", new Address("北京")));
        if ("bob".equals(name)) return Optional.of(new User("bob", null));
        return Optional.empty();
    }

    public static void main(String[] args) {
        String city = findUser("tom")
                .map(u -> u.address)
                .map(a -> a.city)
                .orElse("未知");
        System.out.println(city);              // 北京

        String bobCity = findUser("bob")
                .map(u -> u.address)
                .map(a -> a.city)              // address 为 null，直接短路
                .orElse("未知");
        System.out.println(bobCity);           // 未知

        String lucy = findUser("lucy").map(u -> u.name).orElse("查无此人");
        System.out.println(lucy);              // 查无此人

        Optional<String> flat = findUser("tom")
                .flatMap(u -> Optional.ofNullable(u.address))
                .map(a -> a.city);
        System.out.println(flat.orElse("未知")); // 北京

        System.out.println(findUser("tom").filter(u -> u.name.length() > 5).isPresent());
    }
}`, title: 'TransformDemo.java' },
      { out: '北京\n未知\n查无此人\n北京\nfalse' },
      { p: '第 27 行的 map 返回 Optional&lt;Address&gt;，如果 address 是 null，map 内部用 ofNullable 包装，结果就是 empty，第二个 map 根本不会执行，所以不会 NPE。第 38 行的 flatMap 如果换成 map，会得到 Optional&lt;Optional&lt;Address&gt;&gt;，后面再 map 就要多剥一层，这正是需要 flatMap 的信号。第 44 行的 filter 因为 tom 长度只有 3，条件不满足，isPresent 返回 false。' },
      { p: 'map 里的函数如果自己抛异常，Optional 不会捕获，异常会原样向外传播。这一点常被误解：有人以为 map 能像 try/catch 一样吞掉错误，实际上它只处理“返回 null”这一种情况。所以解析字符串时，Integer.parseInt 抛出的 NumberFormatException 需要你在函数内部捕获并返回 empty，或者让异常继续上抛由调用方决定。两种策略都合理，关键是别指望 map 兜底。' },
      { h: '2.6 消费与判断：ifPresent、ifPresentOrElse、isEmpty' },
      { p: '如果只关心“有值时做一件事”，用 ifPresent(Consumer)；它不会返回值，也不能在空时做别的事。Java 9 增加了 ifPresentOrElse(Consumer, Runnable)，可以同时处理有值和没值两个分支，相当于把 if/else 收进一个方法调用。Java 11 增加了 isEmpty()，语义上比 !isPresent() 更直观，但两者完全等价。' },
      { p: '这几个方法适合“消费”场景：打印、写日志、调另一个有副作用的接口。它们不适合“取值”场景，因为 Consumer 没有返回值，你只能通过修改外部变量来收集结果，而在 lambda 里改外部局部变量是不允许的。需要结果就用 map 加 orElse，需要分支逻辑且两边都复杂，就用普通的 if 判断，别硬套 Optional。' },
      { code: `import java.util.Optional;

public class ConsumeDemo {
    public static void main(String[] args) {
        Optional<String> name = Optional.of("Tom");
        Optional<String> empty = Optional.empty();

        name.ifPresent(n -> System.out.println("你好 " + n));
        empty.ifPresent(n -> System.out.println("不会执行"));

        name.ifPresentOrElse(
                n -> System.out.println("有值: " + n),
                () -> System.out.println("没有值"));
        empty.ifPresentOrElse(
                n -> System.out.println("有值: " + n),
                () -> System.out.println("没有值"));

        System.out.println(empty.isEmpty());   // true
    }
}`, title: 'ConsumeDemo.java' },
      { out: '你好 Tom\n有值: Tom\n没有值\ntrue' },
      { p: 'ifPresent 常被用来做“有值就记一条日志”这类副作用，但要注意 lambda 里抛出的异常会直接传播到调用方，不会被 Optional 吞掉。如果这个副作用可能失败，比如写远程日志，应该在 lambda 内部自己 try/catch，否则主流程会被一个本可忽略的日志失败打断。同理，ifPresent 里不要放耗时操作，它执行在调用线程上，一个慢 IO 会拖住整条业务链路。' },
      { p: '注意 ifPresentOrElse 的第二个参数是 Runnable，不是 Supplier，所以它不产生值，只执行动作。如果你的“没值分支”需要返回一个默认对象，应该用 orElseGet，而不是在 Runnable 里给外部变量赋值。选 API 时先问自己：我要的是“做一个动作”，还是“得到一个值”？前者用 ifPresent 系列，后者用 orElse 系列。' },
      { note: '小技巧：调试时想看 Optional 里到底是什么，直接打印即可，toString 会输出 Optional[值] 或 Optional.empty。但不要把这个字符串写进接口返回或页面展示，它是调试格式而不是业务格式；需要展示时先用 orElse(“”) 取出值，再交给页面处理。' },
      { h: '2.7 组合：or、stream 与链式兜底' },
      { p: '现实中的“取值”经常有多个来源：先查缓存，缓存没有再查数据库，数据库没有再读默认配置。Java 9 的 or(Supplier&lt;Optional&gt;) 正好表达这种降级链：当前 Optional 为空时，调用 Supplier 得到下一个 Optional，如果还不为空就继续往下，直到某个来源有值。它比一串 orElseGet 嵌套更平铺，也更符合“逐个尝试”的语义。' },
      { p: '另一个有用的方法是 stream()：把 Optional 转成 0 或 1 个元素的流。这样就能把一批“可能失败的解析结果”放进同一条流里，用 flatMap 把空值过滤掉，最后 collect 出所有成功的结果。这个技巧在处理批量数据、批量解析时特别常用，比先 filter 再 map 少一次判空。' },
      { code: `import java.util.Optional;

public class CombineDemo {
    static Optional<String> fromDb() { return Optional.empty(); }
    static Optional<String> fromCache() { return Optional.of("cache-value"); }

    public static void main(String[] args) {
        String value = fromDb()
                .or(() -> fromCache())
                .orElse("default");
        System.out.println(value);            // cache-value

        Optional.of("Tom")
                .stream()
                .map(String::toUpperCase)
                .forEach(System.out::println); // TOM

        Optional<String> empty = Optional.empty();
        System.out.println(empty.stream().count());  // 0
    }
}`, title: 'CombineDemo.java' },
      { out: 'cache-value\nTOM\n0' },
      { flow: ['调用可能返回 Optional 的方法', 'map 转换，空则跳过', 'or 切换到备用来源', 'orElseGet 计算兜底值', '得到最终结果'] },
      { p: 'or 与 orElseGet 的区别经常被搞混：or 的参数必须返回 Optional，用于“换一个可能为空的来源”；orElseGet 的参数返回具体值，用于“确定性的兜底”。如果备用来源本身也可能失败，用 or 才能继续往下链；如果备用值是常量或简单计算，orElseGet 就够了。混用不会报错，但语义会变得含糊，读代码的人要额外确认这里到底是降级还是兜底。' },
      { p: 'or 的求值顺序值得留意：只有当当前 Optional 为空时，Supplier 才会被调用，所以把“便宜且命中率高”的来源放在前面，把“昂贵且命中率低”的放在后面，能省下不少无用查询。这条链可以任意长，但超过三层就该考虑封装成一个方法，或者干脆用策略模式，否则读代码的人要在脑子里模拟整条降级路径。' },
      { h: '2.8 八种常见反模式' },
      { list: [
        '<b>isPresent() 加 get()：</b>等于把 Optional 退化成 null 判断，直接 if (x != null) 更短，应该改用 orElse、map 或 ifPresent。',
        '<b>不判断就 get()：</b>空容器上抛 NoSuchElementException，和 NPE 没有本质区别。',
        '<b>把 Optional 当字段：</b>字段本身仍可能为 null（Optional 变量没赋值），等于多了一层空，且无法序列化。',
        '<b>把 Optional 当参数：</b>调用方仍然要构造 Optional，还得处理 null，不如重载方法或明确要求非空。',
        '<b>集合里放 Optional：</b>List&lt;Optional&lt;T&gt;&gt; 让每个元素都要拆一次，应该直接过滤掉空值。',
        '<b>orElse 里做耗时计算：</b>默认值总会被求值，应该换成 orElseGet。',
        '<b>用 Optional 包装集合：</b>“没有结果”用空集合表达更自然，返回 Optional&lt;List&gt; 只会让调用方多剥一层。',
        '<b>忘记 flatMap：</b>得到 Optional&lt;Optional&lt;T&gt;&gt; 后到处拆包，说明某一步应该用 flatMap。'
      ] },
      { p: '这份清单不是要你背下来，而是当你在代码里写下 isPresent() 时停下来问一句：我是不是在用 Optional 模拟 if？如果是，就该换成 map、orElse 或 ifPresent。反模式之所以叫反模式，不是因为写法丑，而是因为它让 Optional 的优点——链式、声明式、短路——全部失效，只剩下一个更啰嗦的 null 判断。' },
      { h: '2.9 实战：订单查询与兜底' },
      { p: '下面用一个订单查询的例子把常用方法串起来。需求是：按 id 查订单，取金额，金额为空或非正数时按 0 处理；查不到订单时返回 0；如果调用方认为“订单不存在”必须是错误，就抛自定义异常。这里同时出现了 map、filter、orElse、orElseThrow 四种手法。' },
      { code: `import java.util.*;

public class OptionalPractical {
    static class Order {
        final String id;
        final Integer amount;      // 允许为 null，表示金额未填
        Order(String id, Integer amount) { this.id = id; this.amount = amount; }
    }

    static Map<String, Order> db = new HashMap<>();
    static {
        db.put("A100", new Order("A100", 120));
        db.put("A200", new Order("A200", null));
    }

    static Optional<Order> find(String id) {
        return Optional.ofNullable(db.get(id));
    }

    public static void main(String[] args) {
        int amount = find("A100").map(o -> o.amount).filter(a -> a > 0).orElse(0);
        System.out.println(amount);            // 120

        int nullAmount = find("A200").map(o -> o.amount).orElse(-1);
        System.out.println(nullAmount);        // -1

        int missing = find("A999").map(o -> o.amount).orElse(0);
        System.out.println(missing);           // 0

        Order order = find("A100")
                .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        System.out.println(order.id);          // A100

        try {
            find("A999").orElseThrow(() -> new IllegalStateException("订单不存在: A999"));
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage()); // 订单不存在: A999
        }
    }
}`, title: 'OptionalPractical.java' },
      { out: '120\n-1\n0\nA100\n订单不存在: A999' },
      { p: '这段代码的分层很清楚：find 只负责“把 null 转成 Optional”，不掺杂业务判断；金额是否合法交给 filter；默认值策略交给调用方，因为不同调用方对“没填金额”的容忍度不同。如果把这些规则都塞进 find，方法就会变成“查订单顺便校验金额再决定默认值”的混合体，复用性很差。Optional 只是让这种分层写起来更顺，并不会自动帮你分层。' },
      { p: '第 20 行的 map 取 amount，A200 的 amount 是 null，map 返回 empty，filter 不会执行，orElse(-1) 得到 -1，这样就能区分“金额为 0”和“金额没填”。第 29 行的 orElseThrow 接收 Supplier，异常对象只在真正为空时才创建；如果写成 orElseThrow(new IllegalArgumentException(...)) 就编译不过，因为参数类型是 Supplier 而不是异常。' },
      { h: '2.10 在集合与流中的用法' },
      { p: '处理一批可能失败的操作时，Optional.stream() 非常好用。比如把字符串列表转成整数列表，非法字符串解析失败返回 empty，用 map 得到 Stream&lt;Optional&lt;Integer&gt;&gt;，再 flatMap(Optional::stream) 就把所有空值过滤掉，同时把有值的元素摊平。整个过程没有一次显式判空，也没有把异常当流程控制。' },
      { p: '另一个常见场景是 Map 取值。Map.get 在键不存在时返回 null，直接用可能 NPE；用 getOrDefault 只能处理“键不存在”，不能处理“键存在但值是 null”。稳妥的写法是 Optional.ofNullable(map.get(key)).orElse(defaultValue)，它同时覆盖两种情况。如果“键存在但值为 null”有特殊语义，就应该用 containsKey 单独判断。' },
      { code: `import java.util.*;
import java.util.stream.*;

public class OptionalInStream {
    static Optional<Integer> parse(String s) {
        try {
            return Optional.of(Integer.parseInt(s));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public static void main(String[] args) {
        List<String> raw = List.of("1", "x", "3", "y", "5");

        List<Integer> nums = raw.stream()
                .map(OptionalInStream::parse)
                .flatMap(Optional::stream)
                .collect(Collectors.toList());
        System.out.println(nums);              // [1, 3, 5]

        Map<String, Integer> index = new HashMap<>();
        index.put("a", 1);
        int v = Optional.ofNullable(index.get("b")).orElse(0);
        System.out.println(v);                 // 0
    }
}`, title: 'OptionalInStream.java' },
      { out: '[1, 3, 5]\n0' },
      { p: '另外提醒一个容易踩的坑：Collectors.toMap 在值为 null 时会抛 NPE，很多人第一反应是用 Optional 包装值来绕过，结果得到 Map&lt;K, Optional&lt;V&gt;&gt;，后续取值更麻烦。正确做法是换成 HashMap 手动 put，或者先用 Stream 过滤掉空值。Optional 不是用来修补集合框架的 null 限制的，遇到这类问题应该换工具，而不是再加一层容器。' },
      { h: '2.11 本章小结' },
      { list: [
        'Optional 是“最多一个元素”的容器，用来在返回值上表达“可能没有”。',
        'of 要求非空，ofNullable 接受 null，empty 表示明确没有。',
        '取值优先用 orElse、orElseGet、orElseThrow；默认值需要计算时用 orElseGet。',
        'map 负责转换，flatMap 避免嵌套，filter 把不满足条件的值变成空。',
        'Optional 不适合做字段、参数、集合元素，也不支持序列化。'
      ] },
      { h: '2.12 常见追问' },
      { list: [
        '<b>Optional 能完全替代 null 吗？</b>不能，它只适合返回值；字段、参数、数组元素仍然用 null 或空集合表达。',
        '<b>orElse 和 orElseGet 差在哪？</b>前者参数立即求值，后者只在需要时调用 Supplier，耗时操作必须用后者。',
        '<b>为什么 get() 不推荐？</b>空时抛 NoSuchElementException，等于放弃 Optional 提供的类型信息。',
        '<b>Optional 为什么不能序列化？</b>设计者认为它不该出现在长期存储或网络传输的结构里，避免版本与兼容问题。',
        '<b>Optional.ofNullable 和 Optional.of 怎么选？</b>值一定非空用 of，来路不明用 ofNullable，明确没有用 empty。',
        '<b>Optional 有性能问题吗？</b>每次创建多一个对象，普通业务可忽略，超热路径应改用 null 或基本类型。'
      ] },
      { h: '2.13 自测与练习' },
      { p: '下面的练习建议都在本地跑一遍，尤其是第 3 题，亲眼看到两个异常的类名和消息，比背文档印象深得多。做完之后再回头看本章的小结，应该能用自己的话解释每一条，而不是只记住方法名。' },
      { ol: [
        '写一个方法按学号查学生，找不到返回 Optional.empty()，调用方分别用 orElse 和 orElseThrow 处理。',
        '把一段三层嵌套的 if (a != null) 改写成 map 链，并说明哪一步必须用 flatMap。',
        '故意写 Optional.of(null) 和 empty.get()，记录两个异常的完整类名与消息。',
        '用 Optional.stream() 过滤一批字符串中的非法数字，只保留能解析的整数。',
        '解释为什么 Optional 不适合做实体字段，并举出一个会报错的场景。',
        '比较 orElse 与 orElseGet 在“默认值来自数据库”时的行为差异，写出测试代码验证。'
      ] }
    ]
  };

  T['io-streams'] = {
    meta: '本章约 10500 字 · 建议 55 分钟 · 15 节 · 6 段代码 · 3 张表',
    blocks: [
      { h: '3.1 两种分法，以及二进制还是文本' },
      { p: '流的分类有两个正交的维度。按数据单位分，字节流处理 byte，字符流处理 char；按方向分，输入流把数据从外部读进程序，输出流把数据从程序写到外部。“输入输出”永远以程序为中心：从文件读是输入，写到文件是输出，哪怕站在用户角度看方向正好相反。' },
      { p: '字节流是万能的，任何数据都能按字节处理：文本、图片、压缩包、网络包。字符流只适合文本，而且必须知道编码，否则解码就会出错。判断该用哪种，先问“这份数据是给人看的文本吗”：是文本且需要按行、按字符处理，用字符流；是二进制或格式不确定，用字节流。' },
      { p: '还有第三个维度常被忽略：节点流与处理流。节点流直接连到数据源，比如 FileInputStream、ByteArrayInputStream；处理流套在另一个流外面增强功能，比如 BufferedInputStream 加缓冲、InputStreamReader 做编码转换、DataInputStream 读写基本类型。处理流可以层层嵌套，这是 Java IO 最核心的设计，后面 3.10 节会专门讲。' },
      { p: '二进制数据必须用字节流。图片、音频、zip、class 文件、序列化后的对象，都没有“字符”的概念，用字符流读写会在编码转换时损坏字节——某个字节序列恰好不是合法 UTF-8 时，解码器会替换成 U+FFFD，再编码回去就永远还原不了。这类损坏往往肉眼看不出来，直到文件打不开才被发现。' },
      { p: '文本数据用字符流，但要注意 BOM。Windows 记事本保存 UTF-8 时可能加一个 EF BB BF 的字节序标记，Java 用 UTF-8 读取时不会自动去掉它，第一行开头会多一个不可见字符，导致解析 JSON 或 CSV 时第一列对不上。处理办法是显式剥离这 3 个字节，或者要求上游保存为无 BOM 格式。' },
      { list: [
        '纯文本、需要按行或按字符处理：字符流，并显式指定 Charset。',
        '图片、音视频、压缩包、协议包：字节流，永远不要用 Reader/Writer。',
        '需要从文件中间跳着读：RandomAccessFile，或者 NIO 的 FileChannel。',
        '文件很大：一定要加缓冲流，避免一次性读进内存。',
        '网络通信：底层是字节流，文本协议在字节流之上自己解码。'
      ] },
      { h: '3.2 为什么学 IO 流' },
      { p: '只要程序需要和外部世界交换数据，就会遇到流：读一个配置文件、把日志写到磁盘、从网络接收一段 JSON、把用户上传的图片存下来。Java 把这些操作统一抽象成“流”（stream）。注意这里的流和上一章的 Stream API 完全不是一回事：前者是字节或字符的传输通道，后者是集合的声明式处理，名字相同但毫无关系，初学时务必分开记忆。' },
      { p: 'Java 的 IO 流分两代。第一代是 Java 1.0 就有的字节流，以 InputStream 和 OutputStream 为根，一次读写一个字节或一个字节数组；第二代是 Java 1.1 增加的字符流，以 Reader 和 Writer 为根，一次读写一个 char。字符流并不是独立的数据通道，它的底层仍然是字节流，只是在外面套了一层编码转换：字节进来，按指定字符集解码成 char；char 出去，按字符集编码成字节。' },
      { p: '本章先讲清楚字节流与字符流的区别、read 的返回值约定、编码与乱码的成因，再讲关闭资源的正确姿势。这些内容看起来琐碎，却是后面缓冲流、NIO、序列化的地基；地基没打牢，遇到乱码和“文件少了一段”这类问题时，就只能靠猜和试。' },
      { h: '3.3 InputStream 与 OutputStream' },
      { p: 'InputStream 是所有字节输入流的父类，它只声明了一个抽象方法 read()，其余方法都基于它实现。read() 从流中读一个字节，返回 0 到 255 的 int；如果已经到末尾，返回 -1。返回 int 而不是 byte，正是为了用 -1 表示结束——byte 的取值范围是 -128 到 127，没有多余的值可以当哨兵。' },
      { p: 'read(byte[] buf) 一次读一批，返回实际读到的字节数，到末尾返回 -1。注意返回值可能小于 buf.length，这不算错误：网络流、管道流经常一次只给一部分数据。所以循环条件必须写成 while ((n = in.read(buf)) != -1)，写入时用 out.write(buf, 0, n)，只写真正读到的那一段。如果写成 out.write(buf)，缓冲区尾部的残留数据会被重复写出去，文件就会莫名其妙变大。' },
      { code: `import java.io.*;

public class FileCopyBytes {
    public static void main(String[] args) throws IOException {
        try (InputStream in = new FileInputStream("input.txt");
             OutputStream out = new FileOutputStream("output.txt")) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
        }
        System.out.println("复制完成");
    }
}`, title: 'FileCopyBytes.java' },
      { out: '复制完成' },
      { p: '运行前需要在项目目录准备一个 input.txt，内容随意；执行后同目录会出现 output.txt，内容和它完全一致，二进制文件同样适用。第 5、6 行用 try-with-resources 声明两个流，块结束时按声明的逆序自动关闭，这是下一章的重点，这里先照抄。第 9 行把读到的字节数暂存到 n，第 10 行判断是否到末尾，第 11 行只写 0 到 n-1 这段有效数据。缓冲区 8192 是经验值，太小系统调用多，太大浪费内存，8KB 到 64KB 都常见。' },
      { h: '3.4 read 的返回值与缓冲区陷阱' },
      { p: '单字节 read() 每次都要触发一次系统调用，复制一个 1MB 的文件要调用上百万次，慢得离谱。所以真实代码几乎总是用数组批量读写。但批量读写会带来两个新问题：一是最后一次读到的数据可能不满一个缓冲区，二是字符流按 char 数组读时，可能把多字节字符从中间截断。前者靠 write(buf, 0, n) 解决，后者要靠字符流内部的解码器处理。' },
      { p: '还有一个细节：read(byte[]) 在某些实现里会尽量读满，但绝不保证。文件流通常一次填满缓冲区，网络流可能只填几个字节就返回。依赖“一次读满”的代码在本地跑得好好的，一上线就出问题。判断是否读完只能看返回值是不是 -1，不能看它是否小于缓冲区长度——小于只说明“这次读得少”，不代表结束。' },
      { p: 'OutputStream 的 write(int b) 只写低 8 位，传入 300 会写成 44，因为 300 的二进制是 1 0010 1100，低 8 位是 0010 1100。这不是 bug，而是“按字节写”的语义决定的：int 参数只是为了复用 -1 之外的取值范围，真正写出去的仍然只有一个字节。写文本时如果误用 write(int) 写字符，中文会被截断成乱码，这是新手常见的翻车点。' },
      { note: '流的方法大多抛 IOException，而且它是受检异常，必须 try/catch 或在方法签名上 throws。read 返回 -1 表示正常结束，不是错误；抛 IOException 才是错误。把 -1 当异常处理、或把异常当结束处理，都会导致死循环或数据截断。' },
      { p: 'available() 常被误用成“还剩多少字节”。它返回的是“在不阻塞的情况下能读到的字节数”，对文件流通常等于剩余长度，对网络流则可能返回 0，哪怕后面还有数据。所以不要用 while (in.available() > 0) 来判断读完，那会在网络场景下提前退出，而且这个 bug 在本机测试时往往复现不了。判断结束的唯一可靠依据是 read 返回 -1。' },
      { h: '3.5 Reader 与 Writer' },
      { p: 'Reader 和 Writer 的结构与字节流一一对应：read() 返回 0 到 65535 的 int（一个 char 的码点），到末尾返回 -1；write(int c) 写一个字符。区别在于字符流内部持有解码器与编码器，会把字节序列还原成字符，所以读中文时不会出现“半个字”。' },
      { p: '但字符流不会自动知道文件用什么编码。FileReader 和 FileWriter 用的是平台默认编码：Windows 中文系统通常是 GBK，Linux 和 macOS 通常是 UTF-8。同一份 UTF-8 文件在 Windows 上读出来就是乱码。所以只要涉及中文，就不要直接用 FileReader，而要用 InputStreamReader 显式指定字符集。' },
      { code: `import java.io.*;
import java.nio.charset.StandardCharsets;

public class ReadChars {
    public static void main(String[] args) throws IOException {
        Reader reader = new InputStreamReader(
                new FileInputStream("note.txt"), StandardCharsets.UTF_8);
        char[] buf = new char[1024];
        int n;
        while ((n = reader.read(buf)) != -1) {
            System.out.print(new String(buf, 0, n));
        }
        reader.close();
    }
}`, title: 'ReadChars.java' },
      { out: '你好，世界' },
      { p: '假设 note.txt 里只有一行“你好，世界”，程序会原样打印出来。第 5 到 7 行是典型的“三明治”结构：最里面是 FileInputStream 负责读字节，中间 InputStreamReader 负责按 UTF-8 解码，最外面用 Reader 接口接收。第 10 行读一批 char，第 11 行用 new String(buf, 0, n) 只取有效部分。你不需要自己处理“半个汉字”，解码器会把不完整的字节留在内部缓冲，等下一次读取补齐。' },
      { h: '3.6 字符编码：ASCII、GBK 与 UTF-8' },
      { p: '按行读取是文本处理最常见的需求，BufferedReader.readLine() 一次返回一行，不含行尾的换行符，读到末尾返回 null——注意是 null 而不是 -1，这是字符流里少数用 null 表示结束的 API。Scanner 的 hasNextLine 与 nextLine 也能按行读，但它内部做了更多分词与解析，速度比 BufferedReader 慢，大文件优先用后者。' },
      { p: '计算机只存字节，字符是“字节加上编码规则”解释出来的结果。同一串字节，用不同编码解释，会得到完全不同的字符。ASCII 用 7 位表示 128 个字符，只够英文；GBK 用两个字节表示一个汉字，覆盖两万多个汉字；UTF-8 是变长编码，英文 1 字节、汉字通常 3 字节、生僻字和 emoji 4 字节。' },
      { p: 'Java 的 char 是 UTF-16 码元，占 2 字节。String 内部存储经过多轮优化，Java 9 之后用 byte[] 加一个编码标记实现紧凑字符串，但对外表现仍是 UTF-16 语义。这意味着 length() 返回的是 char 个数，不是“用户感知的字符数”：一个 emoji 可能占两个 char，length 返回 2。做字数统计、按长度截断时特别容易在这里翻车。' },
      { table: { head: ['编码', '“中”占几字节', '特点'], rows: [
        ['ASCII', '不支持', '7 位，仅英文与常见符号'],
        ['ISO-8859-1', '不支持', '单字节，常被误用为“二进制安全”'],
        ['GBK', '2 字节', '兼容 GB2312，Windows 中文默认'],
        ['UTF-8', '3 字节', '变长 1~4 字节，兼容 ASCII'],
        ['UTF-16', '2 字节', 'Java 的 char 语义，带字节序问题']
      ] } },
      { p: '所以“一个汉字两个字节”这句话只在 GBK 下成立。UTF-8 下汉字通常 3 字节，UTF-16 下 2 字节。写代码时不要假设字节数，需要精确长度就用 s.getBytes(charset).length 明确指定编码去算，而不是用 s.length() 或想当然的乘以 2。' },
      { p: 'UTF-16 还有一个坑：码点超过 U+FFFF 的字符，比如很多 emoji 和部分生僻汉字，在 UTF-16 里要用两个 char 表示，称为代理对。这时 char 的个数比用户看到的字符数多 1，length() 也会多 1。要按“用户感知的字符”遍历，应该用 s.codePoints() 而不是 charAt 循环，否则可能把一个 emoji 劈成两半，拼出非法字符串。' },
      { h: '3.7 乱码的三种成因' },
      { p: '乱码的本质只有一句话：写入时用的编码和读取时用的编码不一致，或者数据在传输中被截断。常见表现有三种。中文变成问号，说明目标编码不支持这些字符，比如用 ASCII 或 ISO-8859-1 编码中文，无法表示的字符被替换成 ?。中文变成一堆莫名其妙的汉字，说明字节被另一种编码“错误地但合法地”解释了。中文变成黑色菱形问号或方块，说明解码时遇到了非法字节序列，被替换成 U+FFFD。' },
      { p: '第三种最容易被忽略：文件其实是好的，只是被按字节截断了。比如用 read(byte[]) 读 UTF-8 文件，缓冲区边界正好切在一个 3 字节汉字的中间，前半段被解码成替换字符；如果用字符流，解码器会把残缺字节留到下一次，问题就不存在。这就是“文本用字符流”最硬的理由。' },
      { code: `import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class EncodingDemo {
    public static void main(String[] args) throws Exception {
        String s = "中文";
        byte[] utf8 = s.getBytes(StandardCharsets.UTF_8);
        byte[] gbk = s.getBytes("GBK");

        System.out.println(utf8.length);                     // 6
        System.out.println(gbk.length);                      // 4
        System.out.println(Arrays.toString(utf8));

        System.out.println(new String(utf8, StandardCharsets.UTF_8).equals(s));
        System.out.println(new String(utf8, "GBK").equals(s));
    }
}`, title: 'EncodingDemo.java' },
      { out: '6\n4\n[-28, -72, -83, -26, -106, -121]\ntrue\nfalse' },
      { p: '第 6 行拿到 UTF-8 字节，6 个字节对应两个汉字，每个 3 字节；第 7 行拿到 GBK 字节，4 个字节，每个汉字 2 字节。第 10 行把字节数组原样打印出来，能看到负数——因为 Java 的 byte 是有符号的，228 存进去就显示成 -28，232 显示成 -26。第 12 行用同样的 UTF-8 解码，还原成功返回 true；第 13 行用 GBK 解码同一串字节，得到的字符串和原串不相等，这就是乱码的由来。' },
      { h: '3.8 正确指定编码的姿势' },
      { p: '避免乱码的唯一可靠办法是：每一次编码和解码都显式指定字符集，并且两端一致。Java 提供了 StandardCharsets.UTF_8 这类常量，比字符串 "UTF-8" 更安全——拼错字符串要到运行时才报 UnsupportedEncodingException，用常量则编译期就能发现。' },
      { p: '需要特别注意几个隐式使用默认编码的 API：new String(byte[])、String.getBytes()、FileReader、FileWriter、PrintWriter(File)、Scanner(File)。它们的行为随运行环境的 file.encoding 变化，同一份代码在开发机和服务器上可能表现不同。新代码里应该全部换成带 Charset 参数的重载。' },
      { code: `import java.io.*;
import java.nio.charset.StandardCharsets;

public class WriteTextDemo {
    public static void main(String[] args) throws IOException {
        try (Writer w = new OutputStreamWriter(
                new FileOutputStream("hello.txt"), StandardCharsets.UTF_8)) {
            w.write("你好，流\\n");
            w.write("第二行\\n");
        }
        try (Reader r = new InputStreamReader(
                new FileInputStream("hello.txt"), StandardCharsets.UTF_8)) {
            char[] buf = new char[100];
            int n = r.read(buf);
            System.out.println(new String(buf, 0, n).trim());
        }
        System.out.println(new File("hello.txt").length());
    }
}`, title: 'WriteTextDemo.java' },
      { out: '你好，流\n第二行\n23' },
      { p: '第 6 到 9 行用 try-with-resources 写文件，块结束时自动关闭；关闭 Writer 会先 flush 再关底层流。第 10 到 15 行用同样的 UTF-8 读回来，第 14 行的 trim() 去掉末尾换行，所以打印出来是两行。第 17 行的 23 是文件的字节数：两行一共 9 个字符，其中 7 个是汉字或中文标点、各占 3 字节，2 个换行各占 1 字节，合计 7×3 + 2×1 = 23。字符数 9 与字节数 23 不相等，这正是编码存在的意义。' },
      { note: '第 13 行只调用了一次 read，就拿到了全部 9 个字符，因为容量 100 的 char 数组一次装得下。如果文件更大，就要用 while 循环反复读，每次只处理下标 0 到 n-1 这段有效数据，其余位置可能是上一轮残留的旧字符。' },
      { h: '3.9 close、flush 与 finally' },
      { p: '流持有文件句柄、网络连接、内存缓冲区，不关闭就会泄漏。文件句柄是有限资源，Linux 默认单进程 1024 个，泄漏几百次就会报 Too many open files，而且报错位置往往离真正的泄漏点很远。写缓冲不 flush，数据可能只停在内存里，进程崩溃就丢了。close() 的语义是：先 flush 缓冲，再释放底层资源，并且可以重复调用。' },
      { p: 'Java 7 之前只能写 try/finally，代码又长又容易漏。注意 finally 里的 close 本身也会抛 IOException，必须再包一层 try/catch，否则这个新异常会掩盖 try 块里真正的异常。下面这段代码是那个年代的标配写法，虽然啰嗦，但能看清“关闭”到底要处理哪些情况。' },
      { code: `import java.io.*;

public class CloseDemo {
    public static void main(String[] args) {
        InputStream in = null;
        try {
            in = new ByteArrayInputStream(new byte[]{65, 66, 67});
            int b;
            while ((b = in.read()) != -1) {
                System.out.print((char) b);
            }
            System.out.println();
        } catch (IOException e) {
            System.out.println("读取失败: " + e.getMessage());
        } finally {
            if (in != null) {
                try {
                    in.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}`, title: 'CloseDemo.java' },
      { out: 'ABC' },
      { p: '第 6 行把 in 声明在 try 外面，因为 finally 里还要访问它；第 7 行打开流，如果这一步就失败，in 仍然是 null，第 20 行的判空就是为这种情况准备的。如果 finally 里不判空直接 close，会抛 NPE，把真正的 IOException 盖掉，这就是“异常掩盖异常”，排查线上问题时最头疼的情况之一。第 23 行再包一层 try/catch，是因为 close 也可能失败，而它失败时不应该影响方法的正常返回。' },
      { p: 'Java 7 引入 try-with-resources 之后，上面这一大段 finally 可以压缩成一行声明。它的额外好处是“抑制异常”：如果 try 块抛了异常、close 也抛了异常，主异常会保留，close 的异常挂到它的 suppressed 列表里，不会被悄悄吞掉。下一章会把这条机制讲透，这里只需要先建立一个印象：新代码不要再用 finally 关流，手写的方式漏一个分支就泄漏一个句柄。' },
      { h: '3.10 装饰器模式与嵌套顺序' },
      { p: 'Java IO 的类数量多得吓人，但结构其实很简单：节点流负责“连到数据源”，处理流负责“加功能”，用嵌套组合出各种能力。FileInputStream 提供字节，BufferedInputStream 加缓冲，InputStreamReader 加解码，BufferedReader 加按行读取，四层套起来就是一个能高效按行读 UTF-8 文本的管道。' },
      { p: '这种设计叫装饰器模式：每个处理流都实现同一套接口，持有被装饰的流，在转发调用前后插入自己的逻辑。好处是功能可以任意组合，坏处是嵌套层次多了以后括号很难读，而且关闭顺序有讲究——关闭外层会连带关闭内层，所以只需要关最外层；如果手动逐个关闭，重复关闭虽然安全，但顺序错了可能抛异常。' },
      { p: '嵌套顺序也不是随便排的。解码流必须紧贴字节流，缓冲流应该在最外层，否则缓冲的是解码后的 char，起不到减少系统调用的作用；反过来把 InputStreamReader 套在 BufferedReader 外面通常也编译不过，因为类型对不上。记住一条固定套路：从内到外依次是“字节来源、编码转换、缓冲与按行读取”，关闭时由外向内自动完成。' },
      { code: `import java.io.*;
import java.nio.charset.StandardCharsets;

public class StreamChainDemo {
    public static void main(String[] args) throws IOException {
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        Writer writer = new BufferedWriter(
                new OutputStreamWriter(raw, StandardCharsets.UTF_8));
        writer.write("第一行\\n第二行\\n");
        writer.close();

        byte[] bytes = raw.toByteArray();
        System.out.println(bytes.length);

        Reader reader = new BufferedReader(
                new InputStreamReader(new ByteArrayInputStream(bytes),
                        StandardCharsets.UTF_8));
        int first = reader.read();
        System.out.println(first);
        reader.close();
    }
}`, title: 'StreamChainDemo.java' },
      { out: '20\n31532' },
      { p: '第 6 到 9 行构造了一条写管道：ByteArrayOutputStream 是目的地，OutputStreamWriter 负责把 char 编码成 UTF-8 字节，BufferedWriter 负责攒够一批再往下写。第 10 行只关闭最外层的 writer，它会先 flush 缓冲，再关闭 OutputStreamWriter，最后关闭 ByteArrayOutputStream。第 13 行取出的字节数组长度是 20：6 个汉字各 3 字节，加两个换行。第 15 行读管道同理，第 19 行读到的 31532 是“第”的 Unicode 码点（U+7B2C）。' },
      { flow: ['打开最底层的节点流（文件、数组、网络）', '套上转换流，显式指定字符集', '套上缓冲流，减少系统调用', '读写数据', '只关闭最外层，内层会被逐层关闭'] },
      { h: '3.11 常见错误与排查' },
      { p: 'IO 的错误大多有明确的现象，从现象倒推原因比盲目试编码有效得多。下面这张表覆盖了初学者最常遇到的六种情况，遇到问题时先对号入座，再动手改代码。' },
      { table: { head: ['现象', '常见原因', '排查方向'], rows: [
        ['中文全变成问号', '写出时编码不支持中文', '检查是否用了 ASCII 或 ISO-8859-1'],
        ['中文变成莫名其妙的汉字', '读写两侧编码不一致', '让两端都用同一个 Charset'],
        ['首行开头多出奇怪字符', '文件带 UTF-8 BOM', '用工具确认并剥离 EF BB BF'],
        ['复制出的文件比原文件大', '写的时候写了整个缓冲区', '改成 write(buf, 0, n)'],
        ['Too many open files', '流没有关闭', '检查每条路径是否都 close'],
        ['读到的内容少了一截', '没 flush 就退出，或提前 break', '关闭流，检查循环条件']
      ] } },
      { p: '还有一个高频问题：文件路径。相对路径是相对于“进程的工作目录”，不是相对于 .java 文件所在目录。在 IDE 里运行和在命令行运行，工作目录可能不同，同一个相对路径就找不到文件。排查时先打印 new File("x.txt").getAbsolutePath()，看清程序到底在哪个目录找文件，比反复改路径有效。' },
      { p: '并发写同一个文件也是常见事故。两个线程各自 new FileOutputStream("log.txt") 并写入，内容会互相覆盖，因为每次打开默认都把文件截断为 0 字节。需要追加时用 new FileOutputStream("log.txt", true)；需要多进程安全追加，单靠这个构造器还不够，还要考虑操作系统的原子追加语义，或者干脆改用成熟的日志框架。' },
      { h: '3.12 本章小结' },
      { list: [
        '字节流处理 byte，字符流处理 char；字符流 = 字节流 + 编解码。',
        'read 返回 -1 表示结束，批量读要用 write(buf, 0, n) 只写有效部分。',
        '编码必须两端一致且显式指定，优先用 StandardCharsets 常量。',
        '文本用字符流，二进制用字节流，混用会损坏数据。',
        '流必须关闭，关闭会先 flush；Java 7 之后优先用 try-with-resources。'
      ] },
      { h: '3.13 常见追问' },
      { list: [
        '<b>字节流和字符流能互相转换吗？</b>能，InputStreamReader 把字节流转成字符流，OutputStreamWriter 反过来。',
        '<b>为什么 read() 返回 int 而不是 byte？</b>需要用 -1 表示流结束，byte 的取值范围不够。',
        '<b>FileReader 为什么容易乱码？</b>它用平台默认编码，跨环境不一致，应改用 InputStreamReader 指定字符集。',
        '<b>flush 和 close 有什么区别？</b>flush 只把缓冲推下去，流还能继续用；close 刷完并释放资源，之后不能再写。',
        '<b>关闭外层流，内层会自动关吗？</b>会，处理流的 close 会转发给被包装的流，所以只需要关最外层。',
        '<b>复制图片能用字符流吗？</b>不能，编码转换会破坏字节，必须用字节流。'
      ] },
      { h: '3.14 自测与练习' },
      { p: '这一章的练习都围绕“亲手看到字节和字符的差别”展开，建议每道题都真的跑一遍，观察输出和文件大小，比读十遍概念管用。' },
      { ol: [
        '用字节流把一个 txt 文件复制一份，再用字符流复制一份，比较两个副本的大小是否与原文件一致。',
        '把“中文”分别用 UTF-8 和 GBK 编码，打印字节数组，解释为什么长度不同。',
        '故意把 write(buf, 0, n) 改成 write(buf)，复制一个非整缓冲区大小的文件，观察副本末尾多出了什么。',
        '写一段代码，用 GBK 读取一个 UTF-8 文件，再从现象反推是哪种乱码。',
        '用 CloseDemo 的写法改写 FileCopyBytes，去掉 try-with-resources，体会代码长了多少。',
        '解释为什么 InputStream.read() 返回 -1 而不是抛异常表示结束，这样设计有什么好处。'
      ] }
    ]
  };

  T['buffered'] = {
    meta: '本章约 9600 字 · 建议 50 分钟 · 14 节 · 5 段代码 · 2 张表',
    blocks: [
      { h: '4.1 为什么需要缓冲流：系统调用的开销' },
      { p: '上一章的代码已经能读写文件了，但离“能用”还差两步。第一步是性能：每读一个字节就触发一次系统调用，复制稍大的文件就要几秒甚至几十秒。第二步是安全：手写 finally 关流又长又容易漏，漏一个分支就泄漏一个文件句柄。缓冲流和 try-with-resources 分别解决这两个问题，它们几乎是所有真实 Java 代码的标配。' },
      { p: '这两个主题放在一章，是因为它们经常一起出现：你几乎不会单独使用 FileInputStream，而是把它包进 BufferedInputStream，再放进 try-with-resources 的括号里。理解缓冲的工作方式，才能解释“为什么我写了数据但文件是空的”；理解自动关闭的机制，才能在资源关闭失败时看懂 suppressed 异常。' },
      { p: '本章还会顺带讲清楚几个高频困惑：flush 和 close 到底差在哪、多个资源按什么顺序关闭、为什么在 try 里 return 一个流会出问题。这些细节在面试和排错时都很常见。' },
      { p: '你其实早就在用这两个东西了。Spring 的 Resource 抽象、MyBatis 读取 mapper 文件、日志框架写 appender，内部都在套缓冲流；JDK 自己的 Files.newBufferedReader 直接就把缓冲和字符解码一起做好了。理解它们的原理，不是为了手写一套工具类，而是为了在性能异常或数据丢失时，知道该往哪个方向查。' },
      { p: '程序读文件，最终要调用操作系统的 read 系统调用。每次调用都要从用户态切换到内核态，内核还要定位文件块、把数据从磁盘或页缓存拷到用户缓冲区。这个切换和拷贝的固定开销，远大于传输一个字节本身。读 1MB 文件、每次读 1 字节，就是一百万次系统调用，大部分时间花在切换上。' },
      { p: '缓冲流的思路很朴素：一次向系统要一大块（默认 8192 字节），放进内存里的数组，之后程序每次 read() 都从这个数组里取，取完了再向系统要下一块。这样系统调用次数从“字节数”降到“字节数除以缓冲区大小”，减少了三个数量级。写方向同理：先写进内存数组，攒满一块再一次性提交。' },
      { p: '所以缓冲流并没有让磁盘变快，它只是把“很多次小操作”合并成“少数几次大操作”。对于固态硬盘，提升可能只有几倍；对于机械硬盘或网络文件系统，提升常常是几十倍。这个道理对所有 IO 都成立：批量永远比逐个小操作快，数据库的批量插入、网络的攒包发送，都是同一个思路。' },
      { p: '有人会问：既然缓冲就是数组，为什么不自己写一个 byte[] 循环？可以，很多老代码就是这么干的。但自己写要处理“最后一次读不满”“数组越界”“异常时仍要关闭”这些细节，还容易忘记 write(buf, 0, n)。缓冲流把这些都封装好了，内部拷贝也经过优化。除非有非常特殊的性能需求，否则没有理由自己造。' },
      { p: '还要区分“缓冲”和“缓存”。缓冲（buffer）是为了合并小操作，数据通常只经过一次；缓存（cache）是为了复用，数据会被反复读取。BufferedInputStream 是缓冲，它不判断你读过的内容下次还会不会读，读完即丢。操作系统还有一层页缓存，会把读过的文件块留在内存里，所以第二次读同一个文件往往快得多——这也是性能测试必须用新文件或清缓存的原因。' },
      { table: { head: ['指标', '无缓冲', '8KB 缓冲'], rows: [
        ['读 1MB 的系统调用次数', '约 100 万次', '约 128 次'],
        ['主要开销', '内核态切换与拷贝', '一次内存拷贝'],
        ['小文件读取', '差别不大', '略快，但优势不明显'],
        ['大文件顺序读', '明显慢', '通常快一个数量级'],
        ['内存占用', '几乎为零', '每个流约 8KB']
      ] } },
      { h: '4.2 BufferedInputStream 与 BufferedOutputStream' },
      { p: '这两个类的用法和普通字节流完全一样，因为它们继承自 FilterInputStream 与 FilterOutputStream，只是重写了 read 和 write。构造时把底层流传进去即可，第二个参数可以指定缓冲区大小；不指定就用默认的 8192 字节。缓冲区不是越大越好：超过几十 KB 后收益递减，还会占用堆内存，64KB 已经能覆盖绝大多数场景。' },
      { p: '有一个细节值得注意：BufferedInputStream 的 read(byte[] b, int off, int len) 如果请求的长度不超过缓冲区剩余数据，会直接从内存数组拷贝，一次系统调用都不发生；如果请求长度更大，它会先把缓冲区里剩下的给你，再绕过缓冲区直接从底层流读，避免多一次拷贝。这些优化对你透明，但能解释“为什么加了缓冲之后快这么多”。' },
      { code: `import java.io.*;

public class CopyWithBuffer {
    public static void main(String[] args) throws IOException {
        long start = System.currentTimeMillis();
        try (InputStream in = new BufferedInputStream(
                     new FileInputStream("big.bin"), 64 * 1024);
             OutputStream out = new BufferedOutputStream(
                     new FileOutputStream("big-copy.bin"), 64 * 1024)) {
            int b;
            while ((b = in.read()) != -1) {   // 逐个字节读，几乎不触发系统调用
                out.write(b);
            }
        }
        System.out.println("耗时 " + (System.currentTimeMillis() - start) + " ms");
    }
}`, title: 'CopyWithBuffer.java' },
      { out: '耗时 18 ms（具体数值随机器与文件大小变化）' },
      { p: '注意这里仍然是一个字节一个字节地读写，但速度并不慢，因为每次 read() 都只是在内存数组里移动下标。真正与磁盘打交道的，是缓冲区耗尽时的那次批量读取。第 6、7 行的 64 * 1024 把缓冲区设为 64KB；第 11 行的循环写法与上一章完全一致，说明缓冲流是透明的增强，不改变调用方式。' },
      { p: '运行前先准备一个几 MB 的 big.bin，随便什么内容都行，否则第一行就会抛 FileNotFoundException。计时结果只用来对比“有缓冲”和“无缓冲”的数量级差别，绝对值随机器和文件大小变化，不要拿它当性能承诺。' },
      { p: '这两个类都继承自 FilterInputStream 和 FilterOutputStream，属于“处理流”。它们不改变数据的含义，只改变传输方式，所以可以套在任意字节流外面：文件、内存数组、网络套接字都行。这也解释了为什么 Java IO 的类这么多却不用记：记住“节点流提供数据，处理流增强能力”这一条，剩下的靠组合。' },
      { h: '4.3 flush 的时机与数据丢失' },
      { p: 'BufferedOutputStream 把数据攒在内存里，什么时候真正写出去？三种情况：缓冲区满了、调用了 flush()、调用了 close()。这意味着程序正常结束前如果没有 flush 也没有 close，最后不满一块的数据就会留在内存里，随进程一起消失。文件看起来“写成功了”，打开却是空的或者少一截，这类 bug 在只写几行日志时特别容易出现。' },
      { p: 'close() 内部会先 flush 再释放资源，所以只要正确关闭就不会丢数据。但在交互式场景里，比如写一个命令行工具的进度输出，你需要让用户立刻看到内容，就必须在每次输出后手动 flush。反之，在批量写大文件时频繁 flush 会让缓冲失去意义，每次 flush 都可能触发一次系统调用。' },
      { p: '另一个常见现象是“文件末尾多出一些乱码或半个字”。这通常是写入时按字节截断了多字节字符，或者关闭顺序不对，导致编码器里残留的字节没有被刷出去。排查时先看文件的实际字节数和预期是否一致，再怀疑编码；如果字节数对得上但内容不对，问题一定在编码；如果字节数本身就少，问题在 flush 或关闭。' },
      { p: '这里有一个必须澄清的误解：flush 只保证数据从 Java 的缓冲区交给操作系统，不保证已经落到磁盘。操作系统还有页缓存，真正写盘可能延迟几秒甚至几十秒。如果要求掉电也不丢，需要在 flush 之后调用 FileChannel.force(true) 或 FileDescriptor.sync()，代价是每次都要等磁盘确认，吞吐会明显下降。绝大多数业务不需要这个级别的保证，知道有这回事即可。' },
      { note: '记住一条判断标准：数据要给“别人”立刻看到（另一个进程、终端、网络对端），就 flush；数据只是自己稍后要读，交给 close 就行。缓冲流的 flush 会逐层向下传递，调用最外层的 flush 就够了。' },
      { h: '4.4 BufferedReader 与 BufferedWriter' },
      { p: '字符流的缓冲版本是 BufferedReader 和 BufferedWriter。BufferedReader 最有价值的方法是 readLine()，一次返回一行文本，自动去掉行尾的 \\n、\\r 或 \\r\\n，读到末尾返回 null。BufferedWriter 对应提供 newLine()，按当前平台写入换行符，比硬编码 \\n 更可移植。' },
      { p: '默认缓冲区是 8192 个 char，也就是 16KB 内存（每个 char 两字节）。对按行读取来说，这个大小通常够用，因为 readLine 的瓶颈在解码和字符串创建，不在缓冲。如果每行特别长（比如一行几百 KB 的 JSON），可以适当加大；如果行很短，加大反而浪费。' },
      { p: 'BufferedReader 只能套在 Reader 上，而解码发生在 InputStreamReader 里，所以“按行读 UTF-8 文件”的经典写法是三层嵌套：FileInputStream、InputStreamReader、BufferedReader。Java 8 之后可以用 Files.newBufferedReader(path, charset) 一行代替，它内部已经做好缓冲和解码，是现在更推荐的写法。' },
      { p: 'readLine 没有长度上限，内部用 StringBuilder 不断拼接，遇到一行几 MB 的日志也不会报错，但会占用相应内存。如果数据里根本没有换行符（比如一整段压缩后的二进制被误当文本），readLine 会一直读到文件末尾，把整个文件塞进内存。处理来路不明的文本时，最好先确认它的行结构，或者改用固定大小的 char 数组读取。' },
      { code: `import java.io.*;

public class ReadLines {
    public static void main(String[] args) throws IOException {
        String text = "第一行\\n第二行\\n\\n第四行";
        try (BufferedReader reader =
                     new BufferedReader(new StringReader(text))) {
            String line;
            int no = 1;
            while ((line = reader.readLine()) != null) {
                System.out.println(no++ + ": " + line);
            }
        }
    }
}`, title: 'ReadLines.java' },
      { out: '1: 第一行\n2: 第二行\n3: \n4: 第四行' },
      { p: '第 6 行用 StringReader 模拟一个文本源，避免依赖真实文件。第 10 行的循环条件必须判断 null，不能判断空字符串——空行是合法的行，readLine 返回的是长度为 0 的字符串，而不是 null。第 11 行把行号拼在前面，输出里第 3 行只有一个冒号，正是那个空行。' },
      { h: '4.5 try-with-resources 与抑制异常' },
      { p: 'Java 7 引入的 try-with-resources 把“关闭”变成语法层面的保证：在 try 后面的圆括号里声明资源，无论 try 块正常结束、抛异常还是提前 return，这些资源都会在离开块之前自动关闭。能放进去的类型必须实现 AutoCloseable（Closeable 是它的子接口，close 声明为抛 IOException）。' },
      { p: '多个资源用分号分隔，关闭顺序与声明顺序相反——后声明的先关。这个顺序不是随意的：外层流依赖内层流，必须先关外层再关内层。Java 9 之后还允许直接引用已有的 final 或事实 final 变量，写成 try (in) { ... }，不必在括号里重新声明。catch 和 finally 仍然可以写，它们在资源关闭之后执行。' },
      { p: '编译器会把 try-with-resources 展开成 try/finally：先保存资源引用，try 块结束后调用 close，若 close 抛异常且 try 块也抛了异常，就把 close 的异常 addSuppressed 到主异常上。所以你写的代码看起来是“声明式”的，实际生成的字节码和手写 finally 差不多，只是把容易出错的细节交给了编译器。调试时看到栈里的 Suppressed 字样，就是这套机制在起作用。' },
      { table: { head: ['对比项', 'try-finally', 'try-with-resources'], rows: [
        ['代码量', '每个资源一段 finally', '一行声明搞定'],
        ['遗漏风险', '高，分支多时容易漏', '编译期保证，无法遗漏'],
        ['异常处理', 'close 异常会覆盖主异常', '主异常保留，close 异常被抑制'],
        ['关闭顺序', '手写，容易写反', '自动逆序'],
        ['适用类型', '任意', '必须实现 AutoCloseable']
      ] } },
      { p: '假设 try 块里抛了异常 A，关闭资源时又抛了异常 B。如果没有特殊处理，B 会沿着调用栈向外传播，A 就永远丢失了——排查时你只看到“关闭失败”，真正的原因被埋掉。try-with-resources 的做法是：A 作为主异常抛出，B 被挂到 A 的 suppressed 列表里，用 getSuppressed() 可以取出来。' },
      { code: `public class SuppressDemo {
    static class BadResource implements AutoCloseable {
        private final String name;
        BadResource(String name) { this.name = name; }
        void work() {
            throw new IllegalStateException(name + " 工作失败");
        }
        @Override public void close() {
            throw new IllegalStateException(name + " 关闭失败");
        }
    }

    public static void main(String[] args) {
        try (BadResource r = new BadResource("资源A")) {
            r.work();
        } catch (IllegalStateException e) {
            System.out.println("主异常: " + e.getMessage());
            for (Throwable t : e.getSuppressed()) {
                System.out.println("被抑制: " + t.getMessage());
            }
        }
    }
}`, title: 'SuppressDemo.java' },
      { out: '主异常: 资源A 工作失败\n被抑制: 资源A 关闭失败' },
      { p: '第 14 到 16 行在 try 块里主动抛异常，第 20 行离开块时自动调用 close，close 又抛一个。第 23 行捕获到的是 work 抛的那个，说明主异常没有被覆盖；第 24 行遍历 suppressed 数组，找到被压住的关闭异常。如果你用 finally 手写，第 23 行看到的就会是“关闭失败”，真正的原因反而看不见。' },
      { p: '打印完整栈时，被抑制的异常会以 Suppressed: 开头缩进显示在主异常下面，日志框架一般都会保留。看日志时如果只扫第一行，很容易漏掉关闭阶段的信息。反过来说，如果你在日志里看到某个异常“莫名其妙”地出现，先看看它是不是被标记为 suppressed，那往往能指向真正的资源问题。' },
      { h: '4.6 关闭顺序与嵌套结构' },
      { p: '装饰流的关闭是级联的：调用 BufferedWriter 的 close，它会先 flush 自己的缓冲，再调用 OutputStreamWriter 的 close，后者把编码器里残留的字节刷出去，最后关闭 FileOutputStream。所以对装饰流来说，只需要关最外层，千万不要手动去关内层，否则外层再 flush 时就会写到一个已经关闭的流上，抛 IOException。' },
      { p: '如果确实需要分别管理，就把每一层都声明成独立的资源，让 try-with-resources 按逆序关闭：先声明底层、后声明外层，关闭时自然先关外层。下面这个例子同时演示了多资源声明和“关闭后仍能读到结果”的情况——因为 StringWriter 的 close 是空操作，数据还在内存里。' },
      { p: '还有一个小规则：括号里的资源按从左到右的顺序初始化，所以后面的资源可以引用前面刚声明的变量；反过来则不行，编译器会报“找不到符号”。利用这一点，可以把 FileInputStream、InputStreamReader、BufferedReader 写在同一对括号里，既保证顺序又保证关闭。' },
      { code: `import java.io.*;

public class MultiResourceDemo {
    public static void main(String[] args) throws IOException {
        StringWriter buffer = new StringWriter();
        try (Writer w = new BufferedWriter(buffer);
             Reader r = new BufferedReader(new StringReader("abc"))) {
            int c;
            while ((c = r.read()) != -1) {
                w.write(Character.toUpperCase(c));
            }
        }
        System.out.println(buffer.toString());
        System.out.println(buffer.toString().length());
    }
}`, title: 'MultiResourceDemo.java' },
      { out: 'ABC\n3' },
      { flow: ['声明底层节点流', '套上转换流并指定字符集', '套上缓冲流', '在 try 块内读写', '离开块时自动 flush 并逆序关闭', 'catch/finally 在关闭之后执行'] },
      { p: '第 5、6 行的资源按声明顺序是 w 在前、r 在后，关闭时先关 r 再关 w。第 12 行离开 try 块，w 被关闭，缓冲刷进 StringWriter；第 14 行再从 StringWriter 取内容，仍然拿得到，因为 StringWriter.close() 什么也不做。这个特性让 StringWriter 成为测试 IO 代码的好工具：不用磁盘，也不会因为关闭而丢数据。' },
      { p: '不过“自动关闭”只适用于生命周期明确的资源。数据库连接、HTTP 连接这类对象通常由连接池管理，close 的语义是“归还”而不是“销毁”，放进 try-with-resources 依然正确，因为归还越早越好。真正不适合的是需要跨方法传递的资源，比如一个要在多次调用之间保持打开的文件句柄——这种情况应该由持有者统一管理生命周期，而不是在每个方法里开一个。' },
      { h: '4.7 常见错误清单' },
      { list: [
        '<b>在 try 块里 return 流：</b>返回之前资源已被关闭，调用方拿到一个关闭的流，一读就抛 IOException。需要返回流时，关闭责任交给调用方。',
        '<b>关闭后继续用：</b>close 之后再 read/write 会抛 IOException，且不同 JDK 的报错消息不完全一样，不要依赖消息做判断。',
        '<b>忘记 flush 就退出：</b>只写了几行又没关闭，数据停在缓冲区里，进程结束即丢失。',
        '<b>手动关闭内层流：</b>外层流再 flush 时会写到已关闭的流上，抛“Stream closed”。',
        '<b>把资源声明在 try 外：</b>try (in) 只在 Java 9 之后支持引用已有变量，且变量必须是事实 final；更常见的是根本忘了关。',
        '<b>catch 里吞掉异常：</b>捕获后既不记录也不抛出，问题被隐藏，比崩溃更难排查。'
      ] },
      { p: '异常处理上还有一条原则：不要在 catch 里“打个日志继续跑”，除非你确实能给出合理的降级。IO 失败通常意味着数据不完整，继续往下处理很可能写入错误结果，把问题扩散到下游。要么向上抛让调用方决定，要么转成业务异常并带上文件路径、操作类型这些上下文。吞掉异常是线上事故最常见的源头之一。' },
      { h: '4.8 参数选择与性能验证' },
      { p: '缓冲区大小怎么定？默认 8KB 对大多数场景够用。顺序读大文件可以用 64KB 到 1MB，减少系统调用；随机读大量小文件时，加大缓冲收益有限，反而增加内存压力；网络流要结合 MTU 和延迟，通常 8KB 到 32KB。不要凭感觉调参，先用真实数据量测一遍，再决定是否修改。' },
      { p: '验证性能时要注意几点：先预热几轮，让 JIT 编译完成；文件要大于操作系统页缓存，否则第二次读全在内存里，测不出磁盘差异；关掉其他占 IO 的进程；多次取中位数而不是单次结果。很多“优化”在压测下毫无差别，就是因为瓶颈根本不在被测的那一段。' },
      { p: '如果要做严肃的性能对比，别用 System.currentTimeMillis 包一段代码就下结论，JIT 预热、垃圾回收、文件缓存都会干扰结果。JDK 自带的 JMH 框架能处理这些细节，它会自动预热、多次迭代、统计置信区间。日常开发不必上 JMH，但至少要做到“同一份数据、同一台机器、多跑几次取中位数”，否则测出来的差异很可能只是噪声。' },
      { p: '最后提醒：不要为了“看起来专业”而到处加缓冲。内存里的小数组再套缓冲几乎没有收益，只读几行的配置文件加不加缓冲差别也微乎其微。优化的前提是测量，没有测量的优化只是在增加代码复杂度和内存占用。先把功能写对，再用数据决定要不要优化，这个顺序不能反。' },
      { h: '4.9 实战：按行统计大文件' },
      { p: '下面这个例子统计文本的行数、单词数和字符数，用的是流式处理：一次只保留一行在内存里，所以文件多大都不会 OOM。如果换成 Files.readAllLines，一个几 GB 的日志文件会直接把堆撑爆。这也是“能用流就别一次性读进内存”的典型场景。' },
      { code: `import java.io.*;

public class WordCount {
    public static void main(String[] args) throws IOException {
        String text = "java is fun\\nstream and io\\n";
        int lines = 0, words = 0, chars = 0;
        try (BufferedReader reader =
                     new BufferedReader(new StringReader(text))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines++;
                chars += line.length();
                if (!line.isBlank()) {
                    words += line.trim().split(" ").length;
                }
            }
        }
        System.out.println("行数 " + lines);
        System.out.println("单词 " + words);
        System.out.println("字符 " + chars);
    }
}`, title: 'WordCount.java' },
      { out: '行数 2\n单词 6\n字符 24' },
      { p: '第 9 行累加行数，第 10 行累加字符数，注意 readLine 已经去掉了换行符，所以字符数不含换行。第 11 行用 isBlank 跳过空白行，避免空行被当成一个单词。第 12 行按单个空格切分，所以连续多个空格会产生空串元素，真实场景应该用更严谨的分词。输出里字符数是 24，正好是两行文本去掉换行后的长度之和。' },
      { p: '这个例子还可以继续扩展：记录最长的一行有多长，需要保留 line.length() 的最大值；统计不含空行的行数，就在 isBlank 为 false 时单独计数；按关键字过滤，就在循环里加一个 contains 判断再累加。所有这些扩展都不会增加内存占用，因为任意时刻内存里只有当前这一行。这就是流式处理相对“先读全部再处理”的最大优势。' },
      { h: '4.10 本章小结' },
      { list: [
        '缓冲流把多次小 IO 合并成少数大 IO，系统调用次数下降两三个数量级。',
        'BufferedOutputStream 在缓冲满、flush、close 时真正写出，漏掉后两者会丢数据。',
        'BufferedReader.readLine 返回 null 表示结束，空行返回长度为 0 的字符串。',
        'try-with-resources 保证资源在离开块时关闭，多个资源逆序关闭。',
        '关闭异常会被抑制到主异常上，用 getSuppressed 查看，不会覆盖真正的错误。'
      ] },
      { h: '4.11 常见追问' },
      { list: [
        '<b>缓冲流能不能完全替代手动数组？</b>能，缓冲流内部就是数组，而且处理了边界情况，优先用它。',
        '<b>为什么关闭外层就能关闭内层？</b>处理流的 close 会转发给被包装的流，逐层向下直到节点流。',
        '<b>try-with-resources 能用于非 IO 资源吗？</b>能，只要实现 AutoCloseable，锁、连接、线程池都可以。',
        '<b>close 调用两次会怎样？</b>规范要求已关闭的流再 close 不产生效果，但自定义实现未必，别依赖这个行为。',
        '<b>为什么我的文件是空的？</b>最常见原因是没 flush 或没关闭，其次是写到了另一个路径。',
        '<b>BufferedReader 和 Scanner 怎么选？</b>按行快速读用 BufferedReader，需要解析数字或分词再用 Scanner。'
      ] },
      { h: '4.12 自测与练习' },
      { p: '下面的练习建议用真实文件做，尤其要亲手制造一次“文件是空的”，把 flush 的作用记牢。做完后对照本章小结，确认每条都能用自己的话解释。' },
      { ol: [
        '用缓冲流复制一个 100MB 的文件，分别设置 8KB 和 1MB 缓冲区，比较耗时。',
        '故意去掉 close，只写三行文本就结束程序，观察文件内容并解释原因。',
        '把 ReadLines 的循环条件从 != null 改成 !line.isEmpty()，运行后看看哪个空行被跳过了。',
        '用 try-with-resources 同时管理 BufferedReader 和 BufferedWriter，实现文件转大写。',
        '写一个自定义 AutoCloseable，在 work 和 close 里各抛一个异常，打印 getSuppressed 的内容。',
        '解释为什么在 try 块里 return 一个打开的流是错误用法，应该怎么改。'
      ] }
    ]
  };

  T['nio-files'] = {
    meta: '本章约 13200 字 · 建议 55 分钟 · 15 节 · 6 段代码 · 3 张表',
    blocks: [
      { h: '5.1 Path 的创建与解析' },
      { p: '创建 Path 有两种写法：Java 7 的 Paths.get(第一段, 更多段...) 和 Java 11 的 Path.of(...)。两者等价，Path.of 更简短，新代码推荐用它。传入的字符串可以是相对路径也可以是绝对路径，Path 本身不做任何校验——它只是把字符串切成若干段保存起来，文件存不存在要另外用 Files.exists 判断。' },
      { p: 'Path 提供了一组只读的解析方法：getFileName 返回最后一段，getParent 返回去掉最后一段的路径，getNameCount 返回段数，getName(i) 返回第 i 段（从 1 开始数的“第几段”，下标却是 0 起）。getRoot 返回根，在 Unix 上是 /，在 Windows 上是 C:\\ 这样的盘符。这些方法都不会访问磁盘，所以非常快。' },
      { p: 'Path 是不可变对象，所有“修改”方法都返回新实例，所以可以安全地在多线程之间传递。它实现了 Iterable&lt;Path&gt;，可以直接用 for (Path seg : path) 遍历每一段；也实现了 Comparable，可以排序。equals 的比较规则由文件系统决定：Windows 上通常忽略大小写，Linux 上区分大小写，所以不要用字符串相等去判断两个路径是否指向同一个文件，应该用 Files.isSameFile。' },
      { code: `import java.nio.file.*;

public class PathDemo {
    public static void main(String[] args) {
        Path p = Path.of("/data/app/logs/app.log");

        System.out.println(p.getFileName());   // app.log
        System.out.println(p.getParent());     // /data/app/logs
        System.out.println(p.getNameCount());  // 4
        System.out.println(p.getName(0));      // data
        System.out.println(p.getRoot());       // /

        Path base = Path.of("/data/app");
        System.out.println(base.resolve("config/app.yml"));
        System.out.println(base.relativize(Path.of("/data/app/logs/a.txt")));
        System.out.println(Path.of("/data/app/./logs/../logs/a.txt").normalize());
    }
}`, title: 'PathDemo.java' },
      { out: '/data/app/logs/app.log 的解析结果：\napp.log\n/data/app/logs\n4\ndata\n/\n/data/app/config/app.yml\nlogs/a.txt\n/data/app/logs/a.txt' },
      { p: '第 4 行创建 Path，注意它不会检查 /data/app 是否存在。第 6 到 10 行分别取文件名、父目录、段数、第一段和根。第 12 行的 resolve 把相对路径拼到基准路径上，如果参数本身是绝对路径，resolve 会直接返回参数，这一点常被用来实现“用户给了绝对路径就用，否则拼到工作目录下”。第 13 行求相对路径，第 14 行把 . 和 .. 化简。' },
      { h: '5.2 为什么要用 Path 与 Files：与旧 File 的对比' },
      { p: 'Java 1.0 的 File 类用起来很别扭。它把“路径”和“文件操作”混在一起，mkdir 失败只返回 false 不告诉你原因，renameTo 在不同文件系统之间行为不一致，list() 在目录不存在时返回 null 而不是抛异常，还得再判一次空。更要命的是它无法表达符号链接、无法区分“不存在”和“没权限”，排查问题时只能靠猜。' },
      { p: 'Java 7 引入 NIO.2，把这两件事拆开了：Path 只负责表示路径，Files 提供静态方法做实际操作。Path 是接口，实现由文件系统提供，所以能表达不同平台、不同提供者的路径；Files 的每个方法失败时都抛具体的 IOException 子类，比如 NoSuchFileException、AccessDeniedException、FileAlreadyExistsException，调用方可以根据类型做不同处理。' },
      { p: '一个具体的对比能说明问题。File.delete() 删除失败时只返回 false，你无法区分“文件不存在”“没有权限”“目录非空”还是“被其他进程占用”；Files.delete() 则分别抛 NoSuchFileException、AccessDeniedException、DirectoryNotEmptyException，甚至带上文件路径和原因。日志里多这一行信息，排查时间可能从半小时缩短到一分钟。' },
      { p: 'File 并没有被废弃，很多老 API 仍然接收 File，比如 new FileInputStream(File)、ImageIO.read(File)。两者可以互转：file.toPath() 得到 Path，path.toFile() 得到 File（但非默认文件系统的 Path 调用 toFile 会抛 UnsupportedOperationException）。新代码内部用 Path，边界上转一下即可。' },
      { p: '行为差异是迁移时最容易踩的坑。File.delete 失败只返回 false，Files.delete 抛异常并说明原因；File.mkdirs 失败也返回 false，Files.createDirectories 抛 IOException；File.list 在路径不是目录时返回 null，Files.list 抛 NotDirectoryException。把这些差异记住，迁移时才知道该在哪里补 try/catch。' },
      { table: { head: ['维度', 'File', 'Path + Files'], rows: [
        ['失败反馈', '返回 false，原因不明', '抛具体 IOException 子类'],
        ['路径表达', '只支持默认文件系统', '支持多个 FileSystem 提供者'],
        ['符号链接', '基本不支持', '支持，可控制是否跟随'],
        ['遍历', 'list 返回数组，需手写递归', 'walk 返回 Stream，可组合'],
        ['文本读写', '需自己套流', 'readString / writeString 一行搞定'],
        ['原子操作', '无', 'ATOMIC_MOVE 等选项']
      ] } },
      { p: '迁移建议是“新代码用新 API，旧代码按需替换”，不要为了统一而大规模重写。替换时优先改三类地方：需要区分失败原因的错误处理、需要递归遍历的目录操作、需要原子性的写入。这三类用 File 写出来的代码往往又长又不可靠，换成 Files 收益最明显；其余地方保持原样，风险更低。' },
      { p: '这套 API 还带来了流式遍历（Files.walk）、便捷的文本读写（readString、writeString）、原子移动、临时文件等能力。新项目没有理由再用 File，除非要兼容很老的第三方库。本章按“表示路径、读写内容、操作目录、遍历查找、异常处理”的顺序讲，最后用一个清理过期日志的例子把它们串起来。' },
      { h: '5.3 拼接、相对化与规范化' },
      { p: 'resolve 和 relativize 是一对相反操作：前者把子路径接在父路径后面，后者算出“从 A 到 B 怎么走”。relativize 要求两个路径同类型（都是绝对或都是相对），否则抛 IllegalArgumentException。normalize 只做字符串层面的化简，把 . 去掉、把 .. 与前一段抵消，它不解析符号链接，也不检查路径是否存在。' },
      { p: '还有三个常用方法。toAbsolutePath 把相对路径转成绝对路径，基于当前工作目录，同样不检查存在性；toRealPath 会解析符号链接并检查路径真实存在，不存在就抛 IOException；startsWith 与 endsWith 按“路径段”比较而不是按字符串前缀，所以 /data/app2 不以 /data/app 开头，这是一个很重要的区别。' },
      { p: '路径比较还有一个容易忽略的点：不同分隔符。Windows 的 Path 同时接受 \ 和 /，toString 输出时用 \；Unix 只用 /。所以写日志、拼 SQL、做缓存键时，不要直接拿 path.toString() 当稳定标识，跨平台会不一致。需要稳定字符串时用 toUri().toString()，或者统一替换分隔符后再用。' },
      { note: '路径拼接不要用字符串加号。base + "/" + name 在 Windows 上会得到混用分隔符的路径，遇到 name 以 / 开头还会拼出双斜杠。用 resolve 能正确处理分隔符，也能正确处理“name 是绝对路径”的情况。' },
      { p: 'relativize 在跨根路径（比如 Windows 上不同盘符）时会抛 IllegalArgumentException，因为它无法用“往上一层再下去”的方式表示这种关系。跨盘时要先把两边都转成绝对路径，判断根不同就放弃相对化，直接用绝对路径；否则程序在开发机上正常，部署到有多个挂载点的服务器上就会崩。' },
      { h: '5.4 Files 读写文本' },
      { p: 'Files 把常见读写浓缩成了一行。Files.readString(path) 读整个文件为字符串，Files.writeString(path, content) 写入字符串，两者默认都用 UTF-8，而不是平台默认编码——这一点和 FileReader 不同，也是推荐它们的原因之一。还有 readAllLines 按行读成 List，write 按行写，以及 newBufferedReader 返回带缓冲的 Reader。' },
      { p: '写入还有几个选项值得知道。默认的 writeString 是“创建或截断”，也就是文件存在就清空重写。要追加内容，传 StandardOpenOption.APPEND；要“存在就报错”，传 CREATE_NEW；只想要“不存在才创建”，传 CREATE。这些选项用一个可变参数传入，可以组合，但 APPEND 和 TRUNCATE_EXISTING 互斥，同时传会抛 IllegalArgumentException。' },
      { p: '这些便捷方法的共同前提是“文件不大”。readString 会把整个文件读进内存，一个 2GB 的日志文件会直接 OOM；readAllLines 同理，而且它保留每行的字符串对象，内存占用比 readString 更高。大文件必须用 5.8 节的流式遍历，或者 newBufferedReader 逐行处理。' },
      { p: '指定 UTF-8 去读一个 GBK 文件会抛 MalformedInputException，它是 IOException 的子类。很多程序在这里直接崩溃，其实可以按“先 UTF-8、失败再退回 GBK”的顺序尝试；或者用 CharsetDecoder 配置成“遇到非法字节替换成问号”而不是抛异常。前者适合已知来源的数据，后者适合清理脏数据，两者都要在日志里记录用了哪种编码。' },
      { code: `import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class FilesReadWrite {
    public static void main(String[] args) throws Exception {
        Path file = Path.of("demo.txt");

        Files.writeString(file, "第一行\\n第二行\\n", StandardCharsets.UTF_8);
        System.out.println(Files.readString(file, StandardCharsets.UTF_8).trim());

        Files.write(file, List.of("a", "b"), StandardCharsets.UTF_8);
        System.out.println(Files.readAllLines(file, StandardCharsets.UTF_8));
        System.out.println(Files.size(file));

        Files.deleteIfExists(file);
    }
}`, title: 'FilesReadWrite.java' },
      { out: '第一行\n第二行\n[a, b]\n4' },
      { p: '第 8 行写字符串，默认行为是“存在则覆盖”。第 9 行读回来并 trim 掉末尾换行，所以只打印两行。第 11 行按行写入，每行后面自动补一个平台换行符，在 Unix 上是 \\n，所以两个单字符行加两个换行共 4 字节；在 Windows 上是 \\r\\n，会变成 6 字节。第 13 行打印文件大小，注意它是字节数，不是字符数。' },
      { table: { head: ['方法', '用途', '内存风险'], rows: [
        ['readString', '整个文件读成字符串', '大文件会 OOM'],
        ['readAllLines', '按行读成 List', '比 readString 更占内存'],
        ['readAllBytes', '读成 byte[]，适合二进制', '大文件会 OOM'],
        ['newBufferedReader', '返回 BufferedReader，逐行流式读', '低，推荐'],
        ['writeString', '写入字符串，默认覆盖', '内容需已在内存中'],
        ['newBufferedWriter', '返回 BufferedWriter，流式写', '低，推荐']
      ] } },
      { h: '5.5 目录的创建与列举' },
      { p: 'createDirectory 创建单层目录，父目录不存在就抛 NoSuchFileException；createDirectories 会递归创建所有缺失的父目录，而且目录已存在时不报错。日常几乎总是用后者，因为“确保这个目录存在”比“严格新建一层”更符合需求。两个方法在路径已存在但不是目录时都会抛 FileAlreadyExistsException。' },
      { p: '列举目录有两个方法：Files.list 返回直接子项的 Stream，Files.walk 递归返回所有层级。两者都持有目录句柄，必须关闭，所以要用 try-with-resources 包起来，否则在 Windows 上会删不掉目录。这一点和普通集合的 stream 不同，很多人在第一次使用时踩坑。' },
      { p: 'Files.list 不保证顺序，底层就是文件系统的目录项顺序，同一目录在不同机器上可能不同。需要稳定输出就自己 sorted，但要注意 sorted 会把全部条目读进内存。目录里有几十万文件时，先 filter 再 limit，不要在 sorted 之后才 limit，那等于把整棵目录排完序再取前几个。' },
      { p: '如果只需要列一层，又不想用 Stream，可以用 newDirectoryStream，它返回 DirectoryStream，支持 glob 模式比如 "*.log"。它同样是 Closeable，也必须关闭。相比 Files.list，它的优点是过滤在文件系统层面完成，目录里文件极多时不必先全部列出再过滤；缺点是 API 更老，不能接 Stream 的算子。' },
      { code: `import java.nio.file.*;
import java.io.IOException;

public class DirDemo {
    public static void main(String[] args) throws IOException {
        Path dir = Path.of("work/demo");
        Files.createDirectories(dir);              // 已存在也不报错

        Files.createFile(dir.resolve("a.txt"));
        Files.createFile(dir.resolve("b.txt"));

        try (var stream = Files.list(dir)) {
            stream.sorted().forEach(p -> System.out.println(p.getFileName()));
        }
        System.out.println(Files.isDirectory(dir));

        Files.delete(dir.resolve("a.txt"));
        Files.delete(dir.resolve("b.txt"));
        Files.delete(dir);
    }
}`, title: 'DirDemo.java' },
      { out: 'a.txt\nb.txt\ntrue' },
      { p: '第 7 行确保目录存在，重复运行不会失败。第 9、10 行用 createFile 建空文件，如果文件已存在会抛 FileAlreadyExistsException；想“有则忽略”就先判断 Files.exists，或者直接用 writeString 覆盖。第 12 行的 var 是 Java 10 的局部变量类型推断，这里推断为 Stream&lt;Path&gt;。第 18 行删除空目录，目录非空时 delete 会抛 DirectoryNotEmptyException。' },
      { h: '5.6 文件属性与判断' },
      { p: 'Files 提供了一组以“is”开头的方法判断类型：isRegularFile、isDirectory、isSymbolicLink。它们默认跟随符号链接，也就是说一个指向目录的链接会被 isDirectory 判为 true。如果要判断链接本身，传 LinkOption.NOFOLLOW_LINKS。exists 也一样，遇到断链时默认返回 false，加 NOFOLLOW_LINKS 才返回 true。' },
      { p: '读取属性用 readAttributes，或者用更简单的 size、getLastModifiedTime、isReadable、isWritable。size 返回字节数，对目录的返回值依赖文件系统，不要依赖它算目录大小。getLastModifiedTime 返回 FileTime，可以转成 Instant 再做时间比较，这是做“清理过期文件”的基础。' },
      { p: '需要更多属性时用 readAttributes(path, BasicFileAttributes.class)，一次拿到大小、创建时间、修改时间、访问时间、是否为目录、是否为符号链接等字段，比反复调用单个方法少几次系统调用。在 Linux 上还可以读 PosixFileAttributes 拿所有者与权限位，用 setPosixFilePermissions 修改；这些 API 在 Windows 上会抛 UnsupportedOperationException，跨平台代码要先判断支持情况。' },
      { table: { head: ['方法', '返回', '注意'], rows: [
        ['exists', 'boolean', '默认跟随链接，断链返回 false'],
        ['isRegularFile', 'boolean', '目录、链接都返回 false'],
        ['isDirectory', 'boolean', '指向目录的链接默认返回 true'],
        ['size', 'long（字节）', '目录大小因文件系统而异'],
        ['getLastModifiedTime', 'FileTime', '可转 Instant 做时间比较'],
        ['isReadable / isWritable', 'boolean', '只是提示，真正操作仍可能失败']
      ] } },
      { h: '5.7 复制、移动与删除' },
      { p: 'copy 的默认行为是“目标存在就抛 FileAlreadyExistsException”，要覆盖必须显式传 StandardCopyOption.REPLACE_EXISTING。想保留修改时间等属性再加 COPY_ATTRIBUTES。move 默认也会在目标存在时失败，同样支持 REPLACE_EXISTING；跨文件系统移动时，底层会退化成“复制加删除”，不再是原子操作。' },
      { p: 'delete 在文件不存在时抛 NoSuchFileException，deleteIfExists 则返回 false 而不抛。删除目录要求目录为空，想递归删除得自己从最深层往外删，或者用 Files.walk 倒序删除。ATOMIC_MOVE 保证“要么完全成功，要么完全没发生”，但只在同一文件系统内有效，跨盘会抛 AtomicMoveNotSupportedException。' },
      { p: '符号链接是另一个容易踩坑的地方。copy 默认复制链接指向的内容，而不是链接本身；要复制链接本身得传 NOFOLLOW_LINKS。delete 删除的是链接，不会删目标。Files.isSameFile 会解析链接后比较，所以一个链接和它的目标会返回 true。理解这些默认行为，才能避免“以为删了副本，其实删了源文件”这类事故。' },
      { code: `import java.nio.file.*;

public class CopyMoveDemo {
    public static void main(String[] args) throws Exception {
        Path dir = Files.createTempDirectory("nio-demo");
        Path src = dir.resolve("src.txt");
        Path dst = dir.resolve("dst.txt");
        Files.writeString(src, "hello");

        Files.copy(src, dst);
        System.out.println(Files.readString(dst));

        try {
            Files.copy(src, dst);
        } catch (FileAlreadyExistsException e) {
            System.out.println("目标已存在");
        }

        Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
        System.out.println(Files.readString(dst));

        Path moved = dir.resolve("moved.txt");
        Files.move(dst, moved, StandardCopyOption.ATOMIC_MOVE);
        System.out.println(Files.exists(dst) + " " + Files.exists(moved));

        Files.delete(src);
        Files.delete(moved);
        Files.delete(dir);
    }
}`, title: 'CopyMoveDemo.java' },
      { out: 'hello\n目标已存在\nhello\nfalse true' },
      { p: '第 5 行创建一个临时目录，程序结束不会自动删除，所以最后三行手动清理。第 9 行第一次复制成功，第 12 行第二次复制因为目标已存在而抛异常，被 catch 后打印提示。第 17 行加上 REPLACE_EXISTING 再复制，这次直接覆盖。第 21 行用 ATOMIC_MOVE 改名，第 22 行验证原路径已不存在、新路径存在。' },
      { h: '5.8 遍历与查找' },
      { p: 'Files.walk 返回一个深度优先的 Stream&lt;Path&gt;，包含起点本身。它支持深度参数，Files.walk(dir, 1) 等价于只列一层。因为是 Stream，可以接 filter、sorted、limit，写出“找出所有大于 10MB 的 .log 文件”这类查询。注意 sorted 会把所有结果攒进内存，超大目录树要慎用。' },
      { p: '如果需要更精细的控制，比如“遇到无权限的目录就跳过”“进入目录前做点什么”，用 walkFileTree 配合 SimpleFileVisitor，重写 preVisitDirectory、visitFile、visitFileFailed。它不会一次性把所有路径放进内存，适合遍历整个磁盘这种规模。日常查找用 walk 就够了，两者可以按需选择。' },
      { p: 'walk 默认不跟随符号链接，这是有意的保护：如果目录里有指向上层的链接，跟随就会无限循环。确实需要跟随时传 FileSystemLoopException 相关的选项 FOLLOW_LINKS，并准备好捕获循环异常。另外 walk 的深度参数从 0 开始，walk(dir, 0) 只包含起点自身，walk(dir, 1) 包含起点和直接子项，写错一位就会少一层或多一层。' },
      { p: 'Path.of 还能接收 URI：Path.of(URI.create("file:///tmp/a.txt")) 可以直接从 file 协议构造路径，反过来用 path.toUri() 得到 URI。处理命令行参数或配置文件里的 file: 链接时会用到。注意 URI 里的空格必须编码成 %20，直接传带空格的字符串会抛 IllegalArgumentException，这是新手常犯的错。' },
      { code: `import java.nio.file.*;
import java.util.stream.Stream;

public class WalkDemo {
    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("walk-demo");
        Files.createDirectories(root.resolve("sub"));
        Files.writeString(root.resolve("a.log"), "x");
        Files.writeString(root.resolve("sub/b.log"), "y");
        Files.writeString(root.resolve("sub/c.txt"), "z");

        try (Stream<Path> paths = Files.walk(root)) {
            paths.filter(Files::isRegularFile)
                 .filter(p -> p.toString().endsWith(".log"))
                 .sorted()
                 .forEach(p -> System.out.println(root.relativize(p)));
        }
    }
}`, title: 'WalkDemo.java' },
      { out: 'a.log\nsub/b.log' },
      { p: '第 6 到 10 行在临时目录里搭出一棵小树：根下 a.log，子目录 sub 下有 b.log 和 c.txt。第 12 行的 walk 会依次给出根、a.log、sub、sub/b.log、sub/c.txt。第 13 行过滤出普通文件，排除目录；第 14 行只保留 .log；第 16 行用 relativize 去掉临时目录的随机前缀，输出才稳定可预期。' },
      { flow: ['确定起点 Path', '用 Files.walk 生成路径流', 'filter 过滤类型与扩展名', 'sorted 排序（注意内存）', 'forEach 处理或 collect 收集', '关闭流，释放目录句柄'] },
      { h: '5.9 临时文件与原子写' },
      { p: 'createTempFile(prefix, suffix) 在系统临时目录创建文件，createTempDirectory 创建目录，名字里的随机部分由 JDK 保证不重复。临时文件不会被自动删除，需要自己清理；如果要做“进程退出即删除”，用 deleteOnExit，但它只在 JVM 正常退出时生效，而且会累积到退出时才删，长期运行的服务不要用。' },
      { p: '临时文件还要考虑清理策略。createTempFile 生成的文件不会因为流关闭而消失，进程崩溃时更是留在磁盘上。稳妥的做法是启动时扫一遍临时目录，删掉超过一定时间的残留；或者用 try-with-resources 包裹，在 finally 里删除。别指望 deleteOnExit，它在长期运行的服务里既不会及时触发，又会一直持有路径引用。' },
      { p: '多进程同时写同一个文件时，可以用 FileChannel.lock 加排他锁，或者用 tryLock 非阻塞地尝试。锁是建议性的，只在协作的进程之间有效，不遵守锁的程序照样能写坏文件。同一个 JVM 内对同一区域重复加锁会抛 OverlappingFileLockException，而不是乖乖阻塞，这一点和很多人的直觉相反。' },
      { p: '原子写是另一个高频需求：直接往目标文件写，写到一半崩溃就会留下半截文件，读的人可能解析失败。正确做法是先写到同目录下的临时文件，写完并 flush，再用 ATOMIC_MOVE 改名成目标文件。同一文件系统内的 rename 是原子的，所以读的人要么看到旧文件，要么看到完整的新文件，不会看到中间状态。' },
      { note: '临时文件必须和目标文件在同一个文件系统，否则 ATOMIC_MOVE 会抛 AtomicMoveNotSupportedException。所以不要用系统临时目录，而要在目标目录下 createTempFile，再 move 过去。' },
      { h: '5.10 异常与常见错误' },
      { p: 'NIO.2 的异常层次值得记一下：NoSuchFileException 表示路径不存在，FileAlreadyExistsException 表示目标已存在，AccessDeniedException 表示权限不足，NotDirectoryException 表示本该是目录，DirectoryNotEmptyException 表示删除非空目录，FileSystemException 是它们的父类，带有 file、other、reason 三个字段，能提供更多上下文。' },
      { p: '捕获时不要一律 catch IOException 然后打印“操作失败”。至少要把路径打进日志，否则线上出问题时你不知道是哪个文件。更好的做法是按类型分开处理：不存在就创建，已存在就覆盖，没权限就报给用户。异常类型本身就是信息，丢掉它等于丢掉排查线索。' },
      { p: 'FileSystemException 的 getFile、getOtherFile、getReason 能提供结构化信息，日志里打出来比只打 getMessage 清晰得多。捕获后如果要转换成业务异常，记得把原始异常作为 cause 传进去，否则堆栈就断在这里，排查时看不到真正的原因，只能看到一句“文件操作失败”。' },
      { list: [
        '相对路径基于进程工作目录，IDE 与命令行可能不同，排查时先打印 toAbsolutePath。',
        'Files.list 与 Files.walk 返回的流必须关闭，否则目录句柄泄漏，Windows 上无法删除。',
        '删除目录前要确保为空，否则抛 DirectoryNotEmptyException。',
        '跨文件系统 move 可能退化为复制加删除，不再原子，也可能很慢。',
        'readString 默认 UTF-8，遇到 GBK 文件会抛 MalformedInputException，要显式传字符集。',
        '符号链接默认被跟随，判断链接本身要加 NOFOLLOW_LINKS。'
      ] },
      { h: '5.11 实战：清理过期日志' },
      { p: '需求是：扫描日志目录，删除最后修改时间早于 7 天的 .log 文件，并打印删了哪些、留了哪些。这个例子把 Path 拼接、Files.list 遍历、属性读取、时间比较、删除、异常处理都串了一遍，是日常运维脚本的典型形态。' },
      { p: '放到生产环境还要考虑几件事：定时任务可能被重复调度，两个实例同时删同一批文件会互相干扰，最好加分布式锁或只让一个实例执行；删除前先 dry-run 打印将要删的列表，确认无误再真删；除了按时间，还可以加“至少保留最近 N 个文件”的兜底，避免时钟异常或配置错误把日志全清空。' },
      { code: `import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.*;
import java.util.stream.Stream;
import java.io.IOException;

public class CleanOldLogs {
    static void deleteQuietly(Path p) {
        try {
            Files.delete(p);
            System.out.println("删除 " + p.getFileName());
        } catch (IOException e) {
            System.out.println("删除失败 " + p.getFileName() + ": " + e.getClass().getSimpleName());
        }
    }

    static boolean isExpired(Path p, Instant threshold) {
        try {
            FileTime time = Files.getLastModifiedTime(p);
            return time.toInstant().isBefore(threshold);
        } catch (IOException e) {
            return false;
        }
    }

    public static void main(String[] args) throws IOException {
        Path dir = Files.createTempDirectory("logs");
        Files.writeString(dir.resolve("old.log"), "x");
        Files.writeString(dir.resolve("new.log"), "y");
        Files.setLastModifiedTime(dir.resolve("old.log"),
                FileTime.from(Instant.now().minus(Duration.ofDays(30))));

        Instant threshold = Instant.now().minus(Duration.ofDays(7));
        try (Stream<Path> paths = Files.list(dir)) {
            paths.filter(p -> p.toString().endsWith(".log"))
                 .filter(p -> isExpired(p, threshold))
                 .forEach(CleanOldLogs::deleteQuietly);
        }
        try (Stream<Path> left = Files.list(dir)) {
            left.forEach(p -> System.out.println("保留 " + p.getFileName()));
        }
    }
}`, title: 'CleanOldLogs.java' },
      { out: '删除 old.log\n保留 new.log' },
      { p: '第 8 行的 deleteQuietly 把受检异常吞在方法内部，返回 void，这样才能作为方法引用传给 forEach——lambda 里不允许抛受检异常，这是写流式代码时最常见的障碍。第 15 行的 isExpired 同理，取不到修改时间就当作“不过期”，避免因为一个坏文件中断整轮清理。第 25 到 27 行造数据，把 old.log 的时间改成 30 天前。' },
      { h: '5.12 本章小结' },
      { list: [
        'Path 只表示路径，不访问磁盘；Files 提供实际操作，失败时抛具体异常。',
        'resolve 拼接、relativize 求相对、normalize 化简，路径操作不要用字符串拼接。',
        'readString / writeString 默认 UTF-8，适合小文件；大文件用 newBufferedReader 或 walk。',
        'Files.list 与 Files.walk 返回的 Stream 必须关闭。',
        '覆盖目标要显式 REPLACE_EXISTING，原子替换用临时文件加 ATOMIC_MOVE。'
      ] },
      { h: '5.13 常见追问' },
      { list: [
        '<b>Path 和 File 能互相转换吗？</b>能，file.toPath() 与 path.toFile()，但非默认文件系统的 Path 不能转 File。',
        '<b>为什么 Files.list 要关闭？</b>它持有目录句柄，不关会泄漏，Windows 上还会导致目录无法删除。',
        '<b>readString 和 readAllLines 怎么选？</b>要整体处理用 readString，要逐行处理用 readAllLines，文件大则两者都别用。',
        '<b>ATOMIC_MOVE 为什么有时失败？</b>跨文件系统不支持原子改名，会抛 AtomicMoveNotSupportedException。',
        '<b>exists 返回 false 就一定是文件不存在吗？</b>不一定，也可能是没权限，或者路径是断开的符号链接。',
        '<b>normalize 会解析符号链接吗？</b>不会，它只做字符串层面的化简，解析链接要用 toRealPath。'
      ] },
      { h: '5.14 自测与练习' },
      { p: '练习建议在临时目录里做，避免误删项目文件。每道题都先想清楚“失败时会发生什么”，再动手运行，这样对异常的理解会比只看文档深得多。' },
      { ol: [
        '用 Path.of 解析一个多层路径，打印文件名、父目录、段数和根。',
        '用 Files.walk 找出某目录下所有 .java 文件，按大小排序输出前五个。',
        '实现“把 a.txt 复制为 b.txt，若 b.txt 已存在则覆盖”，只用一行 Files 调用。',
        '写一个方法递归删除目录，要求目录非空也能删，说明为什么必须倒序。',
        '用临时文件加 ATOMIC_MOVE 实现原子写配置，模拟写入中途抛异常，验证目标文件仍是旧内容。',
        '解释 Files.exists 返回 false 的三种可能原因，并写出分别如何确认。'
      ] }
    ]
  };

  T['serialization'] = {
    meta: '本章约 11300 字 · 建议 55 分钟 · 15 节 · 6 段代码 · 3 张表',
    blocks: [
      { h: "6.1 序列化到底做了什么" },
      { p: "序列化不是\"把对象在内存里的字节拷出来\"。对象在内存里由对象头、字段值、指向其他对象的引用组成，直接把这堆字节拷到另一台机器毫无意义，因为地址在那边无效。序列化做的是一次结构化翻译：遍历整个对象图，把每个对象的类名、字段名、字段类型、字段值按约定格式写出来；反序列化时按同样的约定读，重新创建对象并赋值。" },
      { p: "所以能被序列化的对象，字段要么是基本类型，要么是 String、数组、集合，要么是同样实现了 Serializable 的对象。遇到一个不能序列化的字段，整个过程直接失败，而且失败发生在运行时。这也解释了序列化为什么有开销：它要反射读取字段、要记录类型信息、要处理对象之间的共享引用和循环引用。" },
      { p: '共享引用是另一个细节。如果两个字段指向同一个对象，原生序列化只写一次，读回来仍然指向同一个对象，这个特性叫引用共享。JSON 没有这个能力：同一个对象在两处出现就会被写成两份，读回来是两个互相独立的对象。如果你的业务依赖“这两处必须是同一个对象”，换格式时就要重新设计。' },
      { flow: [
        "程序里有一个对象，可能还引用着其他对象",
        "按格式写出类名、字段名、字段类型、字段值",
        "写入文件、网络或缓存",
        "需要时把字节读回来",
        "按类信息重建对象，得到一份副本"
      ] },
      { note: "反序列化得到的是一份副本，不是你原来那个对象。副本和原对象互不影响，改副本的字段不会改到原对象。这一点在缓存场景要特别注意：从缓存读出来的对象如果被多个线程共享，仍然需要保证线程安全，不能因为\"它是读出来的\"就当成只读。" },
      { h: "6.2 为什么需要序列化" },
      { p: "程序运行时的数据都在内存里，进程一退出就没了。要把数据留住，或者送到另一台机器，就必须把它变成一串能写进文件、能发到网络的东西；用的时候再变回来。这个\"对象变字节、字节变对象\"的过程，就是序列化与反序列化。听起来抽象，其实你每天都在用：浏览器把表单提交成 JSON，后端存进数据库；微服务之间互相调用传的也是 JSON；本地缓存把对象写成文件，下次启动直接读回来。" },
      { p: "很多初学者觉得这属于\"框架的事\"，写业务不用管。但真实项目里，序列化引发的 bug 特别多：时间字段少了一天，因为时区没约定；金额 19.9 变成 19.899999，因为浮点精度；中文变成问号，因为编码不一致；上线后老数据读不出来，因为类改了字段；甚至因为反序列化了不可信的数据被攻击。这些问题都不会在编译期报错，只在某个特定数据上炸，排查起来非常费劲。" },
      { p: "本章先讲 Java 自带的序列化机制，弄清它到底写了什么、有哪些坑；再讲 JSON 这种跨语言的文本格式，手写一遍生成和解析，你会明白库到底帮你做了什么；最后给出选型建议和一次完整实战。学完你应该能判断：什么时候能用原生序列化，什么时候必须用 JSON，以及怎么避开前面那些事故。内容看着多，核心概念其实只有四个：对象图、版本、转义、类型丢失。" },
      { h: "6.3 原生序列化上手" },
      { p: "最基础的 API 只有两个类：ObjectOutputStream 的 writeObject 负责写，ObjectInputStream 的 readObject 负责读。它们必须套在字节流上，因为写出来的是二进制。要让一个类可序列化，只要 implements Serializable——这是一个空接口，没有任何方法需要实现，作用只是给 JVM 打个标记。" },
      { p: "先看一个能跑的最小例子。User 是静态内部类，同样实现了 Serializable；password 字段加了 transient，下一节会解释它的作用。" },
      { code: `import java.io.*;

public class SerializeDemo {
    static class User implements Serializable {
        private static final long serialVersionUID = 1L;
        String name;
        int age;
        transient String password;

        User(String name, int age, String password) {
            this.name = name;
            this.age = age;
            this.password = password;
        }

        @Override
        public String toString() {
            return name + "/" + age + "/" + password;
        }
    }

    public static void main(String[] args) throws Exception {
        User u = new User("Tom", 18, "secret");
        try (ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream("user.bin"))) {
            out.writeObject(u);
        }
        try (ObjectInputStream in = new ObjectInputStream(new FileInputStream("user.bin"))) {
            User back = (User) in.readObject();
            System.out.println(back);
        }
    }
}`, title: "SerializeDemo.java" },
      { out: "Tom/18/null" },
      { p: "逐行看：第 5 行声明 serialVersionUID，第 6 到 8 行是三个字段，其中 password 被 transient 修饰。第 21 行创建对象，第 22 行把 FileOutputStream 包进 ObjectOutputStream，交给 try-with-resources 保证关闭；第 23 行 writeObject 把整个对象写进 user.bin。第 25 行反过来读，第 26 行 readObject 返回的是 Object，必须强转成 User。输出 Tom/18/null，说明 password 根本没有被写进文件，读回来只能是 null。" },
      { h: "6.4 Serializable 的规则与常见异常" },
      { p: "规则不多，但每条都能让人卡半天。第一，字段的类型也必须可序列化，否则运行时抛 NotSerializableException，异常信息里就是那个类的全名。第二，如果父类没有实现 Serializable，反序列化时会调用父类的无参构造器来初始化父类那部分字段；父类连无参构造器都没有，就抛 InvalidClassException。第三，枚举天然可序列化，而且反序列化后拿到的一定是同一个常量对象，不是副本。" },
      { list: [
        "NotSerializableException: com.example.Address —— 某个字段的类型没有实现 Serializable，顺着异常里的类名去找引用它的字段。",
        "InvalidClassException: local class incompatible —— 流里的版本号和本地类的版本号不一致，通常是改了类却没有管理 serialVersionUID。",
        "InvalidClassException: no valid constructor —— 不可序列化的父类缺少无参构造器，补一个 protected 无参构造器即可。",
        "ClassNotFoundException —— 反序列化时找不到对应的类，改过包名、换过部署包、或者流来自另一个应用时会出现。",
        "StreamCorruptedException 或 EOFException —— 文件不是序列化数据、写到一半被截断，或者读的次数比写的次数多。"
      ] },
      { p: "还有一个隐蔽的坑：readObject 返回 Object，强转错了抛 ClassCastException 还算好的；如果写和读的顺序不一致，你可能读到另一个类型的对象，报错信息会指向一个完全无关的地方。所以写和读的代码最好放在一起维护，中间不要插字段、不要改顺序。" },
      { p: '集合还有一个高频坑：Arrays.asList 返回的 ArrayList 是 Arrays 的私有内部类，它没有实现 Serializable，直接序列化会抛 NotSerializableException: java.util.Arrays$ArrayList。解决办法是在外面再包一层 new ArrayList&lt;&gt;(list)。List.of 返回的不可变实现同样不可序列化，也需要包一层。' },
      { h: "6.5 serialVersionUID 与版本兼容" },
      { p: "每个可序列化的类都有一个版本号。你不写，编译器在编译时根据类名、字段、方法签名算一个；你写了就用你的。反序列化时，JVM 拿流里的版本号和本地类的版本号比较，不相等就直接拒绝。这正是\"只改了一个字段，老数据全读不出来\"的根源。" },
      { p: "工程上的做法是显式写 private static final long serialVersionUID = 1L;，然后自己管理它的语义：增加字段、删除字段这类兼容改动保持版本号不变，新字段读老数据时得到默认值；改变字段类型、改变类的含义这类不兼容改动才把它加一，同时准备好数据迁移方案。" },
      { note: "版本不一致时，抛出的异常长这样：java.io.InvalidClassException: Model; local class incompatible: stream classdesc serialVersionUID = 1, local class serialVersionUID = 2。前半段是类名，后半段直接告诉你流里的版本和本地版本各是多少，照着这个数字去查是哪次改动漏了兼容处理。" },
      { p: "显式声明还有一个好处：不同编译器算出来的默认值可能不同，同一份代码在开发机和服务器上算出的版本号不一致，就会出现\"本地好好的，线上读不了\"。这不是段子，而是老项目升级 JDK 时的经典事故。所以哪怕你从不改类，也建议写上。" },
      { p: '补充一句：serialVersionUID 必须是 static final long。写成 int，或者漏掉 static，编译器都不会报错，但它会被当成普通字段，完全起不到版本控制的作用，还会让人误以为兼容性已经处理好了，这种“看起来对”的代码比明显缺失更危险。' },
      { h: "6.6 transient、static 与构造器" },
      { p: "transient 的意思是\"这个字段不参与序列化\"，适合存密码、数据库连接、可以重新计算的缓存这类数据。读回来时它是默认值：对象是 null，数字是 0，布尔是 false。static 字段本来就不属于某个对象，而是属于类，所以也不会被序列化——反序列化根本不会碰它。" },
      { p: "还有一个容易被忽略的细节：反序列化不会调用构造器。对象是 JVM 直接在堆上创建、再按流里的数据填字段的，所以构造器里的初始化逻辑、校验逻辑都不会执行。这既是性能优势，也是陷阱：如果你的构造器负责给 transient 字段赋初值，读回来之后那些字段仍然是默认值。" },
      { code: `import java.io.*;

public class TransientDemo {
    static class Config implements Serializable {
        private static final long serialVersionUID = 2L;
        String name = "default";
        transient int retry = 3;
        static String env = "dev";

        Config() {
            System.out.println("构造器被调用");
        }
    }

    public static void main(String[] args) throws Exception {
        Config c = new Config();
        c.name = "prod";
        c.retry = 9;
        Config.env = "online";

        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(buf)) {
            out.writeObject(c);
        }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(buf.toByteArray()))) {
            Config back = (Config) in.readObject();
            System.out.println(back.name + " " + back.retry);
        }
    }
}`, title: "TransientDemo.java" },
      { out: "构造器被调用\nprod 0" },
      { p: "输出第一行\"构造器被调用\"只在创建对象时打印了一次，反序列化没有触发它。第二行 prod 0 说明 name 恢复了，而 retry 因为是 transient 变成了 0，尽管当初赋的是 9。static 的 env 在同一个 JVM 里仍然是 online，但它压根没被写进流；换一个 JVM 读这份数据，env 会是 dev。" },
      { h: "6.7 原生序列化的问题" },
      { p: "原生序列化用起来简单，但工程上的问题不少，这也是为什么现代项目几乎只用它做本地缓存或者进程内传递。了解这些缺点，比记住 API 更重要。" },
      { list: [
        "体积大：流里带着完整的类名、字段名、类型描述，同样的数据比 JSON 大一倍很常见。",
        "不跨语言：格式是 Java 私有的，Python、Go、前端都读不了，微服务里混用语言时直接出局。",
        "版本脆弱：类结构一变就可能读不出来，各服务版本不一致时尤其麻烦。",
        "有安全风险：反序列化会按流里的类名加载类并执行 readObject，攻击者可以构造恶意流触发任意代码执行，这是 Java 历史上最严重的一类漏洞。",
        "不可读：二进制，出问题时没法直接打开看，只能写程序一点点调试。"
      ] },
      { p: "如果一定要用，至少做三件事：只反序列化可信来源的数据，绝不接受外部直接传来的字节；用 ObjectInputFilter 限制允许反序列化的类（Java 9 及以上）；给每个类显式写 serialVersionUID。对外提供的接口一律用 JSON 这类文本格式，不要把原生序列化的字节当成协议。" },
      { h: "6.8 JSON 的基本语法" },
      { p: "JSON 只有六种值：对象、数组、字符串、数字、布尔和 null。对象用花括号，里面是键值对，键和值用冒号分隔，多个键值对用逗号分隔；数组用方括号，元素按顺序排列。它没有注释、没有日期类型、没有二进制类型，也没有\"这个对象是什么类\"的概念——一切靠使用方约定。" },
      { p: "语法上有几条硬规则，违反了就是解析失败：键必须是双引号字符串，不能用单引号；字符串里的双引号、反斜杠、换行、制表符必须转义；最后一个元素后面不能有逗号；true、false、null 必须小写；数字不能有前导零，也不能是 NaN 或 Infinity。" },
      { table: { head: ["类型", "示例", "说明"], rows: [
        ["对象", "{\"id\":\"A1\",\"n\":2}", "键必须是双引号字符串，逗号分隔，不能有尾逗号"],
        ["数组", "[1,2,3] 或 [{\"id\":\"A1\"}]", "有序，元素类型可以不同，可以嵌套"],
        ["字符串", "\"hello\"", "必须双引号，内部的双引号写成反斜杠加引号"],
        ["数字", "18、-3.5、1e3", "不区分整数和浮点，规范不允许 NaN 和 Infinity"],
        ["布尔", "true / false", "必须小写，写成 True 会解析失败"],
        ["空值", "null", "表示\"没有值\"，和\"字段不存在\"含义不同"]
      ] } },
      { p: "JSON 和 Java 对象之间的对应关系是约定而不是规范。同一个字段，Java 里叫 userName，JSON 里可能叫 user_name；Java 的 LocalDate，JSON 里可能写成 \"2026-10-20\"，也可能写成时间戳。跨团队对接时这些约定要写进接口文档，不能靠猜；猜错的表现往往是\"字段一直是 null\"，而不是报错。" },
      { h: "6.9 手写 JSON：生成、转义与为什么不该自己写" },
      { p: "生成 JSON 的核心不是拼字符串，而是转义。只要某个字段里出现双引号或换行，拼出来的就不是合法 JSON，解析方会直接报错。更隐蔽的是控制字符，比如制表符，肉眼看不出，却让整段 JSON 非法。所以任何\"我自己拼一下\"的方案，都必须先有一个靠谱的转义函数。" },
      { p: "下面这段代码手写了转义函数，用字符的数值做判断，避免在源码里堆一堆反斜杠。" },
      { code: `public class MiniJson {
    static String esc(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case 34: sb.append("\\\\\\""); break;
                case 92: sb.append("\\\\\\\\"); break;
                case 10: sb.append("\\\\n"); break;
                case 13: sb.append("\\\\r"); break;
                case 9:  sb.append("\\\\t"); break;
                default:
                    if (c < 32) sb.append(String.format("\\\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String raw = "他说\\"你好\\"\\n换行";
        String json = "{\\"name\\":\\"" + esc(raw) + "\\",\\"age\\":18,\\"vip\\":true}";
        System.out.println(json);
    }
}`, title: "MiniJson.java" },
      { out: "{\"name\":\"他说\\\"你好\\\"\\n换行\",\"age\":18,\"vip\":true}" },
      { p: "第 4 行遍历每个字符。34 是双引号，92 是反斜杠，10、13、9 分别是换行、回车、制表符，这五个必须转义；小于 32 的其他控制字符统一写成反斜杠加 u 加四位十六进制。输出里你能看到双引号变成了反斜杠加引号，换行变成了反斜杠加 n，这才是合法的 JSON 文本。注意这是打印出来的字面文本，用编辑器打开文件看到的也是这个。" },
      { p: '实际项目里不要长期手写这些。拼 JSON 的代码一多，就会出现“某个分支忘了转义”“数字被拼成了字符串”“null 被拼成字面量”这类问题，而且很难测。用 Jackson 的 ObjectNode，或者直接序列化对象，让库负责转义和类型，是更省心的选择；手写只适合极简场景和教学。' },
      { p: "解析比生成难得多。生成只要保证输出合法；解析要处理嵌套、空白、转义、数字格式、错误位置，还要决定\"这个数字是 int 还是 double\"\"这个对象映射成哪个类\"。规范里的边界情况很多：指数形式的数字、代理对、深层嵌套导致的栈溢出、重复键该保留哪个。" },
      { p: "下面是一个\"只够用\"的解析器，能处理扁平对象、字符串、数字、布尔和 null；遇到嵌套对象或者反斜杠加 u 的转义就会露馅。写它的目的不是让你用在项目里，而是让你体会库帮你承担了多少工作。" },
      { code: `import java.util.*;

public class MiniJsonParser {
    private final String s;
    private int i = 0;

    MiniJsonParser(String s) { this.s = s; }

    Map<String, Object> parseObject() {
        Map<String, Object> map = new LinkedHashMap<>();
        expect('{');
        skipWs();
        if (peek() == '}') { i++; return map; }
        while (true) {
            skipWs();
            String key = parseString();
            skipWs();
            expect(':');
            skipWs();
            map.put(key, parseValue());
            skipWs();
            char c = next();
            if (c == '}') return map;
            if (c != ',') throw new IllegalArgumentException("位置 " + i + " 期望逗号或右括号");
        }
    }

    Object parseValue() {
        char c = peek();
        if (c == '"') return parseString();
        if (c == 't') { i += 4; return Boolean.TRUE; }
        if (c == 'f') { i += 5; return Boolean.FALSE; }
        if (c == 'n') { i += 4; return null; }
        return parseNumber();
    }

    String parseString() {
        expect('"');
        StringBuilder sb = new StringBuilder();
        while (true) {
            char c = next();
            if (c == '"') return sb.toString();
            if (c == '\\\\') sb.append(next());
            else sb.append(c);
        }
    }

    Double parseNumber() {
        int start = i;
        while (i < s.length() && "+-.eE0123456789".indexOf(s.charAt(i)) >= 0) i++;
        return Double.parseDouble(s.substring(start, i));
    }

    void skipWs() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
    char peek() { return s.charAt(i); }
    char next() { return s.charAt(i++); }

    void expect(char c) {
        if (next() != c) throw new IllegalArgumentException("位置 " + (i - 1) + " 期望 " + c);
    }

    public static void main(String[] args) {
        String json = "{\\"id\\":\\"A100\\",\\"amount\\":120,\\"vip\\":true}";
        Map<String, Object> m = new MiniJsonParser(json).parseObject();
        System.out.println(m);
        System.out.println(m.get("amount").getClass().getSimpleName());
    }
}`, title: "MiniJsonParser.java" },
      { out: "{id=A100, amount=120.0, vip=true}\nDouble" },
      { p: "输出里 amount 是 120.0 而不是 120，因为所有数字都被当成了 Double；这就是手写解析器最典型的妥协。真实项目请直接用 Jackson 或 Gson：它们处理了几十种边界情况，做了性能优化，还能把 JSON 直接映射成你的类。" },
      { h: "6.10 用 Jackson 读写 JSON" },
      { p: "Jackson 是 Java 生态里最常用的 JSON 库，入口类是 ObjectMapper。它线程安全，可以全局复用一个实例：写用 writeValueAsString，读用 readValue(json, 类.class)。字段可以是 public，也可以是 private 加 getter/setter；类没有无参构造器时，用 @JsonCreator 标注构造器并给参数加 @JsonProperty。" },
      { p: "一个最小例子（需要在 pom.xml 里引入 jackson-databind）：" },
      { p: '依赖坐标是 com.fasterxml.jackson.core:jackson-databind，它会自动带上 core 和 annotations。Spring Boot 项目里已经内置，直接用即可，不需要自己声明版本；普通 Maven 项目则要注意三个包的版本保持一致，版本错配时运行期会报 NoSuchMethodError。' },
      { p: 'Jackson 2.10 之后推荐用 JsonMapper.builder() 构造实例，代替直接 new ObjectMapper()：配置项集中在一处，读代码的人一眼就能看出开启了哪些特性，也不容易在构造之后漏配。' },
      { code: `import com.fasterxml.jackson.databind.ObjectMapper;

public class JacksonDemo {
    public static class Order {
        public String id;
        public int amount;
    }

    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = "{\\"id\\":\\"A100\\",\\"amount\\":120}";
        Order order = mapper.readValue(json, Order.class);
        System.out.println(order.id + " " + order.amount);
        System.out.println(mapper.writeValueAsString(order));
    }
}`, title: "JacksonDemo.java" },
      { out: "A100 120\n{\"id\":\"A100\",\"amount\":120}" },
      { note: "ObjectMapper 不要每次用都 new。它的创建成本不低，内部维护着序列化器的缓存；在 Web 项目里通常注册成单例 Bean。另外它默认遇到未知字段会抛 UnrecognizedPropertyException，对接第三方接口时这个行为经常需要关掉，否则对方加一个字段你就挂了。" },
      { p: "除了表里这些，还有两个高频问题。字段名不一致时用 @JsonProperty(\"user_name\") 显式映射，别指望自动转换。对象之间有循环引用（订单里有用户，用户里又有订单列表）时，序列化会无限递归直到栈溢出，解决办法是只序列化对方的 ID，或者用 @JsonIgnore 打断其中一边。" },
      { table: { head: ["现象", "原因", "处理"], rows: [
        ["大整数末位变成 0", "JSON 数字在 JS 里是双精度浮点，超过 2 的 53 次方就不精确", "金额、长 ID 用字符串传输，或用 BigDecimal 并约定格式"],
        ["日期解析失败", "JSON 没有日期类型，各库默认格式不同", "统一用 ISO-8601 字符串，显式配置格式"],
        ["序列化时栈溢出", "对象之间有循环引用", "只传 ID，或用 @JsonIgnore 打断环"],
        ["对方加字段就报错", "Jackson 默认对未知字段抛异常", "配置 FAIL_ON_UNKNOWN_PROPERTIES 为 false"],
        ["中文变问号", "读写时用了平台默认编码", "两端都显式指定 UTF-8"]
      ] } },
      { h: "6.11 选型与一次完整实战" },
      { p: "选型没有绝对答案，看数据要不要跨语言、要不要人读、对体积和性能的要求有多高。" },
      { table: { head: ["方案", "优点", "缺点", "适用场景"], rows: [
        ["Java 原生序列化", "零依赖，几行代码就能用", "体积大、不跨语言、有安全风险", "本地缓存、进程内传递，且数据可信"],
        ["JSON", "可读、跨语言、生态成熟", "体积偏大、没有类型系统、精度要注意", "接口传输、配置文件、日志"],
        ["Protobuf 等二进制格式", "体积小、解析快、有 schema 约束", "需要编译工具链，人不可读", "服务间高频调用、对性能敏感"],
        ["数据库或对象存储", "持久化与查询能力成熟", "引入外部依赖和运维成本", "需要长期保存的核心数据"]
      ] } },
      { p: "最后用一个小实战收尾：把订单列表写成 JSON 文件，再读回来。这里手写拼装是为了不引入依赖，真实项目请直接用 Jackson。" },
      { code: `import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class OrderJsonDemo {
    static class Order {
        final String id;
        final int amount;
        Order(String id, int amount) { this.id = id; this.amount = amount; }
    }

    static String toJson(List<Order> orders) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < orders.size(); i++) {
            if (i > 0) sb.append(',');
            Order o = orders.get(i);
            sb.append("{\\"id\\":\\"").append(o.id).append("\\",\\"amount\\":").append(o.amount).append('}');
        }
        return sb.append(']').toString();
    }

    public static void main(String[] args) throws Exception {
        List<Order> orders = List.of(new Order("A100", 120), new Order("A200", 80));
        Path file = Files.createTempFile("orders", ".json");
        Files.writeString(file, toJson(orders), StandardCharsets.UTF_8);
        System.out.println(Files.readString(file, StandardCharsets.UTF_8));
        System.out.println(Files.size(file));
        Files.delete(file);
    }
}`, title: "OrderJsonDemo.java" },
      { out: "[{\"id\":\"A100\",\"amount\":120},{\"id\":\"A200\",\"amount\":80}]\n54" },
      { p: "第 11 行 toJson 在循环里用逗号分隔，保证最后一个元素后面不会多出逗号，这正是 JSON 不允许的尾逗号。第 22 行创建临时文件，第 23 行显式用 UTF-8 写入，第 24 行读回并打印，第 25 行打印字节数 54，最后删除临时文件。放到真实项目里还要考虑：写一半进程挂了怎么办（先写临时文件再原子改名）、并发写同一个文件怎么办（加锁）、数据量大怎么办（流式写，不要整个拼成字符串）。" },
      { h: "6.12 本章小结" },
      { list: [
        "序列化是把对象图翻译成字节或文本，反序列化是按同样的规则重建对象；得到的是副本，不是原对象。",
        "原生序列化只要 implements Serializable，配合 ObjectOutputStream 和 ObjectInputStream 就能用。",
        "serialVersionUID 决定版本兼容性；不显式声明时由编译器计算，改类就可能读不出老数据。",
        "transient 字段和 static 字段不参与序列化；反序列化不调用构造器，transient 字段是默认值。",
        "原生序列化有体积、跨语言、版本和安全四方面的问题，对外一律不要用。",
        "JSON 只有六种值，转义是生成的核心，解析则应该交给 Jackson、Gson 这类成熟库。"
      ] },
      { h: "6.13 常见追问" },
      { list: [
        "问：Serializable 是空接口，为什么实现了就能序列化？答：它只是标记，JVM 在序列化时会检查这个标记，通过了才允许写入；真正的读写逻辑在 ObjectOutputStream 和 ObjectInputStream 里。",
        "问：既然反序列化不调用构造器，那字段校验怎么办？答：在类里写一个 private void readObject(ObjectInputStream in) 方法，先调用 in.defaultReadObject() 再自己做校验，这是标准做法。",
        "问：transient 和 static 有什么区别？答：transient 修饰实例字段，表示这个字段不写进流；static 字段属于类，本来就不写。两者读回来都不会恢复你期望的值。",
        "问：JSON 里的 null 和字段缺失一样吗？答：不一样。null 表示这个键存在但值是空；缺失表示这个键根本没有。Jackson 里可以用 @JsonInclude 控制是否输出 null。",
        "问：为什么金额不建议用 double？答：二进制浮点无法精确表示 0.1 这类十进制小数，累加会积累误差；用 BigDecimal，或者干脆用\"分\"为单位的整数。",
        "问：原生序列化真的不能用吗？答：可以用在可信的、同版本的本地缓存场景；只要数据会跨进程、跨语言、跨版本，或者来源不可信，就换成 JSON 或二进制协议。"
      ] },
      { h: "6.14 自测与练习" },
      { ol: [
        "写一个类实现 Serializable，把对象写入文件再读回来，打印每个字段，确认值一致。",
        "给上面的类加一个 transient 字段和一个 static 字段，观察读回来之后它们分别是什么值。",
        "把 serialVersionUID 从 1 改成 2，用旧文件反序列化，读出完整的异常信息并解释每一部分的含义。",
        "手写一个 JSON 转义函数，让它正确处理双引号、反斜杠、换行和制表符，并用一段含特殊字符的文本验证。",
        "用 Jackson 把一个 List 写进文件再读回来，然后故意在 JSON 里加一个不存在的字段，观察异常并关掉对应配置。",
        "设计一个订单与用户的 JSON 结构，要求不出现循环引用，写出对应的 Java 类并说明每个字段为什么这样设计。"
      ] }
    ]
  };
})();
