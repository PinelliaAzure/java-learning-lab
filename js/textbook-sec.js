/* 教材正文：对称/非对称加密与签名、HTTPS 与常见 Web 漏洞 */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['crypto'] = {
    meta: '本章约 5500 字 · 建议 30 分钟 · 配套流程图与 3 道习题',
    blocks: [

      { h: '1.1 为什么学加密：五个常见误区' },
      { p: '你每天登录网站、付款、发消息，这些数据都要经过一条不属于你的网络。加密要回答的不是“怎么把文字变成乱码”，而是四个很具体的问题：别人能不能看到、能不能偷偷改、对面是不是真的、事后能不能抵赖。' },
      { p: '初学者最容易犯三类错误：把 Base64 当加密，把 MD5 当密码保护，或者自己设计一套“异或加移位”的算法。Base64 只是编码，任何人拿到都能还原；MD5 早已能人为制造碰撞；自创算法几乎没有经过公开检验。' },
      { p: '把最容易踩的坑先摆出来，后面每一节都会回来解决其中一条。' },
      { list: [
        '把 Base64 当加密：它只是编码，任何人都能还原。',
        '用 ECB 模式：相同明文块产生相同密文块，泄露数据结构。',
        '用 MD5 或 SHA-1 存密码：应使用 bcrypt、scrypt 或 Argon2 加盐慢哈希。',
        '自己设计算法或自己写随机数：标准实现经过公开检验，自创方案几乎必然有漏洞。',
        '以为上了 HTTPS 就安全：传输安全不等于业务安全，注入、越权照样发生。'
      ] },
      { p: '这一章按对称、非对称、混合加密、签名、证书、密钥管理的顺序展开，每种工具只解决一部分问题，组合起来才是真实系统。' },

      { h: '1.2 加密要解决的四个问题' },
      { p: '密码学把安全目标拆成四个词。<b>机密性</b>：只有该看的人能看到内容。<b>完整性</b>：内容没有被改动，哪怕一个字节。<b>身份认证</b>：确认对方确实是它声称的身份。<b>不可否认</b>：发送方事后不能否认自己发过。' },
      { table: { head: ['工具', '主要解决', '典型算法', '密钥特点'], rows: [
        ['对称加密', '机密性（可附完整性）', 'AES-GCM、ChaCha20-Poly1305', '加解密同一把密钥'],
        ['非对称加密', '密钥分发、机密性', 'RSA-OAEP、ECDH', '公钥公开，私钥保密'],
        ['哈希', '完整性、口令存储', 'SHA-256、SHA-3', '没有密钥'],
        ['消息认证码', '完整性与来源（共享密钥）', 'HMAC-SHA256', '双方共享一把密钥'],
        ['数字签名', '完整性、身份、不可否认', 'RSA-PSS、ECDSA', '私钥签名，公钥验签']
      ] } },
      { p: '最容易被忽略的是哈希：它没有密钥，任何人都能算。“哈希对得上”只说明内容一致，不能说明是谁发的；要让摘要带上身份，必须用 HMAC 或数字签名。' },
      { note: '<b>先记结论：</b>加密保护机密性，哈希保护完整性，签名保护来源与不可否认。不要把三件事混成一句“加密一下”。' },

      { h: '1.3 对称加密：AES、GCM 与落地细节' },
      { p: '对称加密只用一把密钥，加密和解密都靠它。AES 是分组密码，一次处理 16 字节，密钥可以是 128、192 或 256 位；更长的数据还需要工作模式。' },
      { p: 'ECB 把每一块独立加密，相同的明文块会产生相同的密文块，直接泄露数据结构。CBC 引入了链接，却还需要填充，并且必须另外加 MAC 才能防篡改。GCM 把 CTR 加密和 GHASH 认证合成一个 AEAD 模式，一次调用同时得到密文和 16 字节认证标签。' },
      { code: 'import javax.crypto.Cipher;\nimport javax.crypto.spec.GCMParameterSpec;\nimport javax.crypto.spec.SecretKeySpec;\nimport java.security.SecureRandom;\n\npublic class AesGcmDemo {\n    public static void main(String[] args) throws Exception {\n        byte[] key = new byte[32];\n        byte[] iv = new byte[12];\n        SecureRandom rnd = new SecureRandom();\n        rnd.nextBytes(key);\n        rnd.nextBytes(iv);\n\n        String text = "订单金额 199 元";\n        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");\n        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"),\n                new GCMParameterSpec(128, iv));\n        byte[] ct = c.doFinal(text.getBytes("UTF-8"));\n        System.out.println("密文长度 " + ct.length);\n\n        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"),\n                new GCMParameterSpec(128, iv));\n        System.out.println("解密 " + new String(c.doFinal(ct), "UTF-8"));\n    }\n}', title: 'AesGcmDemo.java' },
      { out: '密文长度 36\n解密 订单金额 199 元' },
      { p: '明文 20 字节，密文 36 字节，多出的 16 字节就是认证标签。标签对不上时 JDK 会抛出 <code>AEADBadTagException</code>，说明密文被改、IV 或密钥不对，应记录告警而不是无限重试。' },
      { note: '<b>GCM 的铁律：</b>同一条密钥下 IV 绝不能重复，否则可能泄露明文关系并允许伪造标签。每次加密都用 <code>SecureRandom</code> 生成 12 字节 IV，与密文一起传输。' },
      { p: '先说最容易踩的一脚：<code>Cipher.getInstance("AES")</code> 在多数 JDK 上等价于 <code>AES/ECB/PKCS5Padding</code>，也就是默认用了最不该用的 ECB。写代码时永远把变换写全：<code>"AES/GCM/NoPadding"</code>。缺省值不会报错，只会安静地把你的数据变成可被模式分析的样子。' },
      { p: '密钥长度有三档：16、24、32 字节，对应 AES-128、AES-192、AES-256。新系统直接上 32 字节；超过 32 字节不是更安全，JDK 会直接抛 <code>InvalidKeyException</code>。认证标签长度用 <code>GCMParameterSpec(128, iv)</code> 指定 128 位，不要为了省 12 字节改成 96 位或更短，标签越短，伪造成功的概率越高。' },
      { p: '密文落盘时不能只存 <code>doFinal</code> 的结果，还要存 IV 和算法版本。常见格式是：1 字节版本号 + 12 字节 IV + 密文与标签。解密时先按固定长度切出 IV，再把它交给 <code>GCMParameterSpec</code>，最后一次性 <code>doFinal</code>。把长度写死在代码里虽然不好看，但比“用分隔符拼接再 split”可靠得多，因为二进制里任何字节都可能出现。' },
      { p: '还有两个边界。第一，同一条密钥能加密的消息条数是有限的，工程上一般按 2 的 32 次方条作为上限，超过就换密钥；第二，单条消息也不宜过大，几十 GB 的文件应该分块，每块用独立 IV，而不是让一个 <code>doFinal</code> 吃下整个文件。' },
      { p: '解密失败时 JDK 抛 <code>AEADBadTagException</code>，它是 <code>BadPaddingException</code> 的子类。捕获后只记“认证失败”，不要把密钥、IV、密文片段写进日志，也不要自动回退到 CBC 再试一次——回退本身就是降级攻击的入口。' },

      { h: '1.4 密钥、IV 与 nonce：唯一比随机更重要' },
      { p: 'AES-256 在 Java 8u161 之后默认可用。密钥必须来自安全随机源；若要从口令派生，应使用 PBKDF2、scrypt 或 Argon2 并加随机盐，不能把口令直接当密钥。' },
      { p: '错误写法是把密钥和 IV 都写成常量：<code>byte[] iv = "123456789012".getBytes()</code>。这样每条消息都用同一个 IV，GCM 的机密性和完整性会同时崩掉。修正方法是每次加密都调用 <code>SecureRandom.nextBytes(iv)</code>，并把 IV 与密文一起保存。IV 不需要保密，但必须唯一且被完整传输。' },
      { p: 'GCM 还支持附加认证数据（AAD）：它不加密但会被认证。把用户 ID、消息序号放进 AAD，攻击者就无法把密文搬到另一个用户或上下文里重用。' },
      { p: 'IV 不是秘密，可以和密文一起明文传输；要保密的是密钥。密钥不能写进代码、提交到 Git 或打进日志——真实事故里，密钥泄露远多于算法被攻破。' },
      { p: 'GCM 的 IV 也叫 nonce，含义是“一次性数字”。它的要求只有一条：同一条密钥下永不重复。12 字节随机数在几百万条消息的规模下碰撞概率很低，但如果一个系统每天加密上亿条、并且多台机器共用一把密钥，生日问题就会让碰撞变得现实。' },
      { p: '两种常见方案。随机 IV：每条消息由 <code>SecureRandom</code> 生成 12 字节，简单、无状态，适合消息量可控的场景。计数器 IV：把 12 字节拆成“固定前缀 + 单调计数”，由数据库序列或 Redis 自增保证不重复，适合高吞吐。千万不要用时间戳、毫秒数或 <code>Math.random()</code>：前两者在同一毫秒内会重复，后者根本不是密码学随机源。' },
      { p: '多节点部署时，各节点共用一把密钥再加随机 IV，碰撞概率会随节点数和消息量上升。更稳的做法是每个节点、每次启动都从 KMS 取一把独立的数据密钥，节点之间不共享，IV 只需在单把密钥内唯一。' },
      { p: '还有一个隐蔽的坑：把用户 ID 拼进 IV 来“保证不同用户不同 IV”。这会让 IV 变得可预测，并在用户量小时产生重复。正确做法是让 IV 只负责唯一性，需要绑定上下文时改用 AAD。' },

      { h: '1.5 非对称加密：RSA、椭圆曲线与填充的坑' },
      { p: '非对称加密有一对密钥：公钥公开，私钥保密。公钥加密只有私钥能解，私钥签名任何拿到公钥的人都能验。RSA 基于大整数分解困难，椭圆曲线（EC）基于离散对数困难。' },
      { p: '强度不能只看位数：RSA 2048 位、EC 256 位大约相当于 128 位安全强度。非对称运算比对称慢几个数量级，所以只用来加密密钥或做签名。' },
      { code: 'import javax.crypto.Cipher;\nimport java.security.KeyPair;\nimport java.security.KeyPairGenerator;\n\npublic class RsaDemo {\n    public static void main(String[] args) throws Exception {\n        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");\n        g.initialize(2048);\n        KeyPair kp = g.generateKeyPair();\n\n        Cipher c = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");\n        c.init(Cipher.ENCRYPT_MODE, kp.getPublic());\n        byte[] ct = c.doFinal("hello".getBytes("UTF-8"));\n        System.out.println("密文 " + ct.length + " 字节");\n\n        c.init(Cipher.DECRYPT_MODE, kp.getPrivate());\n        System.out.println(new String(c.doFinal(ct), "UTF-8"));\n    }\n}', title: 'RsaDemo.java' },
      { out: '密文 256 字节\nhello' },
      { p: '256 字节不是巧合：RSA 密文长度等于模长，2048 位就是 256 字节，所以明文很受限，配 OAEP 最多约 190 字节。填充必须用 OAEP，旧的 PKCS#1 v1.5 存在成熟的选择密文攻击。' },
      { p: 'Java 里写 <code>Cipher.getInstance("RSA")</code> 会用 PKCS#1 v1.5 填充，这个填充早年被 Bleichenbacher 攻击打穿，今天仍在出变种。加密必须写全 <code>"RSA/ECB/OAEPWithSHA-256AndMGF1Padding"</code>。' },
      { p: '但这里还有一个 JDK 特有的坑：这个变换名里只有一个 SHA-256，它只作用于 OAEP 的主摘要，MGF1 的摘要默认仍是 SHA-1。要和其他语言互通，必须显式传 <code>OAEPParameterSpec</code>，把 MGF1 也设成 SHA-256，否则对方解出来是乱码，而异常往往只有一句“解密失败”。' },
      { p: 'RSA 的明文上限由模长决定：2048 位模长是 256 字节，减去两倍摘要长度和 2 字节固定开销，SHA-256 下大约还能放 190 字节。所以 RSA 只用来加密密钥或很短的令牌，不能拿来加密订单、图片和 JSON。密文长度恒等于模长，2048 位永远是 256 字节，看到长度变化就说明用错了算法。' },
      { note: '<b>两个坑：</b>EC 不能像 RSA 那样直接“加密一段数据”，它通常用于 ECDH 协商共享密钥；同一段明文用 RSA-OAEP 每次加密结果都不同，因为填充里带了随机数，这是正常现象。' },
      { p: '椭圆曲线不是“更短的 RSA”。EC 通常用于 ECDH 协商密钥或 ECDSA 签名，不能直接加密任意数据。<code>secp256r1</code>（也叫 P-256）是通用选择，<code>Ed25519</code> 在签名场景更快、更不容易被误用。EC 私钥只有 32 字节量级，但签名结果是 DER 编码，长度在 70 到 72 字节之间浮动，解析时不能按固定长度切。' },
      { p: 'ECDSA 还有一个致命前提：每次签名用的随机数 k 必须唯一。k 一旦重复，攻击者用两次签名就能解出私钥。所以不要自己实现 ECDSA，也不要在资源受限环境里用可预测的随机源；JDK 的 <code>Signature</code> 实现会处理好这件事。' },

      { h: '1.6 混合加密：TLS 的实际做法与落地格式' },
      { p: '对称加密快但密钥难分发，非对称加密能安全分发密钥但很慢。真实系统把两者拼起来：用非对称算法传递一次性对称密钥，之后所有数据都用 AES-GCM 加密，HTTPS 的每次连接都这么做。' },
      { flow: ['客户端发起连接', '服务器返回证书', '验证证书链与域名', 'ECDHE 协商共享密钥', '双方派生会话密钥', 'AES-GCM 加密传输'] },
      { p: '为什么不直接用 RSA 加密全部数据？慢、长度受限，而且单独使用没有完整性保护。混合加密后，非对称算法只处理几十字节的密钥，吞吐交给 AES。' },
      { code: 'import javax.crypto.Cipher;\nimport javax.crypto.KeyGenerator;\nimport javax.crypto.SecretKey;\nimport java.security.KeyPair;\nimport java.security.KeyPairGenerator;\n\npublic class HybridDemo {\n    public static void main(String[] args) throws Exception {\n        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");\n        g.initialize(2048);\n        KeyPair kp = g.generateKeyPair();\n\n        KeyGenerator kg = KeyGenerator.getInstance("AES");\n        kg.init(256);\n        SecretKey aes = kg.generateKey();\n\n        Cipher rsa = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");\n        rsa.init(Cipher.WRAP_MODE, kp.getPublic());\n        byte[] wrapped = rsa.wrap(aes);\n        System.out.println("加密后的会话密钥 " + wrapped.length + " 字节");\n\n        rsa.init(Cipher.UNWRAP_MODE, kp.getPrivate());\n        SecretKey same = (SecretKey) rsa.unwrap(wrapped, "AES", Cipher.SECRET_KEY);\n        System.out.println("密钥长度 " + same.getEncoded().length + " 字节");\n    }\n}', title: 'HybridDemo.java' },
      { out: '加密后的会话密钥 256 字节\n密钥长度 32 字节' },
      { p: 'TLS 1.3 改用 ECDHE：每次连接临时生成密钥对，用完即弃。即使服务器长期私钥将来泄露，攻击者也解不开之前录下的流量，这叫前向保密。TLS 1.3 已删掉不具备前向保密的 RSA 密钥交换。' },
      { p: '前面的例子演示了用 RSA 包裹 AES 密钥。真实系统还要解决一个格式问题：解密方怎么知道这段密文用了什么算法、哪个密钥版本、IV 在哪里。做法是把这些元数据写进一个头部，并且让头部参与认证。' },
      { p: '推荐的布局是：版本号、算法标识、密钥版本、IV、被包裹的数据密钥、密文与标签。关键点是“算法标识必须进 AAD”。如果算法标识只是明文放在头部、不参与 GCM 认证，攻击者就能把它从 AES-GCM 改成 AES-CBC，诱导解密方走另一条代码路径，这类问题叫算法混淆。' },
      { p: '错误写法是把算法名拼在字符串前面：<code>"AES-GCM:" + base64</code>，解析时按冒号切分再分派。拼接格式没有长度校验、没有认证，还可能被注入分隔符。修正方式是使用定长二进制头，或者用经过认证的结构化格式，并在解析前先校验版本号。' },
      { p: '会话密钥应当一次一密、用完即弃。不要用一把长期 AES 密钥加密所有用户的数据，否则一次泄露就是全量泄露。数据密钥由 KMS 生成并包裹，应用只在内存里短暂持有明文密钥，用完清空字节数组。' },
      { p: '性能上也别走偏：不要因为“更安全”就用 RSA 分块加密大文件，那是数量级的浪费；也不要自己实现 AES 的轮函数。用 JDK 或成熟库的 AEAD 实现，开启 AES-NI，吞吐足够支撑大多数业务。' },

      { h: '1.7 哈希、数字签名与验签细节' },
      { p: '哈希把任意长度输入压成固定长度摘要，SHA-256 输出 32 字节。它单向、确定、抗碰撞；MD5 和 SHA-1 已可人为制造碰撞，不能再用于安全场景。' },
      { p: '数字签名不是把内容加密，而是先哈希再用私钥对摘要运算，验证者用公钥验算并重算摘要。它保证内容没被改、来自私钥持有者，但内容仍是明文，不提供保密性。' },
      { code: 'import java.security.KeyPair;\nimport java.security.KeyPairGenerator;\nimport java.security.Signature;\n\npublic class SignDemo {\n    public static void main(String[] args) throws Exception {\n        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");\n        g.initialize(2048);\n        KeyPair kp = g.generateKeyPair();\n\n        byte[] data = "转账 100 元给 alice".getBytes("UTF-8");\n        Signature s = Signature.getInstance("SHA256withRSA");\n        s.initSign(kp.getPrivate());\n        s.update(data);\n        byte[] sig = s.sign();\n        System.out.println("签名长度 " + sig.length + " 字节");\n\n        s.initVerify(kp.getPublic());\n        s.update(data);\n        System.out.println("验签结果 " + s.verify(sig));\n    }\n}', title: 'SignDemo.java' },
      { out: '签名长度 256 字节\n验签结果 true' },
      { p: '把 <code>data</code> 改一个字节再验签，结果变成 <code>false</code>。哈希谁都能重算，签名必须持有私钥才能生成。' },
      { note: '<b>边界：</b>签名只证明私钥持有者认可这段内容，不证明内容本身正确。私钥一旦泄露，历史签名全部失效，所以私钥应放在 HSM 或 KMS 里，并记录审计。' },
      { p: '签名最常见的线上故障不是算法选错，而是“签的字节”和“验的字节”不是同一串。对象序列化成 JSON 时字段顺序、空格、时间格式、数字精度都可能变，服务端重新序列化后再验签必然失败；更危险的是两边解析规则不同，攻击者可以构造“签名通过但业务读到另一个值”的请求。' },
      { p: '做法是签原始字节：请求体原样保留，签名覆盖“方法 + 路径 + 时间戳 + 随机串 + 请求体哈希”，服务端用收到的原始字节重算，不要先反序列化再拼回去。时间戳和随机串还要落库或进缓存做去重，否则签名可以被原样重放。' },
      { p: '算法选择上，新系统优先 <code>Ed25519</code> 或 <code>SHA256withECDSA</code>，RSA 场景用 <code>RSASSA-PSS</code>，<code>SHA256withRSA</code>（PKCS#1 v1.5）只用于兼容老系统。摘要算法不要用 MD5 或 SHA-1，签名长度也不要按固定值假设。' },
      { p: '验签失败要统一返回“请求无效”，不区分“签名格式错”“公钥不对”“内容被改”，否则等于给攻击者一个调试接口。签名密钥和加密密钥必须分开：一把密钥同时用于加密和签名，会让用途边界消失，泄露时影响面翻倍。' },

      { h: '1.8 证书、信任链与部署' },
      { p: '证书是公钥的身份证：把公钥、域名、有效期、用途绑在一起，由 CA 用私钥签名。系统内置受信任根证书，验证时沿“服务器证书 → 中间 CA → 根 CA”逐级验签。' },
      { p: '只验签名还不够。客户端还要检查域名是否匹配 SAN 字段、证书是否在有效期内、用途是否包含服务器认证，以及证书是否被吊销。自签名证书在内网完全可以用，但必须显式导入客户端信任库。' },
      { p: '最危险的是写一个“信任所有证书”的 <code>TrustManager</code>，或关掉主机名校验。这等于扔掉 HTTPS 的全部价值，中间人可以冒充任何站点，而这段代码常被一路带到生产。' },
      { note: '<b>记住：</b>证书是公开的，里面没有私钥。服务器证书配错时，先看有效期和域名，再看中间证书有没有漏发，最后才怀疑 CA。' },
      { p: '浏览器报“证书无效”，九成不是证书本身有问题，而是服务器少发了中间证书。证书链是“服务器证书 → 中间 CA → 根 CA”，服务器必须把中间证书一起发，根证书由客户端内置，不需要也不应该发。可以用 <code>openssl s_client -showcerts</code> 看服务端到底发了几张。' },
      { p: '域名校验看 SAN 字段，不看 CN。一张证书可以写多个域名，通配符 <code>*.example.com</code> 只覆盖一级子域，<code>a.b.example.com</code> 不在其中。用 IP 直接访问、或用内网域名访问公网证书，都会触发主机名不匹配。' },
      { p: '有效期越来越短，90 天证书已经是常态，手工续期迟早出事。应接入 ACME 自动签发与续期，并在到期前设置告警。吊销状态用 OCSP Stapling 或 CRL 检查，客户端拿不到吊销信息时是否放行，取决于你的风险偏好。' },
      { p: '最坏的做法是为了“让程序跑通”写一个信任所有证书的 <code>TrustManager</code>，或者让 <code>HostnameVerifier</code> 永远返回 true。这等于把 HTTPS 降级成 HTTP，中间人可以解密、篡改所有流量。测试环境要用自签证书，就把它导入测试机的信任库，而不是改生产代码。' },
      { p: '服务之间可以用 mTLS：双方都出示证书，网关校验客户端证书的 CA 和 SAN。它适合内部调用，但证书分发和轮换成本高，要配合短有效期和自动化。' },

      { h: '1.9 密钥管理与生命周期' },
      { p: '真实事故里，算法被攻破的比例远小于密钥泄露。密钥管理的目标很朴素：只有该用的服务能用、每次使用能审计、泄露之后能快速轮换。' },
      { p: '生成要用 <code>SecureRandom</code>，不要用 <code>Random</code>；长度按用途选，AES 至少 128 位、推荐 256 位，RSA 至少 2048 位。存储优先放 KMS、HSM 或 KeyStore，退一步也要放在权限收紧的密钥文件里，绝不能进 Git、日志和异常堆栈。' },
      { table: { head: ['阶段', '推荐做法', '常见错误'], rows: [
        ['生成', 'SecureRandom，长度足够', '用 Random，或口令直接当密钥'],
        ['存储', 'KMS/HSM/KeyStore，权限最小化', '硬编码、提交到仓库、打进镜像'],
        ['使用', '按用途隔离，限制调用方', '一把密钥 encrypt 和 sign 混用'],
        ['轮换', '版本号 + 新旧双密钥过渡', '从不轮换，泄露后无法止损'],
        ['销毁', '清零内存、吊销、保留审计', '只删文件，备份里仍然存在']
      ] } },
      { p: '数据量大时用信封加密：主密钥（KEK）只用来加密数据密钥（DEK），DEK 再加密业务数据。轮换时只换主密钥并重新包裹 DEK，不必重加密全部历史数据。Java 里可以用 KeyStore 管理密钥条目，也可以接入云厂商的 KMS。' },
      { p: '把密钥当成有生命周期的实体来管理：生成、分发、使用、轮换、吊销、销毁。每个阶段都要回答三个问题：谁负责、谁能访问、怎么审计。没有这三个答案的密钥，迟早会出现在某个 Git 提交或日志文件里。' },
      { p: '轮换不是“换一把新的就完事”。密文头里要写密钥版本号，解密时按版本取对应密钥；旧密钥要保留到“用旧密钥加密的数据全部过期或重加密完成”为止。签名密钥轮换还要考虑公钥分发：验签方需要同时信任新旧两把公钥一段时间。' },
      { p: '环境隔离同样重要。开发、测试、生产不能共用密钥；生产密钥不进配置文件、不进镜像、不进代码仓库。云上优先用 KMS 的 Encrypt/Decrypt 接口，让明文密钥不落盘；本地部署用 HSM，或至少用 KeyStore 加密存储。' },
      { p: '泄露响应有固定动作：立即轮换并吊销旧密钥、评估影响范围（哪些数据、多长时间）、保留审计与取证材料、排查泄露路径、必要时通知受影响方。只删掉泄露的文件不算处理完，备份、日志、镜像层里往往还有副本。' },
      { p: '最后一条经验：加密算法被攻破的新闻很多，但真实事故里绝大多数是密钥放错了地方。先把密钥管好，再谈算法强度。' },

      { h: '1.10 本章小结' },
      { list: [
        '对称加密用一把密钥，AES-GCM 同时提供机密性和完整性，IV 绝不能重用。',
        '非对称加密用公私钥对，RSA 慢且长度受限，EC 适合签名与密钥协商。',
        '混合加密用非对称算法传递一次性对称密钥，TLS 1.3 还用 ECDHE 实现前向保密。',
        '数字签名 = 哈希 + 私钥运算，保证完整性与来源，但不保密。',
        '证书把公钥和身份绑定，验证要查签名、域名、有效期与吊销状态。',
        '密钥管理决定成败：安全生成、最小权限存储、版本化轮换、可审计销毁。'
      ] },

      { h: '1.11 常见追问' },
      { list: [
        '<b>问：为什么 HTTPS 不直接用 RSA 加密网页？</b><br>答：三个理由。非对称运算比对称慢两三个数量级，用它加密整页内容，吞吐撑不住；RSA 一次只能加密比模数短的块，大页面要切成很多块并逐块加密，还要额外传递块信息；纯加密只有机密性，没有完整性保护，攻击者可以翻转密文比特而双方不知道。所以 TLS 只把非对称用在握手：协商出一个会话密钥，之后全部用 AES-GCM 对称加密，并用 MAC 或 AEAD 认证标签保证完整性。',
        '<b>问：AES-GCM 的 IV 为什么不能重复？</b><br>答：GCM 内部用密钥和 IV 一起派生计数器与认证子密钥。同一个密钥下 IV 重复，两条消息的密钥流就完全相同，把两段密文异或一下就能消掉密钥流、直接得到明文的异或结果，机密性当场失效；同时认证密钥也被复用，伪造合法标签成为可能。所以 IV 绝不能在同一个密钥下重复：随机 96 位 IV 的碰撞概率随消息数平方增长，到 2^32 条量级就不可忽略，NIST 因此给同一密钥下的随机 IV 加密次数设了上限，达到上限前必须轮换密钥。实践上优先用 12 字节计数器式 IV；只能用随机 IV 时，必须配上每密钥加密次数限额和定期轮换。',
        '<b>问：签名和 HMAC 有什么区别？</b><br>答：HMAC 是对称的：双方共享同一个密钥，谁都能算出同样的 MAC，所以只能证明「持有密钥的人发的」，内部接口鉴权够用。数字签名是非对称的：私钥签名、公钥验签，任何拿到公钥的人都能验证，却无法伪造，还能向第三方证明，适合开放平台、JWT、软件发布这类需要外部验证的场景。代价是签名慢、长度长。选错方向很危险：用 HMAC 做对外凭证，等于把签名权交给了每一个验证方。',
        '<b>问：自签名证书能不能用？</b><br>答：内网、开发环境可以，但必须把自签 CA 显式导入到客户端信任库，否则浏览器和 JDK 都会报证书链不受信任。而且自签证书没有第三方背书，一旦私钥泄露没人能吊销，只能人工换发。对公网用户不要用：浏览器会弹红色警告，用户被训练成点「继续访问」之后，就等于对中间人攻击彻底敞开。正式环境用 ACME 免费证书，内网用私有 CA 统一签发并纳入轮换流程。',
        '<b>问：密钥泄露后第一步做什么？</b><br>答：先轮换再排查。立刻启用新密钥并吊销旧密钥，让旧密钥签发的令牌和证书失效；同时评估影响范围，查出泄露途径是代码仓库、日志、备份还是配置中心，把同一路径上的其他密钥一起视为已泄露。之后补上审计记录与出事时间线，再改流程：密钥放 KMS 或环境注入，禁止进仓库与日志，设置轮换周期，给关键操作留可追溯的日志。'
      ] },

      { h: '1.12 自测与练习' },
      { ol: [
        '用 AES-GCM 加密一段中文，打印密文长度，再故意改一个字节观察异常类型。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code">KeyGenerator kg = KeyGenerator.getInstance("AES");\nkg.init(256);\nSecretKey key = kg.generateKey();\n\nbyte[] iv = new byte[12];\nnew SecureRandom().nextBytes(iv);\nCipher c = Cipher.getInstance("AES/GCM/NoPadding");\nc.init(Cipher.ENCRYPT_MODE, key,\n    new GCMParameterSpec(128, iv));\nbyte[] ct = c.doFinal(\n    "一段中文".getBytes(StandardCharsets.UTF_8));\nSystem.out.println(ct.length);   // 12 + 16 = 28 字节\n\nct[0] ^= 1;                      // 故意改一个字节\nc.init(Cipher.DECRYPT_MODE, key,\n    new GCMParameterSpec(128, iv));\nc.doFinal(ct);                   // AEADBadTagException</pre><b>要点</b>：GCM 自带完整性校验，篡改任一字节解密时就抛 javax.crypto.AEADBadTagException，不会返回乱码；每次加密都要新的 12 字节随机 IV，同一个 key 加 IV 绝不能复用。</div></details>',
        '生成 RSA 密钥对，对一段文本签名，修改一个字节后重新验签，解释结果。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code">KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");\ng.initialize(3072);\nKeyPair kp = g.generateKeyPair();\n\nSignature s = Signature.getInstance("SHA256withRSA");\ns.initSign(kp.getPrivate());\nbyte[] data = "hello".getBytes(StandardCharsets.UTF_8);\ns.update(data);\nbyte[] sig = s.sign();\n\ndata[0] ^= 1;                    // 改一个字节\ns.initVerify(kp.getPublic());\ns.update(data);\nSystem.out.println(s.verify(sig));   // false</pre><b>要点</b>：验签用公钥，原文改一个字节 verify 就返回 false，不会「验签通过但内容变了」；只有签名本身的编码坏了才抛 SignatureException；验签必须与签名用同一算法和同一段原文。</div></details>',
        '把 RSA 换成 EC（secp256r1）生成签名，比较签名长度和生成速度。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code">static void bench(String alg, String sigAlg)\n    throws Exception {\n  KeyPairGenerator g = KeyPairGenerator.getInstance(alg);\n  if ("EC".equals(alg)) {\n    g.initialize(new ECGenParameterSpec("secp256r1"));\n  } else {\n    g.initialize(3072);\n  }\n  long t0 = System.nanoTime();\n  KeyPair kp = g.generateKeyPair();\n  Signature s = Signature.getInstance(sigAlg);\n  s.initSign(kp.getPrivate());\n  s.update("hello".getBytes(StandardCharsets.UTF_8));\n  byte[] sig = s.sign();\n  System.out.println(alg + " 签名 " + sig.length\n      + " 字节，耗时 "\n      + (System.nanoTime() - t0) / 1000000 + " ms");\n}\n\n// bench("RSA", "SHA256withRSA");\n// bench("EC", "SHA256withECDSA");</pre><b>要点</b>：RSA-3072 的签名固定 384 字节，EC P-256 约 70~72 字节（DER 编码，长度会浮动）；同强度下 EC 的密钥与签名都短得多、签得更快，代价是验签略慢、老系统可能只认 RSA。</div></details>',
        '画出一次 HTTPS 连接中证书验证与密钥协商的顺序，标出哪些步骤用了公钥、哪些用了对称密钥。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：图上是「ClientHello 与 ServerHello 协商套件 → 服务端发证书链 → 客户端逐级验签、校验证书链到根 CA → 用临时密钥交换协商共享秘密 → 双方导出会话密钥 → 之后全部用对称加密传输」。<b>为什么</b>：证书链用 CA 的公钥验签证明「这个公钥属于这个域名」，密钥交换用服务端的公钥或临时 ECDHE 参数，会话建立后换成对称算法保证性能。<b>要点</b>：标清 TLS 1.3 只有 ECDHE 一种密钥交换、没有明文 RSA 加密那一步；证书验证失败要在客户端就中断连接。</div></details>'
      ] }
    ]
  };

  T['web-security'] = {
    meta: '本章约 5500 字 · 建议 32 分钟 · 配套流程图与 3 道习题',
    blocks: [

      { h: '2.1 为什么学 Web 安全' },
      { p: '接口能正常返回数据，不代表它安全。用户输入里可能藏着 SQL 片段、脚本标签，或者一个不属于当前用户的订单号；浏览器还可能带着 Cookie，替攻击者发出请求。共同点是：程序把数据当成了代码或权限。' },
      { p: '这一章先讲 HTTPS 解决了什么、又没解决什么，再逐个看 SQL 注入、XSS、CSRF 和越权。每一类都按“根因、攻击长什么样、怎么防”来讲，最后给出一份可以对照检查的配置清单。' },

      { h: '2.2 HTTPS 与 TLS：握手、证书与部署' },
      { p: 'HTTP 是明文协议，路径、参数、Cookie 在链路上谁都能看、谁都能改。HTTPS 在中间加了一层 TLS，提供机密性、完整性和身份认证。' },
      { p: 'TLS 1.2 需要两次往返完成握手，TLS 1.3 压缩到一次，并且只保留前向保密的密钥交换和 AEAD 算法。新系统应优先启用 1.3，保留 1.2 兼容老客户端，禁用 SSLv3、TLS 1.0 和 1.1。' },
      { flow: ['ClientHello + 密钥共享', 'ServerHello + 证书 + 签名', '双方计算会话密钥', 'Finished 校验握手', 'AES-GCM 加密传输'] },
      { p: '把握手拆成四步更好记。第一步，客户端发 ClientHello，带上支持的 TLS 版本、密码套件列表、SNI（要访问的域名）和一个临时公钥。第二步，服务端回 ServerHello，选定版本和套件，附上证书、自己的临时公钥，并用证书私钥对握手内容签名。' },
      { p: '第三步，双方用 ECDHE 各自算出同一个共享秘密，再经过 HKDF 派生出握手密钥和两个方向的数据密钥——客户端到服务端、服务端到客户端各用一把，避免反射攻击。第四步，双方互发 Finished，用握手密钥加密一段校验值，验证前面所有消息没被篡改。' },
      { p: 'TLS 1.2 的完整握手要两个往返，TLS 1.3 压到一个往返，并且把密钥交换之后的证书也加密了，中间人看不到你访问的是哪个站点（SNI 除外）。TLS 1.3 还支持 0-RTT 恢复，用上次的会话密钥直接发数据，代价是这部分数据可能被重放，所以只适合幂等请求。' },
      { p: '证书校验是 HTTPS 的核心：客户端验证证书链、域名、有效期和吊销状态；服务端要配置完整证书链，否则部分客户端握手失败。部署后应开启 HSTS，让浏览器以后只走 HTTPS。' },
      { p: '常见错误是只配了证书和私钥就上线，没配中间证书，结果部分安卓机和命令行客户端握手失败，浏览器却正常，因为浏览器会自己去补链。这种差异很容易骗过测试。修正方法是用命令行工具检查服务端发送的完整链，并确认顺序是叶子在前、中间在后。' },
      { p: '另一个错误是把 TLS 终止在负载均衡就以为万事大吉，内网继续用 HTTP 明文。内部流量同样会被横向移动的攻击者嗅探，敏感服务之间应继续用 TLS 或 mTLS。' },
      { p: '降级攻击也要防：客户端必须始终校验证书，服务端要禁用 SSLv3、TLS 1.0、TLS 1.1 和 RC4、3DES 这类弱套件，并把 HSTS 的 max-age 设得足够长。只要有一台服务器还接受旧协议，攻击者就能把连接拉回去，前面所有加固都白做。' },
      { note: '<b>HTTPS 不解决什么：</b>它只保护传输过程，注入、越权、日志泄露密码它都管不了。' },

      { h: '2.3 常见 Web 漏洞全景' },
      { table: { head: ['漏洞', '根因', '典型后果', '主要防线'], rows: [
        ['SQL 注入', '输入被拼进 SQL 语法', '拖库、删表、绕过登录', '参数化查询、最小权限账号'],
        ['XSS', '输入被当 HTML/JS 执行', '盗 Cookie、冒充操作、钓鱼', '按上下文输出编码、CSP、HttpOnly'],
        ['CSRF', '浏览器自动携带凭证', '以用户身份转账、改密码', 'CSRF Token、SameSite、校验 Origin'],
        ['越权', '只认证不校验资源归属', '查看或修改他人数据', '每次请求校验归属与角色'],
        ['敏感信息泄露', '错误页、日志、接口返回过多', '泄露密钥、堆栈、内部结构', '统一错误页、日志脱敏、最小返回']
      ] } },
      { p: '这些漏洞的共同点是“信任了不该信任的输入”，而不是加密没做好。防护思路一致：在数据跨边界处做校验、编码和授权。' },

      { h: '2.4 SQL 注入：把数据当成了代码' },
      { p: 'SQL 注入的根因是把用户输入直接拼进 SQL。登录查询写成 <code>"SELECT * FROM users WHERE name = \'" + input + "\'"</code>，当输入是 <code>alice\' OR \'1\'=\'1</code> 时条件永远成立，攻击者不用密码就能登录。UNION 和堆叠语句还能读取其他表甚至执行写操作。' },
      { p: '正确做法是参数化查询：SQL 模板先固定，输入只作为值绑定，不参与语法解析。PreparedStatement 的占位符就是做这件事，不用手动转义，也不会因编码问题被绕过。' },
      { code: 'public class SqlInjectionDemo {\n    static String byConcat(String name) {\n        return "SELECT id, name FROM users WHERE name = \'" + name + "\'";\n    }\n\n    static String byParam() {\n        return "SELECT id, name FROM users WHERE name = ?";\n    }\n\n    public static void main(String[] args) {\n        String input = "alice\' OR \'1\'=\'1";\n        System.out.println("拼接   " + byConcat(input));\n        System.out.println("参数化 " + byParam());\n        System.out.println("绑定参数个数 1，输入永远只是值");\n    }\n}', title: 'SqlInjectionDemo.java' },
      { out: '拼接   SELECT id, name FROM users WHERE name = \'alice\' OR \'1\'=\'1\'\n参数化 SELECT id, name FROM users WHERE name = ?\n绑定参数个数 1，输入永远只是值' },
      { p: '数据库账号也要收权：只给必要的 SELECT、INSERT、UPDATE，不给 DROP 和 FILE。即使出现注入，破坏也被限制在很小范围。' },
      { note: '<b>过滤单引号不是办法：</b>编码、注释、数字型注入都能绕过黑名单。唯一可靠的做法是让输入永远不进入 SQL 语法。' },
      { p: '参数化解决了“值”的位置，但 SQL 里还有一批位置天生不能绑定：表名、列名、<code>ORDER BY</code> 的字段、<code>ASC</code> 与 <code>DESC</code>、部分方言的 <code>LIMIT</code>。这些位置要用白名单映射，例如把前端传来的 <code>sort=created_at</code> 映射到固定的列名，映射表里没有就拒绝，绝不要把字符串直接拼进去。' },
      { p: '数字型注入常被忽略：<code>"WHERE id = " + id</code> 看起来没有引号，但输入 <code>1 OR 1=1</code> 一样成立。修正方式是先用 <code>Integer.parseInt</code> 转成数字再拼，或者干脆也用占位符绑定——占位符对数字同样有效。' },
      { p: 'LIKE 查询也有细节：把用户输入拼进 <code>"%" + kw + "%"</code> 时，输入里的百分号和下划线会变成通配符，导致检索范围失控甚至性能问题，应转义这两个字符，或改用全文检索。' },
      { p: '二次注入更隐蔽：用户注册时把恶意内容存进数据库，入口处转义做得很到位；几个月后某个报表功能把这条数据读出来拼进另一条 SQL，注入就在那一刻发生。防御不能只看入口，任何“从存储里读出再拼进 SQL”的地方都要重新审视。' },
      { p: 'ORM 不是免死金牌。JPA 的 <code>@Query</code> 里写字符串拼接、MyBatis 用 <code>${}</code> 而不是 <code>#{}</code>、以及各种原生查询接口，都会把注入带回来。规则很简单：能用绑定参数的地方，绝不用字符串拼接。存储过程里的动态 SQL 也一样，过程内部拼接参数和 Java 里拼字符串没有区别。' },

      { h: '2.5 XSS：把数据当成了 HTML' },
      { p: 'XSS 发生在服务端把用户输入原样放进页面的时候。攻击者提交 <code>&lt;img src=x onerror=alert(1)&gt;</code>，浏览器会当标签解析并执行脚本。反射型藏在链接参数里，存储型存在数据库、每个访问者都中招，DOM 型则发生在前端用 <code>innerHTML</code> 拼接时。' },
      { p: '防御核心是按上下文输出编码：HTML 文本要转义尖括号和引号，属性要用引号包裹并转义，JavaScript 要用 JSON 序列化，URL 要做 URL 编码。同一个字符串放在不同位置，编码方式并不一样。' },
      { code: 'public class XssDemo {\n    static String escapeHtml(String s) {\n        StringBuilder sb = new StringBuilder();\n        for (char c : s.toCharArray()) {\n            switch (c) {\n                case \'<\': sb.append("&lt;"); break;\n                case \'>\': sb.append("&gt;"); break;\n                case \'&\': sb.append("&amp;"); break;\n                case \'"\': sb.append("&quot;"); break;\n                case 39:  sb.append("&#39;"); break;\n                default:  sb.append(c);\n            }\n        }\n        return sb.toString();\n    }\n\n    public static void main(String[] args) {\n        String input = "<img src=x onerror=alert(1)>";\n        System.out.println("原样 " + input);\n        System.out.println("转义 " + escapeHtml(input));\n    }\n}', title: 'XssDemo.java' },
      { out: '原样 <img src=x onerror=alert(1)>\n转义 &lt;img src=x onerror=alert(1)&gt;' },
      { p: '“把尖括号转义”只对 HTML 文本节点成立。同一个用户输入放进不同位置，需要不同的编码：放进属性值，要先确保属性用双引号包裹，再转义引号和尖括号；放进 <code>href</code>，要校验协议，只允许 http、https、mailto，拦掉 <code>javascript:</code> 和 <code>data:</code>；放进 <code>&lt;script&gt;</code> 里，要用 JSON 序列化并转义小于号，防止提前闭合标签。' },
      { p: 'DOM 型 XSS 完全发生在浏览器里，服务端日志看不到任何异常。危险函数包括 <code>innerHTML</code>、<code>outerHTML</code>、<code>document.write</code>、<code>eval</code>、以及把 <code>location.hash</code> 直接写进页面。修正方式是改用 <code>textContent</code>、<code>createElement</code> 加 <code>appendChild</code>，或者用框架的插值语法而不是原始 HTML 绑定。' },
      { p: '还有几道防线：Cookie 加 <code>HttpOnly</code> 让脚本读不到令牌，加 <code>Secure</code> 只在 HTTPS 下发送，加 <code>SameSite</code> 让跨站请求默认不带它；CSP 限制页面能加载和执行哪些脚本，降低漏网 XSS 的危害。' },
      { p: 'CSP 是第二道防线，不是第一道。它能禁止内联脚本、限制脚本来源，但配置成 <code>unsafe-inline</code> 就等于没配。推荐用 nonce 或 hash 放行必要的内联脚本，先以报告模式观察一段时间，确认没有误伤再切到强制模式。' },
      { p: '“Cookie 加了 HttpOnly 就不会 XSS”是错的。HttpOnly 只让脚本读不到 Cookie，攻击者仍然可以用你的身份发请求、改页面内容、钓鱼。它降低的是令牌被直接偷走的损失，不能替代输出编码。' },
      { p: '富文本是 XSS 的高发区。白名单要同时限制标签、属性、属性值和 URL 协议，还要处理嵌套与畸形标签。自己写正则过滤几乎必然被绕过，应该用维护活跃的 sanitizer 库，并在服务端也做一次过滤，因为前端过滤可以被直接绕过。' },
      { p: '模板引擎和前端框架默认会转义插值，这是好事，但要小心“原始 HTML”通道：Thymeleaf 的 th:utext、Vue 的 v-html、React 的 dangerouslySetInnerHTML，名字里就写着危险。代码评审时把这些标记当成红灯，逐个确认内容来源是否可信。' },
      { p: '富文本不能把所有标签都转义，否则编辑器没法用。这时要用白名单：只允许有限的标签和属性，过滤 <code>script</code>、<code>on*</code> 事件和 <code>javascript:</code> 协议，并用成熟的库，不要自己写正则。' },

      { h: '2.6 CSRF：借用户的身份发请求' },
      { p: 'CSRF 的前提是浏览器自动携带目标站点的 Cookie。用户登录银行网站后又打开攻击者页面，一个隐藏表单或一张图片就能发起转账，浏览器自动带上 Cookie，服务端看起来就像用户本人操作。' },
      { p: '第一道防线是 CSRF Token：服务端为会话生成随机令牌，表单或请求头必须带上，校验一致才处理。令牌要绑定会话、定期更换，比较时用 <code>MessageDigest.isEqual</code> 做常量时间比较。' },
      { code: 'import java.security.MessageDigest;\nimport java.security.SecureRandom;\nimport java.util.Base64;\n\npublic class CsrfDemo {\n    public static void main(String[] args) throws Exception {\n        byte[] raw = new byte[32];\n        new SecureRandom().nextBytes(raw);\n        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);\n        System.out.println("令牌长度 " + token.length());\n\n        String formToken = token;\n        String cookieToken = token;\n        System.out.println("正常请求 " + MessageDigest.isEqual(\n                formToken.getBytes("UTF-8"), cookieToken.getBytes("UTF-8")));\n\n        String forged = "x" + token.substring(1);\n        System.out.println("伪造请求 " + MessageDigest.isEqual(\n                forged.getBytes("UTF-8"), cookieToken.getBytes("UTF-8")));\n    }\n}', title: 'CsrfDemo.java' },
      { out: '令牌长度 43\n正常请求 true\n伪造请求 false' },
      { p: 'Token 有两种放法。同步器令牌：令牌存在会话里，页面渲染时嵌入表单隐藏域或响应头，提交时服务端比对。双提交 Cookie：令牌同时放 Cookie 和请求头，服务端比对两者是否一致，适合无状态服务，但要防止子域写入同名 Cookie。' },
      { p: '现代浏览器已经默认把未声明 <code>SameSite</code> 的 Cookie 当作 <code>Lax</code>，这挡掉了大部分跨站 POST；换成 <code>Strict</code> 更严，但从外站点进来的链接会丢登录态，多数站点用 <code>Lax</code> 更平衡。但 Lax 仍然允许顶级导航的 GET 携带 Cookie，所以“用 GET 做写操作”依然危险；<code>SameSite=None</code> 必须同时加 <code>Secure</code>，否则浏览器直接拒收。' },
      { p: '还可以校验 <code>Origin</code> 头，跨站表单提交和 fetch 都会带上它，缺失时再退回 <code>Referer</code>。对 JSON 接口，要求自定义请求头也能起作用，因为跨站请求带自定义头会触发预检，而预检需要服务端明确放行。另外守住一条原则：GET 只读，写操作一律用 POST、PUT、DELETE，这样预加载和图片请求不会误触发写操作。' },
      { p: '把 Token 放进 URL 查询串是常见错误：它会出现在浏览器历史、Referer、代理日志和监控系统里。Token 也不该长期不变，登录后、提权后都应重新生成，防止会话固定。比较时用常量时间函数，避免逐字节比较泄露前缀。' },
      { p: '还可以校验 <code>Origin</code> 或 <code>Referer</code>，拒绝来源不明的写操作。同时遵守一条原则：GET 只读，修改数据用 POST、PUT 或 DELETE，这样预加载和图片请求不会误触发写操作。' },

      { h: '2.7 越权：登录不等于有权' },
      { p: '越权分两种。水平越权是同级别用户互相访问数据，把订单号从 7 改成 8 就看到了别人的订单；垂直越权是低权限用户访问高权限功能。根因相同：接口只检查有没有登录，没检查有没有权限访问这条数据。' },
      { p: '防护原则很简单，但很容易漏：每一个访问资源的请求，都要在服务端确认资源归属和当前角色。不能依赖前端隐藏菜单，也不能因为 URL 里带了用户 ID 就认为那是本人的。' },
      { code: 'import java.util.HashMap;\nimport java.util.Map;\n\npublic class IdorDemo {\n    static class Order {\n        long id; String owner;\n        Order(long id, String owner) { this.id = id; this.owner = owner; }\n        public String toString() { return "Order " + id + " owner=" + owner; }\n    }\n\n    static Map<Long, Order> db = new HashMap<>();\n    static {\n        db.put(7L, new Order(7, "alice"));\n        db.put(8L, new Order(8, "bob"));\n    }\n\n    static Order load(long id, String user) {\n        Order o = db.get(id);\n        if (o == null || !o.owner.equals(user)) {\n            throw new SecurityException("无权访问");\n        }\n        return o;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(load(7, "alice"));\n        try {\n            load(8, "alice");\n        } catch (SecurityException e) {\n            System.out.println("拒绝 " + e.getMessage());\n        }\n    }\n}', title: 'IdorDemo.java' },
      { out: 'Order 7 owner=alice\n拒绝 无权访问' },
      { p: '实现时查询条件最好直接带上用户 ID，例如 <code>WHERE id = ? AND user_id = ?</code>，让数据库层限制范围；对敏感资源返回 404 可以避免攻击者枚举 ID。' },
      { p: '角色校验放在服务端方法或拦截器里，默认拒绝：没有明确放行的接口一律需要认证。管理接口单独分组鉴权，不要靠前端路由来藏。' },
      { note: '<b>IDOR 是最常见的越权：</b>改一改 URL 里的数字就能看到别人的数据。换个账号、换个 ID，是最快发现它的办法。' },
      { p: '越权不只发生在“详情页”。列表接口按条件过滤、导出接口带 ID 范围、批量操作接收 ID 数组、文件下载用可猜测的文件名，每一处都可能漏掉归属校验。批量接口尤其危险：只校验了第一个 ID，后面的 ID 直接被信任。' },
      { p: '修正是把授权做成一个统一入口，而不是散落在每个 Controller 里。常见做法是“资源加载 + 归属判断”封装成一个方法，所有读写都走它；或者用策略模型，把“谁能对什么资源做什么”写成规则集中求值。默认拒绝，没写规则的请求一律 403。' },
      { p: '不要相信请求头里的用户身份。<code>X-User-Id</code>、<code>X-Role</code> 这类头如果由网关注入，应用必须先确认请求确实来自网关（例如内网、mTLS、签名），否则客户端可以自己伪造一个管理员 ID。身份只能来自经过验证的会话或令牌。' },
      { p: '返回码也有讲究：对不属于当前用户的资源返回 404，避免攻击者通过 403 与 404 的差异枚举出哪些 ID 存在；对明确无权限的操作返回 403，便于排查。无论返回什么，都要记录审计日志：谁、在什么时间、试图访问哪个资源、结果如何。' },
      { p: '权限模型不要一开始就上最复杂的。中小系统用“角色 + 资源归属”两层就够：角色决定能做什么动作，归属决定能操作哪条数据；等规则真的复杂了，再引入策略引擎。过早抽象比暂时写死更难维护。' },

      { h: '2.8 最小权限与纵深防御' },
      { p: '最小权限的意思是：每个账号、服务、进程只拿到完成工作必需的权限。数据库账号不给 DROP，应用不跑 root，对象存储的桶不对外开放。权限越小，单点被攻破的损失越小。' },
      { p: '最小权限要落到具体对象上：数据库账号只给当前库的增删改查，不给 <code>DROP</code>、<code>FILE</code> 和跨库权限；应用进程不用 root；对象存储的桶默认私有，下载走短期签名 URL；云 IAM 用角色而不是长期访问密钥，权限按需授予并能随时回收。' },
      { p: '纵深防御假设每一层都可能失守：WAF 可能漏，前端校验可能被绕过。所以传输层用 HTTPS，数据层用参数化，输出层做编码，接口层做鉴权，监控层记录异常。' },

      { h: '2.9 安全响应头与上线检查清单' },
      { p: '安全响应头是一组成本极低、收益明确的配置。<code>Strict-Transport-Security</code> 告诉浏览器未来一段时间只走 HTTPS，配上 <code>includeSubDomains</code> 要谨慎，因为子域里只要有一个只支持 HTTP 的服务就会被一起打断。' },
      { p: '<code>X-Content-Type-Options: nosniff</code> 阻止浏览器猜 MIME 类型，避免把上传的文本当脚本执行。<code>X-Frame-Options</code> 或 CSP 的 <code>frame-ancestors</code> 防点击劫持。<code>Referrer-Policy</code> 控制跨站请求带多少来源信息，推荐 <code>strict-origin-when-cross-origin</code>。<code>Permissions-Policy</code> 关闭不需要的摄像头、麦克风和定位权限。' },
      { p: '常见问题是配置被覆盖：网关加了一次，应用又加了一次，浏览器收到两个同名头时行为不确定；或者只在首页配了，静态资源和错误页没有。<code>X-XSS-Protection</code> 已经被现代浏览器废弃，开启它反而可能引入侧信道问题，应该移除。' },
      { table: { head: ['项目', '建议配置', '作用'], rows: [
        ['HTTPS', '启用 TLS 1.2/1.3，配 HSTS，禁用弱套件', '防窃听、防降级'],
        ['Cookie', 'Secure + HttpOnly + SameSite=Lax', '防脚本读取、防跨站携带'],
        ['CSP', '默认 self，禁用内联脚本', '降低 XSS 危害'],
        ['SQL', '全部参数化，账号最小权限', '消除注入与扩大破坏'],
        ['鉴权', '默认拒绝，逐请求校验资源归属', '防水平与垂直越权'],
        ['错误处理', '统一错误页，不返回堆栈', '防信息泄露'],
        ['密钥', 'KMS/环境变量，不进代码与日志', '防凭据泄露'],
        ['依赖', '定期扫描 CVE，锁定版本', '防已知漏洞利用']
      ] } },
      { p: '上线前可以照着这张表逐项打勾，它能挡掉大量低级问题；真正棘手的漏洞藏在业务逻辑里，需要威胁建模和代码评审去发现。' },
      { p: '还有几件常被忽略的事：错误页不返回堆栈和 SQL；日志不打印密码、令牌和身份证号；依赖库定期扫描漏洞；调试端点、Swagger 在生产关闭或加认证；上传文件要校验类型、重命名、放到不可执行目录。' },
      { p: '依赖也是权限面。第三方库会带着自己的漏洞进来，要锁定版本、定期扫描、关注高危公告，并且不要在构建时从不可信源拉包。日志里不要打印完整令牌、密码、身份证号和银行卡号，需要排查时打印掩码后的前几位。' },
      { p: '上线前按这张清单过一遍：HTTPS 与 HSTS 已开启、证书链完整且能自动续期；Cookie 三个属性齐全；CSP 已从报告模式切到强制；所有 SQL 走参数化，排序字段走白名单；每个资源接口都校验归属；错误页不返回堆栈；调试端点和接口文档在生产关闭；上传文件校验类型并放在不可执行目录；关键接口有限流；密钥来自 KMS 或环境变量；依赖扫描无高危；备份可恢复且演练过。' },
      { p: '安全要左移：需求评审时问一句“这个功能能被谁滥用”，设计时画清信任边界，编码时用安全的默认值，测试时把越权和注入写进用例。上线后再做一次渗透测试或众测，比出事之后补救便宜得多。' },
      { p: '清单不能代替威胁建模。它挡的是已知的、低级的错误；业务逻辑漏洞——比如优惠券能否叠加、退款能否重复提交、审批能否绕过——只能靠画数据流、逐条问“如果我是攻击者会怎么用它”来发现。上线后还要有监控：登录失败率、权限拒绝率、异常导出量，都是早期信号。' },

      { h: '2.10 本章小结' },
      { list: [
        'HTTPS 提供传输层的机密性、完整性和身份认证，但不解决业务漏洞。',
        'SQL 注入的根因是拼接，参数化查询让输入永远只是值；列名、排序字段用白名单。',
        'XSS 的根因是输出未编码，按上下文转义，配合 CSP 和 HttpOnly 降低危害。',
        'CSRF 利用浏览器自动携带 Cookie，用 Token、SameSite 和 Origin 校验防御。',
        '越权的根因是只认证不授权，每个请求都要校验资源归属和角色。',
        '最小权限与纵深防御让单层失守不至于全盘皆输。'
      ] },

      { h: '2.11 常见追问' },
      { list: [
        '<b>问：有了 HTTPS 还需要参数化查询吗？</b><br>答：需要，两者防的是完全不同的东西。HTTPS 只保护数据在链路上不被窃听和篡改，请求到达服务端之后就是明文；SQL 注入发生在服务端把用户输入拼进 SQL 语句、数据库把它当成语法解析的那一刻，与链路是否加密毫无关系。攻击者可以自己构造 HTTPS 请求，甚至合法用户输入里就带着单引号。所以链路加密与输入参数化必须同时存在，缺一个都挡不住。',
        '<b>问：PreparedStatement 一定能防注入吗？</b><br>答：值绑定能防，结构不能。占位符只允许传值，驱动会把值当作数据发送，不会参与 SQL 语法解析，所以用户名写什么都不会改变语句结构。但表名、列名、ORDER BY 的字段、LIMIT 的偏移这些位置没法用占位符，只能拼接，一旦拼的是用户输入就直接失守。这类地方必须用枚举或白名单映射，把用户传入的字符串映射到固定的合法标识符，别做任何字符串过滤。',
        '<b>问：XSS 和 CSRF 的区别？</b><br>答：XSS 是「页面执行了攻击者的脚本」，攻击者拿到了页面上下文，能读 Cookie、改 DOM、发任意请求；CSRF 是「借用用户还带着的 Cookie 发一个请求」，攻击者看不到响应内容，只是让服务端误以为是用户本人操作。防御也不同：XSS 靠输出编码、CSP、HttpOnly；CSRF 靠 Token 校验、SameSite、校验 Origin。之所以容易混，是因为一旦有 XSS，CSRF Token 也能被脚本读走，CSRF 防护就白做了。',
        '<b>问：SameSite 能完全替代 CSRF Token 吗？</b><br>答：不能。SameSite=Lax 能挡住绝大多数跨站表单提交，但它是浏览器策略，老浏览器不支持，用户也可以用旧客户端；而且同站不同子域之间仍算 same-site，一个子域被拿下就能打另一个子域，这时 Cookie 照样会带上。规范的做法是默认 SameSite=Lax，关键写操作再叠加同步器 Token 或双重提交 Cookie，并校验 Origin 与 Referer，多层成本很低。',
        '<b>问：接口返回 403 还是 404？</b><br>答：看你想不想暴露资源的存在。对敏感资源，比如别人的订单详情，统一返回 404，避免攻击者用 403 与 404 的差异枚举出哪些 ID 真实存在；对明确的、公开承认存在的操作，比如普通用户访问后台管理页，返回 403 更有利于排查，也不会误导客户端去重新登录。团队里要统一口径并写进接口文档，别让同一个项目两套风格，前端处理起来最痛苦。'
      ] },

      { h: '2.12 自测与练习' },
      { ol: [
        '把一段字符串拼接的登录 SQL 改成 PreparedStatement，并说明占位符为什么能防注入。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code">// 改造前：字符串拼接\nString bad = "SELECT id FROM user WHERE name = \'"\n    + name + "\' AND pwd = \'" + pwd + "\'";\n// 输入 admin\' OR \'1\'=\'1 就能拿到第一行\n\n// 改造后：占位符，值不参与解析\nString sql = "SELECT id FROM user "\n    + "WHERE name = ? AND pwd = ?";\ntry (PreparedStatement ps = conn.prepareStatement(sql)) {\n  ps.setString(1, name);\n  ps.setString(2, pwd);\n  try (ResultSet rs = ps.executeQuery()) {\n    return rs.next();\n  }\n}</pre><b>要点</b>：占位符先把带问号的语句发给数据库完成解析，再单独传值，输入永远只当值不当语法；表名和 ORDER BY 的列名不能参数化，必须走白名单映射。</div></details>',
        '写一个 escapeHtml 方法，分别测试尖括号、引号和 & 的转义结果。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code">static String escapeHtml(String s) {\n  if (s == null) return null;\n  StringBuilder b = new StringBuilder(s.length() + 16);\n  for (char ch : s.toCharArray()) {\n    switch (ch) {\n      case \'&amp;\':  b.append("&amp;amp;");  break;\n      case \'&lt;\':  b.append("&amp;lt;");   break;\n      case \'>\':  b.append("&amp;gt;");   break;\n      case \'"\':  b.append("&amp;quot;"); break;\n      case \'\\\'\': b.append("&amp;#39;");  break;\n      default:   b.append(ch);\n    }\n  }\n  return b.toString();\n}\n\n// 输入 &lt;a>"Tom" &amp; \'x\'\n// 输出 &amp;lt;a&amp;gt;&amp;quot;Tom&amp;quot; &amp;amp; &amp;#39;x&amp;#39;</pre><b>要点</b>：&amp; 必须最先替换，否则后面生成的实体里的 & 会被二次转义；这是白名单转义，别用正则黑名单去「过滤」危险字符；能交给模板引擎自动转义就别手写。</div></details>',
        '为一个修改密码接口设计 CSRF 防护：说明 Token 放哪、怎么校验、Cookie 怎么配。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：正常流程带上 Token 请求成功；用 curl 或不带 Token 的跨站表单提交被拒，返回 403 且业务未执行。<b>为什么</b>：攻击者能让浏览器自动带上 Cookie，但读不到页面里的 Token（跨域限制），所以「Cookie 加请求体里的 Token 双份比对」能区分同源页面与伪造请求。<b>要点</b>：Token 存会话、渲染进页面隐藏域，前端随请求头提交；服务端用常量时间比较；Cookie 配 <code>HttpOnly</code>、<code>Secure</code>、<code>SameSite=Lax</code>；再校验 Origin 或 Referer 兜底。</div></details>',
        '列出你项目里三个需要校验资源归属的接口，写出对应的查询条件。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code">-- 订单详情：只能看自己的\nSELECT id, amount FROM orders\nWHERE id = ? AND user_id = ?;\n\n-- 退款：归属与状态写在同一个 WHERE\nUPDATE orders SET status = \'REFUNDING\'\nWHERE id = ? AND user_id = ? AND status = \'PAID\';\n\n-- 发票下载：先查归属，再签短期 URL\nSELECT file_path FROM invoice\nWHERE id = ? AND owner_id = ?;</pre><b>要点</b>：user_id 从当前登录态取，永远写进同一条 WHERE，别先查出来再在 Java 里 if；更新与删除按影响行数判断是否命中，0 行直接返回 404，也别把「没权限」和「不存在」区分给调用方。</div></details>'
      ] }
    ]
  };
})();
