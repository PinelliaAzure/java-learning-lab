/* 教材正文：String / StringBuilder 与包装类 / 日期时间 / 正则 / 数组工具 / 现代 Java */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['string'] = {
    meta: '本章约 5600 字 · 建议 32 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '1.1 为什么把 String 学透' },
      { p: '如果只能挑一个类反复研究，多数 Java 工程师会选 <code>String</code>。它出现在每一行日志、每一个接口参数、每一份配置文件里；它也几乎出现在每一场初级面试里：为什么不可变、常量池缓存了什么、<code>==</code> 和 <code>equals</code> 有什么区别、循环里用加号拼接为什么被批评。' },
      { p: '这些问题看似零散，背后其实是同一套机制：<b>对象在哪里创建、引用指向哪里、内容什么时候被复制</b>。把这套机制弄明白，你再看 StringBuilder、包装类、甚至 JSON 序列化，都会顺很多。这一章我们不背结论，而是从内存模型出发，一步步把 String 的行为推出来。' },
      { p: '学习时请准备一个可以运行代码的环境。文中每一段代码都尽量给出可预期的输出，你可以先猜结果，再运行验证。凡是和你直觉不一致的地方，就是这一章真正要讲清楚的地方。' },

      { h: '1.2 String 的结构与不可变' },
      { p: '从类型上看，<code>String</code> 是一个被 <code>final</code> 修饰的普通类，位于 <code>java.lang</code> 包，实现了 <code>CharSequence</code>、<code>Comparable&lt;String&gt;</code> 和 <code>Serializable</code>。它不是基本类型，而是一个实实在在的对象；所谓“字符串字面量”，只是编译器帮你创建对象的一种简写。' },
      { p: '从存储上看，JDK 8 及以前，String 内部是一个 <code>private final char[] value</code>，每个字符占两个字节；JDK 9 引入紧凑字符串（Compact Strings）之后，改成了 <code>private final byte[] value</code> 加一个 <code>byte coder</code> 标记：内容全是 Latin-1 字符时每字符只占一个字节，含中文等字符时才用 UTF-16 每字符两个字节。这个优化对使用者透明，但解释了为什么同样长度的英文和中文串占用的内存不一样。' },
      { p: '需要记住的是：无论内部是 char[] 还是 byte[]，它都是 <b>private final</b> 的，外部拿不到这个数组的引用，类里也没有任何方法会修改数组内容。这两点合起来，就是“不可变”的全部秘密。' },

      { p: '不可变不是靠一个 <code>final</code> 关键字就完成的，它需要三道锁。第一道，类本身是 final，别人不能写子类去覆盖方法、绕开限制；第二道，内部数组是 private final，外部无法直接拿到并修改；第三道，所有看起来像“修改”的方法（<code>substring</code>、<code>replace</code>、<code>toUpperCase</code>、<code>concat</code>）都返回一个全新的 String，原对象一个字节都不动。' },
      { p: '还有一个容易被忽略的细节：构造器传入 <code>char[]</code> 时，String 会把数组内容复制一份，而不是直接持有调用者的数组。否则调用者回头改数组，字符串内容就跟着变了。这种“防御性复制”在 JDK 里随处可见，也是不可变承诺的一部分。' },
      { code: 'public class ImmutableDemo {\n    public static void main(String[] args) {\n        String a = "Java";\n        String b = a.toUpperCase();\n        String c = a.replace("J", "K");\n        System.out.println(a);\n        System.out.println(b);\n        System.out.println(c);\n        System.out.println(a == b);\n    }\n}', title: 'ImmutableDemo.java' },
      { out: 'Java\nJAVA\nKava\nfalse' },
      { p: '输出里 a 始终是 Java，说明 toUpperCase 和 replace 都没有改动它；a == b 为 false，说明 b 是一个新对象。理解这一点，你就能解释为什么“把字符串传进方法里改不了原值”——方法拿到的是引用副本，而 String 本身不允许改。' },
      { p: '不可变带来四个直接好处：可以安全地被多个线程共享，不需要加锁；可以缓存 <code>hashCode</code>，作为 HashMap 的 key 时不必每次重算；可以放心地把同一个对象复用给多个调用方，省内存；作为类名、文件路径、SQL 片段时不会被中途篡改，安全性更好。代价也很明确：每次修改都要复制一份，频繁修改时开销很大，这正是 StringBuilder 存在的理由。' },
      { p: '举个共享的例子：一个订单状态字段在内存里可能被上千个订单对象引用，但它们指向的是同一个 <code>"PAID"</code> 字符串对象。因为谁都改不了它，所以不需要为每个订单复制一份，也不担心某个模块把它改成 <code>"PAID "</code> 导致别处判断失败。如果没有不可变这个前提，任何共享都需要加锁或复制，成本会高得多。' },
      { p: '再看不方便的代价：把 <code>"abc"</code> 改成 <code>"abd"</code>，你需要创建一个新对象并把前两个字符也复制过去；如果在一个长文本上做几十次替换，就会产生几十个中间对象。理解这个成本模型，你就能在“可读性”和“性能”之间做出有依据的选择，而不是背一句“字符串拼接要用 StringBuilder”却说不清为什么。' },
      { note: '<b>常见误解：</b>“给 String 变量重新赋值就是修改字符串。”——不是。你只是让变量指向了另一个对象，旧对象仍在堆上，直到没人引用才被回收。' },

      { h: '1.3 字符串常量池是什么' },
      { p: '常量池（String Pool，也叫 StringTable）是 JVM 维护的一张表，用来复用内容相同的字符串。它的目标很朴素：程序里大量重复的类名、字段名、状态值如果每个都单独建对象，内存浪费会非常惊人。' },
      { p: '当你在源码里写 <code>"Java"</code> 这样的字面量，编译器会把它记录进 class 文件的常量池。类加载到“解析”阶段时，JVM 会拿这个字面量去 StringTable 里查：有相同内容就直接复用已有对象的引用，没有才在堆上创建一个新对象并登记进去。所以同一个类里写十次 <code>"Java"</code>，运行时只有一个对象。' },
      { flow: ['源码字面量', '写入 class 常量池', '类加载解析', '查 StringTable', '命中则复用', '未命中则创建并登记'] },
      { p: '常量池的位置随版本变过：JDK 6 及以前在永久代（PermGen），JDK 7 起搬到了堆里，JDK 8 取消永久代后依然在堆中。这个变化有现实影响：常量池里的字符串现在也受堆大小限制，大量 intern 可能把堆撑爆，而不是像以前那样报永久代溢出。' },
      { p: '另外要区分两个概念：常量池里存的是“字符串对象”，而 class 文件常量池里存的只是“字面量的符号”。前者是运行时堆中的对象，后者是编译产物中的记录，二者通过类加载过程连接起来。' },

      { h: '1.4 创建字符串的几种方式' },
      { p: '创建 String 的写法很多，但对象数量差别很大。下面这张表是本章最值得背下来的一张表，面试和排错都用得上。' },
      { table: { head: ['写法', '对象数量', '是否进入常量池'], rows: [
        ['<code>"Java"</code>', '0 或 1 个', '是，复用池中对象'],
        ['<code>new String("Java")</code>', '1 或 2 个', '字面量进池，新对象只在堆'],
        ['<code>new String(char[])</code>', '1 个', '否'],
        ['<code>"Ja" + "va"</code>', '等同字面量', '是，编译期已折叠'],
        ['<code>sb.toString()</code>', '1 个', '否'],
        ['<code>s.intern()</code>', '0 或 1 个', '返回池中引用']
      ] } },
      { p: '为什么 <code>new String("Java")</code> 可能创建两个对象？因为参数本身是字面量 <code>"Java"</code>，它要先按字面量规则进常量池（如果池里没有就创建一个），然后 <code>new</code> 再在堆上复制内容创建一个新对象。如果池里已经有 <code>"Java"</code>，字面量那一步就只是取引用，最终只新增一个堆对象。' },
      { p: '实际写代码时没有必要用 <code>new String("...")</code>，它除了多创建一个对象没有任何好处。唯一常见的正当场景是需要一个“内容相同但地址不同”的对象来做演示或测试，生产代码里应直接使用字面量。' },
      { code: 'public class CreateDemo {\n    public static void main(String[] args) {\n        String a = "Java";\n        String b = "Java";\n        String c = new String("Java");\n        String d = new String(new char[]{\'J\', \'a\', \'v\', \'a\'});\n\n        System.out.println(a == b);\n        System.out.println(a == c);\n        System.out.println(a == d);\n        System.out.println(a.equals(c));\n    }\n}', title: 'CreateDemo.java' },
      { out: 'true\nfalse\nfalse\ntrue' },
      { p: 'a 和 b 都是字面量，指向池中同一个对象，所以是 true；c 是 new 出来的堆对象，地址不同；d 由字符数组构造，也不可能等于池中对象。最后一行 equals 为 true，因为四个字符完全一样。' },

      { h: '1.5 ==、equals 与常量折叠' },
      { p: '<code>==</code> 对于引用类型永远比较“是不是同一个对象”，也就是地址；<code>equals</code> 是 Object 定义的方法，默认实现同样比较地址，但 String 重写了它，改成逐字符比较内容。所以判断字符串内容是否相等，必须用 equals，不能用 ==。' },
      { p: '一个常被追问的细节是：为什么有时候 <code>==</code> 又恰好是 true？因为两个字面量指向池中同一对象，或者编译期常量折叠让它们变成同一个字面量。这种 true 是“恰好”，不是“保证”，一旦其中一边来自用户输入、数据库或网络，结果就会变成 false。依赖 == 判断内容，是典型的不稳定代码。' },
      { p: '写 equals 时把常量放在前面，例如 <code>"admin".equals(role)</code>，可以避免 role 为 null 时抛空指针。反过来，如果确定变量不为 null，<code>role.equals("admin")</code> 也可以，但前者更稳。需要忽略大小写时用 <code>equalsIgnoreCase</code>，不要自己先转小写再比，土耳其语等场景下大小写转换有坑。' },
      { p: '作为对比，<code>new String("java")</code> 得到的对象地址与字面量不同，所以 <code>fromDb == "java"</code> 是 false，而 <code>fromDb.equals("java")</code> 是 true。这里的关键不是记住哪一行输出什么，而是养成习惯：只要目的是判断内容，就写 equals；想判断“是不是同一个对象”，才用 ==。' },

      { p: '编译器有一个优化叫常量折叠：如果表达式的每个部分都是编译期常量，它会在编译阶段直接把结果算出来，写进 class 文件。字符串的加号也适用这条规则。' },
      { p: '什么样的变量算“常量变量”？基本类型或 String 类型、用 final 修饰、并且在声明时用常量表达式初始化。满足这三条，它在使用处会被当成字面量参与折叠。注意 final 只是必要条件之一，如果是 <code>final String s = getValue();</code> 这种运行时才确定的值，就不参与折叠。' },
      { code: 'public class FoldDemo {\n    static final String A = "Ja";\n\n    public static void main(String[] args) {\n        String b = A + "va";\n        String c = "Ja" + "va";\n\n        String x = "Ja";\n        String d = x + "va";\n\n        System.out.println(b == "Java");\n        System.out.println(c == "Java");\n        System.out.println(d == "Java");\n        System.out.println(d.equals("Java"));\n    }\n}', title: 'FoldDemo.java' },
      { out: 'true\ntrue\nfalse\ntrue' },
      { p: 'A 是 static final 且用字面量初始化，所以 <code>A + "va"</code> 在编译期就变成了 <code>"Java"</code>，b 直接指向池中对象；c 更是纯字面量相加，同样被折叠。x 没有 final，编译器不能假设它永远不变，只能在运行时用字符串拼接生成新对象，所以 d 的地址和池中对象不同。' },
      { p: '这个机制解释了很多“玄学”：为什么有的常量拼接能用 ==，有的不能；为什么把变量改成 final 之后行为变了。它不是 JVM 的随机行为，而是编译期优化与运行期对象创建的边界。' },

      { h: '1.6 intern() 的用途与代价' },
      { p: '<code>intern()</code> 的作用是“把当前字符串的内容登记到常量池，并返回池中那个规范对象”。如果池里已经有内容相同的字符串，直接返回池中引用；如果没有，就把当前对象放进池里（JDK 7 起是记录引用，不再复制内容）并返回它。' },
      { p: '它最典型的用途是节省内存：假设你要解析百万行日志，其中状态字段只有几十种取值，每个取值都 new 一个字符串会浪费大量内存；对状态值调用 intern，相同的值就共享同一个对象。另一个用途是让比较变快：已经 intern 过的字符串可以用 == 比较，省掉逐字符比较。但前提是你百分之百确定所有参与比较的字符串都 intern 过，否则会得到错误结果。' },
      { p: '代价也要说清楚：intern 需要查表，比普通创建慢；表的容量有限（可用 <code>-XX:StringTableSize</code> 调整），大量不同的字符串都塞进去会让查找变慢、内存升高。所以不要对用户输入、随机 ID 这类几乎不重复的字符串调用 intern，那是反效果。' },
      { code: 'String a = new String("Java");\nString b = a.intern();\nSystem.out.println(a == "Java");\nSystem.out.println(b == "Java");\n\nString c = (\"Ja\" + \"va\").intern();\nSystem.out.println(c == "Java");', title: 'InternDemo.java' },
      { out: 'false\ntrue\ntrue' },
      { p: 'a 是堆上的新对象，所以第一个 false；intern 返回池中对象，所以 b 与字面量相等。第三段演示了一个常见写法：先把动态拼接的结果 intern，再与字面量比较。再次提醒，这种写法只在“确实需要规范化”时使用，不要为了炫技而用。' },
      { note: '<b>性能提醒：</b>intern 的价值来自“重复率高”。如果每个字符串都不一样，intern 只会增加哈希查找和常量池占用，不会省内存。' },

      { h: '1.7 常用 API 分组记忆' },
      { p: 'String 的方法很多，死记没有意义，按“我在做什么”分成五组就好：查询信息、截取片段、转换大小写或空白、比较内容、与其他类型互转。查 API 时先想清楚属于哪一组，再去对应的方法名里找。' },
      { p: 'JDK 的版本演进也值得留意：JDK 11 增加了 isBlank、strip、repeat 和 lines，JDK 15 增加了 formatted 实例方法，JDK 12 增加了 indent 和 transform。这些方法不改变底层语义，但能让代码短很多。看到陌生方法时先查它从哪个版本开始提供，避免在低版本项目里写出编译不过的代码。' },
      { table: { head: ['用途', '代表方法', '注意点'], rows: [
        ['长度与字符', '<code>length</code>、<code>charAt</code>、<code>codePointCount</code>', 'length 数的是 UTF-16 单元，不是“字数”'],
        ['查找', '<code>indexOf</code>、<code>lastIndexOf</code>、<code>contains</code>、<code>startsWith</code>', '找不到返回 -1，不会抛异常'],
        ['截取', '<code>substring(begin, end)</code>', 'end 不含，越界抛 StringIndexOutOfBoundsException'],
        ['变换', '<code>toUpperCase</code>、<code>trim</code>、<code>strip</code>、<code>replace</code>、<code>repeat</code>', '全部返回新对象；strip 是 JDK 11 新增'],
        ['比较', '<code>equals</code>、<code>equalsIgnoreCase</code>、<code>compareTo</code>', 'compareTo 按 UTF-16 码元排序，不是按拼音'],
        ['转换', '<code>toCharArray</code>、<code>getBytes</code>、<code>valueOf</code>、<code>join</code>', 'getBytes 要显式指定字符集']
      ] } },
      { p: '以 <code>"  Order-2024-001  "</code> 为例：strip 之后长度是 16；<code>substring(0, 5)</code> 取下标 0 到 4，正好是 Order；<code>indexOf("2024")</code> 返回 6；<code>replace("Order", "SO")</code> 得到 SO-2024-001，因为 replace 是字面替换不是正则。<code>String.join("/", "2024", "10", "20")</code> 得到 2024/10/20，<code>"ab".repeat(3)</code> 得到 ababab。这些结果建议亲手跑一遍，确认每个下标和返回值。' },
      { p: '还有两个容易忽略的点：<code>compareTo</code> 返回的是第一个不同字符的码元差值，不要拿它当“长度差”；<code>matches</code> 要求整个字符串匹配正则，只想找子串要用 Pattern 和 Matcher。这些在正则一章还会展开。' },

      { h: '1.8 拼接：加号背后发生了什么' },
      { p: '在 Java 里写 <code>a + b</code>，编译器不会真的“把两个字符串粘起来”。JDK 8 及以前，它会生成一个 StringBuilder，依次 append 再 toString；JDK 9 起改用 <code>invokedynamic</code> 加 StringConcatFactory，由运行时选择最优的拼接策略。无论哪种，结果都是一个新 String。' },
      { p: '单次拼接无所谓，循环里拼接才是灾难。假设循环 n 次，每次都执行 <code>s = s + i</code>，第 k 次都要把前面 k-1 个字符复制一遍，总复制量是 1+2+...+n，也就是 O(n²)。数据量一大，耗时会呈平方级增长，还可能产生大量垃圾对象。' },
      { code: 'String s = "";\nfor (int i = 0; i < 5; i++) {\n    s = s + i;\n}\nSystem.out.println(s);\n\nString t = s;\ns = s + "!";\nSystem.out.println(t);\nSystem.out.println(s == t);', title: 'ConcatDemo.java' },
      { out: '01234\n01234\nfalse' },
      { p: '循环结束后 s 是 01234；把 s 赋给 t 再拼接，t 仍然是 01234，说明拼接产生的是新对象，t 没有被修改；s == t 为 false，进一步印证了地址不同。' },
      { p: '正确的做法是：循环内用 StringBuilder 的 append；已知一组元素要拼接时用 <code>String.join</code>；格式化输出用 <code>String.format</code> 或 <code>formatted</code>（JDK 15+）。只有在极少数需要可读性的地方，单次加号拼接才是可以接受的。' },
      { note: '<b>编译器救不了你：</b>即使 JDK 9+ 的 indy 拼接更快，循环里每次仍然要生成新字符串并复制已有内容，复杂度依旧是平方级。' },

      { h: '1.9 空串、null 与空白串' },
      { p: '这是业务代码里最高频的三类“空”：<code>null</code> 表示没有对象；<code>""</code> 表示长度为零的字符串对象；<code>"   "</code> 表示全是空白的字符串。三者语义不同，处理方式也不同，混用会导致空指针或校验漏洞。' },
      { table: { head: ['值', 'length()', 'isEmpty()', 'isBlank()', '能否直接调方法'], rows: [
        ['<code>null</code>', '抛 NPE', '抛 NPE', '抛 NPE', '不能'],
        ['<code>""</code>', '0', 'true', 'true', '能'],
        ['<code>"  "</code>', '2', 'false', 'true', '能']
      ] } },
      { p: '推荐的判断顺序是先判 null 再判空白：<code>if (s == null || s.isBlank())</code>。如果不想写这个判断，可以用 <code>"".equals(s)</code> 这种常量在前的写法来判空串，但它不能识别全空白。Spring 等框架提供了工具方法，但在基础阶段，自己写清楚反而更可靠。' },
      { p: '还要区分 <code>trim</code> 和 <code>strip</code>：trim 只去掉码值小于等于 U+0020 的字符，strip 依据 <code>Character.isWhitespace</code> 判断，能处理全角空格 U+3000、不换行空格等 Unicode 空白。处理用户输入时优先用 strip，尤其是中文环境。' },
      { code: 'String a = null;\nString b = "";\nString c = " \\u3000 ";\n\nSystem.out.println(b.isEmpty());\nSystem.out.println(b.isBlank());\nSystem.out.println(c.trim().length());\nSystem.out.println(c.strip().length());\nSystem.out.println(a == null || a.isBlank());', title: 'BlankDemo.java' },
      { out: 'true\ntrue\n1\n0\ntrue' },
      { p: 'c 里有一个半角空格和一个全角空格，trim 只去掉了半角空格，长度还剩 1；strip 把两个都去掉了，长度为 0。最后一行演示短路求值：a 为 null 时直接为 true，不会执行后面的 isBlank，所以不会抛异常。' },

      { h: '1.10 length 与码点：emoji 的坑' },
      { p: 'String 的 length 返回的是 UTF-16 码元个数，不是人类理解的“字符数”。基本多文种平面（BMP）内的字符一个码元就够，但 emoji、部分生僻汉字属于增补平面，需要两个码元（代理对）表示，length 会返回 2。' },
      { p: '这带来两个实际后果：用 length 做输入长度校验可能误判；用 substring 按下标切分可能把代理对劈开，得到一个非法的半个字符。要按“真正的字符”处理，应该用 <code>codePointCount</code> 数码点，用 <code>offsetByCodePoints</code> 定位，或者直接用 <code>codePoints()</code> 流处理。' },
      { code: 'String emoji = "\\uD83D\\uDE00";\nSystem.out.println(emoji);\nSystem.out.println(emoji.length());\nSystem.out.println(emoji.codePointCount(0, emoji.length()));\nSystem.out.println(emoji.substring(0, 1).length());\nSystem.out.println((int) emoji.charAt(0));', title: 'CodePointDemo.java' },
      { out: '😀\n2\n1\n1\n55357' },
      { p: 'length 是 2，码点数是 1；substring(0,1) 只取到高位代理，长度是 1，但内容已经不是合法字符；charAt(0) 得到 55357，正是高位代理的码值。这类问题在昵称、评论、文件名的长度限制里非常常见，校验时要么按码点，要么直接限制字节数。' },
      { p: '顺带说一句编码：<code>getBytes()</code> 不传参数会用平台默认字符集，同一段代码在 Windows 和 Linux 上可能得到不同结果。跨平台代码一律写 <code>getBytes(StandardCharsets.UTF_8)</code>，读取时同理。' },
      { p: '还有一个更隐蔽的问题：同一个“字”可能有多种 Unicode 表示。例如带声调的字母 e 既能用一个码点表示，也能用 e 加组合音标两个码点表示，肉眼完全一样，但 equals 返回 false、length 也不同。做用户名校验、搜索匹配时，可以先用 <code>Normalizer.normalize(s, Normalizer.Form.NFC)</code> 统一形式，再比较或存储。' },

      { h: '1.11 split 与 replace 的转义陷阱' },
      { p: '<code>split</code> 的参数是正则，不是普通分隔符。最常见的翻车是 <code>"a.b".split(".")</code>：点号在正则里表示“任意字符”，于是每个字符都被当成分隔符，结果得到一个空数组。正确写法是 <code>split("\\\\.")</code>，用反斜杠把点号转义。' },
      { p: '第二个坑是尾部空串。<code>"a,b,,".split(",")</code> 默认会丢弃末尾的空字符串，得到两个元素；如果业务需要保留空位，要传 limit 参数 -1，得到四个元素。第三个坑是 <code>replaceAll</code> 的替换串：美元符号和反斜杠在替换文本里有特殊含义，要替换成字面的 $ 需要用 <code>Matcher.quoteReplacement</code>。' },
      { code: 'String line = "2024.10.20";\nSystem.out.println(line.split(".").length);\nSystem.out.println(line.split("\\\\.").length);\n\nString csv = "a,b,,";\nSystem.out.println(csv.split(",").length);\nSystem.out.println(csv.split(",", -1).length);\n\nSystem.out.println("price: 10".replaceAll("\\\\d+", "20"));', title: 'SplitDemo.java' },
      { out: '0\n3\n2\n4\nprice: 20' },
      { p: '第一行用点号切分，长度是 0；转义后按点切成三段。csv 默认切分丢掉尾部空串，只剩 a 和 b；limit 为 -1 时保留，长度变成 4。最后一行用正则把数字替换成 20，注意 Java 字符串里 <code>\\\\d</code> 才表示正则的 <code>\\d</code>。' },
      { p: '记忆方法：<b>split 和 replaceAll 吃正则，replace 吃字面量</b>。如果你只想按固定字符串切分，又不想处理转义，可以用 <code>Pattern.quote</code> 包一层，或者改用第三方库的分割工具。' },
      { p: '再补一个细节：<code>split</code> 传入空字符串会怎样？<code>"abc".split("")</code> 在 JDK 8 及以后得到三个单字符元素，而不是四个或零个，这是正则匹配位置的结果；如果你要按字符拆分，用 <code>toCharArray</code> 或 <code>codePoints</code> 语义更清楚。另外 split 返回的数组元素是全新的 String，与原串不共享内部数组，改其中一个不会影响另一个。' },

      { h: '1.12 初学者最常见的六个错误' },
      { list: [
        '用 <code>==</code> 比较字符串内容，本地测试恰好为 true，上线遇到动态字符串就变成 false。',
        '循环里用 <code>+=</code> 拼接，数据量上来后耗时平方级增长。',
        '对可能为 null 的字符串直接调用 <code>isEmpty</code> 或 <code>equals</code>，抛 NullPointerException。',
        '用 <code>new String("...")</code> 创建字符串，白白多一个堆对象。',
        '用 <code>split(".")</code> 或 <code>split("|")</code> 却忘了这些字符在正则里有特殊含义。',
        '用 <code>length</code> 判断“字数”，含 emoji 或生僻字时长度校验失准。'
      ] },
      { p: '这些错误的共同点是：代码能编译、能跑通简单用例，但在边界数据上暴露。写字符串处理逻辑时，先问自己三个问题——这个值可能为 null 吗？可能是空串吗？可能包含多字节字符吗？把这三个问题回答清楚，大部分坑就提前避开了。' },
      { p: '修正这些错误的成本很低，但发现它们的成本很高，因为它们往往只在特定数据上复现。一个实用的习惯是：所有外部输入（HTTP 参数、数据库字段、文件内容）在进入业务逻辑前先做一次规范化——去空白、判空、统一大小写规则、限定长度，把“脏数据”挡在边界上。字符串处理的第一原则不是技巧，而是边界清晰。' },

      { h: '1.13 本章小结' },
      { list: [
        'String 是 final 类，内部数组 private final，所有“修改”都返回新对象。',
        '字面量和编译期常量表达式进入常量池并被复用；new 一定在堆上创建新对象。',
        '内容比较用 equals，地址比较才是 ==；常量在前的写法可以避免空指针。',
        '循环拼接用 StringBuilder；split 与 replaceAll 的参数是正则，注意转义与 limit。',
        'length 数的是 UTF-16 码元，处理 emoji 要用码点；判空要区分 null、空串与空白串。'
      ] },

      { h: '1.14 常见追问' },
      { list: [
        '<b>String 为什么设计成不可变？</b>为了线程安全、可缓存哈希、可安全共享，以及作为类名、路径等敏感值时不被篡改。',
        '<b>常量池到底在堆还是方法区？</b>JDK 7 起在堆中；更准确地说，字符串对象在堆，StringTable 是 JVM 维护的哈希表。',
        '<b><code>new String("a")</code> 创建几个对象？</b>若池中没有 "a"，先建池中对象再建堆对象，共两个；已有则只建一个。',
        '<b>String 能被继承吗？</b>不能，类是 final 的；这也是不可变承诺的一部分。',
        '<b>switch 支持 String 的原理？</b>编译成先比较 hashCode，再用 equals 确认，所以 switch 的表达式为 null 时会抛 NPE。',
        '<b>为什么 String 要缓存 hashCode？</b>作为 HashMap 的 key 时会被频繁调用，缓存后只需算一次；因为是惰性计算，没用到就不算。'
      ] },

      { h: '1.15 自测与练习' },
      { ol: [
        '不运行代码，写出 <code>String a = "1"; String b = a + "2"; System.out.println(b == "12");</code> 的结果，并解释原因。',
        '写一个方法，统计一段文本中某个子串出现的次数，要求不使用正则。',
        '把 <code>"2024-10-20"</code> 解析成三个整数并打印，分别用 split 和 substring 实现一次。',
        '解释为什么 <code>"a.b".split(".")</code> 返回空数组，并给出两种正确写法。',
        '用 codePointCount 改进一个“昵称最多 10 个字”的校验方法。'
      ] }
    ]
  };


  T['builder-boxing'] = {
    meta: '本章约 5600 字 · 建议 34 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '2.1 为什么把这两个主题放在一起' },
      { p: 'StringBuilder 和包装类看起来毫不相干，但它们回答了同一个问题：<b>当语言的基本设计不够用时，JDK 用什么办法补上</b>。String 不可变，于是有了可变的 StringBuilder；集合和泛型只能装对象，于是有了把基本类型包起来的包装类。' },
      { p: '这两个补丁都很好用，也都埋着坑。循环里用加号拼接字符串，代码能跑，数据量一大就慢得离谱；<code>Integer</code> 用 <code>==</code> 比较，127 通过、128 失败，很多人第一次遇到会以为是编译器出了 bug。这一章把这两个坑的成因讲清楚，让你以后不是“记住别这么写”，而是“知道为什么不能这么写”。' },
      { p: '阅读时建议打开 jshell 或 IDE，把每段代码亲手敲一遍。StringBuilder 的容量变化、Integer 的缓存边界，都是非常适合用实验验证的知识点，看一眼输出比读十行解释印象更深。' },
      { h: '2.2 加号拼接在底层变成了什么' },
      { p: '源码里的 <code>a + b</code> 不会直接对应一条“字符串相加”的字节码。JDK 8 及以前，javac 会把它改写成 <code>new StringBuilder().append(a).append(b).toString()</code>；JDK 9 起改成了 <code>invokedynamic</code> 指令，由运行时的 StringConcatFactory 生成拼接逻辑，可能使用更高效的字节数组复制策略。' },
      { p: '这个改写只发生在“一次表达式”里。也就是说，<code>"x" + a + b</code> 会合成一个 StringBuilder，效率不错；但如果你把拼接写在循环里，每次循环都是一次新的表达式，就会创建新的 StringBuilder、新的 String。编译器不会把整个循环优化成一个 StringBuilder，这是理解性能问题的关键。' },
      { p: '还有两种特殊情况。第一，如果参与拼接的全是编译期常量，编译器直接算出结果，运行时一个对象都不多创建；第二，如果拼接的一方是 null，结果会变成字符串 "null"，不会抛异常，这一点和调用方法完全不同，排查日志里的 "null" 时要记得这个来源。' },
      { code: 'public class ConcatDemo {\n    public static void main(String[] args) {\n        int id = 7;\n        String a = "order-" + id;\n        String b = "order-" + id;\n        System.out.println(a);\n        System.out.println(a == b);\n\n        StringBuilder sb = new StringBuilder();\n        sb.append("order-").append(id);\n        System.out.println(sb);\n    }\n}', title: 'ConcatDemo.java' },
      { out: 'order-7\nfalse\norder-7' },
      { p: 'a 和 b 内容相同，但它们是运行时分别拼接出来的两个对象，所以 a == b 是 false。最后一段用 StringBuilder 得到同样的内容。这个例子说明：加号不是不能用，而是要知道它每次都在创建对象。单次拼接完全没问题，循环里就要换成可变的容器。' },
      { p: '日志是字符串拼接的高频场景，但成熟日志框架都提供了占位符写法，例如用 <code>log.info("order {} paid {}", id, amount)</code>，只有真的输出日志时才做格式化。如果写成 <code>log.info("order " + id + " paid " + amount)</code>，即使日志级别关掉，拼接也已经发生。理解这一点，比单纯记住“循环里别用加号”更有价值。同理，异常信息和断言消息也应优先用参数化写法，把“要不要生成字符串”的决定交给框架。' },
      { h: '2.3 内部结构与容量' },
      { p: 'StringBuilder 继承自 <code>AbstractStringBuilder</code>，内部维护一个可扩容的字符数组（JDK 8 是 char[]，JDK 9 起为配合紧凑字符串改为 byte[] 加 coder）和一个 <code>count</code> 表示已使用的长度。数组的长度叫容量（capacity），count 叫长度（length），两者不是一回事。' },
      { p: 'append 时先检查剩余空间够不够，够就直接把新内容写到 count 位置并增加 count；不够就扩容。默认策略是“新容量 = 旧容量 × 2 + 2”，然后用 <code>Arrays.copyOf</code> 把旧数据复制到新数组。扩容是昂贵的操作，因为它要重新分配内存并复制全部已有内容，所以要尽量避免频繁扩容。' },
      { flow: ['调用 append', '计算所需容量', '容量是否足够', '不足则扩容两倍加二', '复制旧内容', '写入并返回 this'] },
      { p: '这也解释了为什么 StringBuilder 的方法都返回 <code>this</code>：<code>sb.append(a).append(b)</code> 这样的链式调用，每一步操作的都是同一个对象，不会产生中间对象。链式写法不仅短，而且语义上明确表达了“在同一个缓冲区上连续追加”。' },
      { note: '<b>容量不等于长度：</b>容量是数组大小，长度是实际字符数。一个容量 34、长度 5 的 StringBuilder，打印出来只有 5 个字符。' },
      { p: '如果运行过程中发现扩容次数太多，可以在开始前调用 <code>ensureCapacity(n)</code> 一次性把容量撑到至少 n，避免多次复制；拼接完成后如果要把缓冲区长期保留，可以调用 <code>trimToSize()</code> 把容量收缩到实际长度附近，减少内存占用。这两个方法都不改变内容，只影响底层数组。' },
      { p: 'StringBuilder 有三个常用构造器：无参构造器容量为 16；<code>StringBuilder(int capacity)</code> 指定初始容量；<code>StringBuilder(String str)</code> 的容量是字符串长度加 16。如果你已经知道最终大概要多长，直接用带容量的构造器，可以省掉多次扩容复制。' },
      { p: '比如要拼接一个约 1000 字符的 SQL，写 <code>new StringBuilder(1024)</code> 就比默认的 16 更合适。这不是过度优化，而是一个成本几乎为零的好习惯。反过来，如果预估得过大，会浪费一点内存，但在绝大多数场景下这点浪费可以忽略。' },
      { p: 'JDK 9 引入紧凑字符串后，String 内部用 byte[] 加一个 coder 标志：纯 Latin-1 字符每个只占一个字节，含中文等字符时才用 UTF-16 每字符两字节。StringBuilder 也受益于这套设计，英文为主的拼接内存占用明显下降。这是实现细节，不影响你写代码，但能解释为什么同样字符数的字符串，内存占用可能差一倍。' },
      { code: 'public class CapacityDemo {\n    public static void main(String[] args) {\n        StringBuilder sb = new StringBuilder();\n        System.out.println(sb.capacity());\n\n        sb.append("0123456789abcdef");\n        System.out.println(sb.length() + " " + sb.capacity());\n\n        sb.append("x");\n        System.out.println(sb.length() + " " + sb.capacity());\n\n        StringBuilder sized = new StringBuilder(100);\n        System.out.println(sized.capacity());\n    }\n}', title: 'CapacityDemo.java' },
      { out: '16\n16 16\n17 34\n100' },
      { p: '默认容量 16；追加 16 个字符后刚好填满，容量仍是 16；再追加一个字符就需要 17 个位置，触发扩容，新容量是 16 × 2 + 2 = 34。最后一个构造器直接指定了 100，没有发生扩容。把这四个数字记住，比背“两倍加二”这句话更直观。' },
      { h: '2.4 常用 API 与循环拼接示例' },
      { p: 'StringBuilder 的方法可以按“增、删、改、查、转”来记。增加用 append 和 insert；删除用 delete、deleteCharAt；修改用 replace、setCharAt、setLength、reverse；查询用 length、capacity、charAt、indexOf；转换用 substring 和 toString。' },
      { table: { head: ['操作', '方法', '说明'], rows: [
        ['追加', '<code>append(x)</code>', '接受基本类型、字符串、对象、字符数组等，返回 this'],
        ['插入', '<code>insert(offset, x)</code>', '在下标 offset 前插入，原内容后移'],
        ['删除', '<code>delete(start, end)</code>', '删除 [start, end)，end 不含'],
        ['替换', '<code>replace(start, end, str)</code>', '把区间内容换成 str'],
        ['反转', '<code>reverse()</code>', '原地反转，返回 this'],
        ['截断', '<code>setLength(n)</code>', '变短则截断，变长则补 \\u0000'],
        ['输出', '<code>toString()</code>', '生成一个 String 快照']
      ] } },
      { code: 'public class BuilderApi {\n    public static void main(String[] args) {\n        StringBuilder sb = new StringBuilder("Java");\n        sb.append("-21");\n        sb.insert(0, "[");\n        sb.append("]");\n        System.out.println(sb);\n\n        sb.reverse();\n        System.out.println(sb);\n\n        sb.reverse().delete(0, 1).deleteCharAt(sb.length() - 1);\n        System.out.println(sb);\n\n        String s = sb.toString();\n        sb.append("!!!");\n        System.out.println(s);\n        System.out.println(sb);\n    }\n}', title: 'BuilderApi.java' },
      { out: '[Java-21]\n]12-avaJ[\nJava-21\nJava-21\nJava-21!!!' },
      { p: '第一段在 "Java" 后追加 "-21"，再在开头插入 "["、末尾追加 "]"，得到 [Java-21]；reverse 后变成 ]12-avaJ[；再反转回来、删掉首尾的括号，得到 Java-21。最后两行是本节的要点：toString 之后再 append，已经取出的 s 不会变，说明 toString 返回的是一份独立快照。' },
      { p: '需要特别注意 <code>setLength</code>：把长度改小会直接截断内容；改大会用 <code>\\u0000</code> 填充，打印出来可能是一串看不见的控制字符。它常被用来清空缓冲区（<code>sb.setLength(0)</code>），比新建一个对象更省，但清空后容量保持不变。' },
      { p: '理解 StringBuilder 的容量还有一个实际好处：能解释为什么 <code>sb.length()</code> 与 <code>sb.toString().length()</code> 总是相等，而 <code>sb.capacity()</code> 通常更大。面试里让你手写一个简单的字符串拼接工具，能把容量预分配和分隔符处理写对，就已经及格了。' },
      { p: '下面这段代码把 0 到 4 用逗号连接起来，并打印长度。它演示了链式 append 的写法，也演示了“最后一个逗号”这个常见小问题：拼接结束后如果多了一个分隔符，通常要用 <code>setLength(length - 1)</code> 或 <code>deleteCharAt</code> 去掉，或者改成“先判断是不是第一个元素”的写法。' },
      { code: 'public class LoopJoin {\n    public static void main(String[] args) {\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < 5; i++) {\n            if (i > 0) sb.append(",");\n            sb.append(i);\n        }\n        System.out.println(sb);\n        System.out.println(sb.length());\n\n        sb.setLength(0);\n        for (int i = 0; i < 5; i++) {\n            sb.append(i).append(",");\n        }\n        sb.setLength(sb.length() - 1);\n        System.out.println(sb);\n    }\n}', title: 'LoopJoin.java' },
      { out: '0,1,2,3,4\n9\n0,1,2,3,4' },
      { p: '第一种写法在每次追加前判断要不要加分隔符，逻辑最直观；第二种写法先无脑追加、最后删掉末尾多余的逗号，代码更短，但要保证循环至少执行一次，否则 <code>setLength(-1)</code> 会抛异常。两种都可以，关键是不要写出“最后多一个逗号”的脏数据。' },
      { note: '<b>性能提示：</b>如果循环次数已知且拼接内容较长，先 <code>new StringBuilder(预计长度)</code>，可以避免多次扩容复制。' },
      { p: '这三个类经常被放在一起比较。String 不可变，适合做常量、key、参数传递；StringBuilder 可变、非线程安全，适合单线程内大量拼接；StringBuffer 可变、方法加 synchronized，适合多线程共享同一个缓冲区。' },
      { table: { head: ['类型', '可变性', '线程安全', '典型场景'], rows: [
        ['String', '不可变', '天然安全', '常量、Map 的 key、方法参数'],
        ['StringBuilder', '可变', '不安全', '单线程拼接、SQL/JSON 组装'],
        ['StringBuffer', '可变', '安全（同步）', '多线程共享缓冲区，实际很少见']
      ] } },
      { p: '实际项目里 StringBuffer 的出现频率很低。原因是“多个线程共享同一个可变缓冲区”本身就是一种很少见的设计，如果真的需要，更常见的做法是每个线程各自构建、最后再合并，或者用锁把整个构建过程保护起来，而不是依赖每个 append 上的同步。所以面试里可以说清楚区别，但写代码时优先 StringBuilder。' },
      { p: '还有一类场景两个都不需要用：把一组已有元素用分隔符连起来，用 <code>String.join</code> 或 Stream 的 <code>Collectors.joining</code> 更清晰；格式化固定模板，用 <code>String.format</code> 或文本块更易读。工具的选择应该服务于可读性，而不是一律上 StringBuilder。' },
      { h: '2.5 包装类是什么' },
      { p: 'Java 有八个基本类型：byte、short、int、long、float、double、char、boolean。它们不是对象，不能为 null，也不能放进泛型集合。为了让它们享受对象的待遇，JDK 为每个基本类型提供了一个包装类：Byte、Short、Integer、Long、Float、Double、Character、Boolean。' },
      { p: '包装类都是 final 的、不可变的，除了 Character 和 Boolean，其余六个都继承自 <code>Number</code>，因此都有 <code>intValue</code>、<code>longValue</code>、<code>doubleValue</code> 这类转换方法。不可变意味着一旦创建，里面的值就不会变，这使它们可以安全地作为 HashMap 的 key、可以在线程间共享。' },
      { table: { head: ['基本类型', '包装类', '缓存范围', '默认值（字段）'], rows: [
        ['byte', '<code>Byte</code>', '-128 ~ 127（全部）', 'null'],
        ['short', '<code>Short</code>', '-128 ~ 127', 'null'],
        ['int', '<code>Integer</code>', '-128 ~ 127（可调）', 'null'],
        ['long', '<code>Long</code>', '-128 ~ 127', 'null'],
        ['char', '<code>Character</code>', '0 ~ 127', 'null'],
        ['boolean', '<code>Boolean</code>', 'TRUE / FALSE', 'null'],
        ['float / double', '<code>Float</code> / <code>Double</code>', '无缓存', 'null']
      ] } },
      { p: '创建包装类对象有两种写法：<code>Integer.valueOf(10)</code> 和 <code>new Integer(10)</code>。后者在 JDK 9 起被标记为废弃，因为它每次都新建对象，绕过了缓存。永远优先用 valueOf 或自动装箱，不要用 new 包装类。类似的废弃构造器在 Double、Long 等类上也存在。' },
      { p: '注意最后一列：包装类字段的默认值是 null，而基本类型字段的默认值是 0 或 false。这个差别是很多空指针异常的源头——一个没赋值的 Integer 字段，看起来“是 0”，实际上是 null。' },
      { h: '2.6 自动装箱与自动拆箱' },
      { p: 'JDK 5 引入了自动装箱（autoboxing）和自动拆箱（unboxing）：把基本类型赋给包装类变量时，编译器自动插入 <code>Integer.valueOf(x)</code>；把包装类赋给基本类型时，自动插入 <code>x.intValue()</code>。代码看起来像直接赋值，字节码里其实是方法调用。' },
      { p: '这层语法糖很方便，但有三类代价。第一，装箱会创建对象（缓存范围内除外），在循环里可能产生大量临时对象；第二，拆箱时如果包装类是 null，会抛 NullPointerException；第三，方法重载时，装箱版本和基本类型版本可能同时存在，编译器会选择“最具体”的版本，结果可能与你的直觉不同。' },
      { code: 'public class BoxingDemo {\n    static void take(int x) {\n        System.out.println("int: " + x);\n    }\n\n    static void take(Integer x) {\n        System.out.println("Integer: " + x);\n    }\n\n    public static void main(String[] args) {\n        Integer a = 10;\n        int b = a;\n        take(10);\n        take(Integer.valueOf(10));\n        System.out.println(a + b);\n    }\n}', title: 'BoxingDemo.java' },
      { out: 'int: 10\nInteger: 10\n20' },
      { p: '字面量 10 是 int，所以优先匹配 take(int)；显式包成 Integer 才匹配另一个重载。最后一行 a + b 会先把 a 拆箱再相加。这段代码没有错误，但它提醒你：装箱拆箱不是“透明的”，它会影响重载决议，也会在你不注意的地方创建对象。' },
      { p: '一个常见的性能陷阱是循环里的累加：<code>Long sum = 0L; for (...) sum += i;</code> 每次 += 都会拆箱、相加、再装箱，产生大量 Long 对象。改成 <code>long sum = 0L</code> 就没有这个问题。类似地，集合里存 Integer 是必须的，但在集合外部做计算时，尽量用基本类型。' },
      { h: '2.7 Integer 缓存：127 与 128 的分界线' },
      { p: '这是包装类最著名的坑。Integer 内部有一个静态缓存数组，默认保存 -128 到 127 的对象。调用 <code>Integer.valueOf(n)</code> 时，如果 n 在这个范围内，直接返回缓存中的对象；超出范围才 new 一个新的。所以两个值为 127 的 Integer 可能指向同一个对象，而两个 128 一定不是。' },
      { p: '缓存上界可以用 JVM 参数 <code>-XX:AutoBoxCacheMax=</code> 调整，所以“127”不是语言规范写死的，而是实现默认值。这意味着依赖缓存边界的代码在不同 JVM 配置下行为可能不同，更不能把 == 的结果当成业务逻辑。' },
      { code: 'public class CacheDemo {\n    public static void main(String[] args) {\n        Integer a = 127, b = 127;\n        Integer c = 128, d = 128;\n        System.out.println(a == b);\n        System.out.println(c == d);\n        System.out.println(c.equals(d));\n\n        Integer e = Integer.valueOf(100);\n        Integer f = Integer.valueOf(100);\n        System.out.println(e == f);\n    }\n}', title: 'CacheDemo.java' },
      { out: 'true\nfalse\ntrue\ntrue' },
      { p: '127 在缓存范围内，a 和 b 是同一个对象；128 超出范围，valueOf 每次新建，c 和 d 地址不同；equals 比较数值，所以是 true。最后一段再次验证：valueOf 在缓存范围内复用对象，因此 e == f 为 true。' },
      { p: '结论只有一句话：<b>包装类的值比较一律用 equals，或者先拆箱再比</b>。这不是风格问题，而是正确性问题。如果确实想比较引用，说明你在做身份判断，那时才用 ==，并且要清楚自己在做什么。' },
      { note: '<b>面试常问：</b>为什么 <code>Integer a = 127; Integer b = 127; a == b</code> 是 true，而 128 是 false？答案就是 IntegerCache 的默认范围。' },
      { h: '2.8 null 陷阱与 equals 的类型判断' },
      { p: '包装类可以是 null，这是它和基本类型最大的区别，也是它最大的风险。只要发生拆箱，而对象是 null，就会抛 NullPointerException。触发拆箱的场景比你想的多：赋值给基本类型、参与算术运算、参与比较、传给基本类型参数、放进 switch、三元表达式混用。' },
      { p: '更隐蔽的是“看起来不像拆箱”的写法。<code>Integer count = null; if (count == 1)</code> 会 NPE，因为 == 两边一个是包装类一个是基本类型，编译器要先拆箱；<code>int total = flag ? count : 0</code> 也会 NPE，因为三元表达式的结果类型被提升为 int。' },
      { p: '还有一个常被忽略的点：包装类作为 switch 的表达式时，JVM 会先拆箱。因此 <code>Integer code = null; switch (code)</code> 在进入任何 case 之前就抛 NPE，而不是走 default。凡是 switch 的参数可能为 null，都要先判空或改用 if-else。' },
      { code: 'public class UnboxNull {\n    public static void main(String[] args) {\n        Integer count = null;\n        try {\n            int x = count;\n            System.out.println(x);\n        } catch (NullPointerException e) {\n            System.out.println("拆箱失败：count 是 null");\n        }\n\n        Integer total = null;\n        try {\n            if (total == 0) System.out.println("zero");\n        } catch (NullPointerException e) {\n            System.out.println("比较也会拆箱");\n        }\n    }\n}', title: 'UnboxNull.java' },
      { out: '拆箱失败：count 是 null\n比较也会拆箱' },
      { p: '两段代码都捕获到了 NPE。第一段是显式赋值给 int，第二段是 == 比较。避免的方法是在拆箱前判空：<code>if (count != null && count == 0)</code>，或者用 <code>Objects.equals(count, 0)</code>，后者对 null 安全。如果业务上 null 应该等价于 0，就在数据入口处统一转换，不要把这个判断散落在各处。' },
      { note: '<b>设计建议：</b>实体类的数量、金额等字段尽量用包装类表达“未知”，但一旦进入计算逻辑，先归一化成基本类型，避免 null 在表达式里传播。' },
      { p: '还有一条实用建议：在团队里约定“对外字段用包装类、对内计算用基本类型”，并在入口做一次非空校验，比在几十个调用点判空更可靠。约定加上校验，才能真正消灭空指针，而不是靠记忆。' },
      { p: '包装类的 equals 先判断参数类型是否相同，再比较值。所以 <code>Integer(1).equals(Long(1))</code> 是 false，<code>Integer(1).equals(Short(1))</code> 也是 false。这一点和数值比较的直觉不同，写通用代码时要特别注意。' },
      { p: '如果要做跨类型的数值比较，可以统一转成 long 或 double 再比，或者用 <code>BigDecimal</code>（金额场景）。不要指望 equals 帮你做类型转换，它只做“同类型同值”的判断。' },
      { p: '<code>Integer</code> 与 <code>Long</code> 的 equals 因为类型不同直接返回 false，即使数值都是 1；先统一转成 long 再比较，结果才是 true。两个值为 1000 的 Integer 虽然地址不同，equals 比较数值仍然返回 true，compareTo 也返回 0。把这三个结果放在一起，就把“地址、类型、数值”三层比较讲清楚了。' },
      { h: '2.9 集合与泛型里的包装类' },
      { p: '泛型不能使用基本类型，所以 <code>List&lt;int&gt;</code> 编译不过，必须写 <code>List&lt;Integer&gt;</code>。往集合里 add 一个 int 会自动装箱，取出来赋给 int 会自动拆箱。这套机制让集合用起来很自然，但也带来两个问题：元素是对象，内存开销比基本类型数组大；取出时如果元素是 null，拆箱会 NPE。' },
      { p: '还有一个经典陷阱：<code>List&lt;Integer&gt; list</code> 的 <code>remove</code> 有两个重载，<code>remove(int index)</code> 按下标删，<code>remove(Object o)</code> 按值删。写 <code>list.remove(1)</code> 删的是下标 1 的元素，不是值为 1 的元素；要按值删必须写 <code>list.remove(Integer.valueOf(1))</code>。' },
      { p: '如果数据量很大且都是基本类型，可以考虑第三方的基本类型集合库，或者干脆用数组。但在业务代码里，可读性和开发效率通常比这点内存更重要，不必过早优化。' },
      { p: '从 <code>List&lt;Integer&gt;</code> 求和时，直接 for 循环拆箱相加即可；用 Stream 则写 <code>list.stream().mapToInt(Integer::intValue).sum()</code>，先转成 IntStream 再做数值计算，避免中间装箱。如果列表里可能有 null，先 filter 掉或改用 <code>mapToInt(x -&gt; x == null ? 0 : x)</code>，否则拆箱会抛 NPE。' },
      { h: '2.10 字符串与数值互转、溢出边界' },
      { p: '包装类最日常的用途是类型转换。字符串转数字用 <code>parseInt</code>、<code>parseLong</code>、<code>parseDouble</code>；数字转字符串用 <code>String.valueOf</code>、<code>Integer.toString</code> 或直接拼接。还有一类是进制转换：<code>toHexString</code>、<code>toBinaryString</code>、<code>toOctalString</code>，以及带进制参数的 <code>toString(n, radix)</code>。' },
      { list: [
        '字符串转 int：<code>Integer.parseInt("42")</code>，返回 int，解析失败抛 NumberFormatException；',
        '字符串转 Integer：<code>Integer.valueOf("42")</code>，返回包装类，小数值可能复用缓存对象；',
        'int 转字符串：<code>Integer.toString(42)</code> 或 <code>String.valueOf(42)</code>，返回 String；',
        '任意进制：<code>Integer.toString(255, 16)</code> 得到 "ff"，radix 取值 2 到 36；',
        '十六进制快捷方法：<code>Integer.toHexString(255)</code>、<code>toBinaryString</code>、<code>toOctalString</code>；',
        '解析边界：parseInt 不去空格、不认千分位，超范围同样抛 NumberFormatException。'
      ] },
      { code: 'public class ParseDemo {\n    public static void main(String[] args) {\n        int a = Integer.parseInt("42");\n        Integer b = Integer.valueOf("42");\n        System.out.println(a + b);\n\n        System.out.println(Integer.toHexString(255));\n        System.out.println(Integer.toString(255, 2));\n\n        try {\n            Integer.parseInt("12a");\n        } catch (NumberFormatException e) {\n            System.out.println("不是合法数字");\n        }\n    }\n}', title: 'ParseDemo.java' },
      { out: '84\nff\n11111111\n不是合法数字' },
      { p: 'parseInt 和 valueOf 都能把字符串转成数字，区别在返回类型和是否复用缓存。解析失败时抛的是 NumberFormatException，它是 IllegalArgumentException 的子类，属于非受检异常，不强制 try-catch，但业务上通常要捕获并给出友好提示。注意 parseInt 不会自动去空格，传 " 42" 一样会失败，需要先 trim 或 strip。' },
      { p: '基本类型都有范围，运算结果超出范围会“回绕”，不会抛异常。比如 <code>Integer.MAX_VALUE + 1</code> 等于 <code>Integer.MIN_VALUE</code>。这类问题在计数、时间戳、金额计算里非常危险，因为错误值看起来仍然是一个正常的数字。' },
      { p: '需要检测溢出时，用 <code>Math.addExact</code>、<code>subtractExact</code>、<code>multiplyExact</code>，溢出会抛 ArithmeticException；或者在做加法前判断 <code>a &gt; Integer.MAX_VALUE - b</code>。金额场景直接用 BigDecimal，不要用 long 存“分”以外的单位，除非你非常清楚精度和范围。' },
      { p: '浮点数还有另一类边界：<code>0.0 / 0.0</code> 得到 NaN，NaN 与任何值（包括自己）用 == 比较都是 false；正数除以 0 得到 Infinity。这些值参与业务计算会污染整条链路，输入校验时要挡住。' },
      { p: '字符和数值互转时要注意 char 是无符号的 16 位整数，把一个 char 变量强转成 int 得到的是码元值，而不是字节；把 int 强转成 char 会截断高 16 位。做编码转换要用 <code>Charset</code> 和 <code>getBytes</code>，不要用强制类型转换。' },
      { h: '2.11 常见错误清单' },
      { list: [
        '在循环里用 <code>+=</code> 拼接字符串，数据量大时性能急剧下降。',
        '用 <code>==</code> 比较两个 Integer，127 通过、128 失败，误以为语言有 bug。',
        '对可能为 null 的包装类做算术、比较或 switch，触发拆箱 NPE。',
        '循环里用 <code>Long sum</code> 累加，产生大量临时对象而不自知。',
        '把 <code>setLength</code> 当成清空内容的唯一手段，忘了它会保留容量、也可能补 \\u0000。',
        '用 <code>Integer.parseInt</code> 解析用户输入却不处理 NumberFormatException。',
        '<code>list.remove(1)</code> 想删值为 1 的元素，实际删掉了下标 1。'
      ] },
      { p: '避免这些错误不需要记住所有细节，只需要建立两个意识：第一，字符串不可变，任何“修改”都在创建新对象；第二，包装类是对象，可能为 null，比较要用 equals。把这两条刻进习惯，剩下的都是推导。' },
      { p: '最后强调一次：这些知识点的价值不在于背结论，而在于看到一段代码时能预判它创建了几个对象、在哪里可能抛 NPE、数据量放大后会发生什么。这种预判能力，就是从“会写”到“写得好”的分界线。' },
      { h: '2.12 本章小结' },
      { list: [
        '加号拼接在循环里每次都会创建新对象，大量拼接用 StringBuilder。',
        'StringBuilder 内部是可扩容数组，默认容量 16，扩容策略约为两倍加二。',
        'String 不可变、StringBuilder 单线程高效、StringBuffer 同步但少用。',
        '包装类让基本类型变成对象，代价是装箱开销和可能的 null。',
        'Integer 默认缓存 -128~127，包装类比较必须用 equals。',
        '拆箱遇到 null 会抛 NPE，判空要放在拆箱之前。'
      ] },
      { note: '<b>复习方法：</b>小结不必逐条背诵，抓住两组对比即可——可变与不可变、对象与基本类型。遇到新的字符串或数值 API 时，先用这两组对比判断它属于哪一类，再决定怎么用。' },
      { h: '2.13 常见追问' },
      { list: [
        '<b>StringBuilder 和 String 的 + 哪个快？</b>单次拼接差不多；循环里 StringBuilder 明显快，因为 + 每次都要新建对象并复制。',
        '<b>StringBuilder 线程安全吗？</b>不安全，多线程共享会得到错乱结果；需要同步时用 StringBuffer 或自己加锁。',
        '<b>为什么 Integer 要缓存 -128~127？</b>这个区间是循环计数、状态码等最常用的值，缓存能显著减少小整数对象。',
        '<b>自动装箱一定创建对象吗？</b>不一定，缓存范围内复用已有对象；但不要依赖这一点做 == 比较。',
        '<b>包装类和基本类型怎么选？</b>集合、泛型、允许 null 的字段用包装类；计算、循环变量用基本类型。',
        '<b>BigDecimal 能替代 Double 吗？</b>金额、精确小数用 BigDecimal；科学计算、性能敏感场景仍用 double。'
      ] },
      { h: '2.14 自测与练习' },
      { ol: [
        '用 StringBuilder 实现一个方法，把整型数组拼成 "[1, 2, 3]" 的形式，要求只创建一个 StringBuilder。',
        '解释 <code>Integer a = 200; Integer b = 200; a == b</code> 的结果，并写出两种正确的比较方式。',
        '写一段代码，演示包装类为 null 时参与 <code>==</code> 比较会抛 NPE，并给出修复方案。',
        '用 <code>Math.addExact</code> 改写一个可能溢出的累加方法，捕获异常并打印提示。',
        '把一段循环里的字符串 <code>+=</code> 改写成 StringBuilder，估算改造前后创建的字符串对象数量。'
      ] },
    ]
  };

  T['datetime'] = {
    meta: '本章约 5600 字 · 建议 36 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '3.1 为什么日期时间要单独学' },
      { p: '几乎每个业务系统都在和时间打交道：订单的创建时间、日志的时间戳、会员的到期日、定时任务的执行点、报表按月分组、跨时区显示会议时间。这些需求看起来只是“取一个时间、格式化一下”，真正写起来却到处都是边界：月份从几开始、有没有时区、闰年怎么算、夏令时那天几点上班。' },
      { p: '日期时间还有一个特点：它的“正确”依赖语义，而不是语法。同一个 <code>2024-10-20 10:00</code>，在北京和纽约是两个不同的时刻；一个 <code>LocalDateTime</code> 加上时区才能变成时刻，而一个 <code>Instant</code> 必须加上时区才能变成人看得懂的日期。搞不清这一点，代码在本地跑得好好的，上线后就会差八小时。' },
      { p: 'Java 8 引入了 java.time（JSR-310），把日期时间拆成一组职责单一、不可变、线程安全的类。这一章先讲旧 API 为什么被淘汰，再逐个讲清新类的分工，最后落到解析、格式化、时间差、时区转换和旧代码互转这些实战场景。学完之后，你应该能对任何一个时间需求先问出三个问题：这是时刻还是日历？涉不涉及时区？要不要考虑夏令时？' },
      { p: '日期时间的知识密度不高，但细节多，动手验证是性价比最高的学习方式。把每个类的 now、of、parse 都试一遍，再故意传一个非法值看异常信息，比读十遍文档记得更牢。' },

      { h: '3.2 旧 API 的三个坑' },
      { p: 'Java 8 之前，日期时间主要靠 <code>java.util.Date</code> 和 <code>java.util.Calendar</code>。Date 的本质是一个毫秒时间戳，但它的 <code>toString</code> 会用默认时区渲染，于是“时间戳”和“本地时间”被混在了一个类里。更麻烦的是，Date 的很多方法（getYear、getMonth、getDate）在 JDK 1.1 就被废弃，却仍然存在于无数老代码中。' },
      { p: '第一个坑是月份从 0 开始。用 <code>Calendar</code> 设置 2024 年 1 月 1 日，要写 <code>set(2024, Calendar.JANUARY, 1)</code>，而 JANUARY 的值是 0。很多人写成 <code>set(2024, 1, 1)</code>，得到的是 2 月 1 日。第二个坑是可变性：Date 和 Calendar 都能被随意修改，作为参数传进方法后可能被改掉，作为 HashMap 的 key 更是灾难。' },
      { p: '第三个坑是 <code>SimpleDateFormat</code> 不是线程安全的。它内部持有一个 Calendar 作为临时状态，多个线程共用一个实例时，解析和格式化会互相覆盖，得到错乱的日期甚至抛异常。老代码里常见的写法是把 formatter 做成 static 字段，然后在并发下随机出错。新 API 的 <code>DateTimeFormatter</code> 是不可变且线程安全的，可以直接作为静态常量共享。' },
      { p: '这些缺陷催生了 Joda-Time，也促使 Java 8 重新设计了一套 API。理解旧 API 的坑，不是为了继续用它，而是为了看懂遗留代码，并在新旧之间安全地转换。' },
      { p: '补充一个细节：Calendar 默认是宽松模式（lenient），先 set 到 1 月 31 日再把月份改成 2 月，它会自动把日期调整成 3 月 2 日，而不是报错。这种“悄悄纠正”让 bug 更难发现。新 API 的 of 方法默认严格校验，非法日期直接抛 DateTimeException，出错更早、定位更快。另外 Date 的 equals 比较的是毫秒值，和它的 toString 展示无关，跨时区比较时容易误解。' },

      { h: '3.3 新旧 API 对照' },
      { table: { head: ['需求', '旧 API', '新 API'], rows: [
        ['时间戳（时刻）', '<code>Date</code>、<code>System.currentTimeMillis()</code>', '<code>Instant</code>'],
        ['日历日期', '<code>Calendar</code>', '<code>LocalDate</code>'],
        ['日期加时间', '<code>Calendar</code>', '<code>LocalDateTime</code>'],
        ['带时区的时刻', '<code>Date</code> + <code>TimeZone</code>', '<code>ZonedDateTime</code>'],
        ['格式化与解析', '<code>SimpleDateFormat</code>', '<code>DateTimeFormatter</code>'],
        ['时间差', '自己算毫秒差', '<code>Duration</code>、<code>Period</code>'],
        ['线程安全', '不安全', '全部不可变、安全']
      ] } },
      { p: '新 API 的核心设计是“不可变 + 职责单一”。每个类只表达一种概念，任何修改都返回新对象，因此可以安全地共享、缓存、作为常量。它还把“时刻”和“日历”彻底分开：Instant 只表示时间轴上的一个点，LocalDate 只表示日历上的一天，两者不会互相伪装。' },
      { p: '包结构也值得记一下：<code>java.time</code> 放核心类，<code>java.time.format</code> 放格式化，<code>java.time.temporal</code> 放调整器和字段接口，<code>java.time.zone</code> 放时区规则。日常开发 90% 的时间只需要前两个包。' },
      { p: '新 API 的对象都很轻量，LocalDate 内部只有 year、month、day 三个 int，创建成本很低，不需要像 Date 那样担心对象池。不可变带来的复制开销在绝大多数业务里可以忽略，换来的是线程安全和可推理的行为，这笔交易非常划算。真正需要担心性能的是高频循环里反复调用 now()，那属于另一类问题。' },
      { p: '如果项目正从旧 API 迁移，建议按“存储层、业务层、展示层”的顺序推进：先把实体里的 Date 换成 Instant 或 LocalDateTime，再改业务计算，最后改格式化和前端输出。迁移期间在边界处做显式转换，不要让新旧类型在同一层混用。每改一处补一个边界测试，比一次性大重构安全得多。Joda-Time 的用户会发现概念几乎一一对应，迁移主要是改包名和方法名。' },

      { h: '3.4 核心类型与职责' },
      { table: { head: ['类型', '表示什么', '典型用途'], rows: [
        ['<code>LocalDate</code>', '年月日', '生日、账单日、到期日'],
        ['<code>LocalTime</code>', '时分秒纳秒', '营业时间、闹钟'],
        ['<code>LocalDateTime</code>', '年月日时分秒，无时区', '本地日程、表单输入'],
        ['<code>Instant</code>', 'UTC 时间轴上的点', '时间戳、日志、存储'],
        ['<code>ZonedDateTime</code>', '带时区的完整时间', '跨时区显示、会议'],
        ['<code>OffsetDateTime</code>', '带固定偏移的时间', '协议传输、ISO 8601'],
        ['<code>Duration</code>', '两个时刻之间的量', '耗时、超时'],
        ['<code>Period</code>', '两个日期之间的量', '年龄、账期'],
        ['<code>ZoneId</code>', '时区标识', 'Asia/Shanghai、UTC'],
        ['<code>DateTimeFormatter</code>', '格式化与解析规则', '展示、导入导出']
      ] } },
      { p: '怎么选？先问“这是不是一个绝对的时刻”。如果是，用 Instant 存储、用 ZonedDateTime 展示；如果只是“日历上的某一天”或“墙上钟表的某个时间”，用 LocalDate、LocalTime 或 LocalDateTime。只有当日历时间需要落到具体时刻时，才引入 ZoneId。' },
      { p: '再问“要不要跨时区”。只在单个时区内部使用的业务（比如本地门店的营业时间），LocalDateTime 足够；一旦涉及用户分布、服务器时区、国际化展示，就必须用 Instant 或 ZonedDateTime，否则同一个字符串在不同机器上含义不同。' },
      { p: 'OffsetDateTime 和 ZonedDateTime 的区别常被问：前者只记录偏移量，比如 +08:00，不包含时区规则；后者记录时区 ID，能处理夏令时和历史偏移变化。协议传输、数据库列常用 OffsetDateTime，因为它简单且不依赖时区数据库；面向用户的展示用 ZonedDateTime，因为它知道纽约的夏天是 -04:00。如果只需要 UTC，直接用 Instant 最省事。' },

      { h: '3.5 创建对象与读取字段' },
      { p: '每个类都有 <code>now()</code> 和 <code>of(...)</code> 两类工厂方法：now 取当前时间，of 用明确的分量构造。还有 <code>parse</code> 从字符串解析。构造时如果分量非法，比如 13 月、2 月 30 日，会直接抛 <code>DateTimeException</code>，不会悄悄纠正成别的日期。' },
      { code: 'import java.time.*;\n\npublic class DateTimeDemo {\n    public static void main(String[] args) {\n        LocalDate date = LocalDate.of(2024, 10, 20);\n        System.out.println(date);\n        System.out.println(date.getYear());\n        System.out.println(date.getMonthValue());\n        System.out.println(date.getMonth());\n        System.out.println(date.getDayOfWeek());\n\n        LocalTime time = LocalTime.of(13, 45, 30);\n        LocalDateTime dateTime = LocalDateTime.of(date, time);\n        System.out.println(time);\n        System.out.println(dateTime);\n\n        LocalDate today = LocalDate.now();\n        System.out.println(today.isLeapYear());\n    }\n}', title: 'DateTimeDemo.java' },
      { out: '2024-10-20\n2024\n10\nOCTOBER\nSUNDAY\n13:45:30\n2024-10-20T13:45:30\nfalse' },
      { p: '注意第四行输出：<code>getMonth()</code> 返回的是 <code>Month</code> 枚举，打印出来是 OCTOBER，而不是数字 10；要数字就用 <code>getMonthValue()</code>。同理 <code>getDayOfWeek()</code> 返回 <code>DayOfWeek</code> 枚举，SUNDAY 对应值 7。枚举的好处是类型安全，可以直接用于 switch。' },
      { p: '还有一组容易混淆的方法：<code>getDayOfMonth()</code> 是本月第几天，<code>getDayOfYear()</code> 是本年第几天，<code>lengthOfMonth()</code> 返回本月天数，<code>isLeapYear()</code> 判断闰年。写日期计算时优先用这些方法，不要自己用 31、30、28 去判断月份。' },
      { p: 'of 方法还有重载：<code>LocalDate.of(year, Month, day)</code> 接受枚举，<code>LocalTime.of(hour, minute)</code> 可以省略秒，<code>LocalDateTime.of(date, time)</code> 组合两个对象。字段读取一律用 get 开头的方法，不要试图通过 toString 截字符串，格式一变就崩。解析字符串时如果格式固定，优先用 parse 的重载直接传 formatter，避免先转 Date 再转回来。' },
      { p: 'java.time 还定义了一组 temporal 接口：TemporalAccessor 表示可读字段，Temporal 表示可读写并支持加减，TemporalAdjuster 表示调整策略。LocalDate 实现了这些接口，所以既能传给 formatter，也能传给调整器。理解这层抽象后，你会看懂很多泛型签名，比如 <code>with(TemporalAdjuster)</code> 和 <code>format(TemporalAccessor)</code>。' },

      { h: '3.6 不可变：plus、minus 与 with' },
      { p: 'java.time 的所有核心类都是不可变的。调用 <code>plusDays</code>、<code>minusHours</code>、<code>withYear</code> 不会修改原对象，而是返回一个新对象。这一点和 StringBuilder 完全相反，也是新 API 能线程安全、能随便共享的根本原因。' },
      { code: 'import java.time.*;\n\npublic class ImmutableDemo {\n    public static void main(String[] args) {\n        LocalDate d = LocalDate.of(2024, 1, 31);\n        LocalDate next = d.plusMonths(1);\n        System.out.println(d);\n        System.out.println(next);\n\n        LocalDate e = d.withYear(2025).withMonth(12).withDayOfMonth(25);\n        System.out.println(e);\n        System.out.println(d);\n\n        LocalDateTime dt = LocalDateTime.of(2024, 10, 20, 23, 30);\n        System.out.println(dt.plusHours(2));\n    }\n}', title: 'ImmutableDemo.java' },
      { out: '2024-01-31\n2024-02-29\n2025-12-25\n2024-01-31\n2024-10-21T01:30' },
      { p: '1 月 31 日加一个月，结果是 2 月 29 日，而不是 3 月 2 日：<code>plusMonths</code> 会先把月份加一，再把“日”调整到目标月的最后一天，避免出现不存在的日期。这个规则在账单日、会员到期日这类业务里非常重要，写代码时不要自己用毫秒去加 30 天。' },
      { p: '最常见的错误是忘了接收返回值：<code>date.plusDays(1);</code> 单独一行没有任何效果，因为返回值被丢弃了。编译器不会提醒你，因为这不是语法错误。看到“加了天数却没变”的 bug，先检查是不是漏了赋值。' },
      { p: '除了 plus 和 minus，还有 <code>with</code> 系列用于替换某个字段：withYear、withMonth、withDayOfMonth、withHour。它们同样返回新对象。需要把日期调整到“本月第一天”或“本周周一”时，可以用 <code>with(TemporalAdjusters.firstDayOfMonth())</code> 这类调整器，比手算更可靠。' },
      { p: '常用的调整器还有 firstDayOfMonth、lastDayOfMonth、firstDayOfNextMonth、nextOrSame、previousOrSame。它们都实现 TemporalAdjuster 接口，可以传给 with。自己写“跳过周末”的逻辑时，用 nextOrSame 加循环比手算星期几更不容易错。TemporalAdjusters 是工具类，方法都是静态的，导入后直接调用即可。' },
      { p: '不可变对象非常适合做缓存和常量。比如把“系统上线日”定义成 <code>static final LocalDate LAUNCH = LocalDate.of(2024, 1, 1)</code>，任何地方引用都不会被改。反过来，如果你需要一个可变的“时间范围”对象，应该自己写一个包含两个 LocalDate 的小类，而不是把 LocalDate 包在可变容器里到处传。' },

      { h: '3.7 时区与 Instant' },
      { p: '<code>Instant</code> 表示 UTC 时间轴上的一个点，内部就是秒加纳秒，不携带任何时区信息。它适合存储和传输，因为无论服务器在哪个时区，同一个 Instant 都指向同一个时刻。要把 Instant 变成人看的日期，必须提供 ZoneId；反过来，把 LocalDateTime 变成 Instant，也必须提供 ZoneId。' },
      { code: 'import java.time.*;\n\npublic class ZoneDemo {\n    public static void main(String[] args) {\n        Instant epoch = Instant.ofEpochSecond(0);\n        System.out.println(epoch);\n\n        ZonedDateTime shanghai = epoch.atZone(ZoneId.of("Asia/Shanghai"));\n        ZonedDateTime newYork = epoch.atZone(ZoneId.of("America/New_York"));\n        System.out.println(shanghai);\n        System.out.println(newYork);\n\n        LocalDateTime local = LocalDateTime.of(2024, 10, 20, 8, 0);\n        ZonedDateTime zoned = local.atZone(ZoneId.of("Asia/Shanghai"));\n        System.out.println(zoned.toInstant());\n\n        System.out.println(ZoneId.systemDefault());\n    }\n}', title: 'ZoneDemo.java' },
      { out: '1970-01-01T00:00:00Z\n1970-01-01T08:00+08:00[Asia/Shanghai]\n1969-12-31T19:00-05:00[America/New_York]\n2024-10-20T00:00:00Z\nAsia/Shanghai' },
      { p: '同一个 Instant，在上海显示为 1970-01-01 08:00，在纽约显示为 1969-12-31 19:00。输出里的 <code>[Asia/Shanghai]</code> 是时区 ID，前面的 +08:00 是当时的偏移量。注意偏移量会随夏令时变化，所以纽约在冬天是 -05:00，夏天是 -04:00，而时区 ID 不变。' },
      { p: '夏令时是日期时间最麻烦的边界。美国春季切换的那天，凌晨 2:00 会直接跳到 3:00，本地时间 2:30 不存在；秋季切换的那天，1:30 会出现两次。java.time 对不存在的本地时间会向后调整到 3:30，对重复的时间默认取较早的一次。做跨时区业务时，尽量不要把本地时间直接当唯一依据。' },
      { p: '实际存储建议：数据库用 timestamp with time zone 或存 UTC 的 Instant，接口传输用 ISO 8601 字符串（如 2024-10-20T00:00:00Z），展示时再按用户时区转换。不要存一个不带时区的字符串然后假设它是北京时间，这种假设在跨区域部署时一定会出问题。' },
      { p: '时区规则不是一成不变的。各国会调整夏令时政策，ZoneId 依赖 JDK 自带的 tzdata，JDK 版本太旧可能算出错误的偏移。生产环境应定期升级 JDK，或者使用 tzdata 更新工具。跨时区业务上线前，最好用目标时区的真实数据跑一遍边界日期，而不是只在北京时间下测试。容器基础镜像里的时区文件也可能缺失，导致 ZoneId.of 抛异常，部署时要确认。' },

      { h: '3.8 DateTimeFormatter 与 pattern' },
      { p: '<code>DateTimeFormatter</code> 是不可变、线程安全的，可以放心定义为 static final 常量。构造方式有两种：用 <code>ofPattern</code> 自定义模式，或直接用预定义常量，如 <code>ISO_LOCAL_DATE</code>、<code>ISO_DATE_TIME</code>。后者无需记忆模式字母，适合机器间传输。' },
      { table: { head: ['字母', '含义', '示例'], rows: [
        ['<code>yyyy</code>', '四位年份', '2024'],
        ['<code>MM</code>', '两位月份', '10'],
        ['<code>dd</code>', '两位日', '20'],
        ['<code>HH</code>', '24 小时制小时', '13'],
        ['<code>hh</code>', '12 小时制小时', '01'],
        ['<code>mm</code>', '分钟', '45'],
        ['<code>ss</code>', '秒', '30'],
        ['<code>SSS</code>', '毫秒', '123'],
        ['<code>E</code>', '星期简称', 'Sun'],
        ['<code>a</code>', '上午/下午', 'PM'],
        ['<code>XXX</code>', '时区偏移', '+08:00']
      ] } },
      { p: '最容易错的是大小写：<code>MM</code> 是月份，<code>mm</code> 是分钟；<code>HH</code> 是 24 小时制，<code>hh</code> 是 12 小时制。把 <code>HH:mm</code> 写成 <code>HH:MM</code>，解析时可能直接抛异常，也可能得到错误结果，取决于模式是否宽松。记住一句口诀：大月小分，大时小秒。' },
      { p: '模式里的普通字母也有风险。如果你想让输出里出现字母 T 或 Z，必须用单引号把它包起来，例如 <code>yyyy-MM-dd\'T\'HH:mm</code>。不包起来，T 会被当成模式字母，可能解析失败。这个坑在拼接 ISO 风格字符串时很常见。' },
      { p: '预定义 formatter 值得单独记几个：<code>ISO_LOCAL_DATE</code> 对应 yyyy-MM-dd，<code>ISO_LOCAL_DATE_TIME</code> 对应带 T 的日期时间，<code>ISO_INSTANT</code> 对应带 Z 的 UTC 时间，<code>BASIC_ISO_DATE</code> 对应 20241020。机器间传输优先用这些常量，避免自定义模式带来的兼容问题。自定义模式适合展示给人看，不适合做协议。' },

      { h: '3.9 解析与格式化的实战' },
      { p: '解析用 <code>parse</code>，格式化用 <code>format</code>。默认的 ISO 格式可以直接 parse，比如 <code>LocalDate.parse("2024-10-20")</code>；自定义格式必须传 formatter。解析失败抛 <code>DateTimeParseException</code>，它是 RuntimeException 的子类，不强制捕获，但面向用户输入时应该捕获并给出提示。' },
      { p: '一次完整的解析通常包含五步：拿到原始字符串、按模式解析、校验业务范围、转换成需要的时区或 Instant、按目标格式输出。每一步都可能失败，也都应该有明确的错误信息。把这条链路封装成一个工具方法，比在业务代码里散落 parse 调用更可靠。' },
      { flow: ['拿到字符串', '按模式解析为 LocalDateTime', '校验业务范围', '必要时转成 Instant 或带时区时间', '按目标格式输出'] },
      { code: 'import java.time.*;\nimport java.time.format.*;\n\npublic class FormatDemo {\n    public static void main(String[] args) {\n        DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");\n        LocalDateTime dt = LocalDateTime.parse("2024-10-20 13:45:30", f);\n        System.out.println(dt);\n        System.out.println(dt.format(f));\n\n        DateTimeFormatter cn = DateTimeFormatter.ofPattern("yyyy年M月d日 EEEE", Locale.CHINA);\n        System.out.println(dt.format(cn));\n\n        try {\n            LocalDate.parse("2024-13-01");\n        } catch (DateTimeParseException e) {\n            System.out.println("日期不合法");\n        }\n    }\n}', title: 'FormatDemo.java' },
      { out: '2024-10-20T13:45:30\n2024-10-20 13:45:30\n2024年10月20日 星期日\n日期不合法' },
      { p: '第三行展示了 Locale 的作用：同样的日期，中文环境输出“星期日”，英文环境输出 Sunday。做国际化展示时一定要显式传 Locale，不要依赖服务器默认值。另外，<code>M</code> 和 <code>d</code> 是“能省则省”的宽度，1 月会输出 1 而不是 01；需要补零就写 <code>MM</code>、<code>dd</code>。' },
      { p: '解析还有宽严之分。默认的 <code>ResolverStyle.SMART</code> 会把 2 月 30 日调整到 2 月 29 日，而不是报错；如果你希望严格校验，用 <code>DateTimeFormatter.ofPattern(...).withResolverStyle(ResolverStyle.STRICT)</code>，并注意 STRICT 下必须用 <code>uuuu</code> 表示年份，而不是 <code>yyyy</code>。这是进阶细节，但做表单校验时会遇到。' },

      { h: '3.10 时间差：Duration 与 Period' },
      { p: '<code>Duration</code> 表示两个时刻之间的时间量，单位是秒和纳秒，适合算耗时、超时、缓存过期；<code>Period</code> 表示两个日期之间的量，单位是年、月、日，适合算年龄、账期、合同期限。两者都有 <code>between</code> 工厂方法，也都能参与 plus/minus 运算。' },
      { code: 'import java.time.*;\nimport java.time.temporal.ChronoUnit;\n\npublic class DurationDemo {\n    public static void main(String[] args) {\n        LocalTime start = LocalTime.of(9, 0);\n        LocalTime end = LocalTime.of(17, 30);\n        Duration work = Duration.between(start, end);\n        System.out.println(work);\n        System.out.println(work.toMinutes());\n\n        LocalDate from = LocalDate.of(2020, 1, 1);\n        LocalDate to = LocalDate.of(2024, 3, 15);\n        Period period = Period.between(from, to);\n        System.out.println(period);\n        System.out.println(period.getYears() + " " + period.getMonths() + " " + period.getDays());\n\n        System.out.println(ChronoUnit.DAYS.between(from, to));\n    }\n}', title: 'DurationDemo.java' },
      { out: 'PT8H30M\n510\nP4Y2M14D\n4 2 14\n1535' },
      { p: 'Duration 的 toString 以 PT 开头，P 表示 period，T 表示 time，8 小时 30 分钟写成 PT8H30M。toMinutes 返回 510，是总分钟数。Period 的输出 P4Y2M14D 表示 4 年 2 个月 14 天，注意这里的“14 天”是按日历逐段计算的结果，不是总天数；要总天数用 <code>ChronoUnit.DAYS.between</code>，得到 1535。' },
      { p: '这两个类的语义不同，不能混用。用 Period 算“两个时间点相差多少小时”没有意义，用 Duration 算“相差几个月”也不对，因为月长不固定。跨夏令时的 Duration 和 Period 结果也会不同：Duration 按真实经过的秒数算，Period 按日历字段算。业务上先明确要哪一种，再选类。' },
      { p: '计算耗时不要用 <code>System.currentTimeMillis()</code> 相减，它受系统时钟调整影响，可能得到负数；用 <code>System.nanoTime()</code> 或 <code>Instant</code> 配合 Duration。nanoTime 只适合测量时间间隔，不能用来表示绝对时刻，它的起点是任意的。同理，判断超时用单调时钟，判断“现在几点”用墙上时钟。' },
      { p: '算工作日、账期这类需求，ChronoUnit 比手写毫秒除法可靠。ChronoUnit.DAYS.between 只算整天数，不受时分秒影响；ChronoUnit.MONTHS.between 按完整月份算，1 月 31 日到 2 月 29 日算 0 个月。需要“加 N 个工作日”时，写一个循环跳过周六周日和法定节假日，把节假日做成可配置的集合，不要硬编码在方法里。' },

      { h: '3.11 与旧 API 互转' },
      { p: '新项目不应该再用 Date 和 Calendar，但遗留系统、JDBC、老日志框架仍然会碰到它们。互转的关键是抓住“Instant 是桥梁”：Date 可以转 Instant，Instant 可以转 Date；java.sql.Date 和 Timestamp 则分别对应 LocalDate 和 LocalDateTime。' },
      { code: 'import java.time.*;\nimport java.util.Date;\n\npublic class LegacyDemo {\n    public static void main(String[] args) {\n        Date old = new Date();\n        Instant instant = old.toInstant();\n        Date back = Date.from(instant);\n        System.out.println(back.equals(old));\n\n        java.sql.Date sqlDate = java.sql.Date.valueOf(LocalDate.of(2024, 10, 20));\n        LocalDate localDate = sqlDate.toLocalDate();\n        System.out.println(localDate);\n\n        java.sql.Timestamp ts = java.sql.Timestamp.valueOf(LocalDateTime.of(2024, 10, 20, 13, 45));\n        System.out.println(ts.toLocalDateTime());\n    }\n}', title: 'LegacyDemo.java' },
      { out: 'true\n2024-10-20\n2024-10-20T13:45' },
      { p: 'Date.from 和 toInstant 是无损的，因为 Date 内部本来就是毫秒时间戳。java.sql.Date.valueOf 要求传入 LocalDate，返回的 Date 只保留日期部分；Timestamp 则保留到纳秒（受底层精度限制）。用 JDBC 4.2 以后，可以直接用 <code>setObject(index, localDate)</code>，驱动会帮你转换，比手动转 sql 包更省事。' },
      { p: '还有一个常见场景：老代码把日期存成 <code>yyyy-MM-dd</code> 字符串。迁移时不要用 <code>SimpleDateFormat</code> 去解析，直接用 <code>LocalDate.parse</code>；如果格式不标准，再用 DateTimeFormatter 指定模式。统一入口、统一格式，能避免新旧混用带来的时区偏差。' },
      { p: 'JDBC 映射要区分类型：DATE 对应 LocalDate，TIME 对应 LocalTime，TIMESTAMP 对应 LocalDateTime，TIMESTAMP WITH TIME ZONE 对应 OffsetDateTime。用 <code>ResultSet.getObject(col, LocalDate.class)</code> 可以直接拿到新类型，不需要经过 java.sql.Date。如果驱动版本较老，再退回 getDate 加 toLocalDate 的写法。' },

      { h: '3.12 常见错误与边界' },
      { list: [
        '把 <code>LocalDateTime</code> 当时间戳存储，换一台时区不同的服务器就变了含义。',
        '用 <code>==</code> 比较两个 LocalDate，比较的是引用；应该用 <code>equals</code> 或 <code>isEqual</code>。',
        '格式化模式里 <code>MM</code> 和 <code>mm</code> 写反，月份和分钟互换。',
        '忘了 plus/minus 返回新对象，原变量根本没变。',
        '用 30 天代表一个月，跨月、闰年、月末全部出错。',
        '在共享的 <code>SimpleDateFormat</code> 上并发调用，结果随机错乱。',
        '解析用户输入不捕获 <code>DateTimeParseException</code>，直接 500。',
        '跨时区业务用本地时间做唯一判断，忽略夏令时导致的跳过与重复。'
      ] },
      { p: '这些错误的共同点是“本地能跑”。日期时间的 bug 往往只在特定日期、特定时区、特定并发下出现，测试时很难覆盖。防御的办法不是多写 if，而是把语义固定下来：存储统一用 UTC，展示统一按用户时区，解析统一走一个工具方法，格式化统一用常量。' },
      { p: '和 JSON 序列化框架配合时要注意：Jackson 从 2.6 起通过 JavaTimeModule 支持 java.time，但默认可能把日期写成数组或时间戳，需要显式配置。接口契约里最好写清楚是 ISO 字符串还是毫秒数，前后端各写各的格式，是时间字段错乱的高发区。如果团队用 Spring Boot，通常只需注册模块并关闭 WRITE_DATES_AS_TIMESTAMPS。' },
      { p: '写测试时，尽量不要在断言里用 now()。把“当前时间”作为参数传进业务方法，测试时传入固定值，才能稳定复现月末、闰年、夏令时这些边界。需要固定时钟时，可以用 <code>Clock.fixed(instant, zone)</code> 注入，这也是 java.time 为可测试性留下的接口。日期逻辑的可测试性，往往比性能更值得投入。' },

      { h: '3.13 本章小结' },
      { list: [
        'java.time 的核心类不可变、线程安全，修改操作返回新对象。',
        'Instant 是时刻，LocalDate/LocalTime/LocalDateTime 是日历，ZonedDateTime 是带时区的完整时间。',
        '月份从 1 开始，getMonth 返回枚举，getMonthValue 返回数字。',
        'plusMonths 会把月末调整到目标月最后一天，不会溢出到再下个月。',
        'DateTimeFormatter 线程安全，模式字母大小写敏感，MM 是月、mm 是分。',
        'Duration 算时刻差，Period 算日期差，跨夏令时两者结果不同。',
        '新旧 API 通过 Instant 互转，新代码不要再直接使用 Date 和 Calendar。',
      ] },
      { p: '把上面几条压缩成一句话：先分清时刻与日历，再决定要不要时区，最后用不可变 API 做计算。遇到不确定的行为，写一个最小例子跑一遍，比在群里问更快。' },
      { p: '最后提醒一个跨语言协作的坑：Java 的毫秒时间戳是 13 位，Unix 秒是 10 位，JavaScript 的 Date.now() 也是毫秒。接口里只写 timestamp 不写单位，前后端一定会有一边多乘或漏乘 1000。约定字段名带上单位，例如 createdAtMillis，能省掉很多排查；数据库里存秒还是毫秒，也要在表结构注释里写清楚。' },

      { h: '3.14 常见追问' },
      { list: [
        '<b>为什么 LocalDateTime 不能直接转 Instant？</b>因为它不含时区，同一个本地时间在不同时区对应不同时刻，必须补一个 ZoneId 才能确定。',
        '<b>数据库该存 timestamp 还是 datetime？</b>需要表达绝对时刻用 timestamp with time zone 或 UTC 时间戳；只表达“墙上时间”用 datetime，但要明确它属于哪个时区。',
        '<b>Period.between 算出来的天数为什么和总天数不一样？</b>Period 按年、月、日逐段分解，月长不固定；要总天数用 ChronoUnit.DAYS.between。',
        '<b>DateTimeFormatter 真的线程安全吗？</b>是，它是不可变对象，可以定义为 static final 共享；SimpleDateFormat 则不行。',
        '<b>怎么表示“本月最后一天”？</b>用 <code>date.with(TemporalAdjusters.lastDayOfMonth())</code>，不要手写 28/30/31 的判断。',
        '<b>系统时区怎么影响结果？</b>LocalDateTime.now()、Instant 的默认展示、旧 API 的 toString 都依赖默认时区，容器里通常是 UTC，和开发机不一致。'
      ] },
      { p: '遇到答不上来的追问，不要背答案，回到“时刻、日历、时区”三个概念上推导，大多数问题都能想通。日期时间的知识是网状的，抓住主干比记住碎片更有效。' },

      { h: '3.15 自测与练习' },
      { ol: [
        '写一个方法，输入两个 LocalDate，输出它们之间相隔的完整年数、月数和天数。',
        '把 <code>"2024-10-20T13:45:30+08:00"</code> 解析成 Instant，再分别按上海和纽约时区格式化输出。',
        '实现“本月第一个工作日”：从本月 1 日开始，跳过周六周日，返回第一个周一至周五的日期。',
        '解释为什么 <code>LocalDate.of(2024, 2, 30)</code> 会抛异常，而某些 formatter 解析 2 月 30 日却不会。',
        '把一个旧的 <code>java.util.Date</code> 转成 <code>LocalDateTime</code>，要求使用指定时区，并说明每一步的含义。'
      ] },
      { note: '<b>练习建议：</b>先自己写，再对照文档；每道题都补一个边界用例（闰年、月末、跨时区），才算真正做完。做完后把代码留档，两周后再不看答案重写一遍，效果最好。' },
    ]
  };

  T['regex'] = {
    meta: '本章约 5600 字 · 建议 36 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '4.1 为什么学正则，先看清它能做什么' },
      { p: '正则表达式是一套描述“字符串长什么样”的小语言。它最擅长的四件事是：校验（这个手机号格式对不对）、提取（从日志里抠出订单号）、替换（把敏感词打码）、分割（按多个分隔符切开）。只要你的需求符合“某种文本模式”，正则往往能用一两行代替几十行循环判断。' },
      { p: '任何正则都可以拆成三层。第一层是“匹配什么字符”：普通字符、字符类（<code>[abc]</code>）、预定义类（<code>\\d</code>、<code>\\w</code>）。第二层是“匹配多少个”：量词 <code>*</code>、<code>+</code>、<code>?</code>、<code>{n,m}</code>。第三层是“匹配在哪里”：锚点 <code>^</code>、<code>$</code>、<code>\\b</code>。把这三层分开看，再长的正则也能拆解。' },
      { p: 'Java 里正则由 <code>java.util.regex</code> 包提供，核心是 <code>Pattern</code> 和 <code>Matcher</code>。Pattern 是编译后的规则，Matcher 是把规则应用到某个字符串上的“匹配器”。String 类的 matches、replaceAll、split 内部也是这套机制，只是帮你省了显式创建对象的步骤。' },
      { p: '但正则不是万能的。它适合处理规则明确的短文本，不适合解析 HTML、JSON、XML 这类嵌套结构，也不适合做复杂的语法分析。用正则解析 HTML，遇到嵌套标签、注释、属性顺序就会崩溃；这类工作应该交给专门的解析器。判断标准很简单：如果你的规则需要“数括号层数”，就别用正则。' },
      { p: '还有一个现实问题：正则的可读性差。三天后回看自己写的 <code>^(?=.*[A-Z])(?=.*\\d).{8,20}$</code>，很可能要想半天。所以工程上建议给复杂正则起名字、写注释、配单元测试，而不是把它散落在业务代码里。本章的目标不是让你背语法，而是让你能读懂常见正则、写出可维护的正则，并在该收手的时候收手。' },
      { p: '写正则之前先问：有没有更简单的办法？判断前缀用 startsWith，判断包含用 contains，按固定分隔符切分用字面 split，这些都比正则快且好懂。只有当规则涉及可变的长度、可选的片段、多个分支时，正则才真正划算。选错工具的成本，往往比写错正则更高。团队里可以约定：超过 30 个字符的正则必须配注释和测试。' },
      { p: '学习正则最有效的方式不是背语法，而是带着任务写：先写一个能跑通的粗糙版本，再用正例和反例逐步收紧。每收紧一次，就记录它挡住了什么、放过了什么。三五个真实任务之后，你会发现自己不再害怕那一串符号，而是能读出它的结构。' },
      { h: '4.2 元字符、锚点与转义' },
      { p: '元字符是正则里有特殊含义的字符：<code>.</code> <code>\\</code> <code>[]</code> <code>()</code> <code>{}</code> <code>*</code> <code>+</code> <code>?</code> <code>^</code> <code>$</code> <code>|</code>。想匹配它们本身，必须用反斜杠转义，比如匹配小数点要写 <code>\\.</code>。在 Java 字符串里，反斜杠本身还要再转义一次，所以源码里写成 <code>"\\\\."</code>，这是初学者最容易被绕晕的地方。' },
      { table: { head: ['写法', '含义', '例子'], rows: [
        ['<code>.</code>', '任意一个字符（默认不含换行）', 'a.c 匹配 abc、a1c'],
        ['<code>\\d</code>', '一个数字 0-9', '\\d{3} 匹配 123'],
        ['<code>\\w</code>', '字母、数字、下划线', '\\w+ 匹配 user_1'],
        ['<code>\\s</code>', '空白字符', 'a\\sb 匹配 a b'],
        ['<code>[abc]</code>', '方括号内任意一个字符', '[aeiou] 匹配元音'],
        ['<code>[^abc]</code>', '不在方括号内的字符', '[^0-9] 匹配非数字'],
        ['<code>^</code>', '字符串开头（MULTILINE 下是行首）', '^Java'],
        ['<code>$</code>', '字符串结尾（MULTILINE 下是行尾）', 'end$'],
        ['<code>\\b</code>', '单词边界', '\\bcat\\b 匹配独立的 cat'],
        ['<code>|</code>', '或，优先级最低', 'cat|dog']
      ] } },
      { p: '注意 Java 的 <code>\\d</code> 默认只匹配 ASCII 数字 0-9，不匹配全角数字或阿拉伯-印度数字。如果要做 Unicode 数字匹配，需要加 <code>Pattern.UNICODE_CHARACTER_CLASS</code> 标志。中文匹配通常直接用 <code>[\\u4e00-\\u9fa5]</code> 表示常用汉字区间，但它并不覆盖所有 CJK 扩展字符。' },
      { p: '字符类还有几个细节：方括号里可以用范围，比如 [a-z]；可以并列多个范围，比如 [a-zA-Z0-9_]；开头的 ^ 表示取反；要匹配右方括号本身，把它放在第一位或转义；要匹配连字符，放在末尾或转义。这些规则看起来琐碎，但写“允许的字符集”时天天用到。字符类里的点号、星号都失去特殊含义，不用转义。' },
      { p: '锚点不消耗字符，只描述位置。<code>^</code> 和 <code>$</code> 在默认模式下匹配整个输入的开头和结尾；加上 <code>Pattern.MULTILINE</code> 后，它们匹配每一行的开头和结尾。还有一个 <code>\\A</code> 和 <code>\\z</code>，分别表示输入的最开头和最末尾，不受 MULTILINE 影响，适合做严格的整串校验。' },
      { h: '4.3 量词、贪婪与懒惰' },
      { p: '量词决定前面的元素重复多少次：<code>*</code> 是 0 次或多次，<code>+</code> 是 1 次或多次，<code>?</code> 是 0 次或 1 次，<code>{n}</code> 恰好 n 次，<code>{n,}</code> 至少 n 次，<code>{n,m}</code> 是 n 到 m 次。量词默认是贪婪的：在还能匹配的前提下，它会尽量多吃字符。' },
      { p: '贪婪会导致“吃过头”。比如用 <code>&lt;.+&gt;</code> 去匹配 <code>&lt;b&gt;加粗&lt;/b&gt;</code>，结果会匹配整个字符串，而不是两个标签。解决办法有两个：把量词改成懒惰的 <code>+?</code>，让它尽量少吃；或者把 <code>.</code> 换成更精确的字符类，比如 <code>[^&gt;]+</code>。后者通常更清晰，也更不容易回溯。' },
      { code: 'import java.util.regex.*;\n\npublic class QuantifierDemo {\n    public static void main(String[] args) {\n        String html = "<b>bold</b>";\n        Matcher greedy = Pattern.compile("<.+>").matcher(html);\n        Matcher lazy = Pattern.compile("<.+?>").matcher(html);\n\n        if (greedy.find()) System.out.println("greedy: " + greedy.group());\n        if (lazy.find()) System.out.println("lazy: " + lazy.group());\n\n        System.out.println("a".matches("a?"));\n        System.out.println("aaa".matches("a{2,3}"));\n        System.out.println("".matches("a*"));\n    }\n}', title: 'QuantifierDemo.java' },
      { out: 'greedy: <b>bold</b>\nlazy: <b>\ntrue\ntrue\ntrue' },
      { p: '贪婪版吃掉了整段，懒惰版只取第一个标签。最后三行验证量词边界：a? 允许零个或一个，空串也算匹配；a{2,3} 允许 2 到 3 个，aaa 正好 3 个所以是 true；空串对 a* 也是 true，因为星号允许 0 次。<code>"".matches("a+")</code> 才是 false。量词写的是闭区间，{2,3} 的两个边界都包含。' },
      { note: '<b>占有量词：</b>Java 还支持 <code>*+</code>、<code>++</code>、<code>?+</code>，它们会一次性吃掉所有能吃的字符且不回溯，常用于性能优化，但用错会直接导致匹配失败。' },
      { p: '量词还能修饰分组，比如 (ab){2} 表示 ab 出现两次，而不是 a 两次 b 两次。空匹配要特别小心：a* 可以匹配空串，所以在 find 循环里如果正则整体可以为空，可能原地打转；Java 的 Matcher 会自动推进，但逻辑上仍要避免这种设计。写提取规则时，尽量让正则至少消耗一个字符，量词的目标越明确，回溯越少。' },
      { h: '4.4 分组、捕获与反向引用' },
      { p: '圆括号有两个作用：分组和捕获。分组改变量词的作用范围，比如 <code>(ab)+</code> 表示 ab 重复多次；捕获会把括号匹配到的内容存起来，之后可以用 <code>group(1)</code>、<code>group(2)</code> 取出。第 0 组永远是整个匹配，第 1 组开始才是括号。' },
      { code: 'import java.util.regex.*;\n\npublic class GroupDemo {\n    public static void main(String[] args) {\n        String text = "2024-10-20";\n        Pattern p = Pattern.compile("(\\\\d{4})-(\\\\d{2})-(\\\\d{2})");\n        Matcher m = p.matcher(text);\n\n        if (m.matches()) {\n            System.out.println(m.group(0));\n            System.out.println(m.group(1));\n            System.out.println(m.group(2));\n            System.out.println(m.group(3));\n        }\n\n        Matcher named = Pattern.compile("(?<year>\\\\d{4})-(?<month>\\\\d{2})").matcher("2024-10");\n        if (named.find()) {\n            System.out.println(named.group("year"));\n            System.out.println(named.group("month"));\n        }\n    }\n}', title: 'GroupDemo.java' },
      { out: '2024-10-20\n2024\n10\n20\n2024\n10' },
      { p: '这段代码把日期拆成三段。命名分组 <code>(?&lt;year&gt;...)</code> 让代码更可读，取的时候用名字而不是数字，正则一改也不容易错位。非捕获分组 <code>(?:...)</code> 只分组不占编号，适合纯粹为了加量词或做或运算的场景，能减少 group 编号的混乱。' },
      { p: '反向引用 <code>\\1</code> 表示“和第一组匹配到的内容一样”。比如 <code>(\\w)\\1</code> 可以找连续两个相同字符，<code>(a)(b)\\2\\1</code> 匹配 abba。反向引用在 Java 字符串里同样要转义，写成 <code>"(\\\\w)\\\\1"</code>。这个特性在检查重复字符、配对标签时有用，但不要滥用，复杂回溯会变慢。' },
      { p: '捕获组按左括号出现的顺序编号，嵌套时也是先外层后内层。可选组没匹配到时，group(n) 返回 null，而不是空串，直接调用它的方法会 NPE。非捕获组 (?:...) 不占编号，命名组用名字取，能让代码在正则调整后依然稳定。写复杂正则时优先用命名组，groupCount() 可以查看组数。' },
      { h: '4.5 三个 String 方法与 Pattern、Matcher' },
      { p: '日常使用频率最高的是 String 上的三个方法：<code>matches</code> 做整串校验，<code>replaceAll</code> 做正则替换，<code>split</code> 做正则分割。它们内部都会编译正则，适合一次性调用；如果同一正则要用很多次，先 <code>Pattern.compile</code> 缓存起来更划算。' },
      { code: 'public class StringMethods {\n    public static void main(String[] args) {\n        System.out.println("13812345678".matches("^1[3-9]\\\\d{9}$"));\n        System.out.println("a1b2c3".replaceAll("\\\\d", "#"));\n        System.out.println("a,b;c d".split("[,; ]").length);\n\n        String[] parts = "a,b;c d".split("[,; ]");\n        for (String s : parts) System.out.println(s);\n\n        System.out.println("a.b.c".split("\\\\.").length);\n    }\n}', title: 'StringMethods.java' },
      { out: 'true\na#b#c#\n4\na\nb\nc\nd\n3' },
      { p: '注意 <code>matches</code> 里的 <code>^</code> 和 <code>$</code> 其实是多余的，因为 matches 本身就是全匹配；写上也无害，还能让意图更明显。replaceAll 的第一个参数是正则，所以 <code>\\d</code> 要写成 <code>"\\\\d"</code>；如果想按字面替换，用 <code>replace</code> 而不是 replaceAll，避免特殊字符被解释。' },
      { p: '一个关键区别是“全匹配”和“查找”。<code>String.matches</code> 要求整个字符串都匹配，等价于在正则前后加上 <code>^</code> 和 <code>$</code>；<code>Matcher.find</code> 只要求找到一段匹配的子串。很多人写校验时用 matches 没问题，写提取时却忘了用 find，结果怎么都不对。' },
      { p: 'split 的参数同样是正则。<code>"a.b.c".split("\\\\.")</code> 得到三段；如果写成 <code>split(".")</code>，点号会匹配任意字符，结果是一个空数组。这是最经典的 split 坑。另外，split 默认会丢弃末尾的空字符串，<code>"a,b,".split(",")</code> 只得到两个元素；需要保留时传负的 limit，比如 <code>split(",", -1)</code>。' },
      { p: 'replaceFirst 只替换第一个匹配，replaceAll 替换全部；String.replace 是字面替换，不解释正则。大小写不敏感用 Pattern.CASE_INSENSITIVE，多行模式用 MULTILINE，让点号匹配换行用 DOTALL。这些标志既可以传给 Pattern.compile，也可以在正则开头用 (?i)、(?m)、(?s) 内联开启，后者适合把规则嵌进配置。' },
      { p: '当需要反复匹配、提取多个结果、或者要拿到匹配位置时，就该显式使用 Pattern 和 Matcher。典型流程是：编译 Pattern、用 matcher 绑定输入、循环 find、在每次找到时读取 group 和 start/end。find 会把匹配位置向后推进，所以循环能遍历所有结果。' },
      { flow: ['Pattern.compile 编译规则', 'pattern.matcher(input) 创建匹配器', 'while (matcher.find()) 推进', 'matcher.group(n) 取内容', 'matcher.start/end 取位置', '必要时 reset 复用'] },
      { code: 'import java.util.regex.*;\n\npublic class MatcherDemo {\n    public static void main(String[] args) {\n        Pattern p = Pattern.compile("\\\\b(\\\\w+)@(\\\\w+\\\\.\\\\w+)\\\\b");\n        Matcher m = p.matcher("联系 a@x.com 或 b@y.org 获取");\n\n        while (m.find()) {\n            System.out.println(m.group() + " -> " + m.group(1) + " / " + m.group(2));\n            System.out.println(m.start() + "-" + m.end());\n        }\n\n        m.reset("no email here");\n        System.out.println(m.find());\n    }\n}', title: 'MatcherDemo.java' },
      { out: 'a@x.com -> a / x.com\n3-10\nb@y.org -> b / y.org\n14-21\nfalse' },
      { p: '这段代码提取了两个邮箱，并打印了它们在原字符串中的起止下标。注意 group() 等价于 group(0)，是整个匹配；group(1) 是第一个括号。reset 可以换一个输入复用同一个 Matcher，避免重复创建对象。如果只想匹配开头一次，用 <code>lookingAt</code>；想从某个位置开始，用 <code>find(int start)</code>。' },
      { p: 'Matcher 还有 <code>replaceAll</code> 和 <code>appendReplacement</code> 两组替换 API。后者适合“边匹配边拼接”的复杂替换，可以在替换串里引用分组，比如把日期从 yyyy-MM-dd 改成 dd/MM/yyyy：<code>m.appendReplacement(sb, "$3/$2/$1")</code>。替换串里的 <code>$</code> 和反斜杠有特殊含义，必要时用 <code>Matcher.quoteReplacement</code> 转义。' },
      { p: 'Matcher 内部保存了当前匹配位置和分组结果，所以它不是线程安全的，也不能在 find 循环中间随意跳用。需要并发匹配时，每个线程创建自己的 Matcher；需要重复使用时，调用 reset 回到起点。Matcher 的 group 只有在 find 或 matches 成功之后才有意义，提前调用会抛 IllegalStateException。' },
      { p: 'Pattern.compile 有一定成本，但它编译出的 Pattern 是不可变且线程安全的，可以定义为 static final 反复使用。相反，String.matches 每次调用都会重新编译，在循环或高频接口里是明显的浪费。Matcher 则不是线程安全的，每个线程、每次匹配都应该新建或 reset，不要把它缓存在成员变量里。一条经验：Pattern 缓存，Matcher 现用现建。' },
      { h: '4.6 实战：手机号、邮箱与日期' },
      { p: '手机号校验是正则的入门实战。中国大陆手机号是 11 位，第一位 1，第二位 3 到 9，后面九位数字，写成 <code>^1[3-9]\\d{9}$</code>。这个规则足够挡住明显的脏数据，但它不能判断号码是否真实存在，也不能覆盖所有虚拟号段。校验格式用正则，校验真实性要靠短信验证码。' },
      { code: 'public class ValidateDemo {\n    public static void main(String[] args) {\n        String phone = "^1[3-9]\\\\d{9}$";\n        System.out.println("13812345678".matches(phone));\n        System.out.println("12812345678".matches(phone));\n\n        String email = "^[\\\\w.+-]+@[\\\\w-]+(\\\\.[\\\\w-]+)+$";\n        System.out.println("a.b+c@mail.example.com".matches(email));\n        System.out.println("not-an-email".matches(email));\n\n        String date = "^\\\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\\\d|3[01])$";\n        System.out.println("2024-10-20".matches(date));\n        System.out.println("2024-02-30".matches(date));\n    }\n}', title: 'ValidateDemo.java' },
      { out: 'true\nfalse\ntrue\nfalse\ntrue\ntrue' },
      { p: '注意最后两行：2024-02-30 也能通过正则，因为正则只检查“月份 01-12、日期 01-31”的格式，不知道 2 月只有 29 天。这是正则的边界：它能校验形状，不能校验语义。正确做法是先用正则筛掉格式错误，再用 <code>LocalDate.parse</code> 做真实性校验，两层配合。' },
      { p: '邮箱正则同样不要追求“完全符合 RFC”。RFC 允许的邮箱格式极其复杂，包含引号、注释、IP 域名等，写一个全覆盖的正则既难读又难维护。工程上通常用一个宽松规则挡住明显错误，再通过“发送验证邮件”确认真实性。校验的目的不是消灭所有非法输入，而是用合理成本挡住大多数问题。' },
      { p: '身份证、车牌、URL 的校验思路相同：先用正则约束长度和字符集，再用校验位或解析器做二次验证。身份证最后一位是校验码，需要按加权算法计算，正则只能检查 18 位的形状；车牌涉及省份简称和新能源格式，规则会随政策变化，最好做成可配置。任何“永远不变”的编码规则，都要留出调整的余地。' },
      { p: '还有一类需求是提取而不是判断，比如从日志里取时间、从文本里取金额。这时不要用 matches，而要用 find 配合分组，把关心的部分括起来。提取规则写完后，用几行真实日志跑一遍，确认 null、空串、多个匹配都处理了，再放进生产代码。' },
      { h: '4.7 替换、分割与边界' },
      { p: '替换分两种：<code>replaceAll</code> 支持正则和分组引用，<code>replace</code> 只做字面替换。想把手机号中间四位打码，可以写 <code>phone.replaceAll("(\\\\d{3})\\\\d{4}(\\\\d{4})", "$1****$2")</code>。这里的 <code>$1</code>、<code>$2</code> 引用分组，替换串里的美元符号如果要原样输出，必须写成 <code>\\$</code>。' },
      { p: '分割的边界情况更多。除了前面说的点号要转义、末尾空串默认丢弃，还要注意连续分隔符会产生空串。比如 <code>"a,,b".split(",")</code> 得到三个元素，中间是空字符串；如果业务上要忽略空段，可以过滤，或者用 <code>split(",+")</code> 把连续分隔符合并。没有一种写法适合所有场景，先想清楚空段是有效数据还是噪声。' },
      { code: 'public class ReplaceSplitDemo {\n    public static void main(String[] args) {\n        String phone = "13812345678";\n        System.out.println(phone.replaceAll("(\\\\d{3})\\\\d{4}(\\\\d{4})", "$1****$2"));\n\n        String csv = "a,,b,";\n        System.out.println(csv.split(",").length);\n        System.out.println(csv.split(",", -1).length);\n\n        String text = "cat bat hat";\n        System.out.println(text.replaceAll("\\\\b(\\\\w)at\\\\b", "$1$1"));\n    }\n}', title: 'ReplaceSplitDemo.java' },
      { out: '138****5678\n3\n4\ncc bb hh' },
      { p: '第一行是打码。第二行默认 limit 为 0，会删除末尾所有空字符串，但中间的空串保留，所以 a,,b, 得到 a、空串、b 三段，长度是 3；第三行传 -1 保留末尾空串，得到四段。最后一行把 cat、bat、hat 各替换成重复首字母，得到 cc bb hh。split 的三个规则——limit 为 0 删末尾空串、正数限制段数、负数保留空串——值得亲手跑一遍。' },
      { p: '替换串里的反斜杠和美元符号都有特殊含义：$1 引用分组，反斜杠转义，其他字符原样输出。如果替换内容来自用户输入，必须先 quoteReplacement，否则用户输入一个美元符号就可能抛异常。appendReplacement 适合需要逐段处理的场景，比如把匹配到的每个词加上链接，最后再 appendTail 收尾。' },
      { p: '正则的分组编号在替换时同样有效，$1 到 $9 可以直接引用；超过 9 个组时要用花括号包住编号，例如美元符号后跟 10 再包花括号，但花括号在 Java 字符串里不需要额外转义。这个细节很少用到，一旦用到却很容易写错，所以复杂替换建议先用小例子验证编号。' },
      { h: '4.8 灾难性回溯与性能' },
      { p: '正则引擎默认是回溯式的：遇到分支或量词时，它先尝试一种可能，失败再退回上一个选择点换一种。大多数情况下这很快，但当正则写得不好、输入又很长时，回溯次数会指数级增长，CPU 直接被打满。这就是“灾难性回溯”（catastrophic backtracking），也是正则最危险的地方。' },
      { p: '经典例子是 <code>(a+)+b</code> 去匹配一长串 a 加上一个非 b 字符。嵌套量词让引擎在每一层都尝试所有切分方式，输入长度每增加一点，耗时翻倍。类似的还有 <code>(a|aa)+</code>、<code>(.*)*</code>。防御方法：避免嵌套量词、尽量用具体字符类代替点号、加上锚点缩小范围、限制输入长度、对用户输入的正则做白名单。' },
      { p: 'Java 没有内置的正则超时参数，但可以把输入包成一个带计数器的 CharSequence，在 charAt 被调用太多次时抛异常，从而中断匹配。更简单的工程做法是：不要允许用户自定义正则；对可能很长的文本先截断；把复杂正则放到单独的线程池并设置超时。性能问题往往不是正则本身慢，而是它被用在了不该用的地方。' },
      { p: '调试正则时，先把正则拆成小段分别测试，再组合；用 Pattern 的 pattern() 打印实际规则，确认转义层数；准备正例、反例、边界例三组用例。很多“正则不生效”的问题，其实是多转义或少转义了一层。把正则写进常量并配注释，能让下一个人少花半小时。工具方面，任何支持 Java 正则的测试器都可以，但不要粘贴敏感数据。' },
      { note: '<b>经验法则：</b>能用一个字符类描述的，就不要用嵌套量词；能先做字符串包含判断的，就不要一上来就跑正则。' },
      { h: '4.9 Math 与随机数工具' },
      { p: '正则之外，这一节补两个常被忽略的工具：Math 和随机数。Math 是静态工具类，提供 abs、max、min、pow、sqrt、round、floor、ceil、random 等方法。它们看起来简单，但边界不少：<code>Math.abs(Integer.MIN_VALUE)</code> 仍然是负数，因为补码表示的正数范围比负数少一个；<code>Math.round(-1.5)</code> 返回 -1，不是 -2，因为它等价于 floor(x + 0.5)。' },
      { table: { head: ['方法', '作用', '注意点'], rows: [
        ['<code>abs(x)</code>', '绝对值', 'MIN_VALUE 取绝对值仍为负'],
        ['<code>max/min</code>', '最值', '有 int、long、double 等重载'],
        ['<code>round(x)</code>', '四舍五入到 long', '负数向正方向取整'],
        ['<code>floor/ceil</code>', '向下/向上取整', '返回 double'],
        ['<code>pow(a,b)</code>', '幂', '返回 double，可能有精度误差'],
        ['<code>sqrt(x)</code>', '平方根', '负数返回 NaN'],
        ['<code>random()</code>', '0 到 1 之间的 double', '不适合安全场景']
      ] } },
      { p: '随机数有三个常用类：<code>Random</code> 是基础款，线程间共享会有竞争；<code>ThreadLocalRandom</code> 是多线程下的推荐选择，每个线程独立种子，性能更好；<code>SecureRandom</code> 用于令牌、密码盐等安全场景，速度慢但不可预测。选哪个取决于用途，不要用 Random 生成验证码或会话 ID。' },
      { code: 'import java.util.concurrent.ThreadLocalRandom;\n\npublic class MathRandomDemo {\n    public static void main(String[] args) {\n        System.out.println(Math.abs(-5));\n        System.out.println(Math.round(-1.5));\n        System.out.println(Math.floor(-1.5));\n        System.out.println(Math.max(3, 7));\n\n        int n = ThreadLocalRandom.current().nextInt(1, 7);\n        System.out.println(n >= 1 && n <= 6);\n\n        System.out.println(java.util.UUID.randomUUID().toString().length());\n    }\n}', title: 'MathRandomDemo.java' },
      { out: '5\n-1\n-2.0\n7\ntrue\n36' },
      { p: 'round(-1.5) 得到 -1，floor(-1.5) 得到 -2.0，这两个结果放在一起最能说明“四舍五入”和“向下取整”的区别。nextInt(1, 7) 生成 1 到 6 的整数，上界不含，所以掷骰子写 7。UUID 是 36 个字符（含四个连字符），它基于随机数生成，适合做标识，但不保证绝对唯一。' },
      { h: '4.10 常见错误清单' },
      { list: [
        '在 Java 字符串里忘记双重转义，<code>"\\d"</code> 编译不过，应该写 <code>"\\\\d"</code>。',
        '用 <code>matches</code> 做子串查找，结果永远 false，因为 matches 要求全匹配。',
        '用 <code>split(".")</code> 分割，点号被当成任意字符，得到空数组。',
        '贪婪量词吃过头，提取标签或引号内容时拿到整段。',
        'group 编号从 0 开始，group(0) 是整个匹配，不是第一个括号。',
        'replaceAll 的替换串里直接写 <code>$</code> 或反斜杠，触发异常或错误结果。',
        '在循环里反复 <code>String.matches</code> 编译同一个正则，浪费 CPU。',
        '对超长用户输入跑复杂正则，触发灾难性回溯，拖垮线程。'
      ] },
      { p: '避开这些错误的关键，是把“正则字符串”和“Java 字符串”分开想：先写出你想要的正则，再考虑它在 Java 源码里需要几层转义。另一个习惯是每写一个正则，至少准备三个测试用例：一个应该匹配、一个不该匹配、一个边界情况。' },
      { p: '还有一种隐形成本：把校验和提取塞进同一个正则。校验通常要求全匹配、规则严格；提取只关心片段、规则宽松。混在一起会让正则又长又难调，出错时也分不清是校验太松还是提取太紧。拆成两个正则、两段代码，维护成本会低很多。正则不是越短越厉害，能被同事读懂才是好正则。Java 没有通用的正则注释语法，所以把解释写在代码注释里。写完把正则和配套用例一起提交，比只提交一行正则更有价值。' },
      { h: '4.11 本章小结' },
      { list: [
        '正则由字符、量词、位置三层组成，复杂正则要拆开读。',
        'Java 正则的核心是 Pattern 和 Matcher，String 的三个方法只是便捷封装。',
        'matches 是全匹配，find 是查找子串，别混用。',
        '量词默认贪婪，加问号变懒惰，占有量词不回溯但容易匹配失败。',
        '分组既能控制量词范围，也能捕获内容；命名分组更可读。',
        'split 的参数是正则，点号、竖线等元字符必须转义。',
        '正则校验格式，语义校验交给日期库或业务代码。',
        '警惕嵌套量词导致的灾难性回溯，限制输入长度。'
      ] },
      { h: '4.12 常见追问' },
      { list: [
        '<b>正则能解析 HTML 吗？</b>简单场景可以，嵌套结构不行；用 HTML 解析器更稳。',
        '<b>Pattern 需要缓存吗？</b>同一正则高频使用时应编译一次复用，String.matches 每次都会重新编译。',
        '<b>为什么 Java 正则要写两个反斜杠？</b>因为 Java 字符串先处理一层转义，正则引擎再处理一层。',
        '<b>贪婪和懒惰哪个性能好？</b>没有绝对答案；精确字符类通常比两者都好，因为减少了回溯。',
        '<b>split 为什么丢末尾空串？</b>默认 limit 为 0 会删除末尾空串，传 -1 可保留。',
        '<b>Math.random 能用于安全场景吗？</b>不能，用 SecureRandom；Math.random 基于伪随机数，可预测。'
      ] },
      { h: '4.13 自测与练习' },
      { ol: [
        '写一个正则，校验密码至少 8 位，且同时包含字母和数字。',
        '从一段文本中提取所有日期（yyyy-MM-dd），并打印每个日期的起始下标。',
        '把 <code>"2024-10-20"</code> 用 replaceAll 改写成 <code>"20/10/2024"</code>。',
        '解释 <code>"a,b,".split(",")</code> 与 <code>split(",", -1)</code> 的结果差异。',
        '用 ThreadLocalRandom 模拟掷两个骰子 1000 次，统计每个点数出现的次数。'
      ] },
    ]
  };


  T['arrays-tools'] = { meta: '本章约 5200 字 · 建议 32 分钟 · 配套流程图与 3 道习题', blocks: [

    { h: '5.1 为什么学：数组与工具类决定代码的下限' },

    { p: '数组是 Java 里最基础的数据容器，也是理解后面集合框架的入口。很多人觉得自己会数组，其实只会写 <code>int[] a = new int[5]</code>，遇到排序、复制、打印、查找就手写循环，既慢又容易错。真正拉开差距的，是知不知道 <code>Arrays</code> 和 <code>Objects</code> 这些标准工具已经把事情做好了，以及它们的边界在哪里。' },

    { p: '这一章还有一条暗线：金额计算。只要代码里出现价格、运费、折扣，就绕不开浮点误差和 <code>BigDecimal</code>。面试里问“为什么 0.1 加 0.2 不等于 0.3”，工作里问“这笔订单为什么少了一分钱”，本质是同一个问题。把数组工具和精确计算放在一章，是因为它们都属于“看起来简单、实际全是细节”的基础设施。' },

    { p: '学完本章，你应该能解释：为什么数组的长度不能改、为什么打印数组得到一串乱码、为什么 <code>Arrays.asList</code> 返回的列表不能添加元素、为什么二分查找必须先排序、为什么金额不能用 double。这些“为什么”比记住方法名重要得多。' },

    { h: '5.2 数组的本质：定长、连续、引用' },

    { p: '数组是一个对象，它保存一组同类型元素，并在创建时确定长度，之后永远不变。数组变量本身是一个引用，指向堆上那块连续空间；把数组赋给另一个变量，复制的是引用而不是元素。理解这一点，后面复制、传参、扩容的行为都能推出来。' },

    { p: '创建数组常见三种写法：<code>new int[5]</code> 只给长度，元素取默认值；<code>new int[]{1, 2, 3}</code> 给长度和初值；<code>int[] a = {1, 2, 3}</code> 是简化写法，只能用在声明处。声明时中括号建议跟在类型后面，写成 <code>int[] a</code>，而不是 <code>int a[]</code>，前者更清楚地表明“这是 int 数组”这个类型。' },

    { p: '没有显式赋值的元素会得到默认值，规则如下表。注意引用类型的默认值是 null，不是空对象，直接使用会抛 <code>NullPointerException</code>。' },

    { p: '长度为什么不能改？因为数组在堆上占一块连续内存，创建时就按“元素大小乘长度”分配好了。要变长只能另找一块更大的地方，把元素搬过去，这就是扩容。理解这个内存模型，就不会再问“能不能直接给 length 赋值”这种问题，length 是 final 字段，编译期就禁止修改。' },

    { table: { head: ['元素类型', '默认值', '说明'], rows: [
      ['byte / short / int / long', '0', '整数零'],
      ['float / double', '0.0', '正零，注意有 -0.0'],
      ['char', '空字符', '编码为 0，打印出来看不见'],
      ['boolean', 'false', '只有真假两个值'],
      ['引用类型', 'null', '数组、对象、String 都是 null']
    ] } },

    { p: '多维数组本质是“数组的数组”。<code>int[][] a = new int[3][4]</code> 会创建三行、每行四个元素；而 <code>new int[3][]</code> 只创建三行，每行还是 null，需要再逐行创建。也正因为如此，Java 允许不规则数组：第一行长度 2、第二行长度 5 完全合法。' },

    { p: '数组还有一个容易被忽略的特性：数组是协变的。<code>Object[] refs = new String[2]</code> 可以编译通过，但往里面放一个 Integer 会在运行时抛 <code>ArrayStoreException</code>。编译期只检查声明类型，真正的元素类型检查发生在运行时。这也是泛型集合更安全的原因：类型错误在编译期就被挡住，而不是等线上才炸。' },

    { code: 'import java.util.Arrays;\n\npublic class ArrayBasics {\n    public static void main(String[] args) {\n        int[] scores = new int[3];\n        System.out.println(Arrays.toString(scores));\n\n        String[] names = {"Ann", "Bob"};\n        System.out.println(names.length);\n\n        int[][] grid = new int[2][];\n        grid[0] = new int[]{1, 2, 3};\n        grid[1] = new int[]{4};\n        System.out.println(Arrays.deepToString(grid));\n\n        int[] copy = scores;\n        copy[0] = 99;\n        System.out.println(scores[0]);\n    }\n}', title: 'ArrayBasics.java' },

    { out: '[0, 0, 0]\n2\n[[1, 2, 3], [4]]\n99' },

    { p: '前三行分别验证默认值、长度字段和不规则二维数组。最后两行是关键：<code>copy</code> 和 <code>scores</code> 指向同一个数组，改 <code>copy[0]</code> 就是改 <code>scores[0]</code>。如果想让两者独立，必须真正复制元素，后面讲 <code>Arrays.copyOf</code> 时会看到区别。' },

    { h: '5.3 遍历、长度与越界' },

    { p: '数组的长度用 <code>length</code> 字段读取，注意没有括号，写成 <code>a.length</code> 而不是 <code>a.length()</code>；字符串才是 <code>length()</code> 方法。有效下标从 0 到 <code>length - 1</code>，访问这个范围之外会抛 <code>ArrayIndexOutOfBoundsException</code>。' },

    { p: '遍历有两种常用写法。普通 for 适合需要下标的场景，比如同时遍历两个数组、按位置修改元素；增强 for 适合只读元素，代码更短，也不会写错下标。增强 for 的循环变量是元素的副本，修改它不会影响数组本身，但通过它调用对象方法修改对象状态是生效的。' },

    { p: '差一错误是数组最经典的 bug：循环条件写成 <code>i &lt;= a.length</code> 就会越界。另一个常见错误是空数组：<code>length</code> 为 0 时任何下标都越界，循环前要判断，或者让循环条件自然不成立。' },

    { p: '数组长度在运行时才确定，所以下面的写法是合法的：先读一个整数 n，再创建长度为 n 的数组。长度也可以是 0，表示空数组，它仍然是一个对象，可以正常遍历（一次都不执行），也可以取 length。' },

    { p: '数组作为参数传递时，传的是引用的副本：方法内让参数指向新数组，不会影响调用方；但通过参数修改元素，会影响调用方看到的数组。返回数组时返回的也是引用，调用方拿到的是同一块内存。需要隔离时用 <code>clone</code> 或 <code>Arrays.copyOf</code> 做防御性复制，别把内部数组直接暴露出去。' },

    { p: '遍历本身很简单，容易错的是“边遍历边改结构”。数组长度固定，遍历时不会像集合那样抛并发修改异常，但如果你在循环里把数组变量指向新数组，循环仍然遍历旧数组，改了个寂寞。需要扩容时，先算好新长度，复制完再统一替换引用。' },

    { h: '5.4 打印、填充、复制与比较：Arrays 的常用工具' },

    { p: '直接打印数组，得到的是类似 <code>[I@1b6d3586</code> 的东西：方括号加类型编码，后面是哈希值。这不是数组内容，而是 Object 默认的 toString 结果。数组没有重写 toString，所以必须借助工具类。' },

    { p: '<code>Arrays.toString(a)</code> 会把一维数组格式化成 <code>[1, 2, 3]</code>；二维数组要用 <code>Arrays.deepToString</code>，否则内层数组仍然打印成哈希值。字符串数组、对象数组同样适用，对象元素会调用自己的 toString，所以自定义类最好重写 toString，否则日志里看不出内容。' },

    { note: '<b>日志里的高频事故：</b>把数组直接拼进日志字符串，线上只看到 <code>[Ljava.lang.String;@7f31245a</code>，排查时完全不知道内容。统一用 <code>Arrays.toString</code> 包一层，成本极低。' },

    { p: '还有一个细节：<code>Arrays.toString</code> 对 null 元素输出字符串 null，不会抛异常；但如果你自己写循环拼接并调用元素的 toString，就会 NPE。工具类在这些边界上做了保护，这也是推荐用它的原因之一。' },

    { p: '<code>Arrays.fill(a, value)</code> 把整个数组填成同一个值，<code>Arrays.fill(a, from, to, value)</code> 只填区间。引用类型要注意：填进去的是同一个引用，如果这个对象可变，所有位置会一起变，这不是“每个元素一个独立对象”。' },

    { p: '数组的 clone 是浅拷贝：基本类型数组复制值，对象数组只复制引用，新旧数组的元素指向同一批对象。所以克隆一个对象数组后，修改元素对象的属性，两个数组都会看到变化；要深拷贝，得自己逐个创建新对象。这个区别在缓存、快照场景里非常关键，记住浅拷贝与深拷贝的差别，能避免一半的共享状态 bug。' },

    { p: '比较数组内容也不能用 <code>==</code> 或 <code>equals</code>：<code>==</code> 比较引用，<code>equals</code> 对数组没有重写，效果一样。一维数组用 <code>Arrays.equals</code>，多维用 <code>Arrays.deepEquals</code>，它们逐元素比较，长度不同直接返回 false。' },

    { p: '<code>Arrays.equals</code> 逐元素比较，长度不同直接 false。对多维数组它只比较第一层引用，必须用 <code>deepEquals</code>。Java 9 新增的 <code>Arrays.mismatch</code> 返回第一个不同元素的下标，完全相同返回 -1，排查“到底哪里不一样”时非常方便。' },

    { p: '哈希值也要用工具：<code>Arrays.hashCode</code> 与 <code>Arrays.equals</code> 保持一致。自己用 <code>a.hashCode()</code> 得到的是对象标识哈希，内容相同的两个数组哈希不同，放进 HashSet 会出问题。' },

    { p: 'mismatch 的返回值是第一个不同元素的下标；如果所有元素都相同，返回 -1；如果前缀相同但长度不同，返回较短数组的长度。比如 [7, 7] 和 [7, 7, 8] 返回 2，表示从下标 2 开始一边没有元素了。这个约定让“找差异”不需要手写循环，也不会把长度差异和值差异混为一谈。' },

    { h: '5.5 排序：sort、Comparator 与稳定性' },

    { p: '<code>Arrays.sort</code> 对基本类型使用双轴快速排序，对对象数组使用 TimSort。前者不保证稳定，后者稳定：相等元素的相对顺序不会变。稳定在按多个字段排序时很重要，比如先按价格排、再按销量排，稳定排序能保留前一次的次序。' },

    { p: '对象排序有两种方式：类实现 <code>Comparable</code> 接口，或者给 <code>sort</code> 传一个 <code>Comparator</code>。实际开发更常用 Comparator，因为它不侵入类，还能为同一类型定义多套规则。<code>Comparator.comparing</code> 可以用方法引用快速构造比较器，再用 <code>reversed</code> 反转、<code>thenComparing</code> 串联第二关键字。' },

    { p: '比较器必须满足契约：自反、反对称、传递。听起来抽象，违反时的典型症状是 <code>IllegalArgumentException: Comparison method violates its general contract</code>，而且往往只在数据量大时出现。写比较器时不要用减法代替比较，整数相减可能溢出；直接用 <code>Integer.compare</code> 或 <code>Comparator.comparingInt</code>。' },

    { p: '对象数组里有 null 时，排序会抛 <code>NullPointerException</code>，因为比较器要调用元素的方法。稳妥做法是用 <code>Comparator.nullsFirst</code> 或 <code>nullsLast</code> 包一层，明确 null 排在前还是后；也可以在排序前先过滤掉 null。不要让“默认行为”替你做决定，默认行为往往就是异常。' },

    { code: 'import java.util.Arrays;\nimport java.util.Comparator;\n\npublic class SortDemo {\n    public static void main(String[] args) {\n        int[] nums = {5, 2, 9, 1};\n        Arrays.sort(nums);\n        System.out.println(Arrays.toString(nums));\n\n        String[] words = {"bb", "a", "ccc"};\n        Arrays.sort(words, Comparator.comparingInt(String::length)\n                .thenComparing(Comparator.naturalOrder()));\n        System.out.println(Arrays.toString(words));\n\n        Integer[] boxed = {5, 2, 9, 1};\n        Arrays.sort(boxed, Comparator.reverseOrder());\n        System.out.println(Arrays.toString(boxed));\n    }\n}', title: 'SortDemo.java' },

    { out: '[1, 2, 5, 9]\n[a, bb, ccc]\n[9, 5, 2, 1]' },

    { p: '第一段是基本类型升序。第二段先按长度、再按字典序，得到 a、bb、ccc；如果只按长度，bb 和 a 的先后就取决于稳定性。第三段演示降序：基本类型数组不能直接传 <code>Comparator.reverseOrder</code>，要先装箱成 <code>Integer[]</code>，这也是自动装箱的一个实际影响。' },

    { table: { head: ['方法', '作用', '关键注意点'], rows: [
      ['Arrays.sort(a)', '原地升序排序', '基本类型不稳定，对象稳定'],
      ['Arrays.sort(a, from, to)', '只排区间', 'from 含、to 不含'],
      ['Arrays.sort(a, cmp)', '按比较器排序', '比较器必须满足契约'],
      ['Arrays.parallelSort(a)', '并行排序', '数据量大才有优势'],
      ['Arrays.binarySearch(a, key)', '二分查找', '必须先排序'],
      ['Arrays.copyOf(a, n)', '复制并调整长度', '超出部分补默认值']
    ] } },

    { h: '5.6 扩容：copyOf 与 arraycopy' },

    { p: '数组长度固定，所谓“扩容”其实是创建更大的新数组，把旧元素复制过去，再让变量指向新数组。旧数组如果没有其他引用，会被垃圾回收。这个动作在 <code>ArrayList</code> 内部反复发生，理解它就能理解为什么预估容量能提升性能。' },

    { p: '<code>Arrays.copyOf(original, newLength)</code> 最常用：新长度大于原长度时，多余位置补默认值；小于原长度时截断。还有 <code>copyOfRange(original, from, to)</code>，复制指定区间，to 可以超过原长度，超出部分同样补默认值。' },

    { p: '<code>System.arraycopy(src, srcPos, dest, destPos, length)</code> 更底层，五个参数分别是源数组、源起点、目标数组、目标起点、复制个数。它由 JVM  intrinsic 实现，速度快；源和目标可以是同一个数组，重叠区域也能正确处理，相当于内存搬移。代价是参数多、容易写错，而且类型不匹配时抛 <code>ArrayStoreException</code>。' },

    { flow: ['需要更大容量', '创建新数组 new int[old.length * 2]', 'System.arraycopy 复制旧元素', '把变量指向新数组', '旧数组等待垃圾回收'] },

    { code: 'import java.util.Arrays;\n\npublic class CopyDemo {\n    public static void main(String[] args) {\n        int[] a = {1, 2, 3};\n        int[] b = Arrays.copyOf(a, 5);\n        System.out.println(Arrays.toString(b));\n\n        int[] c = Arrays.copyOf(a, 2);\n        System.out.println(Arrays.toString(c));\n\n        int[] d = new int[6];\n        System.arraycopy(a, 0, d, 2, 3);\n        System.out.println(Arrays.toString(d));\n    }\n}', title: 'CopyDemo.java' },

    { out: '[1, 2, 3, 0, 0]\n[1, 2]\n[0, 0, 1, 2, 3, 0]' },

    { p: '第二行展示补默认值，第三行展示截断，第四行把 a 的三个元素放到 d 的下标 2、3、4，其余保持 0。<code>arraycopy</code> 不会自动扩容，目标数组必须已经够大，否则抛 <code>IndexOutOfBoundsException</code>。' },

    { p: '顺带说容量：<code>ArrayList</code> 默认初始容量是 10（第一次添加时才分配），扩容约为原来的 1.5 倍。频繁添加大量元素时，预先 <code>new ArrayList<>(10000)</code> 能减少复制次数。这个技巧在处理批量数据时很实用。' },

    { p: 'ArrayList 扩容要复制元素，但随机访问是 O(1)，内存连续、缓存友好；LinkedList 增删是 O(1)（前提是已经拿到节点），随机访问却是 O(n)，而且每个节点都有额外对象开销。实际项目里大多数场景 ArrayList 更快，选择容器先看访问模式，不要只盯着“增删”两个字。' },

    { h: '5.7 asList 的四个坑' },

    { p: '<code>Arrays.asList</code> 把数组包装成 List，写起来很方便，但它返回的是固定长度的视图，不是新的 ArrayList。这是所有坑的根源，理解“视图”两个字，下面的现象都顺理成章。' },

    { p: '第一，<code>set</code> 可以调用，会直接修改原数组；<code>add</code>、<code>remove</code> 会抛 <code>UnsupportedOperationException</code>，因为长度不能变。第二，传基本类型数组时，整个数组被当成一个元素，得到 <code>List&lt;int[]&gt;</code>，长度是 1，不是 3。第三，<code>List.of</code> 生成的列表完全不可变，连 set 都不行，而且不接受 null。第四，原数组被修改后，列表内容跟着变，因为底层就是同一个数组。' },

    { p: '需要可变列表时，用 <code>new ArrayList&lt;&gt;(Arrays.asList(...))</code> 复制一份。需要只读列表时，<code>List.of</code> 更明确。不要把 asList 的结果长期保存并假设它独立于原数组，这是线上很难查的一类 bug。' },

    { p: '视图特性也有用武之地：想把数组内容同步给一个只读列表、又不想复制时，asList 是零拷贝的。但只读场景更推荐 <code>List.of</code>，语义清楚、真正不可变；需要可变就复制成 ArrayList。三种方式各有位置，关键是清楚返回对象到底能不能改。' },

    { code: 'import java.util.ArrayList;\nimport java.util.Arrays;\nimport java.util.List;\n\npublic class AsListDemo {\n    public static void main(String[] args) {\n        String[] arr = {"a", "b"};\n        List<String> view = Arrays.asList(arr);\n        view.set(0, "z");\n        System.out.println(arr[0]);\n\n        try {\n            view.add("c");\n        } catch (UnsupportedOperationException e) {\n            System.out.println("add failed");\n        }\n\n        List<String> mutable = new ArrayList<>(Arrays.asList(arr));\n        mutable.add("c");\n        System.out.println(mutable.size());\n\n        int[] nums = {1, 2, 3};\n        System.out.println(Arrays.asList(nums).size());\n    }\n}', title: 'AsListDemo.java' },

    { out: 'z\nadd failed\n3\n1' },

    { p: '前两行说明 set 会穿透到原数组；第三、四行说明 add 被拒绝；第五行复制后可以正常添加；最后一行是基本类型数组的陷阱，长度为 1。把这四个现象亲手跑一遍，比背结论有效。' },

    { h: '5.8 binarySearch：前提、返回值与插入点' },

    { p: '<code>Arrays.binarySearch</code> 用二分查找定位元素，速度是 O(log n)，但前提是数组已经按升序排好。对未排序数组调用，返回值没有任何意义，可能找到、可能找不到，而且不会报错，这是最危险的地方。' },

    { p: '返回值有两条规则：找到时返回某个匹配下标（有重复元素时不保证是哪一个）；找不到时返回 <code>-(插入点) - 1</code>。插入点是把元素插入后仍保持有序的位置。比如在 [1, 3, 5] 里找 4，插入点是 2，返回 -3；找 0 返回 -1；找 6 返回 -4。' },

    { p: '为什么用负数减一，而不是直接返回负的插入点？因为插入点可能是 0，而 0 无法用负数表示。这个设计让“找到”和“没找到”共用一个 int 返回值，调用方用 <code>if (idx &gt;= 0)</code> 就能区分。' },

    { code: 'import java.util.Arrays;\n\npublic class SearchDemo {\n    public static void main(String[] args) {\n        int[] a = {1, 3, 5, 7};\n        System.out.println(Arrays.binarySearch(a, 5));\n        System.out.println(Arrays.binarySearch(a, 4));\n        System.out.println(Arrays.binarySearch(a, 0));\n        System.out.println(Arrays.binarySearch(a, 9));\n\n        int pos = Arrays.binarySearch(a, 4);\n        int insert = -pos - 1;\n        System.out.println(insert);\n    }\n}', title: 'SearchDemo.java' },

    { out: '2\n-3\n-1\n-5\n2' },

    { p: '2 是 5 的下标；4 不存在，插入点是 2，返回 -3；0 的插入点是 0，返回 -1；9 的插入点是 4，返回 -5。最后用公式还原插入点，得到 2。这个公式在“维护有序数组并插入新元素”时经常用到。' },

    { p: '对象数组也可以二分，但要传同样的 Comparator。<code>Arrays.binarySearch(a, key, cmp)</code> 的比较规则必须与排序时一致，否则结果不可预测。实际项目里，如果数据频繁变动，用 TreeMap 或 HashSet 往往比“排序数组加二分”更合适。' },

    { p: '手写二分时，中点写成 <code>left + (right - left) / 2</code> 防止溢出，循环条件是 <code>left &lt;= right</code>，更新时用 <code>mid + 1</code> 和 <code>mid - 1</code>，否则可能死循环。这些边界是面试高频，但工作里优先用库函数，除非你有明确的性能或定制需求。' },

    { h: '5.9 Objects：空安全的小工具' },

    { p: '<code>Objects</code> 是 Java 7 引入的工具类，专门处理 null 和通用对象操作。<code>Objects.equals(a, b)</code> 先判 null 再调用 equals，避免手写 <code>a != null &amp;&amp; a.equals(b)</code>；<code>Objects.hash(f1, f2, ...)</code> 根据多个字段生成哈希，重写 hashCode 时很省事。' },

    { p: '<code>Objects.requireNonNull(obj, "message")</code> 在参数为 null 时立刻抛 NPE，并带上自定义消息。它把“错误尽早暴露”落到实处：与其让 null 流到三层调用之后才炸，不如在入口就拒绝。Java 9 还加了 <code>requireNonNullElse</code>，为 null 时返回默认值。' },

    { p: '重写 equals 必须同时重写 hashCode，这是契约：两个对象 equals 为 true，hashCode 必须相等。只重写 equals 会让对象在 HashMap、HashSet 里“存进去却找不到”。用 Objects.hash 可以少写样板代码，但注意它内部会创建数组，极高频的哈希计算要权衡。' },

    { code: 'import java.util.Objects;\n\npublic class ObjectsDemo {\n    static class Point {\n        final int x;\n        final int y;\n        Point(int x, int y) { this.x = x; this.y = y; }\n        @Override public boolean equals(Object o) {\n            if (this == o) return true;\n            if (!(o instanceof Point)) return false;\n            Point p = (Point) o;\n            return x == p.x && y == p.y;\n        }\n        @Override public int hashCode() { return Objects.hash(x, y); }\n        @Override public String toString() { return "(" + x + "," + y + ")"; }\n    }\n\n    public static void main(String[] args) {\n        Point a = new Point(1, 2);\n        Point b = new Point(1, 2);\n        System.out.println(a.equals(b));\n        System.out.println(a.hashCode() == b.hashCode());\n        System.out.println(Objects.toString(null, "unknown"));\n    }\n}', title: 'ObjectsDemo.java' },

    { out: 'true\ntrue\nunknown' },

    { p: 'equals 先比较引用，再比较类型，最后比较字段，这是标准套路；用 instanceof 已经包含 null 判断（null 不是任何类型的实例）。hashCode 用同一个字段列表生成，保证与 equals 一致。toString 让日志可读，Objects.toString 则给 null 提供了兜底。' },

    { p: 'requireNonNull 适合放在公共方法入口、构造函数和 setter 里，把契约写进代码；不要在每个 getter 里都加，那只是噪音。异常消息要写清楚哪个参数为 null、期望什么，比如“userId 不能为空”，比默认的空消息有用得多。' },

    { h: '5.10 从浮点误差到 BigDecimal' },

    { p: 'double 用二进制表示小数，很多十进制小数无法精确表示，0.1 就是其中之一。把 0.1 和 0.2 相加，得到的是 0.30000000000000004，而不是 0.3。这不是 Java 的 bug，而是 IEEE 754 浮点标准的结果，所有遵循标准的语言都一样。' },

    { p: '金额、税率、利率这类要求精确的场景，必须用 <code>BigDecimal</code>。构造时优先用字符串，或者用 <code>BigDecimal.valueOf(double)</code>；不要用 <code>new BigDecimal(0.1)</code>，它会把 double 的完整二进制误差原样带进来，得到一个很长的小数。' },

    { p: 'BigDecimal 是不可变类，add、subtract、multiply、divide 都返回新对象，原对象不变。<code>equals</code> 同时比较数值和 scale，所以 1.0 与 1.00 不相等；<code>compareTo</code> 只比较数值，返回 -1、0、1。判断金额是否相等要用 compareTo。' },

    { p: '除法必须考虑除不尽的情况：<code>divide</code> 不指定 scale 和舍入模式时，遇到 1/3 这种无限小数会抛 <code>ArithmeticException</code>。正确写法是 <code>divide(other, 2, RoundingMode.HALF_UP)</code>。setScale 也建议显式给舍入模式，否则同样可能抛异常。' },

    { table: { head: ['操作', '写法', '注意'], rows: [
      ['创建', 'new BigDecimal("19.99")', '优先字符串，避免 double 误差'],
      ['加法', 'a.add(b)', '返回新对象，原值不变'],
      ['乘法', 'a.multiply(b)', '数量用 int 更直观'],
      ['比较', 'a.compareTo(b)', '不要用 equals 比数值'],
      ['保留两位', 'a.setScale(2, RoundingMode.HALF_UP)', '必须给舍入模式'],
      ['除法', 'a.divide(b, 2, RoundingMode.HALF_UP)', '不给 scale 可能抛异常']
    ] } },

    { code: 'public class FloatDemo {\n    public static void main(String[] args) {\n        System.out.println(0.1 + 0.2);\n        System.out.println(0.1 + 0.2 == 0.3);\n\n        java.math.BigDecimal a = new java.math.BigDecimal("0.1");\n        java.math.BigDecimal b = new java.math.BigDecimal("0.2");\n        System.out.println(a.add(b));\n        System.out.println(a.add(b).compareTo(new java.math.BigDecimal("0.3")) == 0);\n\n        java.math.BigDecimal x = new java.math.BigDecimal("1.0");\n        java.math.BigDecimal y = new java.math.BigDecimal("1.00");\n        System.out.println(x.equals(y));\n        System.out.println(x.compareTo(y));\n    }\n}', title: 'FloatDemo.java' },

    { out: '0.30000000000000004\nfalse\n0.3\ntrue\nfalse\n0' },

    { p: '前两行是浮点误差的直接证据。第三、四行说明 BigDecimal 用字符串构造后能精确相加，并用 compareTo 判断相等。最后两行展示 equals 与 compareTo 的差异：scale 不同导致 equals 为 false，但数值相同所以 compareTo 返回 0。' },

    { code: 'import java.math.BigDecimal;\nimport java.math.RoundingMode;\n\npublic class CartDemo {\n    public static void main(String[] args) {\n        BigDecimal price = new BigDecimal("19.99");\n        int quantity = 3;\n        BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));\n        BigDecimal shipping = new BigDecimal("6.00");\n        BigDecimal total = subtotal.add(shipping);\n\n        BigDecimal discount = total.multiply(new BigDecimal("0.10"))\n                .setScale(2, RoundingMode.HALF_UP);\n        BigDecimal payable = total.subtract(discount)\n                .setScale(2, RoundingMode.HALF_UP);\n\n        System.out.println(subtotal);\n        System.out.println(total);\n        System.out.println(discount);\n        System.out.println(payable);\n    }\n}', title: 'CartDemo.java' },

    { out: '59.97\n65.97\n6.60\n59.37' },

    { p: '单价 19.99 乘 3 得到 59.97，加运费 6.00 得到 65.97；打九折，折扣 6.597 保留两位四舍五入为 6.60，应付 59.37。注意每一步都显式 setScale，否则结果可能带很多位小数，也可能在除法时抛异常。' },

    { p: '金额计算还有两个工程习惯：数据库用 DECIMAL 而不是 DOUBLE；接口传输金额时用字符串或最小货币单位（分），避免 JSON 解析成浮点。这些约定和 BigDecimal 一起使用，才能真正确保一分钱都不差。' },

    { p: 'BigDecimal 的运算比 double 慢，但在金额这种量级上完全可接受；真正要避免的是在百万次循环里反复创建 BigDecimal。输出金额用 <code>toPlainString</code>，避免 toString 在极小或极大值时变成科学计数法，前端展示会莫名其妙。' },

    { h: '5.11 常见错误清单' },

    { list: [
      '用 <code>==</code> 比较数组或字符串内容，比较的其实是引用。',
      '循环条件写成 <code>i &lt;= a.length</code>，稳定触发越界异常。',
      '直接打印数组，日志里只有类型编码和哈希值。',
      '对基本类型数组传 <code>Comparator.reverseOrder</code>，编译不过。',
      '用减法实现比较器，遇到大整数溢出，排序结果错乱。',
      '把 <code>Arrays.asList</code> 的结果当可变列表，add 时抛异常。',
      '把基本类型数组传给 asList，得到长度为 1 的列表。',
      '对未排序数组调用 binarySearch，结果不可预测。',
      '只重写 equals 不重写 hashCode，对象在 HashSet 里丢失。',
      '用 double 计算金额，最后对不上账。'
    ] },

    { p: '把这些错误抄成一张检查清单，提交代码前扫一眼：数组比较、越界条件、asList 可变性、二分前提、金额类型。清单不丢人，线上事故才丢人。' },

    { h: '5.12 本章小结' },

    { list: [
      '数组是定长对象，变量保存引用，赋值不会复制元素。',
      '下标从 0 到 length-1，length 是字段不是方法。',
      '打印用 Arrays.toString，多维用 deepToString。',
      '比较内容用 Arrays.equals，多维用 deepEquals。',
      '排序基本类型不稳定，对象稳定；比较器要满足契约。',
      '扩容靠 copyOf 或 arraycopy，本质是新建加复制。',
      'asList 是固定长度视图，要可变就复制成 ArrayList。',
      'binarySearch 必须先排序，找不到时返回负的插入点减一。',
      'Objects 提供空安全的 equals、hash、requireNonNull。',
      '金额用 BigDecimal，构造用字符串，比较用 compareTo。'
    ] },

    { h: '5.13 常见追问' },

    { list: [
      '<b>数组和 ArrayList 怎么选？</b>长度固定、追求性能用数组；需要增删、丰富 API 用 ArrayList。',
      '<b>Arrays.sort 用了什么算法？</b>基本类型是双轴快排，对象是 TimSort，后者稳定。',
      '<b>为什么二分查找要求有序？</b>它每次用中间值排除一半区间，无序时排除逻辑不成立。',
      '<b>BigDecimal 能用 double 构造吗？</b>能，但会把二进制误差带进来；用字符串或 valueOf。',
      '<b>BigDecimal 为什么不可变？</b>避免共享对象被意外修改，线程安全，适合做金额。',
      '<b>arraycopy 和目标数组重叠会怎样？</b>JVM 按内存搬移处理，结果正确，类似 memmove。'
    ] },

    { h: '5.14 自测与练习' },

    { ol: [
      '写一个方法，接收 int 数组，返回去掉所有 0 之后的新数组，要求用 copyOf 控制长度。',
      '定义 Student 类（姓名、分数），用 Comparator 先按分数降序、再按姓名升序排序，并打印结果。',
      '实现一个金额结算：三种商品、各自单价与数量、运费 6 元、满 100 减 10，全部用 BigDecimal，结果保留两位。'
    ] },

    { note: '<b>练习建议：</b>先自己写，再对照本章示例。重点检查边界：空数组、null 元素、金额为 0、折扣后应付为负。每道题至少准备三组测试数据，比写出来更重要。' },
  ] };


  T['modern-java'] = { meta: '本章约 5200 字 · 建议 34 分钟 · 配套流程图与 3 道习题', blocks: [

    { h: '6.1 为什么学：新语法到底解决什么问题' },
    { p: 'Java 每半年发一个版本，但真正改变写代码方式的特性并不多。很多人背过“Java 8 有 Lambda、Java 17 有 record”，却说不清它们解决了什么痛点。这一章不按版本流水账讲，而是按“你写代码时遇到的麻烦”来组织：类型写两遍、字符串拼得满屏加号、switch 又长又容易漏 break、数据传输类写了上百行 getter。' },
    { p: '把这些麻烦和新特性一一对上，你会发现语法演进的主线只有两条：减少样板代码，让编译器多检查。var 减少重复类型，文本块减少转义，record 减少数据类的样板，switch 表达式让编译器检查分支是否覆盖，sealed 让继承关系可控。理解了主线，就不用死记每个版本。' },
    { p: '需要先说明：新特性有版本门槛，也有适用边界。var 不能用于字段，record 不能继承，文本块里的缩进会被自动处理。本章每个特性都会讲“不能做什么”，因为生产事故往往来自“以为它能”。' },
    { p: '版本节奏也值得了解：Java 从 9 开始每半年发一个特性版本，每两年左右出一个 LTS，当前 LTS 是 25（2025 年 9 月发布），21 是上一代 LTS，下一个 LTS 预计是 27。企业不必追每个版本，但要知道 LTS 之间有大量小改进，比如 HttpClient、Files.mismatch、String.strip 这些日常会用到的 API。选版本的本质是选支持周期，不是选功能多少，新语法只是升级的副产品。' },

    { h: '6.2 var：局部变量类型推断' },
    { p: 'var 是 Java 10 引入的局部变量类型推断。它不是动态类型，也不是关键字，只是一个特殊的类型名。编译器根据右边的初始化表达式推断出真实类型，编译后的字节码和写全类型完全一样，运行时没有任何额外开销。' },
    { p: '使用条件很严格：只能用于局部变量，声明时必须初始化，不能写成 <code>var x;</code> 或 <code>var x = null;</code>；不能用于字段、方法参数、返回类型；不能同时声明多个变量。右边是什么类型，左边就是什么类型，不会因为后面赋了别的值而改变。' },
    { p: '什么时候该用？右边类型很长、但一眼能看出是什么的时候，比如 <code>var users = new ArrayList&lt;User&gt;()</code>。什么时候不该用？右边是方法调用、类型不明显的时候，<code>var result = service.find()</code> 让读者不知道 result 是什么，可读性反而下降。var 是给读者省事的，不是给作者偷懒的。' },
    { code: 'import java.util.ArrayList;\nimport java.util.List;\n\npublic class VarDemo {\n    public static void main(String[] args) {\n        var name = "Java";\n        var count = 3;\n        var list = new ArrayList<String>();\n        list.add(name);\n\n        for (var item : list) {\n            System.out.println(item + " " + count);\n        }\n\n        var map = new java.util.HashMap<String, List<Integer>>();\n        map.put("nums", List.of(1, 2));\n        System.out.println(map.get("nums").size());\n    }\n}', title: 'VarDemo.java' },
    { out: 'Java 3\n2' },
    { p: 'name 推断为 String，count 推断为 int，list 推断为 ArrayList&lt;String&gt;。增强 for 的循环变量也能用 var。最后一段说明 var 真正有价值的地方：泛型嵌套的类型名很长，用 var 可以少写一长串，同时右侧的构造器仍然把类型写清楚了。' },
    { note: '<b>常见误解：</b>var 不是“自动类型”，变量一旦推断出来就不能换类型；<code>var x = 1; x = "s";</code> 编译不过。它也不会让 Java 变成动态语言。' },
    { p: 'lambda 参数也能写 var，但必须所有参数都写或者都不写，不能混用；这样可以在参数上加注解，而不必显式写类型。var 与匿名类结合时，推断出的是匿名类类型，可以调用它新增的方法，这一点和写接口类型不同。这些细节很少用，但面试会问。' },

    { h: '6.3 文本块：多行字符串' },
    { p: '文本块是 Java 15 正式引入的多行字符串字面量，用三个双引号开头和结尾。开头三个引号后面必须换行，内容从下一行开始；结尾引号可以单独一行，也可以跟在内容后面。它最大的价值是省掉转义：引号、换行、反斜杠都可以原样写。' },
    { p: '缩进处理是重点。编译器会找出所有行中最少的公共缩进，把它整体去掉，这叫 incidental whitespace 消除。所以你可以把文本块缩进对齐到代码里，而不用担心字符串里多出一堆空格。如果某一行需要保留额外缩进，就多写空格；需要保留行尾空格，用 <code>\\s</code> 显式表示。' },
    { p: '文本块里仍然可以用转义：<code>\\n</code> 是换行，<code>\\t</code> 是制表符，<code>\\"</code> 是引号；行尾写一个反斜杠表示“下一行接上来，不换行”。Java 15 还提供了 <code>formatted</code> 方法，用来做占位符替换，比 String.format 读起来清楚。' },
    { code: 'public class TextBlockDemo {\n    public static void main(String[] args) {\n        String json = """\n                {\n                  "name": "Java",\n                  "version": 21\n                }\n                """;\n        System.out.println(json);\n\n        String sql = """\n                SELECT id, name\n                FROM users\n                WHERE age > ?\n                """;\n        System.out.println(sql.strip().replace("\\n", " | "));\n    }\n}', title: 'TextBlockDemo.java' },
    { out: '{\n  "name": "Java",\n  "version": 21\n}\nSELECT id, name | FROM users | WHERE age > ?' },
    { p: 'json 变量里的内容没有代码缩进，因为公共缩进被去掉了；引号也不需要转义。第二段用 strip 去掉首尾空白，再把换行替换成竖线，方便在一行里观察。注意 replace 的第一个参数是字符串，反斜杠 n 在 Java 字符串里表示换行。' },
    { p: '文本块适合写 JSON、SQL、HTML 片段、测试用的期望输出。不适合写超长段落，因为代码里的换行会原样保留。还有一点：文本块是编译期常量，拼接和 intern 的行为与普通字符串一致，不会因为写法不同就产生特殊对象。' },
    { p: 'formatted 的占位符语法和 String.format 一样：%s、%d、%f，还可以带宽度和精度。文本块加 formatted 的组合，写邮件模板、报告片段特别顺。注意 formatted 返回新字符串，原文本块不变，String 的不可变性在这里同样成立。模板里的百分号要写成两个百分号，否则会被当成占位符。' },

    { h: '6.4 switch 表达式与 yield' },
    { p: '传统 switch 是语句，容易漏写 break 导致穿透，也不能直接把结果赋给变量。Java 14 的 switch 表达式用箭头标签解决了这两个问题：每个分支只执行自己的代码，不会穿透；整个 switch 可以作为一个表达式返回值。' },
    { p: '箭头后面可以是单个表达式，也可以是一个代码块。代码块需要返回值时用 <code>yield</code>，而不是 return。多个常量可以用逗号写在一个 case 里。Java 21 之后，switch 还支持模式匹配和 null 分支，这部分在 6.7 展开。' },
    { p: 'switch 表达式要求穷尽：枚举要覆盖所有常量，或者写 default；对 sealed 类型，覆盖所有子类即可，编译器能检查。这种“编译期检查覆盖”是 switch 表达式最大的收益，比少写几个 break 重要得多。' },
    { code: 'public class SwitchDemo {\n    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }\n\n    static String type(Day d) {\n        return switch (d) {\n            case SAT, SUN -> "weekend";\n            case MON, TUE, WED, THU, FRI -> "workday";\n        };\n    }\n\n    static int score(String grade) {\n        return switch (grade) {\n            case "A" -> 90;\n            case "B" -> 80;\n            default -> {\n                int base = 60;\n                yield base;\n            }\n        };\n    }\n\n    public static void main(String[] args) {\n        System.out.println(type(Day.SAT));\n        System.out.println(score("C"));\n    }\n}', title: 'SwitchDemo.java' },
    { out: 'weekend\n60' },
    { p: 'type 方法没有 default，因为枚举的六个常量都覆盖了，编译器认可穷尽。score 的 default 分支用了代码块，所以必须 yield，不能直接写 return。如果漏掉某个枚举常量又没写 default，编译就会失败，这正是我们想要的安全网。' },
    { p: '还有一个细节：switch 表达式的结果类型由所有分支共同决定。如果分支返回 int 和 String，编译器会报错，而不是偷偷变成 Object。写的时候尽量让每个分支类型一致，读起来也更清楚。' },
    { p: '什么时候还用传统 switch 语句？需要 fallthrough 的少数场景，比如多个 case 合并执行同一段逻辑，箭头标签其实也能用逗号做到；或者分支里要修改外部变量、写多条语句，用语句更自然。大多数新代码用表达式，老代码不必为了改而改，可读性优先于“用了新语法”。' },

    { h: '6.5 record：不可变数据载体' },
    { p: '写一个只用来装数据的类，传统做法要写私有字段、构造器、getter、equals、hashCode、toString，几十行代码全是样板。record 用一行声明解决：编译器自动生成规范构造器、访问器、equals、hashCode、toString，字段默认 private final。' },
    { p: 'record 是 final 类，不能被子类继承；它的字段不能额外声明实例字段，但可以有静态字段和静态方法；可以实现接口；可以定义额外的方法。访问器名字就是字段名，没有 get 前缀，比如 <code>point.x()</code>。' },
    { p: '需要校验参数时用紧凑构造器：只写参数列表，不写括号和赋值，编译器会在规范构造器开头插入你的校验代码。校验不通过就抛异常，保证对象一旦创建就是合法的。这比在 setter 里校验更可靠，因为 record 没有 setter，天然不可变。' },
    { code: 'public class RecordDemo {\n    record Point(int x, int y) {\n        Point {\n            if (x < 0 || y < 0) {\n                throw new IllegalArgumentException("negative");\n            }\n        }\n        int sum() { return x + y; }\n    }\n\n    public static void main(String[] args) {\n        Point p = new Point(1, 2);\n        Point q = new Point(1, 2);\n        System.out.println(p);\n        System.out.println(p.equals(q));\n        System.out.println(p.hashCode() == q.hashCode());\n        System.out.println(p.sum());\n\n        try {\n            new Point(-1, 0);\n        } catch (IllegalArgumentException e) {\n            System.out.println("rejected");\n        }\n    }\n}', title: 'RecordDemo.java' },
    { out: 'Point[x=1, y=2]\ntrue\ntrue\n3\nrejected' },
    { p: 'toString 自动生成成 Point[x=1, y=2]，equals 和 hashCode 按字段生成，所以内容相同的两个对象相等、哈希也相同。紧凑构造器拦住了负数坐标。sum 是自定义方法，record 允许，但不要在里面修改状态，因为没有状态可改。' },
    { table: { head: ['对比项', 'record', '普通类'], rows: [
      ['字段', 'private final，声明在头部', '自己声明，可不可变自己控制'],
      ['构造器', '自动生成规范构造器', '手写'],
      ['访问器', 'x()，没有 get 前缀', '通常 getX()'],
      ['equals/hashCode', '按字段自动生成', '需要手写或借助工具'],
      ['继承', 'final，不能被继承', '可以继承和被继承'],
      ['适用场景', 'DTO、值对象、返回多值', '需要可变状态或继承体系']
    ] } },
    { p: 'record 不适合替代所有类。需要可变状态、需要继承、需要懒加载的实体，都不适合。它最适合“一次创建、之后只读”的值对象，比如坐标、金额、接口返回的复合结果。用对了，代码量能少一个数量级。' },
    { p: 'record 很适合做 Map 的 key，因为 equals 和 hashCode 按字段生成，内容相同的两个实例可以命中同一个键。但 record 的字段如果是可变对象，比如数组，哈希会随内容变化，作为 key 就不安全。值对象要真正不可变，字段类型也得不可变，这一点常被忽略。' },

    { h: '6.6 sealed：受限继承' },
    { p: 'sealed 是 Java 17 正式引入的密封类/接口，用来限定“哪些类可以继承我”。在类或接口声明前加 sealed，再用 permits 列出允许的子类。子类必须满足三个条件之一：final、sealed、non-sealed。这样继承体系既开放又有边界。' },
    { p: '为什么要限制继承？因为一旦允许任意子类，switch 和类型判断就永远不可能穷尽，编译器也无法帮你检查。sealed 把“可能的子类型”变成已知集合，配合 switch 模式匹配，就能做到不写 default 也覆盖所有情况。' },
    { p: '约束还有几条：子类必须和父类在同一个模块，或者同一个包（未命名模块）；permits 列表可以省略，编译器从同一个文件里的子类推断；sealed 类本身可以是 abstract，也可以有具体实现。non-sealed 表示“这个子类重新开放继承”，要谨慎使用。' },
    { code: 'public class SealedDemo {\n    sealed interface Shape permits Circle, Square {}\n    record Circle(double r) implements Shape {}\n    record Square(double side) implements Shape {}\n\n    static double area(Shape s) {\n        return switch (s) {\n            case Circle c -> Math.PI * c.r() * c.r();\n            case Square q -> q.side() * q.side();\n        };\n    }\n\n    public static void main(String[] args) {\n        System.out.println(area(new Circle(1)) > 3.14);\n        System.out.println(area(new Square(2)));\n    }\n}', title: 'SealedDemo.java' },
    { out: 'true\n4.0' },
    { p: 'Shape 只允许 Circle 和 Square 实现，switch 覆盖这两个分支就穷尽了，不需要 default。如果以后新增 Triangle 并加进 permits，编译器会立刻指出 area 方法漏了分支。这种“改一处、编译器告诉你所有要改的地方”的体验，是 sealed 最大的价值。' },
    { p: 'sealed 的限制不只是语法：子类必须与父类同模块或同包，跨模块继承需要显式 opens 或同一模块声明。这促使你把相关类型放在一起，形成清晰的领域模型。如果子类散落在各个模块，sealed 反而会成为障碍，这时要重新考虑边界，设计先行，语法只是表达。' },

    { h: '6.7 模式匹配：instanceof、switch 与记录解构' },
    { p: '以前判断类型要写 <code>if (o instanceof String) { String s = (String) o; ... }</code>，类型检查完还要强转。Java 16 的 instanceof 模式匹配把两步合成一步：<code>if (o instanceof String s)</code>，s 在条件为真的分支里自动可用，不需要强转。' },
    { p: '这个 s 的作用域由编译器做流分析决定：在 if 条件为真之后可用，在 else 分支不可用；配合 &amp;&amp; 时，只有前面条件为真才会绑定。不要在条件里赋值或做副作用，否则作用域规则会让你困惑。' },
    { p: 'instanceof 模式匹配对 null 永远返回 false，所以不用先判空；但这也意味着 null 会落到 else 分支，逻辑上要想清楚。模式变量不能重新赋值，编译器把它当作事实，重新赋值会破坏流分析。这些规则是编译器帮你排除错误，不是无缘无故的限制。' },
    { p: 'Java 21 把模式匹配扩展到了 switch：case 后面可以写类型模式、带 when 的守卫条件、null 分支，还可以用 record 模式直接解构字段。对 sealed 类型，switch 模式同样要求穷尽。这让“按类型分派”从一堆 if-else 变成结构化、可检查的表达式。' },
    { code: 'public class PatternDemo {\n    record Point(int x, int y) {}\n\n    static String describe(Object o) {\n        return switch (o) {\n            case null -> "null";\n            case Integer i when i > 0 -> "positive " + i;\n            case Integer i -> "non-positive " + i;\n            case String s -> "string " + s;\n            case Point(int x, int y) -> "point " + x + "," + y;\n            default -> "other";\n        };\n    }\n\n    public static void main(String[] args) {\n        System.out.println(describe(5));\n        System.out.println(describe(-1));\n        System.out.println(describe(new Point(2, 3)));\n        System.out.println(describe(null));\n    }\n}', title: 'PatternDemo.java' },
    { out: 'positive 5\nnon-positive -1\npoint 2,3\nnull' },
    { p: 'case null 必须显式写，否则 switch 遇到 null 会抛 NPE。when 是守卫条件，只有前面的类型匹配且条件为真才进入该分支。record 模式 <code>Point(int x, int y)</code> 直接取出两个字段，省掉访问器调用。default 仍然需要，因为 Object 不是 sealed，编译器不知道还有哪些子类型。' },
    { p: '模式匹配的顺序很重要：更具体的分支要写在前面。如果把 <code>case Integer i</code> 写在带 when 的分支之前，后面的分支永远不可达，编译会报错。编译器会检查支配关系，这是好事，能逼你把逻辑理顺。' },

    { h: '6.8 集合工厂、Optional 与 Stream 小工具' },
    { p: 'Java 9 给集合加了 <code>List.of</code>、<code>Set.of</code>、<code>Map.of</code>，用来创建不可变集合。它们比 <code>Arrays.asList</code> 更彻底：不能添加、不能删除、不能 set，而且拒绝 null 元素。元素个数固定时用起来很顺手，也天然线程安全。' },
    { p: '注意 <code>Map.of</code> 最多十个键值对，超过要用 <code>Map.ofEntries</code>；不可变集合的顺序：List 保留插入顺序，Set 不保证，Map 也不保证。需要有序就用 <code>LinkedHashMap</code> 或 <code>TreeMap</code>，不要假设 of 的顺序。' },
    { p: 'Optional 是 Java 8 引入的容器，用来表达“可能没有值”。常用方法有 <code>orElse</code>、<code>orElseGet</code>、<code>orElseThrow</code>、<code>ifPresent</code>、<code>map</code>。它适合作为方法返回值，不适合作为字段、参数或集合元素，那些场景用 null 或空集合更直接。' },
    { p: 'Stream 在 Java 9 之后补了 <code>takeWhile</code>、<code>dropWhile</code>、<code>ofNullable</code>，Java 16 加了 <code>toList</code>，可以直接把流收集成不可变列表，省掉 <code>Collectors.toList()</code>。Java 12 还有 <code>teeing</code>，把两个收集器的结果合并，适合一次遍历算两个指标。' },
    { code: 'import java.util.List;\nimport java.util.Map;\nimport java.util.Optional;\n\npublic class CollectionsDemo {\n    public static void main(String[] args) {\n        List<String> names = List.of("Ann", "Bob", "Cara");\n        Map<String, Integer> ages = Map.of("Ann", 20, "Bob", 22);\n        System.out.println(names.size() + " " + ages.get("Bob"));\n\n        Optional<String> found = names.stream()\n                .filter(n -> n.startsWith("B"))\n                .findFirst();\n        System.out.println(found.orElse("none"));\n\n        List<Integer> lengths = names.stream()\n                .map(String::length)\n                .toList();\n        System.out.println(lengths);\n\n        try {\n            names.add("Dan");\n        } catch (UnsupportedOperationException e) {\n            System.out.println("immutable");\n        }\n    }\n}', title: 'CollectionsDemo.java' },
    { out: '3 22\nBob\n[3, 3, 4]\nimmutable' },
    { p: 'List.of 创建后不能 add，抛 UnsupportedOperationException；Optional 用 orElse 给默认值；toList 把流收集成列表，结果不可变。最后一段是故意的：把“不可变”当成特性而不是限制，能避免很多共享修改的问题。' },
    { p: '不可变集合还有一个好处：可以安全地作为常量共享，不需要每次返回时复制。方法返回 List.of(...) 时，调用方无法修改内部状态，天然防御性。如果方法要返回内部可变集合，记得用 List.copyOf 包一层再返回，这是 API 设计的常用手法。' },
    { table: { head: ['场景', '旧写法', '新写法'], rows: [
      ['创建小列表', 'Arrays.asList(1, 2)', 'List.of(1, 2)'],
      ['创建小映射', 'new HashMap 后逐个 put', 'Map.of(k1, v1, k2, v2)'],
      ['可能为空的结果', '返回 null 再判空', 'Optional 返回值'],
      ['流收集为列表', 'collect(Collectors.toList())', 'stream().toList()'],
      ['取前几个元素', '手动计数 break', 'takeWhile 或 limit']
    ] } },

    { h: '6.9 Java 21/25：虚拟线程与 LTS' },
    { p: 'Java 21 是继 17 之后的 LTS 版本，2025 年 9 月发布的 Java 25 是当前 LTS，虚拟线程在两代中都已转正。最受关注的是虚拟线程：传统平台线程一对一映射到操作系统线程，创建成本高，几千个就可能把内存压垮；虚拟线程由 JVM 调度，阻塞时自动让出载体线程，可以轻松创建几十万个，适合大量 I/O 等待的场景。' },
    { p: '虚拟线程不是“更快的线程”。CPU 密集型任务用它没有收益，甚至略慢；它解决的是“线程太贵，导致只能用回调或响应式编程”的问题。用 <code>Thread.ofVirtual().start(task)</code> 或 <code>Executors.newVirtualThreadPerTaskExecutor()</code> 创建，代码仍是同步阻塞的写法，可读性比回调好得多。' },
    { p: '还有一个坑：在 synchronized 块里阻塞会钉住载体线程（pinning），虚拟线程的优势打折。Java 21 里可以用 ReentrantLock 替代，或者避免在锁内做 I/O。Java 24 对 synchronized 的 pinning 做了改进，但升级前仍要评估。' },
    { p: 'Java 21 还把 switch 模式匹配、record 模式转正，正式支持有序集合（SequencedCollection），让 List、Deque 有了统一的首尾操作。选版本时优先 LTS：当前 LTS 是 25，21 是上一代 LTS；8、11、17 已停止或即将停止 OSS 支持，不适合作为新项目底座。社区支持周期长，企业升级成本才低。' },
    { p: '迁移到虚拟线程时，先看线程池的用途：如果是 I/O 等待，换成虚拟线程往往能提升吞吐；如果是 CPU 计算，保持固定大小平台线程池。还要注意 ThreadLocal 的滥用，虚拟线程数量大，每个线程存一份大对象会放大内存占用，工具变了，习惯也要跟着变。' },
    { code: 'import java.util.concurrent.Executors;\n\npublic class VirtualThreadDemo {\n    public static void main(String[] args) throws Exception {\n        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n            for (int i = 1; i <= 3; i++) {\n                int id = i;\n                executor.submit(() -> {\n                    System.out.println("task " + id + " virtual="\n                            + Thread.currentThread().isVirtual());\n                    return null;\n                });\n            }\n        }\n        System.out.println("done");\n    }\n}', title: 'VirtualThreadDemo.java' },
    { out: 'task 1 virtual=true\ntask 2 virtual=true\ntask 3 virtual=true\ndone' },
    { p: '三个任务的输出顺序不保证，因为虚拟线程并发执行；isVirtual 返回 true 确认它们不是平台线程。try-with-resources 关闭 executor 时会等待所有任务结束，所以 done 一定最后打印。这段代码的结构和普通线程池几乎一样，迁移成本很低。' },
    { table: { head: ['版本', '代表特性', '备注'], rows: [
      ['Java 8', 'Lambda、Stream、Optional、新日期 API', '目前仍有大量存量系统'],
      ['Java 10', 'var 局部变量推断', '小特性，改变写法'],
      ['Java 11', 'LTS、HttpClient、Lambda 参数用 var', '企业升级常见跳板'],
      ['Java 14', 'switch 表达式', '减少穿透错误'],
      ['Java 15', '文本块', '多行字符串不再拼加号'],
      ['Java 16', 'record、instanceof 模式匹配', '数据类与类型判断简化'],
      ['Java 17', 'LTS、sealed', '继承体系可控'],
      ['Java 21', 'LTS、虚拟线程、switch 模式、record 模式', '上一代 LTS，存量项目主力'],
      ['Java 25', 'LTS、虚拟线程改进（synchronized 下不再钉住载体）', '当前新项目首选']
    ] } },

    { h: '6.10 升级决策与兼容性' },
    { p: '升级 JDK 不是改个版本号。先盘点依赖：框架、构建插件、字节码工具是否支持目标版本；再看 API：被移除的 Nashorn、SecurityManager 的弃用、Java 16 的强封装导致反射报错；最后看构建：用 <code>--release</code> 编译，能同时约束语法和 API，比只改 source/target 可靠。' },
    { p: '兼容性问题的典型来源是反射和内部 API。以前靠 <code>setAccessible(true)</code> 改 JDK 内部字段的代码，在强封装之后会抛 <code>InaccessibleObjectException</code>，需要加 <code>--add-opens</code> 临时放行，但长期要改掉。字节码生成库、序列化框架也要跟着升级。' },
    { flow: ['盘点 JDK 与构建工具', '检查依赖的版本支持矩阵', '用 --release 编译并跑全量测试', '处理移除 API 与反射告警', '灰度发布并保留回滚方案'] },
    { p: '版本选择上，新项目直接用 25；21 仅用于兼容存量。存量系统如果还在 8，可以先到 11 或 17，再评估 21，最后到 25。每跨一个 LTS，测试覆盖要更充分，尤其是依赖注入、序列化、代理这些重反射的框架。升级不是目的，能持续拿到安全补丁和性能改进才是。' },
    { p: '测试策略上，至少准备三类用例：纯单元测试、集成测试、依赖框架的启动测试。升级前在分支上跑一遍，记录失败原因，区分“代码问题”和“依赖不兼容”。不要一次性升级所有东西，JDK、框架、构建工具分开升，出问题才好定位，升级是一次工程，不是一次改配置。' },
    { p: '最后提醒：不要为了用新特性而重写稳定代码。新语法应该在你正好要改那块逻辑时顺手采用，而不是单独发起一次现代化改造。每一次重构都要有测试兜底，否则语法变新了，bug 也变新了。' },

    { h: '6.11 常见错误清单' },
    { list: [
      '把 var 当成动态类型，声明后还想换类型。',
      '用 var 接一个看不出类型的方法返回值，损害可读性。',
      '文本块开头三个引号后没换行，编译报错。',
      '文本块里以为缩进会原样保留，结果被公共缩进消除。',
      'switch 表达式分支类型不一致，编译失败。',
      '在 switch 表达式里用 return 而不是 yield。',
      'record 里声明实例字段，编译不过。',
      '以为 record 可以继承，或者可以被继承。',
      'sealed 子类忘记写 final、sealed 或 non-sealed。',
      'switch 模式漏了 default，对非 sealed 类型无法穷尽。',
      'case null 不写，switch 遇到 null 抛 NPE。',
      'Optional 当字段或参数用，造成套娃和额外判空。'
    ] },

    { p: '清单可以当 code review 的检查项：看到 var 就问类型是否明显，看到 switch 就问是否穷尽，看到 record 就问字段是否不可变。把语法特性和检查点绑定，比泛泛地说“注意规范”有效得多。团队可以把它做成合并请求模板，逐条勾选。' },
    { h: '6.12 本章小结' },
    { list: [
      'var 只用于局部变量，必须初始化，类型编译期确定。',
      '文本块去掉公共缩进，适合 JSON、SQL、HTML 片段。',
      'switch 表达式用箭头、无穿透，代码块用 yield 返回。',
      'record 自动生成构造器、访问器、equals、hashCode、toString。',
      '紧凑构造器用来校验参数，保证对象创建即合法。',
      'sealed 限定子类，配合 switch 实现穷尽检查。',
      'instanceof 模式匹配省掉强转，作用域由流分析决定。',
      'Java 21 的 switch 模式支持 null、when 守卫和 record 解构。',
      'List.of、Map.of 创建不可变集合，拒绝 null。',
      '虚拟线程适合 I/O 密集，不是让 CPU 计算变快。'
    ] },

    { h: '6.13 常见追问' },
    { list: [
      '<b>var 会影响性能吗？</b>不会，编译期推断出具体类型，字节码与写全类型一致。',
      '<b>record 能序列化吗？</b>可以，但要注意规范构造器校验和兼容性，框架支持程度要确认。',
      '<b>sealed 和 final 有什么区别？</b>final 禁止任何继承；sealed 允许指定子类继承。',
      '<b>switch 模式为什么还要 default？</b>对 Object 等非 sealed 类型，编译器无法确认穷尽。',
      '<b>虚拟线程能替代线程池吗？</b>I/O 密集场景可以大幅简化；CPU 密集仍用固定大小平台线程池。',
      '<b>新特性一定要用吗？</b>不用。团队熟悉度、依赖支持、升级成本都是决策因素。'
    ] },

    { h: '6.14 自测与练习' },
    { ol: [
      '用 record 定义一个订单项（商品名、单价、数量），在紧凑构造器里校验单价和数量都为正，并写一个方法计算小计。',
      '用 sealed 接口定义三种支付方式，配合 switch 表达式计算手续费，要求不写 default 也能通过编译。',
      '写一个方法，接收 Object，用 switch 模式分别处理 null、正数、负数、字符串和点坐标，并打印结果。'
    ] },
    { note: '<b>练习建议：</b>把代码编译目标设为 21，遇到编译错误先读提示，多数是版本或穷尽性问题。写完对照本章的“常见错误清单”，看看自己踩了几个。' }
  ] };

})();
