/* 教材正文：网络与 JSON / 并发编程（每章 5200 字以上） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['network-json'] = {
    meta: '本章约 6000 字 · 建议 40 分钟 · 配套流程图与 5 道练习',
    blocks: [
      { h: '1.1 为什么程序要学会“和外面说话”' },
      { p: '前面几章写的程序都是自给自足的：数据来自代码里的字面量，结果打印在控制台。可真实的软件几乎不这样工作——图书系统的数据在数据库里，天气应用的数据在别人的服务器上，网页要向后端要列表。一个程序只要开始和外部交换信息，就绕不开网络。' },
      { p: '网络编程听起来吓人，但日常开发中绝大多数场景可以归结成一句话：把一段 JSON 通过 HTTP 发到某个地址，再把返回的 JSON 解析成对象。剩下的小部分才是自定义协议、长连接、粘包处理这些偏底层的内容。' },
      { p: '这一章先把主链路走通：HTTP 请求怎么发、JSON 怎么写、Jackson 怎么做映射、超时和异常怎么处理。学完以后，你应该能独立调用一个后端接口，把结果变成一个可以继续处理的 Java 对象。' },
      { list: [
        '知道一次网页访问在网络上经过了哪几步，出错时能判断是哪一层的问题；',
        '能用 JDK 自带的 <code>HttpClient</code> 发 GET 和 POST 请求；',
        '能读懂并写出合法的 JSON，知道它和 Java 对象怎么对应；',
        '会给网络调用加超时、判状态码、处理异常，而不是假设对方永远返回 200。'
      ] },

      { h: '1.2 一次请求经过了哪几层' },
      { p: '在浏览器里输入地址并回车，背后是一连串动作。理解这条链路最大的好处是排查问题：域名解析失败、端口没人监听、服务端返回 500，对应的现象和解决方式完全不同。' },
      { p: '第一步是 DNS 解析，把域名翻译成 IP 地址。第二步是建立 TCP 连接，也就是常说的三次握手，双方确认彼此都能收能发。第三步，客户端按 HTTP 协议把请求报文写进连接：请求行、请求头、一个空行、请求体。第四步，服务器处理请求并写回响应报文，客户端按同样的格式解析。' },
      { p: '这里要分清两个概念：HTTP 是应用层协议，规定“报文长什么样”；TCP 是传输层协议，负责“可靠、有序地把字节送到”。HTTP 并不关心字节怎么过路由器，TCP 也不关心这些字节是 JSON 还是图片。' },
      { flow: ['输入网址', 'DNS 解析域名', 'TCP 三次握手', '发送 HTTP 请求报文', '服务器处理', '返回响应报文', '浏览器解析渲染'] },
      { p: '端口是同一台机器上区分服务的编号。HTTP 默认 80，HTTPS 默认 443；URI 里不写端口就用默认值。本地调试常用 8080、9000 这类高位端口，因为 1024 以下通常需要管理员权限。' },
      { p: 'HTTP/1.1 默认支持连接复用：一次握手之后可以连续发多个请求，减少反复建连的开销。HTTP/2 更进一步，允许在同一条连接上多路复用，还压缩了请求头。这些优化对使用者是透明的，你写的代码基本不用改。' },

      { h: '1.3 用 Socket 看一眼最原始的通信' },
      { p: 'Socket 是操作系统提供的 TCP 编程接口。服务端用 <code>ServerSocket</code> 监听端口，<code>accept()</code> 会阻塞，直到有客户端连上来；连接建立后，双方各拿到输入流和输出流，像读写文件一样收发字节。' },
      { code: 'import java.io.*;\nimport java.net.*;\n\npublic class EchoServer {\n    public static void main(String[] args) throws IOException {\n        try (ServerSocket server = new ServerSocket(9000)) {\n            System.out.println("等待连接...");\n            try (Socket socket = server.accept();\n                 BufferedReader in = new BufferedReader(\n                         new InputStreamReader(socket.getInputStream(), "UTF-8"));\n                 PrintWriter out = new PrintWriter(\n                         new OutputStreamWriter(socket.getOutputStream(), "UTF-8"), true)) {\n\n                String line = in.readLine();\n                out.println("ECHO: " + line);\n            }\n        }\n    }\n}', title: 'EchoServer.java' },
      { out: '等待连接...\n（客户端连上并发送 hello 后，客户端收到）\nECHO: hello' },
      { p: '逐行看这段代码：<code>new ServerSocket(9000)</code> 在 9000 端口上监听；<code>accept()</code> 返回时说明有客户端连上了，返回值就是这条连接的 Socket；<code>InputStreamReader</code> 显式指定 UTF-8，避免中文乱码；<code>PrintWriter</code> 的第二个参数 <code>true</code> 表示自动 flush，否则数据可能一直留在缓冲区，对方永远等不到。' },
      { p: '那为什么日常开发不直接写 Socket？因为 TCP 只是字节流，没有消息边界。对方发了三条消息，你读到的可能是一次粘在一起的数据，也可能是半条。要自己设计长度前缀、分隔符、心跳和超时。HTTP 把这些约定都规定好了，所以应用之间更愿意用它。' },
      { note: '<b>常见误解：</b>“HTTP 就是 Socket。”——不是。HTTP 是跑在 TCP 连接之上的一套报文格式，Socket 只是操作这条连接的编程接口。同一根 Socket 上完全可以跑别的协议。' },

      { h: '1.4 HttpClient：JDK 自带的 HTTP 客户端' },
      { p: '从 JDK 11 开始，标准库自带 <code>java.net.http.HttpClient</code>，不引任何第三方依赖就能发 HTTP 请求。一次调用固定三步：创建客户端、构造请求、发送并拿到响应。' },
      { code: 'import java.net.URI;\nimport java.net.http.*;\nimport java.time.Duration;\n\npublic class GetDemo {\n    public static void main(String[] args) throws Exception {\n        HttpClient client = HttpClient.newBuilder()\n                .connectTimeout(Duration.ofSeconds(3))\n                .build();\n\n        HttpRequest request = HttpRequest.newBuilder()\n                .uri(URI.create("http://localhost:8080/api/books/1"))\n                .timeout(Duration.ofSeconds(5))\n                .header("Accept", "application/json")\n                .GET()\n                .build();\n\n        HttpResponse<String> response =\n                client.send(request, HttpResponse.BodyHandlers.ofString());\n\n        System.out.println(response.statusCode());\n        System.out.println(response.body());\n    }\n}', title: 'GetDemo.java' },
      { out: '200\n{"id":1,"title":"Java 并发实战","price":59.0}' },
      { p: '<code>HttpClient.newBuilder()</code> 可以配置连接超时、代理、HTTP 版本和线程池。<code>HttpClient</code> 实例是线程安全的，内部维护连接池，应该全局复用一个，而不是每次请求都 new 一个。' },
      { p: '<code>HttpRequest.newBuilder()</code> 至少要设置 URI，再选择 GET、POST 等方法，按需加请求头和请求超时。<code>client.send</code> 是同步的：调用线程会一直阻塞，直到响应返回或者超时。' },
      { p: '<code>HttpResponse</code> 里最重要的三样东西：<code>statusCode()</code> 状态码、<code>body()</code> 响应体、<code>headers()</code> 响应头。<code>BodyHandlers.ofString()</code> 会按响应头里的 charset 解码，没写就按 UTF-8 处理。' },
      { note: '<b>版本提醒：</b>JDK 8 没有 <code>HttpClient</code>，只能用 <code>HttpURLConnection</code>，或者引入 OkHttp、Apache HttpClient。如果教程里写的是 <code>new HttpClient()</code> 而不是 builder，那多半是别的库。' },

      { h: '1.5 方法、请求头与请求体' },
      { p: 'HTTP 方法表达“想做什么”。GET 获取资源，POST 新建资源，PUT 整体替换，PATCH 局部修改，DELETE 删除。协议本身不强制语义，但缓存、网关、监控、重试机制都依赖这套约定，乱用会带来连锁问题。' },
      { table: { head: ['方法', '语义', '幂等', '典型例子'], rows: [
        ['GET', '读取资源', '是', '查询一本书'],
        ['POST', '新建资源 / 提交动作', '否', '新增一本书、下单'],
        ['PUT', '整体替换', '是', '用完整对象覆盖'],
        ['PATCH', '局部更新', '通常否', '只改价格'],
        ['DELETE', '删除资源', '是', '删除一本书']
      ] } },
      { p: '幂等的意思是：同一个请求执行一次和执行多次，对服务端状态的最终影响相同。GET、PUT、DELETE 应当幂等，POST 通常不幂等。这个性质直接决定“失败了能不能自动重试”——给下单接口盲目重试，可能下出两单。' },
      { p: '请求头是键值对，常用的有 <code>Accept</code>（希望返回什么类型）、<code>Content-Type</code>（我发的是什么类型）、<code>Authorization</code>（凭证）、<code>User-Agent</code>（客户端标识）。请求体承载真正的数据，GET 一般不带 body。' },
      { code: `import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;

public class PostDemo {
    static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(3))
            .build();
    static final ObjectMapper MAPPER = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        Book book = new Book(0, "Java 并发实战", 59.0);
        String json = MAPPER.writeValueAsString(book);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8080/api/books"))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = CLIENT.send(request,
                HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode() + " " + response.body());
    }
}`, title: 'PostDemo.java' },
      { p: '注意 <code>Content-Type</code> 必须和 body 的真实格式一致：声明 <code>application/json</code> 却发了表单字符串，服务端解析一定失败。带中文时显式写 <code>charset=UTF-8</code>，不要依赖默认值。' },
      { p: 'JSON 字符串的拼接很容易出错：引号、换行、反斜杠都要转义。正确做法是用序列化库生成，或者用 Java 15 的文本块（三个双引号）写多行 JSON 再交给 Jackson 校验，不要手动拼字符串。' },

      { h: '1.6 超时、异常与重试' },
      { p: '网络调用最容易出的事故是“卡住”。默认情况下，连接和读取都可能无限等待，一个不响应的下游就能把线程池占满，最终整个服务不可用。所以超时不是优化项，是必填项。' },
      { p: '两类超时要分清：<code>connectTimeout</code> 管“建立 TCP 连接”，配在 <code>HttpClient</code> 上；<code>requestTimeout</code> 管“请求发出到响应头返回”，配在 <code>HttpRequest</code> 上。只设一个不够，网络故障的形态往往不同。' },
      { code: `import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;

public class RetryDemo {
    static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    public static void main(String[] args) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8080/api/books/1"))
                .timeout(Duration.ofSeconds(3))
                .GET()
                .build();
        System.out.println(sendWithRetry(request));
    }

    static String sendWithRetry(HttpRequest request) throws Exception {
        int maxRetry = 3;
        for (int i = 0; i < maxRetry; i++) {
            try {
                HttpResponse<String> res = CLIENT.send(request,
                        HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() / 100 == 2) {
                    return res.body();
                }
                if (res.statusCode() < 500) {
                    throw new IllegalStateException("业务错误: " + res.statusCode());
                }
            } catch (HttpTimeoutException e) {
                System.out.println("超时，准备重试: " + i);
            } catch (IOException e) {
                System.out.println("连接失败: " + e.getMessage());
            }
            Thread.sleep(1000L << i);
        }
        throw new IllegalStateException("重试次数用尽");
    }
}`, title: 'RetryDemo.java' },
      { p: '可能抛出的异常分三类：<code>HttpTimeoutException</code> 表示超时；<code>IOException</code> 表示连不上、连接被重置、DNS 失败；<code>InterruptedException</code> 表示等待时被中断。前两类可以视情况重试，第三类应当恢复中断标志并尽快退出。' },
      { p: '重试有两个前提：操作幂等、失败是暂时性的。重试次数一般 2 到 3 次，间隔用指数退避并加随机抖动，例如 1 秒、2 秒、4 秒再叠加几十毫秒的随机值，避免所有客户端在同一时刻一起重试，把刚恢复的下游再次压垮。' },
      { note: '<b>不要吞异常：</b>只打印一行“系统繁忙”就返回，线上排查时没有任何线索。日志里至少要带 URL、状态码、耗时和异常类型，并且不要把 token、身份证号这类敏感信息打进日志。' },

      { h: '1.7 JSON 的语法规则' },
      { p: 'JSON 是一种纯文本的数据交换格式，只有六种值：对象、数组、字符串、数字、布尔和 null。对象用花括号，是“键: 值”的无序集合；数组用方括号，是有序列表。这两种结构可以任意嵌套。' },
      { p: '语法上有几条硬规则：键必须是双引号包裹的字符串；字符串也只能用双引号；不能写注释；最后一个成员后面不能有逗号；数字不能加引号，加了就变成字符串；引号、反斜杠、换行等特殊字符要用反斜杠转义。' },
      { table: { head: ['写法', '是否合法', '原因'], rows: [
        ['{"name": "Tom"}', '合法', '键和字符串都是双引号'],
        ['{name: "Tom"}', '不合法', '键没有加双引号'],
        ["{'name': 'Tom'}", '不合法', 'JSON 不允许单引号'],
        ['{"a": 1,}', '不合法', '最后一个成员后多了逗号'],
        ['{"a": 1, "b": [true, null]}', '合法', '数组可混合布尔与 null']
      ] } },
      { p: '实际传输时统一用 UTF-8 编码。JSON 没有日期类型，日期通常写成 ISO-8601 字符串或者时间戳数字，双方要提前约定。JSON 也不区分整数和浮点，超出 double 精度的大整数（比如订单号）建议按字符串传，避免精度丢失。' },
      { note: '<b>安全提醒：</b>JSON 本身不会执行代码，但把用户输入直接拼进 JSON 字符串会破坏结构，甚至造成注入。永远用序列化库生成 JSON，不要手写拼接。' },

      { h: '1.8 用 Jackson 做对象与 JSON 的互转' },
      { p: 'Jackson 是 Java 生态里最常用的 JSON 库，Spring Boot 默认就用它。核心类是 <code>ObjectMapper</code>：<code>writeValueAsString</code> 把对象变成 JSON，<code>readValue</code> 把 JSON 变回对象。' },
      { code: 'public record Book(int id, String title, double price) {}', title: 'Book.java' },
      { code: 'import com.fasterxml.jackson.databind.ObjectMapper;\n\npublic class JsonDemo {\n    public static void main(String[] args) throws Exception {\n        ObjectMapper mapper = new ObjectMapper();\n\n        Book book = new Book(1, "Java 并发实战", 59.0);\n        String json = mapper.writeValueAsString(book);\n        System.out.println(json);\n\n        Book read = mapper.readValue(json, Book.class);\n        System.out.println(read.title() + " / " + read.price());\n    }\n}', title: 'JsonDemo.java' },
      { out: '{"id":1,"title":"Java 并发实战","price":59.0}\nJava 并发实战 / 59.0' },
      { note: 'Jackson 不在 JDK 里，需要在项目中引入依赖（Maven 的 <code>com.fasterxml.jackson.core:jackson-databind</code>，或 Gradle 里一行 implementation）；它也不在 Java 模块系统的默认可见范围内，module-info 项目要额外 requires。不想引第三方库时，简单 JSON 可以用字符串拼装，但解析复杂 JSON 仍建议用成熟库。' },
      { p: '<code>ObjectMapper</code> 配置好之后是线程安全的，应该做成单例复用。每次请求都 new 一个会反复初始化序列化器的缓存，性能很差，在高并发下还会明显增加 GC 压力。' },
      { p: '反序列化时 Jackson 需要先创建对象：有无参构造器就用它，再调用 setter；没有就用唯一的有参构造器；record 则用规范构造器。字段名默认按 getter/setter 推导，也可以用 <code>@JsonProperty</code> 显式指定映射关系。' },
      { p: '如果 JSON 里多出 Java 类没有的字段，默认会抛 <code>UnrecognizedPropertyException</code>。做接口对接时通常关掉这个检查，避免对方加字段就把你的服务打挂：<code>mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)</code>。' },

      { h: '1.9 完整走一遍：从请求到对象' },
      { p: '把前面的碎片拼起来，就是一个可以直接运行的小工具：发请求、判状态码、解析 JSON、处理失败。这段代码值得完整看一遍，因为它是后面所有接口调用的骨架。' },
      { code: 'import com.fasterxml.jackson.databind.ObjectMapper;\nimport java.net.URI;\nimport java.net.http.*;\nimport java.time.Duration;\n\npublic class BookClient {\n    private final HttpClient client = HttpClient.newBuilder()\n            .connectTimeout(Duration.ofSeconds(3))\n            .build();\n    private final ObjectMapper mapper = new ObjectMapper();\n\n    public Book fetch(long id) throws Exception {\n        HttpRequest request = HttpRequest.newBuilder()\n                .uri(URI.create("http://localhost:8080/api/books/" + id))\n                .timeout(Duration.ofSeconds(5))\n                .header("Accept", "application/json")\n                .GET()\n                .build();\n\n        HttpResponse<String> res =\n                client.send(request, HttpResponse.BodyHandlers.ofString());\n\n        if (res.statusCode() / 100 != 2) {\n            throw new IllegalStateException(\n                    "请求失败，状态码: " + res.statusCode());\n        }\n        return mapper.readValue(res.body(), Book.class);\n    }\n\n    public static void main(String[] args) throws Exception {\n        Book book = new BookClient().fetch(1);\n        System.out.println(book.title());\n    }\n}', title: 'BookClient.java' },
      { out: 'Java 并发实战' },
      { p: '逐行看：<code>HttpClient</code> 和 <code>ObjectMapper</code> 都定义成静态字段复用；URI 用字符串拼接时要注意 id 必须是数字，真实项目里还要做校验或 URL 编码；<code>statusCode() / 100 != 2</code> 覆盖了 200、201、204 等所有成功状态。' },
      { p: '失败分支为什么先判状态码再解析？因为 4xx、5xx 的响应体很可能是错误说明甚至一段 HTML，直接丢给 Jackson 会得到莫名其妙的解析异常，把真正的原因盖掉。把状态码和响应体一起记进日志，排查效率会高很多。' },
      { p: '真实项目里，这段逻辑通常再包一层：把 <code>IOException</code> 转成自定义的业务异常，加上重试、熔断、埋点。业务代码只关心“给我一个 Book”，不关心底层是 HTTP 还是别的协议，这就是封装的价值。' },

      { h: '1.10 异步请求与并发抓取' },
      { p: '<code>sendAsync</code> 立即返回一个 <code>CompletableFuture</code>，请求在内部线程池执行，主线程可以继续做别的事。<code>thenApply</code> 在响应到达后做转换，<code>join</code> 阻塞等待最终结果。' },
      { code: `import java.net.URI;
import java.net.http.*;
import java.util.concurrent.CompletableFuture;

public class AsyncDemo {
    static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(2))
            .build();

    public static void main(String[] args) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8080/api/books/1"))
                .GET()
                .build();

        CompletableFuture<String> future = CLIENT
                .sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(res -> res.statusCode() + ":" + res.body());

        String result = future.join();
        System.out.println(result);
    }
}`, title: 'AsyncDemo.java' },
      { out: '200:{"id":1,"title":"Java 并发实战","price":59.0}' },
      { p: '异步不等于更快。单次请求用同步更简单，代码也好读；只有当你需要同时发出多个互不依赖的请求时，异步才能真正缩短总耗时。' },
      { p: '还要注意默认线程池：<code>CompletableFuture</code> 不指定 Executor 时用的是 <code>ForkJoinPool.commonPool()</code>，线程数是 CPU 核数减一。如果在回调里做阻塞 IO，会把公共池占满，影响整个进程，所以 IO 型任务应当传入自定义线程池。' },

      { h: '1.11 类型、日期与实战六坑' },
      { p: 'JSON 的类型只有六种，没有“日期”。所以日期在网络上的形态全靠约定：要么是 ISO-8601 字符串，比如 <code>"2024-05-01T10:30:00"</code>；要么是毫秒时间戳数字，比如 <code>1714530600000</code>。两种都能用，但必须前后端事先说清楚，否则一个当字符串、一个当数字，解析立刻失败。' },
      { p: 'Jackson 对这些类型的默认行为常常出人意料。用 <code>java.util.Date</code> 时，默认序列化成时间戳数字，人看着费劲；用 <code>LocalDate</code>、<code>LocalDateTime</code> 时更直接——不注册模块就抛异常：<code>InvalidDefinitionException: Java 8 date/time type not supported by default</code>。很多初学者以为是 JSON 写错了，其实是少了模块。' },
      { p: '错误写法是只 new 一个 <code>ObjectMapper</code> 就开工：<code>String s = new ObjectMapper().writeValueAsString(LocalDate.now());</code>。修正写法是先注册 JSR-310 模块，再关掉“日期写成数字”的开关：<code>ObjectMapper m = new ObjectMapper(); m.registerModule(new JavaTimeModule()); m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);</code>。这样输出才是 <code>"2024-05-01"</code> 这样的可读字符串，模块来自 <code>jackson-datatype-jsr310</code> 依赖。' },
      { p: '时区是第二个坑。<code>LocalDateTime</code> 只表示“墙上时间”，不带时区；<code>Instant</code> 表示绝对时刻；<code>OffsetDateTime</code> 两者都带。跨时区系统里存 <code>LocalDateTime</code>，北京用户看到的“10 点”和纽约用户看到的“10 点”不是同一个瞬间。对外接口建议用 <code>Instant</code> 或带偏移量的字符串，服务端统一按 UTC 存储，展示时再转本地时区。' },
      { p: '第三个坑是泛型。想把一段 JSON 数组直接变成 <code>List&lt;Book&gt;</code>，写成 <code>mapper.readValue(json, List.class)</code> 不会报错，但返回的列表里装的其实是 <code>LinkedHashMap</code>，等到 <code>for (Book b : list)</code> 时才炸出 <code>ClassCastException</code>。原因是 Java 泛型在运行时被擦除，<code>List.class</code> 没有携带元素类型，Jackson 无从得知该造什么对象。' },
      { p: '修正办法是把类型信息显式交给 Jackson：<code>mapper.readValue(json, new TypeReference&lt;List&lt;Book&gt;&gt;() {})</code>。这一对大括号创建了一个匿名子类，把泛型参数保留在字节码的签名里，Jackson 通过反射读得到。同理，<code>Map&lt;String, List&lt;Book&gt;&gt;</code> 这类多层嵌套也必须用 <code>TypeReference</code> 或 <code>mapper.getTypeFactory().constructCollectionType(...)</code>，不要图省事传 <code>Map.class</code>。' },
      { p: '嵌套对象还有两个典型故障。其一是字段缺失：JSON 里没有 <code>author</code>，Java 对象的 <code>author</code> 就是 null，直接用就空指针，所以对外部数据要做非空校验。其二是循环引用：<code>Book</code> 里有 <code>Author</code>，<code>Author</code> 里又有 <code>List&lt;Book&gt;</code>，序列化时会无限递归，最后抛 <code>StackOverflowError</code>。解决方式是在反向字段上加 <code>@JsonIgnore</code>，或者只用一个方向的 DTO 传输。' },
      { table: { head: ['现象', '原因', '正确做法'], rows: [
        ['中文乱码', '按平台默认编码解码', '统一 UTF-8，显式指定 charset'],
        ['把 404 页面当 JSON 解析', '没判断状态码', '先判 2xx，再解析响应体'],
        ['连接数暴涨、端口耗尽', '每次请求都 new HttpClient', '全局复用一个客户端实例'],
        ['线程永久卡住', '没有设置任何超时', '连接超时与请求超时都设置'],
        ['字段全是 null', '键名不一致或缺 setter', '用 @JsonProperty 或开启字段可见性'],
        ['大响应导致 OOM', 'ofString 把整个响应读进内存', '用 ofFile 或 ofInputStream 流式处理']
      ] } },
      { p: '除了表里的六条，还有两个细节值得单独记住。第一，<code>HttpClient</code> 内部维护连接池，如果下游响应很慢，连接会被一直占着，新请求只能排队等连接，表现为整体变慢；这时要把超时和并发度放在一起调。第二，日志里打印完整响应体之前先想想里面有没有敏感信息。' },
      { p: '如果响应体可能很大（比如导出文件），不要用 <code>ofString</code>。可以先用 <code>ofInputStream</code> 拿到流，边读边写文件，内存占用就与文件大小无关了。判断响应大小也可以先看 <code>Content-Length</code> 响应头。' },

      { h: '1.12 接口联调：按层排查而不是靠猜' },
      { p: '联调时最费时间的不是写代码，而是“我这里没错，是对方的问题”这种扯皮。有效的做法是固定一套排查顺序：先确认请求有没有发出去，再确认对方收到了什么，最后确认返回的东西有没有被正确解析。每一步都有可观察的证据，不靠感觉。' },
      { p: '第一步，把 Java 代码放到一边，用命令行工具复现同一个请求：<code>curl -i http://localhost:8080/api/books/1</code>。<code>-i</code> 会把响应头一起打印出来；POST 请求再加 <code>-H "Content-Type: application/json" -d "..."</code> 即可。如果 curl 成功而 Java 失败，问题就在客户端这一侧，重点比对请求头、请求体的字节和编码；如果 curl 也失败，直接找服务端，省下大量争论。' },
      { p: '第二步，看状态码而不是只看响应体。400 表示参数不合法，通常是字段名、类型或必填项不符；401 是没带凭证或凭证过期；403 是身份有了但没权限；404 多半是路径写错，注意结尾斜杠和大小写；409 是状态冲突，比如重复创建；429 是限流，响应头里常有 <code>Retry-After</code> 告诉你等多久；500 是服务端自身异常；502、503、504 说明问题在网关或上游，跟你传的参数关系不大。' },
      { p: '第三步，把错误响应体也解析出来。很多接口在 4xx 时返回 <code>{"code":"BOOK_NOT_FOUND","message":"图书不存在"}</code>，如果代码一见非 2xx 就抛一句“请求失败”，这条最有用的信息就被丢了。正确做法是先读 body，尝试按统一的错误结构解析，解析不了再退化成纯文本，最后连同状态码一起写进日志和异常消息。' },
      { p: '日志要能独立还原一次调用。最少包含：方法、完整 URL、状态码、耗时毫秒数、响应体前若干字符，以及一个请求 id。请求 id 由客户端生成并放在请求头里，服务端日志也打印它，两边一对就能串起来。耗时用 <code>System.nanoTime()</code> 前后相减再除以一百万，别用 <code>currentTimeMillis</code>，它受系统时钟调整影响。' },
      { p: '有几个坑几乎每个新手都会踩。第一，重定向：<code>HttpClient</code> 默认不跟随 3xx，遇到 301、302 会拿到一个空 body 的状态码，看起来像“接口没返回数据”，需要显式 <code>followRedirects(HttpClient.Redirect.NORMAL)</code>。第二，压缩：手动加了 <code>Accept-Encoding: gzip</code> 却没解压，body 就是一串乱码，除非自己处理，否则不要加这个头。第三，路径拼接：<code>baseUrl</code> 结尾有斜杠、路径开头也有斜杠，拼出双斜杠，某些网关会直接 404。' },
      { p: '第四，重试安全：GET 和 PUT 重试一般没问题，POST 要格外小心。下单、支付这类接口，网络超时并不代表服务端没处理——请求可能已经到了、只是响应丢了。此时盲目重试会重复下单。工程上的解法是客户端为每次业务操作生成一个唯一的幂等键，放在 <code>Idempotency-Key</code> 请求头里，服务端记录“这个键已经处理过”，重复请求直接返回第一次的结果。' },
      { p: '第五，超时值不是越小越好。把超时设为 100 毫秒，平时看着很快，一旦下游稍有抖动就大面积失败并触发重试，反而把对方压垮。合理的做法是先测出下游的 P99 耗时，超时设为它的两到三倍，再配合重试和熔断；同时确认连接超时、读超时、业务整体超时这三层是否都覆盖到了。' },
      { p: '最后一条经验：联调前先约定契约。字段名、类型、是否可空、日期格式、错误码表，写在文档里比事后猜要省事得多。JSON 是弱类型的，<code>1</code>、<code>"1"</code>、<code>true</code> 都能表达“是”，但没有约定时，每个人都会按自己的理解实现，然后在联调那天互相指责。' },

      { h: '1.13 本章小结' },
      { list: [
        'HTTP 是应用层报文协议，跑在 TCP 提供的可靠字节流之上；Socket 是操作 TCP 连接的接口。',
        '一次调用三步：建客户端、建请求、发送；客户端要复用，超时必须设置。',
        '先判状态码再解析响应体；2xx 才算成功，4xx 和 5xx 分别对应不同处理。',
        'JSON 只有六种值，键和字符串必须双引号，不能有注释和尾逗号。',
        'Jackson 的 ObjectMapper 线程安全可复用；字段映射靠名字、注解或构造器。'
      ] },

      { h: '1.14 常见追问' },
      { list: [
        '<b>问：GET 和 POST 的本质区别是什么？</b><br>答：区别在语义，不在「参数放哪」。GET 表示读取，应当幂等、可缓存，浏览器和代理可以放心重放；POST 表示提交，通常非幂等，也不该被缓存。协议本身并不禁止 GET 带 body，只是不少实现不解析它。真正要判断的只有一句：这个操作重做一次，服务端状态会不会变。会变就必须用 POST 或 PUT，并且自己做幂等设计。',
        '<b>问：为什么接口返回 200，对象字段却全是 null？</b><br>答：状态码 200 只说明对方成功返回了字节，字段映射是另一件事。按顺序查三处：JSON 键名与 Java 字段名是否完全一致（Jackson 默认大小写敏感）；目标类型有没有 getter/setter 和无参构造器，或者 record 的组件名对不对得上；注解 <code>@JsonProperty</code> 是否写错。最后打印一次原始 body，确认对方真的给了值，而不是返回了一个空对象。',
        '<b>问：HttpClient 要不要每次用完就关闭？</b><br>答：不要每次请求都新建一个。它线程安全、内部带连接池，应该全局创建一个共享使用。JDK 21 起它实现了 <code>AutoCloseable</code>，进程收尾时可以用 <code>close</code> 或 <code>shutdown</code> 释放连接和内部线程；更早的版本没有关闭方法，随 JVM 生命周期存在。真正必须自己关的是你传给它的自定义线程池，以及没有读完的响应流。',
        '<b>问：JSON 和 Java 对象一定要一一对应吗？</b><br>答：不必须。结构不稳定、只想取几个字段、或者先要看清原始报文时，可以解析成 <code>Map</code> 或 <code>JsonNode</code> 按路径取值，不必为一个临时需求造一堆类。代价是失去编译期检查：键名写错要到运行时才暴露，数字和日期也只能自己转换。等字段稳定、调用方多起来，再抽成 record 或普通类，让绑定替你校验类型。',
        '<b>问：接口里的金额能用 double 吗？</b><br>答：不要。double 是二进制浮点，0.1 这类十进制小数根本无法精确表示，累加几次就出现 0.30000000000000004，对账时永远差几分钱。金额用 <code>BigDecimal</code>，并且用字符串构造 <code>new BigDecimal("19.90")</code>，不要用 double 构造；或者干脆按「分」存成 long。对外序列化时最好按字符串输出，避免对方语言又把它当浮点解析。'
      ] },

      { h: '1.15 自测与练习' },
      { ol: [
        '用 <code>HttpClient</code> 请求本地的任意一个接口，打印状态码、响应头和响应体长度。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：控制台依次打印 <code>200</code>、一组响应头、以及 body 的字符数。<b>为什么</b>：<code>send</code> 返回的 <code>HttpResponse</code> 里，<code>statusCode()</code> 来自响应行，<code>headers()</code> 是大小写不敏感的只读 Map，body 是 <code>ofString()</code> 按 Content-Type 字符集解码后的字符串。<b>要点</b>：本地没有服务就先起一个 HttpServer，否则第一题直接抛 <code>ConnectException</code>；长度用 <code>response.body().length()</code>，别混用字节数，中文一个字占 3 字节。</div></details>',
        '写一个 <code>Book</code> record，用 Jackson 序列化成 JSON 再反序列化回来，比较两个对象是否相等。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：两次打印都是 <code>true</code>，中间那行 JSON 形如 <code>{"id":1,"title":"网络编程","price":19.9}</code>。<b>为什么</b>：record 的组件名就是属性名，Jackson 2.12 起直接支持 record，靠 RecordComponent 反射拿名字，所以不必装 jackson-module-parameter-names，也不需要 setter；equals 与 hashCode 按全部组件自动生成，比较的自然是字段值而不是引用。<b>要点</b>：两个调用就够：<code>mapper.writeValueAsString(book)</code> 与 <code>mapper.readValue(json, Book.class)</code>；比较一律用 <code>equals</code>，用 <code>==</code> 一定 false。record 不能互相持有，父子双向引用序列化会抛 <code>JsonMappingException: Infinite recursion</code>；金额别用 double，改 BigDecimal，否则反序列化后可能差几分。</div></details>',
        '故意把请求地址改成一个不存在的端口，观察抛出的是哪一类异常，并给出一句用户能看懂的提示。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：几乎立刻抛 <code>java.net.ConnectException: Connection refused</code>，不会等到超时；换成不可达的 IP 才会抛 <code>HttpConnectTimeoutException</code> 或 <code>HttpTimeoutException</code>。<b>为什么</b>：端口没人监听时内核直接回 RST，握手立刻失败；包被防火墙丢掉时没有任何回应，只能等 <code>connectTimeout</code> 到点。<b>要点</b>：分类捕获 IOException，refused 提示「服务没起或端口写错」，超时提示「网络不通或对方太慢」，不要把堆栈直接回给用户。</div></details>',
        '构造一段非法 JSON（比如键不加引号），用 Jackson 解析，记录异常信息中的行号和列号。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：抛 <code>JsonParseException</code>（<code>JsonProcessingException</code> 的子类），message 里带位置，形如 <code>Unexpected character ... ; line: 1, column: 2</code>。<b>为什么</b>：Jackson 是流式解析，读到不合法字符立刻停下，并把当前输入位置写进异常，所以它比正则更容易定位问题。<b>要点</b>：行号列号只写日志；对方返回 HTML 错误页时同样会走到这里，所以解析前先看状态码和 Content-Type。</div></details>',
        '把 <code>BookClient</code> 改造成带重试的版本：只对超时和 5xx 重试，最多三次，间隔递增。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：正常请求一次就成功、不重试；把服务停掉后连续失败三次，间隔约 200、400 毫秒，最后抛出最后一次的异常；返回 400 或 404 时立刻失败。<b>为什么</b>：只有超时、连接重置和 5xx 属于「可能瞬时」的失败，重试才有意义；间隔翻倍能避免所有客户端同时打回来，把刚恢复的服务再压垮。<b>要点</b>：循环里 <code>try/catch</code>，条件写成 <code>e instanceof HttpTimeoutException</code> 或 <code>status &gt;= 500</code>；<code>HttpClient</code> 全局复用，每次重试只重建 request；整体耗时也要设上限。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 3 题重点观察异常类型的差异，<code>ConnectException</code> 和 <code>HttpTimeoutException</code> 对应的处理策略完全不同；第 5 题注意不要在 4xx 时重试。' },
    ]
  };

  T['thread-basics'] = {
    meta: '本章约 6200 字 · 建议 45 分钟 · 配套生命周期流程图与 5 道练习',
    blocks: [
      { h: '2.1 为什么需要线程' },
      { p: '到目前为止，我们写的程序都是一条线走到底：从 main 的第一行开始，按顺序执行，遇到阻塞就停在那里等。可现实中的程序经常要“同时”做几件事：界面要响应点击，同时后台要下载文件；服务器要一边接收新请求，一边处理已经到达的请求。如果只有一条执行线，任何一次等待都会让整个程序停摆。' },
      { p: '线程就是让程序拥有多条执行线的机制。每个线程有自己的执行位置和栈，看起来像同时在跑。要注意并发和并行不是一回事：并行需要多核 CPU 真正同时执行；并发是在同一段时间内交替推进，单核 CPU 通过快速切换时间片也能做到。' },
      { p: '并发不是免费的。多个线程同时读写同一块数据，会出现丢失更新；一个线程改了变量，另一个线程可能看不见；加锁顺序不当还会死锁。这一章先把“怎么创建、怎么协作、怎么停止”搞清楚，后面的章节再逐个解决安全性的问题。' },
      { list: [
        '能说清进程与线程的区别，知道哪些内存是共享的、哪些是私有的；',
        '掌握三种创建线程的方式，并能解释为什么更推荐 <code>Runnable</code>；',
        '理解六种线程状态，知道 <code>sleep</code>、<code>join</code>、<code>interrupt</code> 各自做什么；',
        '能写出可以安全停止的线程，而不是用 <code>stop</code> 强杀。'
      ] },

      { h: '2.2 进程、线程与 JVM 的内存布局' },
      { p: '进程是操作系统分配资源的基本单位，拥有独立的地址空间；线程是 CPU 调度的基本单位，同一个进程里的线程共享这个进程的资源。换句话说，进程像一栋楼，线程像楼里的房间，公共区域共享，私人空间各自独立。' },
      { p: '落到 JVM 上：堆和方法区（元空间）由所有线程共享，堆里放对象，方法区放类元数据、静态变量和常量；每个线程私有的是虚拟机栈、本地方法栈和程序计数器，栈里放栈帧，栈帧里是局部变量和操作数。' },
      { table: { head: ['内存区域', '是否共享', '存放内容'], rows: [
        ['堆', '所有线程共享', 'new 出来的对象、数组'],
        ['方法区 / 元空间', '所有线程共享', '类结构、静态变量、常量池'],
        ['虚拟机栈', '每个线程私有', '栈帧、局部变量、方法调用'],
        ['程序计数器', '每个线程私有', '当前执行到哪条字节码'],
        ['本地方法栈', '每个线程私有', 'native 方法的调用信息']
      ] } },
      { p: '这也解释了一个常见现象：在方法里定义的局部变量，天然就是线程安全的，因为每个线程有自己的一份；而对象的字段、静态变量，只要多个线程能访问到，就必须考虑并发问题。' },
      { p: '线程不是越多越好。每个线程都要占一块栈空间（默认通常在 512KB 到 1MB 之间），创建和销毁要陷入内核，切换还要保存和恢复上下文。几千个线程互相抢 CPU，性能可能比单线程还差。所以后面会学线程池：复用线程，控制数量。' },

      { h: '2.3 创建线程的三种方式' },
      { p: 'Java 里创建线程有三种主流写法：继承 <code>Thread</code> 并重写 <code>run</code>；实现 <code>Runnable</code> 接口再交给 <code>Thread</code>；实现 <code>Callable</code> 接口，配合 <code>FutureTask</code> 拿到返回值。' },
      { code: 'import java.util.concurrent.*;\n\npublic class ThreeWays {\n    static class MyThread extends Thread {\n        public void run() {\n            System.out.println("方式一: " + getName());\n        }\n    }\n\n    static class MyTask implements Runnable {\n        public void run() {\n            System.out.println("方式二: " + Thread.currentThread().getName());\n        }\n    }\n\n    public static void main(String[] args) throws Exception {\n        new MyThread().start();\n        new Thread(new MyTask(), "worker-1").start();\n\n        FutureTask<Integer> task = new FutureTask<>(() -> 1 + 2);\n        new Thread(task, "worker-2").start();\n        System.out.println("方式三结果: " + task.get());\n    }\n}', title: 'ThreeWays.java' },
      { out: '方式一: Thread-0\n方式二: worker-1\n方式三结果: 3\n（前两行的先后顺序不固定，由调度器决定）' },
      { p: '第一种方式里，<code>getName()</code> 能直接调用，是因为它继承自 <code>Thread</code>；第二种方式拿不到线程对象，只能用 <code>Thread.currentThread()</code> 取当前线程。这就是“任务”和“线程”耦合在一起带来的差别。' },
      { p: '为什么更推荐 <code>Runnable</code>？第一，Java 是单继承，类一旦继承了 <code>Thread</code> 就不能再继承别的类；第二，任务逻辑和线程机制分离，同一个任务可以交给普通线程，也可以交给线程池；第三，<code>Runnable</code> 更符合“把活交给别人干”的模型。' },
      { p: '<code>Callable</code> 与 <code>Runnable</code> 的区别有两点：<code>call</code> 方法有返回值，并且可以声明抛出异常。<code>FutureTask</code> 同时实现了 <code>Runnable</code> 和 <code>Future</code>，既能当任务提交，又能用 <code>get()</code> 拿结果——不过 <code>get()</code> 会阻塞，直到任务完成。' },
      { note: '<b>易错点：</b>在匿名内部类里写 <code>this.getName()</code>，拿到的是任务对象而不是线程。要取线程名，请用 <code>Thread.currentThread().getName()</code>。' },

      { h: '2.4 start 与 run：一字之差' },
      { p: '这是初学者最常踩的坑：<code>run()</code> 只是一个普通方法，直接调用它，代码会在当前线程里顺序执行，根本不会创建新线程；只有 <code>start()</code> 才会让 JVM 创建一个新的执行流，再由新线程去调用 <code>run()</code>。' },
      { code: 'public class RunVsStart {\n    public static void main(String[] args) {\n        Thread t = new Thread(() ->\n            System.out.println("运行在: " + Thread.currentThread().getName()));\n\n        System.out.println("--- 直接调用 run ---");\n        t.run();\n\n        System.out.println("--- 调用 start ---");\n        t.start();\n    }\n}', title: 'RunVsStart.java' },
      { out: '--- 直接调用 run ---\n运行在: main\n--- 调用 start ---\n运行在: Thread-0' },
      { p: '输出里“运行在: main”说明 <code>run</code> 里的代码跑在主线程上。如果任务里是一段耗时计算，直接调 <code>run</code> 会让主线程卡住，界面照样无响应——你以为用了多线程，其实没有。' },
      { p: '还有一条规则：同一个 <code>Thread</code> 对象只能 <code>start</code> 一次。第二次调用会抛 <code>IllegalThreadStateException</code>，因为线程一旦结束就不能复活。想再跑一遍，只能创建新的线程对象。' },

      { h: '2.5 线程的生命周期与状态转换' },
      { p: 'Java 把线程状态定义在 <code>Thread.State</code> 枚举里，一共六种。理解状态转换，能帮你看懂线程转储，也能解释“为什么这个线程没在跑”。' },
      { table: { head: ['状态', '含义', '典型进入方式'], rows: [
        ['NEW', '对象已创建，还没启动', '<code>new Thread(...)</code>'],
        ['RUNNABLE', '可运行，等待 CPU 或正在运行', '<code>start()</code> 之后'],
        ['BLOCKED', '等待获取监视器锁', '进入被占用的 <code>synchronized</code>'],
        ['WAITING', '无限期等待被唤醒', '<code>wait()</code>、<code>join()</code>、<code>park()</code>'],
        ['TIMED_WAITING', '有限期等待', '<code>sleep(n)</code>、<code>join(n)</code>'],
        ['TERMINATED', '已结束', '<code>run</code> 正常返回或抛异常']
      ] } },
      { flow: ['new Thread()', 'start()', 'RUNNABLE', 'BLOCKED / WAITING / TIMED_WAITING', '重新回到 RUNNABLE', 'run 结束', 'TERMINATED'] },
      { p: '几个容易混淆的点。<code>RUNNABLE</code> 不等于“正在占用 CPU”，它包含“正在运行”和“排队等 CPU”两种情况，因为 JVM 不区分这两种细分状态。<code>BLOCKED</code> 只针对 <code>synchronized</code> 锁，等 <code>Lock</code> 或等 IO 不在这个状态里。' },
      { p: '<code>WAITING</code> 没有超时时间，必须被别人 <code>notify</code>、<code>unpark</code>，或者等目标线程结束才会醒；<code>TIMED_WAITING</code> 带了超时，时间到了自己会醒。两者都会让出 CPU，但都不释放已经持有的锁（<code>wait</code> 例外，它会释放）。' },
      { note: '<b>状态是 JVM 视角：</b>用 <code>jstack</code> 看到的线程状态和这里一一对应。看到大量 BLOCKED，通常意味着锁竞争激烈；看到大量 WAITING，要看是谁在等谁。' },
      { p: '这张表回答的是“状态是什么”，排查问题时真正有用的是“状态怎么变”：新创建的线程永远是 NEW，只有调用 start 之后才可能进入 RUNNABLE，之后在 RUNNABLE 与几种等待状态之间往返，最后进入 TERMINATED。下面把关键转换和 jstack 里实际看到的现象放在一起看。' },
      { p: '离开的方向基本是单向的。TIMED_WAITING 时间一到自己回到 RUNNABLE；WAITING 必须靠别人 <code>notify</code> 或 <code>unpark</code> 才醒；BLOCKED 在锁被释放后由 JVM 直接放行，不需要谁去叫它。TERMINATED 是终点，没有任何路径能回到前面，这也是同一个线程对象不能重复 <code>start</code> 的根本原因。' },
      { code: 'public class StateWatch {\n    public static void main(String[] args) throws Exception {\n        Object lock = new Object();\n\n        Thread t = new Thread(() -> {\n            synchronized (lock) {\n                try {\n                    Thread.sleep(500);\n                } catch (InterruptedException e) {\n                    Thread.currentThread().interrupt();\n                }\n            }\n        }, "watcher");\n\n        System.out.println("创建后: " + t.getState());\n        t.start();\n        Thread.sleep(100);\n        System.out.println("睡眠中: " + t.getState());\n        Thread.sleep(600);\n        System.out.println("结束后: " + t.getState());\n\n        synchronized (lock) {\n            System.out.println("主线程现在才拿到锁");\n        }\n    }\n}', title: 'StateWatch.java' },
      { out: '创建后: NEW\n睡眠中: TIMED_WAITING\n结束后: TERMINATED\n主线程现在才拿到锁' },
      { p: '把输出和表格对照，能看到一个反直觉的地方：线程在 <code>synchronized</code> 块里 <code>sleep</code>，状态显示的是 TIMED_WAITING 而不是 BLOCKED。状态只描述“此刻在等什么”，不描述“手里握着什么”——它仍然持有那把锁，所以主线程必须等它睡完才进得去。' },
      { p: '想看到 BLOCKED，得让两个线程争同一把锁，其中一个会被挂在锁的入口队列上，<code>jstack</code> 里显示为 “waiting to lock”。而 WAITING 常见于 <code>wait</code>、<code>join</code> 和 <code>LockSupport.park</code>，栈里往往还有一行 “waiting on condition” 或 “parking to wait for”，告诉你它在等哪个对象。' },
      { p: '还有一个常见误解：把 RUNNABLE 当成“正在吃 CPU”。<code>jstack</code> 里一大片 RUNNABLE，实际可能全卡在 socket 读、文件读这类系统调用上，因为 JVM 不区分“等 CPU”和“等 IO”，两种都算 RUNNABLE。所以看到 RUNNABLE 不能直接断定 CPU 高，要结合 CPU 使用率和栈顶方法一起看。' },
      { p: '结论是：状态是用来读的，不是用来等的。判断任务是否完成用 <code>join</code>、<code>Future</code> 或 <code>CountDownLatch</code>；判断线程是否卡住，用间隔几分钟的两次线程栈做对比。拿 <code>getState()</code> 写轮询循环去“等”，既浪费 CPU，又会在状态切换的空隙里得出错误结论。' },

      { h: '2.6 sleep、yield 与 join' },
      { p: '这三个方法经常被混用，其实职责完全不同。<code>sleep</code> 让当前线程睡一段时间；<code>yield</code> 提示调度器“我可以让一下”，但不保证真的让；<code>join</code> 是等另一个线程结束。' },
      { table: { head: ['方法', '作用', '是否释放锁', '是否一定生效'], rows: [
        ['sleep(ms)', '当前线程休眠指定时间', '否', '时间到才醒'],
        ['yield()', '提示让出 CPU', '否', '不保证，可能立刻又运行'],
        ['join()', '等待目标线程终止', '否（等待时进入 WAITING）', '目标结束后返回'],
        ['interrupt()', '设置中断标志', '否', '阻塞方法会抛异常']
      ] } },
      { code: 'public class SleepJoin {\n    public static void main(String[] args) throws Exception {\n        Thread worker = new Thread(() -> {\n            for (int i = 1; i <= 3; i++) {\n                System.out.println("worker " + i);\n                try {\n                    Thread.sleep(300);\n                } catch (InterruptedException e) {\n                    return;\n                }\n            }\n        }, "worker");\n\n        worker.start();\n        worker.join();          // 主线程在这里等 worker 结束\n        System.out.println("main 继续");\n    }\n}', title: 'SleepJoin.java' },
      { out: 'worker 1\nworker 2\nworker 3\nmain 继续' },
      { p: '<code>sleep</code> 的一个重要细节：它不会释放锁。如果线程在 <code>synchronized</code> 块里睡觉，其他线程照样进不来。想让出锁，得用 <code>wait</code> 或 <code>Condition.await</code>。另外 <code>sleep(0)</code> 没有特殊含义，不会“让时间片”。' },
      { p: '<code>join</code> 的底层是 <code>wait</code>：主线程在目标线程对象上等待，目标线程结束时 JVM 会唤醒所有等待者。<code>join(long millis)</code> 可以设置最长等待时间，超时后主线程继续往下走，但目标线程还在跑。' },
      { note: '<b>不要用 sleep 排顺序：</b>“先 sleep 一秒，另一个线程肯定执行完了”这种写法在负载高时必然失效。要等任务结束就用 <code>join</code>，要等一批任务结束就用 <code>CountDownLatch</code>。' },

      { h: '2.7 interrupt：协作式停止' },
      { p: 'Java 没有提供安全强杀线程的手段。<code>stop()</code> 会立刻释放所有锁，可能让对象停在半初始化状态，早已被废弃。正确做法是“请求停止 + 线程自己检查并退出”，也就是中断机制。' },
      { p: '<code>interrupt()</code> 做两件事：如果线程正卡在 <code>sleep</code>、<code>wait</code>、<code>join</code> 这类可中断的阻塞方法上，就抛出 <code>InterruptedException</code> 并清除中断标志；否则只是把中断标志置为 true，等线程自己检查。' },
      { code: 'public class StopDemo {\n    private static volatile boolean running = true;\n\n    public static void main(String[] args) throws Exception {\n        Thread worker = new Thread(() -> {\n            while (running) {\n                try {\n                    Thread.sleep(100);\n                } catch (InterruptedException e) {\n                    running = false;\n                    Thread.currentThread().interrupt();  // 恢复中断标志\n                }\n            }\n            System.out.println("线程安全退出");\n        }, "worker");\n\n        worker.start();\n        Thread.sleep(250);\n        worker.interrupt();\n    }\n}', title: 'StopDemo.java' },
      { out: '线程安全退出' },
      { p: '这段代码有两个关键点。第一，循环条件用了一个 <code>volatile</code> 标志，保证主线程改了之后工作线程能看见；第二，<code>catch</code> 里把标志关掉，并把中断状态恢复回去，让上层调用者还能知道“我被中断过”。' },
      { p: '为什么要在 <code>catch</code> 里恢复中断？因为 <code>InterruptedException</code> 抛出时 JVM 已经清除了标志。如果你捕获后不恢复，上层就完全看不出来发生过中断，中断信号在半路被吞掉了。' },
      { p: '判断中断用 <code>isInterrupted()</code>，它只读标志；<code>Thread.interrupted()</code> 会读并清除标志，容易误用。还要注意：不是所有阻塞都能被中断，比如等待 <code>synchronized</code> 锁、传统 IO 读写，都不会响应中断。' },

      { h: '2.8 守护线程、优先级与异常' },
      { p: '守护线程（daemon）是一种“后台服务员”：只要所有非守护线程都结束了，JVM 就会退出，不会等守护线程。垃圾回收线程就是典型的守护线程。用 <code>setDaemon(true)</code> 设置，而且必须在 <code>start()</code> 之前调用。' },
      { p: '守护线程的使用要谨慎。JVM 退出时它会被直接终止，<code>finally</code> 块不保证执行，正在写文件、提交事务的操作可能半途而废。所以持久化、事务这类工作不要放在守护线程里。' },
      { p: '线程优先级从 1 到 10，默认 5。它只是给操作系统的建议，不同平台实现差异很大，甚至可能被完全忽略。不要靠优先级保证执行顺序或避免饥饿，正确做法是用队列和同步工具。' },
      { code: 'public class HandlerDemo {\n    public static void main(String[] args) throws Exception {\n        Thread t = new Thread(() -> {\n            throw new RuntimeException("任务炸了");\n        }, "biz-worker-1");\n\n        t.setUncaughtExceptionHandler((thread, e) ->\n            System.out.println("捕获到 " + thread.getName() + ": " + e.getMessage()));\n\n        t.start();\n        t.join();\n        System.out.println("main 仍然活着");\n    }\n}', title: 'HandlerDemo.java' },
      { out: '捕获到 biz-worker-1: 任务炸了\nmain 仍然活着' },
      { p: '线程里抛出的未捕获异常不会影响其他线程，主线程照样继续，但默认只会往标准错误打一段堆栈。生产环境应当设置 <code>UncaughtExceptionHandler</code>，至少把异常记进日志并带上线程名，否则线上只会看到“任务悄悄没了”。' },
      { p: '给线程起名是个小习惯，收益很大。默认名字是 <code>Thread-0</code>、<code>pool-1-thread-2</code>，排查问题时完全看不出业务含义。建议按“模块-用途-序号”命名，例如 <code>order-export-3</code>，线程转储一眼就能定位。' },

      { h: '2.9 线程开几个才合适' },
      { p: '线程数量没有一个放之四海而皆准的数字，但有两个可用的起点。先看机器：假设有 R 个可用核心，纯 CPU 计算型的任务，线程数取 R 或 R+1 就能把核喂饱，再多只会增加切换开销。' },
      { p: '再看任务类型。如果任务里有大量等待，比如查询数据库、调用 HTTP 接口、读写磁盘，线程在等的时候并不占 CPU，这时可以开得更多。工程上常用的估算是 N = R × (1 + 等待时间 ÷ 计算时间)。举例来说，8 核机器、一次请求里等 IO 的时间是计算时间的 5 倍，算出来大约是 48 个线程。' },
      { p: '这个公式只是起点，不是答案。等待时间会随流量变化，线程开多了之后锁竞争、内存占用、上下文切换又会反过来拉低吞吐。所以正确做法是：用线程池，把核心线程数设成估算值，然后压测，观察吞吐和延迟曲线的拐点，再往上或往下调。' },
      { p: '还有一条理论约束值得知道。Amdahl 定律指出，加速比受串行部分限制：如果一个任务有 10% 必须串行执行，那么无论加多少核，整体最多快 10 倍。这也解释了为什么优化并发程序时，先找串行瓶颈，往往比盲目加线程更有效。' },
      { p: '反过来说，如果一段逻辑的并行度只有 2，开 16 个线程只会让 14 个线程排队抢那两把锁，吞吐一点不涨，延迟反而更抖。所以顺序是先问“这段逻辑最多能并行到几”，再问“开几个线程”，不能颠倒。' },

      { h: '2.10 为什么不要到处 new Thread：与线程池的映射' },
      { p: '本章所有例子都是直接 <code>new Thread</code>，因为这样最直观。真实项目里几乎不会这么写，原因不是语法，而是线程本身就是一种需要管理的昂贵资源：创建要陷入内核，每个线程默认占接近 1MB 的栈空间，切换要保存和恢复寄存器。数量一多，调度开销会盖过真正的计算。' },
      { p: '线程池的做法是预先准备固定数量的工作线程，让它们循环执行“从队列取任务、跑完再取”的动作。提交任务时你不再创建线程，只是往队列里放一个对象；线程被反复复用，生命周期被拉长。一句话：线程是执行者，任务是活，池把两者的生命周期解耦了。' },
      { p: '换成池之后，本章学的几个 API 会映射成另一套写法。<code>start</code> 对应 <code>execute</code> 或 <code>submit</code>；<code>join</code> 对应 <code>Future.get</code> 或 <code>CountDownLatch.await</code>；<code>interrupt</code> 单个线程对应 <code>shutdownNow</code> 向整池发出中断。语义没有变，只是从“我亲自管一个线程”变成“我向一个管理者提要求”。' },
      { p: '理解这层映射，本章的两个坑就有了统一解释。为什么不能到处 <code>new Thread</code>？因为没有上限也没有队列，任务一多就是线程数爆炸，最后抛出 <code>unable to create new native thread</code>。为什么 <code>join</code> 不能代替池的关闭？因为 <code>join</code> 只等一个线程，而池要按“停止接收新任务、跑完已提交的、超时再中断”三步收尾。' },

      { h: '2.11 把线程用对的清单与常见错误' },
      { list: [
        '优先把任务写成 <code>Runnable</code> 或 <code>Callable</code>，交给线程池执行，不要到处 <code>new Thread</code>。',
        '永远调用 <code>start()</code>，不要直接调 <code>run()</code>；一个线程对象只启动一次。',
        '给线程起有意义的名字，并设置未捕获异常处理器，方便排查。',
        '等待任务结束用 <code>join</code> 或同步工具，不要用 <code>sleep</code> 猜时间。',
        '停止线程用中断加标志位，给线程一个清理和退出的机会，不要用 <code>stop</code>。'
      ] },
      { list: [
        '<b>在构造器里启动线程。</b>构造器里写 <code>new Thread(this::doWork).start()</code>，此时对象还没构造完，新线程可能看到一堆默认值。修正：构造器只做初始化，另设一个 <code>start</code> 方法，或者交给工厂统一启动。',
        '<b>catch 里什么都不做。</b>捕获 <code>InterruptedException</code> 后空着，中断信号被吞掉，上层再也无法感知。修正：要么继续往上抛，要么调用 <code>Thread.currentThread().interrupt()</code> 恢复标志后退出。',
        '<b>用 Thread.interrupted() 当循环条件。</b>它读一次就清除标志，第二轮判断永远是 false，循环立刻结束。修正：循环条件用 <code>isInterrupted()</code>，只在确实需要清除时才用 <code>interrupted()</code>。',
        '<b>用 stop、suspend、resume。</b>它们会让线程停在半更新状态并释放锁，早已废弃。修正：用 <code>volatile</code> 标志位加 <code>interrupt</code>，给线程一个清理和退出的机会。',
        '<b>在循环里无上限 new Thread。</b>一万个任务就是一万个线程，直接抛 <code>OutOfMemoryError: unable to create new native thread</code>。修正：交给固定大小的线程池，让队列承担削峰。',
        '<b>join 之前忘了 start。</b>对一个 NEW 状态的线程调用 <code>join</code> 会立刻返回，主线程以为等到了，其实代码一行都没跑。修正：先 <code>start</code> 再 <code>join</code>，并在等待后检查结果是否符合预期。',
        '<b>任务抛异常却无人处理。</b>线程静默结束，主流程毫无察觉，线上只看到“任务悄悄没了”。修正：设置未捕获异常处理器记日志，或者用 <code>submit</code> 拿到 <code>Future</code>，再用 <code>get</code> 把异常抛回来。'
      ] },

      { h: '2.12 第一次撞上线程安全：丢失更新与可见性' },
      { p: '下面这段代码是并发入门必看的反面教材：两个线程各把同一个计数器加十万次，最后的结果却小于二十万，而且每次运行都不一样。' },
      { code: 'public class RaceDemo {\n    static int count = 0;\n\n    public static void main(String[] args) throws Exception {\n        Runnable task = () -> {\n            for (int i = 0; i < 100000; i++) {\n                count++;\n            }\n        };\n\n        Thread a = new Thread(task, "a");\n        Thread b = new Thread(task, "b");\n        a.start();\n        b.start();\n        a.join();\n        b.join();\n        System.out.println("count = " + count);\n    }\n}', title: 'RaceDemo.java' },
      { out: 'count = 163872\n（具体数字每次不同，通常小于 200000）' },
      { p: '原因在于 <code>count++</code> 不是一步完成的。它至少分成三步：把 count 从内存读到寄存器，寄存器加一，再写回内存。两个线程完全可能同时读到 100，各自加一后都写回 101，两次自增只生效了一次。' },
      { p: '更麻烦的是，即使没有“同时”，一个线程写回的值对另一个线程也可能不可见，因为每个 CPU 核有自己的缓存。原子性、可见性、有序性这三个词，就是下一章要展开的核心。' },
      { note: '<b>不要用“我跑了几次都没问题”来判断线程安全。</b>竞态条件依赖时序，测试环境越闲越难复现，线上高并发时才会集中爆发。' },
      { p: '很多人第一次遇到可见性问题，都会经历同一个诡异过程：程序卡住不退出，在循环里加一行打印，它居然正常结束了；把打印删掉，又卡住。于是得出一个错误结论——打印能修复并发问题。' },
      { code: 'public class PrintFixesIt {\n    static boolean running = true;\n\n    public static void main(String[] args) throws Exception {\n        Thread worker = new Thread(() -> {\n            while (running) {\n                System.out.println("tick");   // 删掉这一行，线程可能永不退出\n            }\n            System.out.println("退出循环");\n        }, "worker");\n\n        worker.start();\n        Thread.sleep(200);\n        running = false;\n    }\n}', title: 'PrintFixesIt.java' },
      { out: '（屏幕刷出大量 tick，随后出现）\n退出循环' },
      { p: '真正的原因在 <code>System.out</code>：它是一个 <code>PrintStream</code>，<code>println</code> 内部带了 <code>synchronized</code>。每一次打印都相当于一次加锁解锁，而加锁会刷新工作内存，顺带把 <code>running</code> 的新值带了进来。打印没有修好任何东西，它只是无意中插入了一次同步，把问题暂时盖住了。' },
      { p: '这类“靠副作用跑通”的代码最难缠：在你机器上正常，换一台 JIT 更激进的机器、或者把日志级别从 debug 调成 info，行为就变了。判断标准很朴素——把所有打印、日志、<code>sleep</code> 都删掉，程序还正确吗？如果答案是否定的，那正确性就是借来的，迟早要还。' },
      { p: '正确做法是给标志位加 <code>volatile</code>，明确要求每次读写都走主内存。加完之后删掉打印，循环照样能退出。这条经验可以推广成一条排查直觉：凡是“加了日志就好了”“加了 sleep 就好了”的并发 bug，都该先怀疑可见性或时序，而不是把日志当成补丁留在代码里。' },

      { h: '2.13 本章小结' },
      { list: [
        '进程是资源分配单位，线程是调度单位；堆和方法区共享，栈和程序计数器私有。',
        '三种创建方式中，实现 <code>Runnable</code> 最灵活，<code>Callable</code> 适合需要返回值的场景。',
        '<code>start</code> 才会创建新线程，<code>run</code> 只是普通方法调用；六种状态里 BLOCKED 专指等锁。',
        '<code>sleep</code> 不释放锁，<code>join</code> 等线程结束，<code>interrupt</code> 是协作式中断。',
        '多个线程写同一个变量会出现丢失更新，这就是线程安全问题的起点。'
      ] },

      { h: '2.14 常见追问' },
      { list: [
        '<b>问：线程和进程到底怎么选？</b><br>答：看你要隔离什么。需要独立地址空间、崩溃互不影响、能单独设内存上限，用进程；同一应用内多个任务要共享堆上的对象、切换代价要小，用线程。Java 程序启动时就是一个进程，main 只是其中一个线程。进程之间通信得走管道、Socket 或共享内存，线程之间直接读写同一个对象——线程不安全问题正是从这份便利里来的。',
        '<b>问：一个线程执行完 run 方法后还能再 start 吗？</b><br>答：不能。一个 Thread 对象的状态只能从 NEW 出发走一次，进入 TERMINATED 之后就固定了，再调 <code>start</code> 会抛 <code>IllegalThreadStateException</code>。想再跑一遍只能新建对象。真正的做法是把任务写成 Runnable 交给线程池：池里那几个线程被反复复用，每次执行的是不同任务，所以从来不需要「复活」一个线程。',
        '<b>问：sleep(0) 和 yield 有什么区别？</b><br>答：实践上几乎没有区别，两者都不释放已持有的锁，也都只是给调度器一个提示，不保证真的切换。yield 让当前线程回到就绪队列，<code>sleep(0)</code> 等价于一次极短暂停。想控制执行顺序、想等某个条件成立，必须用 wait/notify、Lock、CountDownLatch 这类同步工具——靠 sleep 调时长凑顺序，在不同机器上一定翻车。',
        '<b>问：守护线程里的 finally 一定会执行吗？</b><br>答：不一定。JVM 退出时只等非守护线程结束，守护线程会被直接终止，栈上的 finally 很可能来不及跑，日志、flush、释放资源都可能丢。所以守护线程只适合做随时可以放弃的辅助活，比如打点、清理缓存。写文件、提交事务这类必须收尾的工作要交给普通线程，再用 shutdown hook 兜底。',
        '<b>问：为什么我的多线程程序反而更慢？</b><br>答：常见四种原因：线程数远超核数，上下文切换和缓存失效把收益吃掉；锁竞争严重，大部分时间在排队而不是计算；任务粒度太小，创建、调度、合并的开销盖过计算本身；共享数据太多，多个核心抢同一条缓存行。先用 <code>jstack</code> 看线程到底在跑还是在等，再决定加线程还是减线程。'
      ] },

      { h: '2.15 自测与练习' },
      { ol: [
        '分别用继承 <code>Thread</code> 和实现 <code>Runnable</code> 打印 1 到 5，观察输出顺序是否稳定，并解释原因。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：两个线程各自都会打印 1 到 5，但两段输出会交错，可能出现 1、1、2、3、2……；多运行几次，交错的位置每次都不一样。<b>为什么</b>：<code>start</code> 只是把线程放进就绪队列，谁先被调度、能连续跑几轮由操作系统决定，代码里没有任何同步，就没有任何顺序保证。<b>要点</b>：一次 <code>println</code> 只输出一个数字，别把整个序列拼成一个字符串，否则交错粒度会被掩盖；<code>Runnable</code> 更好，它把任务和线程解耦，之后能直接交给线程池。</div></details>',
        '写一个程序：主线程启动子线程后立刻调用 <code>join</code>，对比不调用 <code>join</code> 时的输出差异。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：不 join 时 main 往往先打印「结束」，子线程的数字出现在后面，甚至还没打完进程就退出了；join 之后「结束」一定排在所有数字之后。<b>为什么</b>：<code>join</code> 让调用它的线程阻塞，直到目标线程进入 TERMINATED，等于在两者之间建立了明确的先后关系。<b>要点</b>：<code>join</code> 会抛 <code>InterruptedException</code>，必须处理；可以写 <code>join(1000)</code> 设上限，避免子线程卡住时主线程永远等下去。</div></details>',
        '把 <code>StopDemo</code> 改成用 <code>isInterrupted()</code> 作为循环条件，验证中断能否让线程退出。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：主线程调用 <code>interrupt()</code> 后，子线程在下一轮 <code>while (!isInterrupted())</code> 判断时退出，打印出收尾日志。<b>为什么</b>：<code>interrupt</code> 只是把标志位置位，要不要停由被中断的线程自己决定，这就是协作式停止。注意循环体里若在 sleep 或 wait，会抛 <code>InterruptedException</code> 并清掉标志位，循环不会自己停。<b>要点</b>：捕获异常后要么重新 <code>Thread.currentThread().interrupt()</code> 保留标志，要么直接 return；不要用已废弃的 <code>stop()</code>。</div></details>',
        '给 <code>RaceDemo</code> 的计数器加上 <code>synchronized</code>，观察结果是否稳定为 200000（下一章会讲原理）。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：不加锁时多次运行都得到 199xxx 之类的偏小值，且每次不同；加上 <code>synchronized</code> 后每次都是 200000。<b>为什么</b>：<code>count++</code> 是读、加、写三步，两个线程交错就会丢掉一次更新；<code>synchronized</code> 保证同一时刻只有一个线程进入临界区，退出时还把修改刷给其他线程。<b>要点</b>：锁必须加在同一个对象上，两个实例各锁各的等于没锁；也可以换成 <code>AtomicInteger</code> 的 <code>incrementAndGet()</code>。</div></details>',
        '用 <code>jstack</code> 打印一个正在运行的程序的线程栈，找到 main 线程和正在 <code>sleep</code> 的线程，记录它们的状态。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：每段以 <code>"main" #1 prio=5 ...</code> 开头，正在干活的显示 <code>java.lang.Thread.State: RUNNABLE</code>；在 sleep 的线程显示 <code>TIMED_WAITING (sleeping)</code>，栈顶是 <code>java.lang.Thread.sleep</code>。<b>为什么</b>：<code>jstack</code> 打印的是 JVM 内所有 Java 线程的瞬时快照，状态名就是 <code>Thread.State</code> 的枚举值；本地方法栈与虚拟机内部线程也会列出来，看业务线程只认你自己起的名字。<b>要点</b>：先 <code>jps -l</code> 拿 pid，再 <code>jstack &lt;pid&gt;</code>，JDK 7 之后等价命令是 <code>jcmd &lt;pid&gt; Thread.print</code>；只装了 JRE 会提示找不到 jstack。隔几秒连抓两三次对比栈顶，才能分清是卡死还是在正常推进；出现死锁时 jstack 末尾会直接打印 <code>Found one Java-level deadlock</code> 与两个线程的持锁链。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 2 题多运行几次，你会看到输出顺序并不稳定，这正是并发程序与顺序程序最大的差别；第 5 题注意栈里 “java.lang.Thread.State” 后面的状态名。' },
    ]
  };

  T['sync-volatile'] = {
    meta: '本章约 6500 字 · 建议 50 分钟 · 配套锁流程图与 6 道练习',
    blocks: [
      { h: '3.1 为什么并发程序会“算错”：原子性、可见性、有序性' },
      { p: '上一章末尾那个计数器，两个线程各加十万次，结果却不到二十万。这不是 JVM 的 bug，也不是 CPU 算错了，而是多个线程在没有协调的情况下同时修改同一份数据，彼此覆盖了对方的结果。' },
      { p: '现实中的例子更直观：一件商品只剩 1 件库存，两个用户同时下单。代码先查“库存大于 0”，两个线程都查到 1，都判断可以买，然后各自减一，最后库存变成 -1，卖出了两件。这类问题有个专门的名字：竞态条件（race condition）。' },
      { p: '要解决它，必须先分清三个概念：原子性、可见性、有序性。很多“加了 volatile 怎么还是错”“明明加了锁为什么读到旧值”的困惑，根源都是把这三件事混为一谈。' },
      { list: [
        '理解 <code>count++</code> 为什么不是原子操作，能画出读、改、写三步；',
        '掌握 <code>synchronized</code> 的三种写法和锁对象的选择；',
        '知道 <code>volatile</code> 保证什么、不保证什么，能判断一个场景该不该用；',
        '会用原子类解决计数问题，并理解 CAS 的基本原理和局限。'
      ] },
      { p: '原子性指一个操作要么全部完成，要么完全没发生，中间状态对其他线程不可见。<code>count++</code> 看似一行，编译后是“读取字段、加一、写回字段”三条指令，中间随时可能被切换，所以它不具备原子性。' },
      { p: '可见性指一个线程修改了共享变量，另一个线程能不能立刻看到。为了性能，CPU 会把数据缓存在自己的缓存里，编译器也可能把变量放进寄存器。结果就是 A 已经改了，B 还在用旧值循环，永远出不来。' },
      { p: '有序性指代码的执行顺序。编译器和 CPU 会在不影响“单线程执行结果”的前提下调整指令顺序，这叫重排序。单线程看不出问题，多线程下却可能出现“对象还没构造完，引用就已经被别人拿到”的怪事。' },
      { list: [
        '<b>原子性</b>：一步做完、不可分割。被破坏时的现象是两次自增只生效一次、库存被卖成负数。',
        '<b>可见性</b>：一个线程改了共享变量，别人能立刻看到。被破坏时表现为循环退不出来，读到的是永远的旧值。',
        '<b>有序性</b>：代码按你写的顺序生效。被破坏时会拿到“半初始化”的对象，或者标志位先于数据变得可见。'
      ] },
      { p: '不同工具解决的问题不同：<code>synchronized</code> 三者都保证；<code>volatile</code> 保证可见性和有序性，但不保证原子性；原子类用 CAS 保证单个变量的原子性；<code>final</code> 保证构造完成后的可见性。记住这张分工表，选工具时就不会乱。' },

      { h: '3.2 竞态条件：检查与修改之间的空隙' },
      { p: '竞态条件不只出现在自增。更常见的形态是“先检查再动作”（check-then-act）：先判断条件成立，再根据判断结果修改状态。只要判断和修改之间可能被其他线程插入，结果就不可靠。' },
      { code: 'public class StockDemo {\n    static int stock = 1;\n\n    static void buy(String user) {\n        if (stock > 0) {                    // 第一步：检查\n            try {\n                Thread.sleep(10);           // 模拟业务耗时，放大时间窗口\n            } catch (InterruptedException e) {\n                return;\n            }\n            stock = stock - 1;              // 第二步：修改\n            System.out.println(user + " 购买成功");\n        } else {\n            System.out.println(user + " 库存不足");\n        }\n    }\n\n    public static void main(String[] args) throws Exception {\n        Thread t1 = new Thread(() -> buy("张三"));\n        Thread t2 = new Thread(() -> buy("李四"));\n        t1.start();\n        t2.start();\n        t1.join();\n        t2.join();\n        System.out.println("剩余库存: " + stock);\n    }\n}', title: 'StockDemo.java' },
      { out: '张三 购买成功\n李四 购买成功\n剩余库存: -1' },
      { p: '把 <code>sleep</code> 去掉，问题依然存在，只是窗口变小、更难复现。这说明竞态条件的本质不是“睡了一会儿”，而是“检查和修改不是一个原子步骤”。修复方式只有一种：把这两步放进同一个临界区。' },
      { p: '临界区指一段同一时刻只允许一个线程执行的代码。进入前要拿锁，出去时释放锁。锁的作用不是“锁住代码”，而是“锁住多个线程对同一份共享状态的访问权”。所以锁对象必须在所有相关线程之间共享。' },
      { note: '<b>关键认知：</b>锁保护的是数据，不是代码。同一个类里两个方法用了不同的锁对象，它们之间没有任何互斥效果。' },

      { h: '3.3 synchronized 的三种写法与锁对象怎么选' },
      { p: '<code>synchronized</code> 可以修饰实例方法、静态方法和代码块。三种写法语义相同——进入时获取监视器，退出时释放——但锁对象不同，这决定了哪些线程之间会互斥。' },
      { table: { head: ['写法', '锁对象', '互斥范围'], rows: [
        ['<code>synchronized</code> 实例方法', '<code>this</code>，当前对象', '同一个对象的该方法'],
        ['<code>synchronized</code> 静态方法', '当前类的 <code>Class</code> 对象', '整个类，所有实例共享'],
        ['<code>synchronized (obj)</code> 代码块', '括号里指定的对象', '所有用同一个 obj 的线程'],
        ['<code>synchronized (Xxx.class)</code>', '类对象', '所有同步该类的线程']
      ] } },
      { code: 'public class SyncWays {\n    private int count;\n    private static int total;\n\n    // 1. 实例方法：锁 this\n    synchronized void addOne() {\n        count++;\n    }\n\n    // 2. 静态方法：锁 SyncWays.class\n    static synchronized void addTotal() {\n        total++;\n    }\n\n    // 3. 代码块：锁显式指定的对象\n    void addBlock() {\n        synchronized (this) {\n            count++;\n        }\n    }\n}', title: 'SyncWays.java' },
      { p: '注意 <code>addOne</code> 和 <code>addBlock</code> 锁的都是 <code>this</code>，所以它们互相排斥；而 <code>addTotal</code> 锁的是类对象，和另外两个方法可以同时执行，因为它们保护的是不同的变量。' },
      { p: '一个类有两个实例 a 和 b，线程 1 调 <code>a.addOne()</code>、线程 2 调 <code>b.addOne()</code>，两者不会互斥，因为锁是两个不同的对象。<b>synchronized 保护的是“对象级别”的状态</b>，要保护静态变量，必须用类锁。' },
      { p: '锁对象的第一要求是“所有需要互斥的线程看到的是同一个对象”。常见错误是 <code>synchronized (new Object())</code>，每次进方法都新建一把锁，等于没锁；或者在每个线程里各自 <code>new</code> 一个锁对象，同样无效。' },
      { p: '第二个要求是“这个对象不会被别人拿去当锁”。不推荐锁 <code>String</code> 字面量和包装类缓存对象：<code>"lock"</code> 会进入常量池被全局共享，<code>Integer.valueOf(1)</code> 在 -128 到 127 之间返回缓存实例，别的代码一旦也锁它，就可能莫名其妙地互相阻塞。' },
      { p: '推荐用 <code>private final Object lock = new Object()</code>：私有，外部拿不到；final，引用不会被改。它不承担任何业务含义，纯粹作为一把锁存在，语义最清晰。' },
      { p: '从 JVM 实现看，每个对象都有一个对象头，其中的 Mark Word 记录锁状态。早期 JVM 有偏向锁、轻量级锁、重量级锁的升级过程：无竞争时用 CAS 标记，轻度竞争时自旋重试，竞争激烈才真正挂起线程、陷入内核。' },
      { p: '需要知道的是，偏向锁在 JDK 15 起默认关闭（JEP 374），因为它带来的收益在现代应用里已经不明显，撤销偏向反而有成本。所以你不需要背锁升级的每个比特位，只要理解“无竞争时锁很便宜，竞争激烈时会有线程挂起和唤醒的开销”。' },
      { note: '<b>不要在锁对象上调用 wait/notify 之外的业务方法：</b>锁对象应当是“哑对象”，不参与业务逻辑，避免被意外修改或产生歧义。' },

      { h: '3.4 临界区的大小与锁的边界' },
      { p: '锁的粒度是个权衡。临界区太大，所有线程排队，并发退化成串行；临界区太小，可能把一个本应完整的操作拆成两段，中间被插入，逻辑照样出错。' },
      { p: '原则是：只把“访问共享可变状态”的语句包进去，把耗时操作（网络调用、文件读写、复杂计算）放到锁外面。但要注意，如果这些耗时操作的结果会影响后续判断，就不能随便挪出去。' },
      { p: '下面这段代码把“判断库存”和“扣减库存”放在同一个临界区里，并且只包住了必要的几行，打印放在锁外，既保证正确性，又尽量减少持锁时间。' },
      { code: 'class Ticket {\n    private int left = 10;\n    private final Object lock = new Object();\n\n    void sell() {\n        boolean success;\n        synchronized (lock) {\n            success = left > 0;\n            if (success) {\n                left--;\n            }\n        }\n        if (success) {\n            System.out.println(Thread.currentThread().getName()\n                    + " 出票成功，剩余 " + left);\n        }\n    }\n}', title: 'Ticket.java' },
      { p: '注意 <code>left</code> 的读取放在了锁外，这看起来违反了“共享变量都要在锁内访问”的规则。实际上这里只是打印，不参与判断，读到一个稍旧的值最多让日志不够精确，不影响正确性。真实项目里，如果要求日志绝对准确，就把它也放进锁内。' },
      { p: '另一个常见错误是“锁不统一”：一个方法用 <code>this</code>，另一个方法用 <code>lock</code>，两者都觉得自己安全，实际却保护不了同一份数据。规范做法是整个类只用一套锁策略，并在注释里写清楚。' },

      { h: '3.5 可重入、异常释放与 wait/notify' },
      { p: '<code>synchronized</code> 是可重入的：同一个线程已经持有锁，再次进入同一个锁保护的区域不会把自己锁死，JVM 内部用一个计数器记录重入次数，退出时逐层减到零才真正释放。这让你可以在同步方法里调用另一个同步方法。' },
      { p: '锁的释放是自动的：正常返回会释放，抛出异常也会释放。这一点比手动 <code>Lock</code> 安全——用 <code>ReentrantLock</code> 时必须在 <code>finally</code> 里 <code>unlock</code>，否则一次异常就会让锁永远不释放。' },
      { flow: ['线程尝试进入 synchronized', '获取 monitor', '执行临界区', '正常返回或抛异常', '释放 monitor', '唤醒等待队列中的线程'] },
      { p: '<code>wait</code> 和 <code>notify</code> 是对象上的协作方法，必须在持有该对象锁时调用，否则抛 <code>IllegalMonitorStateException</code>。<code>wait</code> 会释放锁并进入等待队列，被唤醒后还要重新竞争锁才能继续。' },
      { p: '<code>notify</code> 只唤醒一个等待者，<code>notifyAll</code> 唤醒全部。生产代码优先用 <code>notifyAll</code>，因为你无法保证被唤醒的那个线程恰好是能继续执行的线程，用错可能导致“信号丢失”，大家都睡着。' },
      { code: 'public class Basket {\n    private final int[] items = new int[5];\n    private int count = 0;\n\n    synchronized void put(int value) throws InterruptedException {\n        while (count == items.length) {\n            wait();                 // 满了：释放锁并等待\n        }\n        items[count++] = value;\n        notifyAll();                // 唤醒可能等着的消费者\n    }\n\n    synchronized int take() throws InterruptedException {\n        while (count == 0) {\n            wait();                 // 空了：等待生产者\n        }\n        int value = items[--count];\n        notifyAll();\n        return value;\n    }\n\n    public static void main(String[] args) {\n        Basket basket = new Basket();\n        new Thread(() -> {\n            try {\n                for (int i = 1; i <= 5; i++) basket.put(i);\n            } catch (InterruptedException e) {\n                Thread.currentThread().interrupt();\n            }\n        }).start();\n\n        new Thread(() -> {\n            try {\n                for (int i = 1; i <= 5; i++) {\n                    System.out.println("取到 " + basket.take());\n                }\n            } catch (InterruptedException e) {\n                Thread.currentThread().interrupt();\n            }\n        }).start();\n    }\n}', title: 'Basket.java' },
      { out: '取到 1\n取到 2\n取到 3\n取到 4\n取到 5' },
      { p: '为什么判断条件用 <code>while</code> 而不是 <code>if</code>？因为线程被唤醒后并不保证条件真的成立（可能被别的线程抢先消费），这叫虚假唤醒。醒来后必须重新检查，不满足就继续 <code>wait</code>。' },
      { note: '<b>不要用 <code>Thread.sleep</code> 代替 <code>wait</code>：</b>sleep 不释放锁，会让生产者抱着锁睡觉，消费者永远进不来，直接把程序拖死。' },

      { h: '3.6 volatile：保证可见性，不保证原子性' },
      { p: '<code>volatile</code> 是最轻量的同步手段。它告诉 JVM：这个变量可能被多个线程修改，每次读写都要和主内存打交道，不要缓存到寄存器，也不要把相关指令重排到它后面。' },
      { p: '它解决的是可见性问题。经典的例子是一个布尔标志：主线程把 <code>running</code> 改成 false，工作线程在循环里检查它。如果不加 volatile，JIT 可能把判断提到循环外，工作线程就永远看不到变化，循环永不结束。' },
      { code: 'public class VolatileFlag {\n    private static volatile boolean running = true;\n\n    public static void main(String[] args) throws Exception {\n        Thread worker = new Thread(() -> {\n            long n = 0;\n            while (running) {\n                n++;\n            }\n            System.out.println("循环结束，n = " + n);\n        });\n\n        worker.start();\n        Thread.sleep(100);\n        running = false;\n    }\n}', title: 'VolatileFlag.java' },
      { out: '循环结束，n = 128374921\n（具体数字取决于机器速度，但一定会结束）' },
      { p: '关键点来了：volatile 不保证原子性。把 <code>volatile int count</code> 拿去做 <code>count++</code>，依然会丢更新。因为 volatile 只保证“每次读到的都是最新值”，但“读—加—写”这三步之间仍然可能被别的线程插入。' },
      { p: '所以 volatile 适合两类场景：一是状态标志，比如 <code>running</code>、<code>initialized</code>；二是“写一次、之后只读”的安全发布，比如单例的实例引用。它不适合计数、累加、依赖当前值的复合操作。' },
      { table: { head: ['保证项', 'volatile', 'synchronized'], rows: [
        ['可见性', '保证', '保证'],
        ['原子性', '不保证', '保证（临界区内）'],
        ['有序性', '禁止特定重排', '保证'],
        ['是否阻塞', '不阻塞', '可能阻塞'],
        ['能否修饰变量', '只能修饰字段', '可修饰方法或代码块']
      ] } },

      { h: '3.7 双重检查锁：必须加 volatile 的经典' },
      { p: '单例模式的双重检查锁（DCL）是面试常客，也是理解有序性的最佳例子。它的目标是：第一次获取时才创建实例，之后直接返回，避免每次加锁。' },
      { code: 'public class Singleton {\n    private static volatile Singleton instance;\n\n    private Singleton() {}\n\n    public static Singleton getInstance() {\n        if (instance == null) {                 // 第一次检查，避免每次都加锁\n            synchronized (Singleton.class) {\n                if (instance == null) {         // 第二次检查，防止重复创建\n                    instance = new Singleton();\n                }\n            }\n        }\n        return instance;\n    }\n}', title: 'Singleton.java' },
      { p: '为什么 <code>instance</code> 必须加 volatile？<code>new Singleton()</code> 至少分三步：在堆上分配内存、调用构造器初始化、把引用赋给变量。编译器可能把第 2 步和第 3 步重排成“先赋值，再初始化”。' },
      { p: '一旦发生这种重排，另一个线程在第一次检查时就会看到一个非 null 的引用，于是直接返回并开始使用——但此时对象还没初始化完，字段可能全是默认值。这就是“逸出”的半初始化对象。volatile 禁止了这次重排，保证引用可见时对象一定构造完成。' },
      { note: '<b>更简单的写法：</b>把单例写成 <code>enum</code>，或者用静态内部类持有实例。它们由 JVM 的类加载机制保证线程安全，不需要手写双重检查，也不会有重排问题。' },

      { h: '3.8 原子类与 CAS' },
      { p: '如果只是对一个变量做原子更新，用锁有点重。JDK 在 <code>java.util.concurrent.atomic</code> 包里提供了一组原子类，底层依赖 CPU 的 CAS 指令，不需要阻塞线程。' },
      { p: 'CAS 是 compare-and-swap：给一个内存地址、期望值和新值，只有当内存里的当前值等于期望值时才更新，否则什么都不做并返回失败。更新失败就重新读取、重新计算、再次尝试，这个循环叫自旋。' },
      { code: 'import java.util.concurrent.atomic.AtomicInteger;\n\npublic class AtomicDemo {\n    static AtomicInteger count = new AtomicInteger();\n\n    public static void main(String[] args) throws Exception {\n        Runnable task = () -> {\n            for (int i = 0; i < 100000; i++) {\n                count.incrementAndGet();\n            }\n        };\n\n        Thread a = new Thread(task);\n        Thread b = new Thread(task);\n        a.start();\n        b.start();\n        a.join();\n        b.join();\n\n        System.out.println("count = " + count.get());\n        System.out.println(count.compareAndSet(200000, 0));\n        System.out.println(count.get());\n    }\n}', title: 'AtomicDemo.java' },
      { out: 'count = 200000\ntrue\n0' },
      { p: '这一次结果稳定是 200000，因为 <code>incrementAndGet</code> 把“读、加、写”合成了一个原子操作。常用方法还有 <code>getAndIncrement</code>（返回旧值）、<code>addAndGet</code>、<code>updateAndGet</code>（传入函数）。' },
      { p: 'CAS 有两个局限。第一，ABA 问题：值从 A 变成 B 又变回 A，CAS 检查不出来，如果业务关心“中间变过”，需要用 <code>AtomicStampedReference</code> 加版本号。第二，高并发下大量线程自旋失败，CPU 空转严重。' },
      { p: '针对高并发计数，JDK 8 引入了 <code>LongAdder</code>：它把热点分散到多个 Cell 上，每个线程更新自己的格子，最后求和。并发越高优势越明显，代价是求和结果不是某一瞬间的精确快照。' },

      { h: '3.9 第一次撞上死锁：两把锁的先后顺序' },
      { p: '前面几节的问题都是“算错”或“读到旧值”，还有一类更彻底：程序不动了。两个线程各自握着一把锁，又都在等对方手里的那把，谁也不肯先放手，于是永远停在那里。这就是死锁，本章只做第一次接触，完整方法留到后面专章。' },
      { p: '最常见的样子是转账。转出和转入是两个账户，为了保证扣钱和加钱同时成功，直觉上会先锁转出方再锁转入方。可反方向的那笔转账，加锁顺序正好相反。' },
      { code: 'class Account {\n    final String id;\n    int balance;\n\n    Account(String id, int balance) {\n        this.id = id;\n        this.balance = balance;\n    }\n\n    static void transfer(Account from, Account to, int amount) {\n        synchronized (from) {                 // 先锁转出方\n            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }\n            synchronized (to) {               // 再锁转入方\n                from.balance -= amount;\n                to.balance += amount;\n            }\n        }\n    }\n}', title: 'Account.java' },
      { out: '线程1 已锁 A，正在等 B\n线程2 已锁 B，正在等 A\n（随后没有任何输出，程序也不退出）' },
      { p: '死锁最难缠的地方是它不报错。没有异常、没有堆栈、CPU 也不高，从外部看只是“这个接口一直超时”。判断方法是导出线程栈，看有没有两个线程同时停在 BLOCKED，并且各自 <code>waiting to lock</code> 的锁正好握在对方手里。' },
      { p: '修法是申请多把锁之前先定一个全局顺序。账户有 id，就比较 id，永远先锁小的那个。这样两个方向的第一把锁都是同一个账户，第二个线程在第一层就排队，走不到“持有一把、再等另一把”的状态，环自然不存在。' },
      { code: 'static void transfer(Account from, Account to, int amount) {\n    Account first = from.id.compareTo(to.id) < 0 ? from : to;\n    Account second = (first == from) ? to : from;\n\n    synchronized (first) {\n        synchronized (second) {\n            from.balance -= amount;\n            to.balance += amount;\n        }\n    }\n}', title: 'OrderedTransfer.java' },
      { p: '要记住的不是这两段代码，而是那条规则：只要一个操作需要同时持有两把以上的锁，就必须规定获取顺序，并且让所有代码路径都遵守。规则写进注释、写进团队规范，比事后逐个排查有效得多。' },

      { h: '3.10 共享状态最小化与常见错误' },
      { p: '看到需要保护的变量，很多人的第一反应是加锁。但更好的顺序是先想办法不共享。工程上有三种思路，按代价从低到高排列：不可变、线程封闭、同步。' },
      { list: [
        '<b>不可变。</b>字段全部 <code>final</code>、不提供 setter、返回集合时给只读副本（<code>List.copyOf</code>），对象一旦建好就不再变化。多个线程随便读，不需要任何同步。',
        '<b>线程封闭。</b>把数据关在一个线程里，别人根本拿不到。方法内的局部变量天然封闭；<code>ThreadLocal</code> 则给每个线程准备一份独立副本，常用于日期格式化器这类“有状态但不该共享”的工具对象。',
        '<b>同步。</b>前两条都不成立时才用锁或原子类把访问串行化。它有阻塞成本，还可能引入死锁，所以排在最后。'
      ] },
      { p: '顺序为什么这样排？因为不可变没有运行期成本，线程封闭只有一点内存成本，同步既有阻塞成本又有出错风险。很多并发 bug 的根源不是“锁用得不对”，而是“这份状态本来可以不共享”。' },
      { p: '<code>ThreadLocal</code> 有两个坑。第一，它不解决共享问题，只是把共享变成各存一份；第二，用完必须 <code>remove</code>。Web 容器的线程会被复用，不清理就会把上一个请求的数据带给下一个请求，既算内存泄漏，也是串数据的隐患。' },
      { p: '所以判断顺序应当反过来问三句：这个状态能不能干脆不要？能不能只让一个线程碰？如果必须共享，能不能改成不可变、每次替换整个对象？三问都被否定，再考虑上锁。' },
      { list: [
        '<b>把整个方法都加上 synchronized。</b>方法里有网络调用、日志或复杂计算时，所有线程被串成一条线，吞吐断崖式下跌。修正：只把访问共享状态的那几行包进同步块。',
        '<b>用原子类做“先检查再更新”。</b><code>if (count.get() &lt; limit) { count.incrementAndGet(); }</code> 两次调用之间别人可以插进来，上限照样被突破。修正：写 <code>compareAndSet</code> 自旋循环，或者干脆加锁。',
        '<b>在锁内回调外部代码。</b>监听器、插件、DAO 都可能反向去拿另一把锁，两把锁一交叉就成死锁。修正：锁内只收集结果，出了临界区再回调。',
        '<b>用两种机制保护同一份数据。</b>读用 <code>volatile</code>、写用 <code>synchronized</code>，两边语义并不一致，正确性靠运气。修正：同一份状态只设定一套同步策略，并写进注释。',
        '<b>以为 volatile 引用能保护对象内部。</b><code>volatile Map</code> 只保证引用可见，<code>put</code> 与 <code>get</code> 的并发仍然不安全。修正：换成 <code>ConcurrentHashMap</code>，或用不可变对象整体替换。',
        '<b>把锁对象声明成 public 或可重新赋值的字段。</b>外部代码能拿它当锁，也能把它换掉，互斥立刻失效。修正：<code>private final Object lock = new Object()</code>。',
        '<b>以为静态同步方法和实例同步方法互斥。</b>前者锁 Class 对象，后者锁 this，是两把不同的锁，可以同时执行。修正：要全类互斥，两条路径都用同一把显式锁。'
      ] },

      { h: '3.11 该用哪个：一张决策表' },
      { p: '工具没有绝对的好坏，只有适用场景。判断的顺序是：先问“要不要原子性”，再问“是单个变量还是多个变量”，最后问“竞争激烈不激烈”。' },
      { table: { head: ['方案', '保证什么', '适合', '不适合'], rows: [
        ['<code>volatile</code>', '可见性、禁止重排', '状态标志、安全发布', '计数、复合操作'],
        ['<code>synchronized</code>', '原子性、可见性、有序性', '多变量、复合逻辑', '持锁做耗时操作'],
        ['<code>AtomicInteger</code>', '单变量原子更新', '计数器、序号生成', '多变量组合'],
        ['<code>LongAdder</code>', '高并发求和', '统计埋点', '要求精确瞬时值'],
        ['<code>ReentrantLock</code>', '同 synchronized', '需要超时、可中断、多条件', '简单场景（更易漏 unlock）']
      ] } },
      { p: '如果一个操作涉及两个以上共享变量，必须一起更新，基本只能上锁。比如转账要同时扣 A 的余额、加 B 的余额，用两个原子类分别更新，中间仍可能被看到“只扣未加”的状态。' },
      { p: '还有一条经验：能用不可变对象就用不可变对象。状态一旦不可变，就没有并发修改的问题，也不需要锁。把共享数据设计成“创建新对象替换旧对象”，往往比到处加锁更清晰。' },

      { h: '3.12 本章小结' },
      { list: [
        '并发错误的三个根源是原子性、可见性、有序性，选工具前先判断缺哪一项。',
        '<code>count++</code> 是读改写三步，任何“检查再修改”的复合操作都可能出现竞态。',
        '<code>synchronized</code> 锁的是对象：实例方法锁 this，静态方法锁 Class，代码块锁指定对象。',
        '<code>volatile</code> 只保证可见性和禁止重排，不能拿来做计数；DCL 单例的引用必须加它。',
        '原子类靠 CAS 自旋，适合单变量；高并发求和用 <code>LongAdder</code>；多变量组合仍然要锁。'
      ] },

      { h: '3.13 常见追问' },
      { list: [
        '<b>问：synchronized 和 ReentrantLock 怎么选？</b><br>答：只在需要额外能力时才用 Lock。简单互斥、加锁范围就在一个方法或一个代码块里，用 <code>synchronized</code>：它由 JVM 管理，抛异常也会自动释放，不会写漏 unlock。需要可中断的等待、带超时的 <code>tryLock</code>、公平锁，或者要在一个锁上挂多个条件队列时，才换成 <code>ReentrantLock</code>，并且必须在 finally 里释放。',
        '<b>问：锁对象可以是 null 吗？</b><br>答：不可以。<code>synchronized (null)</code> 不会静默失败，而是直接抛 <code>NullPointerException</code>，因为 JVM 需要拿到对象的监视器（monitor），null 没有。同步方法则隐含锁住 <code>this</code> 或类的 Class 对象，不会为 null。真正要小心的是锁对象被重新赋值：字段一变，前后两个线程锁的就不是同一个对象了，所以锁字段应该声明成 <code>final</code>。',
        '<b>问：volatile 数组算不算每个元素都 volatile？</b><br>答：不算。<code>volatile</code> 只修饰那个数组引用，保证引用本身的读写可见且不被重排；一旦拿到引用，<code>arr[0] = 1</code> 就是对元素的普通写，没有任何可见性保证。要给元素也加上原子语义，用 <code>AtomicIntegerArray</code>；只是想让写入被其他线程看到，就老老实实加锁。',
        '<b>问：为什么加了 volatile 的 count++ 还是错的？</b><br>答：因为 <code>count++</code> 不是一步。它由读、加、写三步组成，<code>volatile</code> 只保证每一步都能看到最新值，却挡不住两个线程同时读到 100 再各自写回 101，于是少加了 100 次。要原子就换 <code>AtomicInteger.incrementAndGet()</code>，靠 CAS 自旋失败重试；或者把整个自增放进同一个锁里。',
        '<b>问：synchronized 会锁住整个类吗？</b><br>答：要看你锁的是哪个对象。静态同步方法锁的是这个类的 <code>Class</code> 对象，它和同类其他静态同步方法互斥，但完全不阻塞实例同步方法，因为那是两把不同的监视器。同理，同一个类 new 出两个实例，各自锁各自的 <code>this</code>，也互不影响。所以要保护静态共享状态，锁必须落在类上；要保护实例状态，只锁 <code>this</code> 才有效。'
      ] },

      { h: '3.14 自测与练习' },
      { ol: [
        '运行 <code>RaceDemo</code> 十次，记录结果，解释为什么每次都不一样。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：十次结果都小于 200000，而且互不相同，例如 199987、199964；偶尔也会正好是 200000。<b>为什么</b>：<code>count++</code> 被拆成读、加、写三步，两个线程同时读到同一个旧值再各自写回，后写的一方覆盖了先写的，每次丢掉多少次取决于调度时机，所以每次结果都不一样。<b>要点</b>：把自增换成 <code>AtomicInteger.incrementAndGet()</code> 或加 <code>synchronized</code>，再跑十次应该全是 200000。</div></details>',
        '把 <code>StockDemo</code> 的检查和扣减放进同一个 <code>synchronized</code> 块，验证库存不再变成负数。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：修改前多跑几次能看到库存变成 -1、-2；改成一个同步块包住「判断库存 &gt; 0」和「库存减一」之后，最小值稳定停在 0。<b>为什么</b>：问题出在检查与扣减之间有缝隙，两个线程都通过了检查才开始扣；只有把这两步放进同一个临界区，判断结果才对后续的扣减依然有效。<b>要点</b>：范围要一次框住，写成 <code>synchronized (lock) { if (stock &gt; 0) stock--; }</code>；只同步读或只同步写都等于没锁。</div></details>',
        '写一个类，分别用实例方法和静态方法各加 10000 次，用两个线程验证它们是否互斥，并解释现象。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：两个同步方法各累加自己的计数，最终两个计数都正好是 10000，两个线程并没有互相阻塞；把静态方法改成普通同步实例方法后，才会看到明显的串行化。<b>为什么</b>：<code>synchronized</code> 实例方法锁的是 <code>this</code>，<code>synchronized static</code> 方法锁的是 <code>Xxx.class</code>，两把锁不同自然不会互斥。<b>要点</b>：用 <code>System.nanoTime()</code> 记录总耗时判断有没有串行；保护静态字段就同步静态方法，别混用。</div></details>',
        '把 <code>Basket</code> 的 <code>notifyAll</code> 改成 <code>notify</code>，多放几个生产者和消费者，观察是否会出现卡住。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：改成 <code>notify</code> 后程序偶尔长时间停住，<code>jstack</code> 里所有业务线程都停在 <code>Object.wait</code>；换回 <code>notifyAll</code> 后同样的代码能正常结束。<b>为什么</b>：<code>notify</code> 只随机唤醒一个等待者，若唤醒的是同类线程（消费者叫醒了消费者），它检查条件不满足又回去等，而唯一能满足条件的那个线程一直没被叫醒，于是所有人一起睡死。<b>要点</b>：等待必须写在 <code>while (!条件)</code> 里而不是 if；默认用 <code>notifyAll</code>，只有单条件、单类等待者时才考虑 <code>notify</code>。</div></details>',
        '用 <code>AtomicInteger</code> 实现一个线程安全的编号生成器，要求从 1000 开始，并说明为什么不用 volatile。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：20 个线程各取 1000 个号，收集到的 20000 个号无重复，最大号正好是 20999。<b>为什么</b>：<code>AtomicInteger</code> 的 <code>incrementAndGet</code> 是一条 CAS 指令，比较并交换失败会自动重试，天然排他；<code>volatile</code> 只解决可见性，<code>get()</code> 之后到 <code>set()</code> 之前的缝隙里，别的线程也能拿到同一个号。<b>要点</b>：<code>new AtomicInteger(1000).incrementAndGet()</code>；要跨进程唯一就得换 UUID 或数据库序列，CAS 只管一个 JVM。</div></details>',
        '把 DCL 单例的 volatile 去掉，尝试构造一个能复现「半初始化对象」的测试（提示：可以在构造器里加延时并打印字段）。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：在 x86 上往往复现不出来，去掉 volatile 后测试照样通过——这恰恰是最危险的地方；换到弱内存模型的 ARM 机器，或把并发调用压到很大，才可能读到 <code>instance != null</code> 但字段仍是 0 的对象。<b>为什么</b>：<code>new</code> 分三步：分配内存、执行构造器、把引用写给变量。没有 volatile 时编译器或 CPU 可以把第三步提到第二步之前，于是别的线程看到一个还没初始化完的对象。<b>要点</b>：结论是 volatile 不能省；更省心的写法是静态内部类持有或枚举单例，靠类加载机制保证只初始化一次。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 4 题改成 <code>notify</code> 后可能长时间卡住，因为被唤醒的可能是同类线程；第 6 题不保证一定复现，但能帮你理解重排为什么危险。' },
    ]
  };

T['executors'] = {
  meta: '本章约 7800 字 · 建议 55 分钟 · 配套流程图与 6 道练习',
  blocks: [
      { h: '4.1 为什么要用线程池，而不是到处 new Thread' },
      {p:'上一章我们看到，<code>new Thread(r).start()</code> 确实能把任务丢到另一个线程里跑。写一两个 demo 没问题，但只要任务数量一多，这种写法就会迅速变成灾难。原因不是“语法不对”，而是线程本身是一种昂贵资源，而 <code>new Thread</code> 完全没有帮你做资源管理。'},
      {p:'先看一个真实场景：一个 Web 接口收到请求后要查三次数据库。如果每个请求都 new 一个线程去做，那么并发 500 个请求就是 500 个线程同时在跑。每个线程默认要占大约 1MB 的栈空间，500 个就是 500MB 虚拟内存；线程还要和操作系统线程一一映射，创建和销毁都要陷入内核；CPU 核数只有 8 个，500 个线程抢 8 个核，上下文切换的开销会把真正的计算时间挤没。更糟的是，如果请求量继续涨，某一天你会看到这个错误：'},
      {out:'Exception in thread "main" java.lang.OutOfMemoryError: unable to create new native thread'},
      {p:'这个错误的意思是：操作系统已经不允许你再创建线程了。注意它和堆内存溢出不是一回事，堆还空着，但线程数到了上限。出现它的时候，程序通常已经无法自救。'},
      {p:'线程池解决的正是这个问题：它预先创建好一批线程，让它们反复从队列里取任务执行，任务结束后线程不销毁而是回去等下一个任务。这样线程数量可控、创建销毁成本被摊薄，还能统一命名、统一监控、统一关闭。一句话总结：'},
      {note:'线程池 = 一组可复用的工作线程 + 一个存放任务的队列 + 一套管理策略（何时扩容、何时拒绝、何时关闭）。'},
      {p:'把这句话记住，后面所有参数都是在回答三个问题：线程留几个？任务排哪里？排不下怎么办？'},

      { h: '4.2 任务与执行者分离：Executor 家族' },
      {p:'Java 从 5.0 开始把“提交任务”和“怎么执行任务”拆开了。你只需要描述“要做什么”（一个 <code>Runnable</code> 或 <code>Callable</code>），至于用几个线程、排队还是拒绝，交给执行者决定。这个抽象就是 <code>java.util.concurrent.Executor</code> 接口，它只有一个方法：'},
      {code:`public interface Executor {
    void execute(Runnable command);
}`, title:'Executor.java'},
      {p:'别小看这一个方法。它把调用方和线程创建解耦了：调用方拿到的是一个接口，背后可以是单线程、可以是 100 个线程的池、也可以是“直接在调用者线程里跑”的实现。这对测试特别有用——测试时换成一个同步执行的 Executor，异步代码就变成了顺序代码，断言立刻好写。'},
      {p:'实际开发中我们几乎总是用它的子接口 <code>ExecutorService</code>，它在 <code>execute</code> 之外增加了三组能力：'},
      {list:[
      '<b>提交有返回值的任务</b>：<code>submit(Callable&lt;T&gt;)</code> 返回 <code>Future&lt;T&gt;</code>，可以稍后取结果。',
      '<b>批量提交</b>：<code>invokeAll</code> 提交一组任务并等全部完成，<code>invokeAny</code> 只要任意一个成功就返回。',
      '<b>生命周期管理</b>：<code>shutdown()</code>、<code>shutdownNow()</code>、<code>awaitTermination()</code>、<code>isShutdown()</code>。'
    ]},
      {p:'再往下是 <code>ThreadPoolExecutor</code>，它是真正干活的实现类；<code>ScheduledThreadPoolExecutor</code> 在它基础上加了定时与周期执行；<code>ForkJoinPool</code> 是另一条分支，专为“分治 + 工作窃取”设计。理解线程池，核心就是理解 <code>ThreadPoolExecutor</code> 的构造参数。'},

      { h: '4.3 七个构造参数，一个都不能含糊' },
      {p:'<code>ThreadPoolExecutor</code> 最全的构造函数有七个参数。很多人用 <code>Executors</code> 的工厂方法用得很顺，一旦线上出问题却说不清池子到底怎么配的，就是因为跳过了这一节。'},
      {table:{head:['参数','含义','常见取值','踩坑点'],rows:[
      ['corePoolSize','核心线程数。池子长期保留的线程数','CPU 密集：N+1；IO 密集：更大','设成 0 时任务会先进队列，可能导致只用一个线程'],
      ['maximumPoolSize','最大线程数。队列满后才允许扩到这个数','通常 2N ~ 4N，或与 core 相同','队列无界时这个参数永远用不上'],
      ['keepAliveTime','超出核心数的空闲线程能活多久','60 秒','默认只作用于非核心线程'],
      ['unit','keepAliveTime 的时间单位','TimeUnit.SECONDS','写成毫秒却传 SECONDS 会差 1000 倍'],
      ['workQueue','存放待执行任务的阻塞队列','有界 ArrayBlockingQueue','用无界队列等于放弃背压'],
      ['threadFactory','如何创建线程','自定义命名与异常处理器','不命名的话排查问题只能看 thread-7'],
      ['handler','队列满且线程到顶时的拒绝策略','AbortPolicy 或 CallerRunsPolicy','默认策略会直接抛异常']
    ]}},
      {p:'几个容易被忽略的细节，逐条说清楚。'},
      {p:'<b>核心线程默认不超时。</b><code>keepAliveTime</code> 只对“超过 corePoolSize 的那部分线程”生效。也就是说，如果 core=4、max=8，那么第 5 到第 8 个线程空闲 60 秒后会被回收，前 4 个会一直活着。想让核心线程也能超时回收，需要显式调用 <code>allowCoreThreadTimeOut(true)</code>，这常用于流量有明显波峰波谷的服务。'},
      {p:'<b>队列类型决定了池子的性格。</b>队列是有界的（如 <code>new ArrayBlockingQueue&lt;&gt;(200)</code>），池子就会在队列满时扩容到 max，然后触发拒绝策略，形成完整的背压链路；队列是无界的（如无参 <code>new LinkedBlockingQueue&lt;&gt;()</code>），任务会无限堆积，线程数永远停在 core，看起来“很稳”，实际上是在攒一次 OOM。'},
      {p:'<b>maximumPoolSize 必须大于等于 corePoolSize</b>，否则构造时直接抛 <code>IllegalArgumentException</code>。<code>keepAliveTime</code> 不能为负。这些校验在构造器里就做了，写错立刻暴露，算是好事。'},
      {p:'<b>线程工厂不只是给线程起名字。</b>它决定了线程的优先级、是否为守护线程、以及未捕获异常交给谁处理。生产环境里给线程起一个带业务含义的名字（比如 <code>order-query-3</code>），出问题时 jstack 一眼就能定位是谁在卡住。'},
      { p: '光看参数还不够，下面这段代码把池子“挤满”，你能亲眼看到线程数从 2 涨到 4、队列满了以后任务被交给 main 线程执行的全过程。' },
      { code: `import java.util.concurrent.*;

public class PoolInternals {
    public static void main(String[] args) throws Exception {
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
            2,                                  // 核心线程数
            4,                                  // 最大线程数
            30, TimeUnit.SECONDS,               // 非核心线程空闲存活时间
            new ArrayBlockingQueue<>(2),        // 有界队列，容量 2
            r -> new Thread(r, "demo-worker"),  // 自定义线程工厂
            new ThreadPoolExecutor.CallerRunsPolicy()); // 拒绝策略

        for (int i = 1; i <= 6; i++) {
            int id = i;
            pool.execute(() -> {
                System.out.println(Thread.currentThread().getName() + " 执行任务 " + id);
                try {
                    Thread.sleep(300);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            System.out.println("提交 " + id + " 后：线程数=" + pool.getPoolSize()
                    + "，队列=" + pool.getQueue().size()
                    + "，活跃=" + pool.getActiveCount());
        }
        pool.shutdown();
    }
}`, title: 'PoolInternals.java' },
      { out: 'demo-worker 执行任务 1\n提交 1 后：线程数=1，队列=0，活跃=1\ndemo-worker 执行任务 2\n提交 2 后：线程数=2，队列=0，活跃=2\n提交 3 后：线程数=2，队列=1，活跃=2\n提交 4 后：线程数=2，队列=2，活跃=2\n提交 5 后：线程数=3，队列=2，活跃=3\n提交 6 后：线程数=4，队列=2，活跃=4\nmain 执行任务 5\nmain 执行任务 6' },
      { p: '这段输出把 4.4 的规则演了一遍：第 1、2 个任务创建核心线程；第 3、4 个任务进队列（队列从 0 涨到 2）；第 5 个任务发现队列满了，于是扩容出第 3 个线程；第 6 个任务再扩容到第 4 个。注意最后两行是 <code>main</code> 执行的——因为第 5、6 个任务提交时线程数已经到 4、队列也是满的，<code>CallerRunsPolicy</code> 就把任务丢回给提交者自己跑。' },

      { h: '4.4 提交一个任务，池子到底做了什么' },
      {p:'这是面试和排查问题的高频考点。很多“为什么我的线程数上不去”“为什么任务排队很久不执行”的疑问，答案都在这条判断链里。'},
      {flow:['提交任务','核心线程未满？→ 新建核心线程执行','核心已满 → 尝试放入工作队列','队列未满？→ 入队等待空闲线程','队列已满 → 线程数 < maximum？→ 新建非核心线程','已达 maximum → 执行拒绝策略']},
      {p:'把这条链翻译成更精确的步骤：'},
      {ol:[
      '如果当前线程数小于 <code>corePoolSize</code>，直接新建一个线程来跑这个任务，不管有没有空闲线程。',
      '否则尝试把任务放进 <code>workQueue</code>。放得进去就结束，任务等空闲线程来取。',
      '队列满了（<code>offer</code> 返回 false），再看线程数是否小于 <code>maximumPoolSize</code>；是就新建一个非核心线程直接执行。',
      '线程数也已经到顶，调用 <code>handler</code> 处理这个任务：抛异常、丢弃、或者交给提交者自己跑。'
    ]},
      {p:'这里有两个反直觉的点，务必记牢。'},
      {p:'<b>第一，先入队再扩容。</b>很多人以为“任务多了就加线程”，实际上只要队列没满，池子就不会超过 corePoolSize。所以如果你用了无界队列，无论提交多少任务，线程数都停在 core，这也是“池子明明配了 max=200 却始终只有 8 个线程”的原因。'},
      {p:'<b>第二，非核心线程是“救急”的。</b>它只在队列满的那一刻被创建，空闲下来超过 keepAliveTime 就被回收。这意味着池子的线程数会在 core 和 max 之间反复横跳，监控上看到的是一条锯齿曲线，这是正常现象。'},

      { h: '4.5 execute 与 submit：一个吞异常，一个藏异常' },
      {p:'这两个方法最容易混淆，而它们的差异会直接导致“任务失败了但没人知道”。'},
      {list:[
      '<code>execute(Runnable)</code>：没有返回值。任务里抛出的异常会一路抛到线程的未捕获异常处理器，默认行为是打印到 <code>System.err</code>，然后这个线程死掉，池子再补一个新的。',
      '<code>submit(...)</code>：返回 <code>Future</code>。任务里抛出的异常会被捕获并保存在 Future 里，只有调用 <code>get()</code> 时才会以 <code>ExecutionException</code> 的形式重新抛出。如果你 submit 之后从不 get，异常就彻底消失了。'
    ]},
      {p:'这就是为什么很多人说“线程池把异常吃了”。不是池子吃了，是 <code>submit</code> 把异常存进了 Future，而你没去取。解决方式有三种：调用 <code>get()</code> 并处理异常；在任务体内部自己 try-catch 打日志；或者给线程工厂设置一个会记录日志的 <code>UncaughtExceptionHandler</code>（但它对 submit 包装过的任务无效，因为异常根本没抛到线程层）。'},
      { p: '把两种提交方式放在一起跑一遍，你会立刻明白“异常被吃掉”是什么意思。' },
      { code: `import java.util.concurrent.*;

public class ExecuteVsSubmit {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        pool.execute(() -> {
            throw new IllegalStateException("execute 的异常直接打印");
        });

        Future<?> f = pool.submit(() -> {
            throw new IllegalStateException("submit 的异常被藏进 Future");
        });

        Thread.sleep(500);
        System.out.println("submit 任务结束了吗？" + f.isDone());

        try {
            f.get();
        } catch (ExecutionException e) {
            System.out.println("调用 get 才看到：" + e.getCause());
        }
        pool.shutdown();
    }
}`, title: 'ExecuteVsSubmit.java' },
      { out: 'Exception in thread "pool-1-thread-2" java.lang.IllegalStateException: execute 的异常直接打印\nsubmit 任务结束了吗？true\n调用 get 才看到：java.lang.IllegalStateException: submit 的异常被藏进 Future' },
      { p: '第 5 行的 <code>execute</code> 抛出异常后，异常一路冒到线程顶层，被默认的未捕获异常处理器打印出来，那个工作线程随即结束。第 9 行的 <code>submit</code> 抛出同样的异常，控制台却什么都没有——异常被包在 <code>Future</code> 里，直到第 20 行 <code>get()</code> 才以 <code>ExecutionException</code> 的形式露出来，真正的原因在 <code>getCause()</code> 里。' },

      { h: '4.6 用 Future 拿回异步结果' },
      {p:'<code>Future</code> 是对“未来某个时刻会有的结果”的占位符。它只有五个方法，但每个都有坑：'},
      {list:[
      '<b>get()</b>：阻塞直到任务完成并返回结果。没有超时版本会永久阻塞，线上不要用。',
      '<b>get(timeout, unit)</b>：最多等指定时间，超时抛 <code>TimeoutException</code>，但任务并不会因此停下。',
      '<b>cancel(boolean)</b>：取消任务。参数为 true 时尝试中断线程，任务必须响应中断才真正有效。',
      '<b>isDone()</b>：是否已结束，正常返回、抛异常、被取消都算结束，所以它不代表成功。',
      '<b>isCancelled()</b>：是否被取消，只有 cancel 返回 true 才表示取消成功。'
    ]},
      {p:'这里最需要建立的概念是：<b>超时不等于停止</b>。<code>get(1, SECONDS)</code> 抛了 <code>TimeoutException</code>，只是“我不等了”，后台那个任务还在继续跑，还在占着线程和数据库连接。如果确实要让它停，得先 <code>cancel(true)</code> 发出中断信号，并且任务代码里要检查 <code>Thread.currentThread().isInterrupted()</code> 或在阻塞方法上让它抛 <code>InterruptedException</code>。'},
      {p:'对于“多个任务并发、最后合并结果”的场景，JDK 8 之后更推荐 <code>CompletableFuture</code>（下一章会讲），它的组合能力比手工管理一堆 Future 强得多。'},
      { p: '下面这段代码演示“等超时”和“任务还在跑”是两件事。' },
      { code: `import java.util.concurrent.*;

public class SubmitFuture {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Future<Integer> f = pool.submit(() -> {
            Thread.sleep(2000);   // 模拟一个耗时 2 秒的任务
            return 42;
        });

        try {
            System.out.println("结果=" + f.get(500, TimeUnit.MILLISECONDS));
        } catch (TimeoutException e) {
            System.out.println("等超时了，任务还在跑吗？isDone=" + f.isDone());
            boolean cancelled = f.cancel(true);   // 发出中断信号
            System.out.println("取消成功？" + cancelled);
        }
        pool.shutdown();
    }
}`, title: 'SubmitFuture.java' },
      { out: '等超时了，任务还在跑吗？isDone=false\n取消成功？true' },
      { p: '只等了 500 毫秒，任务要 2 秒，所以 <code>get</code> 抛 <code>TimeoutException</code>；此时 <code>isDone()</code> 仍是 false，说明后台线程还在 <code>sleep</code>。<code>cancel(true)</code> 给线程发中断，<code>sleep</code> 会抛 <code>InterruptedException</code>，任务提前结束，于是返回 true。如果把 <code>sleep</code> 换成一个不检查中断的死循环，<code>cancel</code> 就会返回 false——中断只是“请求”，不是“命令”。' },

      { h: '4.7 关闭线程池：shutdown 与 shutdownNow' },
      {p:'线程池里的线程默认是非守护线程，只要池子没关，JVM 就不会退出。所以“用完要关”不是礼貌，是必须。两个关闭方法的语义完全不同：'},
      {list:[
      '<code>shutdown()</code>：不再接受新任务，但已经提交的任务（包括在队列里排队的）会继续执行完。这是优雅关闭，应该优先使用。',
      '<code>shutdownNow()</code>：不再接受新任务，并且尝试中断正在执行的线程，同时把队列里没开始的任务作为一个 <code>List</code> 返回给你。注意“尝试”二字——不响应中断的任务照样跑完。',
      '<code>awaitTermination(timeout, unit)</code>：等待池子真正结束，返回布尔值表示是否在超时前结束。通常和 <code>shutdown()</code> 搭配，形成“先温和、再强硬”的两段式关闭。'
    ]},
      {p:'一个稳妥的关闭模板是：先 <code>shutdown()</code>，然后 <code>awaitTermination</code> 等若干秒，如果还没结束再 <code>shutdownNow()</code>，最后再等一次并记录告警。这样既给了在途任务完成的机会，又保证进程不会无限挂住。'},
      {note:'不要在每次任务结束时关闭共享线程池。线程池的价值就在于复用，关了再建等于把创建销毁的成本又付了一遍。池子应该由持有它的组件（如 Spring 容器）在生命周期结束时统一关闭。'},
      { p: '关闭的两个阶段，用代码走一遍最清楚。' },
      { code: `import java.util.concurrent.*;

public class ShutdownDemo {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        for (int i = 1; i <= 4; i++) {
            int id = i;
            pool.submit(() -> {
                System.out.println("任务" + id + " 开始");
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    System.out.println("任务" + id + " 被中断");
                    return;
                }
                System.out.println("任务" + id + " 结束");
            });
        }

        pool.shutdown();                 // 不再接新任务，已提交的继续跑

        try {
            pool.submit(() -> System.out.println("新任务"));
        } catch (RejectedExecutionException e) {
            System.out.println("shutdown 后提交被拒绝");
        }

        boolean done = pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("全部结束？" + done);
    }
}`, title: 'ShutdownDemo.java' },
      { out: '任务1 开始\n任务2 开始\nshutdown 后提交被拒绝\n任务1 结束\n任务2 结束\n任务3 开始\n任务4 开始\n任务3 结束\n任务4 结束\n全部结束？true' },
      { p: '两个线程先跑任务 1、2，任务 3、4 在队列里排队。<code>shutdown()</code> 之后队列里的任务照样执行完，但新的 <code>submit</code> 立刻被拒绝。<code>awaitTermination(10, SECONDS)</code> 最多等 10 秒，四个任务各 1 秒、两个线程跑两轮共约 2 秒，所以返回 true。如果返回 false，就应该接着调用 <code>shutdownNow()</code>。' },

      { h: '4.8 线程数到底设多少' },
      {p:'这是一个没有标准答案、但有标准思路的问题。先看任务类型：'},
      {list:[
      '<b>CPU 密集型</b>（计算、加解密、图像处理）：线程数约等于 CPU 核数，最多加 1，多了只会增加上下文切换。',
      '<b>IO 密集型</b>（数据库、HTTP 调用、文件读写）：线程大部分时间在等，可以开到核数的 2 倍甚至更多。',
      '<b>混合型</b>：拆成两个池，或者按“等待时间 / 计算时间”的比值来估算。'
    ]},
      {p:'有一个流传很广的公式：线程数 = 核数 × (1 + 等待时间 / 计算时间)。比如一次请求计算 10ms、等数据库 90ms，等待占比 90%，8 核机器上大约需要 8 × (1 + 9) = 80 个线程。这个公式给出的是量级，不是精确值。'},
      {p:'真正的做法是：先按公式给一个初值，然后压测，观察三个指标——任务排队时间、线程池活跃线程数、CPU 使用率。如果 CPU 没跑满但任务排队严重，说明线程太少或下游太慢；如果 CPU 已经 90% 以上、上下文切换频繁，说明线程太多。参数是调出来的，不是背出来的。'},

      { h: '4.9 拒绝策略与自定义线程工厂' },
      {p:'当队列满、线程也到顶时，池子必须对“还要提交的任务”做个决定，这就是拒绝策略。JDK 内置四种：'},
      {table:{head:['策略','行为','适用场景'],rows:[
      ['AbortPolicy（默认）','抛出 RejectedExecutionException','希望调用方立刻感知失败，配合上游重试或降级'],
      ['CallerRunsPolicy','由提交任务的线程自己执行','天然背压：调用者被占住，就没法继续提交，流量自动降下来'],
      ['DiscardPolicy','静默丢弃新任务','可丢弃的采集、上报类任务'],
      ['DiscardOldestPolicy','丢掉队列里最老的任务，再尝试提交','只关心最新数据的场景，如实时行情刷新']
    ]}},
      {p:'生产环境里，<code>AbortPolicy</code> 加业务侧捕获、<code>CallerRunsPolicy</code> 做背压，是最常见的两种组合。<code>DiscardPolicy</code> 要慎用，因为它连日志都不打，出问题时你甚至不知道丢了什么。'},
      {p:'自定义拒绝策略也很简单：实现 <code>RejectedExecutionHandler</code>，在 <code>rejectedExecution</code> 里记录任务信息、打点、落盘或转投其他池。关键是别静默——任何一个被拒绝的任务都应该在监控上留下痕迹。'},
      {p:'线程工厂同理，实现 <code>ThreadFactory</code> 并返回设置了名字的线程即可。名字里带上池名和序号，配合日志里的线程名，排查问题时能省下大量时间。'},
      { p: '把 core 和 max 都设成 1、队列只给 1 个位置，再提交 3 个任务，就能稳定复现一次拒绝。' },
      { code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class RejectAndFactory {
    public static void main(String[] args) throws Exception {
        AtomicInteger seq = new AtomicInteger();

        ThreadFactory factory = r -> {
            Thread t = new Thread(r, "worker-" + seq.incrementAndGet());
            t.setDaemon(false);
            return t;
        };

        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                1, 1, 0, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(1), factory,
                new ThreadPoolExecutor.AbortPolicy());

        pool.execute(() -> sleep());
        pool.execute(() -> sleep());

        try {
            pool.execute(() -> sleep());
        } catch (RejectedExecutionException e) {
            System.out.println("第 3 个任务被拒绝：" + e.getClass().getSimpleName());
        }
        pool.shutdown();
    }

    static void sleep() {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}`, title: 'RejectAndFactory.java' },
      { out: '第 3 个任务被拒绝：RejectedExecutionException' },
      { p: '第 1 个任务创建核心线程；第 2 个任务进队列（容量 1，此时队列满）；第 3 个任务到来时队列满、线程数已等于 maximum，只能走拒绝策略，<code>AbortPolicy</code> 直接抛异常。把策略换成 <code>CallerRunsPolicy</code>，第 3 个任务会在 <code>main</code> 线程里执行，不会抛异常——这就是“背压”和“失败”的区别。' },

      { h: '4.10 Executors 工厂的坑与六个真实事故' },
      {p:'<code>java.util.concurrent.Executors</code> 提供了一组静态工厂方法，一行代码就能拿到线程池。它们用起来很爽，但每个都藏着默认参数带来的风险。'},
      {table:{head:['工厂方法','等价配置','适用场景','风险'],rows:[
      ['newFixedThreadPool(n)','core=max=n，无界 LinkedBlockingQueue','任务量可预期、需要限制并发','队列无界，任务堆积会 OOM'],
      ['newCachedThreadPool()','core=0，max=Integer.MAX_VALUE，SynchronousQueue，60 秒','大量短小、突发任务','线程数无上限，可能创建海量线程'],
      ['newSingleThreadExecutor()','core=max=1，无界队列','需要严格串行执行的任务','队列无界；一个任务卡死全部排队'],
      ['newScheduledThreadPool(n)','ScheduledThreadPoolExecutor，DelayedWorkQueue','定时、周期任务','周期任务抛异常会静默停止后续执行'],
      ['newWorkStealingPool()','ForkJoinPool，并行度=CPU 核数','分治型计算任务','不适合阻塞 IO，任务拆分不当反而更慢']
    ]}},
      {p:'《阿里巴巴 Java 开发手册》明确要求：线程池不允许使用 <code>Executors</code> 去创建，而要通过 <code>ThreadPoolExecutor</code> 的方式，让写代码的人清楚知道每个参数的含义。原因就是上表最后一列——这些工厂方法把最关键的两个决策（队列是否有界、最大线程数是多少）藏了起来，而它们恰恰是事故的来源。'},
      {p:'一个折中的做法是：用工厂方法做原型验证没问题，但进入生产的代码一律显式 new <code>ThreadPoolExecutor</code>，并给队列设一个明确容量。'},
      {ol:[
      '<b>无界队列导致 OOM。</b>池子看着很稳，线程数始终是 core，但队列里堆了几十万个任务，每个任务持有请求对象，堆被撑爆。修法：给队列设容量。',
      '<b>submit 之后不 get，异常丢失。</b>任务全失败，监控上却一片绿。修法：任务体内 try-catch 打日志，或用 execute。',
      '<b>在池子的任务里又向同一个池子提交任务并等待结果。</b>池子被占满时，外层任务等内层任务，内层任务排队等线程，形成死锁。修法：拆成两个池，或改用 CompletableFuture 组合。',
      '<b>ThreadLocal 不清理。</b>线程被复用，上一个请求的数据泄漏到下一个请求。修法：finally 里 remove。',
      '<b>用完了不 shutdown，进程退不出去。</b>或者反过来，在 finally 里 shutdown 了一个共享池，导致后续任务全部被拒绝。',
      '<b>把池子当锁用。</b>比如用单线程池来保证串行，结果一个任务卡住，整条链路全堵。串行化应该用锁或队列，而不是一个只有 1 个线程的池。'
    ]},

      { h: '4.11 本章小结' },
      {list:[
      '线程是昂贵资源，线程池通过复用线程、限制并发、统一管理来解决 new Thread 的三大问题。',
      '<code>ThreadPoolExecutor</code> 七个参数中，<code>corePoolSize</code>、<code>workQueue</code>、<code>maximumPoolSize</code>、<code>handler</code> 决定了池子的行为。',
      '提交顺序是：核心线程 → 入队 → 扩容到 max → 拒绝。队列是否有界，直接决定 max 参数是否起作用。',
      '<code>Executors</code> 的工厂方法把关键参数藏了起来，生产代码建议显式构造。',
      '<code>execute</code> 抛异常，<code>submit</code> 藏异常；<code>get</code> 超时不等于任务停止。',
      '关闭用 <code>shutdown</code> + <code>awaitTermination</code>，必要时再 <code>shutdownNow</code>。',
      '线程数没有万能公式，先估算再压测，看排队时间、活跃线程数、CPU 三个指标。'
    ]},

      { h: '4.12 常见追问' },
      { list: [
        '<b>问：核心线程数设为 0 会怎样？</b><br>答：新任务进来时当前线程数为 0，池子不会立刻建线程，而是先把任务塞进队列；只有队列满了才会创建线程。于是线上表现可能很反直觉：明明有活干，池里却长期只有一两个线程，任务全在队列里排队。除非你确实想要「队列优先」的语义，核心线程数不要设 0，通常至少等于常态并发数。',
        '<b>问：为什么我配了 maximumPoolSize=100，线程数却一直是 8？</b><br>答：因为队列没满。线程池的扩张顺序是：先用核心线程、再入队、队列满了才扩到最大线程、再满才拒绝。用无界队列（默认的 <code>LinkedBlockingQueue</code>）时队列永远不满，maximumPoolSize 这个参数等于失效。想让它生效就把队列设成有界容量，或者直接用 <code>SynchronousQueue</code> 让任务必须当场交接。',
        '<b>问：线程池里的线程抛异常后会怎样？</b><br>答：看是用 execute 还是 submit。execute 提交的任务抛出未捕获异常，那个工作线程会终止，池子随后新建一个补上、容量不受影响，异常会交给默认处理器打印。submit 提交时异常被装进 Future，线程根本不死，也不会有任何输出——如果你从不调用 get，这个错误就彻底消失了。所以要么在任务体里自己 try-catch 记日志，要么给池子配 UncaughtExceptionHandler。',
        '<b>问：ScheduledThreadPoolExecutor 的周期任务，一次抛异常会怎样？</b><br>答：后续所有周期执行都会被静默取消，没有日志、没有提示，监控上只会看到任务不再跑了。因为一次执行抛出异常后，内部会把这个任务从队列里移除。所以周期任务体必须自己 try-catch 兜住所有 <code>Throwable</code> 并记日志，让这一轮失败、下一轮照常继续；否则一次网络抖动就能让定时对账永久停摆。',
        '<b>问：JDK 21 的虚拟线程还需要线程池吗？</b><br>答：通常不再需要池化。虚拟线程由 JVM 调度、栈按需增长，用 <code>Executors.newVirtualThreadPerTaskExecutor()</code> 一个任务一个就够。但并发上限依然要控制，只是限制手段从「线程数」换成了「稀缺资源数」：信号量、数据库连接池、HTTP 客户端的连接上限。另外要留意的不是性能而是阻塞语义，早期版本里 synchronized 块内的阻塞会把载体线程钉住，JDK 24 起已经解决。',
        '<b>问：怎么监控一个线程池？</b><br>答：<code>ThreadPoolExecutor</code> 已经暴露了 <code>getPoolSize()</code>、<code>getActiveCount()</code>、<code>getQueue().size()</code>、<code>getCompletedTaskCount()</code>，定时打点到监控系统即可。最值得告警的两个信号是：队列长度持续上涨，说明生产快过消费；活跃线程数长期顶在最大值，说明已经打满。队列总是先涨、线程后满，所以队列长度是最早的预警。要更细就自定义 ThreadPoolExecutor，覆写 <code>beforeExecute</code> 和 <code>afterExecute</code> 记录每个任务耗时。'
      ] },

      { h: '4.13 自测与练习' },
      {ol:[
      '手写一个 <code>ThreadPoolExecutor</code>，参数为 core=2、max=4、队列容量 2、线程名前缀 <code>demo-</code>，提交 10 个各睡 1 秒的任务，打印每次提交后池子的线程数与队列长度，解释你看到的现象。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：前 2 个任务立刻开跑（poolSize=2、queue=0），第 3、4 个进队列（queue 涨到 2），第 5、6 个把线程扩到 4 并立刻执行，第 7 个开始抛 <code>RejectedExecutionException</code>。<b>为什么</b>：执行顺序是核心线程、入队、扩到最大线程、最后拒绝；队列只有 2 个位置，所以池子最多同时容纳 6 个任务。<b>要点</b>：提交 10 个必须自己写拒绝策略，否则第 7 个就炸；打印时同时看 <code>getPoolSize()</code>、<code>getQueue().size()</code> 和 <code>getActiveCount()</code>，才看得出任务停在哪一步。</div></details>',
      '把上题的队列换成无界 <code>LinkedBlockingQueue</code>，再跑一次，说明为什么线程数最多只有 2。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：线程数始终是 2，10 个任务全部进队列，后 8 个要等前两个跑完才依次执行，总耗时约 5 秒，而且一次拒绝都没有。<b>为什么</b>：无界队列永远不满，而扩容到 maximumPoolSize 的前提正是队列已满，所以那 8 个线程永远不会被创建；任务全堆在内存里，量一大就是 OOM 隐患。<b>要点</b>：想要固定大小就用 core 等于 max 的语义（如 newFixedThreadPool）；想要弹性就必须有界队列配合理拒绝策略。</div></details>',
      '写一个 <code>submit</code> 提交、任务内抛 <code>RuntimeException</code> 的例子，先不调用 <code>get</code>，观察控制台；再调用 <code>get</code>，观察异常类型，并解释 <code>ExecutionException</code> 里的 cause 是什么。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：不调用 <code>get</code> 时控制台一片安静，程序正常结束；调用 <code>get</code> 时抛 <code>ExecutionException</code>，它的 <code>getCause()</code> 正是那个 RuntimeException，原始堆栈完整保存在其中。<b>为什么</b>：<code>submit</code> 把任务包成 FutureTask，异常被捕获后存进结果字段，只有 <code>get</code> 时才重放并包一层；而 <code>execute</code> 是直接交给线程跑，异常会走 UncaughtExceptionHandler。<b>要点</b>：要么任务体内自己 try-catch，要么在 get 处捕获并打印 cause；批量提交和定时任务最容易把异常吞掉。</div></details>',
      '实现一个自定义 <code>RejectedExecutionHandler</code>，在拒绝时打印任务类型和当前队列长度，并统计拒绝次数。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：每次拒绝都打印一行，形如 <code>reject DemoTask queue=2</code>，最终拒绝数等于提交数减接受数（例如提交 10、接受 6、拒绝 4）。<b>为什么</b>：拒绝发生在「线程已达最大数且队列已满」的时刻，由 handler 的 <code>rejectedExecution</code> 回调，所以此刻队列长度必然等于容量。<b>要点</b>：四种现成策略是 Abort 抛异常、CallerRuns 让调用线程自己跑（天然背压）、Discard、DiscardOldest；生产上更常用 CallerRuns 或自定义落库，并给拒绝计数打点告警。</div></details>',
      '用 <code>shutdown()</code> 加 <code>awaitTermination(5, SECONDS)</code> 关闭一个还有 3 个长任务的池子，观察返回值与剩余任务是否执行完。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>shutdown</code> 之后池子不再接收新任务，已提交的 3 个任务继续跑；5 秒内跑完返回 <code>true</code>，若每个任务要 60 秒则返回 <code>false</code>，此时任务仍在跑，JVM 也不会退出。<b>为什么</b>：<code>shutdown</code> 只停止接收并等已提交任务结束，不会中断它们；<code>awaitTermination</code> 只是最多等这么久，超时返回 false 且不改变任何状态。<b>要点</b>：返回 false 后要决定继续等还是 <code>shutdownNow</code>——它会中断线程并返回没开始执行的任务列表，但中断是协作式的，sleep 能响应、死循环不行。</div></details>',
      '估算：8 核机器，任务平均计算 5ms、等待 45ms，按公式该配多少线程？如果下游数据库连接池只有 20 个连接，这个估算还成立吗？为什么？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：按公式 N = 核数 × (1 + 等待/计算) 得到 8 × 10 = 80 个线程；但连接池只有 20 个，80 个线程里同时最多 20 个能拿到连接，其余全堵在获取连接上，实际应配到 20 出头。<b>为什么</b>：那个公式假设等待期间不占用稀缺资源；连接池是硬上限，超过它的线程只会拉长等待时间，把线程本身变成新瓶颈。<b>要点</b>：线程数上限取 min(公式值, 下游最紧的资源数) 再加一点余量，并给获取连接设超时，别让线程无限等。</div></details>'
    ]},
    ]
};
T['concurrent-collections'] = {
  meta: '本章约 8200 字 · 建议 60 分钟 · 配套流程图与 6 道练习',
  blocks: [
      { h: '5.1 为什么普通的集合一进多线程就出事' },
      {p:'前面几章我们一直在解决“多个线程同时改一个变量”的问题。但真实项目里，共享的往往不是一两个 int，而是一整个容器：缓存表、在线用户列表、待处理任务队列。把这些普通的 <code>HashMap</code>、<code>ArrayList</code> 直接丢给多个线程用，后果比计数器错乱严重得多——轻则丢数据，重则 CPU 打满、进程卡死。'},
      {p:'先看两个最典型的场景。第一个是并发写入：两个线程同时对同一个 <code>HashMap</code> 执行 <code>put</code>，而这两个 key 恰好落在同一个桶里，它们会各自读到“桶里现在没有元素”，然后各自把新节点挂上去——后写的覆盖先写的，其中一个 put 凭空消失。第二个是并发扩容：一个线程正在扩容搬迁数据，另一个线程同时在读，读到的可能是搬迁到一半的中间状态。'},
      {p:'很多人记得“JDK 7 的 HashMap 并发扩容会形成环形链表，导致 CPU 100%”。这个说法在 JDK 8 之后基本不成立了，因为 JDK 8 改成了尾插法，不再反转链表顺序。但这不代表可以放心并发用——JDK 8 的 <code>HashMap</code> 并发下依然会丢数据、<code>size</code> 计数错误、树化过程错乱。结论没变：<b>HashMap 不是线程安全的，任何多线程写入都必须换容器或加锁</b>。'},
      {p:'第二个场景是遍历时修改。几乎每个人都见过这个异常：'},
      {out:'Exception in thread "Thread-0" java.util.ConcurrentModificationException\n\tat java.base/java.util.HashMap$HashIterator.nextNode(HashMap.java:1511)'},
      {p:'这叫 fail-fast（快速失败）：集合内部维护了一个 <code>modCount</code>，每次结构性修改就加一；迭代器创建时记下当时的值，之后每取一个元素就比对一次，一旦发现对不上就立刻抛异常。它的设计意图是“尽早暴露 bug”，而不是“保证安全”。所以它有两个特点：一是不保证一定抛（并发修改未必被检测到），二是抛了也不能说明数据结构此刻一定损坏——它只是一个尽力而为的检查。'},
      {note:'看到 ConcurrentModificationException，不要想着 try-catch 掉。它说明你的代码在“边遍历边改”，正确的修法是换容器、改用迭代器的 remove、或者先收集再统一修改。'},

      { h: '5.2 旧的线程安全容器，为什么被淘汰' },
      {p:'Java 早期提供了 <code>Hashtable</code> 和 <code>Collections.synchronizedMap()</code> 来解决问题。它们的做法很直接：给每个方法套一把锁，进入方法就锁住整个容器。这样确实安全了，但代价是所有线程串行化——10 个线程读，也要一个一个排队，并发度退化成 1。'},
      {p:'更麻烦的是复合操作仍然不安全。比如“先检查再放入”：'},
      {list:[
      '<code>if (!map.containsKey(k)) map.put(k, v);</code> 这两步之间，别的线程可能已经放进去了；',
      '遍历时仍然要自己 <code>synchronized (map)</code>，否则迭代器照样抛异常；',
      '一个线程在做耗时操作时持有全表锁，其他所有线程全部阻塞。'
    ]},
      {p:'所以现代 Java 的思路变了：不再用“一把大锁保护整个容器”，而是把锁拆细，只锁真正冲突的那一小块；读操作尽量不加锁；并把“检查 + 修改”合并成一个原子方法暴露出来。<code>java.util.concurrent</code> 包里的集合就是按这个思路设计的。'},

      { h: '5.3 ConcurrentHashMap：把锁拆到每个桶上' },
      {p:'<code>ConcurrentHashMap</code> 是并发场景下使用频率最高的容器。它的内部结构在 JDK 8 之后是“Node 数组 + 链表 + 红黑树”，和 <code>HashMap</code> 很像，但写入路径完全不同：'},
      {ol:[
      '如果目标桶是空的，用 CAS 直接把新节点放进去，全程不加锁；',
      '如果桶里已经有元素，用 <code>synchronized</code> 锁住这个桶的头节点，只让操作同一个桶的线程排队，其他桶不受影响；',
      '如果桶里是红黑树，就按树的插入逻辑处理；',
      '插入后判断链表长度，超过阈值（默认 8）且数组容量足够时，把链表转成红黑树，避免极端情况下退化成链表。'
    ]},
      {p:'扩容也做了并发化：它支持多线程协同搬迁，每个线程认领一段桶区间，搬完把旧桶标记成 ForwardingNode，读操作遇到这种节点就去新表里找。这样扩容期间读操作几乎不受影响，写操作也不会整体停摆。'},
      {p:'计数同样被拆散了。多线程同时 <code>put</code> 时，如果都去更新同一个 <code>size</code> 变量，又会变成热点。它用了类似 <code>LongAdder</code> 的 <code>CounterCell</code> 数组，不同线程更新不同的格子，<code>size()</code> 时再把所有格子加起来。所以 <code>size()</code> 返回的是估算值，不保证是某一瞬间的精确值——这是并发容器的通病，用之前要想清楚业务能不能接受。'},
      {p:'还有一条硬规则：<b>ConcurrentHashMap 不允许 null 键和 null 值</b>。原因很实在——<code>get</code> 返回 null 时，你没法区分“这个 key 不存在”和“这个 key 对应的值就是 null”。单线程的 HashMap 允许你再用 <code>containsKey</code> 判断，但在并发场景下，这两次调用之间状态可能已经变了，判断没有意义。所以它干脆禁止 null，让语义保持唯一。'},
      {p:'使用上还有一点：它的迭代器是<b>弱一致</b>的。遍历过程中不会抛 <code>ConcurrentModificationException</code>，但也不保证能看到遍历开始之后的其他线程所做的修改，某个元素可能被看到，也可能不被看到。这对“统计当前大致有多少在线用户”完全够用，但对“必须精确快照”的场景就不合适，需要自己加锁或改用不可变快照。'},
      { p: '先跑一个“故意不设防”的实验。下面这段代码用 8 个线程各插入 1000 次，理论上应该是 8000 个键。' },
      { code: `import java.util.*;

public class HashMapRace {
    public static void main(String[] args) throws Exception {
        Map<Integer, Integer> map = new HashMap<>();
        Thread[] threads = new Thread[8];
        for (int i = 0; i < threads.length; i++) {
            int base = i * 1000;
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    map.put(base + j, j);
                }
            });
            threads[i].start();
        }
        for (Thread t : threads) t.join();
        System.out.println("期望 8000，实际 " + map.size());
    }
}`, title: 'HashMapRace.java' },
      { out: '期望 8000，实际 7756' },
      { p: '每个线程负责 1000 个互不重复的 key，理论上不可能冲突，但结果还是少了。原因就是第 10 行的 <code>put</code> 内部要“定位桶 → 读桶头 → 挂新节点 → 修改 size”，这些步骤之间没有任何同步，两个线程可能同时读到同一个空桶，然后互相覆盖。把 <code>HashMap</code> 换成 <code>ConcurrentHashMap</code>，再跑一次，结果会稳定是 8000——这就是“锁拆到桶上”带来的正确性。' },

      { h: '5.4 用好原子复合方法，别自己拼“检查再修改”' },
      {p:'并发容器最有价值的地方，是把常见的复合操作做成了单个原子方法。你不用自己加锁，只要用对方法，就等于免费获得了正确性。'},
      {table:{head:['方法','语义','典型用途'],rows:[
      ['putIfAbsent(k, v)','key 不存在时才放入','本地缓存、去重集合'],
      ['computeIfAbsent(k, fn)','不存在时用函数算出值并放入','缓存加载、分组'],
      ['computeIfPresent(k, fn)','存在时用函数更新','带条件的更新'],
      ['compute(k, fn)','无论是否存在都按函数重算','计数、累加、状态机'],
      ['merge(k, v, fn)','不存在则放 v，存在则用 fn 合并','词频统计、指标累加'],
      ['replace(k, old, new)','值等于 old 时才替换','乐观锁式的更新']
    ]}},
      {p:'这几个方法的价值在于“整段逻辑在同一个桶锁内完成”。比如用 <code>computeIfAbsent</code> 做缓存，整个“查不到就去加载再放入”是在锁内执行的，不会出现两个线程同时加载同一份数据。但这也带来一个必须注意的陷阱：'},
      {note:'传给 computeIfAbsent 的函数里不要做两件事：一是耗时操作（比如远程调用），因为它可能持有桶锁；二是在函数内部再次修改同一个 map，可能造成死锁或递归。正确做法是先在锁外把值准备好，再 putIfAbsent。'},
      { p: '缓存是 <code>ConcurrentHashMap</code> 最常见的用法，下面用 <code>computeIfAbsent</code> 写一个线程安全的本地缓存。' },
      { code: `import java.util.concurrent.*;

public class CacheDemo {
    private static final ConcurrentHashMap<String, String> CACHE = new ConcurrentHashMap<>();

    static String load(String key) {
        // 模拟慢查询：只有真正未命中时才会走这里
        try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return "value-of-" + key;
    }

    static String get(String key) {
        return CACHE.computeIfAbsent(key, CacheDemo::load);
    }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 8; i++) {
            final int id = i;
            pool.submit(() -> System.out.println(id + " -> " + get("user:1")));
        }
        pool.shutdown();
        System.out.println("缓存大小：" + CACHE.size());
    }
}`, title: 'CacheDemo.java' },
      { out: '0 -> value-of-user:1\n1 -> value-of-user:1\n2 -> value-of-user:1\n3 -> value-of-user:1\n4 -> value-of-user:1\n5 -> value-of-user:1\n6 -> value-of-user:1\n7 -> value-of-user:1\n缓存大小：1' },
      { p: '8 个线程同时请求同一个 key，<code>load</code> 只被调用了一次，其余 7 个线程在桶锁上等待第一个线程算完，然后直接拿到缓存值。如果换成 <code>if (!CACHE.containsKey(k)) CACHE.put(k, load(k));</code>，<code>load</code> 会被调用 8 次，还可能互相覆盖。这里 <code>load</code> 里只是 sleep，真实场景若是数据库查询，差距就是 1 次对 8 次。' },

      { h: '5.5 CopyOnWriteArrayList：读多写极少的场景专用' },
      {p:'<code>CopyOnWriteArrayList</code> 的思路非常暴力：任何写操作（add、set、remove）都不动原数组，而是复制出一份新数组，在新数组上改完，再把内部引用指向新数组。读操作则完全不加锁，直接读当前引用指向的数组。'},
      {p:'这样做的直接结果是：读非常快，而且读到的永远是一个完整、不会被修改的数组快照。遍历时即使别的线程在 add，你手里的迭代器也不会抛异常，也不会看到新元素——你看到的就是创建迭代器那一刻的样子。'},
      {p:'代价也很明显：每次写都要复制整个数组，时间复杂度 O(n)，内存瞬间翻倍。所以它只适合“读操作远多于写操作、元素数量不大”的场景，比如监听器列表、黑白名单、路由配置。如果列表有几万个元素还频繁写，用它就是灾难。'},
      {p:'另外它的迭代器是只读的：不支持 <code>remove</code>、<code>set</code>、<code>add</code>，调用会抛 <code>UnsupportedOperationException</code>。修改必须通过集合本身的方法来做。'},
      { p: '下面用 <code>CopyOnWriteArrayList</code> 维护一个监听器列表，演示“写时复制”和“遍历不受影响”。' },
      { code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class ListenerDemo {
    private static final List<String> LISTENERS = new CopyOnWriteArrayList<>();

    public static void main(String[] args) throws Exception {
        LISTENERS.add("sms");
        LISTENERS.add("email");

        Thread reader = new Thread(() -> {
            for (String l : LISTENERS) {
                System.out.println("读到监听器：" + l);
                try { Thread.sleep(100); } catch (InterruptedException e) { return; }
            }
        });
        reader.start();

        Thread.sleep(50);
        LISTENERS.add("push");            // 遍历过程中新增
        System.out.println("新增后 size=" + LISTENERS.size());

        reader.join();
        System.out.println("读线程结束，最终 size=" + LISTENERS.size());
    }
}`, title: 'ListenerDemo.java' },
      { out: '读到监听器：sms\n新增后 size=3\n读到监听器：email\n读线程结束，最终 size=3' },
      { p: '读线程拿到的是创建迭代器那一刻的数组快照，所以它只看到 sms 和 email，没看到后来加的 push；而 <code>size()</code> 读的是最新的内部引用，已经是 3。整个过程没有抛 <code>ConcurrentModificationException</code>，也没有加锁——代价是 <code>add</code> 复制了一个长度为 2 的新数组。' },

      { h: '5.6 阻塞队列：并发编程里最实用的组件' },
      {p:'阻塞队列（<code>BlockingQueue</code>）在普通队列的基础上加了两条规则：队列满时放入会阻塞，队列空时取出会阻塞。就这两条规则，把“生产者太快撑爆内存”和“消费者空转烧 CPU”两个问题一起解决了。'},
      {p:'它提供四组方法，区别只在“队列满/空时怎么办”：'},
      { list: [
        '<b>放入</b>：<code>add(e)</code> 满了抛 <code>IllegalStateException</code>；<code>offer(e)</code> 满了返回 false；<code>put(e)</code> 满了阻塞；<code>offer(e, t, unit)</code> 最多等 t。',
        '<b>取出</b>：<code>remove()</code> 空了抛 <code>NoSuchElementException</code>；<code>poll()</code> 空了返回 null；<code>take()</code> 空了阻塞；<code>poll(t, unit)</code> 最多等 t。',
        '<b>查看</b>：<code>element()</code> 空了抛异常，<code>peek()</code> 空了返回 null，两者都不会阻塞。'
      ] },
      {p:'常用的几种实现，行为差别很大，选错了会出事故：'},
      {table:{head:['实现','是否有界','底层结构','适用场景'],rows:[
      ['ArrayBlockingQueue','必须指定容量','数组 + 一把锁两个条件','容量明确的池化队列'],
      ['LinkedBlockingQueue','可选，默认 Integer.MAX_VALUE','链表 + 两把锁','吞吐较高，但默认值等于无界，慎用'],
      ['SynchronousQueue','容量为 0','不存储元素，直接配对','任务交接，配合 cached 线程池'],
      ['PriorityBlockingQueue','无界','堆','按优先级取任务'],
      ['DelayQueue','无界','优先队列 + 延迟','定时任务、订单超时关闭']
    ]}},
      {p:'特别提醒 <code>LinkedBlockingQueue</code>：它的无参构造器容量是 <code>Integer.MAX_VALUE</code>，名义上有界，实际上等于无界。很多“内存慢慢涨到 OOM”的事故就是它造成的。用它时请显式指定容量。'},

      { h: '5.7 用阻塞队列写一个生产者-消费者' },
      {p:'这是阻塞队列最经典的用法，也是理解“用队列解耦”的最好例子。生产者只管往里放，消费者只管往外取，两边互不知道对方的存在，中间靠一个有界队列缓冲。'},
      {flow:['生产者生成任务','put 入队（队列满则阻塞）','消费者 take 取出（队列空则阻塞）','处理任务','处理完成，继续 take']},
      {p:'为什么要用有界队列？因为它是天然的背压机制：消费者处理不过来时，队列会满，生产者自然被阻塞，整个系统的速度被最慢的一环拖住，而不是让任务无限堆积直到内存耗尽。'},
      { p: '把 5.7 的流程写成代码，观察队列长度如何在 0 到 5 之间来回。' },
      { code: `import java.util.concurrent.*;

public class ProduceConsume {
    public static void main(String[] args) throws Exception {
        BlockingQueue<String> queue = new ArrayBlockingQueue<>(5);

        Thread producer = new Thread(() -> {
            for (int i = 1; i <= 12; i++) {
                try {
                    queue.put("任务" + i);
                    System.out.println("生产 任务" + i + "，队列长度=" + queue.size());
                    Thread.sleep(100);
                } catch (InterruptedException e) { return; }
            }
        });

        Thread consumer = new Thread(() -> {
            while (true) {
                try {
                    String task = queue.take();
                    System.out.println("  消费 " + task + "，队列长度=" + queue.size());
                    Thread.sleep(300);
                } catch (InterruptedException e) { return; }
            }
        });

        consumer.setDaemon(true);
        producer.start();
        consumer.start();
        producer.join();
        Thread.sleep(2000);
    }
}`, title: 'ProduceConsume.java' },
      { out: '生产 任务1，队列长度=1\n  消费 任务1，队列长度=0\n生产 任务2，队列长度=1\n生产 任务3，队列长度=2\n  消费 任务2，队列长度=1\n生产 任务4，队列长度=2\n生产 任务5，队列长度=3\n生产 任务6，队列长度=4' },
      { p: '生产者每 100ms 放一个，消费者每 300ms 取一个，速度差 3 倍，所以队列长度会持续上涨；涨到 5 时 <code>put</code> 就会阻塞，生产者被迫停下来等消费者——这就是背压。如果队列换成无界的 <code>LinkedBlockingQueue</code>，生产者永远不会停，队列会一直涨到内存耗尽。' },

      { h: '5.8 并发集合怎么选' },
      {p:'面对一个具体需求，可以按下面的顺序判断：先问“是不是 key-value 结构”，再问“读多还是写多”，最后问“要不要阻塞语义”。'},
      {list:[
      '<b>key-value、读写都频繁</b>：<code>ConcurrentHashMap</code>，绝大多数场景的默认答案。',
      '<b>需要按 key 排序、并发度要求不高</b>：<code>ConcurrentSkipListMap</code>，它基于跳表，支持有序遍历。',
      '<b>读极多、写极少、元素少</b>：<code>CopyOnWriteArrayList</code> / <code>CopyOnWriteArraySet</code>。',
      '<b>需要有序集合</b>：<code>ConcurrentSkipListSet</code>。',
      '<b>生产消费解耦</b>：<code>BlockingQueue</code> 的各种实现。',
      '<b>只是传递一个值、不需要存储</b>：<code>SynchronousQueue</code> 或 <code>Exchanger</code>。'
    ]},
      {p:'如果这些都不合适，还有一个万能但沉重的选择：用普通集合并自己加锁。能用现成的并发容器就用，因为它们的锁粒度、内存可见性、扩容策略都是经过千锤百炼的，自己写很难写对。'},

      { h: '5.9 CompletableFuture：Future 的局限' },
      {p:'上一章我们学了 <code>Future</code>，它能拿到异步结果，但用起来很别扭：<code>get()</code> 是阻塞的，等于把异步又变回同步；它没法描述“完成之后再做一件事”；也没法把多个 Future 组合起来。于是 JDK 8 引入了 <code>CompletableFuture</code>，它实现了 <code>Future</code> 和 <code>CompletionStage</code>，核心能力是<b>编排</b>。'},
      {p:'可以把 <code>CompletableFuture</code> 理解成一张“任务流水线图纸”：你先描述每一步做什么、上一步的结果怎么传给下一步、出错时走哪条分支，然后一次性启动，最后由某个线程把整条链跑完。整条链上没有任何一处需要你主动阻塞等待。'},
      {p:'创建它有两种方式：<code>supplyAsync</code> 用于有返回值的任务，<code>runAsync</code> 用于没有返回值的任务。两者都有一个重载版本可以传入自定义线程池——这一点非常关键，后面会讲为什么。'},
      {p:'拿到之后，用这些方法往下串：'},
      {table:{head:['方法','作用','是否改变结果类型'],rows:[
      ['thenApply(fn)','用上一步的结果做转换','是，T → R'],
      ['thenAccept(consumer)','消费结果，无返回值','是，变成 Void'],
      ['thenRun(runnable)','不关心结果，只接着做','是，变成 Void'],
      ['thenCompose(fn)','fn 返回新的 CompletableFuture，扁平化','是，避免嵌套'],
      ['thenCombine(other, fn)','等两个都完成，合并结果','是'],
      ['exceptionally(fn)','只在上一步异常时执行，返回兜底值','是'],
      ['handle(fn)','无论成功失败都执行，可转换结果','是'],
      ['whenComplete(fn)','无论成败都执行，但不改变结果','否']
    ]}},
      {p:'这几个方法的名字容易混，记住一条规律：带 <code>Async</code> 后缀的会把回调丢到线程池里执行，不带后缀的则由“完成上一步的那个线程”顺手执行。很多人以为 <code>thenApply</code> 一定在新线程里跑，其实不一定——如果 future 在注册回调时已经完成，回调会直接在调用 <code>thenApply</code> 的线程里执行。'},

      { h: '5.10 组合多个任务、异常处理与六个坑' },
      {p:'真实业务里更常见的是“并发查三个服务，然后合并结果”。这时用 <code>thenCombine</code> 两两合并，或者用 <code>allOf</code> 等全部完成。'},
      {p:'<code>allOf</code> 返回的是 <code>CompletableFuture&lt;Void&gt;</code>，它只表示“都完成了”，不携带结果。所以标准写法是先 <code>allOf(...).join()</code>，再逐个 <code>join</code> 取出各自的结果。这里有个坑：<code>allOf</code> 在任意一个任务失败时会立刻以异常完成，但其他任务并不会被取消，它们还在后台跑。'},
      {p:'<code>anyOf</code> 则是“谁先完成用谁”，返回类型是 <code>Object</code>，需要自己强转。它适合“多副本查询，取最快的一个”这类场景。'},
      {p:'异常处理是 <code>CompletableFuture</code> 最容易出问题的地方。默认情况下，异常会沿着链条往后传，跳过所有正常的 <code>thenApply</code>，直到遇到 <code>exceptionally</code> 或 <code>handle</code>；如果整条链都没处理，最终调用 <code>join</code> 时会抛 <code>CompletionException</code>，而 <code>get</code> 抛 <code>ExecutionException</code>。如果你既不 join 也不处理，异常就彻底消失了——和上一章 <code>submit</code> 的问题一模一样。'},
      {note:'超时控制别忘。JDK 9 之后可以用 <code>orTimeout(3, TimeUnit.SECONDS)</code> 或 <code>completeOnTimeout(默认值, 3, SECONDS)</code>，前者超时抛异常，后者超时给默认值。没有超时的异步调用，等于把线程永久抵押出去。'},
      { p: '先看单条流水线怎么写：查用户 → 查订单 → 组装结果，三步全部异步串联。' },
      { code: `import java.util.concurrent.*;

public class CfBasics {
    static String queryUser(int id) {
        sleep(200);
        return "user-" + id;
    }

    static String queryOrder(String user) {
        sleep(300);
        return "order-of-" + user;
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        long start = System.currentTimeMillis();

        CompletableFuture<String> future = CompletableFuture
                .supplyAsync(() -> queryUser(1), pool)
                .thenApply(user -> user.toUpperCase())
                .thenCompose(user -> CompletableFuture.supplyAsync(() -> queryOrder(user), pool))
                .exceptionally(e -> "兜底结果");

        System.out.println("结果：" + future.join());
        System.out.println("耗时：" + (System.currentTimeMillis() - start) + "ms");
        pool.shutdown();
    }
}`, title: 'CfBasics.java' },
      { out: '结果：order-of-USER-1\n耗时：约 505ms' },
      { p: '<code>supplyAsync</code> 把查用户丢进池子；<code>thenApply</code> 拿到用户名字转大写；<code>thenCompose</code> 因为回调又返回一个 <code>CompletableFuture</code>，所以必须用它压平，否则会得到嵌套的 <code>CF&lt;CF&lt;String&gt;&gt;</code>；<code>exceptionally</code> 兜住任意一步的异常。总耗时约 505ms，正好是两段串行查询之和——因为第二步依赖第一步的结果，没法并行。' },
      { p: '再看“并发查两个服务再合并”，这是 <code>allOf</code> 和 <code>thenCombine</code> 的主场。' },
      { code: `import java.util.concurrent.*;

public class CfCombine {
    static String call(String name, long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        if (name.equals("库存") && ms > 400) throw new IllegalStateException("库存服务超时");
        return name + "-ok";
    }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        long start = System.currentTimeMillis();

        CompletableFuture<String> price = CompletableFuture.supplyAsync(() -> call("价格", 200), pool);
        CompletableFuture<String> stock = CompletableFuture.supplyAsync(() -> call("库存", 300), pool);

        CompletableFuture<String> merged = price.thenCombine(stock, (a, b) -> a + " + " + b);
        System.out.println("合并结果：" + merged.join());
        System.out.println("耗时：" + (System.currentTimeMillis() - start) + "ms");

        CompletableFuture<String> failed = CompletableFuture
                .supplyAsync(() -> call("库存", 500), pool)
                .handle((r, e) -> e == null ? r : "降级：库存未知");
        System.out.println("异常处理：" + failed.join());

        pool.shutdown();
    }
}`, title: 'CfCombine.java' },
      { out: '合并结果：价格-ok + 库存-ok\n耗时：约 302ms\n异常处理：降级：库存未知' },
      { p: '两个任务并行，总耗时取决于慢的那个（300ms），而不是两者之和。第 15 行的 <code>thenCombine</code> 等两个都完成后把结果拼起来；第 19 行的任务会抛异常，<code>handle</code> 的第二个参数拿到异常对象，这里选择返回降级值。注意 <code>handle</code> 无论成功失败都会执行，所以必须判断 <code>e == null</code>，否则成功时也会走到降级分支。' },
      {ol:[
      '<b>默认线程池是 commonPool。</b>不传 Executor 时用的是 <code>ForkJoinPool.commonPool()</code>，并行度是 CPU 核数减一。在里面做阻塞 IO，会把整个进程的公共池占死，所有用到它的地方一起卡住。IO 任务必须传自己的线程池。',
      '<b>在 commonPool 里再提交任务并 join。</b>池子被占满时形成互相等待，直接死锁。',
      '<b>CompletableFuture 的异常被静默吞掉。</b>没有 exceptionally、也没有 join，异常不会打印任何东西。',
      '<b>用 HashMap 缓存计算结果，多线程下 computeIfAbsent 递归修改同一个 map。</b>JDK 9 之后会直接抛 IllegalStateException，之前则可能死循环。',
      '<b>CopyOnWriteArrayList 上做批量写。</b>每次 add 复制一遍数组，10 万次 add 就是 10 万次复制，CPU 和 GC 都会崩。',
      '<b>把无界 LinkedBlockingQueue 当缓冲。</b>生产速度长期高于消费速度时，队列会一直涨到 OOM，而且没有任何告警。'
    ]},

      { h: '5.11 本章小结' },
      {list:[
      '普通集合不是线程安全的，并发写入会丢数据，遍历时修改会抛 ConcurrentModificationException，这是 fail-fast 检查而不是保护。',
      'Hashtable 和 synchronizedMap 用一把大锁换安全，并发度退化为 1，复合操作仍需自己加锁。',
      '<code>ConcurrentHashMap</code> 用 CAS 插入空桶、用 synchronized 锁桶头，读不加锁，size 是估算值，且不允许 null。',
      '优先使用 <code>computeIfAbsent</code>、<code>merge</code> 这类原子复合方法，别自己拼“检查再修改”。',
      '<code>CopyOnWriteArrayList</code> 适合读多写极少、元素少的场景，写操作 O(n) 复制。',
      '阻塞队列用“满则阻塞、空则阻塞”解决生产消费速度不匹配，有界队列是天然的背压。',
      '<code>CompletableFuture</code> 的核心是编排：thenApply 转换、thenCompose 扁平化、thenCombine 合并、exceptionally 兜底，务必传自定义线程池并设置超时。'
    ]},

      { h: '5.12 常见追问' },
      { list: [
        '<b>问：ConcurrentHashMap 的 get 要不要加锁？</b><br>答：不加。它内部 Node 的 <code>val</code> 和 <code>next</code> 都用 volatile 修饰，保证读到的永远是最新写入的值，读路径全程无锁，遇到正在扩容还会顺手帮忙迁移。代价是读只能保证弱一致：遍历途中别的线程改了表，你看到的是某一瞬间的混合视图，不会抛异常，也拿不到某个时刻的完整快照。',
        '<b>问：ConcurrentHashMap 能完全替代 HashMap 吗？</b><br>答：不能。它多了 CAS、volatile 写和锁桶的开销，单线程或低竞争场景下比 <code>HashMap</code> 慢；而且它不允许 null 键和 null 值，因为 <code>get</code> 返回 null 时无法区分「没有这个键」和「键在、值是 null」，并发下这个歧义也没法靠 containsKey 补救。没有共享需求就用 HashMap。',
        '<b>问：为什么 JDK 8 之后不再用分段锁？</b><br>答：分段锁把表切成默认 16 段、每段一把锁，并发度被 16 这个固定数字卡死，扩容也只能在段内做。JDK 8 改成锁单个桶的头节点加 CAS 写入，锁粒度细到桶级，并发度随表大小增长；扩容改成多线程协作迁移，大表扩容不再是一次长时间的全局停顿。',
        '<b>问：computeIfAbsent 和 putIfAbsent 有什么区别？</b><br>答：<code>putIfAbsent</code> 要求你先把值算出来，不管用不用得上都会创建对象，白查一次数据库很常见；<code>computeIfAbsent</code> 只在确实缺失时才调用映射函数，而且这次调用发生在锁住的桶里，能保证同一个键只算一次。代价是函数里不能做耗时操作，更不能回头去改同一个 map，否则可能死锁或抛 <code>IllegalStateException</code>。',
        '<b>问：thenApply 和 thenCompose 到底差在哪？</b><br>答：看回调返回的是什么。返回普通值（String、Integer）就用 <code>thenApply</code>，得到 <code>CF&lt;R&gt;</code>；如果回调本身返回一个 <code>CompletableFuture</code>，用 thenApply 会得到 <code>CF&lt;CF&lt;R&gt;&gt;</code> 这种嵌套，后面还得连着 join 两层，这时必须用 <code>thenCompose</code> 把它压平。一句话：thenApply 相当于 map，thenCompose 相当于 flatMap。',
        '<b>问：CompletableFuture 能不能取代线程池？</b><br>答：不能。它本身不创建任何线程，默认借用 <code>ForkJoinPool.commonPool()</code>，也可以显式传一个 Executor；它只负责「哪一段在什么时候跑」，真正的并发度、隔离性和拒绝策略仍然由那个池子决定。生产上几乎都该显式传自己的池子，否则一个慢任务占满公共池，会连带拖慢全进程的并行流。'
      ] },

      { h: '5.13 自测与练习' },
      {ol:[
      '写一个程序，用 10 个线程同时向 <code>HashMap</code> 插入 1000 个不同的 key，统计最终 size，重复几次观察结果，并解释为什么会小于 10000。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：最终 size 明显小于 10000，各次运行结果都不相同；加了 <code>-ea</code> 之外的版本偶尔还会抛 <code>ArrayIndexOutOfBoundsException</code>。<b>为什么</b>：并发扩容时两个线程同时把旧表搬到新表会互相覆盖，节点直接丢失；size 字段的累加也不是原子的。JDK 8 把头插改成尾插之后，JDK 7 那种环形链表死循环基本消失了，但丢数据一点没少。<b>要点</b>：普通 <code>HashMap</code> 绝不能多线程共享写；用 <code>ConcurrentHashMap</code>，或者让每个线程写自己的 map，最后再合并。</div></details>',
      '把上题换成 <code>ConcurrentHashMap</code>，再用 <code>computeIfAbsent</code> 做一个带过期时间的本地缓存，说明为什么不能用 <code>containsKey + put</code>。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：size 稳定等于实际写入的不同 key 数（10000）；同一个 key 连续调用两次 <code>computeIfAbsent</code>，加载日志只打印一次。<b>为什么</b>：<code>containsKey</code> 加 <code>put</code> 是两步，中间别的线程可能已经插进来，于是重复计算、或者用旧值覆盖掉别人刚写的新值；<code>computeIfAbsent</code> 在锁住的桶里一次完成判断、计算、放入。<b>要点</b>：过期时间可以让 value 包一层带时间戳的 Entry，读的时候判断并 remove；真实缓存还要有容量上限和淘汰，别指望一个 map 硬扛。</div></details>',
      '用 <code>ArrayBlockingQueue(5)</code> 实现一个生产者-消费者：2 个生产者每秒放 3 个任务，1 个消费者每秒处理 1 个，观察队列长度变化，并解释背压是怎么发生的。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：队列长度迅速涨到 5 就停住了，此后 <code>put</code> 阻塞，生产者的实际投放速度被压到和消费者一样（每秒 1 个），日志里两次生产的间隔越来越长。<b>为什么</b>：<code>ArrayBlockingQueue</code> 有界，满了之后 <code>put</code> 不是丢弃而是阻塞等待，于是下游的消费速度反过来限制了上游的生产速度，这就是背压。<b>要点</b>：既不想阻塞又不想丢，就用带超时的 <code>offer</code> 并自己决定丢弃还是重试；队列容量就是缓冲上限，设得太大只是把压力推迟成内存占用。</div></details>',
      '用 <code>CompletableFuture</code> 并发调用三个模拟服务（各睡 200ms、300ms、500ms），用 <code>allOf</code> 等全部完成后合并结果，记录总耗时，验证它接近 500ms 而不是 1000ms。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：总耗时约 500 毫秒出头（加上调度开销大约 510 到 530 毫秒），而不是三段相加的 1000 毫秒；三个任务的开始时间几乎相同。<b>为什么</b>：三个任务同时提交、各自在自己的线程上睡，<code>allOf</code> 只等最慢的那个完成，所以总耗时取决于最大值而不是总和。<b>要点</b>：线程池至少要 3 个线程，单线程池会让它们退化成串行；两个任务合并可用 <code>thenCombine</code>，三个以上用 <code>allOf</code> 再逐个 join 取结果。</div></details>',
      '给上题加上 300ms 超时和异常兜底：任一服务抛异常时返回默认值，超时时也返回默认值，分别用 <code>exceptionally</code>、<code>handle</code> 和 <code>orTimeout</code> 实现。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：一切正常时返回三个真实结果；把某个服务改成睡 600 毫秒后，<code>orTimeout</code> 在 300 毫秒触发、以 <code>TimeoutException</code> 完成，<code>handle</code> 接住并返回「默认值」，最终程序正常退出而不是崩掉。<b>为什么</b>：<code>exceptionally</code> 只在异常时触发，<code>handle</code> 无论成败都执行、能同时拿到结果和异常，<code>orTimeout</code> 只是给这个 future 挂了一个定时器，超时后强制以异常完成。<b>要点</b>：<code>orTimeout</code> 不会取消底层任务，它还在池子里跑；要给整体设上限，还得在提交侧做可中断的取消，或用带超时的 HTTP 客户端。</div></details>',
      '解释：为什么 <code>CopyOnWriteArrayList</code> 的迭代器不会抛 ConcurrentModificationException，却可能读不到刚 add 的元素？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：边迭代边 add 不会抛异常，但新加的元素不会出现在这次遍历里；在迭代器上调用 <code>remove</code> 反而会抛 <code>UnsupportedOperationException</code>。<b>为什么</b>：每次写都会复制整个数组、再把内部引用指向新数组，而迭代器持有的是创建那一刻的旧数组，所以既不会被打断、也看不到后续修改，读写之间根本不存在共享的可变结构。<b>要点</b>：它适合读多写极少、元素数量有限的场景（监听器列表、白名单）；频繁写会不断复制数组，内存和 GC 都受不了。需要强一致就读时加锁。</div></details>'
    ]},
    ]
};
T['deadlock-jmm'] = {
  meta: '本章约 8000 字 · 建议 58 分钟 · 配套流程图与 6 道练习',
  blocks: [
      { h: '6.1 为什么学：程序没有报错，却永远停在那里' },
      {p:'前面几章讲的错误都有一个共同点：它们会留下痕迹。计数器算错了，你能看到结果偏小；可见性出问题，你能看到循环不退出；线程池拒绝任务，你会收到异常。但有一类问题最让人抓狂——程序不报错、不崩溃、CPU 不高，就是不动了。你把日志翻遍，最后一行停在三分钟前；你重启一次，它又好了，过几天再次出现。'},
      {p:'这类问题的两大来源，就是本章的两个主题：<b>死锁</b>和<b>Java 内存模型（JMM）理解不到位</b>。死锁让线程互相等待、永远醒不过来；JMM 的问题则更隐蔽，代码看起来完全正确，却因为缓存、重排序、编译器优化而在某些机器、某些时刻产生错误结果，而且极难复现。'},
      {p:'学完这一章，你应该能做到三件事：看到线程卡住时，知道用 <code>jstack</code> 去确认是不是死锁；写多线程代码时，从设计上避免循环等待；面对“这段代码为什么需要 volatile”这类问题时，能说出 JMM 层面的理由，而不是背结论。'},

      { h: '6.2 死锁的四个必要条件' },
      {p:'死锁不是一个玄学现象，它有明确的成因。操作系统教材里给出了四个必要条件，四个同时成立才会死锁，破坏其中任意一个就能避免：'},
      {table:{head:['条件','含义','在 Java 里的体现'],rows:[
      ['互斥','资源同一时刻只能被一个线程占用','锁本身就是互斥的，这条无法破坏'],
      ['请求与保持','持有至少一个资源，同时还在等另一个','拿着 A 的锁去申请 B 的锁'],
      ['不可剥夺','已获得的资源不能被强行抢走','synchronized 无法被外部释放'],
      ['循环等待','存在一个线程等待环','A 等 B、B 等 C、C 等 A']
    ]}},
      {p:'注意第一条“互斥”是锁的本质，没法消除。所以工程上的预防手段集中在后三条：一次性申请所有资源（破坏请求与保持）、用 <code>tryLock</code> 支持放弃（破坏不可剥夺）、按固定顺序加锁（破坏循环等待）。其中最容易落地、也最常用的，是第三条。'},
      {note:'只要所有线程都按同一个全局顺序去获取多把锁，循环等待就不可能形成，死锁从结构上被消除。这比“出问题再修”可靠得多。'},

      { h: '6.3 一次真实的转账死锁' },
      {p:'最经典的死锁场景是转账：A 给 B 转钱要锁住两个账户，B 给 A 转钱也要锁住两个账户。如果两边的加锁顺序相反，就会互相等待。'},
      { p: '下面这段代码会稳定死锁。两个线程分别给 <code>a</code> 和 <code>b</code> 加锁，顺序恰好相反。' },
      { code: `public class DeadlockDemo {
    private static final Object LOCK_A = new Object();
    private static final Object LOCK_B = new Object();

    static void transferA2B() {
        synchronized (LOCK_A) {
            System.out.println("线程1 拿到 A，准备拿 B");
            sleep(100);
            synchronized (LOCK_B) {
                System.out.println("线程1 拿到 B，转账完成");
            }
        }
    }

    static void transferB2A() {
        synchronized (LOCK_B) {
            System.out.println("线程2 拿到 B，准备拿 A");
            sleep(100);
            synchronized (LOCK_A) {
                System.out.println("线程2 拿到 A，转账完成");
            }
        }
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public static void main(String[] args) {
        Thread t1 = new Thread(DeadlockDemo::transferA2B, "线程1");
        Thread t2 = new Thread(DeadlockDemo::transferB2A, "线程2");
        t1.start();
        t2.start();
    }
}`, title: 'DeadlockDemo.java' },
      { out: '线程1 拿到 A，准备拿 B\n线程2 拿到 B，准备拿 A\n（程序停在这里，不再输出，也不退出）' },
      { p: '第 6 行和第 17 行是问题的核心：一个先锁 A 再锁 B，另一个先锁 B 再锁 A。<code>sleep(100)</code> 不是死锁的原因，它只是让两个线程都有时间拿到第一把锁，从而把竞态变成必现。即使去掉 sleep，只要调度恰好，仍然会死锁——只是概率变低，更难复现，也更危险。' },

      { h: '6.4 怎么发现死锁' },
      {p:'死锁发生时，程序不会抛异常，日志也不会有任何错误。但它有一个特征：相关线程的状态会变成 <code>BLOCKED</code>，并且一直不变。所以排查的第一步永远是“看线程栈”。'},
      {p:'最常用的命令是 <code>jstack &lt;pid&gt;</code>（或者 <code>jcmd &lt;pid&gt; Thread.print</code>）。它会把所有线程的调用栈打印出来，如果 JVM 检测到死锁，会在末尾直接给出结论：'},
      {out:'Found one Java-level deadlock:\n=============================\n"线程A":\n  waiting to lock monitor 0x00007f8c4c00a2c8 (object 0x000000076ab0a1a0, a java.lang.Object),\n  which is held by "线程B"\n"线程B":\n  waiting to lock monitor 0x000000076ab0a188 (object 0x000000076ab0a3d0, a java.lang.Object),\n  which is held by "线程A"'},
      {p:'读这段输出的方法：先找 <code>waiting to lock</code>，它说明这个线程在等哪把锁；再看 <code>which is held by</code>，它说明这把锁在谁手里。两边互相指向对方，环就成立了。如果 JVM 没有自动报出 deadlock，就手动找所有处于 <code>BLOCKED</code> 状态的线程，看它们的 <code>waiting to lock</code> 是否指向彼此持有的锁。'},
      {p:'除了命令行，代码里也可以用 <code>ThreadMXBean</code> 主动检测：<code>ManagementFactory.getThreadMXBean().findDeadlockedThreads()</code> 会返回互相死锁的线程 id 数组，返回 null 表示没有。很多中间件会起一个后台线程定期检查，发现死锁就打印线程栈并告警。'},
      {flow:['线上出现接口无响应','jstack 导出线程栈','搜索 BLOCKED 与 waiting to lock','确认是否存在循环等待','定位两处加锁代码的顺序差异','改为统一顺序并回归测试']},

      { h: '6.5 预防一：所有线程按同一顺序加锁' },
      {p:'解决转账死锁最直接的办法，是让两个方向都按“账户编号从小到大”的顺序加锁。这样无论谁先发起，第一把锁永远是编号小的那个，第二个线程在拿第一把锁时就会被挡住，根本走不到“持有 A 等 B”的状态，循环等待被彻底破坏。'},
      {p:'实现上有两种写法：按业务 id 排序（推荐，稳定且可读），或者按 <code>System.identityHashCode(obj)</code> 排序（通用但有极小概率相等，相等时还需要一个额外的 tie-breaker 锁）。业务 id 排序没有这个问题，优先用它。'},
      { p: '把加锁顺序统一之后，同样的业务逻辑就不会死锁了。' },
      { code: `public class OrderedLock {
    private static final Object[] LOCKS = {new Object(), new Object()};  // 下标 0 对应账户 1

    // 约定：永远先锁编号小的，再锁编号大的
    static void transfer(int from, int to) {
        Object first = LOCKS[Math.min(from, to) - 1];
        Object second = LOCKS[Math.max(from, to) - 1];
        synchronized (first) {
            System.out.println(Thread.currentThread().getName() + " 拿到第一把锁");
            synchronized (second) {
                System.out.println(Thread.currentThread().getName()
                        + " 转账 " + from + " -> " + to + " 完成");
            }
        }
    }

    public static void main(String[] args) throws Exception {
        Thread t1 = new Thread(() -> transfer(1, 2), "线程1");
        Thread t2 = new Thread(() -> transfer(2, 1), "线程2");
        t1.start();
        t2.start();
        t1.join();
        t2.join();
        System.out.println("两个线程都正常结束");
    }
}`, title: 'OrderedLock.java' },
      { out: '线程1 拿到第一把锁\n线程1 转账 1 -> 2 完成\n线程2 拿到第一把锁\n线程2 转账 2 -> 1 完成\n两个线程都正常结束' },
      { p: '<code>transfer(1, 2)</code> 和 <code>transfer(2, 1)</code> 都会先申请编号较小账户的锁，再申请编号较大账户的锁。于是第二个线程在进入第一层 <code>synchronized</code> 时就阻塞了，根本不可能形成“持有一把、等另一把”的环。注意这只是把并发度降低了一点点，没有引入任何额外的锁开销。' },

      { h: '6.6 预防二：tryLock 打破“不可剥夺”' },
      {p:'<code>ReentrantLock</code> 提供了 <code>tryLock(timeout, unit)</code>：拿不到锁就等一会儿，等不到就返回 false，而不是死等。拿到 false 的线程可以释放自己已持有的锁、回退、重试，这样“不可剥夺”这个条件就被打破了。'},
      {p:'用 <code>tryLock</code> 有两个必须注意的地方。第一，<code>unlock</code> 一定要放在 <code>if (locked)</code> 里面，并且放在 <code>finally</code> 里，否则没拿到锁却去 unlock 会抛 <code>IllegalMonitorStateException</code>。第二，重试要加随机退避，否则两个线程可能同时失败、同时重试，反复撞车变成活锁。'},
      { p: '如果业务上无法统一顺序，就用 <code>tryLock</code> 加超时，让线程在拿不到时主动放弃。' },
      { code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class TryLockDemo {
    private static final ReentrantLock LOCK_A = new ReentrantLock();
    private static final ReentrantLock LOCK_B = new ReentrantLock();

    static boolean transfer(ReentrantLock first, ReentrantLock second) throws InterruptedException {
        if (!first.tryLock(200, TimeUnit.MILLISECONDS)) {
            return false;                     // 第一把都没拿到，直接放弃
        }
        try {
            if (!second.tryLock(200, TimeUnit.MILLISECONDS)) {
                return false;                 // 第二把拿不到，释放第一把后退出
            }
            try {
                System.out.println(Thread.currentThread().getName() + " 完成转账");
                return true;
            } finally {
                second.unlock();
            }
        } finally {
            first.unlock();
        }
    }

    public static void main(String[] args) throws Exception {
        Thread t1 = new Thread(() -> retry(LOCK_A, LOCK_B), "线程1");
        Thread t2 = new Thread(() -> retry(LOCK_B, LOCK_A), "线程2");
        t1.start();
        t2.start();
        t1.join();
        t2.join();
        System.out.println("主线程退出");
    }

    static void retry(ReentrantLock a, ReentrantLock b) {
        for (int i = 0; i < 20; i++) {
            try {
                if (transfer(a, b)) return;
                Thread.sleep((long) (Math.random() * 50));   // 随机退避，避免活锁
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        System.out.println(Thread.currentThread().getName() + " 重试 20 次后放弃");
    }
}`, title: 'TryLockDemo.java' },
      { out: '线程1 完成转账\n线程2 完成转账\n主线程退出' },
      { p: '关键是第 8 行和第 12 行：<code>tryLock</code> 只等 200ms，等不到就返回 false，线程可以退回去重来，而不是死等。第 44 行的随机退避同样重要——如果两个线程固定间隔重试，它们会一直同时抢到第一把锁、又同时失败，形成活锁；加上随机性之后，碰撞概率迅速下降，总有一个能成功。' },

      { h: '6.7 活锁与饥饿：比死锁更隐蔽' },
      {p:'死锁是“都在等”，活锁是“都在动，但谁也前进不了”。典型例子是两个线程都拿到了第一把锁，发现第二把拿不到，于是都释放、都重试，又同时拿到第一把、又同时失败，如此循环。从 CPU 上看线程一直在跑，从业务上看毫无进展。'},
      {p:'饥饿则是另一种形态：某个线程长期拿不到资源。比如用非公平锁时，一个低优先级线程可能一直被后来的线程插队；或者线程池里所有线程都被长任务占满，短任务永远排不上。'},
      {table:{head:['现象','CPU','线程状态','典型原因'],rows:[
      ['死锁','很低','BLOCKED，长期不变','循环等待，锁顺序相反'],
      ['活锁','很高','RUNNABLE，反复重试','重试没有退避，互相谦让'],
      ['饥饿','正常或偏高','RUNNABLE，但业务无进展','非公平锁插队、线程池被占满']
    ]}},
      {p:'三者的排查入口也不同：死锁看线程栈里的锁持有关系；活锁看日志里高频重复的失败重试；饥饿看队列长度、等待时间和线程池活跃数。'},

      { h: '6.8 JMM 是什么：从 CPU 缓存说起' },
      {p:'现代 CPU 的执行速度和内存的访问速度差了两个数量级。为了不让 CPU 空等，硬件在 CPU 和内存之间加了多级缓存，每个核心有自己的 L1、L2，共享 L3。CPU 读写数据时先操作缓存，合适的时候再写回内存。这在单核时代没问题，多核时代就出事了：核心 A 改了变量，只写进了自己的缓存，核心 B 读的还是内存里的旧值。'},
      {p:'除了缓存，编译器和 CPU 还会做重排序。只要不改变单线程的执行结果，指令顺序可以随意调整，这叫“as-if-serial”语义。单线程看起来毫无差别，多线程下就可能出现“先看到标志位、后看到数据”的乱序现象。'},
      {p:'Java 内存模型（JMM）就是 Java 语言对这些问题给出的统一规范。它不描述某台机器的具体实现，而是规定：在多线程环境下，一个线程对共享变量的写入，在什么条件下对另一个线程可见；哪些重排序是允许的，哪些是禁止的。只要你的程序满足 JMM 的规则，它在任何符合规范的 JVM 和硬件上都能正确运行。'},
      {p:'为了让规范可描述，JMM 抽象出了“主内存”和“工作内存”：所有共享变量都存在主内存，每个线程有自己的工作内存，保存它用到的变量的副本。线程对变量的所有操作都在工作内存里进行，不能直接读写主内存。这个模型是概念性的，不要和真实的 CPU 缓存一一对应。'},
      {p:'围绕这套抽象，JMM 定义了八种原子操作：<code>lock</code>（把变量标识为线程独占）、<code>unlock</code>（释放）、<code>read</code>（从主内存读到工作内存）、<code>load</code>（把 read 的值放入副本）、<code>use</code>（把副本值交给执行引擎）、<code>assign</code>（把执行结果赋给副本）、<code>store</code>（把副本值传到主内存）、<code>write</code>（写入主内存变量）。像 <code>count++</code> 这样的操作，其实要经历 read、load、use、assign、store、write 六步，中间任何一步都可能被打断——这正是它不原子的原因。'},
      { p: '先做一个可见性实验。下面这段代码里，主线程会一直等 <code>stop</code> 变成 true，但很可能永远等不到。' },
      { code: `public class VisibilityDemo {
    static boolean stop = false;          // 去掉 volatile 试试

    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            System.out.println("工作线程开始");
            while (!stop) {
                // 空转，等待主线程把 stop 改成 true
            }
            System.out.println("工作线程退出");
        });
        worker.start();

        Thread.sleep(1000);
        stop = true;
        System.out.println("主线程已把 stop 设为 true");

        worker.join(2000);
        System.out.println("工作线程还活着吗？" + worker.isAlive());
    }
}`, title: 'VisibilityDemo.java' },
      { out: '工作线程开始\n主线程已把 stop 设为 true\n工作线程还活着吗？true' },
      { p: '主线程确实把 <code>stop</code> 改成了 true，但工作线程读的是自己工作内存里的副本，或者 JIT 已经把这个循环优化成“只读一次”，于是它永远看不到变化。把第 2 行改成 <code>static volatile boolean stop = false;</code>，输出就会变成“工作线程退出 / 还活着吗？false”。这不是 JVM 的 bug，而是 JMM 允许的行为——没有同步手段，就没有可见性保证。' },

      { h: '6.9 happens-before：JMM 给你的承诺' },
      {p:'如果每次都要推演缓存和重排序，写代码就没法活了。所以 JMM 提供了一个更高层的工具：happens-before 关系。它的含义是：如果操作 A happens-before 操作 B，那么 A 的结果对 B 一定可见，而且 A 在 B 之前发生（从可见性角度，不一定是物理时间顺序）。'},
      {p:'Java 规定了若干条天然的 happens-before 规则，常用的有这些：'},
      {list:[
      '<b>程序顺序规则</b>：同一个线程里，前面的操作 hb 后面的操作。',
      '<b>监视器锁规则</b>：对一个锁的 unlock hb 于后续对同一个锁的 lock。',
      '<b>volatile 规则</b>：对 volatile 变量的写 hb 于后续对它的读。',
      '<b>线程启动规则</b>：<code>Thread.start()</code> hb 于新线程里的所有操作。',
      '<b>线程终止规则</b>：线程里的所有操作 hb 于其他线程从 <code>join()</code> 成功返回。',
      '<b>中断规则</b>：对线程的 <code>interrupt()</code> hb 于被中断线程检测到中断。',
      '<b>传递性</b>：A hb B，B hb C，则 A hb C。'
    ]},
      {p:'这里面最有用的是“传递性”。它解释了为什么“先写普通变量、再写 volatile 标志位”是安全的：普通变量的写在 volatile 写之前（程序顺序），volatile 写 hb 于另一个线程的 volatile 读，那个线程的读又 hb 于它后续读普通变量（程序顺序），三条串起来，普通变量的写就对另一个线程可见了。这也是“安全发布”模式的理论基础。'},
      {p:'反过来，如果没有这些规则兜底，JMM 允许任意重排序和缓存延迟，你就不能假设“我写了别人就能看到”。这就是为什么单例的双重检查锁必须给引用加 <code>volatile</code>：没有它，另一个线程可能看到一个“分配了内存但还没执行构造器”的半成品对象。'},
      { p: '最后看一个安全发布的例子，它把 happens-before 的传递性用到了极致。' },
      { code: `public class SafePublish {
    private int data = 0;
    private volatile boolean ready = false;

    public void init() {
        data = 42;              // 普通写
        ready = true;           // volatile 写，之前的写都会对它可见
    }

    public void use() {
        if (ready) {            // volatile 读，之后的读都能看到 data=42
            System.out.println("data = " + data);
        } else {
            System.out.println("还没准备好");
        }
    }

    public static void main(String[] args) throws Exception {
        SafePublish demo = new SafePublish();
        Thread writer = new Thread(demo::init);
        Thread reader = new Thread(demo::use);
        writer.start();
        writer.join();          // join 建立 happens-before
        reader.start();
        reader.join();
    }
}`, title: 'SafePublish.java' },
      { out: 'data = 42' },
      { p: '为什么 <code>data</code> 不加 volatile 也能被读到 42？因为 <code>data = 42</code> 在 <code>ready = true</code> 之前（程序顺序），volatile 写 hb 于 volatile 读，读之后的 <code>data</code> 访问在程序顺序上又在其后，三条规则串起来，<code>data</code> 的写就对读线程可见了。这里真正起作用的不是 <code>data</code> 的可见性，而是 <code>ready</code> 这道“闸门”。也正因如此，如果把 <code>ready</code> 的 volatile 去掉，即便读线程看到 <code>ready</code> 是 true，也可能读到 <code>data</code> 还是 0。' },

      { h: '6.10 内存屏障：volatile 到底加了什么' },
      {p:'前面反复说某个操作“禁止重排”，但 JVM 究竟靠什么禁止？答案是内存屏障，也就是一组带屏障语义的 CPU 指令。它不负责把数据写到磁盘，只负责约束屏障前后的内存访问，让它们按约定的顺序对其他核心可见。'},
      {p:'按作用位置分，常用的有四种。<code>LoadLoad</code> 保证前面的读先于后面的读完成；<code>StoreStore</code> 保证前面的写先于后面的写落地；<code>LoadStore</code> 保证前面的读先于后面的写；<code>StoreLoad</code> 最重，保证前面的写先于后面的读，并且顺带具有其他三种的效果。'},
      {p:'volatile 的实现就是在写前后插屏障：写之前插 <code>StoreStore</code>，保证之前的普通写不会被重排到 volatile 写之后；写之后插 <code>StoreLoad</code>，把写缓冲刷出去、让其他核心的缓存行失效。读之后插 <code>LoadLoad</code> 与 <code>LoadStore</code>，保证后面的读写不会跑到这次读前面。'},
      {p:'不同 CPU 需要的屏障并不相同。x86 的内存模型较强，只有 <code>StoreLoad</code> 需要显式指令，也就是常见的 <code>lock</code> 前缀；ARM 的模型弱得多，四种屏障都可能真的生成指令。这也是同一段代码在两种机器上行为不同的来源之一，而 JMM 的作用正是把差异挡在语言层之外。'},
      {p:'回到双重检查锁：<code>instance = new Singleton()</code> 里，“初始化对象”和“赋值引用”之间如果没有 <code>StoreStore</code>，另一个线程就可能先看到非空引用、后看到初始化结果。volatile 的屏障把这两步的顺序钉死，DCL 才真正成立——所以那里加的 volatile 并不是“习惯”，而是必需的语义。'},

      { h: '6.11 三性的边界与常见错误清单' },
      {p:'很多面试题会问“volatile 能保证原子性吗”，标准答案是“不能，只保证单个变量的读和写”。但更实用的问法是：我这段代码缺的是哪一项保证？把三种机制的边界整理成一张表，会比背结论有用得多。'},
      {table:{head:['机制','原子性','可见性','有序性','典型用途'],rows:[
      ['<code>synchronized</code>','保证（临界区内）','保证','保证','多变量复合操作'],
      ['<code>volatile</code>','只保证单次读/写','保证','禁止重排','状态标志、安全发布'],
      ['<code>final</code>','—','保证正确构造后可见','禁止构造期重排','不可变对象'],
      ['原子类（CAS）','保证单变量','保证','保证','计数器、序号'],
      ['普通变量','不保证','不保证','不保证','线程封闭的数据']
    ]}},
      {p:'<code>final</code> 的这一行经常被忽略。JMM 对 final 字段有特殊规定：只要对象在构造期间没有把 <code>this</code> 引用泄露出去，那么任何线程在构造完成后拿到这个对象，都能看到 final 字段被正确初始化，不需要额外同步。这正是不可变对象天然线程安全的原因，也是 <code>String</code> 能放心共享的基础。'},
      {p:'另一条容易踩的边界是“volatile 数组”：<code>volatile int[] arr</code> 只保证数组引用本身的可见性，不保证数组元素的可见性。要保证元素可见，得用 <code>AtomicIntegerArray</code>，或者对每个元素的访问都加同步。'},
      {ol:[
      '<b>用字符串常量做锁。</b><code>synchronized ("lock")</code> 锁的是常量池里的同一个对象，可能和其他毫不相干的代码互斥，甚至引发死锁。锁对象应该是 <code>private final Object lock = new Object()</code>。',
      '<b>锁对象被重新赋值。</b><code>private Object lock = new Object();</code> 之后又执行 <code>lock = new Object();</code>，不同线程锁的就不是同一个对象了，互斥完全失效。锁字段必须 <code>final</code>。',
      '<b>在构造器里把 this 传出去。</b>其他线程可能拿到一个还没初始化完的对象，final 的可见性保证也随之中断。',
      '<b>用 volatile 做计数。</b><code>volatile int count; count++;</code> 依然会丢更新，必须用 <code>AtomicInteger</code> 或加锁。',
      '<b>调用外部方法时持锁。</b>你无法控制外部方法会不会阻塞、会不会反向调用你，锁的范围越大，死锁概率越高。',
      '<b>嵌套加锁没有固定顺序。</b>这是本章死锁的头号成因，改法是给所有多锁场景定一个全局顺序，并写进团队规范。',
      '<b>把死锁当成偶发问题。</b>死锁一旦具备条件就是必然发生，只是触发时机取决于调度。看到一次就要彻底修，不能靠重启。'
    ]},

      { h: '6.12 伪共享：被 64 字节放大的性能坑' },
      {p:'CPU 不是按变量加载缓存的，而是按缓存行，一行通常是 64 字节。这意味着相邻的两个变量很可能住在同一行里，只要其中一个被改，整行都会失效。'},
      {p:'如果两个线程分别高频写同一行里的两个不同变量，硬件就会把这一行在核心之间来回搬运，双方不停打掉对方的缓存。逻辑上它们没有共享任何数据，性能却像在争同一把锁。这个现象叫伪共享，英文 false sharing。'},
      {p:'经典例子是两个计数器对象做并发累加。它们都是小对象，很可能被分配在相邻内存，两个线程各加自己的那个，吞吐却只有单线程的一半。修复办法是让热点变量各自独占一行：在变量之间塞几个用不到的长整型做填充，或者直接从 JDK 8 起用 <code>@sun.misc.Contended</code> 并开启 <code>-XX:-RestrictContended</code>。'},
      {p:'日常业务代码真正会被伪共享拖慢的场景不多，主要集中在高性能计数器、队列的生产与消费游标、事件总线的序号这类“多线程高频写相邻字段”的地方。但只要记住一条：别把两个高频写的计数器声明成相邻字段，需要时再加填充，就已经够用了。看到“多线程纯计算却几乎不加速”时，把它列进怀疑清单。'},

      { h: '6.13 本章小结' },
      {list:[
      '死锁需要四个条件同时成立：互斥、请求与保持、不可剥夺、循环等待。破坏任意一个即可预防。',
      '工程上最有效的预防是统一加锁顺序；<code>tryLock</code> 加超时可以作为补充，但必须配合退避。',
      '死锁不会抛异常，排查靠 <code>jstack</code> 看 <code>BLOCKED</code> 与 <code>waiting to lock</code>，或用 <code>ThreadMXBean</code> 主动检测。',
      '活锁是“都在动但没进展”，饥饿是“某个线程长期拿不到资源”，三者的排查入口完全不同。',
      'JMM 规定了主内存与工作内存的抽象、八种原子操作，以及 happens-before 关系。',
      'happens-before 的核心是锁、volatile、线程启动与终止，配合传递性可以推导出安全发布。',
      '<code>synchronized</code> 三性全包，<code>volatile</code> 只保证可见性与有序性，<code>final</code> 保证正确构造后的可见性。'
    ]},

      { h: '6.14 常见追问' },
      { list: [
        '<b>问：死锁和数据库死锁是一回事吗？</b><br>答：原理相同，都是循环等待加不可剥夺。区别在谁来收拾：数据库有死锁检测，发现环就主动回滚其中一个事务，应用层只会收到一次异常；JVM 不会替你打破 Java 层的死锁，线程就那么永远 BLOCKED 着，只能靠改代码或用 tryLock 超时来避免。',
        '<b>问：只有两把锁才会死锁吗？</b><br>答：不是。三把、四把锁形成的环同样会死锁，而且比两把更难发现，因为环要跨过好几个方法调用才连得上，jstack 里也得仔细对锁地址。锁的数量越多、调用链越深、加锁顺序越分散，环就越隐蔽。所以「一次只持有尽可能少的锁」和「全局统一的加锁顺序」本身就是预防手段。',
        '<b>问：synchronized 是公平锁吗？</b><br>答：不是。它不保证等待最久的线程先拿到锁，进入竞争时新来的线程可能抢在前面，极端情况下会出现饥饿；偏向锁、自旋这些优化也让顺序更不可预测。需要公平性就用 <code>new ReentrantLock(true)</code>，代价是吞吐明显下降，因为每次唤醒都要排队、还要多一次上下文切换，所以绝大多数场景并不需要公平。',
        '<b>问：volatile 到底加了什么指令？</b><br>答：在 x86 上，volatile 写通常在写指令后跟一条带 <code>lock</code> 前缀的空操作，效果等于一个全屏障：把写缓冲刷到主存，并让其他核心上对应的缓存行失效。volatile 读则依靠 x86 本身较强的有序性，只禁止编译器和 CPU 把后续读写重排到它前面。不同架构生成的指令不同，但语义统一由 JMM 保证：写对后续读可见，且不重排。',
        '<b>问：happens-before 和时间先后是一回事吗？</b><br>答：不是。happens-before 是一条可见性规则：A happens-before B，意味着 A 的结果对 B 可见、且 A 在逻辑上先于 B，但它并不要求 A 在物理时间上真的更早完成。编译器优化、CPU 乱序都会让实际执行顺序和这个关系不一致，可只要不违反规则，程序就是正确的。反过来，两个操作在时间上一前一后，也完全可能没有任何 happens-before 关系，所以判可见性只能靠规则，不能靠观察。',
        '<b>问：为什么说 JMM 让 Java 可以「一次编写，到处运行」？</b><br>答：因为 JMM 把不同硬件的内存模型差异屏蔽掉了。x86 的模型强、ARM 的模型弱，可你只要按 volatile、synchronized、final、happens-before 这几条规则写并发代码，JVM 会为每个平台插入恰当的屏障，让语义保持一致，不需要为 x86 和 ARM 各写一份带手工屏障的版本。'
      ] },

      { h: '6.15 自测与练习' },
      {ol:[
      '写一个两把锁、加锁顺序相反的程序，稳定复现死锁，然后用 <code>jstack</code> 找到那段 deadlock 输出，指出哪一行对应「循环等待」。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：几十毫秒内程序卡住、不再有任何输出；<code>jstack</code> 输出里出现 <code>Found one Java-level deadlock:</code> 一段，两个线程各持有一把锁，并写着 <code>waiting to lock</code> 对方手里的那一把。<b>为什么</b>：A 持有 lock1 等 lock2，B 持有 lock2 等 lock1，形成环，两把锁都不会被释放，也没有任何超时机制能打破它。<b>要点</b>：线程状态是 <code>BLOCKED</code>，<code>waiting to lock</code> 后面的 0x 地址就是锁对象；对照代码里两个 <code>synchronized</code> 的顺序，就能指出环在哪一环闭合。</div></details>',
      '把上题改成按 id 从小到大加锁，验证死锁消失；再改成用 <code>tryLock(1, SECONDS)</code>，拿不到就释放并重试，观察两个线程是否都能完成。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：改成按 id 排序加锁后，多次运行都能正常结束，jstack 里再也找不到 deadlock；换成 <code>tryLock(1, SECONDS)</code> 后，抢不到的一方返回 false、释放已持有的锁、退避一会儿重试，最终两个线程都跑完。<b>为什么</b>：排序破坏的是循环等待，所有人按同一顺序排队就不可能出现环；tryLock 破坏的是持有并等待，它不会无限期占着第一把锁。<b>要点</b>：tryLock 返回 false 时必须先释放已经拿到的锁再重试，否则照样死锁；重试要加随机退避，不然两个线程同步重试还会撞上。</div></details>',
      '用 <code>ThreadMXBean.findDeadlockedThreads()</code> 写一个后台检测线程，每 5 秒检查一次，发现死锁就打印线程 id 和栈。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：死锁发生后 5 秒内检测线程打印类似 <code>deadlock: [21, 22]</code> 的两行 id 和各自的栈帧；没有死锁时该方法返回 null，什么也不打印。<b>为什么</b>：<code>findDeadlockedThreads</code> 在等锁图上找环，和 <code>jstack</code> 用的是同一套 JVM 内部算法，只能发现因监视器或同步器阻塞形成的死锁，线程池任务互相等待、等 IO 这类它看不见。<b>要点</b>：拿到 id 后用 <code>getThreadInfo(ids, true, true)</code> 取栈；生产上用它触发线程 dump 和告警，别指望靠它去强行 kill 线程。</div></details>',
      '写一个可见性实验：主线程循环等待一个普通 boolean 标志，另一个线程把它改成 true，观察主线程是否退出；再给标志加 <code>volatile</code>，对比结果，并用 happens-before 解释差异。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：不加 volatile 时主线程很可能一直不退出（把标志读提升到循环外，只在寄存器里读）；加上 volatile 后立刻退出。用 <code>-Xint</code> 跑或者循环体里有打印时，两种写法都可能退出，看不到差别。<b>为什么</b>：JMM 允许编译器把循环中不变的读移到循环外，也允许 CPU 用寄存器缓存；volatile 读强制每次都重新读并禁止这种提升。用规则说，就是写线程的写 happens-before 主线程随后的 volatile 读。<b>要点</b>：实验要在 <code>-server</code> 且循环体为空时容易复现；现象不稳定恰恰说明这类 bug 靠测试抓不住。</div></details>',
      '解释下面这段代码为什么可能出问题：<code>class A { int x; A() { x = 1; } }</code>，一个线程 new A() 后把引用放进静态字段，另一个线程读到引用后打印 x。需要做什么才能保证打印出 1？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：可能打印 1，也可能打印 0，取决于引用赋值和构造器里的赋值有没有被重排、以及读线程是否读到了缓存中的旧值。<b>为什么</b>：把引用写进静态字段是普通写，和构造器里的 <code>x = 1</code> 之间没有 happens-before 关系，读线程可能先看到引用、后读到还没初始化的 x，这就是不安全发布。<b>要点</b>：把静态字段声明为 <code>static volatile</code>，或者用同步块、<code>final</code> 字段来建立 happens-before；最稳的是让对象不可变，构造完就再不改。</div></details>',
      '用四个必要条件逐个分析：单例模式的双重检查锁，如果引用不加 volatile，破坏的是哪一条保证？会导致什么现象？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：偶尔能拿到一个「引用非 null、但字段还是默认值」的半初始化单例，表现为某个成员字段莫名是 0 或 null；x86 上几乎复现不出来，换弱内存模型的 ARM 或加大并发压测才有可能。<b>为什么</b>：这不是死锁，四个必要条件在这里不适用；被破坏的是 happens-before 对「对象构造完成」的保证，也就是安全发布。<code>new</code> 的三步（分配内存、执行构造器、把引用写进变量）可能被重排成先写引用、后执行构造器。<b>要点</b>：所以 DCL 里的 volatile 不是可选项；更省心的写法是静态内部类持有或枚举单例，靠类加载的初始化锁保证只构造一次且安全发布。</div></details>'
    ]},
    ]
};



})();
