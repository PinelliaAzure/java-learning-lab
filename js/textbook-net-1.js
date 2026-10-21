/* 教材正文：网络编程 / TCP、Socket 与端口 / HttpClient 与 HttpServer */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['network-basics'] = {
    meta: '本章约 5500 字 · 建议 30 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '1.1 为什么学网络编程' },
      { p: '你写的程序很少孤零零运行。浏览器拿页面、服务查数据库、微服务互相调用，背后都是同一件事：两个进程交换字节。网络编程就是把这件事讲清楚。' },
      { p: '零基础阶段最常卡住的地方，不是写不出代码，而是看不懂报错：“连接超时”“端口被占用”“连接被重置”分别是谁的问题？为什么加了 <code>setSoTimeout</code> 程序就不卡了？这一章沿一条主线走：IP 定位主机，端口定位进程，TCP 建立可靠连接，Socket 提供读写接口。走完你能写出回声服务端，也知道每个网络调用为什么必须设超时。' },

      { h: '1.2 分层：从网线到浏览器' },
      { p: 'TCP/IP 常被分成四层：链路层管网卡和网线，网络层用 IP 找主机，传输层用 TCP 或 UDP 找进程，应用层是 HTTP、DNS 这些协议。分层让各管一段，写 HTTP 的人不必关心网线是铜线还是光纤。' },
      { p: 'IP 地址回答“送到哪台机器”，端口回答“交给哪个进程”。可以把 IP 想成小区地址，端口想成门牌号。端口范围 0 到 65535，0 到 1023 是知名端口，比如 HTTP 的 80、HTTPS 的 443；普通程序一般选 1024 以上，免得要管理员权限。' },
      { p: '调试时最常混的两个地址是 127.0.0.1 和 0.0.0.0。前者是本机回环地址，只有本机能访问；后者表示监听所有网卡，服务端绑它，局域网里的机器才连得进来。localhost 通常解析到 127.0.0.1，也可能被 hosts 文件改掉。' },

      { h: '1.3 端口、NAT 与连接的四元组' },
      { p: '一条 TCP 连接由四元组唯一确定：源 IP、源端口、目的 IP、目的端口。服务端只监听 9000 一个端口，却能同时服务上千个客户端，靠的就是四元组不同：每个客户端的源 IP 或源端口不一样，内核据此把字节分给对应的 Socket。所以“端口被占用”只发生在 bind 阶段，accept 之后再多的连接也不冲突。' },
      { p: '客户端一般不指定本地端口，由内核从临时端口范围里挑一个，Linux 默认大约 32768 到 60999。短连接频繁时，这些端口会被 TIME_WAIT 占住，出现“Cannot assign requested address”，本质是本机临时端口不够用，而不是对方拒绝。解决办法是复用连接、扩大端口范围，或者让主动关闭方错开。' },
      { p: 'NAT 让多台内网机器共用一个公网 IP：路由器把内网地址和端口映射成公网地址加一个新端口，回包再按映射表还原。这带来两个后果：外网不能主动连内网机器，除非显式做端口映射；连接空闲太久，NAT 表项会被回收，两端都以为连接还在，下一次写入才发现已经被重置。心跳间隔要小于 NAT 的空闲回收时间，通常取 30 到 60 秒。' },
      { p: '同一个端口上还能区分“监听”和“已连接”。用 ss 看到的 LISTEN 是 ServerSocket 在等新连接，ESTABLISHED 是已经 accept 出来的连接，两者可以同时存在很多条。理解了这一点，就不会问“一个端口怎么能被几百个客户端同时用”这种问题。' },

      { h: '1.4 TCP 与 UDP' },
      { p: 'TCP 面向连接、可靠、有序。它通过握手建立连接，用确认和重传保证字节不丢，用序列号保证顺序，代价是额外的往返、缓冲和状态维护。UDP 无连接，把数据报丢出去就不管了，开销小、延迟低，但不保证到达、不保证顺序，也可能重复。' },
      { p: '选择标准不复杂：不能丢的数据走 TCP，比如文件、订单、网页；能容忍少量丢失但怕延迟的走 UDP，比如音视频、实时游戏的位置同步、DNS 查询。QUIC 是个折中：底层用 UDP，自己在应用层实现可靠传输。' },
      { table: { head: ['维度', 'TCP', 'UDP'], rows: [
        ['连接', '三次握手建立', '无连接，直接发'],
        ['可靠性', '确认、重传、去重', '不保证到达'],
        ['顺序', '保证字节流有序', '不保证'],
        ['开销', '较大，有连接状态', '小，头部仅 8 字节'],
        ['典型场景', 'HTTP、数据库、文件传输', '音视频、游戏、DNS'],
        ['Java 接口', '<code>Socket</code>、<code>ServerSocket</code>', '<code>DatagramSocket</code>']
      ] } },
      { p: '要提醒一句：“TCP 可靠”不等于“你的业务一定收到”。连接正常期间字节按序到达，但对方进程可能崩溃、连接可能被中间设备断开，数据可能还躺在缓冲区里。业务上的确认、重试和幂等，仍然要自己设计。' },

      { h: '1.5 三次握手与四次挥手' },
      { p: '建立连接需要三次握手：客户端发 SYN，服务端回 SYN+ACK，客户端再回 ACK。两次不够：只能让服务端确认客户端能发、服务端能收，却不能让客户端确认服务端能发、客户端能收，也无法可靠同步双方的初始序列号。三次刚好让双方完成这两个确认。' },
      { p: '关闭连接通常是四次挥手：主动方发 FIN，对方回 ACK，等自己数据发完再发 FIN，主动方最后回 ACK。主动关闭的一方会进入 TIME_WAIT，等待两个最长报文寿命，确保最后一个 ACK 能到达，也让旧连接的数据包在网络里消散。' },
      { flow: ['客户端发 SYN', '服务端回 SYN+ACK', '客户端回 ACK，连接建立', '双向传输字节流', '主动方发 FIN', '对方回 ACK 并处理剩余数据', '对方发 FIN', '主动方回 ACK，进入 TIME_WAIT'] },
      { p: '这些状态在排错时很有用：大量 CLOSE_WAIT 说明 accept 之后没关 Socket；大量 TIME_WAIT 说明短连接太多，可以考虑复用连接。用 ss 或 netstat 能看到状态和端口。' },

      { h: '1.6 Socket 与 ServerSocket' },
      { p: 'Java 把 TCP 封装成两个类：客户端用 Socket 表示一条连接；服务端用 ServerSocket 绑定端口并 accept 等待。accept 返回一个新的 Socket 代表这次连接。一个 ServerSocket 可以 accept 很多次，每次拿到独立的 Socket，互不影响。' },
      { p: '读写用流：getInputStream 拿字节，套上 InputStreamReader 和 BufferedReader 按行读；getOutputStream 套 PrintWriter，构造时把 autoFlush 设为 true，println 才会立刻发出。字符流一定要显式指定 UTF-8，否则两端编码不同就乱码。示例省略 import。' },
      { lang: 'java', code: 'public class EchoDemo {\n    public static void main(String[] args) throws Exception {\n        ServerSocket server = new ServerSocket(9000);\n        Thread worker = new Thread(() -> {\n            try (Socket socket = server.accept();\n                 BufferedReader in = new BufferedReader(\n                         new InputStreamReader(socket.getInputStream(),\n                                 StandardCharsets.UTF_8));\n                 PrintWriter out = new PrintWriter(new OutputStreamWriter(\n                         socket.getOutputStream(), StandardCharsets.UTF_8), true)) {\n                out.println("echo: " + in.readLine());\n            } catch (IOException e) {\n                System.out.println("服务端异常：" + e.getMessage());\n            }\n        });\n        worker.start();\n\n        try (Socket socket = new Socket("127.0.0.1", 9000);\n             PrintWriter out = new PrintWriter(new OutputStreamWriter(\n                     socket.getOutputStream(), StandardCharsets.UTF_8), true);\n             BufferedReader in = new BufferedReader(\n                     new InputStreamReader(socket.getInputStream(),\n                             StandardCharsets.UTF_8))) {\n            out.println("你好，Socket");\n            System.out.println(in.readLine());\n        }\n        worker.join();\n        server.close();\n    }\n}', title: 'EchoDemo.java' },
      { out: 'echo: 你好，Socket' },
      { p: '这段代码里服务端放在一个线程，主线程当客户端，所以一个文件就能跑。accept 阻塞：没有连接线程就停着；readLine 也阻塞：没有数据就等。阻塞本身不可怕，可怕的是没有上限——对方不响应，线程可能一直占着。' },

      { h: '1.7 TCP 是字节流，不是消息流' },
      { p: 'TCP 只保证字节按序到达，不保留写入边界。write 了两次，对方可能一次读到；write 了一次，对方也可能分几次读到，这就是粘包和拆包。应用层必须自己约定边界：按行、按长度前缀，或者像 HTTP 用 Content-Length 和分块传输。' },
      { lang: 'java', code: 'public class ReadAllDemo {\n    public static void main(String[] args) throws Exception {\n        ServerSocket server = new ServerSocket(9002);\n        new Thread(() -> {\n            try (Socket socket = server.accept();\n                 PrintWriter out = new PrintWriter(new OutputStreamWriter(\n                         socket.getOutputStream(), StandardCharsets.UTF_8), true)) {\n                out.println("第一行");\n                out.println("第二行");\n            } catch (IOException ignored) {\n            }\n        }).start();\n\n        try (Socket socket = new Socket("127.0.0.1", 9002);\n             BufferedReader in = new BufferedReader(\n                     new InputStreamReader(socket.getInputStream(),\n                             StandardCharsets.UTF_8))) {\n            String line;\n            while ((line = in.readLine()) != null) {\n                System.out.println("收到：" + line);\n            }\n            System.out.println("对方已关闭");\n        }\n        server.close();\n    }\n}', title: 'ReadAllDemo.java' },
      { out: '收到：第一行\n收到：第二行\n对方已关闭' },
      { p: 'readLine 读到换行符就返回一行，不带换行符；返回 null 表示对方关闭了输出流，也就是读到了末尾。服务端 try-with-resources 结束时关闭 Socket，客户端才会读到 null。两端都不关，readLine 就会一直等，这正是要设读取超时的原因。' },

      { h: '1.8 粘包拆包的三种解法' },
      { p: '前面说过 TCP 不保留写入边界，解决它只有一条原则：接收方必须能仅凭字节流判断一条消息到哪里结束。三种常见做法各有代价，选哪种取决于消息长度是否固定、内容里能不能出现分隔符。' },
      { p: '第一种定长：每条消息固定 N 字节，不足补齐。实现最简单，读满 N 字节就是一条；缺点是浪费带宽，长度变化大时不适合。第二种分隔符：用换行或特殊字节分隔，readLine 就是这种；缺点是内容里不能出现分隔符，出现了必须转义，否则消息会被切成两条。第三种长度前缀：先发 4 字节表示长度，再发正文，接收方先读 4 字节，再按长度读满。它最通用，二进制协议几乎都这么做。' },
      { p: '错误写法是“发一次就 read 一次”，在本地环回上常常能跑通，一到真实网络就时好时坏，因为环回几乎不拆分，网络中间设备却会按 MTU 切开。修正写法是把读取放进循环：维护一个缓冲区，反复读直到凑够一条完整消息，剩下的字节留给下一条。缓冲区要用 ByteArrayOutputStream 或 ByteBuffer 累积，不要每次 new 一个数组把上次的余量丢掉。' },
      { p: '还要设上限。长度前缀里如果写了一个 2GB 的值，接收方不能真去分配这么大的数组，否则一个畸形包就能把内存打满。做法是先校验长度是否在业务允许的范围内，超限就断开连接并记录日志。同理，按行读也要限制单行最大长度，防止对方一直不发换行把内存拖爆。' },

      { h: '1.9 一条连接的完整生命周期' },
      { p: '客户端这边：new Socket() 只创建对象，connect 才真正握手，所以要在 connect 上设连接超时；连上后先设 setSoTimeout、setTcpNoDelay 这些选项，再开始读写；结束时 close。顺序错了，比如先读再设超时，第一次读仍会用默认的无限等待。' },
      { p: '服务端这边：ServerSocket 绑定端口、listen 之后，未完成握手的连接放在半连接队列，完成握手的放在 accept 队列，accept 从后者取。队列长度由 backlog 决定，来不及 accept 时新连接会被拒绝或丢弃，表现为客户端连上了却马上断开。所以 accept 之后要尽快把活交给线程池，别在 accept 循环里做业务。' },
      { p: '关闭有讲究。close 会同时关掉读写两个方向，缓冲区里没发完的数据可能被丢弃，所以关闭前要 flush。如果只想告诉对方“我不再发了，但还要收”，用 shutdownOutput，这叫半关闭，适合一问一答后等对方收尾的协议。判断对方关闭看 read 返回 -1 或 readLine 返回 null，不要用 available() 猜，它只表示“现在能立刻读到的字节数”，为 0 不代表连接断了。' },
      { p: '常见错误：在 finally 里只关输入流，输出流没关，Socket 仍然占着；或者把 Socket 交给线程池后忘了关，句柄越积越多。修正办法是让持有 Socket 的那一层用 try-with-resources 统一关，别让创建方和关闭方分开。' },

      { h: '1.10 超时、重连与退避' },
      { p: 'Socket 的超时分两类。连接超时约束“建立连接最多等多久”，用 <code>socket.connect(new InetSocketAddress(host, port), timeout)</code> 指定；读取超时约束“等数据最多等多久”，用 <code>setSoTimeout(ms)</code> 指定。<code>new Socket(host, port)</code> 用的是系统默认值，可能长达几十秒。' },
      { lang: 'java', code: 'public class TimeoutDemo {\n    public static void main(String[] args) throws Exception {\n        ServerSocket server = new ServerSocket(9001);\n        new Thread(() -> {\n            try (Socket socket = server.accept()) {\n                Thread.sleep(3000);   // 故意不回数据\n            } catch (Exception ignored) {\n            }\n        }).start();\n\n        Socket client = new Socket("127.0.0.1", 9001);\n        client.setSoTimeout(500);     // 最多等 500 毫秒\n        try (BufferedReader in = new BufferedReader(\n                new InputStreamReader(client.getInputStream(),\n                        StandardCharsets.UTF_8))) {\n            System.out.println("收到：" + in.readLine());\n        } catch (SocketTimeoutException e) {\n            System.out.println("读超时：" + e.getMessage());\n        } finally {\n            client.close();\n        }\n    }\n}', title: 'TimeoutDemo.java' },
      { out: '读超时：Read timed out' },
      { p: '两个超时作用范围不同：连接超时只管握手，读取超时只管等数据。通常两个都要设，并给整个业务调用再加一层总超时，因为一次请求可能包含多次读写。超时后连接状态已不可信，正确做法是关掉重建。' },
      { p: '超时要分层设，缺一层就有一层能把你拖死。连接超时管握手，读取超时管单次读，整体超时管一次业务调用。比如一次调用要读三次响应，每次都设 5 秒，最坏就是 15 秒；如果上游只给你 3 秒，前两层设得再合理也没用。所以整体预算要先定，再往下一层层分配。' },
      { p: '重连不是万能药。连接超时、连接被重置、对方主动关闭，这些可以重连；鉴权失败、参数错误、返回 404，重连多少次都一样。重连前要判断操作是否可重复执行，否则一次超时后重发，可能创建两条记录。' },
      { p: '重连要退避。固定间隔重连在对方过载时会形成同步风暴：所有客户端每秒一起重连，刚恢复的服务又被压垮。指数退避是 200 毫秒、400 毫秒、800 毫秒这样翻倍，再加一点随机抖动，让重连时间错开；同时设次数上限和总时长上限，超过就放弃并上报。' },
      { p: '重连成功后不能假设状态还在。旧连接上的半条消息、未确认的请求、会话里的临时数据都随连接一起失效，需要重新握手、重新登录、重新同步。把“连接”和“会话”分开设计，重连逻辑才不会到处漏。' },

      { h: '1.11 UDP：无连接的另一条路' },
      { p: 'UDP 用 DatagramSocket 收发数据报，每个包自带地址和端口，不需要建立连接。接收前要准备字节数组和 DatagramPacket 当缓冲区，收到的长度用 getLength 取，不能直接拿整个数组。' },
      { lang: 'java', code: 'public class UdpDemo {\n    public static void main(String[] args) throws Exception {\n        DatagramSocket server = new DatagramSocket(9100);\n        new Thread(() -> {\n            try {\n                byte[] buf = new byte[1024];\n                DatagramPacket packet = new DatagramPacket(buf, buf.length);\n                server.receive(packet);\n                String msg = new String(packet.getData(), 0,\n                        packet.getLength(), StandardCharsets.UTF_8);\n                System.out.println("服务端收到：" + msg);\n                byte[] reply = "pong".getBytes(StandardCharsets.UTF_8);\n                server.send(new DatagramPacket(reply, reply.length,\n                        packet.getAddress(), packet.getPort()));\n            } catch (IOException ignored) {\n            }\n        }).start();\n\n        DatagramSocket client = new DatagramSocket();\n        client.setSoTimeout(1000);\n        byte[] data = "ping".getBytes(StandardCharsets.UTF_8);\n        client.send(new DatagramPacket(data, data.length,\n                InetAddress.getByName("127.0.0.1"), 9100));\n        byte[] buf = new byte[1024];\n        DatagramPacket packet = new DatagramPacket(buf, buf.length);\n        client.receive(packet);\n        System.out.println("客户端收到：" + new String(packet.getData(),\n                0, packet.getLength(), StandardCharsets.UTF_8));\n        client.close();\n        server.close();\n    }\n}', title: 'UdpDemo.java' },
      { out: '服务端收到：ping\n客户端收到：pong' },
      { p: 'UDP 的 receive 也会阻塞，同样要设 setSoTimeout。数据报有大小上限，超过 MTU 还可能被分片，丢一个分片整包就废了；应用层要自己决定是否重发。所以实时音视频宁可丢一点包，也不愿为重传把延迟堆起来。' },

      { h: '1.12 TCP 选项、连接失败与传输速度' },
      { p: 'setTcpNoDelay(true) 关闭 Nagle 算法。Nagle 会把小包攒起来一起发，省带宽但增加延迟，交互式协议和小请求多的场景应当关掉；一次性发大块数据时关不关差别不大。' },
      { p: 'setKeepAlive(true) 打开的是 TCP 层的心跳，默认空闲两小时才开始探测，对及时发现断线基本没用。真正的心跳要在应用层做，间隔小于 NAT 和中间设备的空闲回收时间，并且心跳失败要能触发重连。' },
      { p: 'setSoTimeout(0) 表示永不超时，这是默认值，也是线上事故的常见来源。除非你非常确定对方一定响应，否则不要用 0。接收缓冲区 setReceiveBufferSize 要在连接建立前设置才生效，连上再设只是建议值，内核不一定接受。' },
      { p: '还有一个隐蔽的错误：用 PrintWriter 却忘了 autoFlush，或者用 BufferedOutputStream 写完不 flush，数据留在缓冲区里，对方一直等，最后两边都超时。修正办法是明确每次消息写完就 flush，或者用带 autoFlush 的包装并在协议里保证有换行。' },
      { p: '连接失败时的报错不同，含义也完全不同。Connection refused 说明包到了对方主机，但那个端口没人监听，内核直接回了 RST；connect timed out 说明包发出去没有回应，可能是防火墙静默丢包、对方主机不在线，或者路由不通；No route to host 则是本机就知道没有可用路由。看到 refused 先去查服务有没有起，看到 timeout 先查网络和防火墙，方向完全不同。' },
      { p: '服务端还有一个容易忽略的上限：半连接队列。握手没完成的连接排在这里，队列满了新 SYN 会被丢弃，客户端只能不断重试，看起来就是“连接特别慢”。Linux 用 SYN cookie 缓解这一点，代价是部分 TCP 选项丢失。调 backlog 时要同时看内核参数 somaxconn，应用层传的值再大也会被它截断。' },
      { p: '大文件传输慢，未必是带宽不够。TCP 的吞吐上限大致等于窗口大小除以往返时延：窗口 64KB、时延 100 毫秒时，理论上限只有 6Mbps 左右，千兆网也跑不满。这就是带宽时延积，链路越长越需要更大的窗口。开启窗口缩放、调大接收缓冲区，长肥管道才能跑出应有的速度。' },
      { p: '复用连接省下的不只是握手时间。三次握手至少一个往返，TLS 还要再加一两个往返，短连接在高频调用下光建立连接就占掉大半延迟。但长连接不是越长越好：中间设备会静默回收空闲连接，所以要么设空闲上限，要么用心跳保活，并在使用失败时重建。' },
      { p: '关闭时还有一个选项值得知道：SO_LINGER。默认行为是尽量把数据发完，耗时由内核决定；把 linger 设为 0 再 close，内核会直接发 RST，未发完的数据全部丢弃。这能立刻释放端口，但对方会看到连接被重置，只在明确要丢弃时才用。' },
      { p: 'TIME_WAIT 让人又爱又恨。它保护最后一个 ACK 能到达、旧报文不会串到新连接，所以不能简单取消。服务端作为被动关闭方一般不会积累大量 TIME_WAIT；如果你的服务主动关闭连接又出现端口耗尽，先考虑改用连接池，而不是打开 tcp_tw_reuse 之类的开关硬扛。' },
      { p: '最后说 MTU。以太网常见 1500 字节，IP 头加 TCP 头占掉一部分，单个报文能带的应用数据更少。应用层一次 write 一万字节，内核会自动切成多个段，这不算拆包问题，而是正常分片；真正要担心的是 UDP 超过 MTU 被 IP 分片，丢一片就整包报废。' },

      { h: '1.13 常见异常、抓包与排查顺序' },
      { p: '先看异常类型，再查端口和地址，最后才怀疑代码逻辑，多数问题很快能定位。' },
      { table: { head: ['异常', '常见原因', '排查方向'], rows: [
        ['<code>ConnectException</code>', '端口没监听、被防火墙拒绝', '服务是否启动，端口是否写错'],
        ['<code>SocketTimeoutException</code>', '对方没在超时内响应', '对方处理慢、网络不通、超时太短'],
        ['<code>UnknownHostException</code>', '域名解析失败', 'hosts、DNS、域名拼写'],
        ['<code>BindException</code>', '端口已被占用', '换端口，或查谁占了端口'],
        ['<code>Connection reset</code>', '对方强制关闭或进程崩溃', '看对方日志、是否提前 close']
      ] } },
      { p: '还有一类不是异常而是资源问题：Too many open files。每个 accept 出来的 Socket 都要关闭，否则句柄越积越多，最后连新连接都建不了。try-with-resources 是成本最低的防线，别指望 finally 里手写 close。' },
      { p: '排查网络问题有一个便宜又有效的顺序：先解析，再端口，再握手，最后才看应用。域名解析用 nslookup 或 dig 确认拿到的是不是你预期的 IP；端口用 nc -vz 主机 端口 探一下，连不上说明服务没起或被防火墙拦；通了但没响应，才进入抓包。' },
      { p: '抓包看三件事：三次握手有没有完成、有没有 RST、有没有大量重传。只看到 SYN 没有 SYN+ACK，通常是对方没监听或被中间设备丢弃；握手完成后立刻 RST，多半是对方进程崩溃或主动拒绝；同一段数据反复重传，说明链路丢包或窗口为零。Wireshark 里用 tcp.port == 9000 过滤，命令行用 tcpdump -i any port 9000 -nn，先抓少量包再分析，别一上来抓几个 G。' },
      { p: '本机视角用 ss -tanp 看连接状态和所属进程，比 netstat 快。大量 SYN_RECV 说明半连接队列满了，可能在被 SYN Flood；大量 CLOSE_WAIT 说明代码里 accept 之后没关；大量 TIME_WAIT 说明短连接太多。这些状态是内核给的证据，比在代码里猜可靠。' },
      { p: '应用层再补两招：curl -v 看请求头和响应头，确认方法、路径、Content-Type、状态码；在客户端打印耗时分解，DNS 多久、连接多久、首字节多久、读完多久，哪一段长就查哪一段。没有分解的“接口慢”无法定位，只能靠猜。' },
      { p: '把上面这些排查手段串起来看，初学者最容易踩的还是下面五个坑，每一个都能让测试环境一切正常、线上却出问题。' },
      { list: [
        '不设任何超时，测试环境正常，线上对方一慢线程就堆住。',
        '服务端 accept 后忘了关闭 Socket，句柄泄漏。',
        '用平台默认编码读写，中文跨系统就乱码。',
        '以为一次 write 对应一次 read，没处理粘包拆包。',
        '把 UDP 当可靠传输用，丢包了还以为代码有 bug。'
      ] },

      { h: '1.14 本章小结' },
      { list: [
        'IP 定位主机，端口定位进程；127.0.0.1 只限本机，0.0.0.0 监听所有网卡。',
        'TCP 面向连接、可靠有序；UDP 无连接、开销小但不保证到达。',
        '三次握手让双方确认收发能力与初始序列号；四次挥手后主动方进入 TIME_WAIT。',
        '客户端 Socket，服务端 ServerSocket，accept 返回一条新连接。',
        '连接超时和读取超时必须显式设置，超时后关闭重建。',
        'TCP 是字节流，消息边界要应用层自己约定；资源用 try-with-resources 关闭。'
      ] },

      { h: '1.15 常见追问' },
      { list: [
        '<b>问：为什么是三次握手？</b><br>答：两次不够，因为双方要各自确认两件事：我能发、你能收。客户端发 SYN，服务端回 SYN+ACK，这一句同时确认了客户端的发送能力和自己的接收能力；客户端再回 ACK，服务端才知道自己的 SYN 也送到了、自己的发送能力也被确认。另外 SYN 会各自携带初始序列号，而确认号依赖对方先给出序列号，一来一回至少就是三次。',
        '<b>问：TCP 一定不丢数据吗？</b><br>答：它保证的只是按序可靠传输，而且只覆盖连接正常期间、已经进入发送缓冲区并且被确认的数据。进程崩溃、机器断电、网线被拔时，缓冲区里还没发出去或没被确认的数据就丢了，对端还可能一直在等。至于「这次下单到底成没成」这种业务语义，必须由幂等键、确认协议或事务来保证，不能指望传输层。',
        '<b>问：accept 之后为什么还要新开线程？</b><br>答：<code>accept</code> 只做一件事——从内核里已完成三次握手的队列取一个连接，返回一个新的 Socket。这个 Socket 上的 <code>read</code> 和 <code>write</code> 都是阻塞的，如果就在 accept 线程里读写，一个慢客户端就能让服务端再也接不了新连接。所以常见结构是 accept 线程只负责接，读写交给线程池；连接数很大时改用 NIO，一个线程管理成百上千个连接。',
        '<b>问：短连接和长连接怎么选？</b><br>答：看请求密度和连接代价。请求稀疏、交互很短、客户端不多，用短连接最简单，断了重建就行；服务之间高频调用则必须用长连接或连接池，否则每次都要三次握手、TLS 协商，而且主动关闭的一方会留下一堆 TIME_WAIT，端口耗尽很快变成新故障。判断标准很直接：一次请求的握手成本占比越高，就越该复用连接。',
        '<b>问：本地能连、局域网连不上？</b><br>答：九成是绑定地址或防火墙。服务端绑在 127.0.0.1 时只有本机能连，要改成 0.0.0.0 或指定网卡地址；其次是防火墙、云安全组有没有放行这个端口。再往下才是路由问题：用 ping 和 telnet 端口分开测，能 ping 通但端口连不上，说明是被拦截而不是网络不通。'
      ] },

      { h: '1.16 自测与练习' },
      { ol: [
        '写一个回声服务端：客户端发一行，服务端原样返回；再开第二个客户端连接，观察 accept 的行为。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.*;\nimport java.net.*;\n\npublic class EchoServer {\n  public static void main(String[] args) throws Exception {\n    try (var server = new ServerSocket(9000)) {\n      while (true) {\n        var s = server.accept();   // 第二个连接在这里排队\n        try (s; var in = new BufferedReader(\n                 new InputStreamReader(s.getInputStream()));\n             var out = new PrintWriter(\n                 s.getOutputStream(), true)) {\n          String line;\n          while ((line = in.readLine()) != null) {\n            out.println(line);\n          }\n        }\n      }\n    }\n  }\n}\n\nclass EchoClient {\n  public static void main(String[] args) throws Exception {\n    try (var s = new Socket("127.0.0.1", 9000);\n         var out = new PrintWriter(s.getOutputStream(), true);\n         var in = new BufferedReader(\n             new InputStreamReader(s.getInputStream()))) {\n      out.println("hello");\n      System.out.println(in.readLine());\n    }\n  }\n}</pre><b>要点</b>：javac EchoServer.java，两个终端分别 java EchoServer 与 java EchoClient。只要第一个客户端不断开，第二个连接就停在 accept 之前——三次握手内核已经做完，你的进程还没接管它。要同时服务就得每连接开线程，或改用 Selector。</div></details>',
        '给上面的客户端加读取超时，把服务端改成 sleep 3 秒，验证超时异常。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.*;\nimport java.net.*;\n\npublic class TimeoutClient {\n  public static void main(String[] args) throws Exception {\n    try (var s = new Socket("127.0.0.1", 9000)) {\n      s.setSoTimeout(1000);        // 读超时 1 秒\n      var in = new BufferedReader(\n          new InputStreamReader(s.getInputStream()));\n      try {\n        System.out.println(in.readLine());\n      } catch (SocketTimeoutException e) {\n        System.out.println("超时：" + e.getMessage());\n      }\n    }\n  }\n}\n\nclass SlowServer {\n  public static void main(String[] args) throws Exception {\n    try (var server = new ServerSocket(9000);\n         var s = server.accept();\n         var out = new PrintWriter(s.getOutputStream(), true)) {\n      Thread.sleep(3000);          // 故意拖过客户端的 1 秒\n      out.println("hello");\n    }\n  }\n}</pre><b>要点</b>：<code>setSoTimeout</code> 只作用于之后的 read，超时抛 <code>SocketTimeoutException</code>（SocketException 的子类），连接本身还在；连接超时是另一件事，用 <code>socket.connect(addr, 1000)</code>。</div></details>',
        '解释为什么 <code>readLine</code> 返回 null 代表对方关闭，而不是读到空字符串。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：对方关闭连接后 <code>readLine</code> 立刻返回 null，循环随之退出；如果对方发的是一个空行，返回的是空字符串，循环会继续往下读。<b>为什么</b>：读到流结束（EOF）时已经没有任何内容可返回，只能用 null 表示「没有下一行了」；而空字符串表示「确实有一行，内容为空」，两者在协议上是完全不同的意思。<b>要点</b>：判断必须写 <code>if (line == null) break;</code>，不能写 <code>line.isEmpty()</code>；用 <code>BufferedReader</code> 读时还要注意字符集，别用平台默认编码。</div></details>',
        '用 ss 或 netstat 查出本机 80、3306、6379 三个端口分别被哪个进程占用。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="shell"># Linux（-p 要 root 才看得到别人的进程名）\nss -ltnp \'( sport = :80 or sport = :3306 or sport = :6379 )\'\nnetstat -lntp | grep -E \':(80|3306|6379)[[:space:]]\'\n\n# macOS 没有 ss，用 lsof\nlsof -nP -iTCP:80 -sTCP:LISTEN\nlsof -nP -iTCP:3306 -sTCP:LISTEN\nlsof -nP -iTCP:6379 -sTCP:LISTEN</pre><b>要点</b>：只认 LISTEN 那一行才算“端口被占”，TIME_WAIT、CLOSE_WAIT 是连接状态不是监听。<code>-l</code> 只看监听，<code>-n</code> 不解析服务名，<code>-p</code> 带出进程，<code>-P</code> 让 lsof 不把端口翻成服务名。</div></details>'
      ] },

    ]
  };

  T['http-client-server'] = {
    meta: '本章约 5500 字 · 建议 32 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '2.1 为什么学 HTTP 客户端与服务端' },
      { p: '只要你的程序要和别的系统说话，大概率是通过 HTTP。调用第三方接口、给自己的前端提供数据、写一个健康检查、在本地做 Mock，都是“发一个请求”和“接一个请求”这两件事的不同包装。' },
      { p: 'JDK 11 起自带 HttpClient，取代了又老又难用的 HttpURLConnection：它支持同步与异步、HTTP/2、连接复用。JDK 里还有一个轻量的 HttpServer，适合学习、写测试桩和做演示，不适合直接上生产。这一章把请求、响应、路由、JSON 与异常连成一条线。' },

      { h: '2.2 一次请求到底发了什么' },
      { p: 'HTTP 是文本协议。请求由四部分组成：请求行（方法、路径、版本）、请求头、一个空行、请求体。响应结构对称：状态行（版本、状态码、短语）、响应头、空行、响应体。空行是头和体的分界，不能省略。' },
      { lang: 'http', code: 'POST /api/books HTTP/1.1\nHost: example.com\nContent-Type: application/json\nContent-Length: 27\n\n{"title":"Java 网络编程"}', title: '原始 HTTP 请求（纯文本）' },
      { p: '几个头必须认识：Host 指定虚拟主机；Content-Type 说明 body 的格式；Content-Length 告诉对方 body 有多少字节，或者用 Transfer-Encoding: chunked 分块发送；Accept 表达客户端期望的响应格式；Cookie 传递会话。' },
      { p: '响应头里，Content-Type 决定你怎么解析 body，Cache-Control 影响缓存，Set-Cookie 让客户端保存会话，Location 配合 3xx 完成跳转。只读 body 不看 Content-Type，是乱码和解析失败最常见的来源。' },

      { h: '2.3 方法与状态码' },
      { p: '方法表达意图：GET 查询、POST 创建、PUT 全量替换、PATCH 部分修改、DELETE 删除、HEAD 只要头。方法本身不强制语义，但中间设备、缓存和框架都按这套约定工作，所以不要用 GET 去改数据。' },
      { table: { head: ['方法', '语义', '幂等', '请求体'], rows: [
        ['GET', '查询资源', '是', '无'],
        ['POST', '创建资源', '否', '有'],
        ['PUT', '全量替换', '是', '有'],
        ['PATCH', '部分修改', '不一定', '有'],
        ['DELETE', '删除资源', '是', '通常无'],
        ['HEAD', '只取响应头', '是', '无']
      ] } },
      { p: '幂等指“执行一次和执行多次，服务端最终状态相同”。GET、PUT、DELETE 应当幂等，POST 通常不幂等。这直接决定失败后能不能自动重试：请求超时后重发 POST，可能创建两笔订单；重发 PUT，结果通常一样。' },
      { table: { head: ['状态码', '含义', '排查方向'], rows: [
        ['1xx', '信息，继续处理', '客户端一般不用管'],
        ['2xx', '成功：200、201、204', '看 body 是否符合预期'],
        ['3xx', '重定向：301、302、304', '看 Location 与缓存'],
        ['4xx', '客户端错误：400、401、403、404、429', '查参数、鉴权、路径、限流'],
        ['5xx', '服务端错误：500、502、503、504', '看服务端日志、网关与后端']
      ] } },
      { p: '排查方向由首位数字决定：4xx 先看自己发了什么，5xx 先看对方。502 是网关连不上后端，504 是网关等后端超时，这两种错误通常不在客户端代码里，但值得在日志里区分清楚。' },

      { h: '2.4 先准备一个本地服务端' },
      { p: '学客户端最有效的办法，是先有一个自己能控制的服务端。下面用 JDK 自带的 HttpServer 写一个测试服务端，注册三个路径：查询一本书、创建一本书，以及一个故意慢 2 秒的接口。后面几节的客户端都向它发请求。' },
      { lang: 'java', code: 'public class TestServer {\n    public static void main(String[] args) throws Exception {\n        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);\n        server.createContext("/books/1", ex -> reply(ex, 200,\n                "{\\"id\\":1,\\"title\\":\\"Java 网络编程\\"}", "application/json"));\n        server.createContext("/books", ex -> {\n            String text = new String(ex.getRequestBody().readAllBytes(),\n                    StandardCharsets.UTF_8);\n            System.out.println("收到：" + text);\n            reply(ex, 201, "created", "text/plain");\n        });\n        server.createContext("/slow", ex -> {\n            try {\n                Thread.sleep(2000);\n            } catch (InterruptedException ignored) {\n            }\n            reply(ex, 200, "slow", "text/plain");\n        });\n        server.setExecutor(Executors.newFixedThreadPool(4));\n        server.start();\n        System.out.println("已启动：http://127.0.0.1:8080/books/1");\n    }\n\n    static void reply(HttpExchange ex, int status, String text, String type)\n            throws IOException {\n        byte[] body = text.getBytes(StandardCharsets.UTF_8);\n        ex.getResponseHeaders().add("Content-Type", type + "; charset=utf-8");\n        ex.sendResponseHeaders(status, body.length);\n        ex.getResponseBody().write(body);\n        ex.close();\n    }\n}', title: 'TestServer.java' },
      { out: '已启动：http://127.0.0.1:8080/books/1' },
      { p: '三处值得注意：createContext 注册的是路径前缀，匹配时最长前缀优先；handler 必须自己写状态码、响应头和 body，最后调用 close；setExecutor 换成固定线程池，否则默认是单线程，并发请求只能排队。' },
      { flow: ['客户端构造 HttpRequest', 'HttpClient 建立或复用连接', '服务端按最长前缀匹配路由', 'handler 读请求并写响应', '客户端拿到状态码与 body', '按 Content-Type 解析内容'] },
      { p: '助手方法 reply 把编码、设头、写状态、写体、关闭收在一处，避免每个 handler 重复。真实项目不会手写这些，Spring Boot 的 @GetMapping 已经替你做了路由和序列化；但知道底层在做什么，排错时就不会被框架挡住。' },

      { h: '2.5 用 HttpClient 发 GET' },
      { p: 'HttpClient 是线程安全、可复用的，内部维护连接池，应该创建一次全局共享。每次请求都 new 一个，就丢掉了连接复用，还会堆积线程和连接。<code>newHttpClient()</code> 用默认配置，需要超时、代理、HTTP/2 时用 <code>newBuilder()</code>。' },
      { lang: 'java', code: 'public class GetDemo {\n    public static void main(String[] args) throws Exception {\n        HttpClient client = HttpClient.newHttpClient();\n        HttpRequest request = HttpRequest.newBuilder()\n                .uri(URI.create("http://127.0.0.1:8080/books/1"))\n                .header("Accept", "application/json")\n                .GET().build();\n        HttpResponse<String> response =\n                client.send(request, HttpResponse.BodyHandlers.ofString());\n        System.out.println(response.statusCode());\n        System.out.println(response.body());\n        System.out.println(response.headers()\n                .firstValue("content-type").orElse("无"));\n    }\n}', title: 'GetDemo.java' },
      { out: '200\n{"id":1,"title":"Java 网络编程"}\napplication/json; charset=utf-8' },
      { p: 'send 是同步的，会阻塞到响应回来。<code>BodyHandlers.ofString()</code> 按响应头里的字符集把字节解码成字符串；二进制响应用 ofByteArray，大文件用 ofFile。返回的 body 只是字符串，要变成对象还得靠 JSON 库。' },
      { p: '顺序很重要：先看 statusCode，再决定要不要解析 body。404 的 body 往往是一段 HTML 错误页，直接按 JSON 解析会得到一个和真实原因无关的异常，把排查带偏。示例省略了 import。' },

      { h: '2.6 POST 与 JSON 请求体' },
      { p: 'POST 有三件事不能少：方法写成 POST、设置 Content-Type、把 body 交给 BodyPublishers。用 ofString 时顺手指定 UTF-8，中文才不会变成问号。服务端拿到的 Content-Type 决定了它怎么解析你的 body。' },
      { lang: 'java', code: 'public class PostDemo {\n    public static void main(String[] args) throws Exception {\n        String json = "{\\"title\\":\\"Java 网络编程\\"}";\n        HttpRequest request = HttpRequest.newBuilder()\n                .uri(URI.create("http://127.0.0.1:8080/books"))\n                .header("Content-Type", "application/json")\n                .POST(HttpRequest.BodyPublishers.ofString(json,\n                        StandardCharsets.UTF_8))\n                .build();\n        HttpResponse<String> response = HttpClient.newHttpClient()\n                .send(request, HttpResponse.BodyHandlers.ofString());\n        System.out.println(response.statusCode() + " " + response.body());\n    }\n}', title: 'PostDemo.java' },
      { out: '201 created\n服务端控制台：收到：{"title":"Java 网络编程"}' },
      { p: '如果服务端要求 JSON，而你忘了 Content-Type，很多框架会按表单解析，字段全是 null，看起来像“参数没传”。另一个常见问题是 Content-Length 和实际字节数不一致，服务端会一直等剩下的字节，最后超时。' },
      { p: 'POST 失败后不要盲目重试。比较稳的做法是带一个幂等键（例如 Idempotency-Key 头），或者重试前先查一次业务状态。没有幂等保证的重试，是把一次故障放大成两次。' },

      { h: '2.7 异步：sendAsync' },
      { p: 'sendAsync 返回 CompletableFuture，调用后立刻返回，不占住当前线程。适合同时发多个互不依赖的请求，也适合不想让一个慢接口拖住整个线程的场景。它不会替你处理异常：异常会包在 CompletionException 里，从 join 或 exceptionally 拿到。' },
      { lang: 'java', code: 'public class AsyncDemo {\n    public static void main(String[] args) {\n        HttpClient client = HttpClient.newHttpClient();\n        List<CompletableFuture<HttpResponse<String>>> tasks = new ArrayList<>();\n        for (int i = 0; i < 2; i++) {\n            HttpRequest request = HttpRequest.newBuilder()\n                    .uri(URI.create("http://127.0.0.1:8080/books/1"))\n                    .GET().build();\n            tasks.add(client.sendAsync(request,\n                    HttpResponse.BodyHandlers.ofString()));\n        }\n        CompletableFuture.allOf(\n                tasks.toArray(new CompletableFuture[0])).join();\n        tasks.forEach(t -> System.out.println(t.join().statusCode()));\n    }\n}', title: 'AsyncDemo.java' },
      { out: '200\n200' },
      { p: '并发发多个请求时用 allOf 等全部完成，再统一取结果；用 anyOf 则是谁先回来先用谁。注意 sendAsync 的线程不是“全 JVM 共享池”：没指定 executor 时，每个 HttpClient 实例在第一次发请求时自建一个无上限的缓存线程池（线程名形如 <code>HttpClient-1-Worker-0</code>、daemon 线程），实测两个客户端会各自出现一组 worker 线程。所以一次发几千个请求不会去抢公共池，但会直接把线程数顶到几千；要控并发就传自己的 <code>Executor</code>，或者先用信号量限流。' },

      { h: '2.8 超时、异常与重试的边界' },
      { p: 'HttpClient 有两个层级的超时：connectTimeout 管建立连接，HttpRequest.timeout 管整个请求，从发出到响应体读完。只设前者，遇到“连上了但服务端不返回”的情况仍会一直等。' },
      { lang: 'java', code: 'public class TimeoutDemo {\n    public static void main(String[] args) throws Exception {\n        HttpClient client = HttpClient.newBuilder()\n                .connectTimeout(Duration.ofSeconds(2))\n                .build();\n        HttpRequest request = HttpRequest.newBuilder()\n                .uri(URI.create("http://127.0.0.1:8080/slow"))\n                .timeout(Duration.ofMillis(300))\n                .GET().build();\n        try {\n            client.send(request, HttpResponse.BodyHandlers.ofString());\n            System.out.println("正常返回");\n        } catch (HttpTimeoutException e) {\n            System.out.println("请求超时");\n        } catch (IOException e) {\n            System.out.println("网络异常：" + e.getMessage());\n        }\n    }\n}', title: 'TimeoutDemo.java' },
      { out: '请求超时' },
      { p: '常见异常：ConnectException 连不上；HttpTimeoutException 超时；UnknownHostException 域名解析失败；IOException 连接被中断。send 抛的是受检异常，必须处理；而 4xx、5xx 不会抛异常，只是状态码，所以“没报错”不等于“成功了”。' },
      { p: '重试要有选择：连接超时、503、429 可以重试，400、401、404 重试没有意义。重试之间要退避，比如 200 毫秒、400 毫秒、800 毫秒，并设次数上限。没有退避的重试，会在对方最虚弱的时候再补几脚。' },
      { p: '重试的前提是判断这次失败到底有没有生效。请求超时最麻烦：可能请求根本没到，也可能到了、执行了、响应在回来的路上丢了。对 POST 来说，客户端无法区分这两种情况，盲目重试就会重复创建。' },
      { p: '解决办法是让服务端支持幂等键：客户端为一次业务操作生成唯一 ID，放在 Idempotency-Key 头里；服务端第一次见到就执行并保存结果，再次见到同一个键直接返回上次的结果。键要由客户端生成、重试时保持不变，不能每次重试都换一个。' },
      { p: '重试要有预算：最多几次、总共最多多久、哪些状态码可重试。429 看 Retry-After，503 可以退避后重试，500 要看错误是否明确可恢复，400、401、403、404 一律不重试。重试耗时要计入整体超时，别让 3 秒的预算被重试拖成 30 秒。' },
      { p: '错误写法是用 catch (Exception e) 包住整个调用然后无条件重试，连 JSON 解析失败也重试。修正写法是先分类：网络类异常、可重试状态码、不可重试状态码、解析异常，只对前两类进入重试，其余直接抛出并带上原始响应。' },

      { h: '2.9 HttpClient 的连接池与并发' },
      { p: 'HttpClient 内部有连接池。HTTP/1.1 下一条连接同时只能跑一个请求，池子里要保持若干条空闲连接；HTTP/2 下一条连接可以多路复用，多个请求共享。所以复用一个 HttpClient 实例，既是省握手，也是让池子真正发挥作用。' },
      { p: '池子有上限，可以用系统属性调整。并发请求数远大于连接数时，多出来的请求排队等连接，表现出来是没报错但很慢。这时候要么调大池子，要么在业务层限流，别让几千个请求同时挤进来。' },
      { p: '连接泄漏的典型原因是响应体没读完。只要 body 没读到末尾，这条连接就不能还给池子，只能丢弃。ofString、ofByteArray 会读完，ofInputStream 就必须自己读完或关闭。流式处理大文件时尤其要注意，处理到一半抛异常，也要在 finally 里关流。' },
      { p: '异步请求的线程默认由客户端自己管：没传 executor 时每个 HttpClient 各建一个无上限的缓存线程池（线程名形如 <code>HttpClient-1-Worker-0</code>、daemon），几千个并发就是几千个线程，而不是去抢某个公共池。所以要控并发就显式传入固定大小的线程池（或先用信号量限流），把 sendAsync 的 Executor 交给它。另外，返回的 CompletableFuture 即使不 join 也要处理异常，否则失败会被静默吞掉。' },

      { h: '2.10 HttpServer 的路由与线程模型' },
      { p: 'createContext 注册的是前缀，不是精确路径。注册了 /books，那么 /books、/books/1、/books/1/detail 都会进来，匹配时最长前缀优先。所以 /books/1 和 /books 可以分别注册，前者更具体，会先命中。路径参数要自己从 getRequestURI 解析，HttpServer 不提供占位符语法。' },
      { p: '一个 context 对应一个 handler，方法和查询串都要在 handler 里判断。错误写法是只按路径分派、不看方法，结果 GET 和 DELETE 走了同一段逻辑。修正写法是先取 getRequestMethod，再决定行为，不支持的方法返回 405 并在 Allow 头里列出支持的方法。' },
      { p: '响应头必须在 sendResponseHeaders 之前设置，调用之后再加就不生效。body 长度为 0 时传 -1，表示没有响应体；要分块发送传 0，然后自己写多少算多少。handler 抛异常时连接会被直接断开，客户端看到的是连接被重置，所以要在外层包 try-catch，返回 500 并记录日志。' },
      { p: 'setExecutor 决定并发能力。不设置时是单线程，一个慢请求就能把所有请求堵住；设成固定线程池，池满后新请求排队。create 的第二个参数是 backlog，控制等待 accept 的队列长度，太小会在高并发时丢连接。exchange 用完必须 close，否则连接不会释放。' },

      { h: '2.11 报文边界与请求体的正确读法' },
      { p: 'HTTP 报文看着简单，真正难的是边界。头和体之间靠一个空行分隔，体到哪里结束由 Content-Length 或 Transfer-Encoding: chunked 决定。两者都没有时，服务端只能读到连接关闭为止，这是 HTTP/1.0 的用法，效率低，也无法复用连接。' },
      { p: '头字段名不区分大小写，Content-Type 和 content-type 是一回事；同名头可以出现多次，比如 Set-Cookie，取值时不能只取第一个。头里不能有裸换行，中文要按规范编码，否则可能被截断或直接拒绝。' },
      { p: '请求体是一条只能读一次的流。HttpExchange.getRequestBody() 返回 InputStream，读完就没了，想在 handler 里既打日志又解析，必须先把字节读进数组再复用。错误写法是调用两次 readAllBytes，第二次拿到空数组，表现成参数莫名其妙丢了。' },
      { p: '还有 100-continue：客户端先发头，问服务端要不要 body，服务端同意再发，避免白传一个大文件。HttpClient 需要显式打开 expectContinue 才会等这个响应。日常业务很少用到，但看到 100 状态码不要当成错误。' },

      { h: '2.12 JSON 的边界与绑定的坑' },
      { p: 'JDK 没有内置 JSON 库，真实项目通常用 Jackson 或 Gson。以 Jackson 为例，ObjectMapper 的 readValue 把字符串转对象，writeValueAsString 把对象转字符串；它对未知字段、null、类型不匹配都很敏感，需要按场景配置。' },
      { list: [
        '手拼 JSON 要处理引号、反斜杠和换行转义，字符串里出现双引号就会坏掉。',
        '数字和字符串不能混：<code>"59"</code> 和 <code>59</code> 在强类型绑定时会报错。',
        '嵌套结构不要用 substring 或正则解析，层级一深就会错。',
        '日期格式要显式约定，否则一边是时间戳、一边是 ISO 字符串。',
        '解析前先看状态码和 Content-Type，错误页不是 JSON。'
      ] },
      { p: '用 Jackson 绑定时，最常见的三个报错是：多了一个不认识的字段、类型对不上、日期格式不认。前两个可以在 ObjectMapper 上配置，比如关闭 FAIL_ON_UNKNOWN_PROPERTIES、允许数字按字符串读；日期建议统一用 ISO-8601 字符串，并显式设置时区，别依赖机器默认值。' },
      { p: '泛型要显式告诉 Jackson。直接 readValue 传 List.class，拿到的是元素为 LinkedHashMap 的列表，再逐个强转成 Book 会在运行时抛 ClassCastException。正确写法是用 TypeReference 带上 Book 的泛型，把类型信息保留下来。' },
      { p: 'null 和字段不存在是两件事。绑定成对象后两者都表现为 null，但业务含义不同：一个是对方明确传了空，一个是对方没传、应该用默认值。需要区分时先用 JsonNode 取节点，再用 has 判断字段是否存在。' },
      { p: '对外返回错误时要有统一结构，比如 code、message、traceId 三个字段。不要把异常堆栈直接返回给客户端：既泄露实现细节，也让调用方无法稳定解析。内部用日志记录完整堆栈并带上 traceId，外部只给可读的提示和同一个 traceId，排查时两边对得上。' },
      { p: '序列化方向也有坑。对象里的 getter 可能触发懒加载，把不该出现的字段带进 JSON；两个对象互相引用还会直接栈溢出。给对外 DTO 加显式注解、只暴露需要的字段，比事后加过滤更省事。' },

      { h: '2.13 客户端上线前的检查清单与常见错误' },
      { p: '一个能上线的 HTTP 客户端至少要回答六个问题：连接超时和请求超时分别是多少；失败重试几次、怎么退避；连接池多大、并发多少；响应体有没有读完并关闭；日志能不能定位是哪个下游、哪次请求；鉴权失败和限流分别怎么处理。' },
      { p: '常见错误是把这些参数写死在代码里，测试环境合适、生产环境全错。修正写法是集中到配置，按下游分别设置，并在启动日志里打印实际生效的值。HttpClient 线程安全，但没有自动的熔断和指标，需要自己在调用层包一层，记录耗时、成功率、重试次数。' },
      { p: '最后是 TLS。访问 https 时，证书校验失败不要用信任所有证书绕过，那等于关掉身份验证；正确做法是把自签证书导入信任库，或者给测试环境单独配一个只信任该证书的 HttpClient。生产证书要监控过期时间，过期当天所有调用会一起失败。' },
      { p: '健康检查要单独设计。只检查端口通不通，等于没检查：进程活着但数据库连不上、线程池满了，端口照样通。真正有用的是检查关键依赖并返回有区分度的状态，检查接口本身别做重操作。' },
      { p: '关闭服务时不要立刻杀进程。先停止接收新请求，等在处理的请求收尾、把连接池关掉，再退出。否则每次发布都会有一批连接被重置，用户看到的是偶发失败，事后又很难复现。' },
      { p: '清单过完再对一遍下面这六个高频错误，它们几乎都在测试环境看不出来，一到线上就变成“偶发失败”。' },
      { list: [
        '每次请求 new 一个 HttpClient，连接池完全没用上。',
        '不判状态码直接解析 body，把错误页当成业务数据。',
        'POST 忘记 Content-Type，服务端按表单解析，字段全是 null。',
        '只设连接超时，不设请求超时，慢接口把线程占满。',
        'HttpServer 的 handler 忘记 close exchange，连接悬挂。',
        '对 POST 无脑重试，重复创建订单。'
      ] },

      { h: '2.14 联调与线上排查' },
      { p: '联调第一步确认请求真的发出去了。一条合格的客户端日志要包含方法、完整 URL、状态码、总耗时、响应体片段和请求 ID；只打了 URL、没打状态码的日志，出问题时等于什么都没说。' },
      { p: '现象和原因可以对照着看：连接被拒绝，说明端口没有监听或防火墙拦了；请求超时，说明连上了但迟迟没有响应；401 是凭证没带或已过期；404 多半是路径拼错或网关转发规则不对。' },
      { p: '502 一般是后端进程挂了、端口填错，或者后端启动失败；504 是网关等后端超时，而客户端的超时设置更宽松。看到 5xx 先确认这是不是自己的服务返回的，有些网关会用自己的错误页覆盖后端响应。' },
      { p: '用 curl 复现是最快的手段。把同样的方法、头、体交给 curl：curl 成功而程序失败，问题在客户端代码，比如头没设、体被读了两次、代理配置不同；curl 也失败，问题在服务端或网络，别在客户端里瞎改。' },
      { p: '服务端看时间线：进来的日志和出去的日志都有，说明请求进来了只是慢；只有进来的没有出去的，说明卡在中间或抛了异常；两条都没有，说明请求根本没到这一层，往上查网关和端口。' },
      { p: '读日志还要注意顺序。多线程服务里日志是交错的，按时间排好再按请求 ID 分组，否则会把两个请求的片段拼成一条假线索。请求 ID 最好在入口生成，并放进响应头返回给调用方。' },
      { p: '环境差异是最容易被忽略的一类：本地用 http、线上用 https；本地直连、线上走代理；两边时区不同导致签名过期。出问题先对比 URL、端口、证书和时区，再怀疑代码。' },
      { p: '还有一个隐形差异是字符集。客户端按 UTF-8 序列化，服务端按 GBK 解码，中文就成乱码，英文却一切正常，很容易误判成编码以外的原因。请求和响应都应显式声明 UTF-8。' },
      { p: '排查完要留下记录：症状、定位过程、根因、修复方式，写进值班文档。下次同类问题出现时，十分钟能定位的问题不该再花两小时。' },

      { h: '2.15 把网络代码写得可维护' },
      { p: '把 HTTP 调用收进一个薄薄的客户端类，业务代码只调方法、不拼 URL。超时、重试、鉴权、日志只有一份实现，将来换版本或加监控只改一处。' },
      { p: '请求和响应都定义成明确的类型，不要用 Map 传来传去。字段名写错在编译期就能发现，比运行时拿到 null 强得多；对外字段名和内部不一致时用注解写明映射，别靠命名碰运气。' },
      { p: '错误要分层：网络层抛连接异常，协议层抛非 2xx，业务层根据响应里的 code 判断。三层混在一起，调用方只能 catch 一个大异常然后放弃处理。' },
      { p: '给每个请求带上追踪 ID，从入口一路传到下游，日志里打同一个值。出了问题按这个 ID 一搜，整条链路都能串起来，比按时间猜快得多。' },
      { p: '测试时不要真的连外网。用本地起的 HttpServer 或模拟对象返回固定响应，专门测超时、404、500、坏 JSON 这几种分支；这些分支平时最难触发，却最容易把线上搞挂。' },
      { p: '配置项要能改而不重新打包。超时、重试次数、下游地址放进配置文件或环境变量，并给默认值；改一个超时要重新发版，说明配置设计有问题。' },
      { p: '别在 handler 或回调里做重活。解析大文件、写数据库、调另一个服务，都应该交给专门的线程池，否则一个慢操作会拖垮整条连接的处理。' },
      { p: '对外接口要能演进。新增字段可以，删字段和改含义不行；需要废弃时先保留一段时间、在文档和响应头里标注，再下线。客户端版本不可能同时升级，兼容期要给足。' },
      { p: '最后是命名和注释：方法名写清楚它做什么、失败时抛什么，比一段解释性注释有用。半年后回来看代码的人，最先需要知道的是这个调用会不会抛异常、超时多久。' },

      { h: '2.16 本章小结' },
      { list: [
        '请求 = 请求行 + 头 + 空行 + 体；响应 = 状态行 + 头 + 空行 + 体。',
        '方法表达意图，幂等性决定能否自动重试。',
        '状态码首位定方向：4xx 查自己，5xx 查对方。',
        'HttpClient 全局复用一个实例，send 同步、sendAsync 异步。',
        'HttpServer 用 createContext 注册路由，handler 自己写状态码并 close。',
        '超时分连接与请求两层，重试只对幂等请求做，并且要退避。'
      ] },

      { h: '2.17 常见追问' },
      { list: [
        '<b>问：HttpClient 和 HttpURLConnection 怎么选？</b><br>答：新代码一律用 <code>HttpClient</code>：API 清晰，默认支持 HTTP/2，异步不用自己管线程，超时、重定向、代理都有显式配置项。老代码里的 <code>HttpURLConnection</code> 没必要为了改而改，它没有维护问题，只是难用；等这段代码本来就要动的时候顺手换掉最划算。',
        '<b>问：为什么响应 body 是乱码？</b><br>答：先看响应头 Content-Type 里有没有 charset。没有的话 <code>HttpClient</code> 会按 UTF-8 解，而服务端可能实际发的是 GBK，中文就变成问号或方块；另一种情况是服务端声明了 charset 却发错编码。排查顺序：打印 Content-Type，打印 body 前几十个字节的十六进制，再对比按不同字符集解出来的结果，一眼就能看出是谁错了。',
        '<b>问：sendAsync 的异常去哪了？</b><br>答：被包在 <code>CompletionException</code> 里存进了返回的 <code>CompletableFuture</code>。你用 <code>join()</code> 取结果时它才抛出来，真正的异常在 <code>getCause()</code>；如果从头到尾都不 join，这个错误就静默消失了。所以要么用 <code>exceptionally</code> 和 <code>handle</code> 显式兜底，要么在最后统一 join 并捕获。',
        '<b>问：HttpServer 能上生产吗？</b><br>答：不建议。JDK 自带的 <code>com.sun.net.httpserver</code> 是极简实现，功能止步于路由和基本响应，没有成熟的连接管理、限流、优雅停机，也没有可观测性。不过“没有内建 TLS”是误传：它提供 <code>HttpsServer.create()</code> 加 <code>setHttpsConfigurator(new HttpsConfigurator(sslContext))</code>，用 KeyStore 造一个 SSLContext 就能起 HTTPS（<code>HttpsServer</code> 继承自 <code>HttpServer</code>，<code>javap -p com.sun.net.httpserver.HttpsServer</code> 可验证）。真要挑刺是 API 太精简，而不是缺 TLS。它最合适的用途是写测试桩和教学示例；真正的服务交给 Spring Boot、Netty 或 Javalin 这类框架，别自己补一堆轮子。',
        '<b>问：重试几次合适？</b><br>答：两到三次，配合指数退避和总耗时上限。前提是这个请求可以重试：GET 天然幂等，POST 必须先有幂等键，否则一次超时重试就可能下两单。还要只对可恢复的失败重试，也就是连接超时和 5xx；4xx 是请求本身错了，重试多少次都一样，只会浪费下游资源。'
      ] },

      { h: '2.18 自测与练习' },
      { ol: [
        '启动 TestServer，用 curl 访问 /books/1 和 /books，观察状态码与 Content-Type。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="shell"># 终端一\njava TestServer.java\n\n# 终端二：-i 连响应头一起打印\ncurl -i http://127.0.0.1:8080/books/1\n# HTTP/1.1 200 OK\n# Content-Type: application/json; charset=utf-8\n# {"id":1,"title":"Java 网络编程"}\n\ncurl -i http://127.0.0.1:8080/books\n# HTTP/1.1 201 Created\n# Content-Type: text/plain; charset=utf-8\n# created\n\n# 只要状态码\ncurl -s -o /dev/null -w \'%{http_code}\'   http://127.0.0.1:8080/books/1</pre><b>要点</b>：createContext 注册的是前缀，<code>/books/1</code> 比 <code>/books</code> 更具体所以先命中；<code>/books</code> 那个处理函数会读请求体并打印，GET 时打印出来的「收到：」后面是空的。</div></details>',
        '用 HttpClient 发 GET，打印状态码、Content-Type 和 body。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\npublic class GetDemo {\n  public static void main(String[] args) throws Exception {\n    var client = HttpClient.newHttpClient();\n    var req = HttpRequest.newBuilder()\n        .uri(URI.create("http://127.0.0.1:8080/books/1"))\n        .GET()\n        .build();\n    var resp = client.send(req,\n        HttpResponse.BodyHandlers.ofString());\n    System.out.println(resp.statusCode());\n    System.out.println(resp.headers()\n        .firstValue("content-type").orElse("(none)"));\n    System.out.println(resp.body());\n  }\n}</pre><b>要点</b>：输出依次是 200、<code>application/json; charset=utf-8</code>、JSON 正文。响应头名大小写不敏感，一个名字可能有多个值，所以要 <code>firstValue</code>；<code>ofString</code> 没指定字符集时按响应头的 charset 解码，没有就按 UTF-8。</div></details>',
        '写一个 POST 请求，把中文 JSON 发给 TestServer，确认控制台输出不乱码。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\nimport java.nio.charset.StandardCharsets;\n\npublic class PostDemo {\n  public static void main(String[] args) throws Exception {\n    String json = "{\\"title\\":\\"Java 网络编程\\"}";\n    var req = HttpRequest.newBuilder()\n        .uri(URI.create("http://127.0.0.1:8080/books"))\n        .header("Content-Type",\n                "application/json; charset=utf-8")\n        .POST(HttpRequest.BodyPublishers.ofString(\n            json, StandardCharsets.UTF_8))\n        .build();\n    var resp = HttpClient.newHttpClient().send(req,\n        HttpResponse.BodyHandlers.ofString(\n            StandardCharsets.UTF_8));\n    System.out.println(resp.statusCode() + " " + resp.body());\n  }\n}</pre><b>要点</b>：服务端打印「收到：{"title":"Java 网络编程"}」，不乱码；客户端拿到 201 created。乱码只会出在解码那侧，所以服务端读请求体时也必须显式指定 UTF-8，别用平台默认字符集。</div></details>',
        '给客户端设 300 毫秒请求超时，访问 /slow，观察异常类型。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\nimport java.net.http.HttpTimeoutException;\nimport java.time.Duration;\n\npublic class TimeoutDemo {\n  public static void main(String[] args) throws Exception {\n    var client = HttpClient.newBuilder()\n        .connectTimeout(Duration.ofSeconds(1))\n        .build();\n    var req = HttpRequest.newBuilder()\n        .uri(URI.create("http://127.0.0.1:8080/slow"))\n        .timeout(Duration.ofMillis(300))\n        .GET()\n        .build();\n    try {\n      var resp = client.send(req,\n          HttpResponse.BodyHandlers.ofString());\n      System.out.println(resp.statusCode());\n    } catch (HttpTimeoutException e) {\n      System.out.println("超时：" + e.getMessage());\n    }\n  }\n}</pre><b>要点</b>：约 300 毫秒后抛 <code>java.net.http.HttpTimeoutException</code>，它是 IOException 的子类，必须单独捕获；服务端仍在睡满 2 秒，客户端放弃不会让它停下。<code>connectTimeout</code> 只管建连，<code>timeout</code> 管整个请求。</div></details>',
        '用 sendAsync 同时请求两次 /books/1，比较串行与并行的总耗时。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\nimport java.util.concurrent.CompletableFuture;\n\npublic class AsyncDemo {\n  public static void main(String[] args) throws Exception {\n    var client = HttpClient.newHttpClient();\n    var req = HttpRequest.newBuilder()\n        .uri(URI.create("http://127.0.0.1:8080/slow"))\n        .build();\n    var h = HttpResponse.BodyHandlers.ofString();\n\n    long t0 = System.currentTimeMillis();\n    client.send(req, h);\n    client.send(req, h);\n    long t1 = System.currentTimeMillis();\n\n    var f1 = client.sendAsync(req, h);\n    var f2 = client.sendAsync(req, h);\n    CompletableFuture.allOf(f1, f2).join();\n    long t2 = System.currentTimeMillis();\n\n    System.out.println("串行 " + (t1 - t0) + " ms");\n    System.out.println("并行 " + (t2 - t1) + " ms");\n  }\n}</pre><b>要点</b>：两次 /slow 串行约 4000 ms，并行约 2000 ms——async 只是不占你的线程，真正的并发来自服务端的线程池。换成 /books/1 就量不出差别了：本机几毫秒就返回，时间基本花在建连上。</div></details>'
      ] },

    ]
  };
})();
