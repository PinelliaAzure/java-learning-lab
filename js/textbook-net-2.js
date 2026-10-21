/* 教材正文：NIO 与 Selector / 编码、哈希与密码存储 */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['nio-selector'] = {
    meta: '本章约 5500 字 · 建议 30 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '1.1 为什么学 NIO' },
      { p: '前面讲 Socket 时，服务端的写法是：一个线程守着一个连接，<code>read</code> 不到数据就卡在那里。连接少的时候没问题，连接一多，线程数跟着涨，内存和上下文切换的开销就会压垮机器。NIO 就是为解决这个问题而生的：用少量线程管理大量连接。' },
      { p: 'NIO 有三个核心角色：<b>Buffer</b> 负责装数据，<b>Channel</b> 负责搬运数据，<b>Selector</b> 负责告诉你哪个 Channel 准备好了。三者配合，形成一个事件循环。学完这一章，你再看 Netty、Redis 客户端、Tomcat 的 NIO 连接器，就不会觉得那是一团魔法。' },

      { h: '1.2 阻塞 IO 的瓶颈与 NIO 的取舍' },
      { p: '阻塞 IO 的模型是“一问一答”：线程调用 <code>read</code>，内核把线程挂起，直到有数据或连接关闭。等待期间线程什么也做不了，却占着栈内存和调度名额。' },
      { p: '为了不浪费，通常会配一个线程池。但线程池只是把“无限等待”变成“有限等待”：一千个空闲连接仍要占一千个线程，而机器创建几千个线程后，调度开销已经不可忽视。' },
      { p: 'NIO 换了个思路：把“等数据”交给操作系统。Channel 设为非阻塞后，read 没数据立刻返回 0；Selector 告诉你哪些 Channel 就绪。于是一个线程能轮询几千个连接，只处理有数据的。' },
      { note: '<b>别混淆：</b>非阻塞不等于异步。NIO 仍然是同步非阻塞——就绪通知由 Selector 给出，但读写动作还是要你自己调用。' },
      { p: '很多人以为 NIO 一定更快，这是误解。NIO 的优势在连接多、每连接数据少的场景；大文件顺序读写用普通 IO 配缓冲流更简单。' },
      { list: [
        '连接数在几十到几百：阻塞 IO 加线程池，代码简单，出问题好排查。',
        '连接数上万、长连接、消息小：NIO 或 Netty，线程数才可控。',
        '文件复制：<code>FileChannel.transferTo</code> 通常最快，能走零拷贝。',
        '需要 TLS、HTTP 解析、心跳、重连：直接用 Netty，不要自己造。',
        '只是偶尔发一个请求：<code>HttpClient</code> 的同步 API 更省心。'
      ] },

      { h: '1.3 Buffer 的三个指针' },
      { p: 'Buffer 本质上是一块内存加上三个整数。<code>capacity</code> 是容量，创建后不再变化；<code>position</code> 是下一次读写的下标；<code>limit</code> 是边界，超过它就不能再碰。三者满足 <code>0 &lt;= position &lt;= limit &lt;= capacity</code>。' },
      { p: '写模式下 position 从 0 往后走，limit 等于 capacity；读模式下 limit 设成刚写到的位置，position 归零，remaining() 正好是有效长度。模式切换只是改这两个整数。' },
      { table: { head: ['字段', '含义', '写模式', '读模式'], rows: [
        ['<code>capacity</code>', '缓冲区总容量', '不变', '不变'],
        ['<code>position</code>', '下一次读写的下标', '从 0 向后增长', '从 0 向后增长'],
        ['<code>limit</code>', '可读写的上界', '等于 capacity', '等于写入的字节数']
      ] } },
      { lang: 'java', code: 'import java.nio.ByteBuffer;\nimport java.nio.charset.StandardCharsets;\n\npublic class BufferDemo {\n    public static void main(String[] args) {\n        ByteBuffer buf = ByteBuffer.allocate(16);\n        buf.put("hello".getBytes(StandardCharsets.UTF_8));\n        System.out.println(buf.position() + " " + buf.limit() + " " + buf.remaining());\n\n        buf.flip();\n        System.out.println(buf.position() + " " + buf.limit() + " " + buf.remaining());\n\n        byte[] data = new byte[buf.remaining()];\n        buf.get(data);\n        System.out.println(new String(data, StandardCharsets.UTF_8));\n        System.out.println(buf.remaining());\n\n        buf.clear();\n        System.out.println(buf.position() + " " + buf.limit());\n    }\n}', title: 'BufferDemo.java' },
      { out: '5 16 11\n0 5 5\nhello\n0\n0 16' },
      { p: '写完 5 个字节后，position 是 5、limit 是 16，remaining 为 11；flip 把 limit 改成 5、position 归零，remaining 变成 5，刚好是要读的长度。clear 后打印 0 和 16，但 hello 还在数组里，只是指针被重置。' },

      { h: '1.4 flip、clear 与 compact' },
      { p: '三个方法都只改指针，不复制数据（compact 例外，会搬动未读字节）。flip 切读；clear 切回写并丢弃全部；compact 切回写但保留未读字节，挪到数组开头。' },
      { flow: ['分配 Buffer', '写入，position 前移', 'flip 切读', '读出数据', 'clear 或 compact 切回写'] },
      { note: '<b>最高频的 bug：</b>从 Channel 读满一个 Buffer 后忘了 flip，直接 get，此时 position 已经等于 limit，一个字节也取不到，于是误判“对端没发数据”。' },

      { h: '1.5 Buffer 的分配、视图与字节序' },
      { p: 'Buffer 有两个出生地：堆内和堆外。<code>ByteBuffer.allocate(1024)</code> 在 Java 堆里分配数组，创建快、回收也快，受 GC 管理；<code>allocateDirect(1024)</code> 向操作系统申请直接内存，读写时少一次堆到内核的拷贝，但分配和释放都慢，也没有及时回收的保证。网络缓冲适合用直接内存并长期复用，临时拼装的小数据用堆内更划算。判断标准不是哪个更快，而是这块缓冲要活多久、会被复制几次。' },
      { p: '视图方法不复制内容，只新建一个指向同一块内存的 Buffer。<code>duplicate()</code> 复制三个指针但共享数据，适合让两个消费者各读一遍；<code>slice()</code> 从当前 position 到 limit 切出一段，新 Buffer 的 position 从 0 开始，常用来从一个大包里切出多个字段；<code>asReadOnlyBuffer()</code> 返回只读视图，任何写入都抛异常。要记住：指针独立，内容共享，改一个，另一个立刻看见。' },
      { p: '默认字节序是大端，即高位字节在前。<code>order(ByteOrder.LITTLE_ENDIAN)</code> 能切换顺序，之后 getInt、getShort 都按新规则解释。跨语言通信常在这里翻车：Java 默认大端，而 x86 上不少程序按小端写文件，读出来就是离谱的数字。协议文档必须写明字节序，不要依赖默认值。另外 <code>getInt()</code> 会前进四个字节，<code>getInt(index)</code> 带下标则不移动 position，适合反复读同一字段。' },
      { p: 'mark 与 reset 是一对书签：mark 记下当前 position，reset 把它拨回去。前面的帧解析就靠这对方法，先 mark，试读长度，发现不够就 reset 重来。rewind 则把 position 归零、limit 不变，用于把同一段数据再读一遍。它们都不改 limit，理解这点，调试时才不会被“没读几个字节，remaining 却变了”绕晕。' },
      { p: '缓冲池化也是同一思路：直接内存的分配很贵，Netty 用池化的 ByteBuf 反复复用；自己写时可以用 ThreadLocal 缓存每条连接的读缓冲，但连接关闭时一定要释放，别让一块大缓冲被长期持有，否则省下的分配时间会变成堆外内存的缓慢泄漏。' },
      { p: 'capacity 一旦分配就不再改变，写满时不会自动扩容，再 put 会抛 BufferOverflowException。要更大空间只能新建一个再复制，所以要么按典型消息大小预估容量，要么在超长时走扩容分支；别每来一包就 allocateDirect，分配开销会吃掉 NIO 省下的线程成本。' },

      { h: '1.6 Channel 家族' },
      { p: 'Channel 和流最大的区别是<b>双向</b>：同一个 <code>SocketChannel</code> 既能 read 也能 write，而 InputStream 和 OutputStream 是两条单向的流。Channel 要么打开、要么关闭。' },
      { p: '常用的四种：FileChannel 读写文件；SocketChannel 是一条 TCP 连接；ServerSocketChannel 监听端口、接受连接；DatagramChannel 收发 UDP。' },
      { table: { head: ['通道', '用途', '能否非阻塞并注册 Selector'], rows: [
        ['<code>FileChannel</code>', '文件读写、文件复制', '不能，天生阻塞'],
        ['<code>SocketChannel</code>', '一条 TCP 连接', '能'],
        ['<code>ServerSocketChannel</code>', '监听端口、接受连接', '能'],
        ['<code>DatagramChannel</code>', 'UDP 收发', '能']
      ] } },
      { p: '<code>FileChannel</code> 没有 <code>configureBlocking</code>，也没有 register，因为它不是 SelectableChannel；但 <code>transferTo</code> 能让内核直接把数据从一个通道送到另一个，省掉用户态拷贝。' },
      { p: '所有 Channel 都实现了 AutoCloseable，务必用 try-with-resources 关闭，否则文件句柄和端口会泄漏。' },

      { h: '1.7 零拷贝与文件通道' },
      { p: '普通文件复制要经过四次拷贝：磁盘到内核页缓存、页缓存到用户缓冲、用户缓冲到内核套接字缓冲、再到网卡。<code>FileChannel.transferTo(position, count, target)</code> 让内核把页缓存直接送到目标通道，用户态只发一条指令，这就是常说的零拷贝。它最适合“把文件原样发给网络”的场景，比如静态资源服务器、日志投递。' },
      { p: '但 transferTo 不是万能的。一次调用未必搬完全部字节，返回值是实际传输量，必须循环到传完或返回 0；源必须是 FileChannel，目标得是可写通道；一旦套上 TLS，数据要先在用户态加密，零拷贝就断了。所以“用了 transferTo 一定快”是错觉，得看链路是否允许内核直通。' },
      { p: '<code>FileChannel.map</code> 把文件的一段映射进内存，得到 MappedByteBuffer，读写它就像读写数组，换页交给操作系统，适合对大文件做随机访问，比如索引和嵌入式数据库。代价是映射占虚拟内存和页缓存，文件很大时会给系统压力；取消映射没有公开 API，只能等 GC；映射期间文件被外部截断，访问越界部分可能让 JVM 崩溃。生产里用它要限制大小和生命周期。' },
      { p: '方向别弄反：transferTo 把 FileChannel 推给目标通道，transferFrom 从源通道拉进 FileChannel。两者都只是“可能”零拷贝，具体取决于平台与通道类型。写代码时按“可能不零拷贝”保证正确性，按“通常零拷贝”拿性能，别把正确性押在实现细节上。' },

      { h: '1.8 非阻塞与返回值 0' },
      { p: '调用 <code>configureBlocking(false)</code> 之后，read 的语义变了：有数据返回字节数；暂时没数据返回 <b>0</b>；对端关闭返回 <b>-1</b>。0 和 -1 必须分清，把 0 当成断开是常见事故。' },
      { p: 'write 也一样：发送缓冲区满时可能只写一部分甚至返回 0。正确做法是循环写，直到 <code>hasRemaining()</code> 为 false；返回 0 就注册 <code>OP_WRITE</code>，等下次可写。' },
      { lang: 'java', code: 'import java.nio.ByteBuffer;\nimport java.nio.channels.Pipe;\n\npublic class PipeDemo {\n    public static void main(String[] args) throws Exception {\n        Pipe pipe = Pipe.open();\n        Pipe.SourceChannel source = pipe.source();\n        Pipe.SinkChannel sink = pipe.sink();\n        source.configureBlocking(false);\n\n        ByteBuffer buf = ByteBuffer.allocate(8);\n        System.out.println(source.read(buf));\n\n        sink.write(ByteBuffer.wrap("hi".getBytes()));\n        Thread.sleep(50);\n        System.out.println(source.read(buf));\n    }\n}', title: 'PipeDemo.java' },
      { out: '0\n2' },
      { p: '用 Pipe 而不是网络，是为了在本机一次运行就看到“没数据返回 0”。Pipe 是 NIO 的进程内单向通道，source 读、sink 写。' },
      { note: '<b>判断连接是否断开，看 -1，不看 0。</b>返回 0 只说明“现在没有”，下一秒可能就有了。' },

      { h: '1.9 Selector 与事件循环' },
      { p: 'Selector 是 NIO 的心脏。把多个 SelectableChannel 注册上去，告诉它你关心哪些事件：<code>OP_ACCEPT</code> 有新连接、<code>OP_READ</code> 可读、<code>OP_WRITE</code> 可写、<code>OP_CONNECT</code> 连接完成。' },
      { p: '调用 <code>select()</code> 时线程阻塞，直到至少一个通道就绪；返回之后遍历 <code>selectedKeys()</code>，按事件类型分别处理。处理完必须把 key 从集合里移除，否则下一轮还会拿到它。' },
      { flow: ['打开 Selector', 'Channel 设为非阻塞', 'register 注册事件', 'select 等待就绪', '遍历 selectedKeys', '处理并移除 key', '回到 select'] },
      { lang: 'java', code: 'import java.net.InetSocketAddress;\nimport java.nio.ByteBuffer;\nimport java.nio.channels.*;\nimport java.nio.charset.StandardCharsets;\nimport java.util.Iterator;\n\npublic class SelectorEcho {\n    public static void main(String[] args) throws Exception {\n        Selector selector = Selector.open();\n        ServerSocketChannel server = ServerSocketChannel.open();\n        server.bind(new InetSocketAddress(9000));\n        server.configureBlocking(false);\n        server.register(selector, SelectionKey.OP_ACCEPT);\n\n        new Thread(() -> {\n            try (SocketChannel c = SocketChannel.open(new InetSocketAddress("127.0.0.1", 9000))) {\n                c.write(ByteBuffer.wrap("hello".getBytes()));\n                ByteBuffer b = ByteBuffer.allocate(16);\n                c.read(b);\n                b.flip();\n                System.out.println("[client] " + StandardCharsets.UTF_8.decode(b));\n            } catch (Exception e) {\n                e.printStackTrace();\n            }\n        }).start();\n\n        while (true) {\n            selector.select();\n            Iterator<SelectionKey> it = selector.selectedKeys().iterator();\n            while (it.hasNext()) {\n                SelectionKey key = it.next();\n                it.remove();\n                if (key.isAcceptable()) {\n                    SocketChannel ch = server.accept();\n                    ch.configureBlocking(false);\n                    ch.register(selector, SelectionKey.OP_READ);\n                    System.out.println("[server] ACCEPT");\n                } else if (key.isReadable()) {\n                    SocketChannel ch = (SocketChannel) key.channel();\n                    ByteBuffer buf = ByteBuffer.allocate(16);\n                    int n = ch.read(buf);\n                    if (n == -1) {\n                        ch.close();\n                        continue;\n                    }\n                    buf.flip();\n                    System.out.println("[server] READ " + StandardCharsets.UTF_8.decode(buf));\n                    ch.write(ByteBuffer.wrap("hello".getBytes()));\n                }\n            }\n        }\n    }\n}', title: 'SelectorEcho.java' },
      { out: '[server] ACCEPT\n[server] READ hello\n[client] hello' },
      { note: '<b>端口与环境：</b>9000 是写死的，机器上已有进程占用它（或上一次运行的这个程序还没退出）时，<code>server.bind</code> 会抛 <code>java.net.BindException: Address already in use</code>；换端口要同时改服务端的 <code>server.bind(new InetSocketAddress(n))</code> 和客户端的 <code>new InetSocketAddress("127.0.0.1", n)</code>，漏改一处就会连不上。另外 <code>while (true)</code> 没有退出条件，三行输出之后程序仍然阻塞在 <code>select()</code> 上，这是正常的服务端形态，用 Ctrl-C 结束，别当成卡死。这三行的先后（ACCEPT → READ → 客户端回显）在只有一条连接时是稳定的；一旦有多条连接或多轮事件同时就绪，遍历 selectedKeys 的顺序就取决于就绪时机，不要依赖。' },
      { p: '整个服务器只有一个主线程，却同时完成 accept、read、write。连接数增加时线程数不变，这就是多路复用。' },
      { p: '事件循环里还有一条铁律：不能做耗时操作。一次数据库查询、一次远程调用就能卡住所有连接，超时还会连锁反应。Selector 线程只负责解包和投递，业务丢给独立线程池，结果写回时通过队列交还，必要时 wakeup。这条规则和“别在 UI 线程做耗时任务”是同一个道理。' },

      { h: '1.10 select 家族、wakeup 与 key 生命周期' },
      { p: 'select 有三个版本：<code>select()</code> 无限等，<code>select(timeout)</code> 最多等指定毫秒，<code>selectNow()</code> 立刻返回。带超时的版本适合要定期清理的服务，比如每三十秒扫一遍空闲连接：超时设成三万毫秒，返回 0 就说明这轮没人说话，顺手检查上次活跃时间。返回值是就绪通道数，可能是 0，判断有没有事件仍要以 selectedKeys 为准。' },
      { p: '阻塞期间想让 select 提前醒来，调用 <code>selector.wakeup()</code>。它让当前或下一次 select 立刻返回，即使没有通道就绪。优雅停机就靠它：主线程在 select 里等，停机线程设置停止标志后 wakeup，主线程醒来看到标志就跳出循环，逐个关闭通道。没有 wakeup，停机只能干等下一次事件。' },
      { p: '注册新通道也有坑。Selector 正阻塞时 register 会等到这一轮结束才生效，看起来像“注册了却收不到事件”。稳妥做法是先 wakeup，或者把注册动作投递给 Selector 线程自己执行，用一个队列加 wakeup 串起来，Netty 内部就是这么处理的。' },
      { p: 'SelectionKey 有 valid、cancelled 等状态，通道关闭、Selector 关闭、调用 cancel 都会让它失效。失效的 key 不会立刻消失，要等下一轮 select 才清理，所以访问前最好判断 <code>key.isValid()</code>，否则可能抛 CancelledKeyException。<code>selectedKeys()</code> 返回的是内部集合而非副本，遍历时用 Iterator，处理一个 remove 一个。' },
      { p: 'key 还能挂附件：<code>key.attach(ctx)</code> 把连接上下文（读缓冲、写队列、最后活跃时间）绑在 key 上，处理事件时用 <code>key.attachment()</code> 取回，比用 Map 从通道反查更直接。连接关闭时记得清理附件，否则上下文对象会跟着 key 一起滞留，形成隐性内存泄漏。' },
      { p: '就绪集合是一次性的：这一轮取走的事件不会留到下一轮，漏取或提前 clear 就等于丢事件；反过来，同一通道一轮里也只会出现一个 key。处理时要把数据读干净，读到返回 0，别假设“一次事件对应一次 read”。' },
      { p: 'select 返回的时机还受操作系统影响：水平触发会把仍在就绪的通道反复报告，边缘触发只报一次。Java 在各平台上的语义并不完全一致，代码不能依赖“只通知一次”。每次事件都按“可能还有数据”处理，一直读到返回 0 为止，才不会漏包。' },

      { h: '1.11 空轮询、事件掩码与主从 Reactor' },
      { p: '注册时还要注意别传 0。interestOps 为 0 的通道不会收到任何事件，看起来像“注册成功但永远没反应”，实际是你没告诉 Selector 关心什么。注册后可以用 <code>key.interestOps(OP_READ)</code> 动态开启，但初始值建议直接给上要监听的事件。' },
      { p: '空轮询是 JDK NIO 的经典坑：某些平台上即使没有事件，select 也立刻返回，循环变成死循环，一个核跑满。JDK 后来在 epoll 实现里打过补丁，但历史版本仍会遇到。防御写法是统计连续空返回次数，超过阈值就重建 Selector，把通道重新注册过去。Netty 正是这么做的，这也是“别自己造框架”的现实理由。' },
      { p: '另一个高频错误是事件掩码没改。注册了 OP_WRITE 后写完忘记改回只关心 OP_READ，只要发送缓冲有空位，select 就一直返回可写，循环空转。正确做法是写完后执行 <code>key.interestOps(key.interestOps() &amp; ~SelectionKey.OP_WRITE)</code>。写事件应该按需注册，不要常开。' },
      { p: '单 Selector 不是唯一答案。连接数很大时常用主从 Reactor：一个 Selector 只负责 accept，把新连接轮询分给多个子 Selector，每个子 Selector 配一个线程处理读写。这样 accept 不被读写拖住，读写也能并行。代价是通道要跨线程传递，注册同样得 wakeup。理解这一点，再看 Netty 的 bossGroup 与 workerGroup 就很自然。' },

      { h: '1.12 连接、分散聚集与套接字选项' },
      { p: '非阻塞的 SocketChannel 在 connect 时不会等待，调用立刻返回 false，握手还在进行。这时要注册 <code>OP_CONNECT</code>，等 Selector 通知后再调用 <code>finishConnect()</code>：返回 true 表示连上，返回 false 表示还要等，失败则抛 IOException。只处理事件却忘记 finishConnect，表现就是“事件来了，写数据却没反应”。连不上要关闭通道，别把半成品留在注册表里。' },
      { p: 'SocketChannel 支持分散读和聚集写：<code>read(ByteBuffer[])</code> 按顺序填满一个再填下一个，<code>write(ByteBuffer[])</code> 依次把多个缓冲写出去。协议头固定、正文变长时，可以准备两个 Buffer，一次系统调用读进头部和正文。注意它仍然是“能读多少读多少”，不会替你凑满，返回值是总字节数，别假设等于数组容量。' },
      { p: '几个套接字选项值得记：<code>TCP_NODELAY</code> 关闭 Nagle 算法，小包多、延迟敏感的服务要打开；<code>SO_REUSEADDR</code> 让重启后能立刻复用端口，避开 TIME_WAIT 期间绑定失败；<code>SO_KEEPALIVE</code> 靠操作系统探测死连接，但默认两小时才发一次，业务心跳不能省。选项要在 bind 或 connect 之前设置，顺序错了会抛异常。' },

      { h: '1.13 消息边界：半包、粘包与解码器' },
      { p: 'TCP 是字节流，没有消息边界。发送方 write 两次，接收方可能一次就读到；发送方 write 一次，接收方也可能分两次才读完。前者叫粘包，后者叫半包。' },
      { p: '这不是 TCP 的缺陷，而是设计：它只保证字节顺序，不保证按 write 分界。应用层必须自己定边界，常见三种：固定长度、分隔符、长度前缀。' },
      { p: '分隔符方案适合文本协议，比如每行一条 JSON、以换行结尾。解码时在累积缓冲里找分隔符，找到就切一帧，找不到就 compact 保留。难点是分隔符跨包：这包末尾是回车，下包开头是换行。可以只扫描新增部分，或把最后几个字节留在缓冲里。它简单，但正文不能出现分隔符，二进制协议一般不选。' },
      { p: '定长方案最快：每条消息固定 N 字节，读满就切。缺点是浪费带宽，短消息要补齐，长消息要分片，适合遥测、传感器这类长度固定的数据。实现时用计数加缓冲，凑满 N 就处理，剩下的是下一帧开头。' },
      { p: '长度前缀最通用：先发 4 字节表示正文长度，再发正文。接收方先读长度，再判断缓冲够不够，不够就等下一次读。下面用 mark、reset、compact 处理两种边界。' },
      { lang: 'java', code: 'import java.nio.ByteBuffer;\nimport java.nio.charset.StandardCharsets;\n\npublic class FrameDemo {\n    static void feed(ByteBuffer acc, byte[] chunk) {\n        acc.put(chunk);\n        acc.flip();\n        while (acc.remaining() >= 4) {\n            acc.mark();\n            int len = acc.getInt();\n            if (acc.remaining() < len) {\n                acc.reset();\n                break;\n            }\n            byte[] body = new byte[len];\n            acc.get(body);\n            System.out.println("frame: " + new String(body, StandardCharsets.UTF_8));\n        }\n        acc.compact();\n    }\n\n    public static void main(String[] args) {\n        ByteBuffer acc = ByteBuffer.allocate(64);\n        feed(acc, ByteBuffer.allocate(4).putInt(5).array());\n        feed(acc, "hel".getBytes());\n        feed(acc, "lo".getBytes());\n\n        ByteBuffer two = ByteBuffer.allocate(12);\n        two.putInt(2).put("ab".getBytes()).putInt(2).put("cd".getBytes());\n        feed(acc, two.array());\n    }\n}', title: 'FrameDemo.java' },
      { out: 'frame: hello\nframe: ab\nframe: cd' },
      { p: '第一包只有 4 字节头，第二包只到半个正文，第三次才凑够一帧；最后一包含两帧，一次解析完。关键在 <code>compact</code>：没凑够的字节移到开头，下次接在后面。' },
      { note: '<b>生产环境不要手写这套。</b>Netty 的 LengthFieldBasedFrameDecoder、LineBasedFrameDecoder 已处理所有边界。' },
      { p: '长度前缀也有变体。协议头可能是“四字节长度 + 四字节类型 + 正文”，这时长度字段指正文还是整包，必须写进文档，否则两端各按各的理解，表现就是“偶尔能解析，偶尔错位”。长度字段也可能只占两字节，最大六万多；还有用变长整数省空间的。解析前一定要校验上限，比如单帧不超过八兆，否则一个恶意长度就能让服务端分配巨大数组，直接内存溢出。' },
      { p: '更复杂的协议需要状态机：先读魔数，再读版本，再读长度，再读正文，每一步都可能数据不够。手写状态机容易在边界出错，正确做法是把“读多少、还差多少”显式记在连接对象里，每次 read 后推进状态，而不是假设一次就能走完。这也是生产项目更愿意用 Netty 编解码器的原因，那些边界情况它已经测过无数遍。' },
      { p: '读取返回 -1 表示对端关闭，但缓冲区里可能还剩半帧。正确顺序是先把能解析的解析完，再处理关闭：半帧要么丢弃并记日志，要么按协议报错，绝不能当成完整消息交给业务。' },
      { p: '解码还要和业务解耦。每次 read 之后应循环解析，直到返回“数据不够”为止，而不是一次 read 只解一帧，否则高流量下会越积越多。解析出的完整消息放进队列交给业务线程，Selector 线程立刻回到 select，别在原地做业务。' },

      { h: '1.14 六个易错写法与速查清单' },
      { p: '错误一：<code>while (buf.hasRemaining()) channel.write(buf);</code>。write 返回 0 时 hasRemaining 仍为真，循环会空转甚至卡死。修正：看返回值，返回 0 就退出并注册 OP_WRITE，等可写事件再继续，同时给单轮循环设上限，别长时间占着 Selector 线程。' },
      { p: '错误二：读完不 flip，直接 <code>buf.get(bytes)</code>，结果拿到全零或抛 BufferUnderflowException。修正：从写切到读之前调用 flip；被多处调用的方法要在注释里约定“传入的 Buffer 处于读模式”，别靠记忆。' },
      { p: '错误三：异常只 catch 不关连接。读抛 IOException 后通道还挂在 Selector 上，下一轮继续报错，日志刷屏。修正：捕获后关闭通道、取消 key、从连接表移除，关闭动作要幂等。错误四：把 Buffer 跨线程传递。修正：一个 Buffer 只归一个线程，跨线程要么复制，要么用队列传递所有权并保证可见性。' },
      { p: '错误五：用 <code>position()</code> 当有效长度。写模式下 position 是写到的位置，读模式下它是读到的位置，拿它算长度必然错，应该用 remaining。修正：读之前 flip，用 remaining 判断，读之后按实际返回值推进，不猜。' },
      { p: '错误六：向已关闭的通道注册或读写，抛 ClosedChannelException 后整个循环退出。修正：每个事件处理前后判断通道是否打开，关闭动作统一走一个方法，注册前检查 Selector 是否还开着。循环最外层要兜住异常，单条连接出错不能带走整个服务。' },
      { list: [
        '从 Channel 读完后忘记 flip，直接 get，结果一个字节都取不到。',
        'flip 之后继续写，把还没读的数据覆盖掉，或者抛 BufferOverflowException。',
        'select 返回后不清空 selectedKeys，同一个事件被反复处理。',
        '把 read 返回 0 当成连接关闭，提前关掉了正常连接。',
        '在 Selector 线程里做阻塞调用，一个慢查询卡死全部连接。',
        '假设一次 write 能写完，丢掉剩余字节，大响应被截断。'
      ] },

      { h: '1.15 本章小结' },
      { list: [
        'Buffer 靠 capacity、position、limit 三个指针工作，读写切换只改指针。',
        'flip 切读，clear 丢弃全部并切写，compact 保留未读字节并切写。',
        'Channel 是双向的；FileChannel 不支持非阻塞，也不能注册 Selector。',
        '非阻塞 read 返回 0 表示暂无数据，返回 -1 才是连接关闭。',
        'Selector 用一个线程监听多个通道，处理完 key 必须移除。',
        'TCP 没有消息边界，用长度前缀或分隔符自己切帧，生产环境交给 Netty。'
      ] },

      { h: '1.16 常见追问' },
      { list: [
        '<b>问：NIO 一定比阻塞 IO 快吗？</b><br>答：不一定。它优化的不是单次读写速度，而是「一个线程能盯住多少个连接」。连接少、请求密集时，阻塞 IO 一个连接一个线程，代码简单、也没有事件循环的复杂度，往往更快。NIO 的价值出现在连接上千、每个连接大部分时间都在等数据的场景：线程数从一万降到几个，上下文切换和栈内存都省下来。反过来，如果事件循环里塞进慢 SQL 或别的阻塞调用，一个连接就能拖死所有连接。',
        '<b>问：堆内存 Buffer 和直接内存 Buffer 怎么选？</b><br>答：<code>allocateDirect</code> 分配和释放都贵，但读写不经过 JVM 堆，通道可以把这块内存直接交给操作系统做 DMA，少一次拷贝，适合长期复用、反复读写的网络缓冲。堆内存 Buffer 分配便宜、由 GC 管，适合临时数据和文件读写。<b>要点</b>：直接内存不受 <code>-Xmx</code> 限制，用多了会抛 <code>OutOfMemoryError: Direct buffer memory</code>，所以必须池化复用。',
        '<b>问：select、poll、epoll 有什么区别？</b><br>答：select 有文件描述符数量上限（通常 1024），每次调用都要把整个集合从用户态拷进内核，返回后还得自己遍历找就绪项；poll 用数组去掉了上限，但仍然是全量拷贝加全量扫描；epoll 在内核里维护一棵登记关注事件的红黑树，就绪的放进链表，调用只返回真正就绪的那些，连接多而活跃少时优势明显。Java 的 <code>Selector</code> 在 Linux 上就是 epoll 的封装。',
        '<b>问：为什么 FileChannel 不能注册 Selector？</b><br>答：Selector 等的「就绪」含义是内核能告诉你「现在读这个 fd 不会阻塞」。普通文件永远就绪，可读性由文件长度决定，内核并没有对应的事件机制，它压根不参与 epoll。另外 <code>FileChannel</code> 也不是 <code>SelectableChannel</code>，没有 <code>configureBlocking</code> 这些方法。想让文件 IO 不阻塞线程，只能交给独立线程池，或者用异步文件通道。'
      ] },
      { h: '1.17 自测与练习' },
      { ol: [
        '不运行代码，写出 <code>ByteBuffer.allocate(10)</code> 写入 6 字节后 flip 再读 2 字节，此时 position、limit、remaining 各是多少。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：写完 6 字节时 position=6、limit=10、remaining=4；<code>flip</code> 之后 position=0、limit=6、remaining=6；读掉 2 字节后 position=2、limit 仍是 6、remaining=4。<b>为什么</b>：写模式下 limit 就是容量；<code>flip</code> 把 limit 设成当前 position、position 归零，等于翻到读模式；读操作只推进 position，不再改 limit，所以 remaining 一直是 limit 减 position。<b>要点</b>：想从头重读用 <code>rewind</code>（position 归零、limit 不变）；想把没读完的残留数据挪到开头接着写，用 <code>compact</code>，它会先搬移再改 position 与 limit。JDK 9 起 flip、clear 返回具体类型可以链式调用，Java 8 上返回的是 Buffer，链式写法要强转。position 已经等于 limit 还调 get，抛的是 <code>BufferUnderflowException</code>。</div></details>',
        '用 FileChannel 复制一个文件，要求使用 compact，并说明为什么不能用 clear。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.IOException;\nimport java.nio.ByteBuffer;\nimport java.nio.channels.FileChannel;\nimport java.nio.file.Path;\nimport java.nio.file.StandardOpenOption;\n\npublic class CopyWithCompact {\n  public static void main(String[] args) throws IOException {\n    try (var in = FileChannel.open(Path.of("a.bin"),\n             StandardOpenOption.READ);\n         var out = FileChannel.open(Path.of("b.bin"),\n             StandardOpenOption.CREATE,\n             StandardOpenOption.WRITE,\n             StandardOpenOption.TRUNCATE_EXISTING)) {\n      var buf = ByteBuffer.allocate(4096);\n      while (in.read(buf) >= 0) {\n        buf.flip();\n        out.write(buf);   // 一次可能写不完\n        buf.compact();    // 没写出去的字节留在开头\n      }\n    }\n  }\n}</pre><b>要点</b>：<code>clear</code> 只把 position 归零、limit 设成容量，没写出去的字节就被当成空余空间覆盖掉，目标文件会缺尾或混入旧数据；<code>compact</code> 先把剩余字节搬到开头，position 落在它们之后，读写两头都不丢数据。</div></details>',
        '给 SelectorEcho 加一个超时：<code>select(1000)</code> 返回 0 时打印「空闲」，观察输出。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.IOException;\nimport java.net.InetSocketAddress;\nimport java.nio.ByteBuffer;\nimport java.nio.channels.SelectionKey;\nimport java.nio.channels.Selector;\nimport java.nio.channels.ServerSocketChannel;\nimport java.nio.channels.SocketChannel;\n\npublic class SelectorEcho {\n  public static void main(String[] args) throws IOException {\n    try (var sel = Selector.open();\n         var ssc = ServerSocketChannel.open()) {\n      ssc.bind(new InetSocketAddress(9000));\n      ssc.configureBlocking(false);\n      ssc.register(sel, SelectionKey.OP_ACCEPT);\n      var buf = ByteBuffer.allocate(1024);\n      while (true) {\n        if (sel.select(1000) == 0) {\n          System.out.println("空闲");\n          continue;\n        }\n        var it = sel.selectedKeys().iterator();\n        while (it.hasNext()) {\n          var key = it.next();\n          it.remove();\n          if (key.isAcceptable()) {\n            var ch = ssc.accept();\n            ch.configureBlocking(false);\n            ch.register(sel, SelectionKey.OP_READ);\n          } else if (key.isReadable()) {\n            echo((SocketChannel) key.channel(), buf);\n          }\n        }\n      }\n    }\n  }\n\n  static void echo(SocketChannel ch, ByteBuffer buf)\n      throws IOException {\n    buf.clear();\n    if (ch.read(buf) &lt; 0) {\n      ch.close();\n      return;\n    }\n    buf.flip();\n    while (buf.hasRemaining()) {\n      ch.write(buf);\n    }\n  }\n}</pre><b>要点</b>：<code>select(1000)</code> 返回 0 表示这一秒没有任何就绪事件，超时是正常返回值而不是异常；没有连接时每秒打一行「空闲」，一旦有客户端连上，那一轮立即返回不再打印。</div></details>'
      ] },
    ]
  };

  T['security-basics'] = {
    meta: '本章约 5500 字 · 建议 28 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '2.1 为什么学编码、哈希与密码存储' },
      { p: '你可能见过这样的代码：密码用 MD5 存，接口参数用 Base64 号称“加密”，验证码用 <code>Random</code> 生成。这三行代码各自踩了一个坑：哈希不是加密，编码不是加密，伪随机不是随机。' },
      { p: '安全的第一课不是算法，而是分清三件事的边界：编码只换表示，哈希只做指纹，加密才提供保密性。分清了，你才知道什么场景该用什么，也才听得懂“加盐”“慢哈希”“恒定时间比较”这些词到底在解决什么。' },
      { p: '本章从 Base64 讲到哈希、加盐、慢哈希和随机数，最后拼出一条完整的密码存储链路。所有示例只依赖 JDK，可以直接运行；bcrypt 与 Argon2 需要第三方库，文中会说明边界。' },

      { h: '2.2 编码、哈希、加密是三件事' },
      { p: '编码是可逆的表示转换，目的是让数据能在只支持文本的通道里传输；哈希是单向的定长指纹，用来校验完整性；加密用密钥把明文变成密文，没有密钥无法还原。三者经常被混为一谈，后果却完全不同。' },
      { table: { head: ['类型', '是否可逆', '有无密钥', '典型用途'], rows: [
        ['编码 Base64 / URL', '可逆', '无', '传输二进制、拼接 URL'],
        ['哈希 SHA-256', '不可逆', '无（盐不是密钥）', '校验完整性、存密码'],
        ['对称加密 AES', '可逆', '有，同一把', '加密大量数据'],
        ['非对称加密 RSA', '可逆', '有，公钥与私钥', '密钥交换、数字签名']
      ] } },
      { p: '记住一句话：Base64 解出来就是原文，所以它绝不能用来保护密码；哈希不能还原，所以它适合存密码，但必须加盐并放慢；加密能还原，所以密钥管理才是它的命门。' },
      { note: '<b>判断口诀：</b>能一键还原的是编码，谁都还原不了的是哈希，需要钥匙才能还原的是加密。' },

      { h: '2.3 Base64：把二进制变成文本' },
      { p: 'Base64 把每 3 个字节（24 位）切成 4 个 6 位，再映射到 64 个可打印字符。3 字节变 4 字符，体积增加约 33%；不足 3 字节时用等号补齐。它解决的问题是“二进制不能安全地穿过只传文本的协议”。' },
      { p: '典型用途：把图片嵌进 JSON、把证书放进配置文件、HTTP Basic 认证拼用户名密码。注意最后这个例子——它只是把 <code>user:pass</code> 换成另一种写法，抓包的人一解就拿到明文，所以 Basic 认证必须配 HTTPS。' },
      { lang: 'java', code: 'import java.nio.charset.StandardCharsets;\nimport java.util.Base64;\n\npublic class Base64Demo {\n    public static void main(String[] args) {\n        String text = "Java 安全";\n        String encoded = Base64.getEncoder()\n                .encodeToString(text.getBytes(StandardCharsets.UTF_8));\n        System.out.println(encoded);\n\n        byte[] decoded = Base64.getDecoder().decode(encoded);\n        System.out.println(new String(decoded, StandardCharsets.UTF_8));\n\n        String url = Base64.getUrlEncoder().withoutPadding()\n                .encodeToString(new byte[]{-1, -2, 63});\n        System.out.println(url);\n    }\n}', title: 'Base64Demo.java' },
      { out: 'SmF2YSDlronlhag=\nJava 安全\n__4_' },
      { p: '结尾的等号是填充符，表示原文长度不是 3 的倍数。URL 安全的变体把 <code>+</code> 和 <code>/</code> 换成 <code>-</code> 和 <code>_</code>，因为这两个字符在 URL 里有特殊含义；很多场景还会去掉等号。' },
      { p: '解码端要能接受带填充和不带填充两种形式。<code>Base64.getDecoder()</code> 严格校验，遇到非法字符抛 <code>IllegalArgumentException</code>：从 URL 取到的值可能带着 <code>%3D</code> 进来。' },
      { note: '<b>看到“Base64 加密”这种说法，基本可以判断说话人没分清编码和加密。</b>它没有任何密钥，任何人拿到的瞬间就能还原。' },

      { h: '2.4 URL 编码：参数值的护身符' },
      { p: 'URL 里有一批保留字符：问号、与号、等号、井号、斜杠、空格。参数值里如果出现它们，服务器会把与号当成参数分隔符，把井号当成锚点，把加号当成空格。URL 编码把不安全的字节写成百分号加两位十六进制。' },
      { p: 'Java 的 <code>URLEncoder</code> 把空格编成加号，这是表单提交的历史约定；路径部分应该用 <code>%20</code>。解码时加号会被还原成空格，所以不要把加号原样放进路径，否则会被当成空格。' },
      { lang: 'java', code: 'import java.net.URLDecoder;\nimport java.net.URLEncoder;\nimport java.nio.charset.StandardCharsets;\n\npublic class UrlDemo {\n    public static void main(String[] args) throws Exception {\n        String q = "Java 基础 & 安全";\n        String enc = URLEncoder.encode(q, StandardCharsets.UTF_8);\n        System.out.println(enc);\n        System.out.println(URLDecoder.decode(enc, StandardCharsets.UTF_8));\n        System.out.println(URLEncoder.encode("a b", StandardCharsets.UTF_8));\n    }\n}', title: 'UrlDemo.java' },
      { out: 'Java+%E5%9F%BA%E7%A1%80+%26+%E5%AE%89%E5%85%A8\nJava 基础 & 安全\na+b' },
      { p: '中文在 UTF-8 下一个字占 3 个字节，所以“基”变成三个百分号转义。空格变成加号，与号变成 <code>%26</code>，这样服务器就不会把它当成分隔符。' },
      { p: '两个容易忽略的点：编码必须和服务器约定同一种字符集，否则就是乱码；<code>URLEncoder</code> 只适合编码参数值，不要整条 URL 编一遍，否则连协议头和斜杠都会被转义。' },

      { h: '2.5 哈希与 MD5、SHA 家族' },
      { p: '哈希函数把任意长度的输入压成固定长度的输出，满足三条：相同输入结果相同；输入改一个字节，输出面目全非（雪崩效应）；无法从摘要反推原文。它还要求抗碰撞：很难找到两个不同输入得到同一摘要。' },
      { p: 'MD5 输出 128 位，SHA-1 输出 160 位，两者都已被攻破，能人为构造碰撞，不能再用于签名或密码。SHA-256 输出 256 位，目前安全，是通用选择；SHA-512 更长更慢，适合高安全场景。' },
      { table: { head: ['算法', '输出长度', '现状与用途'], rows: [
        ['MD5', '128 位', '已破，仅用于非安全校验'],
        ['SHA-1', '160 位', '已破，逐步淘汰'],
        ['SHA-256', '256 位', '安全，通用选择'],
        ['SHA-512', '512 位', '安全，更慢'],
        ['bcrypt', '可调', '专为密码设计，内置盐'],
        ['Argon2', '可调', '密码哈希竞赛冠军，可限内存']
      ] } },
      { lang: 'java', code: 'import java.nio.charset.StandardCharsets;\nimport java.security.MessageDigest;\n\npublic class DigestDemo {\n    public static void main(String[] args) throws Exception {\n        MessageDigest md = MessageDigest.getInstance("SHA-256");\n        byte[] d = md.digest("abc".getBytes(StandardCharsets.UTF_8));\n        StringBuilder sb = new StringBuilder();\n        for (byte b : d) {\n            sb.append(String.format("%02x", b));\n        }\n        System.out.println(sb);\n    }\n}', title: 'DigestDemo.java' },
      { out: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
      { p: '同一段文字在任何机器上算出的 SHA-256 都相同，所以它能用来校验下载文件是否被篡改。但也正因为“相同”，攻击者可以预先算好常见密码的摘要，做成一张表直接查——这就是彩虹表。' },
      { p: '哈希不等于加密：加密有密钥、可还原；哈希没有密钥、不可还原。用 SHA-256 存密码仍然不够，因为它太快了，一块显卡每秒能算几十亿次。' },

      { h: '2.6 加盐：让相同密码得到不同结果' },
      { p: '盐是一段随机字节，和密码拼在一起再哈希，每个用户一份，和摘要一起存进数据库。它的作用是让相同密码得到不同摘要，从而让预计算的彩虹表失效。' },
      { p: '盐不需要保密，但要随机且唯一。盐太短、或者全站共用一把盐，效果都会大打折扣：共用盐等于没有盐，一个用户被撞破，同密码的账号全部沦陷。现代方案通常用 16 字节（128 位）随机盐。' },
      { lang: 'java', code: 'import javax.crypto.SecretKeyFactory;\nimport javax.crypto.spec.PBEKeySpec;\nimport java.security.SecureRandom;\nimport java.util.Base64;\n\npublic class Pbkdf2Demo {\n    static String hash(String password, byte[] salt) throws Exception {\n        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 120000, 256);\n        byte[] key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")\n                .generateSecret(spec).getEncoded();\n        spec.clearPassword();\n        return Base64.getEncoder().encodeToString(key);\n    }\n\n    public static void main(String[] args) throws Exception {\n        SecureRandom random = new SecureRandom();\n        byte[] salt1 = new byte[16];\n        byte[] salt2 = new byte[16];\n        random.nextBytes(salt1);\n        random.nextBytes(salt2);\n\n        String h1 = hash("123456", salt1);\n        String h2 = hash("123456", salt2);\n        System.out.println(h1.equals(h2));\n        System.out.println(hash("123456", salt1).equals(h1));\n    }\n}', title: 'Pbkdf2Demo.java' },
      { out: 'false\ntrue' },
      { p: '同一个密码配两个不同的盐，结果完全不同；盐相同则结果稳定。登录时不是解密，而是用库里存的盐把用户输入重新算一遍，再比较两个摘要。' },
      { note: '<b>比较摘要要用恒定时间函数</b>，例如 <code>MessageDigest.isEqual</code>。普通 equals 遇到第一个不同字节就返回，理论上可以被计时攻击利用。' },

      { h: '2.7 慢哈希：bcrypt 与 Argon2' },
      { p: '只加盐还不够。SHA-256 太快，8 位密码几小时就能穷举完。解决办法是把哈希故意变慢，让每次尝试都要付出可观的计算代价，这就是慢哈希。bcrypt 内置盐和成本因子，Argon2 还能限制内存与并行度，抗 GPU 更好。' },
      { p: '慢哈希的核心是“可调成本”。成本因子每加 1，计算时间翻倍；服务器能接受 100 毫秒，攻击者也要付同样的代价，爆破成本就被放大几百万倍。这就是为什么密码哈希不能追求快。' },
      { p: 'bcrypt 的输出形如 <code>$2a$12$...</code>，其中 12 是成本因子，后面跟着盐和摘要。它有一个明确限制：输入最长 72 字节，超出部分会被截断，所以密码长度校验要放在哈希之前。' },
      { p: 'Argon2 有三个变体，Argon2id 最常用。它除了时间成本，还能指定内存成本（例如 64 MB）和并行度，让 GPU 和专用芯片难以大规模并行，因而被认为是目前更稳妥的选择。' },
      { p: 'JDK 没有内置 bcrypt，Spring Security 的 <code>BCryptPasswordEncoder</code> 最常见；Argon2 需要 BouncyCastle。用法都是“编码”和“匹配”两个方法，不要自己实现算法。' },
      { note: '<b>迭代次数不是越多越好。</b>定在单次验证 100 到 300 毫秒，并按硬件升级定期调高；否则登录接口会先被自己的计算拖垮，攻击者反而可以用大量登录请求做拒绝服务。' },
      { p: '升级算法时不必让所有人改密码：登录成功后发现旧格式，就用新算法重算一遍并更新数据库，用户无感知。这也是存储格式里必须带算法标识的原因。' },

      { h: '2.8 随机数：Random 与 SecureRandom' },
      { p: '<code>java.util.Random</code> 是线性同余伪随机，给定种子序列就完全确定。它适合抽奖、模拟、游戏，绝不能用来生成令牌、盐或密钥。用时间戳做种子更是经典错误，攻击者能猜出大致范围。' },
      { p: '<code>SecureRandom</code> 会从操作系统的熵源取种子，输出不可预测。创建它有一定开销，可以复用，但不要给它固定种子，否则就退化成普通 Random。' },
      { lang: 'java', code: 'import java.security.SecureRandom;\nimport java.util.Random;\n\npublic class RandomDemo {\n    public static void main(String[] args) {\n        Random a = new Random(42);\n        Random b = new Random(42);\n        System.out.println(a.nextInt(100) == b.nextInt(100));\n\n        SecureRandom s1 = new SecureRandom();\n        SecureRandom s2 = new SecureRandom();\n        System.out.println(s1.nextLong() == s2.nextLong());\n    }\n}', title: 'RandomDemo.java' },
      { out: 'true\nfalse' },
      { p: '第一行 true 说明 Random 可复现：相同种子得到相同序列。第二行 false 说明两个 SecureRandom 不会撞车。令牌推荐 SecureRandom 加 Base64 URL 编码，至少 128 位。' },
      { p: '<code>UUID.randomUUID()</code> 内部也用 SecureRandom，生成 128 位随机值，适合做会话 ID 和幂等键；但它不保证全局唯一，数据库仍然要加唯一索引兜底。' },

      { h: '2.9 密码存储的完整链路与迁移落地' },
      { p: '把前面的零件拼起来：注册时生成随机盐，用慢哈希算出摘要，把算法、参数、盐、摘要一起存进数据库；登录时取出这些参数，用同样的算法和盐重算，再做恒定时间比较。' },
      { flow: ['用户输入密码', '生成 16 字节随机盐', '选择算法与成本', '慢哈希计算', '存算法$参数$盐$摘要', '登录时同盐重算', '恒定时间比较'] },
      { p: '存储格式要带算法标识，方便以后升级。例如 <code>pbkdf2-sha256$120000$salt$hash</code>，将来换成 Argon2 时，老用户登录成功后再悄悄重算并更新。' },
      { p: '表结构至少要能回答四个问题：用了什么算法、成本是多少、盐是什么、摘要是什么。常见做法是用一列 <code>varchar(255)</code> 存完整字符串，形如 <code>算法$参数$盐$摘要</code>，读取时按分隔符切开即可。不要一上来就拆成四列，迁移时改动面会大得多。' },
      { p: '迁移老数据不要停机重算，那等于要求你拿到所有人的明文密码。可行路径是登录时透明升级：用户输入密码，先用旧算法验证，通过后立刻用新算法重算并覆盖这一行，用户完全无感。少数长期不登录的账号，留到下次登录或强制改密时处理。' },
      { p: '判断旧格式要看前缀而不是猜长度：<code>$2a$</code> 开头是 bcrypt，<code>$argon2id$</code> 开头是 Argon2，含 <code>pbkdf2</code> 字样的是 PBKDF2，纯三十二位十六进制多半是 MD5，四十位多半是 SHA-1。写一个解析方法返回算法与参数，验证逻辑按算法分派，新用户一律用最新算法。' },
      { p: '还要准备一条兜底路径：确认数据库泄露时，把所有摘要标记为待升级，下次登录强制改密；如果连盐都没存，就只能全部重置。这也是为什么“先随便存着，以后再改”是个昂贵的决定——迁移成本会随时间不断变大。' },
      { p: '顺带说一句密码策略：长度比复杂度更有效，鼓励用长口令和密码管理器，允许粘贴，不要禁止特殊字符；也不建议强制九十天改一次密码，那通常只会让用户把 Password1 改成 Password2。真正该做的是在疑似泄露时强制重置，并阻止已出现在公开泄露库里的弱口令。' },
      { p: '还有几条底线：密码只走 HTTPS；日志里不打印密码和摘要；重置令牌一次有效并设置过期；比较用恒定时间函数；数据库泄露时能立刻知道哪些账号需要强制改密。' },
      { list: [
        '不要明文存，也不要用可逆加密存，密钥同样会泄露。',
        '不要用 MD5、SHA-1，不要全站共用一把盐。',
        '不要在客户端哈希后再传输，那只是把哈希变成了新的密码。',
        '不要自己写随机数、哈希或加密算法，用标准实现。',
        '不要让密码进入 URL、日志、异常堆栈和监控埋点。'
      ] },

      { h: '2.10 编码与加密：三个高频误用场景' },
      { p: '面试里常听到一句话：“密码我做过处理，用 Base64 编码了。”这句话暴露的不是细心，而是边界不清。编码只是换一种表示，任何人拿到那串字符都能在编辑器里解回来；加密的保密性来自密钥，没有密钥就还原不了。判断一段“保护”是否成立，只问一句：实现里有没有密钥，密钥在谁手里。' },
      { p: '场景一，把密码 Base64 之后存进数据库。攻击者拖库以后写一行代码就得到全部明文，连撞库都省了。修正：改存加盐的慢哈希摘要，登录时重新计算再比较，任何时候都不还原。' },
      { p: '场景二，前端“加密”密码再提交。前端代码是公开的，密钥写在脚本里等于公开，抓包的人照样能还原，甚至可以直接重放这段密文。修正：传输交给 HTTPS，服务端收到明文后立即做慢哈希；前端那一层最多算防日志泄露的附加手段，不能替代服务端哈希。' },
      { p: '场景三，JWT 的 payload 用 Base64URL 承载就以为内容保密。它本来就只是编码，任何人把令牌粘到解码页面就能看到用户编号和角色。修正：payload 里不放敏感信息；确实需要保密就用 JWE，或者把敏感数据留在服务端会话里。' },

      { h: '2.11 哈希误用清单' },
      { p: '哈希的错误往往不在“用了哈希”，而在“以为用了哈希就安全”。下面几条是代码审查里最常出现的写法，每条都给出修正方向。' },
      { p: '第一，用 MD5 或 SHA-1 存密码。这两种算法已经能人为构造碰撞，速度又极快，一块普通显卡每秒能尝试数十亿次。修正：换 PBKDF2、bcrypt 或 Argon2，把单次验证压到一百毫秒以上。' },
      { p: '第二，不加盐，或者全站共用一把盐。不加盐时相同密码摘要相同，彩虹表一查即中；共用盐只是把彩虹表换成“一张表打全站”，一个账号被撞破，同密码的账号全部沦陷。修正：每个用户一份随机盐，至少十六字节，与摘要一起存。' },
      { p: '第三，自己拼接密码和盐再做一次 SHA-256。这种构造容易受长度扩展攻击，也不如 HMAC 规范。修正：不要手写组合方式，直接用标准密钥派生函数；如果只是想校验完整性，用 <code>HmacSHA256</code>，而不是 <code>hash(secret + data)</code>。' },
      { p: '第四，多重哈希，例如把密码先 MD5 再 MD5 一次。它只让计算慢了一点点，不增加任何抗碰撞能力，也挡不住彩虹表。修正：需要变慢就用带成本参数的算法，而不是在快哈希外面套几层。' },
      { p: '第五，把哈希当签名。没有密钥的摘要谁都能算，攻击者改完文件再重算一遍摘要，校验照样通过。修正：防篡改必须带密钥，用 HMAC 或数字签名。' },
      { p: '第六，截断摘要或只比较前八位。位数越短越容易碰撞，十六进制的前八位只有三十二位空间，几万次尝试就能撞上。修正：完整比较，并且用恒定时间函数。' },
      { p: '还有一类容易被忽略：用哈希校验下载文件，却把摘要和文件放在同一台服务器上发布。攻击者既然能替换文件，也能顺手替换摘要，校验就失去了意义。修正：摘要走独立渠道，或者直接对文件做数字签名，让校验值本身也具备防篡改能力。' },

      { h: '2.12 密钥管理：泄露通常不在算法' },
      { p: '加密算法本身很少被正面攻破，出事的多半是密钥：写死在代码里、提交进 Git、打进前端包、随手贴在聊天工具里。密钥一旦泄露，AES 和 RSA 都救不了你。' },
      { p: '错误写法是在类里写 <code>private static final String KEY = "1234567890abcdef";</code>，再 <code>new SecretKeySpec(KEY.getBytes(), "AES")</code>。这段代码会同时出现在源码、编译产物和版本历史里，删掉也没用，Git 历史里还在。修正：密钥放环境变量、配置中心或密钥管理服务，代码里只保留“怎么取”，不保留“值是什么”。' },
      { p: '第二类错误是把口令直接当密钥。人口令的熵很低，长度也常常不够：AES-128 需要十六字节，AES-256 需要三十二字节，随手写的字符串往往不满足。修正：用基于口令的派生函数生成密钥，明确指定盐和迭代次数；更好的做法是密钥由系统随机生成，人只负责保管。' },
      { p: '还要注意几个细节。同一把密钥不要跨环境复用，测试环境的密钥泄露不该影响生产；加密密钥和签名密钥要分开，职责不同，泄露后的影响面也不同；密钥要有版本号和轮换计划，密文里带上版本，轮换时才能新旧并存、逐步迁移；不要把密钥写进日志、异常信息、监控标签和截图。' },
      { p: '需要长期保存大量数据时，可以用信封加密：数据用随机生成的数据密钥加密，数据密钥再用主密钥加密后随数据一起存。轮换主密钥时只需重新加密数据密钥，不必重刷全部历史数据；主密钥交给密钥管理服务保管，应用只在需要时申请解封。' },

      { h: '2.13 安全编码习惯与上线前自查' },
      { p: '安全不是最后加的一层壳，而是写每一行时的默认动作。下面这些习惯不需要额外框架，但能挡掉大部分低级事故。' },
      { p: '输入按白名单校验。长度、字符集、格式、范围都要有明确上限，例如用户名只允许字母数字下划线且不超过三十二字符，金额必须是两位小数的正数。黑名单永远会漏，因为攻击者总能找到你没列出的写法。' },
      { p: '输出按上下文编码。拼 HTML 要转义尖括号和引号，拼 SQL 要用预编译参数而不是字符串拼接，拼命令行要避免把用户输入直接交给 shell。同一个字符串放进不同上下文，需要的转义并不一样。' },
      { p: '错误信息要对外含糊、对内清楚。给用户的提示只说明失败，不暴露表名、类名、堆栈和 SQL 片段；完整异常写进服务端日志，但日志要脱敏，密码、令牌、身份证号、手机号中间四位都不能原样出现。' },
      { p: '密码在内存里也应尽量短命。不要把密码存进 <code>String</code>，字符串进入常量池后无法主动清除；用 <code>char[]</code> 接收，用完立刻用 <code>Arrays.fill</code> 覆盖。这一条对普通业务收益有限，但对安全要求高的系统是标准动作。' },
      { p: '依赖也要当成攻击面。第三方库的漏洞会直接变成你的漏洞，所以要锁定版本、定期扫描、及时升级；引入一个只为省几行代码的库之前，先想清楚它值不值得多一份信任。' },
      { p: '最后是几条底线：会话令牌用 <code>SecureRandom</code> 生成并设置过期，登录失败要限流而不是无限重试，敏感操作要二次确认，权限默认拒绝而不是默认允许，比较摘要和令牌用恒定时间函数。安全做对的标志不是“我加了密”，而是“我知道每一层挡的是什么”。' },
      { list: [
        '把 Base64 当加密，前端“加密”之后明文仍可一键还原。',
        '密码用 MD5 且不加盐，彩虹表一查就出。',
        '全站共用一把盐，一个账号泄露就能批量比对。',
        '用 Random 或时间戳生成会话令牌，种子可预测。',
        '自己实现 SHA-256 或 bcrypt，引入侧信道和实现漏洞。',
        '用 equals 比较摘要，忽略恒定时间比较。'
      ] },

      { h: '2.14 本章小结' },
      { list: [
        '编码可逆、无密钥，只换表示；Base64 增大约 33%，不提供保密性。',
        '哈希单向、定长，用于完整性与密码；MD5、SHA-1 已不能用于安全场景。',
        '加盐让相同密码得到不同摘要，盐要随机、唯一、每用户一份。',
        '慢哈希把单次验证压到 100 到 300 毫秒，bcrypt、Argon2、PBKDF2 都是这个思路。',
        '令牌与盐必须用 SecureRandom；比较摘要用恒定时间函数。',
        '密码存储要带算法标识，支持登录时透明升级。'
      ] },

      { h: '2.15 常见追问' },
      { list: [
        '<b>问：哈希能解密吗？</b><br>答：不能。哈希是单向的压缩映射，输出长度固定，信息在数学上已经丢失，不存在逆运算。所谓「破解」是用字典或暴力枚举把候选原文一个个算一遍，撞出相同摘要就反推出原文，本质上是猜而不是解。因此密码哈希的安全性取决于两件事：原文的熵足够高、哈希本身足够慢。这也解释了为什么弱口令即使套上 SHA-256，照样能被现成的彩虹表打出来。',
        '<b>问：盐需要保密吗？</b><br>答：不需要。盐和摘要一起存在数据库里，攻击者拿到也没用。它的作用是让预计算失效：同一个密码配上不同盐会算出完全不同的摘要，彩虹表立刻报废；同时它把「撞出一个哈希就拿下所有同密码用户」变成逐个破解。要求是每个用户唯一、长度足够、用密码学随机数生成，但完全不必保密。',
        '<b>问：为什么 bcrypt 比 SHA-256 安全？</b><br>答：因为它故意慢。SHA-256 是为吞吐量设计的，一块 GPU 每秒能算几十亿次，配上字典几乎等于明文；bcrypt 和 PBKDF2、scrypt、Argon2 一样带成本参数，可以调到一次校验花 100 毫秒，同一块卡每秒只能试十几次，暴力破解就从分钟级变成年级。代价是每次登录都要付这 100 毫秒，所以成本参数必须可配置，硬件变快了就调高。',
        '<b>问：已经用 HTTPS 了，密码还需要哈希吗？</b><br>答：需要，两者保护的是不同环节。HTTPS 保护密码在传输路上不被窃听和篡改；哈希保护它在存储层，数据库被拖走、备份泄露、DBA 顺手查一条时都用不上。没有哈希，一次库泄露就等于全体用户明文密码泄露，而这些用户往往还拿同一个密码去登别家。正确做法是：走 HTTPS 传输，服务端用加盐慢哈希存储。'
      ] },
      { h: '2.16 自测与练习' },
      { ol: [
        '把 <code>"hello"</code> 分别做 Base64 编码和 SHA-256 哈希，说明为什么一个能还原、一个不能。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.security.MessageDigest;\nimport java.util.Base64;\nimport java.util.HexFormat;\n\npublic class EncodeVsHash {\n  public static void main(String[] args) throws Exception {\n    byte[] raw = "hello".getBytes();\n    String b64 = Base64.getEncoder().encodeToString(raw);\n    System.out.println(b64);                 // aGVsbG8=\n    System.out.println(new String(\n        Base64.getDecoder().decode(b64)));   // hello\n    byte[] d = MessageDigest.getInstance("SHA-256")\n        .digest(raw);\n    System.out.println(HexFormat.of().formatHex(d));\n  }\n}</pre><b>要点</b>：Base64 没有密钥，解码就是编码的逆运算；SHA-256 把任意长度压成固定 32 字节，原信息已经被丢掉，只能做“输入相同则摘要相同”的校验，永远算不回 hello（<code>2cf24dba5fb0a30e...</code> 共 64 个十六进制字符）。</div></details>',
        '用同一个密码和两个不同盐各算一次 PBKDF2，比较结果，并解释数据库里需要存哪些字段。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.security.SecureRandom;\nimport java.util.Base64;\nimport javax.crypto.SecretKeyFactory;\nimport javax.crypto.spec.PBEKeySpec;\n\npublic class Pbkdf2Demo {\n  static String hash(char[] pwd, byte[] salt)\n      throws Exception {\n    var spec = new PBEKeySpec(pwd, salt, 120000, 256);\n    byte[] d = SecretKeyFactory\n        .getInstance("PBKDF2WithHmacSHA256")\n        .generateSecret(spec).getEncoded();\n    return Base64.getEncoder().encodeToString(d);\n  }\n\n  public static void main(String[] args) throws Exception {\n    var rnd = new SecureRandom();\n    var s1 = new byte[16];\n    var s2 = new byte[16];\n    rnd.nextBytes(s1);\n    rnd.nextBytes(s2);\n    char[] pwd = "Passw0rd!".toCharArray();\n    String h1 = hash(pwd, s1);\n    String h2 = hash(pwd, s2);\n    System.out.println(h1);\n    System.out.println(h2);\n    System.out.println(h1.equals(h2));  // false\n  }\n}</pre><b>要点</b>：同一个密码配不同的盐，结果毫无相似之处，这正是盐的作用。数据库每行要存四样：算法名、迭代次数等参数、盐、摘要，登录时按同样的算法和盐重算再比较，比较用 <code>MessageDigest.isEqual</code> 走恒定时间。</div></details>',
        '把 <code>URLEncoder.encode("a b/c?d", UTF_8)</code> 的结果写出来，再解释哪些字符被转义、为什么。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：输出 <code>a+b%2Fc%3Fd</code>，空格变成了加号；如果按 RFC 3986 的路径规则编码，空格应当是 <code>%20</code>，斜杠反倒不必转义。<b>为什么</b>：<code>URLEncoder</code> 实现的是表单编码（application/x-www-form-urlencoded），空格在那里映射成 <code>+</code>；而 <code>/</code> 和 <code>?</code> 在查询值里有分隔含义，必须转成 <code>%2F</code>、<code>%3F</code> 才不会改变结构。<b>要点</b>：拼路径段要用 <code>URI</code> 或按 RFC 3986 自己编码，别拿 URLEncoder 拼 URL；解码用 <code>URLDecoder.decode(s, UTF_8)</code>。</div></details>',
        '写一个方法，用 SecureRandom 生成 32 字节令牌并做 URL 安全的 Base64 编码。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.security.SecureRandom;\nimport java.util.Base64;\n\npublic class Token {\n  private static final SecureRandom RND = new SecureRandom();\n\n  public static String newToken() {\n    var buf = new byte[32];\n    RND.nextBytes(buf);\n    return Base64.getUrlEncoder().withoutPadding()\n        .encodeToString(buf);\n  }\n\n  public static void main(String[] args) {\n    System.out.println(newToken());  // 43 个字符\n    System.out.println(newToken());\n  }\n}</pre><b>要点</b>：32 字节等于 256 位熵，暴力猜中不现实；URL 安全的 Base64 把 <code>+</code> <code>/</code> 换成 <code>-</code> <code>_</code>，再去掉 <code>=</code> 填充，结果才能直接塞进 URL 或 Cookie 而不用二次转义。<code>SecureRandom</code> 做成静态字段复用，别每次 new。</div></details>',
        '列出你见过的三个「把编码当加密」的写法，并说明正确做法。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：最常见的三类是把密码做 Base64 存库、用 URLEncoder 处理「敏感参数」当加密、以及自己写字符位移或「MD5 拼固定盐」当加密。<b>为什么</b>：编码没有密钥、算法公开且可逆；固定盐等于全局只有一个盐，彩虹表一次预计算就能全破；MD5 的碰撞已被工程化，早已不该用在任何安全场景。<b>要点</b>：正确做法分别是密码用 bcrypt 或 PBKDF2 配每用户随机盐、敏感参数靠 HTTPS 保护或 AES-GCM 并管好密钥、校验用 SHA-256 但别当签名。判断标准就一条：没有密钥的东西不是加密。</div></details>'
      ] },
    ]
  };
})();
