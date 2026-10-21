/* 精读补充 1：准备篇 + Java 起步 + 面向对象（14 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['setup'] = {
    summary: [
      '开发装 JDK，运行只需 JRE；JVM 负责执行字节码。',
      '验证顺序：java -version → javac -version → 编译 → 运行。',
      '报“找不到命令”先查 PATH，报“公共类应在文件中声明”先查文件名。'
    ]
  };

  D['jdk'] = {
    summary: [
      '源码先编译成字节码，再由 JVM 翻译成本地指令，所以能跨平台。',
      'javac 负责编译，java 负责运行，两者不能混用。',
      '报错先分清楚是编译期（javac）还是运行期（java）。'
    ]
  };

  D['vars'] = {
    summary: [
      '整数默认 int，小数默认 double；long 加 L，float 加 F。',
      '小范围可以自动转大范围，大转小必须强转且可能丢精度。',
      '局部变量先赋值再使用，命名用小驼峰。'
    ]
  };

  D['operators'] = {
    summary: [
      '整数相除会丢小数，需要小数就转 double。',
      '&& 和 || 会短路，常用来避免空指针和除零。',
      '强转可能丢精度或溢出，转换前先想清楚范围。'
    ]
  };

  D['scanner'] = {
    summary: [
      '字符串用 nextLine，数字用 nextInt/nextDouble。',
      '混用时要处理换行残留，否则会读到空行。',
      '格式化输出用 printf，比字符串拼接更可控。'
    ]
  };

  D['control'] = {
    summary: [
      '数组长度固定、下标从 0 开始，越界抛 ArrayIndexOutOfBoundsException。',
      '已知次数用 for，未知次数用 while，至少执行一次用 do-while。',
      '分支条件注意顺序，循环注意边界。'
    ]
  };

  D['methods'] = {
    summary: [
      'Java 只有值传递：基本类型传副本，对象传引用的副本。',
      '重载看参数列表，不看返回值；重写发生在父子类之间。',
      '方法要短、名字要表达意图，一个方法只做一件事。'
    ]
  };

  D['class-object'] = {
    summary: [
      '类是模板，对象是实例；new 在堆上创建，变量在栈上存引用。',
      '构造器负责初始化，this 代表当前对象。',
      '对象内容比较用 equals，不要用 == 比地址。'
    ]
  };

  D['encapsulation'] = {
    summary: [
      '字段私有、方法公开，在方法里做校验。',
      '只暴露业务需要的操作，不要机械生成所有 setter。',
      'static 属于类，实例成员属于对象，别混用。'
    ]
  };

  D['inheritance'] = {
    summary: [
      '继承表达 is-a，组合表达 has-a；优先组合。',
      '子类构造前一定先构造父类。',
      '重写加 @Override，重载看参数列表。'
    ]
  };

  D['polymorphism'] = {
    summary: [
      '实例方法看运行时类型，字段看声明类型。',
      '向上转型自动、安全；向下转型先 instanceof。',
      '多态让调用方依赖抽象，而不是具体实现。'
    ]
  };

  D['abstract-interface'] = {
    summary: [
      '抽象类可以有状态，接口不能有实例字段。',
      '接口方法默认公共抽象，default 方法提供默认实现。',
      '面向接口编程，调用方依赖能力而不是实现。'
    ]
  };

  D['enum-record'] = {
    summary: [
      '枚举是类，常量是单例，可带字段和方法。',
      'record 适合不可变数据载体，自动生成样板方法。',
      'record 不适合需要无参构造器或可变状态的框架实体。'
    ]
  };

  D['packages-bean'] = {
    summary: [
      '包名对应目录，import 不递归子包。',
      '成员默认 private，方法按需公开。',
      'JavaBean = 私有字段 + 无参构造 + getter/setter。'
    ]
  };
})();
