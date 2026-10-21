/* =====================================================================
   补充题库：模块 m0 ~ m4
   - EXAM_EXTRA：按模块补充，使每个模块总题量至少 18（供随机抽 15）
   - LESSON_EXTRA：给单课 quiz 少于 3 的课补到 3 题
   题目均为原创，面向零基础，覆盖各模块核心知识点。
   ===================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------
     EXAM_EXTRA
     m0 原有 3 题 → 补 15 题，共 18 题
     m1 原有 15 题 → 补 3 题，共 18 题
     m2 原有 24 题 → 无需补充
     m3 原有 18 题 → 无需补充
     m4 原有 14 题 → 补 4 题，共 18 题
     ---------------------------------------------------------------- */
  window.EXAM_EXTRA = window.EXAM_EXTRA || {};
  Object.assign(window.EXAM_EXTRA, {
    m0: [
      {
        q: '准备学习 Java，选择 JDK 版本时最稳妥的做法是？',
        options: [
          '直接选最新的非 LTS 版本，功能最多',
          '选 JDK 25 这类当前 LTS 长期支持版本',
          '版本越旧越稳定，选 JDK 8 以前的版本',
          '随便装一个，版本对学习没有影响'
        ],
        answer: 1,
        explain: 'LTS 是长期支持版本；当前 LTS 是 25（21 为上一代 LTS），学习阶段装 25 即可；17/21 的生态资料仍最多，可作过渡。'
      },
      {
        q: '关于 JDK 和 JRE 的关系，正确的是？',
        options: [
          'JRE 包含 JDK',
          '两者完全独立，必须分别安装',
          'JDK 包含 JRE，装了 JDK 就不必再单独装 JRE',
          'JDK 只包含 javac，不包含运行环境'
        ],
        answer: 2,
        explain: 'JDK = 开发工具 + JRE，JRE = JVM + 核心类库。所以装好 JDK，编译和运行需要的组件就都有了。'
      },
      {
        q: '<code>JAVA_HOME</code> 应该指向哪个目录？',
        options: [
          'JDK 的安装根目录',
          'JDK 安装目录下的 bin 目录',
          '任意一个能放 .java 文件的目录',
          '系统临时目录'
        ],
        answer: 0,
        explain: 'JAVA_HOME 指向 JDK 根目录，例如 <code>C:\\Program Files\\Java\\jdk-21</code>；PATH 里再引用 <code>%JAVA_HOME%\\bin</code>，工具命令才找得到。'
      },
      {
        q: 'Windows 上要让系统能在任意目录找到 <code>java</code> 和 <code>javac</code>，PATH 里应该加入？',
        options: [
          'JDK 的安装根目录',
          '<code>%JAVA_HOME%\\lib</code>',
          '项目所在的目录',
          '<code>%JAVA_HOME%\\bin</code>'
        ],
        answer: 3,
        explain: '可执行文件 java.exe、javac.exe 都在 JDK 的 bin 目录里，所以 PATH 要指向 bin；指向根目录或 lib 都不行。'
      },
      {
        q: '已经把 JDK 的 bin 加进 PATH，当前终端却仍提示“找不到 java 命令”，最可能的原因是？',
        options: [
          'JDK 版本太新',
          '环境变量改完后没有重开终端',
          '必须重启电脑',
          'PATH 只能配置一次'
        ],
        answer: 1,
        explain: '已经打开的终端用的是启动时的环境变量，改完 PATH 要关掉终端重新打开（或重新登录）才会生效。'
      },
      {
        q: '源文件叫 <code>Hello.java</code>，编译它的命令是？',
        options: [
          '<code>java Hello.java</code>',
          '<code>javac Hello</code>',
          '<code>javac Hello.java</code>',
          '<code>java Hello.class</code>'
        ],
        answer: 2,
        explain: 'javac 是编译器，后面跟带扩展名的源文件名；java 是启动器，后面跟不带 .class 的类名。'
      },
      {
        q: '<code>Hello.java</code> 已经编译出 <code>Hello.class</code>，运行它的命令是？',
        options: [
          '<code>java Hello.class</code>',
          '<code>javac Hello</code>',
          '<code>run Hello</code>',
          '<code>java Hello</code>'
        ],
        answer: 3,
        explain: 'java 命令接收的是类名而不是文件名，所以要写 java Hello，加上 .class 反而会报错。'
      },
      {
        q: 'Java 程序入口 main 方法的标准写法是？',
        options: [
          '<code>public static void main(String[] args)</code>',
          '<code>public void main(String[] args)</code>',
          '<code>static main(String args)</code>',
          '<code>public static main(String[] args)</code>'
        ],
        answer: 0,
        explain: 'JVM 不创建对象就要调用入口，所以 main 必须是 public static void，参数是 String 数组。少一个修饰符都无法启动。'
      },
      {
        q: '一个 <code>.java</code> 文件里可以定义多个类吗？',
        options: [
          '不可以，一个文件只能有一个类',
          '可以，而且所有类都必须是 public',
          '可以，但 public 类最多一个，且类名要与文件名一致',
          '只有接口能写多个，类不行'
        ],
        answer: 2,
        explain: '一个文件可以写多个类，但只能有一个 public 类，并且这个 public 类的名字必须和文件名相同；其他类不能用 public 修饰。'
      },
      {
        q: '终端里 <code>java -version</code> 正常，但 <code>javac -version</code> 提示找不到命令，最可能的原因是？',
        options: [
          'JDK 版本太旧',
          '装的可能是 JRE，或 PATH 只指向了 JRE 的 bin',
          '必须用管理员权限运行',
          'javac 需要单独付费下载'
        ],
        answer: 1,
        explain: 'java 在 JRE 里也有，javac 只随 JDK 提供。确认装的是 JDK，并让 JAVA_HOME / PATH 指向 JDK 而不是 JRE。'
      },
      {
        q: 'IntelliJ IDEA、VS Code 这类 IDE 在 Java 开发中的角色是？',
        options: [
          '替代 JDK，装 IDE 就不需要 JDK 了',
          '只负责给代码上色，不能编译',
          '必须付费才能编译 Java',
          '编辑器与辅助工具，底层仍调用 JDK 的编译和运行能力'
        ],
        answer: 3,
        explain: 'IDE 提供补全、导航、调试等便利，但编译仍然靠 javac（或内置编译器），运行仍然靠 JVM，所以必须先装好 JDK。'
      },
      {
        q: '<code>.class</code> 文件里存放的是什么？',
        options: [
          'JVM 能读懂的字节码',
          '可以直接被 CPU 执行的机器码',
          '原始 Java 源码的副本',
          '编译器的配置文件'
        ],
        answer: 0,
        explain: 'javac 把源码编译成与平台无关的字节码，由 JVM 加载后再解释或 JIT 编译成本地机器码。'
      },
      {
        q: '一台电脑只装了 JRE，没有装 JDK，会发生什么？',
        options: [
          '什么都不能做',
          '可以正常运行已编译的程序，但无法用 javac 编译新代码',
          '可以编译，只是不能运行',
          '会自动下载 JDK'
        ],
        answer: 1,
        explain: 'JRE 只包含运行所需的部分；javac 属于 JDK。所以能运行 .class，却编译不了 .java。'
      },
      {
        q: '希望每次输出后自动换行，应该用？',
        options: [
          '<code>System.out.print</code>',
          '<code>System.out.printf</code>',
          '<code>System.out.write</code>',
          '<code>System.out.println</code>'
        ],
        answer: 3,
        explain: 'println 的 ln 就是 line，输出内容后追加换行；print 不换行；printf 按格式输出，默认也不会自动换行。'
      },
      {
        q: '在 <code>Hello.class</code> 所在目录执行 <code>java Hello</code>，却提示“找不到或无法加载主类”，下面哪个原因最可能？',
        options: [
          'JDK 版本太低',
          '必须先执行 javac 才能运行',
          '类名拼写错误，或当前目录 / 包名与类不匹配',
          '.class 文件不能被 java 命令运行'
        ],
        answer: 2,
        explain: 'java 按类名和包路径查找 class 文件。类名拼错、没在 class 文件所在目录、或有 package 却没按目录结构存放，都会报这个错。'
      }
    ],

    m1: [
      {
        q: '下面哪一行能正确声明一个字符变量和一个字符串变量？',
        options: [
          '<code>char c = "A"; String s = \'A\';</code>',
          '<code>char c = \'A\'; String s = "A";</code>',
          '<code>char c = A; String s = A;</code>',
          '<code>String c = \'A\'; char s = "A";</code>'
        ],
        answer: 1,
        explain: 'char 表示单个字符，用单引号且只能有一个字符；String 是对象，用双引号。引号用反或类型对不上都会编译错误。'
      },
      {
        q: '<code>byte a = 1; byte b = 2; byte c = a + b;</code> 这段代码会怎样？',
        options: [
          '正常编译，c 等于 3',
          '运行时报错',
          '编译错误，a + b 的结果是 int，需要强制转换',
          'a + b 会自动变成 byte，不会出错'
        ],
        answer: 2,
        explain: '做算术运算时，byte、short、char 会先提升为 int，所以 a + b 是 int，不能直接赋给 byte，要写 <code>byte c = (byte) (a + b);</code>。'
      },
      {
        q: '关于 <code>do-while</code> 和 <code>while</code> 的区别，正确的是？',
        options: [
          'do-while 至少执行一次循环体，while 可能一次都不执行',
          '两者完全一样，只是写法不同',
          'while 至少执行一次，do-while 可能一次都不执行',
          'do-while 不能写 break'
        ],
        answer: 0,
        explain: 'do-while 先执行循环体再判断条件，所以第一次一定执行；while 先判断，条件一开始就是 false 时一次都不执行。'
      }
    ],

    m2: [],

    m3: [],

    m4: [
      {
        q: '<code>List&lt;Integer&gt; list = new ArrayList&lt;&gt;(List.of(10, 20, 30)); list.remove(1);</code> 之后 list 里剩下什么？',
        options: [
          '[20, 30]，删掉了第一个元素',
          '[10, 20, 30] 不变',
          '[10, 30]，删掉了下标 1 的元素 20',
          '编译错误，remove 不能接收 int'
        ],
        answer: 2,
        explain: 'remove(int index) 按下标删除，remove(Object o) 按内容删除。传入基本类型 int 1 会匹配下标版本，删掉的是 20；想删元素 1 要写 <code>remove(Integer.valueOf(1))</code>。'
      },
      {
        q: '用 <code>Iterator</code> 遍历完集合后，再调用一次 <code>next()</code> 会？',
        options: [
          '返回 null',
          '抛 <code>NoSuchElementException</code>',
          '自动从头开始重新遍历',
          '编译错误'
        ],
        answer: 1,
        explain: '迭代器走到末尾后 hasNext() 返回 false；此时继续 next() 没有元素可返回，会抛 NoSuchElementException，而不是返回 null。'
      },
      {
        q: '<code>PriorityQueue&lt;Integer&gt;</code> 依次 <code>offer(3)</code>、<code>offer(1)</code>、<code>offer(2)</code>，连续 <code>poll()</code> 得到的顺序是？',
        options: [
          '3、1、2（按插入顺序）',
          '3、2、1（从大到小）',
          '顺序不确定，每次都可能不同',
          '1、2、3（从小到大）'
        ],
        answer: 3,
        explain: 'PriorityQueue 默认是小顶堆，poll 每次取出当前最小值，所以是 1、2、3。它只保证出队有序，直接遍历并不保证顺序。'
      },
      {
        q: '关于 HashMap 和 ConcurrentHashMap 对 null 的支持，正确的是？',
        options: [
          'HashMap 允许一个 null key 和多个 null value，ConcurrentHashMap 都不允许',
          '两者都允许 null key',
          'HashMap 不允许 null，ConcurrentHashMap 允许',
          '两者都不允许 null value'
        ],
        answer: 0,
        explain: 'HashMap 把 null 当作一个特殊 key 存起来；ConcurrentHashMap 在并发场景下无法区分“没有这个 key”和“值就是 null”，所以 key 和 value 都不允许为 null。'
      }
    ]
  });

  /* ----------------------------------------------------------------
     LESSON_EXTRA
     m4 有 4 节课只有 2 题，各补 1 题到 3 题
     ---------------------------------------------------------------- */
  window.LESSON_EXTRA = window.LESSON_EXTRA || {};
  Object.assign(window.LESSON_EXTRA, {
    'collections': [
      {
        q: '既要保留添加顺序，又允许存重复元素，应该选？',
        options: [
          'HashSet',
          'TreeMap',
          'ArrayList',
          'HashMap'
        ],
        answer: 2,
        explain: 'List（如 ArrayList）有序且可重复；Set 会去重；Map 存的是键值对。这里描述的正是 List 的特点。'
      }
    ],

    'arraylist-linkedlist': [
      {
        q: 'ArrayList 按索引取元素很快，根本原因是？',
        options: [
          '底层是连续数组，用下标就能直接算出元素位置',
          '每次 get 都会从头遍历链表',
          '它在内部维护了一个 HashMap 做缓存',
          '取元素时会自动排序'
        ],
        answer: 0,
        explain: '数组在内存中连续存放，首地址 + 下标 × 元素大小就能定位，所以 get(i) 是 O(1)。这也是 ArrayList 随机访问比 LinkedList 快的原因。'
      }
    ],

    'set-comparator': [
      {
        q: 'HashSet 判断两个元素是否重复，依据是？',
        options: [
          '只比较 <code>hashCode()</code>',
          '只调用 <code>equals()</code>',
          '比较元素的 <code>toString()</code>',
          '先比 <code>hashCode()</code> 找到桶，再用 <code>equals()</code> 确认'
        ],
        answer: 3,
        explain: '哈希值决定落到哪个桶，桶内再用 equals 精确比较。所以自定义对象作为元素时，两个方法要一起重写并保持一致。'
      }
    ],

    'iterator-queue': [
      {
        q: '<code>Queue</code> 的 <code>offer</code> / <code>poll</code> / <code>peek</code> 与 <code>add</code> / <code>remove</code> / <code>element</code> 的区别是？',
        options: [
          '前者会抛异常，后者返回特殊值',
          '前者失败时返回 false 或 null，后者失败时抛异常',
          '完全没有区别',
          '前者只能用于 Deque'
        ],
        answer: 1,
        explain: 'offer 失败返回 false，poll/peek 在队列为空时返回 null；add/remove/element 失败则抛异常。按“是否需要立刻发现错误”来选。'
      }
    ]
  });
})();
