/* 教材正文：异常与泛型（exceptions / custom-exception / generics / erasure / lambda） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['exceptions'] = {
    meta: '本章约 6200 字 · 建议 45 分钟 · 7 个示例 · 3 张表格',
    blocks: [
      { h: '1.1 Throwable 家族：Error、Exception 与 RuntimeException' },
      { p: 'Java 里只有 <code>Throwable</code> 及其子类的实例才能被 <code>throw</code> 和 <code>catch</code>。Throwable 下面分成两支：<code>Error</code> 和 <code>Exception</code>。Exception 下面又分出 <code>RuntimeException</code> 和一堆“受检异常”。这个家族树是后面所有规则的骨架，必须记清。' },
      { table: { head: ['类型', '典型子类', '含义', '是否建议捕获'], rows: [
        ['<code>Error</code>', 'OutOfMemoryError、StackOverflowError、NoClassDefFoundError', 'JVM 层面的严重问题，程序通常无法恢复', '不捕获，排查根因'],
        ['<code>RuntimeException</code>', 'NullPointerException、ArithmeticException、ClassCastException、IndexOutOfBoundsException', '非受检异常，多数是代码缺陷', '可以捕获，但要修代码'],
        ['受检 <code>Exception</code>', 'IOException、SQLException、InterruptedException、ParseException', '外部环境导致、调用方应当处理的问题', '必须处理或声明'],
        ['自定义异常', 'BalanceException、OrderNotFoundException', '用类型表达业务语义', '按业务决定']
      ] } },
      { p: '<code>Error</code> 表示 JVM 自身已经陷入不可恢复的状态。比如堆内存耗尽抛出 OutOfMemoryError，递归太深抛出 StackOverflowError，类加载失败抛出 NoClassDefFoundError。捕获 Error 通常没有意义，因为你既无法保证 catch 块能正常执行，也无法真正修复内存或类路径问题。正确的做法是让它暴露出来，去看日志、看内存快照、看递归深度。' },
      { p: '<code>Exception</code> 表示“程序可以处理的问题”。它下面最特殊的是 <code>RuntimeException</code>：空指针、数组越界、类型转换失败、非法参数、数字格式错误，这些几乎都是写代码时就能避免的缺陷，所以编译器不强制你捕获。剩下的受检异常则不同，它们大多来自外部：文件可能不存在、数据库可能连不上、线程可能被中断，编译器要求你必须表态。' },
      { p: '新手最常见的两个误解。第一个是“所有异常都是 RuntimeException”，于是写 catch 时只盯着 NPE 和越界，遇到 IOException 不知道怎么处理。第二个是“catch (Exception e) 能捕获一切”，实际上它捕获不了 Error；而且在多线程场景里，子线程抛出的异常不会自动传到主线程的 catch 里。' },
      { h: '1.2 为什么学异常：错误也是程序的一部分' },
      { p: '只要程序还要和外部世界打交道，就一定会遇到“计划之外”的情况：用户输入了字母却要求输入年龄、要读的文件被删除了、网络在传输到一半时断开、除数为零、数组下标算错了。这些情况不会因为你不写处理代码就消失，它们只会在某个最不方便的时刻以更难懂的方式爆出来。' },
      { p: '在没有异常机制的语言里，通常用返回码表示错误：函数返回 -1 表示失败，返回 0 表示成功，真正的结果通过指针参数带出来。这样做的问题非常明显。第一，调用者很容易忘记检查返回码，错误被无声地忽略；第二，正常返回值和错误码混在一起，业务代码里到处是 if 判断；第三，构造函数没有办法返回错误码，对象创建失败时只能留下一个“半初始化”的残次品；第四，错误从最底层传到最上层，中间每一层都要手动转发，任何一层偷懒，错误就断链了。' },
      { p: 'Java 的异常机制解决的正是这四个问题。它把“正常流程”和“错误处理”分成两条路：正常代码从上往下写，出错时直接跳到一个专门的处理块；异常对象自带类型、消息和完整的调用栈，堆栈会告诉你“哪一行、经过哪些方法、最后在哪里爆炸”；受检异常还会在编译期强制你表态——要么处理，要么向上声明，不能装作没看见。' },
      { p: '这一章的目标不是让你背下所有异常类名，而是建立三个能力：第一，看到一段堆栈能快速定位抛出的类型和位置；第二，知道什么时候该捕获、什么时候该向上抛；第三，写出不会把异常悄悄吞掉的代码。这三件事，比记住 NullPointerException 怎么拼重要得多。' },
      { h: '1.3 从一个除零错误说起' },
      { p: '先看一个没有做任何处理的程序。它依次打印“开始”、做一次除法、打印结果、打印“结束”。从人的直觉看，这四步应该按顺序发生，但实际运行到除法那一行时，程序会突然终止。' },
      { lang: 'java', code: `public class FirstException {
    public static void main(String[] args) {
        System.out.println("开始");
        int result = 10 / 0;
        System.out.println("结果: " + result);
        System.out.println("结束");
    }
}`, title: 'FirstException.java' },
      { out: '开始\nException in thread "main" java.lang.ArithmeticException: / by zero\n\tat FirstException.main(FirstException.java:4)' },
      { p: '这段输出要分三部分读。第一行 <code>Exception in thread "main"</code> 说明异常发生在 main 线程，并且没有被任何人捕获；第二行 <code>java.lang.ArithmeticException: / by zero</code> 是异常的全限定类名和消息；从 <code>at</code> 开始是栈轨迹，最上面一行是异常真正抛出的位置，也就是 FirstException 第 4 行的除法。注意“结果”和“结束”都没有打印，因为异常一旦抛出，当前方法里它后面的语句就被跳过了。' },
      { p: '这里发生的事情可以拆成四步。第一，JVM 在执行除法时检测到除数为零，创建一个 <code>ArithmeticException</code> 对象，并把消息设为 <code>/ by zero</code>；第二，JVM 把当前线程的调用栈“拍”进这个对象，形成栈轨迹；第三，JVM 沿着调用栈从内向外查找“有没有人愿意处理这个类型的异常”；第四，main 方法没有 try-catch，线程的最外层也没有，于是该线程终止，默认的异常处理器把堆栈打印到标准错误流。' },
      { p: '异常对象本身携带的信息比你想象的多：异常类型决定了“哪类问题”，message 描述“具体是什么”，cause 指向“导致它的底层异常”，stack trace 记录“调用路径”，suppressed 记录“被压制的次要异常”（try-with-resources 关闭资源失败时会用到）。后面排查线上问题，主要就是靠这几样东西。' },
      { note: '<b>关键区分：</b>“抛出异常”不等于“程序崩溃”。抛出只是把问题交给上层；如果某一层用类型匹配的 catch 接住了，程序可以继续执行。只有一路没人接，线程才会终止。' },
      { h: '1.4 try-catch 的语法与执行流程' },
      { p: 'try-catch 的基本结构是：try 块里放“可能出问题”的代码，catch 块里放“出问题后怎么办”的代码。catch 后面的括号声明它能接住的异常类型和变量名，这个变量只在 catch 块内有效。try 不能单独存在，后面必须至少跟一个 catch 或一个 finally。' },
      { p: 'catch 的参数类型必须是 Throwable 的子类，否则编译报错“incompatible types”。一个 try 可以跟多个 catch，按从上到下的顺序匹配；一旦某个 catch 的类型匹配成功，后面的 catch 就不再尝试。匹配看的是异常对象的实际类型，以及它是不是 catch 参数类型的子类。' },
      { lang: 'java', code: `public class TryCatchDemo {
    public static void main(String[] args) {
        String text = "abc";
        try {
            int n = Integer.parseInt(text);
            System.out.println("解析结果: " + n);
        } catch (NumberFormatException e) {
            System.out.println("解析失败: " + e.getMessage());
        }
        System.out.println("程序继续执行");
    }
}`, title: 'TryCatchDemo.java' },
      { out: '解析失败: For input string: "abc"\n程序继续执行' },
      { p: '执行过程是这样的：进入 try，<code>Integer.parseInt("abc")</code> 发现字符串不是合法整数，抛出 NumberFormatException；try 里剩下的打印语句被跳过；JVM 在当前方法找到匹配的 catch，把异常对象赋给 e，执行 catch 块；catch 结束后，程序从整个 try-catch 结构的下一行继续，所以“程序继续执行”仍然会打印。' },
      { flow: ['进入 try 块', '某一行抛出异常', '跳过 try 中剩余代码', 'JVM 沿调用栈查找 catch', '类型匹配则执行 catch 块', '执行 finally（如有）', '继续后面的代码'] },
      { p: '这里要建立一个重要直觉：<b>catch 不是“修复错误”，而是“接管控制流”。</b>catch 执行完后，程序不会回到抛出点重试，而是从 catch 块之后继续。如果你在 catch 里只是打印一行日志，那么原本要完成的操作就没有完成，后面的代码必须能接受这个“半途而废”的状态。' },
      { p: '另一个细节是 catch 变量的作用域。e 只在对应的 catch 块里可见，出了块就没了；不同 catch 可以重名，互不干扰。e 的常用方法有三个：<code>getMessage()</code> 取消息，可能为 null；<code>toString()</code> 返回“类名: 消息”；<code>printStackTrace()</code> 打印完整堆栈，适合本地调试，不适合生产环境直接输出给用户。' },
      { h: '1.5 多个 catch、捕获顺序与 multi-catch' },
      { p: '真实的方法往往可能抛出不止一种异常。比如先解析字符串、再拿解析结果当数组下标，就可能同时遇到 NumberFormatException 和 ArrayIndexOutOfBoundsException。这时可以写多个 catch，分别处理。' },
      { lang: 'java', code: `public class MultiCatchDemo {
    public static void main(String[] args) {
        String text = "12a";
        int[] nums = {1, 2, 3};
        try {
            int index = Integer.parseInt(text);
            System.out.println(nums[index]);
        } catch (NumberFormatException e) {
            System.out.println("数字格式错误: " + e.getMessage());
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("下标越界: " + e.getMessage());
        } catch (RuntimeException e) {
            System.out.println("其他运行时异常: " + e.getClass().getSimpleName());
        }
        System.out.println("结束");
    }
}`, title: 'MultiCatchDemo.java' },
      { out: '数字格式错误: For input string: "12a"\n结束' },
      { p: '捕获顺序有一条硬规则：<b>子类异常必须写在父类异常前面。</b>因为 catch 是从上往下匹配的，如果把 <code>RuntimeException</code> 写在最前面，后面所有它的子类都永远轮不到，编译器会直接报 <code>exception java.lang.NumberFormatException has already been caught</code>。上面代码里 NumberFormatException 和 ArrayIndexOutOfBoundsException 都是 RuntimeException 的子类，所以更宽的 RuntimeException 必须放在最后。' },
      { p: '如果两种异常的处理逻辑完全一样，可以用 multi-catch 合并：<code>catch (NumberFormatException | ArrayIndexOutOfBoundsException e)</code>。合并后 e 的静态类型是两者的共同父类，只能调用共同的方法，不能访问某个子类特有的成员；e 默认是 final 的，不能在块里重新赋值。还有一个限制：竖线两边不能有继承关系，写 <code>catch (IOException | FileNotFoundException e)</code> 会报“alternatives in a multi-catch statement cannot be related by subclassing”。' },
      { p: '捕获之后做什么，通常有四种选择。第一，就地恢复：给一个默认值，或者换一种实现继续；第二，包装后抛出：把底层异常转成更上层的业务异常，保留 cause；第三，记录日志后继续抛：适合需要在本层留下上下文、但处理权不在本层的情况；第四，记录日志并降级：比如缓存失败就回源数据库。最不应该做的是第五种——什么都不做，让异常凭空消失。' },
      { note: '<b>常见错误：</b>在 catch 里写 <code>e.printStackTrace()</code> 然后就当问题解决了。打印只是“看见”，不是“处理”；该回滚的事务、该返回的错误码、该重试的动作，一个都不能少。' },
      { h: '1.6 受检与非受检：编译器的态度' },
      { p: '受检异常（checked exception）指 Exception 下面除 RuntimeException 及其子类之外的异常。规则只有两条，但影响很大：如果一个方法可能抛出受检异常，它必须在方法签名上用 <code>throws</code> 声明；调用这个方法的代码必须用 try-catch 处理，或者自己继续用 throws 往上声明。两条都不做，编译直接失败。' },
      { lang: 'java', code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class CheckedDemo {
    public static void main(String[] args) {
        try {
            String content = Files.readString(Path.of("note.txt"));
            System.out.println(content);
        } catch (IOException e) {
            System.out.println("读文件失败: " + e.getMessage());
        }
    }
}`, title: 'CheckedDemo.java' },
      { p: '把 try-catch 去掉，只写 <code>String content = Files.readString(...)</code>，编译器会报：<code>unreported exception java.io.IOException; must be caught or declared to be thrown</code>。这句话翻译过来就是“这个受检异常你没有处理，也没有声明”。<code>Files.readString</code> 的签名里带着 <code>throws IOException</code>，这是它在提醒调用者：文件系统不可靠，请你决定失败时怎么办。' },
      { table: { head: ['对比项', '受检异常', '非受检异常（RuntimeException）'], rows: [
        ['编译期检查', '强制 catch 或 throws', '不强制'],
        ['典型来源', '文件、网络、数据库、线程中断', '空指针、越界、类型转换、非法参数'],
        ['能否恢复', '通常可以，属于预期内故障', '多数是缺陷，应修改代码'],
        ['对方法签名的影响', '需要 throws，调用链会被“污染”', '不出现在签名里'],
        ['常见代表', 'IOException、SQLException', 'NullPointerException、IllegalArgumentException']
      ] } },
      { p: '为什么 Java 要设计受检异常？初衷是让“可能失败”成为 API 契约的一部分。比如打开文件这个动作，失败是常态而不是意外，编译器强迫调用者面对它，可以避免“以为读到了、其实是空内容”的错误。但这个设计也有代价：底层方法声明了受检异常，中间每一层都得跟着声明或包装，签名越来越长；在 lambda 和 Stream 里尤其别扭，因为函数式接口的方法签名通常不允许抛出受检异常。' },
      { p: '实践中的取舍可以记成一句话：<b>外部环境导致、调用方有办法处理的，用受检异常；编程错误或业务规则拒绝的，用非受检异常。</b>现代框架大多把底层受检异常包装成非受检异常再抛出，比如 Spring 的 <code>DataAccessException</code>，就是为了不让业务代码被 SQLException 绑死。' },
      { h: '1.7 finally 的真实行为：一定执行，但有例外' },
      { p: 'finally 块的作用是“无论前面发生什么，这里的代码都要执行”。它最典型的用途是释放资源：关闭文件、关闭数据库连接、释放锁。try 正常结束会走 finally；try 里抛异常、被 catch 接住后会走 finally；catch 里又抛异常也会走 finally；try 或 catch 里执行 return、break、continue，同样会先走 finally 再离开。' },
      { lang: 'java', code: `public class FinallyDemo {
    static int test() {
        int x = 1;
        try {
            return x;
        } finally {
            x = 100;
            System.out.println("finally 中的 x = " + x);
        }
    }

    static int bad() {
        try {
            return 1;
        } finally {
            return 2;
        }
    }

    public static void main(String[] args) {
        System.out.println("返回值: " + test());
        System.out.println("bad 返回值: " + bad());
    }
}`, title: 'FinallyDemo.java' },
      { out: 'finally 中的 x = 100\n返回值: 1\nbad 返回值: 2' },
      { p: '第一个方法的结果常常让人意外：finally 明明把 x 改成了 100，为什么返回的还是 1？原因是 return 的执行顺序。JVM 先计算 <code>return x</code> 中表达式的值，把这个值暂存起来，然后去执行 finally，最后才把暂存的值返回。finally 里修改局部变量 x，改的只是栈上的副本，暂存区里的返回值不受影响。' },
      { p: '第二个方法展示了更危险的行为：finally 里的 <code>return 2</code> 会直接覆盖 try 里的返回值，最终返回 2。更糟的是，如果 try 里抛了异常，而 finally 里也 return，那么原异常会被完全丢弃，调用者永远不知道出过事。同理，在 finally 里 throw 新异常也会覆盖原异常。所以有一条铁律：<b>不要在 finally 里写 return、throw，也不要在 finally 里修改会影响返回值的状态。</b>' },
      { p: 'finally 并非绝对执行。以下情况它不会运行：调用了 <code>System.exit()</code> 或 <code>Runtime.getRuntime().halt()</code>；JVM 崩溃或被强制杀死；当前线程在 try 里进入死循环永远出不来；守护线程被 JVM 直接终止。除此之外，绝大多数“finally 没执行”的现场，其实是因为异常在进入 try 之前就发生了，或者 try 根本不在异常传播路径上。' },
      { p: '还有一个容易忽略的点：如果 try 里 return 的是一个对象引用，finally 里修改这个对象的字段，调用者拿到的是同一个对象，所以能看到修改。这跟修改局部变量不同——前者改的是堆上的对象内容，后者改的是栈上的副本。理解这一点，就不会再困惑“为什么 finally 改字段生效、改变量不生效”。' },
      { h: '1.8 try-with-resources：让关闭资源不再靠自觉' },
      { p: '用 finally 关闭资源虽然正确，但写起来很啰嗦，而且容易漏。更麻烦的是，如果 try 里抛了异常，finally 里的 close 又抛了异常，后者会把前者覆盖掉，真正的根因就丢了。Java 7 引入的 try-with-resources 解决了这两个问题：只要资源实现了 <code>AutoCloseable</code>，就可以写在 try 后面的括号里，离开 try 时自动按“后打开先关闭”的顺序调用 close。' },
      { lang: 'java', code: `import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class ReadFileDemo {
    public static void main(String[] args) {
        Path path = Path.of("hello.txt");
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
        } catch (IOException e) {
            System.out.println("读取失败: " + e.getMessage());
        }
    }
}`, title: 'ReadFileDemo.java' },
      { out: '第一行\n第二行' },
      { p: '假设 hello.txt 里有两行中文，程序会逐行读出并打印。注意 try 括号里的 <code>BufferedReader</code> 没有手动 close，编译器会自动生成关闭逻辑。它的语义大致等价于：先保存资源引用，执行 try 块；无论正常结束还是抛异常，都在 finally 里调用 close；如果 try 块和 close 都抛了异常，保留 try 块的异常，把 close 的异常通过 <code>addSuppressed</code> 挂到它身上。' },
      { p: '多个资源可以写在同一个括号里，用分号隔开，关闭顺序与声明顺序相反：先开的最后关。这符合依赖关系——外层流包装内层流时，必须先关外层再关内层。Java 9 之后，如果资源变量在 try 之前已经声明且是 final 或 effectively final，可以直接写 <code>try (reader)</code>，不必再声明一次。' },
      { p: '要让自己写的类支持自动关闭，实现 <code>AutoCloseable</code> 接口，提供 <code>close()</code> 方法。这个方法的签名允许抛出 Exception，子接口 <code>Closeable</code> 把异常收窄成了 IOException。<code>close()</code> 里应该释放真实资源，并且要幂等——重复调用不能出错。还有一个实践细节：不要把这个资源对象本身返回给调用方，否则调用方可能在 try 结束后继续使用一个已经关闭的对象。' },
      { note: '<b>优先选择：</b>能用 try-with-resources 就不要手写 finally close。它更短、更安全，还能保留被压制的异常。只有在资源不实现 AutoCloseable，或者需要非常特殊的关闭顺序时，才退回 finally。' },
      { h: '1.9 throw 与 throws：抛出和声明是两件事' },
      { p: '<code>throw</code> 是一条语句，后面跟一个 Throwable 对象，作用是“现在就把这个异常抛出去”。<code>throws</code> 是方法签名的一部分，后面跟异常类型列表，作用是“我这个方法可能会抛出这些异常，调用我的人请做好准备”。一个在方法体里执行，一个在方法声明上承诺，初学者经常把两者混为一谈。' },
      { lang: 'java', code: `public class AgeValidator {
    static void checkAge(int age) {
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("年龄不合法: " + age);
        }
        System.out.println("年龄合法: " + age);
    }

    public static void main(String[] args) {
        try {
            checkAge(200);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`, title: 'AgeValidator.java' },
      { out: '年龄不合法: 200' },
      { p: 'checkAge 在参数越界时主动创建并抛出 IllegalArgumentException。因为它是非受检异常，方法签名不写 throws 也能通过编译；但为了让调用者一眼看出“这里可能拒绝参数”，显式写上 <code>throws IllegalArgumentException</code> 也是好习惯，属于文档性声明。如果抛的是受检异常，比如 <code>throw new IOException("...")</code>，那么方法签名必须声明，或者当场用 try-catch 处理，否则编译失败。' },
      { p: 'throw 的表达式必须是 Throwable 的实例，不能是字符串，也不能是 null。写 <code>throw null</code> 能通过编译，但运行时会抛 NullPointerException，毫无意义。另外，throw 之后的语句不可达，编译器会报“unreachable statement”，所以不要在同一条分支里既 throw 又写后续逻辑。' },
      { p: '受检异常的传播有两种方式：一是就地处理，用 catch 把它消化掉；二是向上声明，在方法签名写 throws，把责任交给调用者。选择哪一种，取决于“这一层有没有能力真正处理”。DAO 层拿到 SQLException，通常不知道怎么恢复，应该包装成业务异常往上抛；而 Controller 层知道该返回 500 还是 400，才适合做最终处理。' },
      { p: '重新抛出时要注意类型。写 <code>catch (IOException e) { throw e; }</code>，方法签名必须能抛出 IOException。Java 7 之后支持“精确重抛”：<code>catch (Exception e) { throw e; }</code> 在编译器分析得出实际只可能是 IOException 时，方法只需声明 IOException，不必声明 Exception。这个特性减少了无谓的签名膨胀，但不要把 catch 写得太宽来依赖它。' },
      { h: '1.10 重写方法时的异常规则' },
      { p: '继承和多态给异常带来了额外约束。假设父类方法声明抛出 IOException，子类重写它时，能不能改抛 SQLException？答案是不能。因为调用者是按父类签名来准备 catch 的：他写了 <code>catch (IOException e)</code>，你却在运行时抛出一个 SQLException，这个 catch 接不住，异常会直接穿透。编译器必须在编译期堵住这个漏洞。' },
      { table: { head: ['父类方法声明', '子类可以', '子类不可以'], rows: [
        ['<code>throws IOException</code>', '不抛、抛 FileNotFoundException 等子类', '抛 Exception、SQLException 等更宽的受检异常'],
        ['不声明任何受检异常', '不抛受检异常；可抛任意 RuntimeException', '抛 IOException 等任何受检异常'],
        ['<code>throws SQLException</code>', '不抛、抛 SQLTransientException 等子类', '抛 IOException 等无关受检异常'],
        ['<code>throws RuntimeException</code>', '任意非受检异常', '受检异常']
      ] } },
      { p: '把规则压缩成一句话：<b>子类方法抛出的受检异常，不能比父类方法声明的更宽。</b>可以更少、可以更窄、可以完全不抛；非受检异常不受这个限制，因为编译器本来就不强制调用者捕获它们。接口方法的实现、抽象方法的具体实现，都遵循同样的规则。' },
      { p: '这条规则的根源是多态调用。你写 <code>Animal a = new Dog(); a.read();</code>，编译器只看到 Animal.read 的签名，它只知道可能抛 IOException；如果 Dog.read 能抛 SQLException，编译器就无法提醒调用者处理，类型安全被破坏。构造器不参与重写，但子类构造器如果调用 super(...)，而父类构造器声明了受检异常，子类构造器也必须声明或处理。' },
      { p: '实际开发中，这条规则经常在“实现接口”时绊人。接口方法没写 throws，实现类却想抛受检异常，编译直接失败。解决办法通常不是改接口，而是把受检异常包装成非受检异常，或者在实现内部消化掉。这也是为什么很多现代 API 倾向于使用非受检异常——它对实现者的约束更小。' },
      { h: '1.11 异常处理的实战清单与常见错误' },
      { p: '知道语法只是第一步，真正难的是判断“在哪里捕获、捕获后做什么”。可以给自己四个问题：这个异常我能恢复吗？如果不能，应该由哪一层负责恢复？往上抛时需要补充哪些上下文？最终要不要展示给用户、展示到什么程度？四个问题答完，处理方式基本就定了。' },
      { list: [
        '<b>空 catch 是最糟的写法。</b><code>catch (Exception e) {}</code> 让问题彻底消失，线上排查时没有任何线索。至少记录日志，或者包装后继续抛。',
        '<b>不要只打印 message。</b><code>e.getMessage()</code> 可能为 null，也丢掉了类型和堆栈。日志用 <code>log.error("下单失败 orderId={}", orderId, e)</code>，把异常对象作为最后一个参数传进去。',
        '<b>不要捕获 Throwable 或 Error。</b>这会连 OutOfMemoryError、StackOverflowError 一起吞掉，JVM 已经不稳定，继续执行只会产生更诡异的问题。',
        '<b>不要把异常当流程控制。</b>用异常实现“找到就 break”之类的逻辑，性能差、可读性差，还会让真正的异常淹没在噪声里。',
        '<b>不要吞掉 InterruptedException。</b>捕获后要么继续抛，要么调用 <code>Thread.currentThread().interrupt()</code> 恢复中断标志，否则线程的取消信号就丢了。',
        '<b>不要在 finally 里 return 或 throw。</b>它会覆盖 try 的返回值和原异常，让真正的失败原因消失。',
        '<b>捕获顺序从具体到宽泛。</b>子类在前、父类在后；无关的异常不要硬凑一个 catch。',
        '<b>资源关闭交给 try-with-resources。</b>手写 finally 容易漏，也容易在 close 时覆盖原异常。'
      ] },
      { p: '再补充三个容易被忽视的边界。第一，异常消息里不要放密码、身份证号、完整银行卡号等敏感信息，日志会被很多人看到；第二，不要在循环里反复创建异常对象，<code>fillInStackTrace</code> 的开销不小，高频路径上尤其明显；第三，不要为了“统一”而把所有异常都包成同一种，丢失类型会让上层无法区分“参数错”和“系统故障”。' },
      { p: '最后是一个心态问题：异常不是“敌人”，而是方法契约的一部分。一个设计良好的方法，应该在文档和签名里说清楚“什么情况下会失败、失败时抛什么”；一个设计良好的调用方，应该只捕获自己真正能处理的异常，其余交给更上层。把这两件事做好，代码自然就健壮了。' },
      { h: '1.12 本章小结' },
      { list: [
        '只有 Throwable 的子类能被 throw 和 catch；Error 不该捕获，RuntimeException 多是代码缺陷。',
        '受检异常强制 catch 或 throws；非受检异常不强制，但同样需要正确处理。',
        'try 里抛异常后，剩余语句被跳过，控制流转到匹配的 catch，再从整个结构之后继续。',
        'catch 顺序必须从子类到父类；multi-catch 的多个类型不能有继承关系。',
        'finally 在 return 之前执行；finally 里的 return/throw 会覆盖原结果，禁止这么写。',
        'try-with-resources 自动关闭资源，关闭顺序与声明相反，并能保留被压制的异常。',
        '重写方法不能抛出比父类更宽的受检异常。'
      ] },
      { h: '1.13 常见追问' },
      { list: [
        '<b>问：受检异常能不能干脆在 main 上写 throws Exception？</b><br>答：能编译，但等于把处理责任交给 JVM 的默认处理器：main 声明 throws Exception 只是把异常转给启动器，JVM 打印堆栈后线程退出，退出码变成 1，用户看到的是堆栈而不是提示。学习阶段图省事可以这样写，生产代码应该在真正能处理的那一层捕获：读配置失败就报「配置文件缺失或缺字段」，而不是把 IOException 直接甩给终端。至少要 catch 后打印人能看懂的提示，再决定要不要非零退出。',
        '<b>问：try 里 return 了，finally 还会执行吗？</b><br>答：会。JVM 先算出 return 表达式的值并存到栈上的临时槽，再执行 finally，最后返回那个暂存值；所以 finally 里改局部变量看不到效果，改对象字段却能看到（改的是同一个堆对象）。若 finally 里也 return，它的值会覆盖原返回值，原异常也会被丢弃，这就是禁止在 finally 里 return、throw 的原因。唯一不执行的例外是 System.exit()、JVM 崩溃或线程被强杀。',
        '<b>问：为什么把 catch 顺序写反会编译失败？</b><br>答：因为前面的宽类型会把后面的子类型全部截胡。先写 catch (Exception e) 再写 catch (IOException e)，只要异常是 IOException，第一个 catch 就已经匹配，第二个永远不可达，编译器把它当错误（unreachable catch block）而不是警告。正确顺序是从子类到父类：FileNotFoundException、IOException、Exception。并列且互不继承的类型必须用 multi-catch 写成 catch (IOException | SQLException e)，这两个类型之间也不能有继承关系。',
        '<b>问：try-with-resources 里 close 抛异常会怎样？</b><br>答：分两种。try 块正常结束时，close 抛出的异常照常向外抛，你最先看到它。try 块自己已经抛了异常时，close 的异常不会覆盖它，而是被 addSuppressed 挂到原异常上，用 e.getSuppressed() 才能看到，这样真正的失败原因不会丢。所以排查 TWR 的现场时，除了主异常还要检查 getSuppressed()。反过来手写 finally 关流时，close 的异常会直接覆盖 try 里的异常，这是改用 TWR 的另一个理由。',
        '<b>问：finally 里修改对象字段，返回值能看到吗？</b><br>答：能，但只到「改内容」这一步。return 暂存的是引用，finally 改的是同一个堆对象，调用者拿到的自然是改后的字段值；如果 finally 让引用指向新对象，改的只是栈上的副本，返回值仍是旧对象。同理，finally 里给 String 重新赋值也无效，因为 String 不可变、赋值只改引用。把这条和「改局部变量无效」放在一起记：栈上的副本不生效，堆上的内容生效。',
        '<b>问：捕获后打印日志再抛出，算不算重复处理？</b><br>答：在同一层既记录完整堆栈又原样向上抛，通常会造成上层再记一次，一次失败产生多份堆栈，日志被稀释。约定是「要么在这里处理完，要么补充少量业务上下文后向上抛，让最外层记录一次完整堆栈」；中间层确实要留痕，就只记一条带业务标识（订单号、traceId）的短日志，不要把异常对象再当参数传一次。包装时务必保留 cause，否则最外层那个堆栈只剩包装层，根因已经丢了。',
      ] },
      { h: '1.14 自测与练习' },
      { p: '下面的练习建议先在纸上写出预期输出，再实际运行验证：能准确预测输出，说明你对控制流和 finally 的理解已经到位。' },
      { ol: [
        '写一个方法 <code>parseInt(String s)</code>，把字符串转成 int；非法输入时捕获 NumberFormatException，返回 0，并打印原始输入。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class SafeParse {\n  static int parseInt(String s) {\n    try {\n      return Integer.parseInt(s);\n    } catch (NumberFormatException e) {\n      System.out.println("解析失败: " + s);\n      return 0;\n    }\n  }\n\n  public static void main(String[] args) {\n    System.out.println(parseInt("123"));\n    System.out.println(parseInt("12a"));\n    System.out.println(parseInt(""));\n    System.out.println(parseInt("99999999999"));\n  }\n}</pre><b>要点</b>：<code>Integer.parseInt</code> 对非数字、空串、超范围都抛 <code>NumberFormatException</code>，它是 <code>IllegalArgumentException</code> 的子类、属非受检异常，catch 住就能返回兜底值；try 只包住解析那一行；调用方拿到 0 时无法区分「真解析出 0」和「解析失败」。</div></details>',
        '写一个方法，演示 try 中 return、finally 中修改局部变量，验证返回值是否改变，并解释原因。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class FinallyReturn {\n\n  static int changedLocal() {\n    int x = 1;\n    try {\n      return x;\n    } finally {\n      x = 100;\n      System.out.println("finally x=" + x);\n    }\n  }\n\n  static int returnedInFinally() {\n    try {\n      return 1;\n    } finally {\n      return 3;   // 覆盖 try 的返回值\n    }\n  }\n\n  public static void main(String[] args) {\n    System.out.println(changedLocal());\n    System.out.println(returnedInFinally());\n  }\n}</pre><b>要点</b>：第一个输出 1（finally 里却打印 100）——return 先把表达式值存进返回槽，finally 改的只是栈上的局部变量副本；第二个输出 3，说明 finally 里的 return 会覆盖返回值并吞掉挂起的异常，IDE 会报 <code>return inside finally block</code> 警告；用 <code>javap -c</code> 能看到 istore 与 iload 的先后顺序。</div></details>',
        '写一个方法，依次打开两个实现了 AutoCloseable 的资源，在 close 里打印名字，验证关闭顺序。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class CloseOrder {\n\n  static class Res implements AutoCloseable {\n    private final String name;\n\n    Res(String name) {\n      this.name = name;\n      System.out.println("open " + name);\n    }\n\n    @Override\n    public void close() {\n      System.out.println("close " + name);\n    }\n  }\n\n  public static void main(String[] args) {\n    try (Res a = new Res("A"); Res b = new Res("B")) {\n      System.out.println("body");\n    }\n  }\n}</pre><b>要点</b>：输出 open A / open B / close B / close A，后声明的资源先关——TWR 被编译成嵌套 try-finally，最后声明的落在最内层；资源必须写在括号里才会被自动关闭，写进 try 体里不算；JDK 9 起可直接 <code>try (in)</code> 复用已声明且 effectively final 的变量。</div></details>',
        '把一段使用 finally 关闭 BufferedReader 的代码改写成 try-with-resources，对比两者的行数和异常处理差异。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.BufferedReader;\nimport java.io.FileReader;\nimport java.io.IOException;\n\npublic class ReadBoth {\n\n  static String oldWay(String path) throws IOException {\n    BufferedReader in = null;\n    try {\n      in = new BufferedReader(new FileReader(path));\n      StringBuilder sb = new StringBuilder();\n      String line;\n      while ((line = in.readLine()) != null) {\n        sb.append(line).append(\'\\n\');\n      }\n      return sb.toString();\n    } finally {\n      if (in != null) {\n        in.close();   // 判空 + close 异常会盖掉主异常\n      }\n    }\n  }\n\n  static String newWay(String path) throws IOException {\n    try (BufferedReader in =\n        new BufferedReader(new FileReader(path))) {\n      StringBuilder sb = new StringBuilder();\n      in.lines().forEach(l -> sb.append(l).append(\'\\n\'));\n      return sb.toString();\n    }\n  }\n\n  public static void main(String[] args) throws IOException {\n    System.out.println(newWay("a.txt")\n        .equals(oldWay("a.txt")));\n  }\n}</pre><b>要点</b>：行数从十几行降到五六行；TWR 由编译器生成关闭逻辑并用 addSuppressed 保留主异常，手写 finally 里 close 抛出的异常会覆盖 try 块里的异常；JDK 9 起可直接 <code>try (in)</code> 复用已声明的变量。</div></details>',
        '定义一个方法 <code>read(String path) throws IOException</code>，在 main 中分别用 try-catch 和 throws 两种方式处理，观察编译器提示。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.IOException;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class TwoWays {\n\n  static String read(String path) throws IOException {\n    return Files.readString(Path.of(path));\n  }\n\n  // 方式一：就地处理，main 签名不变\n  static void catchIt() {\n    try {\n      System.out.println(read("a.txt"));\n    } catch (IOException e) {\n      System.out.println("读取失败: " + e.getMessage());\n    }\n  }\n\n  // 方式二：继续向上声明，交给 JVM 兜底\n  public static void main(String[] args) throws IOException {\n    catchIt();\n    System.out.println(read("a.txt"));\n  }\n}</pre><b>要点</b>：受检异常强制调用方表态——只 catch 时编译通过；只给 read 写 throws、main 也不处理时编译报 <code>unreported exception java.io.IOException; must be caught or declared to be thrown</code>；main 上写 throws 会让 JVM 打印堆栈并以非零码退出；实战里更常见的是 catch 后补上下文、包装成非受检异常再抛。</div></details>',
        '找出下面代码的问题：<code>try { return 1; } catch (Exception e) { return 2; } finally { return 3; }</code>，说明实际返回值和潜在风险。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：实际返回 3，try 里的 return 1 和 catch 里的 return 2 都被 finally 覆盖；如果 try 里先抛异常，异常也会被吃掉。<b>为什么</b>：finally 的 return 会直接改写返回槽，并丢弃挂起的异常对象。<b>要点</b>：IDE 会给出 <code>return inside finally block</code> 警告；正确写法是 finally 只做清理，需要兜底就在 try 之前声明返回值变量，在 finally 之后统一返回。</div></details>',
      ] },
      { note: '<b>练习提示：</b>第 2 题和第 6 题都要亲手运行，不要凭印象。第 3 题可以自己写一个类实现 AutoCloseable，在 close 里 <code>System.out.println(name)</code>，观察输出顺序是否与声明顺序相反。' }
    ]
  };

  T['custom-exception'] = {
    meta: '本章约 6000 字 · 建议 40 分钟 · 6 个示例 · 3 张表格',
    blocks: [
      { h: '2.1 为什么需要自定义异常：内置异常撑不住的场景' },
      { p: '上一章我们学会了用 try-catch 接住异常，但还有一个问题没有回答：接住之后，怎么让上层知道“到底出了什么事”？JDK 提供的异常类型是通用词汇：IOException 说“输入输出出问题了”，IllegalArgumentException 说“参数不对”，RuntimeException 说“运行时出错了”。这些词在写基础库时够用，但在业务系统里太笼统。' },
      { p: '想象一个下单接口。失败可能是商品下架、库存不足、优惠券过期、收货地址不在配送范围、支付超时、风控拦截。如果这些情况统统抛 RuntimeException，Controller 层只能拿到一句“下单失败”，既没法给前端返回不同的提示，也没法在监控里按原因分类统计。反过来，如果每种情况都建一个异常类，又会出现几十个几乎一样的类，维护成本飙升。' },
      { p: '并不是所有错误都需要自定义异常。JDK 已经覆盖了很多通用语义：参数为空或越界用 IllegalArgumentException，对象状态不允许当前操作用 IllegalStateException，不支持的操作抛 UnsupportedOperationException，找不到元素用 NoSuchElementException。这些异常语义清晰、调用者熟悉，不应该被重新发明。' },
      { p: '真正需要自定义异常的是下面三类场景。第一类是<b>业务规则拒绝</b>：余额不足、库存不足、订单状态不允许取消。这类“失败”是业务的一部分，调用方往往需要根据原因做不同处理。第二类是<b>需要携带结构化数据</b>：参数校验失败要知道是哪个字段，库存不足要知道缺多少，限流要知道多久后重试。第三类是<b>跨层转换</b>：把底层的 SQLException、IOException 包装成上层能理解的业务异常，同时保留原始 cause。' },
      { table: { head: ['场景', '内置异常是否够用', '建议做法'], rows: [
        ['参数为 null、下标越界', '够用', '直接用 IllegalArgumentException、IndexOutOfBoundsException'],
        ['对象状态不允许操作', '够用', '直接用 IllegalStateException'],
        ['余额不足、库存不足', '不够，缺业务语义', '自定义非受检异常，携带余额、缺口等字段'],
        ['数据库连接失败', '不够，太底层', '包装成基础设施异常或业务异常，保留 cause'],
        ['参数校验多字段失败', '不够，缺字段信息', '自定义校验异常，携带字段名和错误列表'],
        ['接口限流、重复提交', '不够，缺重试信息', '自定义异常，携带 retryAfter 等元数据']
      ] } },
      { p: '判断标准可以很简单：如果调用方需要 <code>instanceof</code> 判断具体原因，或者需要从异常里读出一个具体数值来做决策，就值得自定义；如果只是记录日志、返回统一的 500，用标准异常加一条清晰 message 就够了。不要为了“看起来架构完整”而给每个错误建类。' },
      { p: '自定义异常要解决的就是这个矛盾：用“异常类型 + 结构化字段”表达业务语义，让错误可读、可分类、可处理，同时通过合理的层次和错误码，避免异常类无限膨胀。这一章会从怎么定义开始，讲到怎么包装、怎么分层、怎么在全局处理器里统一转换，最后总结一整套最佳实践。' },
      { h: '2.2 受检还是非受检：一张决策图' },
      { p: '这是设计自定义异常时最难的一步，也是面试里最常问的。先给结论：<b>业务规则拒绝、参数错误、状态冲突，用非受检异常；调用方必须处理且确实能恢复的外部故障，用受检异常。</b>但光背结论不够，还要知道背后的判断逻辑。' },
      { flow: ['调用方能否合理恢复？', '不能：编程错误或系统故障', '能：是否外部环境导致？', '是：用受检异常', '否：业务规则拒绝，用非受检异常'] },
      { p: '第一种情况：调用方根本无法恢复。比如传入了 null、数组下标为负、除数为零，这些是编程错误，属于“代码写错了”，正确做法是修代码，而不是让每个调用者写 try-catch。这类用非受检异常，编译器不强制捕获，异常会快速暴露到测试环境。' },
      { p: '第二种情况：业务规则拒绝。余额不足、库存不够、订单已取消，这些不是 bug，而是正常业务分支。调用方通常需要根据原因给用户提示，但不需要“必须”处理——即使漏了，最外层也会统一兜底成 400。这类也适合非受检异常，因为它避免了在 Service、Controller 的每个方法签名上都写 throws，代码更干净。' },
      { p: '第三种情况：外部环境导致、调用方确实能恢复。比如调用第三方支付超时，调用方可以重试或切换通道；读取配置文件失败，调用方可以加载默认配置。这类问题不是代码错误，编译器强制你面对它是有价值的，可以用受检异常。但要克制：一旦用了受检异常，整条调用链都要声明或包装，lambda 里还会因为函数式接口不声明受检异常而写得很别扭。' },
      { p: '现实中的架构往往采用“底层受检、上层非受检”的混合策略：DAO 层抛 SQLException（受检），Repository 层包装成 DataAccessException（非受检），Service 层抛业务异常（非受检），Controller 层统一转换成 HTTP 响应。这样既保留了底层的精确信息，又不让业务代码被受检异常绑死。' },
      { table: { head: ['判断维度', '受检异常', '非受检异常'], rows: [
        ['典型例子', '支付超时、文件读取失败', '余额不足、参数非法、状态冲突'],
        ['调用方能否恢复', '通常能，且必须表态', '通常不能，或由最外层统一处理'],
        ['对签名的影响', '每个中间层都要 throws 或包装', '不影响签名'],
        ['推荐场景', '基础设施 API、可重试的外部调用', '业务异常、编程错误、框架内部']
      ] } },
      { h: '2.3 定义一个最简业务异常' },
      { p: '自定义异常的本质就是继承 Throwable 家族中的某一支。业务异常通常继承 RuntimeException，原因上一节已经讲过。类里最少要有两个构造器：一个只接收 message，一个同时接收 message 和 cause。前者用于主动描述业务失败，后者用于包装底层异常。' },
      { lang: 'java', code: `public class BalanceException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public BalanceException(String message) {
        super(message);
    }

    public BalanceException(String message, Throwable cause) {
        super(message, cause);
    }
}`, title: 'BalanceException.java' },
      { p: '这段代码看起来只是转发构造器，但每一行都有意义。继承 RuntimeException 表示它是非受检异常，调用方不必在每个方法签名上写 throws；<code>serialVersionUID</code> 是序列化版本号，异常对象理论上可以被序列化（比如跨进程传输），显式声明可以避免版本变化导致的兼容问题；两个构造器分别覆盖“有描述”和“有根因”两种场景。' },
      { p: '有了异常类，业务代码就可以在检测到规则被违反时主动抛出它。下面这个账户类在取款金额非法和余额不足时，分别抛不同的异常：金额非法是编程错误，用 IllegalArgumentException；余额不足是业务拒绝，用 BalanceException。' },
      { lang: 'java', code: `public class AccountDemo {
    public static void main(String[] args) {
        Account account = new Account(100);
        try {
            account.withdraw(300);
        } catch (BalanceException e) {
            System.out.println("取款失败: " + e.getMessage());
        }
        System.out.println("余额: " + account.getBalance());
    }
}

class Account {
    private int balance;

    Account(int balance) {
        this.balance = balance;
    }

    int getBalance() {
        return balance;
    }

    void withdraw(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("取款金额必须大于 0: " + amount);
        }
        if (amount > balance) {
            throw new BalanceException("余额不足: 需要 " + amount + "，当前 " + balance);
        }
        balance -= amount;
    }
}`, title: 'AccountDemo.java' },
      { out: '取款失败: 余额不足: 需要 300，当前 100\n余额: 100' },
      { p: '注意输出里的余额仍然是 100。异常在扣款之前抛出，<code>balance -= amount</code> 根本没有执行，对象状态没有被破坏。这就是“尽早失败”的价值：在发现问题的第一行就抛出，而不是先改一半状态、再返回一个错误码，让调用方去猜哪些操作生效了。' },
      { h: '2.4 四个构造器与异常链' },
      { p: 'JDK 里的异常基类提供了四个常用构造器：无参、只有 message、只有 cause、message 加 cause。自定义异常不一定要全部转发，但至少应该提供“message”和“message + cause”两个，否则包装底层异常时只能丢掉根因。对于需要序列化的异常，无参构造器也有价值，因为反序列化过程可能依赖它。' },
      { lang: 'java', code: `public class OrderException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final String errorCode;

    public OrderException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public OrderException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}`, title: 'OrderException.java' },
      { p: '这里多了一个 <code>errorCode</code> 字段，用 final 修饰，构造时赋值，只提供 getter。异常对象一旦创建就不应该被修改，否则在多层传递过程中，不同层看到的信息可能不一致，排查时会非常痛苦。错误码建议用稳定的字符串或枚举，不要用会变化的 message 充当码值。' },
      { p: '异常链是自定义异常最重要的能力之一。<code>super(message, cause)</code> 会把底层异常保存在 cause 字段里，打印堆栈时会看到 <code>Caused by:</code> 段落，一路指向最初的原因。如果只传 message 不传 cause，日志里就只剩一句“查询订单失败”，数据库到底报的是连接超时还是唯一键冲突，完全看不出来。' },
      { p: 'cause 还有两个细节。第一，<code>getCause()</code> 可能返回 null，打印前要判空；第二，<code>initCause()</code> 只能调用一次，而且如果构造时已经传了 cause，再调用会抛 IllegalStateException。所以推荐在构造器里一次性把 cause 传进去，不要事后再补。异常链也不要写得太深，三五层还能读，几十层就变成噪声了。' },
      { h: '2.5 让异常携带结构化信息' },
      { p: '只有 message 的异常，信息是“给人读的”；带字段的异常，信息是“给程序用的”。比如参数校验失败，前端需要知道是哪个字段错了，才能把输入框标红；如果只有一句“参数不合法”，前端只能弹一个笼统的提示。把字段名、错误码、甚至多个错误明细放进异常，调用方才能做精细处理。' },
      { lang: 'java', code: `public class ErrorCodeDemo {
    enum ErrorCode {
        INVALID_PARAM("A0400", "参数不合法"),
        NOT_FOUND("A0404", "资源不存在"),
        CONFLICT("A0409", "状态冲突"),
        INTERNAL("B0500", "系统繁忙");

        private final String code;
        private final String message;

        ErrorCode(String code, String message) {
            this.code = code;
            this.message = message;
        }

        String getCode() { return code; }
        String getMessage() { return message; }
    }

    static class ApiException extends RuntimeException {
        private final ErrorCode errorCode;

        ApiException(ErrorCode errorCode, String detail) {
            super(errorCode.getMessage() + (detail == null ? "" : ": " + detail));
            this.errorCode = errorCode;
        }

        ErrorCode getErrorCode() { return errorCode; }
    }

    public static void main(String[] args) {
        try {
            throw new ApiException(ErrorCode.NOT_FOUND, "订单 1001");
        } catch (ApiException e) {
            System.out.println(e.getErrorCode().getCode() + " " + e.getErrorCode().getMessage());
            System.out.println(e.getMessage());
        }
    }
}`, title: 'ErrorCodeDemo.java' },
      { out: 'A0404 资源不存在\n资源不存在: 订单 1001' },
      { p: '这个例子里，错误码枚举承担了两个职责：给程序一个稳定的分类标识，给用户一句可读的默认文案。ApiException 在构造时把“默认文案 + 细节”拼成 message，同时保留 errorCode 供上层判断。注意 message 是拼接出来的展示文本，errorCode 才是稳定的契约，前端和监控应该依赖后者，而不是去解析 message。' },
      { p: '错误码的编码规则可以自己定，但要保持稳定和可读。常见做法是用一个字母表示错误大类，后面跟 HTTP 状态码或业务序号，例如 A 表示客户端错误、B 表示服务端错误、A0404 对应资源不存在。不要用数据库自增 ID 或随机数当错误码，也不要频繁改码值，否则前端和告警规则会全部失效。' },
      { p: '如果一次校验有多个字段失败，不要只抛第一个。可以定义一个 <code>ValidationException</code>，内部持有 <code>List&lt;FieldError&gt;</code>，每个 FieldError 包含字段名和原因；全局处理器把它转换成 400 响应，前端逐字段展示。异常对象要尽量不可变：构造时复制一份列表，getter 返回不可修改视图，避免调用方偷偷改动。' },
      { h: '2.6 参数校验：一次收集所有字段错误' },
      { p: '参数校验是最常见的自定义异常场景。新手常写成一串 if，遇到第一个错误就抛，用户改完一个再提交，又发现第二个错误，来回好几次。更好的体验是一次校验完所有字段，把所有错误一起返回。下面这个例子用 FieldError 保存字段名和原因，用 ValidationException 携带错误列表。' },
      { lang: 'java', code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ValidationDemo {
    static class FieldError {
        private final String field;
        private final String reason;

        FieldError(String field, String reason) {
            this.field = field;
            this.reason = reason;
        }

        public String toString() {
            return field + ": " + reason;
        }
    }

    static class ValidationException extends RuntimeException {
        private final List<FieldError> errors;

        ValidationException(List<FieldError> errors) {
            super("参数校验失败，共 " + errors.size() + " 项");
            this.errors = Collections.unmodifiableList(new ArrayList<>(errors));
        }

        List<FieldError> getErrors() {
            return errors;
        }
    }

    static void validate(String name, int age) {
        List<FieldError> errors = new ArrayList<>();
        if (name == null || name.isBlank()) {
            errors.add(new FieldError("name", "不能为空"));
        }
        if (age < 0 || age > 150) {
            errors.add(new FieldError("age", "必须在 0 到 150 之间"));
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }

    public static void main(String[] args) {
        try {
            validate("", 200);
        } catch (ValidationException e) {
            System.out.println(e.getMessage());
            for (FieldError error : e.getErrors()) {
                System.out.println(" - " + error);
            }
        }
    }
}`, title: 'ValidationDemo.java' },
      { out: '参数校验失败，共 2 项\n - name: 不能为空\n - age: 必须在 0 到 150 之间' },
      { p: '这段代码有几个值得注意的设计。第一，validate 先收集错误、最后统一抛出，而不是每个 if 都 throw，这样调用方一次就能拿到全部问题。第二，ValidationException 在构造时用 <code>new ArrayList&lt;&gt;(errors)</code> 复制了一份列表，再用 <code>unmodifiableList</code> 包起来，防止外部在异常抛出后修改内容。第三，FieldError 的字段都是 final，异常对象整体不可变，跨线程传递也安全。' },
      { p: '如果使用 Bean Validation（例如 <code>@NotNull</code>、<code>@Size</code>），框架会抛出 ConstraintViolationException，里面同样包含字段路径和消息。可以在全局处理器里把它转换成和上面一样的响应结构，这样前端不需要关心错误来自手写校验还是注解校验。关键是保持对外契约稳定：字段名、错误码、消息格式统一。' },
      { p: '校验异常一般映射成 HTTP 400。不要把它映射成 500，因为这是客户端输入问题，不是服务端故障；也不要把原始堆栈返回给前端，堆栈里可能包含类名、SQL、内部路径。响应体只保留 field、code、message 三个字段就够了。' },
      { h: '2.7 包装底层异常：保留根因，补充上下文' },
      { p: '分层架构里，底层异常不应该原样穿透到上层。数据库的 SQLException、HTTP 客户端的 IOException，对业务代码来说太底层，既难以理解，也把具体技术栈暴露了出去。正确的做法是在边界处包装：创建一个更上层的异常，把底层异常作为 cause 传进去，同时补充业务上下文，例如订单号、用户 ID、操作名。' },
      { lang: 'java', code: `import java.sql.SQLException;

public class WrapDemo {
    static String loadOrder(long id) {
        try {
            throw new SQLException("connection reset by peer");
        } catch (SQLException e) {
            throw new OrderException("ORDER_QUERY_FAILED", "查询订单失败, id=" + id, e);
        }
    }

    public static void main(String[] args) {
        try {
            loadOrder(1001);
        } catch (OrderException e) {
            System.out.println("错误码: " + e.getErrorCode());
            System.out.println("业务异常: " + e.getMessage());
            System.out.println("根因: " + e.getCause().getMessage());
        }
    }
}`, title: 'WrapDemo.java' },
      { out: '错误码: ORDER_QUERY_FAILED\n业务异常: 查询订单失败, id=1001\n根因: connection reset by peer' },
      { p: '包装的关键是“三层信息都要有”：上层异常的类型说明业务语义，message 说明这次操作失败的具体上下文，cause 保留技术根因。三者缺一不可。只保留 message 会丢根因，只保留 cause 会让上层看不懂，只抛底层异常则暴露实现细节。' },
      { p: '包装时不要做这几件事：不要把原异常的信息复制进 message 后丢掉 cause；不要在包装的同时又把原异常打印一遍，否则日志会重复；不要把受检异常包装成 Error；不要为了“统一”把所有异常都包成同一个类，丢失类型后上层无法区分可重试和不可重试。' },
      { p: '还有一个常见需求是“异常转换表”。比如基础设施层把 SQLException 按 SQLState 转成唯一键冲突、连接失败、超时等不同异常；服务层再把它们转成业务异常。转换过程应该集中在一个地方，而不是散落在每个 DAO 方法里，否则规则会不一致，新增一种数据库错误时到处都要改。' },
      { h: '2.8 分层边界：谁抛、谁包、谁兜底' },
      { p: '自定义异常只有放在合适的位置才能发挥作用。一个常见的错误是“每层都 catch 一下”：Controller 捕获后打印一次，Service 捕获后再打印一次，Repository 也打印一次，结果一次失败产生三份堆栈，真正的根因被埋在重复日志里。正确的分工是：<b>每一层只做自己有能力做的事，其余交给上层。</b>' },
      { p: 'Repository 层负责技术适配。它知道数据库、缓存、HTTP 客户端的细节，应该把 SQLException、IOException 这类技术异常转换成统一的数据访问异常，并保留 cause。它不判断业务规则，也不决定 HTTP 状态码。Service 层负责业务规则，发现余额不足就抛 BalanceException，发现参数组合非法就抛 ValidationException；它通常不打印完整堆栈，只补充业务上下文。' },
      { p: 'Controller 层负责协议转换。它把 BusinessException 映射成 4xx，把系统异常映射成 5xx，把字段校验错误映射成带字段名的响应体。它是唯一适合“兜底”的地方，因为它最接近用户，知道该给用户看什么。全局异常处理器（例如 Spring 的 <code>@RestControllerAdvice</code> 配合 <code>@ExceptionHandler</code>）就是把这种兜底逻辑集中到一个类里，避免每个接口都写一遍 try-catch。' },
      { table: { head: ['层次', '主要职责', '典型动作', '不该做的事'], rows: [
        ['Controller', '协议转换、兜底', '把异常映射成状态码和响应体', '写业务判断、拼 SQL'],
        ['Service', '业务规则', '抛业务异常，补充订单号等上下文', '打印完整堆栈、吞异常'],
        ['Repository', '技术适配', '把 SQLException 包装成数据访问异常', '决定业务语义'],
        ['Infrastructure', '资源与稳定性', '重试、熔断、关闭资源、记录指标', '把底层异常原样穿透']
      ] } },
      { p: '日志策略也要跟着分层走。约定是“一次失败只记录一次完整堆栈”，通常放在最外层；中间层如果确实需要记录，只记一条带业务标识的简短日志，不要把异常对象再打印一遍。这样日志量可控，排查时也能沿着 traceId 把一次请求串起来。' },
      { p: '还有一条边界原则：<b>不要用一个巨大的 BusinessException 表达所有业务错误。</b>如果所有失败都是同一个类型，调用方只能去解析 message 或错误码，类型系统就失去了意义。合理的做法是保留一个基类承载公共字段，再为“处理方式确实不同”的错误建子类，例如可重试的 RemoteTimeoutException 和不可重试的 InvalidOrderStateException。' },
      { h: '2.9 命名、包结构与继承层次' },
      { p: '异常类的命名要让人一眼看懂“什么失败了”。推荐“名词 + 问题 + Exception”的结构，例如 InsufficientBalanceException、OrderNotFoundException、DuplicateUsernameException。名字要具体到业务动作，不要用 BusinessException、CommonException、MyException 这种万能词；也不要加拼音或项目缩写，半年后没人记得是什么意思。' },
      { list: [
        '<b>后缀统一用 Exception。</b>不要用 Error、Fault、Failed 混着来，Error 在 Java 里通常指 JVM 级错误，容易误导。',
        '<b>名字描述“被违反的规则”，而不是“出错的地方”。</b>InsufficientBalanceException 比 AccountServiceException 更有信息量。',
        '<b>基类只放公共字段。</b>例如 BusinessException 持有 code，子类只补充自己特有的数据；不要把几十个字段全塞进基类。',
        '<b>继承层次控制在两到三层。</b>BusinessException → 领域异常 → 具体异常已经足够；再深就很难一眼看清 catch 顺序。',
        '<b>异常类放在独立的 exception 包。</b>按领域再分子包，例如 order.exception、user.exception，避免一个包几百个类。',
        '<b>一个文件一个 public 异常类。</b>需要多个小异常时可以用嵌套类，但嵌套太深会影响可读性。',
        '<b>构造器参数顺序保持一致。</b>统一成“错误码、消息、cause”或“消息、cause”，调用者不用每次查签名。'
      ] },
      { p: '继承层次不是越深越好。一个实用的结构是：最上层 BusinessException 继承 RuntimeException，携带 code 和 message；中间按领域分成 OrderException、UserException；最底层才是具体异常。catch 的时候可以按需选择粒度：想统一处理就 catch BusinessException，想单独处理就 catch InsufficientBalanceException。如果发现某个异常类从来没有被单独 catch 过，也没有独有字段，那它大概率可以合并掉。' },
      { note: '<b>关于受检异常的位置：</b>如果确实需要受检异常，把它放在基础设施层，不要让它出现在领域模型的公开 API 里。领域层用非受检异常表达业务失败，基础设施层负责把受检异常转换进来，这样领域代码不会被 throws 污染。' },
      { note: '<b>放哪里：</b>自定义异常通常放在独立的 exception 包，例如 <code>com.example.order.exception</code>。不要把它塞在实体类或工具类里，否则依赖关系会变得混乱，也不利于全局异常处理器统一扫描。' },
      { h: '2.10 十种常见反模式' },
      { p: '下面这些写法在真实项目里非常常见，有些甚至被当成“规范”传播。每一条都附上它为什么错、应该怎么改。' },
      { list: [
        '<b>空 catch：</b><code>catch (Exception e) {}</code>。错误彻底消失，线上没有任何线索。至少记录日志，或者包装后抛出。',
        '<b>捕获后只打印 message：</b>丢掉了类型和堆栈，排查时只能看到一句“失败”。日志要把异常对象作为最后一个参数传进去。',
        '<b>所有异常包成同一个类：</b>上层无法区分可重试、不可重试、参数错、系统故障，只能去解析字符串。',
        '<b>包装时丢掉 cause：</b>只写 <code>throw new OrderException("查询失败")</code>，数据库的真正报错永远查不到。',
        '<b>用异常做正常流程控制：</b>用“找不到就抛异常”代替返回 Optional，在高频路径上性能差，也让真正的异常被淹没。',
        '<b>异常里放敏感信息：</b>把密码、身份证号、完整卡号拼进 message，日志和监控系统会长期保存这些数据。',
        '<b>在 finally 里 return 或 throw：</b>覆盖 try 的返回值和原异常，是最难排查的 bug 之一。',
        '<b>每个错误建一个类：</b>几十个只有名字不同的异常，catch 时无从下手，新增错误还要改全局映射。',
        '<b>把异常当日志用：</b>每层都 catch 并打印，一次失败产生多份堆栈，日志量暴涨还互相矛盾。',
        '<b>受检异常污染公开 API：</b>每个方法都 throws Exception，调用方被迫写大量无意义的 try-catch，最终演变成空 catch。'
      ] },
      { p: '反模式之所以流行，往往是因为它们在短期内“让编译通过”或“让日志好看”。判断一段异常处理是否合格，可以问三个问题：出问题时能不能从日志还原现场？调用方能不能根据类型做出正确决策？这段代码有没有可能悄悄吞掉错误？三个问题都能回答“能”，基本就合格了。' },
      { h: '2.11 本章小结' },
      { list: [
        '自定义异常解决的是语义问题：让上层知道“什么业务规则失败了”，而不是只知道“出错了”。',
        '业务规则拒绝用非受检异常；外部环境导致且调用方能恢复的，才考虑受检异常。',
        '异常类至少提供 message 和 message + cause 两个构造器，包装时必须保留 cause。',
        '异常对象应尽量不可变：字段 final，集合做防御性复制，只提供 getter。',
        '用错误码或枚举做稳定契约，message 只负责展示；不要让前端解析 message。',
        '分层处理：Repository 包装技术异常，Service 抛业务异常，Controller 统一兜底和映射状态码。',
        '命名具体、层次克制、包结构清晰；不要用万能异常类，也不要为每个错误建类。'
      ] },
      { h: '2.12 常见追问' },
      { list: [
        '<b>问：业务异常到底该不该继承 RuntimeException？</b><br>答：多数情况应该。业务失败（余额不足、库存不够）是正常分支，调用方通常只需把原因转成提示，不需要每一层签名都写 throws；用非受检异常能让 Service、Controller 的方法签名保持干净。但如果某个失败调用方必须处理且确实能恢复，例如支付结果未知、需要重试或对账，用受检异常并写进文档是合理的。判断标准就是 2.2 那张图：能否恢复、是否外部环境导致，而不是「大家都这么写」。',
        '<b>问：自定义异常要不要写 serialVersionUID？</b><br>答：建议写。异常对象常被序列化到日志管道、消息队列、RPC 响应或本地缓存里；不写时 serialVersionUID 由编译器按类结构计算，改一个字段或方法就可能变，老数据反序列化会抛 InvalidClassException。显式声明 <code>private static final long serialVersionUID = 1L;</code> 之后，兼容性由你自己控制，真正破坏兼容的改动再升版本号。注意它只对实现了 Serializable 的异常有意义，Throwable 本身已经实现了。',
        '<b>问：包装异常时 message 应该写什么？</b><br>答：写「这次操作失败的业务上下文」——订单号、用户 ID、操作名、关键入参，让人不看代码就知道是哪一笔业务出了事，例如「查询订单失败, id=1001」。不要把底层异常的 message 复制一遍（cause 已经带着），也不要把整个堆栈拼进字符串，那会让日志重复且难以结构化检索。三层信息各司其职：上层异常类型表达业务语义，message 表达本次上下文，cause 保留技术根因。',
        '<b>问：全局异常处理器会不会把 Error 也捕获？</b><br>答：取决于写法。<code>@ExceptionHandler(Exception.class)</code> 捕获不到 Error，因为 Error 和 Exception 是 Throwable 下平行的两支；只有声明 Throwable 才会连 OutOfMemoryError、StackOverflowError 一起接住。不要为了「兜住一切」去捕获 Throwable：JVM 已经不稳定，继续拼响应只会产生更诡异的问题。Error 应该让它暴露，交给进程退出和告警。另外线程池里的异常要靠 UncaughtExceptionHandler 兜，别指望全局处理器。',
        '<b>问：异常太多，前端怎么知道该提示什么？</b><br>答：让前端依赖稳定的错误码，而不是 message。后端为每个码维护一份用户可读文案（放字典表或前端语言包），message 只用于开发排查；响应体把 code、message、traceId 分开给，前端按 code 分支。这样改文案不用发版，也不会因为拼接字符串把内部细节泄露给用户。错误码要有命名规范（模块加原因），并避免一个码打天下，否则前端只能靠猜。',
        '<b>问：同一个异常被多层包装，堆栈会不会很长？</b><br>答：会，但这是有价值的上下文——每一层包装都说明了它在做什么。问题不在长，而在无意义的重复：为了「统一」在每层都 new 一个同类型异常，会让堆栈里出现五个几乎一样的 cause 链，真正根因埋在底部。控制办法是只在跨越边界时包装一次（技术层、业务层、协议层各一次），包装时只补充这一层才知道的上下文；打印时用日志框架的异常参数如 <code>log.error("下单失败 orderId={}", id, e)</code>，它会输出完整 Caused by 链，不要手工 getCause 循环。',
      ] },
      { h: '2.13 自测与练习' },
      { p: '下面的练习覆盖定义、包装、分层和全局处理。建议先写出代码，再故意制造失败，看日志里能不能还原现场。' },
      { ol: [
        '定义一个 InsufficientStockException，携带商品 ID、需求数量和实际库存；写一个扣库存方法，在库存不足时抛出它。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class Stock {\n\n  static class InsufficientStockException\n      extends RuntimeException {\n    private final long sku;\n    private final int need;\n    private final int stock;\n\n    InsufficientStockException(long sku, int need, int stock) {\n      super("库存不足 sku=" + sku + " need=" + need\n          + " stock=" + stock);\n      this.sku = sku;\n      this.need = need;\n      this.stock = stock;\n    }\n\n    long getSku() { return sku; }\n    int getNeed() { return need; }\n    int getStock() { return stock; }\n  }\n\n  static void deduct(long sku, int want, int stock) {\n    if (want > stock) {\n      throw new InsufficientStockException(sku, want, stock);\n    }\n    System.out.println("扣减成功，剩余 " + (stock - want));\n  }\n\n  public static void main(String[] args) {\n    try {\n      deduct(1001L, 8, 5);\n    } catch (InsufficientStockException e) {\n      System.out.println(e.getMessage());\n      System.out.println(e.getSku() + "/" + e.getNeed()\n          + "/" + e.getStock());\n    }\n  }\n}</pre><b>要点</b>：三个字段 final，message 只是它们的展示形式，catch 里用 getter 取结构化数据，不必解析字符串；继承 RuntimeException 还是 Exception，取决于调用方能不能就地恢复——库存不足通常是要提示用户的业务失败，选非受检更省签名噪音。</div></details>',
        '写一个方法读取文件并把内容解析成整数，分别处理 IOException 和 NumberFormatException，最后包装成一个自定义的 ConfigLoadException 抛出，保留 cause。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.IOException;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class ConfigLoader {\n\n  static class ConfigLoadException extends RuntimeException {\n    ConfigLoadException(String msg, Throwable cause) {\n      super(msg, cause);\n    }\n  }\n\n  static int load(String path) {\n    try {\n      String text = Files.readString(Path.of(path)).trim();\n      return Integer.parseInt(text);\n    } catch (IOException e) {\n      throw new ConfigLoadException("加载配置失败: " + path, e);\n    } catch (NumberFormatException e) {\n      throw new ConfigLoadException("配置不是整数: " + path, e);\n    }\n  }\n\n  public static void main(String[] args) {\n    try {\n      System.out.println(load("config.txt"));\n    } catch (ConfigLoadException e) {\n      System.out.println(e.getMessage() + " &lt;- "\n          + e.getCause().getClass().getName());\n    }\n  }\n}</pre><b>要点</b>：文件不存在时 <code>Files.readString</code> 抛 <code>NoSuchFileException</code>，内容是 abc 时 <code>Integer.parseInt</code> 抛 <code>NumberFormatException</code>，两者都作为 cause 传进新异常，日志里就有两层 Caused by；别写 <code>throw new RuntimeException(e.getMessage())</code> 丢栈，也别在同一层既 printStackTrace 又向上抛。</div></details>',
        '设计一个 BusinessException 基类，包含 code 和 message；再写两个子类，分别表示「可重试的超时」和「不可重试的状态冲突」，在 main 中按类型分别处理。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class Business {\n\n  static class BusinessException extends RuntimeException {\n    private final String code;\n\n    BusinessException(String code, String message) {\n      super(message);\n      this.code = code;\n    }\n\n    String getCode() { return code; }\n  }\n\n  static class RetryableTimeoutException\n      extends BusinessException {\n    RetryableTimeoutException(String msg) {\n      super("TIMEOUT", msg);\n    }\n  }\n\n  static class StateConflictException\n      extends BusinessException {\n    StateConflictException(String msg) {\n      super("CONFLICT", msg);\n    }\n  }\n\n  public static void main(String[] args) {\n    BusinessException[] cases = {\n        new RetryableTimeoutException("下游超时"),\n        new StateConflictException("订单已支付")};\n    for (BusinessException e : cases) {\n      // 先窄后宽：子类必须写在父类之前\n      try {\n        throw e;\n      } catch (RetryableTimeoutException t) {\n        System.out.println("可重试 " + t.getCode());\n      } catch (BusinessException b) {\n        System.out.println("兜底 " + b.getCode());\n      }\n    }\n  }\n}</pre><b>要点</b>：catch 按源码顺序匹配，先窄后宽；两个 catch 反过来写会报 <code>exception ... has already been caught</code>；基类字段 final 并提供 getCode()；区分类型靠 catch 分支或 instanceof，绝不比较 message 字符串。</div></details>',
        '写一个 validate 方法，校验用户名、年龄、邮箱三个字段，一次性收集所有错误并抛出 ValidationException。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\npublic class Validator {\n\n  static class ValidationException extends RuntimeException {\n    private final List&lt;String> errors;\n\n    ValidationException(List&lt;String> errors) {\n      super("校验失败 " + errors.size() + " 处");\n      this.errors = List.copyOf(errors);   // 不可变副本\n    }\n\n    List&lt;String> getErrors() { return errors; }\n  }\n\n  static void validate(String name, int age, String mail) {\n    List&lt;String> errors = new ArrayList&lt;>();\n    if (name == null || name.isBlank()) {\n      errors.add("name: 用户名必填");\n    }\n    if (age &lt; 0 || age > 150) {\n      errors.add("age: 年龄超出 0~150");\n    }\n    if (mail == null || !mail.contains("@")) {\n      errors.add("mail: 邮箱格式不对");\n    }\n    if (!errors.isEmpty()) {\n      throw new ValidationException(errors);\n    }\n  }\n\n  public static void main(String[] args) {\n    try {\n      validate("", 200, "abc");\n    } catch (ValidationException e) {\n      System.out.println(e.getMessage());\n      e.getErrors().forEach(System.out::println);\n    }\n  }\n}</pre><b>要点</b>：先在方法内累积、最后统一抛出，一次把全部错误交给前端；<code>List.copyOf</code> 让列表不可变，测试里往 getErrors() 里 add 会抛 <code>UnsupportedOperationException</code>；每条错误用「字段名 + 原因」的结构，别拼成一整句再让前端切分。</div></details>',
        '把一段「每层都 catch 并打印」的代码改成「只在最外层记录一次」，说明修改后日志量和信息完整性的变化。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.logging.Logger;\n\npublic class Layers {\n  private static final Logger log =\n      Logger.getLogger(Layers.class.getName());\n\n  static class ServiceException extends RuntimeException {\n    ServiceException(String msg, Throwable cause) {\n      super(msg, cause);\n    }\n  }\n\n  // 改前：每一层都记录，一次失败 3 份堆栈\n  static void before() {\n    try {\n      step();\n    } catch (NumberFormatException e) {\n      e.printStackTrace();\n      throw new ServiceException("解析失败", e);\n    }\n  }\n\n  // 改后：中间层只补上下文，不记录\n  static void after() {\n    try {\n      step();\n    } catch (NumberFormatException e) {\n      throw new ServiceException("orderId=42 解析失败", e);\n    }\n  }\n\n  static void step() {\n    Integer.parseInt("abc");\n  }\n\n  public static void main(String[] args) {\n    // before();   // 放开这行可对比：一次失败会打印多份堆栈\n    try {\n      after();\n    } catch (ServiceException e) {\n      log.log(java.util.logging.Level.SEVERE,\n          "下单失败 orderId=42", e);\n    }\n  }\n}</pre><b>要点</b>：改前一次失败出现多份堆栈，改后只在最外层记录一次，信息反而更全——既有业务标识（orderId=42）又有完整 Caused by 链；中间层只做 <code>throw new XxxException("...", e)</code>；改完要确认异常类型没被吞成 RuntimeException 而丢失状态码映射。</div></details>',
        '列出你当前项目里最容易被吞掉的三个异常，分别给出改进方案，并说明改进后调用方需要做什么。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：能写出三处具体位置和改法，例如空 catch、只打印 message、catch 后 return null。<b>为什么</b>：吞异常会把错误变成「看起来正常的空值」，排查时没有堆栈，只能靠猜。<b>要点</b>：每处给出改前与改后两段代码，并写清「失败时调用方看到什么」；新增的处理要能被测试覆盖；用 IDE 的空 catch 警告或 Sonar 规则防止回归。</div></details>',
      ] },
      { note: '<b>练习提示：</b>第 2 题重点检查 cause 是否保留，打印时用 <code>e.getCause()</code> 验证；第 4 题注意异常对象的不可变性，尝试在 catch 里修改错误列表，看看是否会抛 UnsupportedOperationException。' }
    ]
  };

  T['generics'] = {
    meta: '本章约 5400 字 · 建议 45 分钟 · 6 个示例 · 3 张表格',
    blocks: [
      { h: '3.1 泛型是什么：从 Object 容器说起' },
      { p: '写程序时我们经常需要“装东西的盒子”：装字符串的列表、装整数的栈、以用户 ID 为键的缓存。如果每装一种类型就写一个类，ArrayListOfString、ArrayListOfInteger、ArrayListOfUser 会没完没了；如果只写一个能装 Object 的类，又会在取出时丢掉类型信息，必须强转，而强转是把错误从编译期推迟到了运行期。' },
      { p: '泛型（generics）解决的正是这个矛盾：只写一份代码，却能针对不同类型分别做编译期检查。你声明 <code>List&lt;String&gt;</code>，编译器就记住“这个列表只装字符串”，往里面放 Integer 会立刻报错；取出来时也不用强转，编译器知道类型就是 String。类型安全、代码复用、可读性，三件事一次拿到。' },
      { p: '在 Java 5 之前，标准库的容器装的都是 Object。add 方法接收 Object，get 方法返回 Object。因为所有引用类型都是 Object 的子类，所以什么都能放进去；但也正因为如此，编译器完全不知道你放的是什么、取的应该是什么。' },
      { lang: 'java', code: `public class ObjectBox {
    private Object value;

    public void set(Object value) {
        this.value = value;
    }

    public Object get() {
        return value;
    }

    public static void main(String[] args) {
        ObjectBox box = new ObjectBox();
        box.set("hello");
        String text = (String) box.get();
        System.out.println("取到: " + text);

        box.set(42);
        String wrong = (String) box.get();
        System.out.println(wrong);
    }
}`, title: 'ObjectBox.java' },
      { out: '取到: hello\nException in thread "main" java.lang.ClassCastException: class java.lang.Integer cannot be cast to class java.lang.String' },
      { p: '前一半运行正常，后一半在运行时爆炸。问题不在于强转本身，而在于编译器没有能力阻止你犯错：box 可以先装字符串、再装整数，而“取出时按 String 处理”这个假设只存在于程序员的脑子里，编译器看不到。只要有一个地方放错，错误就会在离现场很远的地方出现，堆栈指向的是强转那一行，而不是 set(42) 那一行。' },
      { p: 'Object 容器还有第二个问题：所有基本类型都要装箱。放一个 int 会变成 Integer，取出来再拆箱；频繁读写时既啰嗦又有性能开销。第三个问题是可读性：<code>Object get()</code> 不告诉你里面是什么，调用者只能去读文档或猜。泛型把这三个问题一起解决了。' },
      { table: { head: ['对比项', 'Object 容器', '泛型容器'], rows: [
        ['类型检查时机', '运行时强转才发现', '编译期就检查'],
        ['取出元素', '必须强转', '直接得到声明类型'],
        ['能否混装', '能，容易埋下隐患', '不能，编译直接拒绝'],
        ['基本类型', '必须装箱', '仍然装箱，但写法更自然'],
        ['可读性', '只看签名不知道装什么', '签名即文档']
      ] } },
      { p: '这一章会从“没有泛型的年代”讲起，依次介绍泛型类、泛型方法、有界类型参数、通配符和泛型接口。重点是理解“类型参数”是一个可以被约束、被推断、被替换的占位符，而不是死记 &lt;T&gt; 的写法。最后会解释几个新手最容易踩的编译错误，为下一章的类型擦除做铺垫。' },
      { h: '3.2 泛型类：把类型作为参数' },
      { p: '泛型类就是在类名后面声明一个或多个类型参数，然后在字段、方法参数、返回值里使用它。下面把 ObjectBox 改写成 Box&lt;T&gt;：T 是一个占位符，表示“某种引用类型”，具体是什么由创建对象时决定。' },
      { lang: 'java', code: `public class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T get() {
        return value;
    }

    public void set(T value) {
        this.value = value;
    }

    public static void main(String[] args) {
        Box<String> textBox = new Box<>("hello");
        String text = textBox.get();
        System.out.println(text.toUpperCase());

        Box<Integer> intBox = new Box<>(42);
        int number = intBox.get();
        System.out.println(number + 1);
    }
}`, title: 'Box.java' },
      { out: 'HELLO\n43' },
      { p: '创建 <code>Box&lt;String&gt;</code> 时，编译器把类里所有的 T 都替换成 String 来做类型检查：构造器只接受 String，get 返回 String，set 只接受 String。写 <code>textBox.set(42)</code> 会直接编译失败，错误信息是“incompatible types: int cannot be converted to String”。错误被提前到了编写阶段，而不是等到运行时强转。' },
      { p: '等号右边的 <code>new Box&lt;&gt;(\"hello\")</code> 用了钻石操作符，尖括号里留空，让编译器根据左边的声明和构造器实参推断类型参数。Java 7 之前必须写 <code>new Box&lt;String&gt;(\"hello\")</code>，两边都写一遍；现在留空更简洁，但左边一定要写清楚，否则推断可能不符合预期。' },
      { p: '类型参数不能是基本类型。写 <code>Box&lt;int&gt;</code> 编译失败，必须写 <code>Box&lt;Integer&gt;</code>，让编译器自动装箱。这不是泛型的缺陷，而是 Java 的类型系统决定的：泛型参数在运行时会被擦除成 Object 或其边界，而基本类型不是 Object 的子类。' },
      { p: '一个泛型可以声明多个类型参数，用逗号隔开，例如 <code>Map&lt;K, V&gt;</code>、<code>Pair&lt;L, R&gt;</code>。它们在类或方法内部都是独立的占位符，可以分别被替换成不同类型。声明顺序决定了使用时填写的顺序，所以不要把 K、V 的顺序记反。' },
      { list: [
        '<b>K / V：</b>键和值，常见于 Map、缓存、字典结构。',
        '<b>E：</b>元素，常见于 List、Set、Queue 等集合。',
        '<b>T：</b>通用类型，没有更具体语义时使用。',
        '<b>R：</b>返回值或结果类型，常见于函数式接口和转换器。',
        '<b>?：</b>不是类型参数，而是通配符，表示“某种未知类型”，下一节详细讲。'
      ] },
      { p: '多个类型参数之间可以有依赖关系，例如 <code>Mapper&lt;T, R&gt;</code> 表示“把 T 转成 R”。如果两个参数总是一起出现、且顺序固定，可以考虑封装成一个有意义的名字，而不是无限增加参数个数。类型参数超过三个时，可读性通常已经开始下降。' },
      { h: '3.3 泛型方法：类型参数属于方法' },
      { p: '泛型方法是在方法签名里声明自己的类型参数，位置在修饰符之后、返回类型之前，例如 <code>public static &lt;T&gt; T first(List&lt;T&gt; list)</code>。这个 T 只属于这个方法，和类上的 T 没有关系；即使类本身不是泛型类，方法也可以独立泛型化。' },
      { lang: 'java', code: `import java.util.List;

public class GenericMethod {
    static <T> T first(List<T> list) {
        if (list == null || list.isEmpty()) {
            throw new IllegalArgumentException("列表不能为空");
        }
        return list.get(0);
    }

    static <T> void swap(T[] array, int i, int j) {
        T temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    public static void main(String[] args) {
        List<String> names = List.of("Alice", "Bob");
        String name = first(names);
        System.out.println(name);

        Integer number = first(List.of(10, 20, 30));
        System.out.println(number + 5);

        String[] words = {"a", "b", "c"};
        swap(words, 0, 2);
        System.out.println(words[0] + words[1] + words[2]);
    }
}`, title: 'GenericMethod.java' },
      { out: 'Alice\n15\ncba' },
      { p: '调用 <code>first(names)</code> 时，编译器看到实参是 <code>List&lt;String&gt;</code>，就把 T 推断成 String，返回值也按 String 处理，所以可以直接赋给 String 变量。调用 <code>first(List.of(10, 20, 30))</code> 时，T 被推断成 Integer。同一个方法体，针对不同类型分别做了检查，这就是泛型方法的价值。' },
      { p: '类型推断不是万能的。如果实参之间互相矛盾，比如 <code>first(List.of(\"a\", 1))</code>，T 会被推断成共同父类 Object 或 Serializable，返回值也就变成 Object，失去精确类型。遇到推断不出来的情况，可以显式指定：<code>GenericMethod.&lt;String&gt;first(list)</code>，在方法名前面加尖括号。' },
      { p: '静态方法不能使用类上声明的类型参数。因为类的类型参数属于具体实例，而静态成员在类加载时就存在，此时还不知道 T 是什么。如果静态方法需要泛型，必须自己声明 <code>&lt;T&gt;</code>，这也是为什么集合工具类 <code>Collections</code> 的每个方法都带着自己的类型参数。' },
      { p: '还有一个容易混淆的点：<code>&lt;T&gt;</code> 写在返回值前面是“声明类型参数”，写在参数类型里是“使用类型参数”。漏写声明时，编译器会把 T 当成一个真实的类名，报“cannot find symbol: class T”。看到这个错误，先检查方法签名里有没有 &lt;T&gt;。' },
      { h: '3.4 有界类型参数：缩小 T 的范围' },
      { p: '默认情况下 T 可以是任何引用类型，所以方法体里只能调用 Object 的方法：equals、hashCode、toString。如果你想调用 compareTo，编译器不知道 T 有没有这个方法，就会报错。解决办法是给 T 加边界，用 <code>extends</code> 限定它必须是某个类型或其子类型。' },
      { lang: 'java', code: `import java.util.List;

public class BoundedMax {
    static <T extends Comparable<T>> T max(List<T> list) {
        if (list == null || list.isEmpty()) {
            throw new IllegalArgumentException("列表不能为空");
        }
        T best = list.get(0);
        for (T item : list) {
            if (item.compareTo(best) > 0) {
                best = item;
            }
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(max(List.of(3, 9, 2)));
        System.out.println(max(List.of("apple", "zoo", "bat")));
    }
}`, title: 'BoundedMax.java' },
      { out: '9\nzoo' },
      { p: '<code>T extends Comparable&lt;T&gt;</code> 读作“T 必须是 Comparable&lt;T&gt; 的子类型”。Integer、String、LocalDate 都实现了 Comparable，所以可以作为 T；一个没有实现 Comparable 的自定义类传进来，编译直接失败。有了这个边界，方法体里调用 <code>item.compareTo(best)</code> 才是合法的。' },
      { p: '边界可以是类，也可以是接口，但关键字统一用 extends，不能用 implements。例如 <code>&lt;T extends Number&gt;</code> 表示 T 是 Number 或它的子类，此时可以调用 intValue、doubleValue；<code>&lt;T extends CharSequence&gt;</code> 表示可以调用 length、charAt。多个边界用 &amp; 连接，例如 <code>&lt;T extends Number &amp; Comparable&lt;T&gt;&gt;</code>，其中类必须写在第一个。' },
      { p: '边界不仅约束调用者，也决定了擦除后的类型。编译器在方法体里检查成员时，用的是边界类型；运行时类型参数被擦除后，也会被替换成边界类型。这一点在下一章讲擦除时会展开，这里先记住：<b>边界越窄，方法体能用的能力越多，但能接受的类型越少。</b>' },
      { note: '<b>进阶提示：</b><code>Comparable&lt;T&gt;</code> 对子类不太友好，实际类库中常写成 <code>&lt;T extends Comparable&lt;? super T&gt;&gt;</code>，允许父类的比较器用于子类。初学阶段先用 <code>Comparable&lt;T&gt;</code> 理解边界，等遇到真实类型不匹配时再回头调整。' },
      { h: '3.5 通配符：? extends 与 ? super' },
      { p: '泛型是不协变的：<code>List&lt;String&gt;</code> 不是 <code>List&lt;Object&gt;</code> 的子类型。也就是说，一个接收 <code>List&lt;Object&gt;</code> 的方法，不能传入 <code>List&lt;String&gt;</code>，哪怕 String 是 Object 的子类。原因很直白：如果允许，方法里往列表 add 一个 Object（比如 Integer），原来的 List&lt;String> 就被污染了。' },
      { p: '但很多时候我们确实想写一个“能接受各种元素类型”的方法，比如打印任意列表、求任意数字列表的和。这时用通配符：<code>List&lt;?&gt;</code> 表示未知类型的列表，<code>List&lt;? extends Number&gt;</code> 表示“元素是 Number 或其子类”的列表，<code>List&lt;? super Integer&gt;</code> 表示“元素是 Integer 或其父类”的列表。' },
      { table: { head: ['写法', '含义', '能读吗', '能写吗', '典型场景'], rows: [
        ['<code>List&lt;?&gt;</code>', '任意元素类型', '能，读成 Object', '不能（null 除外）', '只读遍历、打印'],
        ['<code>List&lt;? extends Number&gt;</code>', '元素是 Number 子类', '能，读成 Number', '不能', '求和、统计等生产者'],
        ['<code>List&lt;? super Integer&gt;</code>', '元素是 Integer 父类', '能，读成 Object', '能写入 Integer', '收集结果等消费者'],
        ['<code>List&lt;Integer&gt;</code>', '精确为 Integer', '能，读成 Integer', '能写入 Integer', '明确类型时']
      ] } },
      { p: '为什么 <code>? extends</code> 不能写？假设 <code>List&lt;? extends Number&gt;</code> 实际指向 <code>List&lt;Integer&gt;</code>，你往里 add 一个 Double，编译器如果允许，Integer 列表里就混进了 Double。所以编译器干脆禁止写入，只允许读，而且读出来的静态类型是上界 Number。<code>? super</code> 相反：实际可能是 <code>List&lt;Object&gt;</code>，写入 Integer 一定安全；但读出来时编译器只知道是 Object，因为实际元素可能是 Object、Number 或 Integer 的任意一种。' },
      { p: '这就是 PECS 原则：<b>Producer Extends，Consumer Super。</b>如果参数是“提供数据”的生产者（你从里面读），用 <code>? extends T</code>；如果参数是“接收数据”的消费者（你往里面写），用 <code>? super T</code>；如果既要读又要写，那就不要用通配符，直接用精确类型 T。' },
      { h: '3.6 通配符实战：一个 copy 方法' },
      { p: 'JDK 的 <code>Collections.copy</code> 是 PECS 的经典应用：它把源列表的元素复制到目标列表。源只需要读，所以用 <code>? extends T</code>；目标只需要写，所以用 <code>? super T</code>。这样源可以是 Integer 列表，目标可以是 Object 列表，只要元素类型兼容即可。' },
      { lang: 'java', code: `import java.util.ArrayList;
import java.util.List;

public class WildcardDemo {
    static void printAll(List<?> list) {
        for (Object item : list) {
            System.out.print(item + " ");
        }
        System.out.println();
    }

    static double sum(List<? extends Number> list) {
        double total = 0;
        for (Number number : list) {
            total += number.doubleValue();
        }
        return total;
    }

    static <T> void copy(List<? super T> dest, List<? extends T> src) {
        for (T item : src) {
            dest.add(item);
        }
    }

    public static void main(String[] args) {
        List<Integer> numbers = List.of(1, 2, 3);
        List<Object> objects = new ArrayList<>();
        copy(objects, numbers);
        printAll(objects);
        System.out.println(sum(numbers));
    }
}`, title: 'WildcardDemo.java' },
      { out: '1 2 3 \n6.0' },
      { p: 'copy 的类型参数 T 由两个实参共同推断：src 是 <code>List&lt;Integer&gt;</code>，满足 <code>? extends T</code>；dest 是 <code>List&lt;Object&gt;</code>，满足 <code>? super T</code>。编译器推出 T 是 Integer，于是 dest.add(item) 的 item 是 Integer，可以安全地放进 List&lt;Object&gt;。如果 dest 是 <code>List&lt;String&gt;</code>，推断失败，编译报错。' },
      { p: 'printAll 用 <code>List&lt;?&gt;</code> 而不是 <code>List&lt;Object&gt;</code>，因为后者不接受 <code>List&lt;String&gt;</code>。方法体里 item 的静态类型是 Object，只能调用 Object 的方法；如果确实需要 T 的类型，就不要用通配符，改成泛型方法 <code>&lt;T&gt; void printAll(List&lt;T&gt; list)</code>。' },
      { p: 'sum 用 <code>? extends Number</code>，所以既能接受 <code>List&lt;Integer&gt;</code>，也能接受 <code>List&lt;Double&gt;</code>、<code>List&lt;Long&gt;</code>。方法体里把元素读成 Number，调用 doubleValue 求和。注意返回值是 double 而不是 T：通配符方法通常不返回具体类型，因为 T 对调用者是不可见的。' },
      { p: '通配符还有一个“捕获”的概念：编译器在处理 <code>List&lt;?&gt;</code> 时，会在内部给它一个临时名字，允许你把元素取出来赋给 Object，但不允许写回。如果需要在方法内部对元素做多次操作，可以写一个私有辅助方法 <code>private static &lt;T&gt; void helper(List&lt;T&gt; list)</code>，让通配符方法把参数转交给它，这就是“通配符捕获”的常用手法。' },
      { h: '3.7 泛型接口与实现' },
      { p: '接口也可以声明类型参数，最常见的例子是 <code>Comparable&lt;T&gt;</code>、<code>Comparator&lt;T&gt;</code>、<code>Function&lt;T, R&gt;</code>。实现泛型接口时有两种方式：一种是固定类型，例如 <code>class User implements Comparable&lt;User&gt;</code>；另一种是继续把类型参数传下去，例如 <code>class Box&lt;T&gt; implements Comparable&lt;Box&lt;T&gt;&gt;</code>。' },
      { lang: 'java', code: `interface Mapper<T, R> {
    R map(T value);
}

public class GenericInterface {
    public static void main(String[] args) {
        Mapper<String, Integer> length = new Mapper<String, Integer>() {
            public Integer map(String value) {
                return value.length();
            }
        };
        System.out.println(length.map("hello"));

        Mapper<String, String> upper = value -> value.toUpperCase();
        System.out.println(upper.map("java"));
    }
}`, title: 'GenericInterface.java' },
      { out: '5\nJAVA' },
      { p: 'Mapper 声明了两个类型参数：输入 T、输出 R。第一个实现用匿名类，明确写出 String 和 Integer；第二个实现用 lambda，因为 Mapper 只有一个抽象方法，编译器能根据左边的 <code>Mapper&lt;String, String&gt;</code> 推断参数和返回值类型。lambda 本身不声明类型，它依赖目标类型，这也是泛型接口和函数式编程的连接点。' },
      { p: '实现泛型接口时，如果子类不指定类型参数，就必须继续声明它。例如 <code>class StringMapper implements Mapper&lt;String, Integer&gt;</code> 是固定类型；<code>class GenericMapper&lt;A, B&gt; implements Mapper&lt;A, B&gt;</code> 则把参数继续传递。忘记声明会导致“cannot find symbol”或“type argument required”的错误。' },
      { p: '泛型接口还常用于定义契约，例如 <code>Repository&lt;T, ID&gt;</code>、<code>Converter&lt;S, T&gt;</code>。接口本身不关心具体类型，实现类再绑定。这样一套 CRUD 逻辑可以复用到多个实体上，同时保留类型检查。设计时要注意：类型参数越多，使用成本越高，两个通常足够。' },
      { h: '3.8 类型推断与钻石操作符' },
      { p: 'Java 的泛型调用大量依赖类型推断：你写 <code>List&lt;String&gt; list = new ArrayList&lt;&gt;()</code>，编译器根据左边推断出 ArrayList 的类型参数是 String；你写 <code>max(List.of(3, 9, 2))</code>，编译器根据实参推断 T 是 Integer。理解推断过程，能解释很多“为什么这里编译不过”的问题。' },
      { flow: ['收集实参的静态类型', '与形参的泛型结构匹配', '推导类型变量的候选值', '用边界检查候选值是否合法', '确定最终类型并检查方法体调用'] },
      { p: '推断失败时，编译器不会“猜一个能通过的”，而是直接报错。例如 <code>List&lt;Number&gt; list = new ArrayList&lt;Integer&gt;()</code> 是错的，因为泛型不协变；<code>max(List.of())</code> 也可能推断不出 T，因为空列表没有元素类型信息。这时可以显式指定：<code>BoundedMax.&lt;Integer&gt;max(list)</code>，或者给变量加上类型。' },
      { p: '钻石操作符不能用在所有地方。匿名内部类在 Java 9 之前不支持钻石；<code>new T()</code> 永远不允许，因为擦除后不知道 T 的构造器；数组创建 <code>new T[10]</code> 也不允许。写 <code>new ArrayList&lt;&gt;()</code> 时，如果左边是 var，推断可能得到 <code>ArrayList&lt;Object&gt;</code>，反而丢失类型，所以 var 和钻石一起用要谨慎。' },
      { p: '目标类型推断还影响 lambda 和方法引用。同一个 lambda 写在不同的赋值上下文里，可能被推断成不同的函数式接口。如果编译器报“cannot infer type”，先检查目标类型是否明确；把 lambda 赋给一个带泛型参数的变量，通常比直接作为实参更容易通过。' },
      { h: '3.9 泛型不能做的六件事' },
      { p: '泛型的很多限制都来自同一个事实：类型参数在运行时被擦除。编译器在编译期知道 T 是什么，但生成的字节码里没有 T，只有 Object 或它的边界。因此任何“需要在运行时知道 T”的操作都不被允许。下面这张表是新手最常遇到的编译错误。' },
      { table: { head: ['写法', '结果', '原因'], rows: [
        ['<code>new T()</code>', '编译错误', '擦除后不知道 T 的构造器'],
        ['<code>new T[10]</code>', '编译错误', '运行时没有 T 的类型信息'],
        ['<code>static T field;</code>', '编译错误', '静态成员属于类，T 属于实例'],
        ['<code>obj instanceof List&lt;String&gt;</code>', '编译错误', '运行时类型参数已被擦除'],
        ['<code>List&lt;int&gt;</code>', '编译错误', '类型参数必须是引用类型'],
        ['<code>catch (T e)</code>', '编译错误', '不能捕获类型变量']
      ] } },
      { p: '这些限制不是靠“换个写法”就能绕过的，但大多数都有替代方案。需要创建对象时，传一个 <code>Supplier&lt;T&gt;</code> 或 <code>Class&lt;T&gt;</code>；需要数组时，传一个 <code>IntFunction&lt;T[]&gt;</code> 或使用 <code>Object[]</code> 加注解；需要判断类型时，用 <code>Class&lt;T&gt;</code> 的 isInstance；需要静态泛型方法时，在方法上单独声明 &lt;T&gt;。' },
      { p: '还有两个容易忽视的点。第一，泛型类不能继承 Throwable，所以不存在 <code>class MyException&lt;T&gt; extends Exception</code>，异常类型必须在编译期确定。第二，泛型可变参数会产生“unchecked generic array creation”警告，因为可变参数在底层是数组；如果方法确定类型安全，可以加 <code>@SafeVarargs</code>，但它只能用在 static、final 或 private 方法上。' },
      { note: '<b>不要用原始类型：</b>写 <code>List list = new ArrayList()</code> 会关闭泛型检查，编译器只给一条警告，之后所有 add/get 都退化成 Object。除非对接遗留代码，否则永远写 <code>List&lt;String&gt;</code>，哪怕暂时不知道类型，也可以用 <code>List&lt;?&gt;</code>。' },
      { h: '3.10 常见错误清单' },
      { list: [
        '<b>把 List&lt;String&gt; 传给 List&lt;Object&gt;：</b>泛型不协变，编译失败。改用 <code>List&lt;? extends Object&gt;</code> 或泛型方法。',
        '<b>向 &lt;? extends&gt; 写入：</b>编译器禁止，因为实际类型可能是更窄的子类。生产者只读，消费者才写。',
        '<b>从 &lt;? super&gt; 读出具体类型：</b>只能读成 Object，因为实际类型可能是父类。需要具体类型就不要用 super。',
        '<b>泛型方法漏写 &lt;T&gt;：</b>编译器把 T 当类名，报 cannot find symbol。检查方法签名。',
        '<b>静态方法使用类的 T：</b>静态上下文没有实例类型参数，必须在方法上重新声明。',
        '<b>用基本类型作参数：</b><code>List&lt;int&gt;</code> 非法，用 Integer；自动装箱会处理转换。',
        '<b>用 == 比较泛型对象：</b>和普通对象一样，== 比较引用，类型参数不会改变这一点，比较内容用 equals。',
        '<b>在异常类上加泛型：</b>不允许，Throwable 的子类不能是泛型类。'
      ] },
      { p: '排查泛型编译错误时，有一个实用技巧：先看错误信息里的“required type”和“found type”，它们会告诉你编译器期望什么、实际拿到了什么；再看方法签名里的类型参数是否被正确推断。很多看起来很玄的错误，其实只是某处用了原始类型，导致整个表达式退化成 Object。' },
      { p: '还有一个常被忽略的细节：泛型类型不能出现在某些需要“运行时具体类型”的位置。例如不能创建泛型数组 <code>new List&lt;String&gt;[10]</code>，不能写 <code>catch (MyException&lt;String&gt; e)</code>，也不能在静态块里引用类的类型参数。原因仍然是擦除：这些操作都要求运行时知道具体类型，而运行时只剩下列表接口和 Object。遇到限制时，优先用集合代替数组、用 <code>Class&lt;T&gt;</code> 传递类型、用工厂方法创建实例，而不是用强制转换强行绕过编译器。' },
      { list: [
        '<b>先精确后放宽。</b>方法内部先按精确类型 T 写，确认调用方确实需要接受更宽的类型时，再把参数改成通配符。',
        '<b>参数用通配符，返回值用具体类型。</b>返回值出现 &lt;? extends T&gt; 会让调用者拿不到可用类型，通常得不偿失。',
        '<b>不要让类型参数出现在无关的位置。</b>如果一个 T 只在一个参数里出现一次，用通配符就够了，不必声明类型变量。',
        '<b>为调用者保留显式指定的入口。</b>当推断可能失败时，调用者应能写 <code>Util.&lt;String&gt;method(...)</code> 强制指定。'
      ] },
      { p: '最后提醒一点：泛型的主要价值是可读性和编译期安全，不是“炫技”。如果一个方法的签名复杂到需要读三遍才能明白，通常说明类型参数或通配符用多了。先把类型关系写清楚，再考虑放宽；能用一个 T 表达的关系，不要拆成三个通配符。' },
      { h: '3.11 本章小结' },
      { list: [
        '泛型把类型作为参数，让同一份代码在不同类型上复用，并把类型检查提前到编译期。',
        '泛型类在类名后声明类型参数；泛型方法在返回类型前声明，静态方法必须自己声明。',
        '类型参数只能是引用类型；多个参数用逗号分隔，命名遵循 T、E、K、V、R 的习惯。',
        '有界类型参数用 extends 缩小范围，边界决定了方法体能调用哪些成员。',
        '泛型不协变，通配符用于放宽参数类型；PECS：生产者用 extends，消费者用 super。',
        '类型推断根据实参和目标类型推导 T，推断失败时可以显式指定类型。',
        '擦除导致不能 new T、不能泛型数组、不能 instanceof 具体泛型、不能捕获 T。'
      ] },
      { h: '3.12 常见追问' },
      { list: [
        '<b>问：泛型和 C++ 模板有什么区别？</b><br>答：C++ 模板在编译期为每种类型生成一份代码，属于膨胀式实例化，类型在运行期是真实存在的；Java 泛型在编译后擦除，<code>List&lt;String&gt;</code> 和 <code>List&lt;Integer&gt;</code> 共用同一份字节码，靠编译期检查和插入强转保证安全。代价是运行时拿不到实参，所以不能 new T、不能创建泛型数组、不能按泛型参数重载；好处是二进制兼容、类文件不膨胀，代价还包括基本类型仍然要装箱。',
        '<b>问：为什么 List&lt;String&gt; 不能赋给 List&lt;Object&gt;？</b><br>答：因为后者允许 add(Object)，如果前者被当成后者使用，就能往字符串列表里塞整数。数组是协变的，所以 Java 用运行时 ArrayStoreException 兜底；泛型选择在编译期直接禁止，用「不协变」换取零运行时开销。需要放宽时用通配符：只读给 <code>List&lt;? extends Object&gt;</code>，只写给 <code>List&lt;? super String&gt;</code>，两个方向都不允许越界。',
        '<b>问：&lt;T extends X&gt; 和 &lt;? extends X&gt; 有什么区别？</b><br>答：前者声明一个类型变量，可以在参数、返回值、方法体之间复用同一个 T，也能调用 X 的方法；后者是通配符，只描述「某种未知子类型」，不能用于声明返回值类型，也不能写入（编译器不知道真实子类型）。经验法则是：类型只出现一次且只读，用通配符；需要在多处建立「同一个类型」的关系，用类型变量。返回类型上尽量给具体类型，别让调用者拿到 <code>? extends T</code>。',
        '<b>问：什么时候用泛型方法，什么时候用通配符？</b><br>答：如果类型只出现在一个参数里、方法也不返回它，用通配符更灵活，调用方不必被迫推断；如果类型要在多个参数或返回值之间建立关系（例如 <code>map(Function&lt;T, R&gt;)</code>、<code>transfer(List&lt;T&gt;, List&lt;T&gt;)</code>），必须用类型变量。判断方法很直接：把参数里的 T 全换成 <code>&lt;?&gt;</code>，如果编译不过或者返回值不可用，说明你需要类型变量。',
        '<b>问：泛型会不会影响性能？</b><br>答：不会带来运行时类型检查的开销，因为类型被擦除，字节码里只有必要的 checkcast，接近一次普通强转。真正的成本是装箱：<code>List&lt;Integer&gt;</code> 存基本类型值要装箱，循环里会持续产生小对象；这种场景改用 <code>IntStream</code>、<code>int[]</code> 或专用容器更快。另外泛型不改变算法复杂度，别指望把 Object 容器换成泛型容器就变快。',
        '<b>问：原始类型和 &lt;?&gt; 有什么区别？</b><br>答：原始类型（<code>List list</code>）完全关闭泛型检查，所有元素退化成 Object，add 什么都能过，编译器只给一条 unchecked 警告；<code>List&lt;?&gt;</code> 保留「这是泛型容器」的信息，只是不知道具体类型，仍然禁止写入（null 除外），读取只能当 Object。所以前者是危险地关掉检查，后者是安全地不关心元素类型。只有对接遗留代码才用原始类型，并且把警告范围缩到最小。',
      ] },
      { h: '3.13 自测与练习' },
      { p: '练习时先预测编译器会不会报错，再实际编译。能准确判断「哪一行失败、为什么」，说明你已经掌握泛型的检查规则。' },
      { ol: [
        '把 ObjectBox 改写成 Pair&lt;A, B&gt;，保存两个值，提供 getFirst、getSecond 和 swap 方法。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class Pairs {\n\n  static final class Pair&lt;A, B> {\n    private final A first;\n    private final B second;\n\n    Pair(A first, B second) {\n      this.first = first;\n      this.second = second;\n    }\n\n    A getFirst() { return first; }\n    B getSecond() { return second; }\n\n    Pair&lt;B, A> swap() {\n      return new Pair&lt;>(second, first);\n    }\n\n    @Override\n    public String toString() {\n      return "(" + first + ", " + second + ")";\n    }\n  }\n\n  public static void main(String[] args) {\n    Pair&lt;String, Integer> p = new Pair&lt;>("a", 1);\n    Pair&lt;Integer, String> q = p.swap();\n    System.out.println(q.getFirst() + 1);\n    System.out.println(q.getSecond());\n    System.out.println(p);\n  }\n}</pre><b>要点</b>：swap 的返回类型必须写成 <code>Pair&lt;B, A&gt;</code>，写成 <code>Pair&lt;A, B&gt;</code> 编译不过；字段 private final，钻石操作符靠目标类型推断，<code>var p = new Pair&lt;&gt;(1, "a")</code> 也能推出来；swap 返回新对象，原 Pair 不变——不可变类里没有原地交换这回事。</div></details>',
        '写一个泛型方法 countIf，接收 List&lt;T&gt; 和 Predicate&lt;T&gt;，返回满足条件的元素个数。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.List;\nimport java.util.function.Predicate;\n\npublic class CountIf {\n\n  static &lt;T> long countIf(List&lt;T> list, Predicate&lt;T> p) {\n    long n = 0;\n    for (T t : list) {\n      if (p.test(t)) {\n        n++;\n      }\n    }\n    return n;\n  }\n\n  public static void main(String[] args) {\n    List&lt;Integer> nums = List.of(1, 2, 3, 4);\n    System.out.println(countIf(nums, n -> n % 2 == 0));\n    System.out.println(countIf(\n        List.of("ab", "c", "de"), s -> s.length() == 2));\n  }\n}</pre><b>要点</b>：方法签名上的 <code>&lt;T&gt;</code> 不能漏，漏了编译器把 T 当类名报 cannot find symbol；用一个 T 把 List 与 Predicate 绑在一起，Lambda 的参数类型由目标类型推断；想更灵活可写成 <code>List&lt;? extends T&gt;</code>。</div></details>',
        '写一个方法接收 List&lt;? extends Number&gt;，返回最大值；再写一个方法接收 List&lt;? super Integer&gt;，把 1 到 10 填进去。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\npublic class Bounded {\n\n  static Number max(List&lt;? extends Number> list) {\n    if (list.isEmpty()) {\n      return null;\n    }\n    Number hit = null;\n    double best = Double.NEGATIVE_INFINITY;\n    for (Number n : list) {        // extends：只能读\n      if (n.doubleValue() > best) {\n        best = n.doubleValue();\n        hit = n;\n      }\n    }\n    return hit;\n  }\n\n  static void fill(List&lt;? super Integer> dst) {\n    for (int i = 1; i &lt;= 10; i++) {  // super：只能写\n      dst.add(i);\n    }\n  }\n\n  public static void main(String[] args) {\n    System.out.println(max(List.of(3, 9, 2)));\n    System.out.println(max(List.of(1.5, 2.5)));\n    List&lt;Number> box = new ArrayList&lt;>();\n    fill(box);\n    System.out.println(box.size() + " " + box.get(9));\n  }\n}</pre><b>要点</b>：PECS——<code>? extends</code> 是生产者只能读，<code>? super</code> 是消费者只能写；往 extends 列表 add 会编译失败，从 super 列表读只能得到 Object；比较统一走 doubleValue()，空列表返回什么要提前在签名上定下来。</div></details>',
        '实现 PECS 版本的 transfer 方法，把源列表的元素移动到目标列表，并解释两个参数为什么一个用 extends、一个用 super。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\npublic class Transfer {\n\n  static &lt;T> void transfer(List&lt;? extends T> src,\n      List&lt;? super T> dst) {\n    for (T t : src) {\n      dst.add(t);\n    }\n    src.clear();\n  }\n\n  public static void main(String[] args) {\n    List&lt;Integer> src = new ArrayList&lt;>(List.of(1, 2, 3));\n    List&lt;Number> dst = new ArrayList&lt;>();\n    transfer(src, dst);\n    System.out.println(dst + " src=" + src);\n\n    // src 与 dst 是同一个列表时不能边遍历边删\n    List&lt;Integer> self = new ArrayList&lt;>(List.of(7, 8));\n    transfer(new ArrayList&lt;>(self), self);\n    System.out.println(self);\n  }\n}</pre><b>要点</b>：源只读所以 <code>List&lt;? extends T&gt;</code>，目标只写所以 <code>List&lt;? super T&gt;</code>，T 由两侧共同推断；两边都写死 <code>List&lt;T&gt;</code> 时 <code>List&lt;Integer&gt;</code> 传给 <code>List&lt;Number&gt;</code> 报 incompatible types；实现里不能往 src 写、也不能从 dst 读具体类型。</div></details>',
        '写一个泛型接口 Transformer&lt;T, R&gt;，分别用匿名类和 lambda 实现「字符串转长度」。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class Transform {\n\n  @FunctionalInterface\n  interface Transformer&lt;T, R> {\n    R apply(T t);\n\n    default String describe() {\n      return "Transformer";\n    }\n  }\n\n  public static void main(String[] args) {\n    Transformer&lt;String, Integer> anon =\n        new Transformer&lt;String, Integer>() {\n          @Override\n          public Integer apply(String s) {\n            return s.length();\n          }\n        };\n\n    Transformer&lt;String, Integer> lambda = s -> s.length();\n    Transformer&lt;String, Integer> ref = String::length;\n\n    System.out.println(anon.apply("hello"));\n    System.out.println(lambda.apply("hello"));\n    System.out.println(ref.apply("hello"));\n  }\n}</pre><b>要点</b>：接口只有 apply 一个抽象方法，Lambda 与方法引用才能当它的实现；<code>@FunctionalInterface</code> 让编译器守住这个前提，同时允许 default 与 static 方法共存；一旦再加一个抽象方法，Lambda 立刻编译不过，只能退回匿名类。</div></details>',
        '找出下面代码的编译错误并修正：<code>List&lt;Object&gt; list = new ArrayList&lt;String&gt;(); list.add(1);</code>\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\npublic class Fix {\n\n  public static void main(String[] args) {\n    // 错误：泛型不协变，右边元素类型是 String\n    // List&lt;Object> bad = new ArrayList&lt;String>();\n\n    // 改法一：两边都按 Object 说明\n    List&lt;Object> a = new ArrayList&lt;>();\n    a.add(1);\n    a.add("x");\n    System.out.println(a);\n\n    // 改法二：只读遍历时用 List&lt;?>\n    List&lt;?> b = new ArrayList&lt;String>(List.of("s"));\n    for (Object o : b) {\n      System.out.println(o);\n    }\n    // b.add("y");   // ? 只读不写，编译不过\n  }\n}</pre><b>要点</b>：报 incompatible types 是因为泛型不协变，<code>List&lt;String&gt;</code> 不是 <code>List&lt;Object&gt;</code> 的子类型；改成 <code>List&lt;? extends Object&gt;</code> 后 <code>list.add(1)</code> 又会报错，因为 extends 通配符只读不写；不要用原始类型把错误「修」掉，那只是把检查推迟到运行期。</div></details>',
      ] },
      { note: '<b>练习提示：</b>第 3 题的两个方法分别对应生产者和消费者；第 6 题要说明「泛型不协变」和「通配符不能写」两个原因，改法可以用 <code>List&lt;? super String&gt;</code> 或直接改成 <code>List&lt;Object&gt;</code>。' }
    ]
  };

  T['erasure'] = {
    meta: '本章约 5400 字 · 建议 40 分钟 · 4 个示例 · 3 张表格',
    blocks: [
      { h: '4.1 擦除是什么，为什么要有它' },
      { p: '上一章我们写了很多尖括号，编译器检查得不亦乐乎。但如果你在运行时打印 <code>new ArrayList&lt;String&gt;().getClass()</code> 和 <code>new ArrayList&lt;Integer&gt;().getClass()</code>，会发现两者完全一样，都是 <code>java.util.ArrayList</code>。尖括号里的 String 和 Integer 在运行时消失了。这不是 JVM 的 bug，而是 Java 泛型的实现方式：类型擦除。' },
      { p: '理解擦除非常重要，因为它是很多“诡异”现象的根源：为什么不能 <code>new T()</code>，为什么不能创建泛型数组，为什么 <code>instanceof List&lt;String&gt;</code> 编译不过，为什么两个只有泛型参数不同的方法不能重载，为什么反射拿不到 <code>List&lt;String&gt;</code> 里的 String。背下这些规则不难，难的是知道它们都指向同一个机制。' },
      { p: 'Java 5 引入泛型时，面临一个硬约束：必须让新代码能调用老代码，老代码也能调用新代码。如果 JVM 层面真的支持泛型，老版本的类库、字节码、反射 API 都要改，迁移成本巨大。擦除是一个折中：泛型只存在于编译期，字节码层面保持和 Java 4 兼容。' },
      { p: '这个折中换来了平滑迁移，也留下了三个长期代价。第一，运行时拿不到泛型实参，框架不得不发明 TypeToken、Class&lt;T&gt; 等补丁。第二，不能为泛型做专门优化，基本类型仍然装箱。第三，一些在其他语言里很自然的写法（泛型数组、<code>new T()</code>、按泛型重载）在 Java 里不可用。' },
      { p: '对比来看，C# 的泛型在运行时是具体化的，<code>List&lt;int&gt;</code> 和 <code>List&lt;string&gt;</code> 是不同的类型，也不会有擦除带来的限制；C++ 模板则在编译期为每种类型生成代码。Java 选择了兼容性优先，这个选择到今天仍在影响我们写代码的方式。' },
      { p: '这一章会先讲擦除的规则，再看擦除后的字节码等价形式，然后解释桥接方法、堆污染和 TypeToken 这些进阶话题。学完之后，你应该能判断一段泛型代码在运行时到底长什么样，以及什么时候必须把类型信息“额外带在身上”。' },
      { h: '4.2 擦除的三条规则与擦除后的样子' },
      { p: '类型擦除发生在编译期。编译器检查完泛型约束后，会把类型参数替换成它的上界；如果没有上界，就替换成 Object。同时，所有对类型参数的操作都会插入必要的强制转换，保证字节码在运行时仍然能拿到正确的类型。' },
      { table: { head: ['源码中的声明', '擦除后的形式', '说明'], rows: [
        ['<code>T</code>', '<code>Object</code>', '无界类型参数，上界是 Object'],
        ['<code>T extends Number</code>', '<code>Number</code>', '有界类型参数，替换成上界'],
        ['<code>T extends A &amp; B</code>', '<code>A</code>', '多个边界时取第一个，B 只用于编译期检查'],
        ['<code>List&lt;String&gt;</code>', '<code>List</code>', '泛型类型擦除为原始类型'],
        ['<code>Map&lt;K, V&gt;</code>', '<code>Map</code>', '多个类型参数各自擦除'],
        ['<code>T[]</code>', '<code>Object[]</code> 或上界数组', '数组的类型也随 T 擦除']
      ] } },
      { p: '擦除不只发生在变量声明上，也发生在方法签名、字段类型、父类声明上。比如 <code>class StringBox extends Box&lt;String&gt;</code>，编译后父类就是 <code>Box</code>，Box 里的 T 被擦成 Object；编译器在 StringBox 的 get 方法里插入 <code>(String)</code> 强转，调用者才能直接拿到 String。' },
      { p: '字段、方法参数、返回值、局部变量上的泛型都会被擦除，但擦除的程度不同。字段和方法签名会保留一份 Signature 属性，记录“声明时的泛型”，供反射读取；局部变量只影响编译期检查和调试信息，不会进入可执行逻辑。理解这个差别，就不会困惑“为什么反射能读到字段的 List&lt;String&gt;，却读不到局部变量的”。' },
      { p: '擦除之后，泛型类型之间不再有区别：<code>List&lt;String&gt;</code>、<code>List&lt;Integer&gt;</code>、<code>List&lt;User&gt;</code> 在运行时都是 List。编译器知道它们的区别，JVM 不知道。所有“需要运行时知道具体类型”的操作，因此都无法直接支持。' },
      { p: '看一个最简单的例子。Box&lt;T&gt; 里有一个 T 类型的字段和一个返回 T 的方法。擦除后，字段变成 Object，get 返回 Object；调用方拿到返回值时，编译器会自动插入强转。下面这段代码在运行时打印出的类名，会让你直观看到“泛型不进入运行时”。' },
      { lang: 'java', code: `import java.util.ArrayList;
import java.util.List;

public class ErasureDemo {
    static class Box<T> {
        private T value;

        Box(T value) {
            this.value = value;
        }

        T get() {
            return value;
        }
    }

    public static void main(String[] args) {
        Box<String> text = new Box<>("hello");
        Box<Integer> number = new Box<>(42);
        System.out.println(text.getClass() == number.getClass());
        System.out.println(text.getClass().getName());

        List<String> strings = new ArrayList<>();
        List<Integer> integers = new ArrayList<>();
        System.out.println(strings.getClass() == integers.getClass());
    }
}`, title: 'ErasureDemo.java' },
      { out: 'true\nErasureDemo$Box\ntrue' },
      { p: '两次比较都返回 true。Box&lt;String&gt; 和 Box&lt;Integer&gt; 是同一个类，List&lt;String&gt; 和 List&lt;Integer&gt; 也是同一个类。运行时的对象里没有“我是 Box&lt;String&gt;”这样的标记，只有一个普通的 Box 实例，字段是 Object。' },
      { flow: ['源码声明 Box<String>', '编译器检查类型约束', '擦除类型参数为 Object', '在取值处插入 (String) 强转', '生成普通字节码', '运行时只看到 Box 和 Object'] },
      { p: '这也解释了为什么泛型代码能和 Java 5 之前的老代码共存：老代码看到的就是 Box 和 Object，新代码看到的尖括号只存在于编译期。代价是 JVM 无法为泛型做专门优化，也无法在运行时检查泛型实参。' },
      { h: '4.3 擦除带来的直接后果' },
      { p: '第一，不能创建类型参数的实例：<code>new T()</code> 编译失败。擦除后 T 是 Object，Object 没有无参构造器这个概念，编译器无法生成 new 指令。需要实例时，传一个 <code>Supplier&lt;T&gt;</code>、<code>Function&lt;X, T&gt;</code> 或 <code>Class&lt;T&gt;</code>，由调用方提供构造方式。' },
      { p: '第二，不能创建泛型数组：<code>new T[10]</code>、<code>new List&lt;String&gt;[10]</code> 都编译失败。数组在运行时需要知道元素类型，以便做 ArrayStoreException 检查；而 T 已经被擦除，JVM 不知道该分配什么类型的数组。可以用 <code>(T[]) new Object[n]</code> 强转，但会产生 unchecked 警告，而且把数组暴露给外部时可能堆污染。' },
      { p: '第三，不能对泛型类型做 instanceof：<code>obj instanceof List&lt;String&gt;</code> 编译失败，因为运行时没有 String 这个信息。可以写 <code>obj instanceof List&lt;?&gt;</code>，无界通配符是“可具体化”的；也可以先用 <code>obj instanceof List</code> 判断是列表，再逐个元素用 <code>instanceof String</code> 检查。' },
      { p: '第四，静态成员不能引用类的类型参数：<code>static T value;</code> 或 <code>static T create()</code> 编译失败。静态成员在类加载时就存在，而 T 要等创建实例时才确定；如果允许，同一个类的不同实例会共享一个“不知道具体类型”的静态字段。静态方法需要泛型时，必须在方法自己身上声明 &lt;T&gt;。' },
      { p: '下面的代码无法通过编译：<code>void print(List&lt;String&gt; list)</code> 和 <code>void print(List&lt;Integer&gt; list)</code>。原因很直接：两个方法擦除后都是 <code>void print(List)</code>，签名完全相同，JVM 无法区分该调用哪一个。编译器报的错误是“name clash: print(List&lt;String&gt;) and print(List&lt;Integer&gt;) have the same erasure”。' },
      { p: '同理，<code>void print(List&lt;String&gt;)</code> 和 <code>void print(List&lt;?&gt;)</code> 也不能共存，因为后者擦除后也是 List。甚至 <code>void print(List)</code> 和 <code>void print(List&lt;String&gt;)</code> 也不行。想表达“不同元素类型不同处理”，只能换方法名、加一个类型标识参数，或者用一个统一的方法内部再判断。' },
      { p: '方法重载看的是“擦除后的签名”，而不是源码里的尖括号。这也是为什么 JDK 里很多方法叫 <code>of</code>、<code>from</code>、<code>copyOf</code> 而不是靠重载区分元素类型。设计 API 时，如果两个重载只有泛型参数不同，趁早改名。' },
      { note: '<b>一句话记忆：</b>凡是“运行时必须知道 T 是什么”的操作，都不允许；凡是“只靠编译器检查”的操作，都允许。擦除把类型信息从运行时拿走了，但没有拿走编译器的检查能力。' },
      { p: '还有两个容易忽略的限制。泛型类不能是 Throwable 的子类，所以不存在“泛型异常”；也不能写 <code>catch (T e)</code>，因为 catch 需要在运行时匹配类型。另一个限制是 <code>Class&lt;T&gt;</code> 本身不能表达带参数的泛型，<code>List&lt;String&gt;.class</code> 是非法写法，只能写 <code>List.class</code>。' },
      { h: '4.4 桥接方法：多态如何不被擦除破坏' },
      { p: '擦除会带来一个多态问题。假设 Node&lt;T&gt; 有方法 <code>T get()</code>，StringNode 继承 <code>Node&lt;String&gt;</code> 并重写 <code>String get()</code>。擦除后父类方法是 <code>Object get()</code>，子类方法是 <code>String get()</code>，两者签名不同，按普通规则不构成重写，多态就会失效。' },
      { p: '编译器解决办法是生成一个桥接方法（bridge method）：在 StringNode 里合成一个 <code>Object get()</code>，方法体调用真正的 <code>String get()</code>，再做返回。这样通过父类引用调用时，虚方法表能找到 Object get，进而转发到子类实现。桥接方法是编译器生成的 synthetic 方法，源码里看不到。' },
      { lang: 'java', code: `import java.lang.reflect.Method;

public class BridgeDemo {
    static class Node<T> {
        private final T value;

        Node(T value) {
            this.value = value;
        }

        T get() {
            return value;
        }
    }

    static class StringNode extends Node<String> {
        StringNode(String value) {
            super(value);
        }

        @Override
        String get() {
            return "[" + super.get() + "]";
        }
    }

    public static void main(String[] args) {
        Node<String> node = new StringNode("hi");
        System.out.println(node.get());
        for (Method method : StringNode.class.getDeclaredMethods()) {
            if (method.isBridge()) {
                System.out.println("bridge: " + method);
            }
        }
    }
}`, title: 'BridgeDemo.java' },
      { out: '[hi]\nbridge: public java.lang.Object StringNode.get()' },
      { p: '输出里的 bridge 方法返回 Object，而不是 String，正是擦除后父类签名的样子。它内部调用 StringNode 真正的 get，返回值再向上转型为 Object。调用 <code>node.get()</code> 时，编译器在调用点插入 <code>(String)</code> 强转，所以最终打印的是带方括号的字符串。' },
      { p: '桥接方法还会出现在泛型接口的实现、协变返回值等场景。它通常是透明的，但在反射、AOP 代理、序列化框架里可能被看到：有些框架会遍历所有方法，如果不跳过 <code>isBridge()</code> 和 <code>isSynthetic()</code>，就会把同一个方法处理两遍。' },
      { p: '桥接方法也可能引发“方法冲突”的编译错误。比如一个类同时实现两个泛型接口，而两个接口擦除后产生相同签名、返回类型却不同，编译器就无法生成合法的桥接方法。这类问题通常需要调整设计，而不是硬改签名。' },
      { h: '4.5 堆污染与 unchecked 警告' },
      { p: '擦除让编译器无法在运行时保证泛型容器的元素类型。如果通过原始类型、未经检查的强转或泛型可变参数，把错误类型的元素放进容器，就会发生“堆污染”（heap pollution）。容器本身不会立刻报错，错误会延迟到取元素、做强转的那一刻。' },
      { lang: 'java', code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class HeapPollution {
    @SafeVarargs
    static <T> List<T> listOf(T... items) {
        return new ArrayList<>(Arrays.asList(items));
    }

    public static void main(String[] args) {
        List<String> strings = listOf("a", "b");
        List raw = strings;
        raw.add(42);
        for (String text : strings) {
            System.out.println(text.length());
        }
    }
}`, title: 'HeapPollution.java' },
      { out: '1\n1\nException in thread "main" java.lang.ClassCastException: class java.lang.Integer cannot be cast to class java.lang.String' },
      { p: 'raw.add(42) 这一行只产生 unchecked 警告，编译可以通过；运行时 List 里确实多了一个 Integer。for-each 循环在字节码里会对每个元素插入 <code>(String)</code> 强转，前两个字符串正常打印长度，轮到 Integer 时强转失败，抛出 ClassCastException。' },
      { p: '堆污染的源头通常有三类：使用原始类型（<code>List raw</code>）、未经检查的强转（<code>(List&lt;String&gt;) obj</code>）、泛型可变参数（<code>T...</code> 在底层是 Object[]）。前两类应该尽量避免；第三类如果方法内部不把数组暴露出去、不写入错误类型，可以用 <code>@SafeVarargs</code> 告诉编译器“我保证安全”。' },
      { p: '<code>@SafeVarargs</code> 不是免死金牌。它只抑制警告，不改变运行时行为；如果方法体把 items 赋给一个外部可见的 Object[]，或者把数组传给别的方法改写，仍然可能堆污染。使用时要在注释里写清楚为什么安全，否则下一个维护者会把它当成“消警告的魔法”。' },
      { h: '4.6 反射能看到什么，看不到什么' },
      { p: '反射是运行时查看类结构的工具，但它也受擦除限制。通过 <code>getClass()</code> 拿到的是原始类型；<code>getTypeParameters()</code> 能拿到声明处的类型变量（比如 Box 的 T），但拿不到使用处的具体实参（比如 Box&lt;String&gt; 的 String）。' },
      { p: '有一类信息被保留了下来：类文件里的 Signature 属性。泛型声明（父类、接口、字段、方法签名）在编译时会被记录成签名，反射的 <code>getGenericSuperclass()</code>、<code>getGenericInterfaces()</code>、<code>getGenericReturnType()</code> 能读到它们。但这些都是“声明处的泛型”，不是“某个对象运行时的泛型实参”。' },
      { table: { head: ['反射方法', '能拿到', '拿不到'], rows: [
        ['<code>getClass()</code>', '原始类，如 ArrayList', 'String、Integer 等实参'],
        ['<code>getTypeParameters()</code>', '类/方法声明的 T、K、V', '使用处填入的具体类型'],
        ['<code>getGenericSuperclass()</code>', '带泛型的父类声明', '实例化后的动态类型'],
        ['<code>getGenericInterfaces()</code>', '带泛型的接口声明', '运行时替换后的类型'],
        ['<code>Field.getGenericType()</code>', '字段声明中的泛型', '字段当前值的实际类型']
      ] } },
      { p: '所以 <code>List&lt;String&gt; list = new ArrayList&lt;&gt;()</code> 之后，反射只能知道“这是一个 List”，不知道“元素是 String”。如果业务真的需要这个信息，必须在创建时显式传进去，或者用下面要讲的 TypeToken 技巧。' },
      { p: '举一个常见误解：有人以为 <code>field.getGenericType()</code> 能拿到“这个字段当前值的实际类型”。它拿到的是声明类型，而且只有当字段声明里写了泛型时才有信息；如果字段声明为 <code>Object value</code>，无论你往里放什么，反射都只返回 Object。想要实例的真实类型，只能在赋值时额外记录，或者直接调用 <code>value.getClass()</code>。' },
      { h: '4.7 TypeToken：把类型信息带在身上' },
      { p: '很多框架需要在运行时知道泛型实参，比如 JSON 反序列化要把 <code>List&lt;User&gt;</code> 还原成用户列表，而不是一串 LinkedHashMap。它们的通用做法是 TypeToken：利用“匿名子类会保留父类泛型签名”这一点，在类文件里留下 <code>TypeRef&lt;List&lt;User&gt;&gt;</code> 的签名，运行时通过反射读出来。' },
      { lang: 'java', code: `import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;

public class TypeTokenDemo {
    static class TypeRef<T> {
        Type type() {
            Type superType = getClass().getGenericSuperclass();
            return ((ParameterizedType) superType).getActualTypeArguments()[0];
        }
    }

    public static void main(String[] args) {
        TypeRef<List<String>> ref = new TypeRef<List<String>>() {};
        System.out.println(ref.type());
    }
}`, title: 'TypeTokenDemo.java' },
      { out: 'java.util.List<java.lang.String>' },
      { p: '关键在 <code>new TypeRef&lt;List&lt;String&gt;&gt;() {}</code> 后面的一对花括号：它创建了一个匿名子类，父类是 <code>TypeRef&lt;List&lt;String&gt;&gt;</code>。编译器会把这个父类签名写进匿名类的 class 文件，运行时 <code>getGenericSuperclass()</code> 返回一个 ParameterizedType，<code>getActualTypeArguments()</code> 就能读到 <code>List&lt;String&gt;</code>。' },
      { p: '如果直接写 <code>new TypeRef&lt;List&lt;String&gt;&gt;()</code> 而不带花括号，创建的是 TypeRef 本身，<code>getGenericSuperclass()</code> 返回 Object，拿不到任何类型参数。这也是为什么很多库要求你写成匿名子类，或者提供一个 <code>TypeToken&lt;T&gt;(){}</code> 的构造形式。' },
      { p: 'TypeToken 不是万能的。它只能捕获“写在代码里的泛型声明”，不能捕获“运行时才确定的类型变量”。比如 <code>&lt;T&gt; T parse(String json)</code> 里，T 在运行时被擦除，你必须额外传一个 <code>Type</code> 或 <code>Class&lt;T&gt;</code>。框架的 API 通常会显式要求这个参数，就是为了弥补擦除。' },
      { note: '<b>自己实现时的注意点：</b>匿名子类会持有外部类的引用，如果在外层是长生命周期对象、又大量创建 TypeToken，可能造成内存泄漏。可以缓存 TypeToken 实例，或者用静态工厂；解析出的 Type 本身是不可变的，适合缓存。' },
      { h: '4.8 限制清单与替代方案' },
      { p: '下面把擦除导致的常见限制集中列出。遇到编译错误时，先在这张表里找原因，再考虑替代方案；不要用 <code>@SuppressWarnings</code> 把问题藏起来，除非你能说清楚为什么安全。' },
      { table: { head: ['限制', '编译期表现', '替代方案'], rows: [
        ['创建 T 实例', '<code>new T()</code> 报错', '传 <code>Supplier&lt;T&gt;</code> 或 <code>Class&lt;T&gt;</code>'],
        ['创建泛型数组', '<code>new T[n]</code> 报错', '用集合，或 <code>Array.newInstance</code>'],
        ['泛型 instanceof', '<code>instanceof List&lt;String&gt;</code> 报错', '用 <code>List&lt;?&gt;</code> 或逐元素判断'],
        ['静态成员用 T', '<code>static T</code> 报错', '方法上单独声明 <code>&lt;T&gt;</code>'],
        ['按泛型重载', 'name clash 报错', '换方法名或加类型参数'],
        ['捕获泛型异常', '<code>catch (T e)</code> 报错', '用具体异常类型'],
        ['基本类型实参', '<code>List&lt;int&gt;</code> 报错', '用包装类型，依赖装箱'],
        ['运行时取实参', '反射只能拿到声明', '用 TypeToken 或显式传 Type']
      ] } },
      { p: '替代方案的核心思路只有一句话：<b>把运行时需要的类型信息，显式地作为参数传进来。</b>需要创建对象就传工厂，需要数组就传数组工厂，需要反序列化就传 Type，需要判断就传 Class。框架做不到的，让调用方补上。' },
      { p: '另外要区分“声明处的泛型”和“使用处的泛型”。字段、方法签名、父类声明里的泛型会被记录在 class 文件里，反射能读到；局部变量、对象实例的泛型实参不会被记录。很多“反射拿不到泛型”的困惑，其实是把这两者混为一谈了。' },
      { h: '4.9 实战：把类型信息显式传进去' },
      { p: '理解了擦除，再看框架 API 就很容易明白它们为什么长得“啰嗦”。JSON 库反序列化时要求你传 <code>Class&lt;T&gt;</code> 或 <code>TypeReference&lt;T&gt;</code>，ORM 查询要求传实体类，HTTP 客户端要求传响应类型——这些都不是设计者偷懒，而是因为运行时真的不知道 T 是什么，必须由调用方补上。' },
      { list: [
        '<b>Class&lt;T&gt;：</b>适合单层、非泛型的类型，例如 <code>User.class</code>、<code>String.class</code>。它只能表示原始类型，表达不了 <code>List&lt;User&gt;</code>。',
        '<b>Supplier&lt;T&gt;：</b>适合需要创建实例的场景，例如 <code>User::new</code>。它把“怎么造一个 T”交给调用方，绕开 <code>new T()</code> 的限制。',
        '<b>Type / TypeToken：</b>适合嵌套泛型，例如 <code>List&lt;Map&lt;String, Integer&gt;&gt;</code>。通过匿名子类保留签名，运行时解析出完整类型。',
        '<b>自定义工厂接口：</b>当创建逻辑需要参数时，定义一个 <code>Factory&lt;T, A&gt;</code>，比反射更类型安全，也比 Supplier 更灵活。'
      ] },
      { p: '选择标准可以按“类型有多复杂”来分：单层简单类型用 Class；需要实例化用 Supplier 或工厂；嵌套泛型用 TypeToken；只有在写框架、无法要求调用方传参时，才考虑从字段或父类签名里反射推断。推断出来的结果要缓存，并且要处理推断失败的情况。' },
      { list: [
        '优先传 <code>Class&lt;T&gt;</code>：编译期能检查，调用方也最容易理解。',
        '需要构造实例时传 <code>Supplier&lt;T&gt;</code>，不要在框架里反射调用无参构造器——私有构造器、带参构造器都会让你翻车。',
        '嵌套泛型用 TypeToken，并把它作为 API 的显式参数，而不是让框架猜。'
      ] },
      { p: '还有一个常被忽略的成本：解析泛型签名要用反射，比普通方法调用慢一个数量级以上。框架通常在启动时解析一次并缓存，业务代码不要在每个请求里重复调用 <code>getGenericSuperclass()</code>。把解析结果放进静态常量或缓存 Map，是这类代码的标配。' },
      { p: '一个常见的错误是“用反射拿到字段的泛型，然后假设实例就是这个类型”。字段声明 <code>List&lt;String&gt; names</code> 只说明“声明是字符串列表”，运行时完全可以塞进 Integer（通过原始类型），反射读到的仍然是 String。类型信息是声明的一部分，不是运行时保证；真正的保证来自编译期检查和不让原始类型漏进来。' },
      { p: 'Spring 的 <code>ParameterizedTypeReference&lt;T&gt;</code>、Jackson 的 <code>TypeReference&lt;T&gt;</code>、Gson 的 <code>TypeToken&lt;T&gt;</code> 本质上是同一个套路：用匿名子类把泛型签名写进 class 文件，再在运行时解析。它们都不是“让 JVM 记住了泛型”，而是“在擦除发生之前，把类型信息抄了一份到类声明里”。' },
      { p: '需要提醒的是，TypeToken 读取的是“声明类型”，不是“值的实际类型”。同一个 <code>TypeRef&lt;List&lt;String&gt;&gt;</code> 可以解析出 <code>List&lt;String&gt;</code>，但如果你把一个装满 Integer 的原始 List 赋给它，运行时也不会阻止。类型信息只描述“应该是什么”，不保证“实际是什么”；后者仍然要靠编译期约束和代码审查。' },
      { h: '4.10 本章小结' },
      { p: '擦除不是“Java 偷懒”，而是 2004 年做泛型时唯一可行的兼容方案：新编译器要能读懂泛型，新生成的字节码又要能在老 JVM 上跑，老类库也要能被新代码使用。代价是运行时看不到类型参数，于是有了不能 <code>new T()</code>、不能对参数化类型做 <code>instanceof</code>、不能按泛型参数重载这些限制。理解代价，才能在设计 API 时主动把类型信息传给运行时，而不是和语言较劲。' },
      { list: [
        '类型擦除发生在编译期：无界 T 擦成 Object，有界 T 擦成上界，泛型类型擦成原始类型。',
        '运行时 List&lt;String&gt; 和 List&lt;Integer&gt; 是同一个类，泛型实参不进入字节码。',
        '擦除导致不能 new T、不能泛型数组、不能泛型 instanceof、静态成员不能用 T。',
        '编译器在取值处插入强转，并生成桥接方法维持多态；桥接方法可用 isBridge 识别。',
        '原始类型、未检查强转、泛型可变参数可能造成堆污染，错误延迟到强转时爆发。',
        '擦除是为了向后兼容，代价是运行时类型信息缺失，框架用 TypeToken 等方案弥补。',
        '设计 API 时把运行时需要的类型显式传参，不要依赖反射去“猜”泛型实参。'
      ] },
      { h: '4.11 常见追问' },
      { list: [
        '<b>问：既然擦除后都一样，为什么还要写泛型？</b><br>答：为了编译期检查和可读性。它能在写代码时阻止把 Integer 塞进 <code>List&lt;String&gt;</code>，并省掉大量强转；运行时虽然擦除，但编译器已经在所有取值处插入了 checkcast，只要不通过原始类型绕过，类型安全就是有保证的。泛型还让 API 自解释：<code>Map&lt;String, List&lt;Order&gt;&gt;</code> 比 <code>Map</code> 多传递了大量信息，IDE 补全和重构也更可靠。',
        '<b>问：为什么不能创建泛型数组？</b><br>答：数组在运行时需要元素类型来做存储检查（ArrayStoreException），而 T 已被擦除；如果允许 <code>new T[10]</code>，JVM 不知道该创建什么数组，也无法保证只能放入 T。可以强转 <code>(T[]) new Object[n]</code>，或者传一个 <code>IntFunction&lt;T[]&gt;</code>，前者会有 unchecked 警告，把数组暴露出去还可能堆污染。更稳的方案是用集合，或者用 <code>Array.newInstance(type, n)</code> 配合 <code>Class&lt;T&gt;</code>。',
        '<b>问：桥接方法会不会影响性能？</b><br>答：只多一次方法转发，JIT 通常能内联，实际影响可以忽略；它主要影响反射和字节码工具，遍历方法时要跳过 synthetic 与 bridge，否则会看到两个同名方法。桥接方法是编译器为维持多态自动生成的：父类擦除后是 <code>Object get()</code>，子类是 <code>String get()</code>，桥接方法负责把调用转给真正的子类方法并插入强转。',
        '<b>问：@SuppressWarnings("unchecked") 能不能随便加？</b><br>答：不能。它只是让编译器闭嘴，不改变运行时行为；加错地方会把真正的堆污染藏起来，错误延迟到取值强转时才爆 ClassCastException。加之前要能证明类型安全（例如数组只在内部使用、不暴露、不写入错误类型），并把作用范围缩到最小——标在单个局部变量或方法上，不要标在类上；最好附一行注释说明为什么安全。',
        '<b>问：TypeToken 和 Class&lt;T&gt; 有什么区别？</b><br>答：Class 只能表示原始类型，拿不到 <code>List&lt;User&gt;</code> 这种带参数的泛型；TypeToken 通过匿名子类保留父类的泛型签名，反射用 <code>getGenericSuperclass()</code> 能读到完整的 Type，因此能表达嵌套泛型，Jackson 的 TypeReference、Gson 的 TypeToken 都是这个套路。代价是每次都要 new 一个匿名子类，而且只能表达声明处的类型，无法从对象实例反推实参。',
        '<b>问：Java 以后会不会支持具体化泛型？</b><br>答：目前没有在主流版本中实现，Java 25 仍然是擦除。具体化泛型会破坏向后兼容，涉及 JVM 指令、反射 API、字节码格式的全面改动，还要处理与现有擦除字节码的混用。Valhalla 项目解决的是值类型与基本类型的泛型化（通过专门化），并不等于重新设计泛型；短期内仍要按「把类型信息显式传进去」的思路设计 API。',
      ] },
      { h: '4.12 自测与练习' },
      { p: '练习重点是把「源码里的泛型」翻译成「运行时的样子」：用 javap 查看编译后的签名，亲眼确认擦除结果。' },
      { ol: [
        '写一个泛型类 Box&lt;T&gt;，编译后用 <code>javap -c -p</code> 查看 get 方法，找出插入的 checkcast 指令。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class BoxDemo {\n\n  static class Box&lt;T> {\n    private T value;\n\n    Box(T value) { this.value = value; }\n\n    T get() { return value; }\n    void set(T value) { this.value = value; }\n  }\n\n  public static void main(String[] args) {\n    Box&lt;String> b = new Box&lt;>("hi");\n    String s = b.get();      // 强转由编译器插在这里\n    System.out.println(s.length());\n  }\n}</pre><b>要点</b>：先 <code>javac BoxDemo.java</code>，再 <code>javap -c -p \'BoxDemo$Box\'</code>——get 的签名是 <code>()Ljava/lang/Object;</code>，方法体只有 aload/getfield/areturn，checkcast 出现在调用方取值之后；<code>javap -v</code> 里的 Signature 属性还留着尖括号信息，擦除只影响字节码的擦除类型，不影响反射。</div></details>',
        '写两个方法 <code>print(List&lt;String&gt;)</code> 和 <code>print(List&lt;Integer&gt;)</code>，观察编译错误，并改成合法的方法名。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.List;\n\npublic class Clash {\n\n  // 编译失败：name clash: print(List&lt;String>) 和\n  // print(List&lt;Integer>) 有相同的 erasure\n  // static void print(List&lt;String> xs) { }\n  // static void print(List&lt;Integer> xs) { }\n\n  static void printStrings(List&lt;String> xs) {\n    for (String s : xs) {\n      System.out.println(s.length());\n    }\n  }\n\n  static void printInts(List&lt;Integer> xs) {\n    for (Integer i : xs) {\n      System.out.println(i + 1);\n    }\n  }\n\n  public static void main(String[] args) {\n    printStrings(List.of("ab", "c"));\n    printInts(List.of(1, 2));\n  }\n}</pre><b>要点</b>：擦除后两个方法都是 <code>print(List)</code>，只改返回类型同样冲突——返回类型不参与方法签名；<code>print(List&lt;String&gt;)</code> 与 <code>print(List&lt;?&gt;)</code> 也是同一个擦除，不能共存；改方法名、加一个标记参数、或收成一个 <code>List&lt;?&gt;</code> 再在方法体里判元素类型才是正路。</div></details>',
        '写一个泛型方法 <code>&lt;T&gt; T[] toArray(List&lt;T&gt; list, Class&lt;T&gt; type)</code>，用 <code>Array.newInstance</code> 创建数组。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.Array;\nimport java.util.List;\n\npublic class ToArray {\n\n  @SuppressWarnings("unchecked")\n  static &lt;T> T[] toArray(List&lt;T> list, Class&lt;T> type) {\n    T[] arr = (T[]) Array.newInstance(type, list.size());\n    int i = 0;\n    for (T t : list) {\n      arr[i++] = t;\n    }\n    return arr;\n  }\n\n  public static void main(String[] args) {\n    String[] arr = toArray(List.of("a", "b"), String.class);\n    System.out.println(arr.getClass().getName());\n    System.out.println(String.join(",", arr));\n  }\n}</pre><b>要点</b>：<code>Array.newInstance</code> 用运行期的 Class 造出类型正确的数组，所以返回值能直接赋给 <code>String[]</code>，运行时类型是 <code>[Ljava.lang.String;</code>；不传 Class 就只能 <code>new Object[]</code>，再强转 <code>(T[])</code> 会在赋值处抛 ClassCastException——这是「泛型数组创建」的通用解法，@SuppressWarnings 只压住那一次强转警告。</div></details>',
        '用反射打印 StringNode 的所有方法，区分 bridge 方法和普通方法，解释 bridge 的返回类型为什么是 Object。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.Method;\n\npublic class Bridge {\n\n  static class Node&lt;T> {\n    T value() { return null; }\n  }\n\n  static class StringNode extends Node&lt;String>\n      implements Comparable&lt;StringNode> {\n    @Override\n    String value() { return "s"; }\n\n    @Override\n    public int compareTo(StringNode o) { return 0; }\n  }\n\n  public static void main(String[] args) {\n    for (Method m : StringNode.class.getDeclaredMethods()) {\n      System.out.println((m.isBridge() ? "[bridge] " : "[normal] ")\n          + m.getName()\n          + " -> " + m.getReturnType().getSimpleName()\n          + "  params=" + m.getParameterCount());\n    }\n  }\n}</pre><b>要点</b>：擦除后父类的签名是 <code>Object value()</code>，多态调用按父类签名分派，所以编译器要生成一个 <code>Object value()</code> 的 bridge 方法，里面 checkcast 后调用子类的 <code>String value()</code>；bridge 是 synthetic，源码里没有，<code>isBridge()</code> 能识别；<code>compareTo</code> 的 bridge 是 <code>compareTo(Object)</code>，返回类型仍是 int，变的是形参。</div></details>',
        '写一个 TypeToken 读取 <code>Map&lt;String, List&lt;Integer&gt;&gt;</code> 的完整类型，打印 actual type arguments。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.ParameterizedType;\nimport java.lang.reflect.Type;\nimport java.util.List;\nimport java.util.Map;\n\npublic class TypeTokens {\n\n  abstract static class TypeRef&lt;T> {\n    Type type() {\n      Type sup = getClass().getGenericSuperclass();\n      return ((ParameterizedType) sup)\n          .getActualTypeArguments()[0];\n    }\n  }\n\n  public static void main(String[] args) {\n    Type t = new TypeRef&lt;Map&lt;String, List&lt;Integer>>>() {}.type();\n    System.out.println(t);\n\n    ParameterizedType p = (ParameterizedType) t;\n    for (Type a : p.getActualTypeArguments()) {\n      System.out.println("actual type argument: " + a);\n    }\n  }\n}</pre><b>要点</b>：花括号不能省——匿名子类把真实类型实参写进 class 文件的 Signature 属性，<code>getGenericSuperclass()</code> 才拿得到；直接 <code>new TypeRef&lt;Map&lt;…&gt;&gt;()</code> 时 T 已被擦成 Object，拿不到实参；里层的 <code>List&lt;Integer&gt;</code> 也是 ParameterizedType，要再拆一层。</div></details>',
        '复现堆污染：用原始类型往 List&lt;String&gt; 里塞一个整数，观察在哪一行抛 ClassCastException，并说明为什么不是 add 时抛。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\npublic class Pollution {\n\n  @SuppressWarnings({"unchecked", "rawtypes"})\n  public static void main(String[] args) {\n    List&lt;String> list = new ArrayList&lt;>();\n    List raw = list;         // 原始类型，编译器不再检查\n    raw.add(42);             // 这里不抛\n    System.out.println(list.size());\n\n    String s = list.get(0);  // 这一行抛 ClassCastException\n    System.out.println(s);\n  }\n}</pre><b>要点</b>：泛型只在编译期检查，擦除后 add 只写一个 Object 引用，checkcast 被编译器插在「取值并赋给 String」的地方，所以异常出现在 <code>list.get(0)</code> 那一行而不是 add；异常堆栈指向赋值语句，正是因为那里才是插入强转的位置。</div></details>',
      ] },
      { note: '<b>练习提示：</b>第 1 题重点看 <code>checkcast</code> 出现在调用方还是被调用方；第 6 题要能说清「擦除后容器不检查元素类型，强转发生在取值处」，这是堆污染难排查的根本原因。' }
    ]
  };

  T['lambda'] = {
    meta: '本章约 5300 字 · 建议 55 分钟 · 6 个示例 · 3 张表格',
    blocks: [
      { h: '5.1 为什么学：把“一段逻辑”当参数传' },
      { p: '在 Java 8 之前，想把“一段逻辑”传给方法，只能写匿名内部类。比如按字符串长度排序，要写 <code>Collections.sort(list, new Comparator&lt;String&gt;() { public int compare(String a, String b) { return a.length() - b.length(); } });</code>。六行代码里，真正有用的只有 <code>a.length() - b.length()</code> 这一句，其余都是样板。' },
      { p: 'Lambda 表达式把“方法”变成可以传递的值。同样的排序可以写成 <code>list.sort((a, b) -&gt; a.length() - b.length());</code>。它的意义不只是短，而是让“行为参数化”成为日常写法：把“做什么”作为参数交给方法，由方法决定“什么时候做、对谁做”。' },
      { p: '<code>List.sort</code>、<code>removeIf</code>、<code>forEach</code>、<code>Comparator.comparing</code>、Stream 的 <code>filter</code> 与 <code>map</code>，全都建立在这个能力上。不夸张地说，不掌握 Lambda，就读不懂现代 Java 项目里一半的集合代码。本章从函数式接口讲起，再讲语法、方法引用、变量捕获、异常处理和 JVM 实现，最后落到实战。' },
      { p: '学习本章不需要先懂 Stream，但学完本章再去学 Stream 会轻松很多：Stream 的 <code>filter</code> 接收 <code>Predicate</code>，<code>map</code> 接收 <code>Function</code>，<code>forEach</code> 接收 <code>Consumer</code>，<code>sorted</code> 接收 <code>Comparator</code>。把函数式接口弄明白，Stream 的 API 就只剩下“有哪些中间操作、有哪些终止操作”需要记忆。' },
      { h: '5.2 函数式接口：Lambda 的目标类型' },
      { p: 'Lambda 不能单独存在，它必须被赋给一个“函数式接口”。函数式接口指只有一个抽象方法的接口，英文叫 SAM（Single Abstract Method）。例如 <code>Comparator&lt;T&gt;</code> 只有一个抽象方法 <code>compare</code>，<code>Runnable</code> 只有一个 <code>run</code>，它们都是函数式接口。' },
      { p: '默认方法、静态方法以及从 Object 继承来的方法，都不算抽象方法。所以一个接口哪怕有十几个默认方法，只要抽象方法只有一个，仍然是函数式接口。<code>Comparator</code> 就是典型：除了 <code>compare</code>，还有 <code>reversed</code>、<code>thenComparing</code> 等大量默认方法。' },
      { p: '为什么必须限制为一个？因为 Lambda 没有方法名。编译器看到 <code>(a, b) -&gt; a + b</code>，只能根据目标类型的“唯一抽象方法”确定参数个数、参数类型和返回值类型。如果有两个抽象方法，编译器就不知道你实现的是哪一个，只能报错。' },
      { p: '判断一个接口是不是函数式接口，最可靠的方法是数抽象方法，而不是看名字或包名。自己写接口时，如果准备配合 Lambda 使用，就加上 <code>@FunctionalInterface</code>；如果接口后来必须增加抽象方法，编译器会立刻提醒你“这里已经不能再用 Lambda 了”，这比运行时才发现要好得多。' },
      { note: '常见错误：把 Lambda 赋给 <code>Object</code>，或赋给有两个抽象方法的接口。前者没有目标类型，后者无法确定方法签名，都会编译失败。加 <code>@FunctionalInterface</code> 只是让编译器帮你检查“确实只有一个抽象方法”，不是使用 Lambda 的前提。' },
      { h: '5.3 Lambda 的三种写法与类型推断' },
      { lang: 'java', code: `public class LambdaSyntax {
    interface Calculator {
        int calc(int a, int b);
    }

    public static void main(String[] args) {
        Calculator add = (a, b) -> a + b;
        Calculator max = (a, b) -> {
            int result = Math.max(a, b);
            return result;
        };
        Runnable task = () -> System.out.println("run");

        System.out.println(add.calc(2, 3));
        System.out.println(max.calc(7, 4));
        task.run();
    }
}`, title: 'LambdaSyntax.java' },
      { out: `5
7
run` },
      { p: '第一种是表达式体：箭头右边是一个表达式，它的值就是返回值，不能写 <code>return</code>。第二种是块体：右边是一对花括号，可以写多行语句，有返回值时必须显式 <code>return</code>，并且每条路径都要有返回值。第三种是无参形式：左边写一对空括号，对应 <code>Runnable</code> 这种没有参数的接口。' },
      { p: '参数类型可以省略，编译器会根据目标类型推断。只有一个参数时，括号也可以省略，例如 <code>s -&gt; s.length()</code>。反过来，如果写了类型，所有参数都要写，不能只写一个。参数名不能与外层局部变量重名，否则编译报错。' },
      { p: 'Lambda 体里能访问的东西和普通方法差不多：可以读字段、调用方法、抛异常。区别在于它没有自己的 <code>this</code>，也不会引入新的作用域——这一点在 5.6 节会展开。' },
      { p: '省略参数类型不是“随便省”。当目标类型明确时，编译器能推断出每个参数的类型；但如果同一个 Lambda 可能匹配多个重载，推断就会失败。例如 <code>overload((a, b) -&gt; a + b)</code> 而两个重载的参数类型不同，编译器无法选择。此时要显式写出参数类型，或先把 Lambda 赋给一个明确类型的变量，再传进去。' },
      { h: '5.4 常用内置函数式接口' },
      { p: '<code>java.util.function</code> 包里准备了四十多个接口，零基础阶段记住六个就够用：<code>Function</code>、<code>Consumer</code>、<code>Supplier</code>、<code>Predicate</code>、<code>UnaryOperator</code>、<code>BinaryOperator</code>。它们的区别只有三点：有没有输入、有没有输出、输出是不是布尔值。' },
      { table: { head: ['接口', '抽象方法', '输入', '输出', '典型用途'], rows: [
        ['Function&lt;T,R&gt;', 'R apply(T t)', '1', '1', '类型转换、提取属性'],
        ['BiFunction&lt;T,U,R&gt;', 'R apply(T t, U u)', '2', '1', '合并两个值'],
        ['Consumer&lt;T&gt;', 'void accept(T t)', '1', '0', '打印、保存、累加'],
        ['Supplier&lt;T&gt;', 'T get()', '0', '1', '延迟创建、工厂'],
        ['Predicate&lt;T&gt;', 'boolean test(T t)', '1', '布尔', '过滤、条件判断'],
        ['UnaryOperator&lt;T&gt;', 'T apply(T t)', '1', '同类型', '数值变换、字符串处理'],
        ['BinaryOperator&lt;T&gt;', 'T apply(T t1, T t2)', '2', '同类型', '求和、取较大值'],
        ['Runnable', 'void run()', '0', '0', '线程任务'],
        ['Callable&lt;V&gt;', 'V call() throws Exception', '0', '1', '带返回值的任务']
      ] } },
      { lang: 'java', code: `import java.util.function.*;

public class FunctionalInterfaces {
    public static void main(String[] args) {
        Function<String, Integer> length = String::length;
        Predicate<String> isEmpty = String::isEmpty;
        Consumer<String> printer = System.out::println;
        Supplier<String> supplier = () -> "hello";
        UnaryOperator<Integer> square = n -> n * n;

        printer.accept("len=" + length.apply("java"));
        System.out.println(isEmpty.test(""));
        System.out.println(supplier.get());
        System.out.println(square.apply(6));
    }
}`, title: 'FunctionalInterfaces.java' },
      { out: `len=4
true
hello
36` },
      { p: '这段代码把五个接口放在一起：<code>String::length</code> 是 <code>Function&lt;String, Integer&gt;</code>，<code>String::isEmpty</code> 是 <code>Predicate&lt;String&gt;</code>，<code>System.out::println</code> 是 <code>Consumer&lt;String&gt;</code>，<code>() -&gt; "hello"</code> 是 <code>Supplier&lt;String&gt;</code>，<code>n -&gt; n * n</code> 是 <code>UnaryOperator&lt;Integer&gt;</code>。同一个方法名，换个目标类型就是另一种函数。' },
      { p: '怎么选？先问“要不要返回值”：不要返回值用 <code>Consumer</code>；要返回值再问“有没有输入”：没有输入用 <code>Supplier</code>，有一个输入用 <code>Function</code>，有两个用 <code>BiFunction</code>；如果返回值是布尔，用 <code>Predicate</code>；如果输入输出同类型，用 <code>UnaryOperator</code> 或 <code>BinaryOperator</code>。' },
      { p: '基本类型有专门版本，例如 <code>IntFunction</code>、<code>IntPredicate</code>、<code>IntUnaryOperator</code>、<code>ToIntFunction</code>。它们避免装箱拆箱，在循环或大数据量场景下更省。不要为了“统一”而全部用泛型版本，热点代码里的 <code>Integer</code> 装箱是实打实的开销。' },
      { p: '最后补充一个命名规律：内置接口的变体大多是“前缀表示输入、后缀表示输出”。<code>ToIntFunction&lt;T&gt;</code> 表示输入 T、输出 int；<code>IntFunction&lt;R&gt;</code> 表示输入 int、输出 R；<code>IntToLongFunction</code> 表示 int 进、long 出。记住这个规律，看到陌生名字也能猜个八九不离十，不需要背完整的表格。' },
      { p: '还有一个使用建议：方法参数用函数式接口时，尽量用最具体的类型。需要 <code>int</code> 就用 <code>IntPredicate</code>，不要用 <code>Predicate&lt;Integer&gt;</code>；需要“无输入有输出”就用 <code>Supplier</code>，不要用 <code>Function&lt;Void, T&gt;</code>。类型越具体，调用方越不需要思考，装箱也越少。' },
      { note: '只有两种情况值得自定义函数式接口：需要声明受检异常（例如 <code>R apply(T t) throws IOException</code>），或者需要一个有业务含义的名字让 API 更可读。否则优先用内置接口，别造重复的轮子。' },
      { h: '5.5 方法引用：更短的同义写法' },
      { p: '当 Lambda 体只做一件事——调用一个已经存在的方法——就可以改写成方法引用，用双冒号 <code>::</code> 表示。它不是新能力，只是 Lambda 的简化写法，编译器仍然按目标类型做匹配。' },
      { table: { head: ['形式', '写法', '等价的 Lambda', '说明'], rows: [
        ['静态方法', 'Integer::parseInt', 's -&gt; Integer.parseInt(s)', '最常见，直接转发'],
        ['绑定实例', 'System.out::println', 's -&gt; System.out.println(s)', '接收者对象已确定'],
        ['未绑定实例', 'String::toUpperCase', 's -&gt; s.toUpperCase()', '第一个参数当接收者'],
        ['构造器', 'ArrayList::new', '() -&gt; new ArrayList&lt;&gt;()', '常用于工厂与 Supplier']
      ] } },
      { lang: 'java', code: `import java.util.*;
import java.util.function.*;

public class MethodRef {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("Bob", "alice", "Tom"));
        names.sort(String::compareToIgnoreCase);

        Function<String, Integer> parse = Integer::parseInt;
        Supplier<ArrayList<String>> factory = ArrayList::new;

        names.forEach(System.out::println);
        System.out.println(parse.apply("42") + 1);
        System.out.println(factory.get().size());
    }
}`, title: 'MethodRef.java' },
      { out: `alice
Bob
Tom
43
0` },
      { p: '<code>String::compareToIgnoreCase</code> 属于“未绑定实例方法”：它看起来只写了一个类名，实际需要两个参数，第一个参数是接收者，第二个是方法的实参。所以它正好匹配 <code>Comparator&lt;String&gt;</code> 的 <code>compare(String, String)</code>。而 <code>System.out::println</code> 是“绑定实例方法”，接收者 <code>System.out</code> 已经确定，只剩下一个参数。' },
      { p: '方法引用不能带额外参数，也不能在转发前后加逻辑。一旦需要写 <code>x -&gt; foo(x, 1)</code> 这种固定附加参数，就只能用 Lambda。遇到重载导致歧义时，编译器可能无法推断，此时显式写参数类型或改回 Lambda 即可。' },
      { p: '除了四种基本形式，方法引用还可以写 <code>this::method</code> 和 <code>super::method</code>，分别调用当前对象和父类的方法。它们在重写方法、模板方法模式里很有用：子类把“额外逻辑”通过 <code>this::</code> 传给父类，既复用了流程，又保留了扩展点。方法引用甚至能指向数组构造器，例如 <code>int[]::new</code>，在需要“给定长度创建数组”的函数里正好匹配 <code>IntFunction&lt;int[]&gt;</code>。' },
      { h: '5.6 变量捕获：为什么只能读 effectively final' },
      { p: 'Lambda 可以读取外层方法的局部变量，但不能修改。规则叫“effectively final”：变量声明后没有被重新赋值，即使不写 <code>final</code> 也算符合；一旦在 Lambda 内外任何位置重新赋值，Lambda 里再引用它就编译失败。' },
      { p: '原因在于生命周期。局部变量住在栈帧里，方法返回就消失；而 Lambda 可能被存进集合、交给线程池，活得更久。Java 的处理方式是：在创建 Lambda 时把变量的值复制一份存进合成字段。既然有两份，就必须保证它们一致，所以干脆禁止修改，从根上避免同步问题。' },
      { p: '成员变量和静态变量没有这个限制，因为它们存放在堆上的对象或类里，Lambda 捕获的是 <code>this</code> 或类本身，读写的是同一份数据。这也是为什么“把变量提成字段”能让编译通过——但请先想清楚这是否真的符合设计，而不是为了绕过限制。' },
      { note: '经典陷阱：<code>for (int i = 0; i &lt; 3; i++) { tasks.add(() -&gt; System.out.println(i)); }</code> 无法编译，因为 <code>i</code> 在递增。正确做法是在循环体内声明 <code>int copy = i;</code> 再捕获 <code>copy</code>，或者用增强 for 遍历一个不可变列表。' },
      { lang: 'java', code: `import java.util.function.IntUnaryOperator;

public class CaptureDemo {
    private int base = 100;

    void run() {
        int step = 10;
        IntUnaryOperator addStep = x -> x + step + this.base;
        // step = 20;  // 取消注释会编译失败：step 不是 effectively final
        System.out.println(addStep.applyAsInt(1));
    }

    public static void main(String[] args) {
        new CaptureDemo().run();
    }
}`, title: 'CaptureDemo.java' },
      { out: `111` },
      { p: '这段代码里 <code>step</code> 是局部变量，<code>base</code> 是成员变量，两者都能被读取。区别在于 <code>step</code> 被复制进 Lambda 对象，<code>base</code> 通过 <code>this</code> 访问原对象。把注释那行取消注释，编译器会立刻报错，这就是 effectively final 的边界。' },
      { h: '5.7 函数组合：andThen、compose、negate' },
      { p: '函数式接口的默认方法支持把小函数拼成大函数。<code>Function</code> 有 <code>andThen</code> 和 <code>compose</code>：<code>f.andThen(g)</code> 先执行 f 再执行 g，<code>f.compose(g)</code> 先执行 g 再执行 f。记不住时看参数位置：<code>andThen</code> 的参数是“之后”，<code>compose</code> 的参数是“之前”。' },
      { p: '<code>Predicate</code> 有 <code>and</code>、<code>or</code>、<code>negate</code>，对应逻辑与、或、非；<code>Comparator</code> 有 <code>thenComparing</code>、<code>reversed</code>。这些组合方法返回新的函数对象，原对象不变，所以可以安全地复用。' },
      { list: [
        '<code>Function&lt;String, String&gt; trimUpper = ((Function&lt;String, String&gt;) String::trim).andThen(String::toUpperCase);</code>',
        '<code>Predicate&lt;String&gt; notEmpty = ((Predicate&lt;String&gt;) String::isEmpty).negate();</code>',
        '<code>Comparator&lt;String&gt; byLenDesc = Comparator.comparing(String::length).reversed();</code>'
      ] },
      { p: '组合的实际价值在于“用小的、可测试的函数拼出复杂的业务规则”。例如一个订单过滤条件可以由“已支付”“金额大于一百”“未取消”三个 <code>Predicate</code> 用 <code>and</code> 拼成，每个小条件都能单独测试，组合关系一眼可见。比起写一个二十行的 <code>if</code>，这种写法更容易复用和修改。' },
      { p: '组合要克制。两三层还能一眼看懂，超过四层就建议拆成有名字的私有方法或单独类。调试时一层层套着的 Lambda 栈很难读，而方法名本身就是最好的注释。' },
      { h: '5.8 Lambda 在 JVM 上如何实现' },
      { p: 'Lambda 不是匿名内部类的语法糖。匿名类会在编译期生成一个单独的 <code>Xxx$1.class</code>；Lambda 不会，它被编译成一条 <code>invokedynamic</code> 指令，再由运行时的 <code>LambdaMetafactory</code> 链接成实现类。这是 Java 8 为了兼顾兼容性与性能做的设计。' },
      { flow: ['编译器检查目标类型是否为函数式接口', '把 Lambda 体提取成合成方法 lambda$main$0', '在调用处生成 invokedynamic 指令并记录引导方法', '首次执行时由 LambdaMetafactory 链接、生成实现类', '后续调用复用已链接的调用点，不再重复生成'] },
      { p: '无捕获的 Lambda（不引用外部变量）通常在整个程序里只生成一个实例，可以当作常量复用；有捕获的 Lambda 每次求值可能创建一个保存捕获值的新对象，具体由实现决定，规范并不保证。所以“Lambda 一定不分配对象”是错的，“一定每次都分配”也是错的。' },
      { table: { head: ['对比项', 'Lambda', '匿名内部类'], rows: [
        ['this 的含义', '外围实例', '匿名类自身'],
        ['编译产物', 'invokedynamic，运行时生成', '单独的 Xxx$1.class'],
        ['捕获方式', '合成字段保存捕获值', '构造器参数保存'],
        ['代码长度', '短，聚焦逻辑', '样板代码多']
      ] } },
      { p: '这也解释了为什么 Lambda 的类名长这样：<code>LambdaSyntax$$Lambda$14/0x0000...</code>。反射和日志里看到它不要惊讶；调试时断点可以直接打在 Lambda 体上，现代 IDE 都支持。' },
      { p: '还有一个坑：Lambda 默认不可序列化。把 Lambda 放进 <code>Runnable</code> 再序列化会抛 <code>NotSerializableException</code>；如果确实需要（例如某些分布式框架），必须写成 <code>(Runnable &amp; Serializable) () -&gt; ...</code>。绝大多数业务代码不需要这么做，但遇到“为什么存进缓存后反序列化失败”时，要想到这一点。' },
      { h: '5.9 常见误区、受检异常与性能' },
      { p: '内置函数式接口的抽象方法都没有声明 <code>throws</code>，所以 Lambda 体里调用会抛受检异常的方法时，编译器会报“未处理的异常”。例如 <code>Files.readString(path)</code> 抛 <code>IOException</code>，直接写 <code>path -&gt; Files.readString(path)</code> 无法通过编译。' },
      { lang: 'java', code: `import java.util.function.Function;

public class CheckedLambda {
    @FunctionalInterface
    interface ThrowingFunction<T, R> {
        R apply(T value) throws Exception;
    }

    static <T, R> Function<T, R> wrap(ThrowingFunction<T, R> f) {
        return value -> {
            try {
                return f.apply(value);
            } catch (Exception e) {
                throw new RuntimeException("转换失败", e);
            }
        };
    }

    public static void main(String[] args) {
        Function<String, Integer> parse = wrap(Integer::parseInt);
        System.out.println(parse.apply("123"));

        try {
            parse.apply("abc");
        } catch (RuntimeException e) {
            System.out.println(e.getMessage());
            System.out.println(e.getCause().getClass().getSimpleName());
        }
    }
}`, title: 'CheckedLambda.java' },
      { out: `123
转换失败
NumberFormatException` },
      { p: '这里定义了允许抛异常的 <code>ThrowingFunction</code>，再用 <code>wrap</code> 把它适配成标准 <code>Function</code>。适配器内部捕获异常，包成 <code>RuntimeException</code> 抛出，同时把原始异常放进 <code>cause</code>。这样调用方既能用标准接口，又不会丢掉根因。' },
      { p: '另外两种做法：在 Lambda 内部就地 try-catch，适合“失败了就返回默认值”；或者自定义一个带 <code>throws</code> 的接口，让异常继续往上抛，适合调用链本身允许受检异常的场景。不推荐“sneaky throws”那种绕过编译器检查的技巧，它把问题藏到了运行时。' },
      { list: [
        '把 Lambda 赋给 <code>Object</code>：没有目标类型，编译失败。',
        '在 Lambda 里修改局部变量：违反 effectively final，编译失败。',
        '以为 Lambda 能替代所有循环：简单遍历用增强 for 往往更清楚。',
        '忽略装箱：<code>Function&lt;Integer, Integer&gt;</code> 在百万次调用里会产生大量临时对象。',
        '在 Lambda 里做阻塞 IO 或重计算：代码看着短，执行时间一点没少。',
        '捕获大对象后长期持有：Lambda 被缓存或注册成监听器时，可能造成内存泄漏。'
      ] },
      { p: '另一个常被忽略的是 Stream 的“短”与“快”不是一回事。链式写法可读性好，但每个元素都要经过管道、可能的装箱和迭代器，数据量小的时候未必比 for 循环快；并行流还可能因为拆分、合并和共享状态出问题。用 Stream 的理由应该是“表达清晰”，而不是“自动更快”。' },
      { p: '性能上不要凭感觉。无捕获 Lambda 的调用点链接一次后可接近普通方法调用；有捕获的会有一次对象分配，但逃逸分析可能把它优化掉。Stream 相比手写循环有额外的迭代器与管道开销，数据量小的时候反而更慢。真正的原则是：先写清楚，再用 profiler 找热点，别在非热点上做微观优化。' },
      { p: '可读性也有边界。一个 Lambda 超过五六行，就应该抽成方法；嵌套两层以上的 Lambda，就应该重新设计。函数式风格的价值在于“表达意图”，不是“把代码压成一行”。' },
      { h: '5.10 实战：排序、过滤与遍历' },
      { lang: 'java', code: `import java.util.*;

public class SortFilterDemo {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("Bob", "alice", "Tom", "Anna"));

        names.sort(Comparator.comparing(String::length)
                             .thenComparing(String::compareTo));

        names.removeIf(s -> s.startsWith("T"));

        names.forEach(s -> System.out.println(s.toUpperCase()));
    }
}`, title: 'SortFilterDemo.java' },
      { out: `BOB
ANNA
ALICE` },
      { p: '<code>Comparator.comparing(String::length)</code> 先按长度升序，<code>thenComparing(String::compareTo)</code> 在长度相同时按字典序。排序结果是 Bob、Tom、Anna、alice；<code>removeIf</code> 删掉以 T 开头的 Tom；最后 <code>forEach</code> 转大写输出。三个步骤各用一个函数式接口，逻辑一目了然。' },
      { p: '这三类操作覆盖了集合处理的大部分场景：排序用 <code>Comparator</code>，过滤用 <code>Predicate</code>，遍历用 <code>Consumer</code>。它们都接受行为而不是数据，所以同一套 API 能表达千变万化的需求，而不需要为每种需求写一个新方法。' },
      { list: [
        '排序键可能为 null 时，用 <code>Comparator.nullsLast(String::compareTo)</code> 包一层，否则会抛空指针。',
        '<code>removeIf</code> 内部用迭代器删除，比“for 循环里 list.remove”安全，不会抛并发修改异常。',
        '不要在 <code>forEach</code> 里修改集合结构；需要边遍历边改，先用 <code>removeIf</code> 或收集到新列表。',
        '复杂条件抽成一个有名字的方法再使用方法引用，比塞一个三十行的 Lambda 可读得多。'
      ] },
      { h: '5.11 最佳实践' },
      { ol: [
        '优先使用内置函数式接口，只有在需要受检异常或语义命名时才自定义。',
        '保持 Lambda 短小，超过五行就抽方法，并用方法引用代替纯转发。',
        '不要在 Lambda 里修改外部状态；需要收集结果时用 <code>stream().collect()</code> 或显式容器。',
        '受检异常用包装适配器统一处理，保留 cause，不要静默吞掉。',
        '给 API 的参数起有意义的名字，例如 <code>Predicate&lt;Order&gt; filter</code>，比 <code>p</code> 清楚得多。',
        '热点路径考虑基本类型特化接口，避免不必要的装箱。'
      ] },
      { p: '给 Lambda 参数起名时，体现“它是什么”，而不是“它是什么类型”。<code>Predicate&lt;Order&gt; isPaid</code> 比 <code>Predicate&lt;Order&gt; p</code> 好，<code>Function&lt;User, String&gt; toDisplayName</code> 比 <code>f</code> 好。名字是读代码的人唯一能看到的“文档”，不要浪费。' },
      { p: '还有一条容易被忽略：不要把 Lambda 当成“高级写法”的装饰。它解决的问题是“把行为作为参数”，如果一段代码并不需要传递行为，用普通方法反而更直接。判断标准很简单——读代码的人能不能一眼看出“这里在做什么”，而不是“这里用了什么语法”。' },
      { h: '5.12 本章小结' },
      { p: '本章可以压缩成一条主线：先有函数式接口，Lambda 才有类型；有了类型，编译器才能推断参数；推断之后，方法引用才能省掉样板；而捕获规则与 invokedynamic 决定了它的边界和成本。沿着这条主线复习，比孤立地背语法点有效得多。' },
      { p: 'Lambda 是“函数式接口的实例”，编译器靠目标类型的唯一抽象方法确定签名。它讓行为可以像数据一样传递，从而把排序、过滤、遍历、回调这些模式统一成接收函数的 API。' },
      { p: '如果只记一句话：Lambda 让“行为”成为参数，函数式接口是它的类型，方法引用是它的简写，effectively final 是它的边界，invokedynamic 是它的实现。把这五点串起来，本章就通了。' },
      { list: [
        '函数式接口 = 一个抽象方法；<code>@FunctionalInterface</code> 只做编译期检查。',
        '三种写法：表达式体、块体、无参；参数类型可推断，单参数可省括号。',
        '六个常用接口：Function、Consumer、Supplier、Predicate、UnaryOperator、BinaryOperator。',
        '方法引用四种形式：静态、绑定实例、未绑定实例、构造器。',
        '局部变量必须 effectively final；成员变量不受限；Lambda 的 this 指外围对象。',
        '受检异常用包装适配器转成运行时异常，并保留 cause。',
        '实现基于 invokedynamic 与 LambdaMetafactory，不是匿名类。'
      ] },
      { h: '5.13 常见追问' },
      { list: [
        '<b>问：Lambda 和匿名内部类到底有什么区别？</b><br>答：语法更短只是表象，关键差异有三点。<code>this</code> 的指向不同：Lambda 里的 this 指外围实例，匿名类里指匿名类自身，所以在 Lambda 里调 <code>this.toString()</code> 得到的是外部对象。编译产物不同：Lambda 用 invokedynamic 在首次调用时链接，不生成独立 class 文件；匿名类每次都生成 <code>Outer$1.class</code>。捕获方式不同：Lambda 捕获值并要求 effectively final，匿名类通过构造器参数持有外部变量。',
        '<b>问：为什么局部变量必须是 final 或 effectively final？</b><br>答：因为 Lambda 可能比定义它的方法活得更久。Java 在创建 Lambda 对象时把局部变量的值复制进去，如果允许两边各自修改，就无法保证一致——你改的是栈上的副本，Lambda 里看到的还是旧值，这种「看起来能改、其实没改」比编译错误危险得多。禁止修改是最简单、最不容易出错的选择。成员变量在堆上共享，所以没有这个限制，需要可变计数就用字段、数组或 AtomicInteger。',
        '<b>问：Lambda 里能抛异常吗？</b><br>答：能抛运行时异常；受检异常取决于目标接口的抽象方法有没有声明 <code>throws</code>。内置接口（Function、Consumer 等）基本都没声明，所以在里面调用 <code>Files.readString</code> 会直接编译失败。三条出路：在 Lambda 内部就地 try-catch（适合失败返回默认值）；用 5.9 节的包装适配器把受检异常转成 RuntimeException 并保留 cause；自定义一个允许 throws 的接口，让异常继续往上抛。',
        '<b>问：方法引用和 Lambda 怎么选？</b><br>答：当 Lambda 只调用一个已有方法、没有任何额外逻辑时，方法引用更短也更清楚，例如 <code>String::length</code>、<code>System.out::println</code>、<code>User::new</code>；需要固定参数、加判断、做类型转换或组合两个调用时，用 Lambda。两者编译后的行为基本一致，选择标准是可读性：读的人一眼能看出你在调哪个方法就用引用，否则用 Lambda 把意图写出来。',
        '<b>问：Lambda 性能比匿名类差吗？</b><br>答：不能一概而论。无捕获 Lambda 通常只生成一个实例并复用，调用点链接后接近普通方法调用，JIT 还能内联；有捕获的会有一次对象分配，但可能被逃逸分析消除。匿名类同样有对象分配和类加载成本，而且每个匿名类都要单独加载。真正的开销常在看不见的地方：Stream 的管道与装箱、在 Lambda 里做阻塞 IO。与其纠结，不如先写清楚，再用 profiler 找热点。',
        '<b>问：Lambda 里能递归调用自己吗？</b><br>答：不能直接递归，因为 Lambda 没有名字，体内无法引用自身。可以把 Lambda 赋给一个字段或数组元素，再在体内通过该字段调用（字段必须先初始化）；更推荐把递归逻辑写成普通私有方法，再用方法引用 <code>this::walk</code>。强行在局部变量的初始化表达式里引用自身，还会遇到「variable might not have been initialized」的编译错误。',
      ] },
      { h: '5.14 自测与练习' },
      { ol: [
        '把 <code>Collections.sort(list, new Comparator&lt;String&gt;() { ... })</code> 改写成 Lambda 与方法引用两个版本。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.Collections;\nimport java.util.Comparator;\nimport java.util.List;\n\npublic class SortDemo {\n\n  static int byLength(String x, String y) {\n    return x.length() - y.length();\n  }\n\n  public static void main(String[] args) {\n    List&lt;String> list = new ArrayList&lt;>(List.of("bb", "a", "ccc"));\n\n    Collections.sort(list, new Comparator&lt;String>() {\n      @Override\n      public int compare(String x, String y) {\n        return x.length() - y.length();\n      }\n    });\n\n    Collections.sort(list, (x, y) -> x.length() - y.length());\n\n    Collections.sort(list, SortDemo::byLength);\n\n    System.out.println(list);\n  }\n}</pre><b>要点</b>：三个版本编译出的行为一致，匿名类每次 new 一个对象，Lambda 由 invokedynamic 生成，方法引用不产生新类；方法引用要求签名完全对上（这里是 <code>(String,String)-&gt;int</code>），对不上就退回 Lambda；<code>Comparator.comparingInt(String::length)</code> 是同一个意思的另一种写法。</div></details>',
        '用 <code>Predicate</code> 组合实现「长度大于 3 且以字母 a 开头」的过滤条件，并用 <code>negate</code> 取反。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.List;\nimport java.util.function.Predicate;\n\npublic class Preds {\n\n  public static void main(String[] args) {\n    Predicate&lt;String> longer = s -> s.length() > 3;\n    Predicate&lt;String> startsA = s -> s.startsWith("a");\n    Predicate&lt;String> hit = longer.and(startsA);\n\n    List&lt;String> words = List.of("apple", "avocado", "axe",\n        "banana");\n    for (String w : words) {\n      if (hit.test(w)) {\n        System.out.println("命中 " + w);\n      }\n      if (hit.negate().test(w)) {\n        System.out.println("排除 " + w);\n      }\n    }\n  }\n}</pre><b>要点</b>：and/or 是短路组合，negate 返回新的 Predicate 而不改动原对象，所以 <code>longer</code> 一直是原条件；<code>Predicate.not(hit)</code> 与 <code>hit.negate()</code> 等价，前者在流里更好读；组合链不要写太长，三段以上就抽成语义方法。</div></details>',
        '写一个 <code>ThrowingFunction</code> 适配器，把 <code>Files.readString</code> 包装成 <code>Function&lt;Path, String&gt;</code>，异常时返回空字符串。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.nio.file.Files;\nimport java.nio.file.Path;\nimport java.util.function.Function;\n\npublic class SafeRead {\n\n  @FunctionalInterface\n  interface ThrowingFunction&lt;T, R> {\n    R apply(T t) throws Exception;\n\n    static &lt;T, R> Function&lt;T, R> quiet(\n        ThrowingFunction&lt;T, R> f, R fallback) {\n      return t -> {\n        try {\n          return f.apply(t);\n        } catch (Exception e) {\n          return fallback;\n        }\n      };\n    }\n  }\n\n  public static void main(String[] args) {\n    Function&lt;Path, String> read =\n        ThrowingFunction.quiet(Files::readString, "");\n\n    System.out.println("[" + read.apply(\n        Path.of("SafeRead.java")) + "]");\n    System.out.println("[" + read.apply(\n        Path.of("missing.txt")) + "]");\n  }\n}</pre><b>要点</b>：自定义函数式接口允许 <code>throws Exception</code>，但 <code>Function</code> 的 apply 不能抛受检异常，所以只能在适配器内部吞掉；<code>Files::readString</code> 是 <code>(Path)-&gt;String</code> 且抛 IOException，必须经过这一层；吞异常要不要记录日志、fallback 用空串还是 null 是设计决策，不要在库里替用户决定。</div></details>',
        '用 <code>Comparator.comparing</code> 对一组订单按金额降序、金额相同按创建时间升序排序。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.time.LocalDateTime;\nimport java.util.ArrayList;\nimport java.util.Comparator;\nimport java.util.List;\n\npublic class Orders {\n\n  record Order(String id, int amount, LocalDateTime createdAt) {}\n\n  public static void main(String[] args) {\n    LocalDateTime base = LocalDateTime.of(2026, 1, 1, 9, 0);\n    List&lt;Order> orders = new ArrayList&lt;>(List.of(\n        new Order("A", 300, base.plusDays(1)),\n        new Order("B", 100, base.plusDays(2)),\n        new Order("C", 300, base)));\n\n    orders.sort(Comparator\n        .comparingInt(Order::amount).reversed()\n        .thenComparing(Order::createdAt));\n\n    orders.forEach(o -> System.out.println(o.id() + " "\n        + o.amount() + " " + o.createdAt()));\n  }\n}</pre><b>要点</b>：<code>reversed()</code> 只反转它前面那一段链，所以要先 reversed 再 thenComparing，顺序颠倒就变成「时间升序优先」；金额用 comparingInt 而不是相减，避免 int 溢出；<code>thenComparing</code> 要求键实现 Comparable，LocalDateTime 满足。</div></details>',
        '解释为什么 <code>for (int i = 0; i &lt; 3; i++) { list.add(() -&gt; i); }</code> 编译失败，并给出两种修改方式。\n<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\nimport java.util.stream.IntStream;\n\npublic class CaptureDemo {\n\n  interface Fn {\n    int get();\n  }\n\n  public static void main(String[] args) {\n    // 编译失败：i 不是 effectively final\n    // List&lt;Fn> bad = new ArrayList&lt;>();\n    // for (int i = 0; i &lt; 3; i++) {\n    //   bad.add(() -> i);\n    // }\n\n    // 改法一：循环体内复制一份\n    List&lt;Fn> a = new ArrayList&lt;>();\n    for (int i = 0; i &lt; 3; i++) {\n      int copy = i;\n      a.add(() -> copy);\n    }\n    for (Fn f : a) {\n      System.out.print(f.get() + " ");\n    }\n\n    // 改法二：把循环交给 IntStream\n    List&lt;Fn> b = new ArrayList&lt;>();\n    IntStream.range(0, 3).forEach(i -> b.add(() -> i));\n    for (Fn f : b) {\n      System.out.print(f.get());\n    }\n  }\n}</pre><b>要点</b>：Lambda 捕获的是变量而不是当时的值，被循环体修改的 i 不是 effectively final，编译器直接拒绝；改法一每轮新建 copy，每个 Lambda 各抓自己的常量；改法二每次 forEach 的参数都是新的形参，天然 effectively final。</div></details>',
      ] },
      { note: '<b>练习提示：</b>卡住时回到对应小节：第 1 题看 5.3 与 5.5，第 2 题看 5.7，第 3 题看 5.9，第 4 题看 5.10，第 5 题看 5.6。每题都真正编译运行一遍——effectively final、目标类型、受检异常这些规则，只有让编译器报一次错才会变成你自己的知识；先看报错指向「类型不匹配」还是「变量不是 final」，这两类占了初学阶段的绝大多数。做完再回看 5.1 的匿名类写法，你应该能立刻说出它啰嗦在哪、Lambda 省掉了什么、编译器替你补了什么。' }
    ]
  };
})();
