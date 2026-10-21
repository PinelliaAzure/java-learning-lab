/* =====================================================================
   课程数据：IO 与 NIO / 并发编程 / JVM
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
     模块 7 · IO 与 NIO
     ================================================================ */
  C.push({
    id: 'm7',
    no: '07',
    title: 'IO 与 NIO',
    desc: '读写文件、缓冲与序列化',
    lessons: [

      {
        id: 'io-streams',
        title: '字节流与字符流',
        minutes: 7,
        level: '入门',
        intro: 'IO 的第一道选择题：你到底在传“字节”还是“字符”？选错就会出现乱码，或者把二进制文件读坏。',
        points: [
          { t: '字节流', d: '<code>InputStream / OutputStream</code>，以 byte 为单位，适合图片、音频、压缩包等二进制数据。' },
          { t: '字符流', d: '<code>Reader / Writer</code>，以 char 为单位，适合文本。它内部仍要指定编码（UTF-8 / GBK），否则会乱码。' },
          { t: '转换', d: '<code>InputStreamReader</code> 把字节按编码解码成字符；<code>OutputStreamWriter</code> 反向编码。' },
          { t: '关闭顺序', d: '先打开的后关闭；用 try-with-resources 时 JVM 自动按相反顺序关闭，不用手写 finally。' }
        ],
        code: `// 按字节复制（图片、PDF 都适用）
try (InputStream in = new FileInputStream("a.png");
     OutputStream out = new FileOutputStream("b.png")) {
    byte[] buf = new byte[8192];
    int n;
    while ((n = in.read(buf)) != -1) {
        out.write(buf, 0, n);
    }
}

// 按字符读文本
try (BufferedReader br = new BufferedReader(
        new InputStreamReader(new FileInputStream("a.txt"), StandardCharsets.UTF_8))) {
    String line = br.readLine();
}`,
        tip: '二进制文件千万别用 Reader 读；文本文件也别用字节流直接拼字符串，编码会坑你。',
        demo: D([
          { id: 'fin', label: '文件 / 网络', sub: '原始字节', x: 6, y: 8, w: 20, h: 14, tone: 'amber', info: '磁盘上的文件本质都是字节；网络传输的也是字节。' },
          { id: 'is', label: 'InputStream', sub: '字节输入流', x: 32, y: 8, w: 20, h: 14, tone: 'teal', info: '每次 read 返回 0~255 的 int，读到末尾返回 -1。' },
          { id: 'dec', label: '解码器', sub: 'UTF-8 → char', x: 58, y: 8, w: 18, h: 14, tone: 'violet', info: '按指定字符集把字节序列翻译成字符；编码不一致就会出现“锟斤拷”。' },
          { id: 'reader', label: 'Reader', sub: '字符输入流', x: 82, y: 8, w: 14, h: 14, tone: 'blue', info: '以 char 为单位读取，适合文本；readLine 是 BufferedReader 提供的方法。' },
          { id: 'writer', label: 'Writer', sub: '字符输出流', x: 6, y: 60, w: 20, h: 14, tone: 'blue', info: '写入字符，内部再编码成字节。' },
          { id: 'enc', label: '编码器', sub: 'char → UTF-8', x: 32, y: 60, w: 20, h: 14, tone: 'violet', info: '把字符编码成字节序列；写入时的字符集必须和读取时一致。' },
          { id: 'os', label: 'OutputStream', sub: '字节输出流', x: 58, y: 60, w: 20, h: 14, tone: 'teal', info: '以字节为单位写出；write 后通常需要 flush 才真正落盘。' },
          { id: 'fout', label: '文件 / 网络', sub: '原始字节', x: 84, y: 60, w: 12, h: 14, tone: 'amber', info: '最终写回磁盘或发送到网络。' }
        ], [
          { from: 'fin', to: 'is', label: '读' },
          { from: 'is', to: 'dec', label: '字节' },
          { from: 'dec', to: 'reader', label: '字符' },
          { from: 'writer', to: 'enc', label: '写' },
          { from: 'enc', to: 'os', label: '字节' },
          { from: 'os', to: 'fout', label: '落盘' }
        ], '上排读、下排写；中间都绕不开“编码”这一步。点击节点看细节。', 'IO 的两条管道'),
        quiz: [
          {
            q: '要复制一张图片，应该用？',
            options: ['FileReader / FileWriter', 'InputStream / OutputStream', 'BufferedReader / PrintWriter', 'Scanner'],
            answer: 1,
            explain: '图片是二进制数据，必须按字节读写；用字符流会尝试解码，破坏原始数据。'
          },
          {
            q: '读取 UTF-8 文本时出现乱码，最可能的原因是？',
            options: ['文件太大', '读取时使用的字符集与写入时不一致', '没有用 BufferedReader', '使用了 try-with-resources'],
            answer: 1,
            explain: '编码和解码必须使用同一字符集；平台默认编码不同就会乱码，显式指定 UTF-8 最稳。'
          }
        ]
      },

      {
        id: 'buffered',
        title: '缓冲流与 try-with-resources',
        minutes: 6,
        level: '入门',
        intro: '每读一个字节就访问一次磁盘，慢得离谱。缓冲流先在内存里攒一批再统一读写；try-with-resources 则保证资源一定会被关闭。',
        points: [
          { t: '缓冲流', d: '<code>BufferedReader / BufferedWriter / BufferedInputStream</code> 内部维护缓冲区，减少系统调用次数，通常能快一个数量级。' },
          { t: '读文本', d: '<code>readLine()</code> 一次读一行，返回 null 表示结束。注意它不包含换行符。' },
          { t: 'try-with-resources', d: '资源必须实现 <code>AutoCloseable</code>；无论正常结束还是抛异常，都会自动 close，且按声明的相反顺序关闭。' },
          { t: 'flush', d: '缓冲输出流写完后要 flush 或 close，否则最后一部分数据可能还在内存里。' }
        ],
        code: `try (BufferedReader br = new BufferedReader(
        new FileReader("words.txt", StandardCharsets.UTF_8))) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
}`,
        tip: '不要再写 <code>finally { br.close(); }</code>——try-with-resources 更短，而且能正确处理 close 时的异常抑制。',
        demo: S(`try (BufferedReader br = new BufferedReader(new FileReader("words.txt"))) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
}`, [
          [0, { br: 'BufferedReader(已打开)' }, '打开文件并包上缓冲流，此时还没有真正读数据。'],
          [1, { br: '已打开', line: 'null' }, '声明 line，准备接收每一行。'],
          [2, { br: '已打开', line: '"Java"' }, 'readLine 读到第一行 "Java"，不为 null，进入循环。'],
          [3, { br: '已打开', line: '"Java"' }, '打印第一行。', 'Java'],
          [2, { br: '已打开', line: '"Python"' }, '继续读第二行。'],
          [3, { br: '已打开', line: '"Python"' }, '打印第二行。', 'Python'],
          [2, { br: '已打开', line: 'null' }, '读到文件末尾，readLine 返回 null。'],
          [0, { br: '已关闭' }, '循环结束，try-with-resources 自动调用 close 释放文件句柄。']
        ], '逐行读取文件', '注意循环条件：先赋值再判断，null 表示 EOF。'),
        quiz: [
          {
            q: 'try-with-resources 要求资源类必须实现哪个接口？',
            options: ['Runnable', 'AutoCloseable', 'Serializable', 'Comparable'],
            answer: 1,
            explain: '只有实现了 AutoCloseable（或其子接口 Closeable）的对象，才能在 try 的括号里自动关闭。'
          },
          {
            q: 'BufferedWriter 写完后忘记 flush/close，可能发生什么？',
            options: ['自动立即写入', '最后一部分缓冲区数据丢失', '编译错误', '文件被删除'],
            answer: 1,
            explain: '缓冲流先把数据攒在内存里，未 flush/close 时缓冲区内容可能还没写到磁盘。'
          }
        ]
      },

      {
        id: 'nio-files',
        title: '文件与 NIO：Path / Files',
        minutes: 7,
        level: '进阶',
        intro: 'JDK 7 的 NIO.2 用 Path 和 Files 重写了文件操作：链式路径、一行读写、目录遍历、文件属性，比老的 File 类好用太多。',
        points: [
          { t: 'Path', d: '<code>Path.of("data", "a.txt")</code> 表示路径，不要求文件存在。可 <code>resolve</code>、<code>relativize</code>、<code>normalize</code>。' },
          { t: 'Files 工具类', d: '<code>readString / writeString / readAllLines / copy / move / deleteIfExists / createDirectories</code>，全是静态方法。' },
          { t: '遍历', d: '<code>Files.list(dir)</code> 只看一层；<code>Files.walk(dir)</code> 递归遍历，返回 Stream&lt;Path&gt;，记得用 try-with-resources 关闭流。' },
          { t: '老 File 类', d: '仍能用，但 API 返回 boolean 表示成败，错误信息不清晰；新代码优先 NIO.2。' }
        ],
        code: `Path path = Path.of("data", "note.txt");
Files.createDirectories(path.getParent());
Files.writeString(path, "hello", StandardCharsets.UTF_8);

String text = Files.readString(path);
List<String> lines = Files.readAllLines(path);

try (Stream<Path> stream = Files.list(Path.of("."))) {
    stream.filter(p -> p.toString().endsWith(".java"))
          .forEach(System.out::println);
}`,
        tip: 'Files.readString 默认按 UTF-8；处理大文件不要一次读进内存，用 BufferedReader 或 Files.lines 流式处理。',
        demo: S(`Path path = Path.of("data", "note.txt");
Files.writeString(path, "hello");
String text = Files.readString(path);
System.out.println(text);`, [
          [0, { path: 'data/note.txt' }, 'Path 只是路径描述，文件此时可能还不存在。'],
          [1, { path: 'data/note.txt' }, 'writeString 创建文件并写入 "hello"（父目录需已存在）。'],
          [2, { path: 'data/note.txt', text: '"hello"' }, 'readString 一次性读出全部内容。'],
          [3, { path: 'data/note.txt', text: '"hello"' }, '输出内容。', 'hello']
        ], '一行读写文件', '注意 writeString 默认会覆盖原文件；追加要传 StandardOpenOption.APPEND。'),
        quiz: [
          {
            q: '递归遍历一个目录下的所有文件，最适合用？',
            options: ['Files.list', 'Files.walk', 'File.list', 'Files.readString'],
            answer: 1,
            explain: 'Files.list 只看一层；Files.walk 会递归遍历整棵目录树，返回 Stream&lt;Path>。'
          },
          {
            q: '下面哪个方法可以直接把字符串写入文件？',
            options: ['Files.writeString', 'Files.copy', 'Files.move', 'Path.resolve'],
            answer: 0,
            explain: 'Files.writeString 是 JDK 11 新增的一行写文件方法；copy/move 是复制移动，resolve 只是拼接路径。'
          }
        ]
      },

      {
        id: 'serialization',
        title: '序列化与 JSON',
        minutes: 6,
        level: '进阶',
        intro: '序列化把对象变成字节流，便于保存或传输。Java 原生序列化方便但脆弱，现代项目更常用 JSON。',
        points: [
          { t: 'Serializable', d: '只是一个标记接口，没有方法。类实现它，才能被 <code>ObjectOutputStream</code> 写出。' },
          { t: 'serialVersionUID', d: '版本号。类结构变化时，如果不显式声明，反序列化可能抛 <code>InvalidClassException</code>。' },
          { t: 'transient', d: '被 transient 修饰的字段不参与序列化，反序列化后是默认值（对象为 null，数字为 0）。' },
          { t: '安全与替代', d: '原生序列化有反序列化漏洞风险、跨语言差、体积大；接口传输和存储通常用 JSON（Jackson / Gson）。' }
        ],
        code: `class User implements Serializable {
    private static final long serialVersionUID = 1L;
    String name;
    transient String password;   // 不序列化
}

// 写
try (ObjectOutputStream out = new ObjectOutputStream(
        new FileOutputStream("user.bin"))) {
    out.writeObject(new User("Tom", "123456"));
}

// 读
try (ObjectInputStream in = new ObjectInputStream(
        new FileInputStream("user.bin"))) {
    User u = (User) in.readObject();
}`,
        tip: '面试常问：serialVersionUID 不一致会抛 InvalidClassException；transient 字段读回来是默认值。',
        demo: S(`User u = new User("Tom", "123456");
byte[] bytes = serialize(u);
User copy = deserialize(bytes);
System.out.println(copy.name);
System.out.println(copy.password);`, [
          [0, { u: '#1' }, '创建对象 name=Tom，password=123456。', '', [
            { title: '#1 User', rows: [['name', '"Tom"'], ['password', '"123456"']] }
          ]],
          [1, { u: '#1', bytes: 'byte[..] (序列化后)' }, '对象被写成字节流；transient 字段 password 被跳过。'],
          [2, { u: '#1', copy: '#2' }, '反序列化创建新对象 #2，name 恢复，password 为 null。', '', [
            { title: '#2 User', rows: [['name', '"Tom"'], ['password', 'null']] }
          ]],
          [3, { copy: '#2' }, '输出 name。', 'Tom'],
          [4, { copy: '#2' }, '输出 password，因为 transient 没有被保存，所以是 null。', 'null']
        ], 'transient 字段不会被打包', '反序列化出来的是新对象，不是原来的引用。'),
        quiz: [
          {
            q: '被 <code>transient</code> 修饰的字段，序列化后会怎样？',
            options: ['正常保存', '不保存，反序列化为默认值', '编译错误', '变成字符串 "null"'],
            answer: 1,
            explain: 'transient 表示“临时字段”，不参与序列化；读回来是 null / 0 / false 等默认值。'
          },
          {
            q: '现代项目为什么更少用 Java 原生序列化？',
            options: ['速度太慢是唯一原因', '跨语言差、体积大且有反序列化安全风险', 'JDK 已删除该功能', '只能序列化字符串'],
            answer: 1,
            explain: '原生序列化与 Java 类强绑定，跨语言困难，体积大，还存在反序列化漏洞；JSON / Protobuf 更通用安全。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 8 · 并发编程
     ================================================================ */
  C.push({
    id: 'm8',
    no: '08',
    title: '并发编程',
    desc: '线程、锁、线程池与并发容器',
    lessons: [

      {
        id: 'thread-basics',
        title: '线程的创建与生命周期',
        minutes: 7,
        level: '进阶',
        intro: '并发让程序“同时做几件事”，但也带来了竞态、死锁和可见性问题。先把线程怎么创建、怎么协作搞清楚。',
        points: [
          { t: '三种创建方式', d: '继承 Thread、实现 Runnable、实现 Callable + FutureTask。推荐 Runnable / Callable，避免占用继承名额。' },
          { t: '生命周期', d: 'NEW → RUNNABLE → （BLOCKED / WAITING / TIMED_WAITING）→ TERMINATED。start 才是启动，直接 run 只是普通方法调用。' },
          { t: '协作', d: '<code>sleep</code> 让出 CPU 指定时间；<code>join</code> 等另一个线程结束；<code>interrupt</code> 是协作式中断，不会强杀线程。' },
          { t: '守护线程', d: '<code>setDaemon(true)</code> 的线程不会阻止 JVM 退出，适合后台监控；finally 不保证执行。' }
        ],
        code: `Thread t = new Thread(() -> {
    System.out.println("worker: " + Thread.currentThread().getName());
});
t.start();          // 真正启动新线程
t.join();           // 主线程等待 t 结束
System.out.println("main done");

// Callable 有返回值、能抛异常
FutureTask<Integer> task = new FutureTask<>(() -> 1 + 2);
new Thread(task).start();
Integer result = task.get();`,
        tip: '永远调用 start() 而不是 run()；run() 只是当前线程里的一次普通方法调用，不会并发。',
        demo: S(`Thread t = new Thread(() -> System.out.println("worker"));
t.start();
t.join();
System.out.println("main done");`, [
          [0, { t: 'NEW' }, '创建 Thread 对象，状态是 NEW，还没有真正启动。'],
          [1, { t: 'RUNNABLE' }, 'start() 把线程交给调度器，状态变成 RUNNABLE；main 线程继续往下走。'],
          [2, { t: 'RUNNABLE', output: 'worker' }, 'worker 线程抢到 CPU，打印 "worker"。', 'worker'],
          [2, { t: 'WAITING' }, 'main 调用 join()，进入等待，直到 t 结束。'],
          [3, { t: 'TERMINATED', output: 'worker' }, 't 执行完毕进入 TERMINATED，main 被唤醒。'],
          [3, { t: 'TERMINATED', output: 'worker' }, 'main 继续执行，打印 "main done"。', 'worker\nmain done']
        ], '线程的状态变化', 'join 让主线程等待，保证输出顺序。'),
        quiz: [
          {
            q: '调用 <code>thread.start()</code> 和直接调用 <code>thread.run()</code> 的区别是？',
            options: ['没有区别', 'start 启动新线程，run 只是在当前线程执行方法', 'run 会启动新线程', 'start 只能调用一次，run 可以多次'],
            answer: 1,
            explain: 'start() 由 JVM 创建新线程并调用 run()；直接调用 run() 就是普通方法调用，不会并发。'
          },
          {
            q: '下面哪个方法会让当前线程等待另一个线程结束？',
            options: ['sleep', 'join', 'yield', 'interrupt'],
            answer: 1,
            explain: 'join() 等待目标线程终止；sleep 是睡一段时间，yield 是让出 CPU，interrupt 是设置中断标志。'
          }
        ]
      },

      {
        id: 'sync-volatile',
        title: 'synchronized、volatile 与原子性',
        minutes: 9,
        level: '进阶',
        intro: '两个线程各加 1000 次，最后却不是 2000——这就是竞态条件。要解决它，先分清原子性、可见性、有序性三件事。',
        points: [
          { t: '竞态条件', d: '<code>count++</code> 不是原子操作，分“读—改—写”三步；两个线程可能读到同一个旧值，导致丢失更新。' },
          { t: 'synchronized', d: '保证同一时刻只有一个线程进入临界区，同时保证可见性和原子性。可修饰方法或代码块，锁对象要全局唯一。' },
          { t: 'volatile', d: '只保证可见性和禁止指令重排，<b>不保证原子性</b>；适合状态标志位，不适合 count++。' },
          { t: '原子类', d: '<code>AtomicInteger.incrementAndGet()</code> 基于 CAS，无锁且高效；高并发计数优先用它。' }
        ],
        code: `class Counter {
    private int count;
    synchronized void increment() { count++; }
    synchronized int get() { return count; }
}

// 或者用原子类
AtomicInteger count = new AtomicInteger();
count.incrementAndGet();

// volatile 只适合这种场景
volatile boolean running = true;
while (running) { ... }`,
        tip: '记住三件套：synchronized 全都要，volatile 只管可见性，Atomic 用 CAS 保证原子性。',
        demo: S(`int count = 0;
// 线程 A 读取 count = 0
// 线程 B 读取 count = 0
count = count + 1;   // A 写回 1
count = count + 1;   // B 写回 1，而不是 2`, [
          [0, { count: '0', A: '未开始', B: '未开始' }, '两个线程准备对同一个 count 做自增。'],
          [1, { count: '0', A: '读到 0', B: '未开始' }, '线程 A 先读取 count，得到 0。'],
          [2, { count: '0', A: '读到 0', B: '读到 0' }, '线程 B 也读取 count，此时 A 还没写回，B 也得到 0。'],
          [3, { count: '1', A: '写回 1', B: '读到 0' }, 'A 计算 0+1=1 并写回。'],
          [4, { count: '1', A: '写回 1', B: '写回 1' }, 'B 计算它手里的 0+1=1 并写回，覆盖了 A 的结果。两次自增只加了 1。'],
          [4, { count: '1', A: '完成', B: '完成' }, '如果给 increment 加 synchronized，两个线程必须排队，结果才是 2。']
        ], '一次丢失更新', '问题不在“加”，而在于“读—改—写”不是一个原子步骤。'),
        quiz: [
          {
            q: 'volatile 能保证下面哪一项？',
            options: ['count++ 的原子性', '变量的可见性和禁止重排', '线程互斥', '死锁自动解除'],
            answer: 1,
            explain: 'volatile 保证一个线程修改后其他线程立刻可见，并禁止相关指令重排；但它不保证复合操作的原子性。'
          },
          {
            q: '两个线程各执行 1000 次 <code>count++</code>，结果小于 2000，最可能的原因是？',
            options: ['CPU 太慢', 'count++ 不是原子操作，发生丢失更新', '线程没有 join', 'int 溢出'],
            answer: 1,
            explain: 'count++ 分读、加、写三步，两个线程可能读到同一个旧值，后写的覆盖先写的。'
          },
          {
            q: '高并发计数场景，下面哪个通常性能最好？',
            options: ['每次加 synchronized', '用 volatile int', '用 AtomicInteger', '用 static int'],
            answer: 2,
            explain: 'AtomicInteger 基于 CAS 无锁更新，通常比 synchronized 轻量；volatile 不保证原子性，static 更不行。'
          }
        ]
      },

      {
        id: 'executors',
        title: '线程池与 ExecutorService',
        minutes: 8,
        level: '进阶',
        intro: '每次 new Thread 都要创建和销毁操作系统线程，成本很高。线程池复用线程、控制并发数、管理任务队列，是并发的标准做法。',
        points: [
          { t: '核心参数', d: '核心线程数、最大线程数、空闲存活时间、任务队列、拒绝策略。<code>ThreadPoolExecutor</code> 的七参数要能背下来。' },
          { t: '执行流程', d: '核心线程未满 → 创建核心线程；核心满了 → 进队列；队列满了 → 扩到最大线程；再满 → 触发拒绝策略。' },
          { t: '提交任务', d: '<code>execute</code> 无返回值；<code>submit</code> 返回 Future；<code>invokeAll</code> 批量提交并等待全部完成。' },
          { t: '关闭', d: '<code>shutdown()</code> 不再接新任务，等已提交任务跑完；<code>shutdownNow()</code> 尝试中断。生产环境不要用 Executors 的快捷工厂，队列可能无界。' }
        ],
        code: `ExecutorService pool = new ThreadPoolExecutor(
        2, 4, 60, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(100),
        r -> new Thread(r, "biz-pool"),
        new ThreadPoolExecutor.CallerRunsPolicy());

Future<Integer> f = pool.submit(() -> 1 + 2);
Integer result = f.get();

pool.shutdown();
pool.awaitTermination(5, TimeUnit.SECONDS);`,
        tip: '自己 new ThreadPoolExecutor，明确队列容量和拒绝策略；Executors.newFixedThreadPool 用的是无界队列，任务堆积会 OOM。',
        demo: S(`ExecutorService pool = Executors.newFixedThreadPool(2);
Future<Integer> f = pool.submit(() -> 1 + 2);
System.out.println(f.get());
pool.shutdown();`, [
          [0, { pool: 'core=2, max=2', queue: 'LinkedBlockingQueue' }, '创建固定 2 线程的池，任务队列默认无界。'],
          [1, { pool: '运行中', task: 'submit' }, '提交一个 Callable，返回 Future；任务进入队列或直接交给空闲线程。'],
          [2, { pool: '运行中', result: '3' }, 'f.get() 阻塞直到任务完成，拿到返回值 3。', '3'],
          [3, { pool: 'SHUTDOWN' }, 'shutdown 不再接收新任务，已提交的任务继续执行完。']
        ], '线程池提交与关闭', 'submit 返回 Future，get 会阻塞；真实项目要设置超时。'),
        quiz: [
          {
            q: '线程池的任务提交顺序，正确的是？',
            options: ['先扩到最大线程，再进队列', '核心线程 → 队列 → 最大线程 → 拒绝策略', '直接进队列，队列满才创建线程', '随机选择'],
            answer: 1,
            explain: '核心线程未满先建核心线程；核心满了进队列；队列满了再扩到最大线程；还满就执行拒绝策略。'
          },
          {
            q: '为什么生产环境不推荐 <code>Executors.newFixedThreadPool()</code>？',
            options: ['线程太少', '任务队列无界，任务堆积可能导致 OOM', '不能提交 Callable', '不支持关闭'],
            answer: 1,
            explain: '它使用无界的 LinkedBlockingQueue，任务持续提交会无限堆积，最终内存溢出；应显式指定有界队列和拒绝策略。'
          }
        ]
      },

      {
        id: 'concurrent-collections',
        title: '并发集合与 CompletableFuture',
        minutes: 8,
        level: '进阶',
        intro: 'HashMap、ArrayList 在多线程下会出问题。JDK 提供了一整套并发容器，还有 CompletableFuture 把异步任务串成流水线。',
        points: [
          { t: 'ConcurrentHashMap', d: 'JDK 8 用 CAS + synchronized 锁单个桶，读操作几乎无锁；并发场景替代 HashMap / Hashtable。' },
          { t: 'CopyOnWriteArrayList', d: '写时复制，读多写少（如监听器列表）很合适；写操作会复制整个数组，写多时性能差。' },
          { t: 'BlockingQueue', d: '生产者-消费者模型的核心：<code>put</code> 满时阻塞，<code>take</code> 空时阻塞。常用 ArrayBlockingQueue、LinkedBlockingQueue。' },
          { t: 'CompletableFuture', d: '支持异步回调与组合：<code>thenApply / thenCompose / thenCombine / exceptionally</code>，避免回调地狱。' }
        ],
        code: `ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.merge("apple", 1, Integer::sum);      // 原子累加

BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(10);
queue.put(1);                              // 满则阻塞
Integer x = queue.take();                  // 空则阻塞

CompletableFuture<String> f = CompletableFuture
        .supplyAsync(() -> "hello")
        .thenApply(String::toUpperCase)
        .exceptionally(e -> "fallback");
System.out.println(f.join());`,
        tip: '并发容器只保证“单个操作”线程安全；多个操作组合仍要自己加锁或用原子方法（如 merge、compute）。',
        demo: S(`ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.merge("apple", 1, Integer::sum);
map.merge("apple", 1, Integer::sum);
System.out.println(map.get("apple"));`, [
          [0, { map: '{}' }, '创建并发 Map，多个线程可以安全地同时读写。'],
          [1, { map: '{apple=1}' }, 'merge：key 不存在，放入 1；整个过程是原子的。'],
          [2, { map: '{apple=2}' }, '再次 merge：key 存在，用 Integer::sum 把旧值和新值相加。'],
          [3, { map: '{apple=2}' }, '读取结果。', '2']
        ], '原子累加 merge', '如果用 get 再 put，两个线程之间仍可能丢更新；merge 把“读改写”合成一个原子操作。'),
        quiz: [
          {
            q: '读多写少、需要线程安全的列表，适合用？',
            options: ['ArrayList', 'CopyOnWriteArrayList', 'LinkedList', 'Vector 一定最好'],
            answer: 1,
            explain: 'CopyOnWriteArrayList 读操作不加锁，适合读多写少；写时复制整个数组，写频繁时开销大。'
          },
          {
            q: 'CompletableFuture 的 <code>thenApply</code> 和 <code>thenCompose</code> 的区别是？',
            options: ['没有区别', 'thenApply 转换值，thenCompose 展平另一个 CompletableFuture', 'thenCompose 只能处理异常', 'thenApply 是阻塞的'],
            answer: 1,
            explain: 'thenApply 接收普通值并返回新值；thenCompose 用于回调本身返回 CompletableFuture 的场景，避免嵌套。'
          }
        ]
      },

      {
        id: 'deadlock-jmm',
        title: '死锁与 JMM 基础',
        minutes: 8,
        level: '进阶',
        intro: '两个线程各持一把锁、又等对方的锁，就会永远卡住。死锁不是玄学，它有四个必要条件，也有明确的预防手段。',
        points: [
          { t: '死锁四条件', d: '互斥、请求并保持、不可剥夺、循环等待。破坏任意一个就能避免死锁，最常用的是“固定加锁顺序”。' },
          { t: '排查', d: '<code>jstack &lt;pid&gt;</code> 会打印 “Found one Java-level deadlock”，直接给出线程和锁的持有/等待关系。' },
          { t: 'JMM', d: 'Java 内存模型规定线程间通过主内存通信；happens-before 规则保证可见性（如锁释放先于获取、volatile 写先于读）。' },
          { t: '有序性', d: '编译器和 CPU 可能重排指令；volatile 和锁会插入内存屏障，禁止特定重排。双重检查单例必须加 volatile。' }
        ],
        code: `// 错误：两个线程加锁顺序相反
Thread t1 = new Thread(() -> {
    synchronized (lockA) {
        synchronized (lockB) { ... }
    }
});
Thread t2 = new Thread(() -> {
    synchronized (lockB) {
        synchronized (lockA) { ... }   // 可能死锁
    }
});

// 正确：所有线程按同一顺序加锁
synchronized (lockA) {
    synchronized (lockB) { ... }
}`,
        tip: '线上卡死先 jstack 看线程栈；加锁顺序统一、锁粒度尽量小、能用无锁结构就别用嵌套锁。',
        demo: D([
          { id: 't1', label: '线程 T1', sub: '持有 A，等待 B', x: 8, y: 10, w: 26, h: 14, tone: 'teal', info: 'T1 已经拿到锁 A，尝试获取锁 B 时阻塞。' },
          { id: 't2', label: '线程 T2', sub: '持有 B，等待 A', x: 66, y: 10, w: 26, h: 14, tone: 'rose', info: 'T2 已经拿到锁 B，尝试获取锁 A 时阻塞。' },
          { id: 'a', label: '锁 A', sub: '被 T1 持有', x: 8, y: 58, w: 26, h: 12, tone: 'amber', info: '锁 A 永远不会释放，因为 T1 在等 B。' },
          { id: 'b', label: '锁 B', sub: '被 T2 持有', x: 66, y: 58, w: 26, h: 12, tone: 'amber', info: '锁 B 永远不会释放，因为 T2 在等 A。' },
          { id: 'dead', label: '死锁', sub: '循环等待，永不结束', x: 38, y: 38, w: 24, h: 14, tone: 'violet', info: '两个线程互相等待，JVM 不会自动解除；只能重启或提前预防。' }
        ], [
          { from: 't1', to: 'a', label: '持有' },
          { from: 't1', to: 'b', label: '等待', dashed: true },
          { from: 't2', to: 'b', label: '持有' },
          { from: 't2', to: 'a', label: '等待', dashed: true },
          { from: 'a', to: 'dead', label: '阻塞' },
          { from: 'b', to: 'dead', label: '阻塞' }
        ], '点击节点看死锁是怎么形成的。破环方法之一：让所有线程按 A→B 的固定顺序加锁。', '死锁的循环等待'),
        quiz: [
          {
            q: '避免死锁最常用的手段是？',
            options: ['增加线程数', '所有线程按固定顺序加锁', '把锁去掉', '使用更多嵌套锁'],
            answer: 1,
            explain: '固定全局加锁顺序可以破坏“循环等待”条件，是最简单有效的预防方式。'
          },
          {
            q: 'volatile 关键字能保证？',
            options: ['复合操作原子性', '可见性并禁止指令重排', '线程互斥', '锁自动释放'],
            answer: 1,
            explain: 'volatile 通过内存屏障保证写后立即对其他线程可见，并禁止特定重排；它不能替代锁保证原子性。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 9 · JVM
     ================================================================ */
  C.push({
    id: 'm9',
    no: '09',
    title: 'JVM',
    desc: '内存、垃圾回收与类加载',
    lessons: [

      {
        id: 'jvm-memory',
        title: '运行时内存区域',
        minutes: 8,
        level: '进阶',
        intro: '为什么会有 OutOfMemoryError 和 StackOverflowError？因为它们发生在不同的内存区域。先弄清 JVM 把内存分成了哪几块。',
        points: [
          { t: '线程私有', d: '程序计数器、虚拟机栈、本地方法栈。每个线程一份，随线程创建和销毁。' },
          { t: '线程共享', d: '堆（对象实例）和方法区 / 元空间（类元数据、常量、静态变量）。堆是 GC 的主战场。' },
          { t: '栈帧', d: '每次方法调用创建一个栈帧，存放局部变量表、操作数栈、返回地址。递归太深会 StackOverflowError。' },
          { t: '常见错误', d: '堆溢出 <code>OutOfMemoryError: Java heap space</code>；元空间溢出 <code>Metaspace</code>；栈溢出 <code>StackOverflowError</code>。' }
        ],
        code: `// 堆溢出：对象一直存活，GC 回收不掉
List<byte[]> list = new ArrayList<>();
while (true) {
    list.add(new byte[1024 * 1024]);   // 每秒 1MB
}

// 栈溢出：递归没有终止条件
static void recurse() {
    recurse();
}`,
        tip: '调优先分清区域：<code>-Xmx</code> 管堆，<code>-Xss</code> 管栈，<code>-XX:MaxMetaspaceSize</code> 管元空间。',
        demo: D([
          { id: 'pc', label: '程序计数器', sub: '当前字节码行号', x: 5, y: 8, w: 26, h: 13, tone: 'blue', info: '线程私有，记录当前线程执行到哪条字节码；唯一不会 OOM 的区域。' },
          { id: 'stack', label: '虚拟机栈', sub: '栈帧 · 局部变量', x: 5, y: 32, w: 26, h: 15, tone: 'teal', info: '每个方法调用压入一个栈帧；递归过深会 StackOverflowError。线程私有。' },
          { id: 'native', label: '本地方法栈', sub: 'native 方法', x: 5, y: 58, w: 26, h: 13, tone: 'teal', info: '为 native 方法服务，HotSpot 中与虚拟机栈合二为一。' },
          { id: 'heap', label: '堆', sub: '对象实例 · GC 主战场', x: 38, y: 8, w: 30, h: 20, tone: 'amber', info: '所有 new 出来的对象都在这里；分新生代和老年代，是内存调优的重点。' },
          { id: 'meta', label: '方法区 / 元空间', sub: '类元数据 · 常量', x: 72, y: 8, w: 24, h: 20, tone: 'violet', info: 'JDK 8 起用本地内存的 Metaspace 实现；类太多、动态代理太多可能撑爆。' },
          { id: 'direct', label: '直接内存', sub: 'NIO ByteBuffer', x: 72, y: 44, w: 24, h: 16, tone: 'rose', info: 'NIO 的 DirectByteBuffer 分配在堆外，不受 -Xmx 限制，但受物理内存限制。' }
        ], [
          { from: 'heap', to: 'meta', label: '引用类元数据', dashed: true },
          { from: 'heap', to: 'direct', label: 'DirectBuffer', dashed: true }
        ], '左边三块线程私有，右边三块线程共享或堆外。点击节点看典型异常。', 'JVM 内存地图'),
        quiz: [
          {
            q: '下面哪个区域是线程私有的？',
            options: ['堆', '方法区', '虚拟机栈', '元空间'],
            answer: 2,
            explain: '每个线程都有自己的程序计数器、虚拟机栈和本地方法栈；堆和方法区由所有线程共享。'
          },
          {
            q: '无限递归最终会导致？',
            options: ['OutOfMemoryError: Java heap space', 'StackOverflowError', '死锁', 'GC overhead limit exceeded'],
            answer: 1,
            explain: '每次递归都会压入栈帧，栈深度超过 -Xss 限制时抛 StackOverflowError。'
          }
        ]
      },

      {
        id: 'gc',
        title: '垃圾回收与常见收集器',
        minutes: 8,
        level: '进阶',
        intro: 'Java 不用手动 free，但“自动”不等于“免费”。理解分代、可达性分析和常见收集器，才能看懂 GC 日志、定位内存问题。',
        points: [
          { t: '怎么判断垃圾', d: '可达性分析：从 GC Roots（栈引用、静态变量、JNI 引用等）出发，走不到的对象就是垃圾。引用计数无法处理循环引用。' },
          { t: '分代假说', d: '绝大多数对象朝生夕死。堆分新生代（Eden + 两个 Survivor）和老年代；新对象在 Eden，Minor GC 后存活对象在 Survivor 间复制，年龄够了晋升老年代。' },
          { t: '收集器', d: 'Serial（单线程）、Parallel（吞吐优先）、CMS（低停顿，已废弃）、G1（JDK 9+ 默认，可预测停顿）、ZGC / Shenandoah（超低停顿）。' },
          { t: '调优目标', d: '不是“GC 越少越好”，而是在吞吐量和停顿时间之间取舍；先看 GC 日志和监控，再调参数。' }
        ],
        code: `// 查看当前使用的收集器
java -XX:+PrintCommandLineFlags -version

// 常用参数
-Xms2g -Xmx2g                 // 堆初始/最大值，建议相等
-XX:+UseG1GC                  // 指定 G1
-XX:MaxGCPauseMillis=200      // G1 目标停顿
-Xlog:gc*:file=gc.log:time    // JDK 9+ 统一日志`,
        tip: '先测量再调优：没有 GC 日志和监控数据的“经验参数”，基本都是猜。',
        demo: D([
          { id: 'eden', label: 'Eden', sub: '新对象出生地', x: 6, y: 12, w: 24, h: 16, tone: 'teal', info: '绝大多数对象在这里分配；Eden 满了触发 Minor GC。' },
          { id: 's0', label: 'Survivor 0', sub: '存活对象', x: 36, y: 12, w: 18, h: 16, tone: 'blue', info: 'Minor GC 后存活对象复制到 Survivor，年龄 +1。' },
          { id: 's1', label: 'Survivor 1', sub: '交替使用', x: 58, y: 12, w: 18, h: 16, tone: 'blue', info: '两个 Survivor 交替作为复制目标，总有一个是空的。' },
          { id: 'old', label: '老年代', sub: '长期存活对象', x: 80, y: 12, w: 16, h: 16, tone: 'amber', info: '年龄达到阈值（默认 15）或大对象直接进入老年代；满了触发 Full GC。' },
          { id: 'meta', label: '元空间', sub: '类元数据', x: 58, y: 58, w: 18, h: 14, tone: 'violet', info: '类卸载时回收；不再属于堆，默认使用本地内存。' }
        ], [
          { from: 'eden', to: 's0', label: 'Minor GC 复制' },
          { from: 's0', to: 's1', label: '交换', dashed: true },
          { from: 's1', to: 'old', label: '晋升' }
        ], '点击每个区域看回收过程。注意：G1 之后物理分代仍在，但逻辑上按 Region 管理。', '分代回收'),
        quiz: [
          {
            q: 'JVM 判断对象是否可回收，主要依据是？',
            options: ['引用计数为 0', '从 GC Roots 出发是否可达', '对象大小', '是否重写 finalize'],
            answer: 1,
            explain: '主流 JVM 用可达性分析：从 GC Roots 搜索，不可达的对象才可回收；引用计数无法处理循环引用。'
          },
          {
            q: 'JDK 9 之后，HotSpot 的默认垃圾收集器是？',
            options: ['Serial', 'Parallel', 'CMS', 'G1'],
            answer: 3,
            explain: 'JDK 9 起 G1 成为默认收集器，兼顾吞吐和可预测停顿；CMS 在 JDK 14 被移除。'
          }
        ]
      },

      {
        id: 'classloading',
        title: '类加载与双亲委派',
        minutes: 7,
        level: '进阶',
        intro: '一个 .class 文件不会凭空变成可用的类。加载、验证、准备、解析、初始化，每一步都有讲究；双亲委派则保证了核心类不被篡改。',
        points: [
          { t: '五个阶段', d: '加载（读字节码）→ 验证（格式/语义）→ 准备（静态变量赋默认值）→ 解析（符号引用转直接引用）→ 初始化（执行 static 块和赋值）。' },
          { t: '类加载器', d: 'Bootstrap（核心库）、Extension / Platform、Application（classpath）、自定义。每个类由“加载它的类加载器 + 全限定名”共同确定唯一性。' },
          { t: '双亲委派', d: '收到加载请求先交给父加载器，父加载不了才自己加载。好处是核心类安全、避免重复加载。' },
          { t: '打破双亲委派', d: 'SPI（JDBC Driver）、Tomcat 的 WebApp 隔离、热部署都会自定义加载顺序；理解原理才能看懂这些框架。' }
        ],
        code: `// 类的初始化时机：首次主动使用
new User();              // 1. new 实例
User.staticMethod();     // 2. 调用静态方法
Class.forName("User");   // 3. 反射加载

// 只声明数组不会初始化
User[] arr = new User[10];  // 不会触发 User 的 static 块

// 查看类加载器
System.out.println(String.class.getClassLoader());  // null（Bootstrap）
System.out.println(User.class.getClassLoader());    // AppClassLoader`,
        tip: '准备阶段只给静态变量赋“零值”，真正的赋值在初始化阶段执行 <clinit>（static 块 + 静态赋值）。',
        demo: D([
          { id: 'load', label: '加载', sub: '读取字节码', x: 4, y: 8, w: 16, h: 12, tone: 'teal', info: '通过类的全限定名找到 .class，读入内存并生成 Class 对象。' },
          { id: 'verify', label: '验证', sub: '格式 / 语义', x: 22, y: 8, w: 16, h: 12, tone: 'teal', info: '确保字节码合法、不会破坏 JVM 安全。' },
          { id: 'prep', label: '准备', sub: '静态变量零值', x: 40, y: 8, w: 16, h: 12, tone: 'teal', info: '为 static 变量分配内存并赋默认值（0 / null），不是代码里的初始值。' },
          { id: 'resolve', label: '解析', sub: '符号 → 直接引用', x: 58, y: 8, w: 18, h: 12, tone: 'teal', info: '把常量池里的符号引用替换成内存地址。' },
          { id: 'init', label: '初始化', sub: '执行 <clinit>', x: 78, y: 8, w: 18, h: 12, tone: 'amber', info: '执行 static 块和静态变量赋值，这才是代码里写的初始值。' },
          { id: 'boot', label: 'Bootstrap', sub: 'jre/lib', x: 8, y: 58, w: 20, h: 12, tone: 'violet', info: '加载 Java 核心类（java.lang.*），由 C++ 实现，getClassLoader 返回 null。' },
          { id: 'plat', label: 'Platform', sub: '扩展类', x: 32, y: 58, w: 20, h: 12, tone: 'violet', info: '加载 JDK 扩展模块，父加载器是 Bootstrap。' },
          { id: 'app', label: 'Application', sub: 'classpath', x: 56, y: 58, w: 20, h: 12, tone: 'violet', info: '加载我们自己写的类和第三方 jar，父加载器是 Platform。' }
        ], [
          { from: 'load', to: 'verify' },
          { from: 'verify', to: 'prep' },
          { from: 'prep', to: 'resolve' },
          { from: 'resolve', to: 'init' },
          { from: 'app', to: 'plat', label: '委派' },
          { from: 'plat', to: 'boot', label: '委派' }
        ], '上排是类的一生，下排是加载器的委派链。点击节点看细节。', '类加载与双亲委派'),
        quiz: [
          {
            q: '准备阶段会给静态变量做什么？',
            options: ['赋代码里写的初始值', '赋类型默认值（0 / null）', '执行 static 代码块', '什么都不做'],
            answer: 1,
            explain: '准备阶段只分配内存并赋零值；真正的初始值在初始化阶段由 &lt;clinit> 执行 static 块和赋值语句时设置。'
          },
          {
            q: '双亲委派模型的主要好处是？',
            options: ['加快所有类的加载速度', '保证核心类不被自定义类覆盖，并避免重复加载', '让每个类都有多个实例', '支持热部署'],
            answer: 1,
            explain: '请求先交给父加载器，核心类始终由 Bootstrap 加载，防止被篡改；同时同一个类不会被重复加载。'
          }
        ]
      },

      {
        id: 'bytecode-tuning',
        title: '字节码与性能调优入门',
        minutes: 7,
        level: '高级',
        intro: 'JVM 先解释执行字节码，再把热点代码 JIT 编译成本地机器码。理解这条链路，才能判断性能问题出在代码、GC 还是锁。',
        points: [
          { t: '字节码', d: 'javap -c 可以反汇编。方法体由 load/store、算术、invoke、return 等指令组成；局部变量表和操作数栈是栈帧的核心。' },
          { t: '解释与 JIT', d: '解释器启动快；热点方法由 C1/C2 编译优化（内联、逃逸分析、锁消除），以空间换时间。' },
          { t: '调优顺序', d: '先压测定位瓶颈（CPU / 内存 / IO / 锁），再看 GC 日志和线程栈，最后才调 JVM 参数。' },
          { t: '常用工具', d: 'jps、jstack、jmap、jstat、jcmd、VisualVM、Arthas；线上优先用低开销的 jcmd / jstack。' }
        ],
        code: `// 反汇编
javap -c -p User.class

// 常用排查命令
jps -l                       // 找到 Java 进程
jstack <pid>                 // 线程栈，查死锁/卡顿
jstat -gcutil <pid> 1000     // 每秒打印 GC 统计
jcmd <pid> GC.heap_info      // 堆使用情况
jmap -histo <pid> | head     // 对象数量排行`,
        tip: '性能问题 90% 出在代码和架构，不是 JVM 参数；先用数据说话，再决定要不要调参。',
        demo: D([
          { id: 'src', label: '.java 源码', sub: '人类可读', x: 5, y: 12, w: 18, h: 12, tone: 'amber', info: '源码首先由 javac 编译成平台无关的字节码。' },
          { id: 'class', label: '.class 字节码', sub: 'JVM 指令', x: 28, y: 12, w: 18, h: 12, tone: 'teal', info: '包含常量池、方法表和字节码指令；javap 可以反汇编查看。' },
          { id: 'interp', label: '解释器', sub: '逐条执行', x: 52, y: 12, w: 16, h: 12, tone: 'blue', info: '启动快，但每条指令都要翻译；适合只执行一次的冷代码。' },
          { id: 'jit', label: 'JIT 编译器', sub: 'C1 / C2', x: 72, y: 12, w: 18, h: 12, tone: 'violet', info: '统计热点方法，编译成本地机器码并做内联、逃逸分析等优化。' },
          { id: 'cpu', label: 'CPU 执行', sub: '机器码', x: 52, y: 56, w: 16, h: 12, tone: 'rose', info: '最终执行的是机器码；解释器和 JIT 输出都汇到这里。' },
          { id: 'tools', label: '诊断工具', sub: 'jstack / jstat / Arthas', x: 74, y: 56, w: 20, h: 12, tone: 'blue', info: '定位问题：线程栈看阻塞，GC 日志看停顿，堆直方图看对象。' }
        ], [
          { from: 'src', to: 'class', label: 'javac' },
          { from: 'class', to: 'interp', label: '加载' },
          { from: 'class', to: 'jit', label: '热点' },
          { from: 'interp', to: 'cpu' },
          { from: 'jit', to: 'cpu' },
          { from: 'tools', to: 'cpu', label: '观测', dashed: true }
        ], '点击节点看每一步做什么。调优的本质是：找到瓶颈，而不是背参数。', '从源码到机器码'),
        quiz: [
          {
            q: 'JIT 编译器主要优化什么？',
            options: ['所有方法每次调用都重新编译', '热点代码，编译成本地机器码并做内联等优化', '只优化 static 方法', '只优化 GC'],
            answer: 1,
            explain: 'JIT 根据运行时的调用计数识别热点方法，交给 C1/C2 编译优化；冷代码继续由解释器执行。'
          },
          {
            q: '线上 CPU 飙高，第一步最应该做什么？',
            options: ['立刻调大 -Xmx', '用 jstack / top -Hp 定位哪个线程在忙什么', '重启应用', '换一台机器'],
            answer: 1,
            explain: '先定位问题：找到高 CPU 线程的 nid，再在 jstack 里查对应栈，判断是死循环、GC 还是锁竞争。'
          }
        ]
      }
    ]
  });
})();
