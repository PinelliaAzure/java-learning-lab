/* 教材正文：数据库进阶（索引、B+ 树与执行计划 / 事务隔离、MVCC 与锁） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['db-index'] = {
    meta: '本章约 5800 字 · 建议 30 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '1.1 为什么学索引' },
      { p: '假设 book 表有二十万行，要按作者查一本书。没有索引时，数据库只能从第一页读到最后一页，逐行比对 author；有索引时，它像查字典先翻目录，再直接跳到目标。同一句 SQL，耗时可能从一秒多降到几毫秒，差别不在写法，而在“数据怎么被找到”。' },
      { p: '索引还决定锁的范围、排序要不要额外开销、分页能否走捷径，以及插入更新要付多少代价。很多人靠感觉建索引：哪个字段常查就加一个，结果表上挂了十几个索引，写入越来越慢，查询却没快多少。' },
      { p: '本章按“存储结构 → 查找过程 → 索引设计 → 执行计划”展开，SQL 都能在本地 MySQL 跑，建议边读边执行。' },

      { h: '1.2 没有索引时发生了什么' },
      { p: 'InnoDB 读写的最小单位不是行，而是页，默认一页 16KB。一页装若干行，页与页用双向链表串起来。没有索引可用时，InnoDB 从聚簇索引的最左叶子页开始，顺链表把每页读进内存，逐行判断条件，这叫全表扫描。' },
      { p: '它慢在两处：二十万行、每行两百字节约四千个页，即使每页只读一次也要几千次访问；条件命中率可能只有万分之一，其余九千九百九十九行读出来又丢掉。数据翻十倍，耗时基本也翻十倍。' },
      { code: 'CREATE TABLE book (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  title VARCHAR(120) NOT NULL,\n  author VARCHAR(60) NOT NULL,\n  price DECIMAL(10,2) NOT NULL\n) ENGINE=InnoDB;\n\n-- 此时没有任何二级索引\nEXPLAIN SELECT id, title, price FROM book WHERE author = \'Tom\';', title: 'demo.sql' },
      { out: 'type=ALL  key=NULL  rows=198432  Extra=Using where' },
      { p: 'type=ALL 是全表扫描，key=NULL 是没用索引，rows 是优化器估算的扫描行数。它是估算值，来自统计信息，但量级可信。看到这一行，基本可以判定这条 SQL 会随数据量变慢。' },
      { p: '索引的本质是用额外的空间和写入代价，换读取时的定位能力。每建一个索引，插入就要多写一棵 B+ 树，更新索引列要删旧插新。理解这个交换关系，才不会被“索引越多越快”带偏。' },

      { h: '1.3 B+ 树：页、扇出与树高' },
      { p: '为什么不用哈希表、二叉树或红黑树？需求是既要等值查询，也要范围查询、排序和最左前缀匹配。哈希等值查找很快，但不保序，范围查询只能全扫，所以 InnoDB 只在自适应哈希索引里用它。' },
      { p: '二叉树保序，但每个节点只存一个键、最多两个子节点，二十万行就有约十八层，每下一层都可能是一次随机磁盘读。B 树把节点做大、存很多键，树高骤降；B+ 树又改了两点：非叶子只存键不存数据，叶子存数据并用链表相连。' },
      { flow: ['从根节点开始', '比较键值选择子节点', '下降到叶子节点', '页内二分查找', '命中后取主键或整行', '需要时回表'] },
      { p: '第一点让扇出变大。16KB 的页，每个键加指针约 14 字节，能放一千一百多个键，也就是每个非叶子节点有一千多个孩子。三层树约能索引两千万行，查一行只需三次页访问，根和第二层几乎常驻缓冲池。' },
      { p: '第二点让范围查询变快：找到起点后顺叶子链表往后读，不必回根节点；非叶子不存数据，同样大小的页能装更多键，树高更低。叶子内是有序数组，可二分查找；跨页是顺序 IO，比随机 IO 快一个数量级。' },
      { p: 'B+ 树的非叶子页里存的是“键 + 子页号”：BIGINT 主键 8 字节，页号 6 字节，加记录头约 14 字节。一页 16KB，去掉页头、页目录与页尾，可用约 15KB，能放一千多个条目，也就是每个非叶子节点有一千多个孩子，这个数字叫扇出。' },
      { p: '扇出决定树高。两千万行、扇出一千，树高就是三层：根一页、第二层约一千页、叶子约两百万页。查一行只需三次页访问，而根与第二层几乎常驻缓冲池，真正可能落盘的只有最后那个叶子页。所谓“索引把几千万行压成两三次 IO”，说的就是这个几何关系。' },
      { p: '叶子页内部也不是纯二分。页里的记录按主键串成单链表，另有页目录，每隔四到八条记录放一个槽，槽里存偏移量。查找时先对槽二分，锁定很小的区间，再顺链表走几步。顺序扫描时页内仍要逐条走链表，这是全表扫描慢在页内的原因。' },
      { p: '页的填充率也影响树高。按主键顺序插入，新记录总落在最右页，满了才分裂，利用率接近满页；随机插入会在中间分裂，两页各剩一半，索引文件更大、树更高。同样的数据量，UUID 主键的索引往往比自增主键大不少。' },
      { code: '-- 查看索引页数与占用大小（MySQL 8.0）\nSELECT index_name, stat_name, stat_value,\n       stat_value * @@innodb_page_size / 1024 / 1024 AS size_mb\nFROM mysql.innodb_index_stats\nWHERE database_name = \'demo\'\n  AND table_name = \'book\'\n  AND stat_name IN (\'size\', \'n_leaf_pages\');\n\n-- 统计信息不准时重新采样\nANALYZE TABLE book;', title: 'index-size.sql' },

      { h: '1.4 聚簇索引与二级索引' },
      { p: 'InnoDB 是索引组织表：数据就存在主键索引的叶子里。这棵树叫聚簇索引，叶子存完整行，所以按主键查一行，找到叶子就拿到所有列。' },
      { p: '没有主键时，InnoDB 选第一个所有列 NOT NULL 的唯一索引当聚簇索引；再没有就生成隐藏的 6 字节 rowid。所以“没主键的表”并非没有聚簇索引，只是你无法控制它。' },
      { p: '其余索引叫二级索引，叶子不存整行，只存“索引列值 + 主键值”。先在这棵树找到主键，再回聚簇索引取整行，这个动作叫回表。' },
      { code: 'CREATE INDEX idx_author ON book(author);\n\nEXPLAIN SELECT id, title, price FROM book WHERE author = \'Tom\';', title: 'demo.sql' },
      { out: 'type=ref  key=idx_author  rows=126  Extra=NULL' },
      { p: 'type 从 ALL 变成 ref，rows 从近二十万降到一百多，索引生效了。Extra 为空说明还要回表：二级索引里只有 author 和 id。回表是随机 IO，行数一多代价迅速上升。' },
      { p: '这也是主键要短、要自增的原因：主键值冗余存在每个二级索引里，主键越长索引越大；主键无序会让插入位置随机，频繁页分裂。自增主键总在最后一页追加，最省事。' },
      { p: '二级索引叶子只存索引列加主键，一条索引项通常几十字节；聚簇索引叶子要存整行。同一张表，二级索引常比聚簇索引小一个量级。这解释了两个现象：全索引扫描比全表扫描便宜；count(*) 会挑最小的二级索引来数，因为只数索引项，不读整行。' },

      { h: '1.5 回表与覆盖索引' },
      { p: '回表次数取决于二级索引命中的行数。找到一万行就要回表一万次，每次都是随机页访问，优化器算完账可能干脆放弃索引改全表扫描——顺序扫全表反而更快。这是“索引存在却没用上”的常见原因。' },
      { p: '如果查询需要的列全在二级索引里，就不用回表，这叫覆盖索引，Extra 显示 Using index。' },
      { code: 'CREATE INDEX idx_author_price ON book(author, price);\n\n-- 查询列都在索引里：覆盖索引\nEXPLAIN SELECT author, price FROM book WHERE author = \'Tom\';\n\n-- 多查一个 title：必须回表\nEXPLAIN SELECT author, price, title FROM book WHERE author = \'Tom\';', title: 'demo.sql' },
      { out: '第一条：type=ref  key=idx_author_price  Extra=Using index\n第二条：type=ref  key=idx_author_price  Extra=NULL' },
      { p: '回表的代价不在次数，而在随机性。命中一百行，就拿一百个主键回聚簇索引各查一次。主键自增时，二级索引里的主键大致递增，回表访问的页也大致相邻，缓冲池命中率高；主键是 UUID 时，回表落点随机，一百次可能是一百次磁盘读。' },
      { p: 'MRR 是缓解手段：先把要回表的主键收集排序，再按页批量读，把随机 IO 尽量变成顺序 IO，Extra 会显示 Using MRR。它只能改善访问顺序，救不了“命中行数太多”。' },
      { code: '-- 命中行数不同，优化器的选择可能完全不同\nEXPLAIN SELECT id, title FROM book WHERE author = \'Tom\';\n\nSET optimizer_switch = \'mrr=on,mrr_cost_based=off\';\nEXPLAIN SELECT id, title FROM book WHERE author = \'Tom\';\n\n-- 范围极大时，可能直接放弃索引\nEXPLAIN SELECT id, title FROM book WHERE price > 1;', title: 'mrr.sql' },
      { table: { head: ['命中行数', '回表次数', '优化器倾向', '建议'], rows: [
        ['几行到几十行', '同命中行数', '走二级索引', '正常，无需干预'],
        ['几百到几千行', '同命中行数', '比较回表与全表成本', '用覆盖索引或缩小范围'],
        ['几万行以上', '同命中行数', '常改为全表扫描', '分页改写或走覆盖索引']
      ] } },

      { h: '1.6 联合索引与最左前缀：范围截断与排序' },
      { p: '联合索引按多列排序。INDEX(a, b, c) 先按 a 排，a 相同按 b，b 相同按 c，像电话簿先姓后名：只知道名、不知道姓，就无法直接定位。' },
      { p: '这就是最左前缀原则：只能从最左列开始连续使用。该索引支持 (a)、(a,b)、(a,b,c)，不能跳过 a 直接用 b。但“不能定位”不等于不能用：WHERE b = 2 仍可能走覆盖索引的全索引扫描，只是退化成扫整棵树。' },
      { code: '-- 已有 INDEX(author, price)\nEXPLAIN SELECT * FROM book WHERE author = \'Tom\';\nEXPLAIN SELECT * FROM book WHERE price > 50;\nEXPLAIN SELECT * FROM book WHERE author = \'Tom\' AND price > 50;', title: 'demo.sql' },
      { out: '1) type=ref    key=idx_author_price  rows=126\n2) type=index  key=idx_author_price  rows=198432  Extra=Using where\n3) type=range  key=idx_author_price  rows=89' },
      { p: '第二条 type=index 是扫整棵索引树，比 ALL 好一点（只读索引），但仍是线性扫描。看到 type=index 别以为万事大吉。' },
      { p: '范围查询会截断后面的列。author = ? AND price > 50 AND publish_year = 2024 中，前两列能定位，publish_year 不能——price 是范围，范围内的 publish_year 并不全局有序。它只能作为索引条件下推的过滤条件，Extra 显示 Using index condition。' },
      { table: { head: ['查询条件', '能否定位', '用到的列', '说明'], rows: [
        ['author = ?', '能', 'author', '最左列，直接定位'],
        ['author = ? AND price > ?', '能', 'author + price', '等值加范围，顺序正确'],
        ['price > ?', '不能定位', '无（可能全索引扫描）', '跳过最左列'],
        ['author = ? AND price = ? AND year = ?', '能（前两列）', 'author + price', 'year 靠索引下推过滤']
      ] } },
      { p: '设计时把等值多、区分度高的列放左边，范围列放右边。但别机械套用：若查询总只带 price，(author, price) 帮不上忙，可能要单独建索引或改写查询。' },
      { p: '排序同样吃这条规则。索引里的列本来就有序，所以 WHERE author = ? ORDER BY price 在 (author, price) 上可以顺着索引读，Extra 里不会出现 Using filesort；而 ORDER BY publish_year 就必须把结果集再排一遍。' },
      { p: '把 ORDER BY 的列追加到索引尾部想省排序，只有当前面的等值列、范围列与排序列能拼成一个连续前缀时才成立——中间断一列，排序就白搭。MySQL 8.0 之前没有真正的降序索引，ORDER BY price DESC, year ASC 这种方向混排一定 filesort；8.0 之后建 (price DESC, year ASC) 才生效。' },
      { note: '<b>验证方法：</b>EXPLAIN 的 key_len 是把用到的列长度累加出来的，用它核对「我以为用上的列」是否真的都用上了；Extra 里同时没有 Using filesort 与 Using temporary，才算定位和排序都走了索引。' },

      { h: '1.7 覆盖索引的边界与索引下推' },
      { p: '覆盖索引的条件比想象中严格：SELECT、WHERE、ORDER BY、GROUP BY 用到的列必须全部落在同一个索引里，而且 WHERE 必须能从最左列用起。只带 price 的查询，虽然 (author, price) 里含 price，也只能扫整棵索引，Extra 是 Using index 但 type 是 index，并不省多少。' },
      { p: '另一个误解是“覆盖一定比回表快”。覆盖省掉回表，但索引项变宽后每页能放的条目变少，扫同样的行数要读更多页。把十几个列塞进一个索引来覆盖所有查询，索引可能比表还大，写入维护成本翻几倍。合理做法是给最高频的两三种查询各建一个三到五列的联合索引。' },
      { code: '-- 反例：为覆盖所有查询建一个十几列的巨型索引\nCREATE INDEX idx_bad ON book(author, price, title, subtitle, intro, isbn, ...);\n\n-- 修正：只覆盖高频查询，其余接受回表\nCREATE INDEX idx_author_price ON book(author, price);\nSELECT author, price FROM book WHERE author = \'Tom\';        -- Using index\nSELECT author, price, title FROM book WHERE author = \'Tom\'; -- 回表\n\n-- 跳过最左列的“覆盖”只是全索引扫描\nEXPLAIN SELECT price FROM book WHERE price > 50;            -- type=index', title: 'cover.sql' },
      { p: '索引下推解决另一类浪费。WHERE author LIKE \'T%\' AND price > 50 中，price 不能用于定位，但它在索引里。没有 ICP 时，引擎先把所有 author 以 T 开头的行回表，再由 Server 层过滤 price；有 ICP 时，引擎在索引上就丢掉 price 不满足的条目，只对剩下的回表，Extra 显示 Using index condition。' },
      { p: 'ICP 只对二级索引有效，聚簇索引的整行本来就在叶子里，没有下推的必要；它也不适用于存储函数和子查询。看到 Using index condition 要知道索引帮了忙，但查询仍可能回表，别和 Using index 混为一谈。' },
      { note: '<b>一句话判断：</b>Extra 出现 Using index，说明查询在索引里就完成了；出现 Using index condition，说明用了索引下推，但可能仍要回表。' },

      { h: '1.8 读懂 EXPLAIN 与容易忽略的列' },
      { p: 'EXPLAIN 在 SQL 前加上，MySQL 会返回优化器打算怎么执行，而不真正执行。EXPLAIN ANALYZE 会真正执行并给出实际耗时，MySQL 8.0.18 起可用。' },
      { table: { head: ['列', '含义', '关注点'], rows: [
        ['type', '访问类型', 'ALL 最差，至少到 range，最好 ref 或 const'],
        ['possible_keys', '可能用到的索引', '候选集合，不代表最终选择'],
        ['key', '实际使用的索引', 'NULL 表示没用索引'],
        ['key_len', '索引使用的字节数', '判断联合索引用了几列'],
        ['rows', '预估扫描行数', '越小越好，注意是估算'],
        ['Extra', '补充信息', 'Using index 好；filesort、temporary 需注意']
      ] } },
      { p: 'type 的好坏顺序大致是：system > const > eq_ref > ref > range > index > ALL。const 是按主键或唯一索引查一行；eq_ref 是 JOIN 时被驱动表按唯一索引匹配；ref 是普通索引等值；range 是范围扫描；index 是扫整棵索引；ALL 是全表。日常优化，把 ALL 和 index 消掉，通常能解决大部分问题。' },
      { p: 'Extra 的高频值也要认识。Using index：覆盖索引，不需回表。Using where：引擎取回行后，Server 层还要再过滤。Using index condition：索引条件下推，部分过滤在引擎层完成。Using filesort：额外排序。Using temporary：用了临时表，常见于 GROUP BY 或 DISTINCT 无法走索引。' },
      { p: '看计划别只盯 key。一条 SQL 可能用了索引，但 rows 估算几十万，仍然慢；也可能 type=ALL，但表只有几百行，根本无所谓。把 type、rows、Extra 结合起来，再结合实际数据量和响应时间，才能得出可靠结论。' },
      { p: 'key_len 是实际用到的索引字节数，可以反推用了几列。BIGINT 占 8 字节、INT 占 4、DATE 占 3、DATETIME 占 5；VARCHAR(20) 的 utf8mb4 是 20×4+2=82 字节，允许 NULL 再加 1。联合索引 (a, b) 上 key_len 显示 8，说明只用 a；显示 16，说明两列都用上了。' },
      { p: 'filtered 是 Server 层过滤后预估剩下的百分比，rows 乘以它才是真正参与后续 JOIN 的行数。如果 rows 很小、实际却慢，多半是统计信息不准，可先 ANALYZE TABLE，8.0 还能对低区分度列建直方图。EXPLAIN 只给计划，EXPLAIN ANALYZE 才给实际耗时与真实行数，两者 rows 差距大就是成本模型失准的信号。' },

      { h: '1.9 索引失效的常见写法' },
      { p: '“建了索引却没走”是排查慢查询时最常见的问题。多数情况不是数据库笨，而是写法让索引无法使用。' },
      { p: '第一类，在索引列上做函数或运算。WHERE YEAR(created_at) = 2024、WHERE price * 2 > 100、WHERE LEFT(title, 3) = \'Java\'，都会让索引列变成计算结果，B+ 树里的有序值对不上。改成范围条件：created_at >= \'2024-01-01\' AND created_at < \'2025-01-01\'。' },
      { p: '第二类，隐式类型转换。author 是 VARCHAR，却写 WHERE author = 100，MySQL 会把列转成数字再比较，等同于在列上套了函数。字符串列必须用字符串比较。' },
      { p: '第三类，前导通配符。LIKE \'%Tom\' 和 LIKE \'%Tom%\' 无法利用索引的最左有序性，LIKE \'Tom%\' 可以。需要任意位置匹配时，考虑全文索引或搜索引擎。' },
      { p: '第四类，OR 连接了没有索引的列。WHERE author = \'Tom\' OR price > 50，若 price 没有索引，优化器可能放弃 author 索引改全表扫描。可以拆成两条用 UNION，或两边都建索引。' },
      { p: '第五类，不等于与 NOT IN。!=、<>、NOT IN 通常要扫大量行，优化器判断走索引再回表不如全表扫，于是放弃索引。第六类，字符集不一致的 JOIN：关联列一个 utf8mb4、一个 utf8，比较前要转换，索引同样失效。' },
      { p: '还有一点常被误解：索引失效不等于 SQL 写错。优化器基于成本，当它估算“走索引要回表十万次”比“顺序扫全表”更贵时，会主动选择全表扫描。判断标准不是“有没有用索引”，而是“有没有更快”。' },

      { h: '1.10 索引设计原则与验证方法' },
      { p: '索引设计的步骤：先找出真正慢的 SQL，而不是凭感觉加索引；再看 WHERE、ORDER BY、GROUP BY、JOIN 用了哪些列；按“等值在前、范围在后”组织联合索引；用 EXPLAIN 验证 type、key、rows；最后观察写入性能与磁盘占用，删掉没被使用的索引。' },
      { p: '选择性等于不重复值数量除以总行数。性别只有两三个值，选择性极低，建了索引也要回表一半数据，基本没用；手机号、订单号几乎唯一，选择性接近 1，非常适合。可以用 COUNT(DISTINCT col) / COUNT(*) 估算。' },
      { p: '几个常见原则：联合索引通常优于多个单列索引，因为能同时服务多种前缀查询；长字符串用前缀索引 INDEX(email(20))，前缀太短会降低选择性；避免重复索引，(a) 和 (a, b) 同时存在时 (a) 是冗余的；单表索引控制在三到五个，写多读少的表更要克制。' },
      { note: '<b>反例提醒：</b>给每一列都建索引，等于给每次写入增加十几次 B+ 树维护，插入吞吐可能下降一半，而查询只快了其中一两种。索引是设计出来的，不是堆出来的。' },
      { p: '设计前先给查询分类：等值点查、范围扫描、排序分页、聚合统计、JOIN 关联。一条 SQL 只有一个主路径，一个联合索引也只对一类查询最优。找慢 SQL 要看 performance_schema.events_statements_summary_by_digest，按总耗时排序，而不是凭感觉挑“看起来复杂”的语句。' },
      { p: '区分度不是唯一标准。status 只有几种取值，看似选择性极低，但如果百分之九十九的行都是 0、查询却总查 1，命中比例很低，这个索引依然划算。判断依据是“目标值占全表的比例”，而不是“不同值有几个”。反之，性别列若查询各占一半，建了也要回表一半，基本没用。' },
      { p: '前缀索引只适合字符串：INDEX(email(20)) 能用于等值和前缀匹配，但不能覆盖查询、不能支持 ORDER BY，也无法做更精细的比较。前缀长度要让选择性接近整列，可以用 COUNT(DISTINCT LEFT(email, n)) / COUNT(*) 逐档试，通常取到 0.9 以上就够。' },
      { p: '冗余索引要定期清理。sys.schema_redundant_indexes 会列出被更长索引覆盖的索引，(a) 被 (a, b) 覆盖就可以删；但 (a, b) 不能替代 (b) 或 (b, a)。sys.schema_unused_indexes 依赖统计，观察期要覆盖完整的业务周期，否则容易误删月末才用的索引。' },
      { code: '-- 找冗余索引与长期未使用的索引\nSELECT * FROM sys.schema_redundant_indexes;\nSELECT * FROM sys.schema_unused_indexes;\n\n-- 对比真实行数再决定是否强制索引\nEXPLAIN ANALYZE SELECT * FROM book WHERE author = \'Tom\';', title: 'index-audit.sql' },
      { p: 'FORCE INDEX 要慎用。它绕过优化器的成本判断，在数据分布变化后会从“临时救火”变成长期事故；先用 EXPLAIN ANALYZE 看真实行数与循环次数，确认是统计信息问题就 ANALYZE TABLE，确认是索引设计问题就改索引。' },
      { p: '还有两种“看似失效、实则换了路径”的情况。OR 两边都有索引时，优化器可能用 index merge 把两个索引的结果取并集，Extra 显示 Using union；它比全表扫描好，但通常不如一个合适的联合索引。NOT IN 与 != 也不是绝对不用索引，命中比例很低时仍会走 range，关键看估算的行数占比。' },
      { p: '8.0 支持函数索引，CREATE INDEX idx_year ON book((YEAR(created_at))) 可以让 WHERE YEAR(created_at) = 2024 走索引，但它只为这一种表达式服务，写法和维护成本都高。能改写成 created_at 的范围条件，就别用函数索引。' },

      { h: '1.11 本章小结' },
      { list: [
        'InnoDB 以 16KB 页为单位读写，没有索引只能顺着叶子链表全表扫描。',
        'B+ 树非叶子只存键、叶子存数据并用链表相连，兼顾等值、范围与排序。',
        '聚簇索引叶子存整行，二级索引叶子存索引列加主键，查非索引列需要回表。',
        '联合索引遵循最左前缀，等值在前、范围在后；范围列之后的列只能靠索引下推过滤。',
        '覆盖索引避免回表，Extra 显示 Using index；索引失效多是函数、隐式转换、前导通配符导致。',
        'EXPLAIN 重点看 type、key、rows、Extra，标准是更快的路径，而不是有没有用索引。'
      ] },

      { h: '1.12 常见追问' },
      { list: [
        '<b>为什么用 B+ 树而不是 B 树？</b>非叶子不存数据，扇出更大、树高更低；叶子链表让范围查询只需顺序扫描。',
        '<b>一张表能建多少索引？</b>没有硬上限，但每个索引都占空间并拖慢写入，实践上单表三到五个。',
        '<b>主键为什么建议自增？</b>顺序插入避免页分裂，主键短则二级索引更小；UUID 随机插入会降低页利用率。',
        '<b>联合索引 (a, b) 和两个单列索引的区别？</b>联合索引能同时服务 a 与 a+b，且可能覆盖查询；两个单列索引通常只能用一个，或走索引合并。',
        '<b>回表一定慢吗？</b>不一定。命中行数少时回表很快；命中行数多时优化器可能放弃索引改全表扫描。'
      ] },

      { h: '1.13 自测与练习' },
      { ol: [
        '建一张二十万行的 book 表，分别在有、无 author 索引时执行同一条查询，记录耗时与 EXPLAIN 的 type、rows。',
        '为 (author, price) 建联合索引，写出三条分别只带 author、只带 price、两列都带的查询，解释各自的执行计划。',
        '把 SELECT * FROM book WHERE author = ? 改写成覆盖索引查询，说明 Extra 的变化和原因。',
        '找出三种会让索引失效的写法，各写一条 SQL，并用 EXPLAIN 验证 key 为 NULL。',
        '解释为什么 SELECT count(*) 可能比 SELECT count(title) 快，以及它能不能走二级索引。'
      ] }
    ]
  };

  T['db-lock'] = {
    meta: '本章约 5800 字 · 建议 32 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '2.1 为什么学事务与锁' },
      { p: '转账是最经典的例子：从 A 账户扣一百，给 B 账户加一百，两步必须一起成功或一起失败。如果扣完款程序崩溃，钱就凭空消失了。事务就是把这组操作打包成一个不可分割的单位，数据库负责保证它要么全部生效，要么全部不生效。' },
      { p: '但事务不只有“成功或失败”这一面。两个事务同时读写同一批数据时，还会出现新问题：读到别人没提交的脏数据，同一事务两次读到不一样的结果，范围查询凭空多出几行。隔离级别决定允不允许这些现象，MVCC 和锁是它的实现手段。' },
      { p: '本章回答三个问题：并发读写到底会出什么错；MySQL 默认的可重复读怎么做到；为什么更新一行会锁住一片、甚至把表锁住。把这三个问题串起来，死锁、长事务、锁等待超时就不神秘了。' },

      { h: '2.2 并发读写会出什么错' },
      { p: '先复习 ACID：原子性靠 undo log，失败时撤销已做的修改；一致性是业务约束不被破坏；隔离性处理并发事务间的可见性；持久性靠 redo log 保证提交不丢。四者中隔离性最容易出问题。' },
      { p: 'SQL 标准定义了三种读异常。脏读：事务 A 读到了事务 B 尚未提交的修改，B 一旦回滚，A 读到的就是从未存在过的数据。不可重复读：A 两次读同一行，中间 B 修改并提交，两次结果不同。幻读：A 两次按同一条件查询，中间 B 插入或删除并提交，第二次多出或少了几行。' },
      { p: '还有一种标准之外但很常见的异常：丢失更新。两个事务都读到余额一百，各自加十再写回，最后余额只有一百一十，少加了一次。它本质上是“读—改—写”没有串行化，应用层的乐观锁（版本号）或数据库的行锁都能解决。' },
      { code: '-- 会话 A\nSTART TRANSACTION;\nUPDATE account SET balance = balance - 100 WHERE id = 1;\n-- 尚未提交\n\n-- 会话 B（读未提交）\nSET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\nSTART TRANSACTION;\nSELECT balance FROM account WHERE id = 1;  -- 读到 A 未提交的值\nROLLBACK;\n\n-- 会话 A\nROLLBACK;  -- B 刚才读到的“余额”从未真实存在', title: 'demo.sql' },
      { p: '这段演示的是脏读。READ UNCOMMITTED 允许读未提交版本，代价是读到的东西随时可能被撤销。生产环境几乎不会用它，它的价值主要是帮助理解隔离级别的边界。' },

      { h: '2.3 四种隔离级别与实现差异' },
      { p: '隔离级别是“用并发度换一致性”的旋钮。级别越高，能看到的异常越少，但锁和等待越多；级别越低，并发越高，数据越可能不一致。' },
      { table: { head: ['隔离级别', '脏读', '不可重复读', '幻读', '实现方式'], rows: [
        ['READ UNCOMMITTED', '可能', '可能', '可能', '直接读最新版本'],
        ['READ COMMITTED', '不可能', '可能', '可能', '每条语句新建 Read View'],
        ['REPEATABLE READ', '不可能', '不可能', '可能（快照读可避免）', '首次读建视图加间隙锁'],
        ['SERIALIZABLE', '不可能', '不可能', '不可能', '读也加锁，串行执行']
      ] } },
      { p: 'MySQL InnoDB 默认是 REPEATABLE READ。它用 MVCC 让普通 SELECT 读到事务开始时的快照，所以不可重复读不会发生；对于当前读（加锁读、更新、删除），它用临键锁把范围锁住，阻止其他事务插入，从而在绝大多数场景下避免幻读。' },
      { p: '查看和修改很简单：SELECT @@transaction_isolation 查看当前会话；SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED 修改会话级别。注意 MySQL 5.7 的变量名是 tx_isolation，8.0 才改成 transaction_isolation。' },
      { p: '选择建议：多数业务用默认的 RR；只有必须串行化才用 SERIALIZABLE；READ COMMITTED 能减少间隙锁与死锁，但要接受不可重复读，并确认 binlog 为 ROW。' },
      { p: '同样是 REPEATABLE READ，不同数据库的行为并不一样。SQL 标准只规定现象，不规定实现。MySQL 的 RR 能避免大部分幻读，是因为快照读用 MVCC 固定视图、当前读用临键锁锁住范围；而某些数据库的 RR 只保证读已提交加行锁，幻读照样发生。' },
      { p: 'RC 在 MySQL 里有两个额外特征：一是每条语句新建 Read View，所以同一事务前后两条 SELECT 可能看到不同数据；二是普通范围扫描基本不加间隙锁，锁范围小、并发高、死锁少。代价是 binlog 必须是 ROW，否则 STATEMENT 格式下从库回放会出现主从不一致。' },
      { p: 'SERIALIZABLE 会把普通 SELECT 隐式变成 SELECT ... FOR SHARE，读也加锁，事务之间近似串行。它适合一致性要求极高、并发很低的场景，比如账务日终结算。对大多数业务，默认 RR 加上必要的唯一约束就够，不必为了“更安全”盲目升级隔离级别。' },
      { table: { head: ['隔离级别', 'Read View 时机', '间隙锁', '注意点'], rows: [
        ['READ UNCOMMITTED', '不建视图', '基本不用', '能读未提交，几乎不用于生产'],
        ['READ COMMITTED', '每条语句新建', '普通扫描基本不加', '需 binlog=ROW，接受不可重复读'],
        ['REPEATABLE READ', '首次快照读建一次', '范围扫描会加', 'InnoDB 默认，兼顾一致与并发'],
        ['SERIALIZABLE', '读也加锁', '由锁覆盖', '并发极低，仅强一致场景']
      ] } },

      { h: '2.4 MVCC：隐藏字段、undo 与 purge' },
      { p: 'MVCC 的核心思想是：修改一行时不覆盖旧值，而是保留旧版本，让不同事务按自己的视角读取不同版本。这样读操作不需要加锁，读写不会互相阻塞。' },
      { p: 'InnoDB 在聚簇索引的每一行上藏了三个字段。DB_TRX_ID 记录最后修改这行的事务 id；DB_ROLL_PTR 指向 undo log 里的上一版；DB_ROW_ID 是没主键时用的隐藏行号。更新时旧版本写进 undo log，新版本的 DB_ROLL_PTR 指向旧版本，形成一条版本链，链头是最新值。' },
      { p: '这三个字段只存在于聚簇索引。二级索引的叶子只有索引列和主键，不存版本信息。所以走二级索引必须回表拿到整行，才能判断版本是否可见。这也是覆盖索引在一致性读下要小心的原因。' },
      { p: 'undo log 里的旧版本不会立刻删除：只要还有事务可能读到它就必须保留，等没有活跃事务需要时，后台 purge 线程才清理。这就是长事务让 undo 膨胀、查询变慢的原因。' },
      { p: 'undo log 不是一种东西。INSERT 产生的 insert undo 只用于回滚，事务一提交就可以丢弃；UPDATE、DELETE 产生的 update undo 还要供 MVCC 读旧版本，必须挂到 history list 上等 purge 清理。所以“更新多”的表比“插入多”的表更容易让 undo 膨胀。' },
      { p: 'purge 线程从 history list 最旧的一端开始清理，判断标准是当前最老的活跃 Read View：只要还有事务可能看到某个旧版本，它就不能删。长事务把这条水位线卡住，后面的 undo 全部堆积，undo 表空间从几百 MB 涨到几十 GB，磁盘和备份都跟着遭殃。' },
      { p: '版本链过长还有性能后果：快照读要顺着 DB_ROLL_PTR 一版一版往回找，每跳一次都可能读一个 undo 页。表现为查询变慢、IO 升高但 CPU 不高，而 EXPLAIN 看不出问题。这时应该去查长事务，而不是继续加索引。' },
      { code: '-- 找运行最久的事务与它改了多少行\nSELECT trx_id, trx_state, trx_started,\n       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS seconds,\n       trx_rows_modified, trx_mysql_thread_id\nFROM information_schema.innodb_trx\nORDER BY trx_started\nLIMIT 10;', title: 'long-trx.sql' },

      { h: '2.5 Read View 与可见性判断' },
      { p: '有了版本链，还需要规则决定“我该看哪个版本”，这由 Read View 提供。它是某个时刻拍下的快照，含四个信息：m_ids 是当时活跃（未提交）事务的 id 列表；min_trx_id 是其中最小的；max_trx_id 是下一个将分配的 id；creator_trx_id 是创建视图的事务自己。' },
      { flow: ['取版本链头', '读该版本 DB_TRX_ID', '等于自己则可见', '小于最小活跃 id 则可见', '大于等于最大 id 则不可见', '在活跃列表中则不可见', '沿 undo 链取上一版本'] },
      { p: '规则是：trx_id 等于 creator_trx_id，自己改的，可见；小于 min_trx_id，修改它的事务早已提交，可见；大于等于 max_trx_id，是视图创建后才开始的事务，不可见；落在 m_ids 里，当时还活跃，不可见。不可见就顺 DB_ROLL_PTR 找上一版本，重复判断。' },
      { p: 'RC 和 RR 的差别就在 Read View 的创建时机。RC 在每条 SELECT 开始时都新建视图，所以能看到别的会话刚提交的修改，产生不可重复读。RR 只在事务里第一次快照读时创建一个，之后一直复用，所以整个事务看到同一个快照。' },
      { p: '常见误区：RR 的快照不是 BEGIN 时建的，而是第一次 SELECT 时建的。先 BEGIN，隔十秒才查询，看到的是十秒后的数据。想在 BEGIN 时固定快照，用 START TRANSACTION WITH CONSISTENT SNAPSHOT。' },

      { h: '2.6 快照读与当前读' },
      { p: 'MVCC 只服务于“快照读”，即普通 SELECT。加锁读和写操作走“当前读”：总是读最新已提交的版本，并对读到的记录加锁。SELECT ... FOR UPDATE、FOR SHARE、UPDATE、DELETE、INSERT 都属于当前读。' },
      { code: '-- 会话 A\nSTART TRANSACTION;\nSELECT balance FROM account WHERE id = 1;             -- 快照读，看到旧值\nSELECT balance FROM account WHERE id = 1 FOR UPDATE;  -- 当前读，看到最新值并加锁\nUPDATE account SET balance = balance - 100 WHERE id = 1;\nCOMMIT;', title: 'demo.sql' },
      { p: '同一条 SQL，加不加 FOR UPDATE，读到的可能是两个不同的值。在一个事务里混用快照读和当前读，就会出现“查出来的余额和更新时用的不一致”的困惑，也能解释很多“代码读到的值和库里看到的值对不上”的问题。' },
      { p: 'RR 下，快照读本身就能避免幻读，因为看到的是固定快照，别人插入的行不会出现在视图里；当前读则靠临键锁阻止范围内插入。所以 InnoDB 的 RR 是“快照读 + 当前读加锁”两套机制配合的结果。' },
      { note: '<b>排查技巧：</b>如果两条一样的 SELECT 在同一个事务里结果不同，先确认隔离级别，再确认中间有没有执行 UPDATE 或 FOR UPDATE——当前读会刷新可见范围。' },

      { h: '2.7 行锁、间隙锁与临键锁' },
      { p: 'InnoDB 的锁加在索引上，不是加在行号上。这是理解所有加锁行为的前提：锁的粒度取决于用了哪个索引、命中了哪些索引项。' },
      { table: { head: ['锁类型', '锁住什么', '典型触发'], rows: [
        ['记录锁', '某一条索引记录', '唯一索引等值命中'],
        ['间隙锁', '两条索引记录之间的开区间', '范围查询、等值未命中'],
        ['临键锁', '记录本身加它前面的间隙', 'RR 下范围扫描，左开右闭'],
        ['插入意向锁', '一个间隙内的插入位置', 'INSERT 前标记意图'],
        ['意向锁', '表级，表示想加行锁', '加行锁前自动加，分 IS 与 IX']
      ] } },
      { p: '记录锁只锁一行。间隙锁锁索引值之间的空隙：索引里有 5、10、15 时，(5,10)、(10,15) 都是间隙，它阻止别人插入。临键锁是记录锁加间隙锁，锁住 (5,10] 这样的左开右闭区间，是 RR 下范围扫描的默认方式。' },
      { p: '三种情况要记住：唯一索引等值命中，临键锁退化为记录锁，只锁一行；等值未命中，加间隙锁，防止别人插入这个值；非唯一索引或范围查询，加临键锁，锁住记录和它们之间的间隙。' },
      { p: '后果很严重：WHERE 没走索引时，InnoDB 无法定位记录，只能扫描全表并逐行加锁，效果接近表锁。很多人以为 UPDATE 只锁一行，实际上它可能把整张表锁住，直到事务提交。' },
      { p: 'InnoDB 的行锁加在索引记录上，但 INSERT 刚写入、事务还没提交时，记录上并没有显式的锁结构。别的会话要锁这条记录，会先看记录头的 DB_TRX_ID，发现事务未提交，才替它创建一个锁。这叫隐式锁，作用是省掉每次插入都写锁结构的开销。' },
      { p: '插入意向锁是一种特殊的间隙锁，表示“我想在这个间隙的某个位置插入”。多个事务对同一间隙的不同位置插入，插入意向锁互不阻塞；但间隙锁与插入意向锁冲突，这正是间隙锁能阻止插入的原因。间隙锁之间本身不冲突，两个事务可以同时锁住同一个间隙。' },
      { p: '自增主键还有一把表级锁。innodb_autoinc_lock_mode 有三种：0 是传统模式，语句结束才释放；1 是连续模式，简单插入用轻量锁，批量插入才升级；2 是交错模式，并发最高，但自增值不连续，且 binlog 必须是 ROW。互联网业务常用 2，传统业务用默认的 1。' },
      { table: { head: ['autoinc 模式', '行为', '适用'], rows: [
        ['0 传统', '语句级表锁，自增值连续', '老版本兼容，并发差'],
        ['1 连续（默认）', '简单插入轻量锁，批量申请', '大多数业务'],
        ['2 交错', '并发最高，值可能不连续', 'binlog=ROW 的高并发写入']
      ] } },

      { h: '2.8 加锁范围实战' },
      { p: '假设 id 是主键，表里有 5、10、15 三条记录。在 RR 下执行下面几条语句，加锁范围差别很大。' },
      { code: '-- 表内主键：5, 10, 15\nSTART TRANSACTION;\n\n-- ① 唯一索引等值命中：只锁 id = 10 这一行\nSELECT * FROM t WHERE id = 10 FOR UPDATE;\n\n-- ② 唯一索引等值未命中：锁住 (5, 10) 间隙\nSELECT * FROM t WHERE id = 7 FOR UPDATE;\n\n-- ③ 范围查询：锁住 (5, 15] 的临键区间\nSELECT * FROM t WHERE id > 5 AND id <= 15 FOR UPDATE;\n\n-- ④ 无索引列更新：扫描全表，锁住所有行与间隙\nUPDATE t SET status = 1 WHERE status = 0;', title: 'demo.sql' },
      { out: '① 代价最小，仅一行\n② 命中空区间，插入 7 会被阻塞\n③ 插入 8、12 都会被阻塞\n④ 近似表锁，其他写入几乎全部等待' },
      { p: '第②条最容易被忽略：查一个不存在的 id 为什么也会阻塞别人？因为 InnoDB 锁的不是“不存在的行”，而是值可能插入的那个间隙。这正是 RR 防止幻读的手段——你查不到，就别让人插进来。' },
      { p: '第④条是事故高发点。status 这种低区分度列通常没索引，UPDATE 时全表扫描加锁，其他写入全部排队，连接池很快被占满。解决办法：给条件列建索引，或把大批量更新拆成按主键分批的小事务。' },

      { h: '2.9 死锁：成因、重试与日志读法' },
      { p: '死锁是两个或多个事务各持对方需要的锁、互相等待，谁也无法推进。InnoDB 有死锁检测，发现环路后回滚其中一个事务，并返回错误 1213，SQLState 为 40001。' },
      { p: '最常见的成因是加锁顺序不一致：事务 A 先锁 1 再锁 2，事务 B 先锁 2 再锁 1，两边各持一把、各等一把，环路形成。间隙锁也会参与：两个事务各持相邻间隙，又想往对方间隙插入，插入意向锁互等。' },
      { code: '-- 会话 A：先锁 1\nSTART TRANSACTION;\nUPDATE account SET balance = balance - 100 WHERE id = 1;\n-- 会话 B：先锁 2\nSTART TRANSACTION;\nUPDATE account SET balance = balance - 100 WHERE id = 2;\n\n-- 回到 A：等 B 释放 2\nUPDATE account SET balance = balance + 100 WHERE id = 2;\n-- 回到 B：等 A 释放 1，形成环路\nUPDATE account SET balance = balance + 100 WHERE id = 1;\n-- ERROR 1213 (40001): Deadlock found when trying to get lock', title: 'demo.sql' },
      { p: '死锁不是“数据库坏了”，而是并发写入的固有风险。应用层必须能处理：捕获 1213 和 1205（锁等待超时），回滚当前事务，随机等待一小段时间后重试整个事务，并设重试上限。' },
      { code: 'public void transfer(long from, long to, BigDecimal amount) {\n    for (int i = 0; i < 3; i++) {\n        try {\n            txTemplate.executeWithoutResult(status -> {\n                accountMapper.deduct(from, amount);\n                accountMapper.add(to, amount);\n            });\n            return;\n        } catch (DeadlockLoserDataAccessException e) {\n            if (i == 2) throw e;\n            sleepQuietly(50L * (i + 1));  // 退避后重试整个事务\n        }\n    }\n}', title: 'TransferService.java' },
      { p: '两个关键点：重试的是整个事务而非单条 SQL，因为死锁回滚的是事务；退避时间随次数增加，避免多个事务同时醒来再次撞车。Spring 已把 1213 翻译成 DeadlockLoserDataAccessException。' },
      { p: '预防比处理更重要。固定加锁顺序最有效：转账总先锁 id 小的账户，批量更新按主键排序后逐条处理。其次是缩短事务、让 WHERE 走索引、避免在事务里做远程调用或等用户输入。' },
      { p: '死锁检测默认开启。每当一个事务要等锁，InnoDB 就沿着等待关系做深度优先搜索，看是否形成环路；有就选代价小的一方回滚。热点行高并发更新时，检测本身会消耗大量 CPU，这也是“明明没死锁却变慢”的原因之一。关闭检测能省 CPU，但只能靠 innodb_lock_wait_timeout 兜底，一般不推荐。' },
      { p: '读死锁日志要看三段：TRANSACTION 段列出每个事务持有的锁，lock_mode X locks rec but not gap 表示记录锁，locks gap before rec 表示间隙锁；WAITING FOR THIS LOCK TO BE GRANTED 说明它在等谁；最后的 WE ROLL BACK TRANSACTION 指出被牺牲的事务。结合索引名和 LOCK_DATA 里的主键值，就能还原加锁顺序。' },
      { p: '8.0 还可以直接查 performance_schema 的锁表，比解析文本日志方便。治理死锁的顺序是：先统一加锁顺序，再缩短事务，再让 WHERE 走索引，最后才是调参。调低锁等待超时只是让失败来得更快，并没有消除冲突。' },
      { code: '-- 谁在等谁，以及锁落在哪条索引记录上\nSELECT * FROM performance_schema.data_lock_waits;\n\nSELECT ENGINE_TRANSACTION_ID, OBJECT_NAME, INDEX_NAME,\n       LOCK_TYPE, LOCK_MODE, LOCK_DATA\nFROM performance_schema.data_locks;', title: 'lock-wait.sql' },

      { h: '2.10 长事务、事务注解与锁等待排查' },
      { p: '长事务指运行很久、迟迟不提交的事务。它不像死锁那样立刻报错，而是缓慢拖垮整个实例，因此更危险。' },
      { p: '第一，undo log 无法回收：只要长事务还可能读旧版本，purge 就不能清理它之后的 undo，版本链越拉越长，快照读越来越慢。第二，占锁时间长，其他事务排队，连接池被占满后服务不可用。第三，可能持有 MDL，让 ALTER TABLE 一直等，阻塞后续所有访问。第四，大事务在从库回放耗时长，造成主从延迟。' },
      { p: '排查长事务，查 information_schema.innodb_trx 的 trx_started、trx_mysql_thread_id、trx_state，再配合 SHOW PROCESSLIST 看连接在做什么。KILL 是应急手段，更该追问：它为什么跑这么久？' },
      { p: '治理做法：把大事务拆小，如批量更新按主键分批提交；事务里只放数据库操作，把 HTTP 调用、文件读写、消息发送挪到事务外；设置 innodb_lock_wait_timeout 与事务超时；评审时检查 @Transactional 是否标在过大的方法上。' },
      { note: '<b>一句话原则：</b>事务要短、更新顺序要一致、WHERE 要走索引。这三点能避免绝大多数锁问题。' },
      { p: '@Transactional 有几个高频坑：同类内部方法互相调用不走代理，内层注解失效；异常被 catch 后没有重新抛出，事务不会回滚；默认只对 RuntimeException 回滚，受检异常要显式写 rollbackFor；在事务里调用远程接口或等待用户输入，会把毫秒级事务拖成秒级。' },
      { p: '排查锁等待先看谁在等：information_schema.innodb_trx 给出事务开始时间与状态，performance_schema.data_lock_waits 给出等待关系，SHOW PROCESSLIST 看连接正在跑什么 SQL。应急可以 KILL 阻塞源，但事后必须回答两个问题：这个事务为什么跑了这么久，它为什么锁了这么多行。' },
      { p: 'innodb_lock_wait_timeout 默认 50 秒，对在线业务太长：一个事务等 50 秒会一直占着连接，连接池很快耗尽。可以降到 5 到 10 秒，让失败尽早暴露，再由应用退避重试；同时给接口设超时，避免线程无限期挂着。' },
      { p: '批量更新要按主键分段，每段一个短事务，例如每次处理一千行，提交后再处理下一段。这样锁持有时间从几分钟降到几十毫秒，undo 也能及时回收。分段时记得记录进度，失败后可以从断点续跑，而不是从头再来。' },
      { p: '还要区分“慢 SQL”和“锁等待”。慢 SQL 是自己执行得久，锁等待是被别人挡住。看 events_statements_current 的 TIMER_WAIT 与 innodb_trx 的 trx_state：前者大是执行慢，后者显示 LOCK WAIT 才是等锁。这个区分决定了该优化 SQL，还是该缩短持锁事务。' },
      { p: '监控上要看两个指标：innodb_row_lock_waits 与 innodb_row_lock_time_avg。等待次数突增说明热点行冲突加剧，平均等待时间变长说明有事务持锁过久。把它们和发布记录对齐，往往能直接定位到某次改动引入了长事务，别等用户投诉才去看。' },
      { p: '事务边界也要和业务边界对齐：一个接口一个事务，而不是一个循环一个事务。循环里逐条提交会产生大量小事务，刷盘次数暴涨；循环外一个大事务又会让 undo 和锁持续累积。批次大小做成可配置参数，按压测结果调，比拍一个数字可靠。' },

      { h: '2.11 本章小结' },
      { list: [
        '并发读写会产生脏读、不可重复读、幻读与丢失更新，隔离级别决定允许哪些。',
        'InnoDB 默认 REPEATABLE READ，普通 SELECT 走 MVCC 快照读，加锁读和写走当前读。',
        '每行有 DB_TRX_ID、DB_ROLL_PTR 等隐藏字段，undo log 串成版本链。',
        'Read View 由活跃事务列表等四项组成；RC 每条语句新建，RR 首次读建一次并复用。',
        '锁加在索引上：唯一等值命中是记录锁，范围是临键锁，无索引更新近似表锁。',
        '死锁由检测机制回滚一方，应用要捕获 1213/1205 并退避重试整个事务。',
        '长事务让 undo 膨胀、锁等待变长、MDL 阻塞 DDL，必须拆小并移出非数据库操作。'
      ] },

      { h: '2.12 常见追问' },
      { list: [
        '<b>MVCC 能解决幻读吗？</b>快照读可以，固定视图看不到新插入的行；当前读要靠临键锁阻止范围内插入，两者配合才完整。',
        '<b>RR 下幻读还会发生吗？</b>标准允许；先快照读、再当前读的混用仍可能看到新行。',
        '<b>没有主键的表怎么加锁？</b>InnoDB 用隐藏 rowid 组织聚簇索引，仍可加锁；但业务无法按主键定位，容易锁范围过大。',
        '<b>间隙锁之间会冲突吗？</b>不会。间隙锁的作用是阻止插入，两个事务可以同时持有同一间隙的间隙锁。',
        '<b>死锁和锁等待超时的区别？</b>死锁是环路，InnoDB 立即检测并回滚一方（1213）；锁等待超时是等不到锁，达到 innodb_lock_wait_timeout 后报 1205。'
      ] },

      { h: '2.13 自测与练习' },
      { ol: [
        '开两个会话，在 RC 与 RR 下分别重复“读—别人改并提交—再读”，记录两次结果并解释差异。',
        '在 id 为 5、10、15 的表上执行 WHERE id = 7 FOR UPDATE，再从另一个会话插入 7，观察阻塞并解释原因。',
        '构造一个加锁顺序相反的死锁，查看 SHOW ENGINE INNODB STATUS 的 LATEST DETECTED DEADLOCK 段。',
        '为一段批量更新写分批提交的改造方案，说明它如何缩短事务并降低锁冲突。'
      ] }
    ]
  };

})();
