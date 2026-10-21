/* =====================================================================
   排序算法可视化实验室 · 算法数据与动画步骤生成器
   纯原生 JavaScript，无任何依赖；直接以 file:// 打开也能运行。
   ===================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------
     通用“步骤记录器”
     每个算法只需要操作数组 a，并在关键动作时调用 push()。
     push() 会把当前数组快照、高亮信息和文字说明存下来，供播放器使用。
     ------------------------------------------------------------------ */
  function makeTracer(initial, emit) {
    var a = initial.slice();
    var stats = { compare: 0, move: 0 };
    var sorted = new Set();

    function push(note, opt) {
      opt = opt || {};
      emit({
        arr: a.slice(),
        compare: opt.compare || [],
        swap: opt.swap || [],
        pivot: typeof opt.pivot === 'number' ? opt.pivot : -1,
        sorted: Array.from(sorted),
        range: opt.range || null,
        aux: opt.aux || null,
        note: note,
        compareCount: stats.compare,
        moveCount: stats.move
      });
    }

    return { a: a, stats: stats, sorted: sorted, push: push };
  }

  function swap(a, i, j) {
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }

  function markAll(t) {
    for (var i = 0; i < t.a.length; i++) t.sorted.add(i);
  }

  /* ------------------------------------------------------------------
     算法定义
     ------------------------------------------------------------------ */
  var LIST = [

    /* ================================================================
       1. 冒泡排序
       ================================================================ */
    {
      id: 'bubble',
      name: '冒泡排序',
      en: 'Bubble Sort',
      group: '基础排序 · O(n²)',
      tag: 'O(n²)',
      best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      stable: true, inPlace: true,
      summary: '相邻元素两两比较，把最大的元素一步步“冒”到右端。',
      analogy: '像水里的气泡：越大的元素越“重”，每一轮都会沉到未排序区的最右边。',
      idea: '每一轮从前往后扫描，只要左边比右边大就交换。一轮结束后，未排序区的最大值一定停在最右端。如果某一轮一次都没交换，说明整个数组已经有序，可以提前结束。',
      steps: [
        '从下标 0 开始，比较 a[j] 与 a[j+1]；左边更大就交换。',
        '扫描到未排序区末尾，最大值“冒”到最右边，它就此归位。',
        '未排序区缩小一格，重复上一轮。',
        '若某一轮没有发生任何交换，直接结束（提前退出优化）。'
      ],
      tips: [
        '交换次数等于数组的“逆序对”数量，最坏是 n(n-1)/2 次。',
        '加上 swapped 标记后，最好情况（已经有序）只需 O(n)。',
        '稳定：相等元素不会互相跨越。'
      ],
      when: '教学演示、元素很少或“几乎已经有序”的数组。',
      javaName: 'BubbleSort.java',
      java: `public class BubbleSort {

    public static void sort(int[] a) {
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;              // 本轮是否发生过交换
            for (int j = 0; j < n - 1 - i; j++) {
                if (a[j] > a[j + 1]) {            // 左边更大 → 交换
                    int tmp = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = tmp;
                    swapped = true;
                }
            }
            if (!swapped) break;                  // 已经有序，提前结束
        }
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;

        for (var i = 0; i < n - 1; i++) {
          var swapped = false;
          for (var j = 0; j < n - 1 - i; j++) {
            t.stats.compare++;
            t.push('比较 a[' + j + '] = ' + a[j] + ' 与 a[' + (j + 1) + '] = ' + a[j + 1], { compare: [j, j + 1] });

            if (a[j] > a[j + 1]) {
              var left = a[j], right = a[j + 1];
              swap(a, j, j + 1);
              t.stats.move += 2;
              t.push('左边 ' + left + ' > 右边 ' + right + '，交换它们', { swap: [j, j + 1] });
              swapped = true;
            }
          }
          t.sorted.add(n - 1 - i);
          t.push('第 ' + (i + 1) + ' 轮结束：' + a[n - 1 - i] + ' 已到达最终位置');
          if (!swapped) {
            for (var k = 0; k < n - 1 - i; k++) t.sorted.add(k);
            t.push('整轮没有发生交换 → 数组已经有序，提前结束');
            break;
          }
        }
        markAll(t);
        t.push('排序完成 🎉 所有元素都有序了');
      }
    },

    /* ================================================================
       2. 选择排序
       ================================================================ */
    {
      id: 'selection',
      name: '选择排序',
      en: 'Selection Sort',
      group: '基础排序 · O(n²)',
      tag: 'O(n²)',
      best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      stable: false, inPlace: true,
      summary: '每一轮从未排序区挑出最小值，放到未排序区的最左端。',
      analogy: '桌上一堆牌，每次扫一遍挑出最小的一张，依次排到手里最左边。',
      idea: '把数组分成“已排序”和“未排序”两段。每轮在未排序区里找到最小元素的下标 min，然后和未排序区的第一位交换。无论数据长什么样，扫描次数都不变。',
      steps: [
        '假设未排序区第一个元素就是最小值，记下下标 min。',
        '向后扫描，遇到更小的就更新 min。',
        '把 a[min] 与未排序区第一位交换，它就此归位。',
        '未排序区起点右移一格，重复直到只剩一个元素。'
      ],
      tips: [
        '交换次数最多 n-1 次，是“移动成本最低”的排序之一。',
        '不稳定：例如 [2a, 2b, 1]，第一轮会把 1 和 2a 交换，两个 2 的顺序被打乱。',
        '时间复杂度恒为 O(n²)，与初始顺序无关。'
      ],
      when: '元素交换代价很高、数据量又不大时。',
      javaName: 'SelectionSort.java',
      java: `public class SelectionSort {

    public static void sort(int[] a) {
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            int min = i;                          // 假设最小值在 i
            for (int j = i + 1; j < n; j++) {
                if (a[j] < a[min]) min = j;       // 找到更小的
            }
            if (min != i) {                       // 放到未排序区首位
                int tmp = a[i];
                a[i] = a[min];
                a[min] = tmp;
            }
        }
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;

        for (var i = 0; i < n - 1; i++) {
          var min = i;
          t.push('第 ' + (i + 1) + ' 轮：先假设 a[' + i + '] = ' + a[i] + ' 最小', { compare: [i] });

          for (var j = i + 1; j < n; j++) {
            t.stats.compare++;
            t.push('比较 a[' + j + '] = ' + a[j] + ' 与当前最小 ' + a[min], { compare: [min, j] });
            if (a[j] < a[min]) {
              min = j;
              t.push('发现更小的 ' + a[min] + '，最小下标改为 ' + min, { compare: [min] });
            }
          }

          if (min !== i) {
            var x = a[i], y = a[min];
            swap(a, i, min);
            t.stats.move += 2;
            t.push('把最小值 ' + x + ' 和 ' + y + ' 交换，' + a[i] + ' 归位', { swap: [i, min] });
          } else {
            t.push(a[i] + ' 本来就在最小位置，不用交换');
          }
          t.sorted.add(i);
        }
        t.sorted.add(n - 1);
        t.push('排序完成 🎉 最后一个元素自然就位');
      }
    },

    /* ================================================================
       3. 插入排序
       ================================================================ */
    {
      id: 'insertion',
      name: '插入排序',
      en: 'Insertion Sort',
      group: '基础排序 · O(n²)',
      tag: 'O(n²)',
      best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      stable: true, inPlace: true,
      summary: '像整理扑克牌，把每张新牌插入左边已排好序的牌里。',
      analogy: '抓牌时左手始终是排好序的，右手每摸一张，就从右往左找位置插进去。',
      idea: '从第二个元素开始，把当前元素 key 暂存起来，在它左边的有序区里从右往左找位置；比 key 大的元素统一右移一格，腾出空位后把 key 放进去。',
      steps: [
        '取出 a[i] 作为 key，此时 a[0..i-1] 已经有序。',
        '从 j = i-1 开始向左比较：a[j] > key 就把 a[j] 右移一格。',
        '遇到第一个不大于 key 的元素，或走到数组开头，停止。',
        '把 key 放进空出来的位置，有序区扩大一格。'
      ],
      tips: [
        '数据越接近有序越快：最好情况只比较 n-1 次。',
        '稳定：只有严格大于才后移，相等元素保持原顺序。',
        '常数极小，n 较小时常被用作快排、归并的“小区间优化”。'
      ],
      when: '小数组、近乎有序的数据，或作为高级排序的收尾优化。',
      javaName: 'InsertionSort.java',
      java: `public class InsertionSort {

    public static void sort(int[] a) {
        for (int i = 1; i < a.length; i++) {
            int key = a[i];                       // 待插入的牌
            int j = i - 1;
            while (j >= 0 && a[j] > key) {        // 比 key 大的都右移
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = key;                       // 放进空位
        }
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;

        t.push('第一个元素 a[0] = ' + a[0] + ' 单独看就是有序的');

        for (var i = 1; i < n; i++) {
          var key = a[i];
          var j = i - 1;
          t.push('取出 a[' + i + '] = ' + key + '，准备插入左边的有序区', { compare: [i] });

          while (j >= 0) {
            t.stats.compare++;
            t.push('比较 a[' + j + '] = ' + a[j] + ' 与 key = ' + key, { compare: [j] });
            if (a[j] > key) {
              a[j + 1] = a[j];
              t.stats.move++;
              t.push(a[j] + ' > ' + key + '，把它右移一格', { swap: [j, j + 1] });
              j--;
            } else {
              t.push(a[j] + ' ≤ ' + key + '，位置找到了');
              break;
            }
          }

          a[j + 1] = key;
          t.stats.move++;
          for (var k = 0; k <= i; k++) t.sorted.add(k);
          t.push('把 ' + key + ' 放进 a[' + (j + 1) + ']，有序区变为 [0..' + i + ']', { swap: [j + 1] });
        }
        markAll(t);
        t.push('排序完成 🎉 整个数组都是有序区');
      }
    },

    /* ================================================================
       4. 鸡尾酒排序
       ================================================================ */
    {
      id: 'cocktail',
      name: '鸡尾酒排序',
      en: 'Cocktail Shaker Sort',
      group: '基础排序 · O(n²)',
      tag: 'O(n²)',
      best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      stable: true, inPlace: true,
      summary: '冒泡排序的“往返版”：先从左到右，再从右到左，两头同时收敛。',
      analogy: '像调酒师摇酒壶：先往一个方向摇，再往反方向摇。',
      idea: '普通冒泡每轮只把一个最大值送到右端；鸡尾酒排序一轮里先向右把最大值送到右端，再向左把最小值送到左端。对“小元素都在右边”的数组更友好。',
      steps: [
        '设定 left = 0、right = n-1 作为未排序区边界。',
        '从左到右冒泡，最大值沉到 right，right 左移。',
        '从右到左冒泡，最小值浮到 left，left 右移。',
        '重复直到 left ≥ right。'
      ],
      tips: [
        '最坏仍是 O(n²)，但某些“两端乱”的数据比冒泡快。',
        '稳定：相邻交换不会改变相等元素的相对顺序。',
        '本质是双向冒泡，不是新算法，而是优化思路的展示。'
      ],
      when: '教学对比，或数据只在两端附近乱序时。',
      javaName: 'CocktailSort.java',
      java: `public class CocktailSort {

    public static void sort(int[] a) {
        int left = 0, right = a.length - 1;
        while (left < right) {
            // 从左到右：最大值沉到 right
            for (int i = left; i < right; i++) {
                if (a[i] > a[i + 1]) swap(a, i, i + 1);
            }
            right--;
            // 从右到左：最小值浮到 left
            for (int i = right; i > left; i--) {
                if (a[i - 1] > a[i]) swap(a, i - 1, i);
            }
            left++;
        }
    }

    private static void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;
        var left = 0, right = n - 1;

        while (left < right) {
          t.push('第 ' + (left + 1) + ' 轮：先向右扫描 [left=' + left + ', right=' + right + ']');

          for (var i = left; i < right; i++) {
            t.stats.compare++;
            t.push('向右：比较 a[' + i + '] = ' + a[i] + ' 与 a[' + (i + 1) + '] = ' + a[i + 1], { compare: [i, i + 1] });
            if (a[i] > a[i + 1]) {
              var x = a[i], y = a[i + 1];
              swap(a, i, i + 1);
              t.stats.move += 2;
              t.push('交换 ' + x + ' 和 ' + y + '，让大值右移', { swap: [i, i + 1] });
            }
          }
          t.sorted.add(right);
          t.push('右端 ' + a[right] + ' 归位，right 左移');

          if (left >= right) break;
          right--;

          for (var k = right; k > left; k--) {
            t.stats.compare++;
            t.push('向左：比较 a[' + (k - 1) + '] = ' + a[k - 1] + ' 与 a[' + k + '] = ' + a[k], { compare: [k - 1, k] });
            if (a[k - 1] > a[k]) {
              var p = a[k - 1], q = a[k];
              swap(a, k - 1, k);
              t.stats.move += 2;
              t.push('交换 ' + p + ' 和 ' + q + '，让小值左移', { swap: [k - 1, k] });
            }
          }
          t.sorted.add(left);
          t.push('左端 ' + a[left] + ' 归位，left 右移');
          left++;
        }
        markAll(t);
        t.push('排序完成 🎉 两端向中间收敛');
      }
    },

    /* ================================================================
       5. 希尔排序
       ================================================================ */
    {
      id: 'shell',
      name: '希尔排序',
      en: 'Shell Sort',
      group: '进阶排序 · O(n log n)',
      tag: 'O(n^1.3)',
      best: 'O(n log n)', avg: 'O(n^1.3)', worst: 'O(n²)', space: 'O(1)',
      stable: false, inPlace: true,
      summary: '插入排序的“分组加速版”：先用大增量粗排，再逐步缩小到 1。',
      analogy: '先按远距离分组做粗略整理，再按近距离精细整理，最后一遍就是普通插入排序。',
      idea: '选择一个增量 gap，把相隔 gap 的元素看成一组，对每组做插入排序。随着 gap 缩小，数组变得越来越“基本有序”，最后一次 gap = 1 时插入排序只需要很少的移动。',
      steps: [
        '取初始增量 gap = n/2（常见做法）。',
        '把所有相隔 gap 的元素分成一组，组内做插入排序。',
        'gap 折半，重复分组和排序。',
        '当 gap = 1 时退化为普通插入排序，但此时数据已接近有序。'
      ],
      tips: [
        '性能高度依赖增量序列：Hibbard、Sedgewick 序列比简单的折半更快。',
        '不稳定：远距离交换可能跨过相等元素。',
        '原地排序、代码短，是插入排序最实用的增强版。'
      ],
      when: '中等规模、内存受限、又不想写复杂递归时。',
      javaName: 'ShellSort.java',
      java: `public class ShellSort {

    public static void sort(int[] a) {
        for (int gap = a.length / 2; gap > 0; gap /= 2) {   // 增量折半
            for (int i = gap; i < a.length; i++) {
                int key = a[i];
                int j = i - gap;
                while (j >= 0 && a[j] > key) {              // 组内插入排序
                    a[j + gap] = a[j];
                    j -= gap;
                }
                a[j + gap] = key;
            }
        }
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;

        for (var gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
          t.push('本轮增量 gap = ' + gap + '：把相隔 ' + gap + ' 的元素看成一组');

          for (var i = gap; i < n; i++) {
            var key = a[i];
            var j = i - gap;
            t.push('取出 a[' + i + '] = ' + key + '，在组内向前找位置', { compare: [i] });

            while (j >= 0) {
              t.stats.compare++;
              t.push('比较 a[' + j + '] = ' + a[j] + ' 与 key = ' + key, { compare: [j] });
              if (a[j] > key) {
                a[j + gap] = a[j];
                t.stats.move++;
                t.push(a[j] + ' > ' + key + '，右移 ' + gap + ' 格', { swap: [j, j + gap] });
                j -= gap;
              } else {
                break;
              }
            }
            a[j + gap] = key;
            t.stats.move++;
            t.push('把 ' + key + ' 放进 a[' + (j + gap) + ']', { swap: [j + gap] });
          }
          t.push('gap = ' + gap + ' 这一轮完成，数组变得更有序了');
        }
        markAll(t);
        t.push('排序完成 🎉 最后一轮 gap = 1 就是插入排序');
      }
    },

    /* ================================================================
       6. 归并排序
       ================================================================ */
    {
      id: 'merge',
      name: '归并排序',
      en: 'Merge Sort',
      group: '进阶排序 · O(n log n)',
      tag: 'O(n log n)',
      best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)',
      stable: true, inPlace: false,
      summary: '分而治之：把数组拆到只剩一个元素，再把有序的小段两两合并。',
      analogy: '两队已经按身高排好的人，比拼两队队首，矮的先进入新队伍。',
      idea: '递归地把左半段和右半段分别排好，然后用一个临时数组，双指针比较左右两段的队首，依次取较小者放入临时数组，最后整体写回原数组。',
      steps: [
        '把区间从中间切开，递归排序左半段。',
        '递归排序右半段。',
        '双指针合并：比较左右两段的队首，小的先写入临时数组。',
        '某一段取完后，把另一段剩余元素全部接上。',
        '把临时数组写回原数组，合并完成。'
      ],
      tips: [
        '需要 O(n) 额外空间，这是它最大的代价。',
        '稳定：合并时相等元素优先取左边，顺序不变。',
        'Java 的对象数组排序（TimSort）就以归并为基础；也适合链表排序。'
      ],
      when: '要求稳定、数据量大、可以接受额外空间时（也是外部排序的基础）。',
      javaName: 'MergeSort.java',
      java: `public class MergeSort {

    public static void sort(int[] a) {
        if (a.length < 2) return;
        int[] tmp = new int[a.length];            // 只分配一次
        mergeSort(a, tmp, 0, a.length - 1);
    }

    private static void mergeSort(int[] a, int[] tmp, int lo, int hi) {
        if (lo >= hi) return;
        int mid = (lo + hi) >>> 1;                // 防溢出的中点
        mergeSort(a, tmp, lo, mid);
        mergeSort(a, tmp, mid + 1, hi);
        merge(a, tmp, lo, mid, hi);
    }

    private static void merge(int[] a, int[] tmp, int lo, int mid, int hi) {
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) {
            // 相等时取左边，保证稳定
            tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        }
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi) tmp[k++] = a[j++];
        for (int t = lo; t <= hi; t++) a[t] = tmp[t];
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;

        function merge(lo, mid, hi) {
          var temp = [];
          var i = lo, j = mid + 1;

          t.push('合并两个有序段 [' + lo + '..' + mid + '] 和 [' + (mid + 1) + '..' + hi + ']', { range: [lo, hi] });

          while (i <= mid && j <= hi) {
            t.stats.compare++;
            t.push('比较左段 ' + a[i] + ' 与右段 ' + a[j], { compare: [i, j], range: [lo, hi] });
            if (a[i] <= a[j]) {
              temp.push(a[i++]);
            } else {
              temp.push(a[j++]);
            }
          }
          while (i <= mid) temp.push(a[i++]);
          while (j <= hi) temp.push(a[j++]);

          for (var k = 0; k < temp.length; k++) {
            a[lo + k] = temp[k];
            t.stats.move++;
            t.push('把 ' + temp[k] + ' 写回 a[' + (lo + k) + ']', {
              swap: [lo + k],
              range: [lo, hi],
              aux: {
                kind: 'chips',
                title: '临时数组 temp',
                items: temp.map(function (v, idx) {
                  return { label: '', value: v, active: idx === k };
                })
              }
            });
          }
          t.push('区间 [' + lo + '..' + hi + '] 合并完成，已经有序', { range: [lo, hi] });
        }

        function mergeSort(lo, hi) {
          if (lo >= hi) return;
          var mid = (lo + hi) >>> 1;
          mergeSort(lo, mid);
          mergeSort(mid + 1, hi);
          merge(lo, mid, hi);
        }

        mergeSort(0, n - 1);
        markAll(t);
        t.push('排序完成 🎉 所有区间都合并成了一个有序整体');
      }
    },

    /* ================================================================
       7. 快速排序
       ================================================================ */
    {
      id: 'quick',
      name: '快速排序',
      en: 'Quick Sort',
      group: '进阶排序 · O(n log n)',
      tag: 'O(n log n)',
      best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)',
      stable: false, inPlace: true,
      summary: '选一个基准，把比它小的放左边、大的放右边，再递归处理两边。',
      analogy: '按身高以某个人为界：比他矮的站左边，比他高的站右边，然后左右两队各自再选界。',
      idea: '取区间最后一个元素作为基准 pivot，用指针 i 维护“小于基准区”的右边界。扫描时遇到比 pivot 小的元素就和 i 交换并扩大左区；扫描完把 pivot 换到 i 的位置，它就到了最终位置。再递归左右两段。',
      steps: [
        '取区间末尾元素 a[hi] 作为基准 pivot。',
        'i 指向左区边界，j 从 lo 扫到 hi-1。',
        'a[j] < pivot 时，把 a[j] 换到左区，i 右移。',
        '扫描结束后把 pivot 换到 i，基准归位。',
        '递归排序 [lo, i-1] 和 [i+1, hi]。'
      ],
      tips: [
        '最坏 O(n²)：数组已经有序且固定取末尾为基准时，每次只能排除一个元素。',
        '随机选基准或“三数取中”可以显著降低最坏情况概率。',
        '不稳定；递归深度平均 O(log n)，最坏 O(n)。',
        'Java 对基本类型使用双轴快排（Dual-Pivot Quicksort）。'
      ],
      when: '通用内存排序的首选：常数小、缓存友好、原地排序。',
      javaName: 'QuickSort.java',
      java: `public class QuickSort {

    public static void sort(int[] a) {
        quickSort(a, 0, a.length - 1);
    }

    private static void quickSort(int[] a, int lo, int hi) {
        if (lo >= hi) return;
        int p = partition(a, lo, hi);             // 基准最终位置
        quickSort(a, lo, p - 1);
        quickSort(a, p + 1, hi);
    }

    // Lomuto 分区：以 a[hi] 为基准
    private static int partition(int[] a, int lo, int hi) {
        int pivot = a[hi];
        int i = lo;                               // 小于区的下一个空位
        for (int j = lo; j < hi; j++) {
            if (a[j] < pivot) {
                swap(a, i, j);
                i++;
            }
        }
        swap(a, i, hi);                           // 基准归位
        return i;
    }

    private static void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a;

        function quickSort(lo, hi) {
          if (lo > hi) return;
          if (lo === hi) {
            t.sorted.add(lo);
            t.push('子区间只剩 a[' + lo + '] = ' + a[lo] + '，它已就位');
            return;
          }

          var pivot = a[hi];
          t.push('子区间 [' + lo + '..' + hi + ']：选择 a[' + hi + '] = ' + pivot + ' 作为基准', { pivot: hi, range: [lo, hi] });

          var i = lo;
          for (var j = lo; j < hi; j++) {
            t.stats.compare++;
            t.push('比较 a[' + j + '] = ' + a[j] + ' 与基准 ' + pivot, { compare: [j], pivot: hi, range: [lo, hi] });
            if (a[j] < pivot) {
              if (i !== j) {
                var x = a[i], y = a[j];
                swap(a, i, j);
                t.stats.move += 2;
                t.push('比基准小：交换 ' + x + ' 与 ' + y + '，放进左区', { swap: [i, j], pivot: hi, range: [lo, hi] });
              } else {
                t.push('比基准小：已经在左区，i 右移', { compare: [j], pivot: hi, range: [lo, hi] });
              }
              i++;
            } else {
              t.push('不小于基准：留在右区', { compare: [j], pivot: hi, range: [lo, hi] });
            }
          }

          if (i !== hi) {
            swap(a, i, hi);
            t.stats.move += 2;
          }
          t.sorted.add(i);
          t.push('把基准 ' + pivot + ' 换到 a[' + i + ']：左边都更小，右边都不更小', { swap: [i, hi], range: [lo, hi] });

          quickSort(lo, i - 1);
          quickSort(i + 1, hi);
        }

        quickSort(0, a.length - 1);
        markAll(t);
        t.push('排序完成 🎉 每个基准都找到了最终位置');
      }
    },

    /* ================================================================
       8. 堆排序
       ================================================================ */
    {
      id: 'heap',
      name: '堆排序',
      en: 'Heap Sort',
      group: '进阶排序 · O(n log n)',
      tag: 'O(n log n)',
      best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)',
      stable: false, inPlace: true,
      summary: '先把数组建成大顶堆，再反复把堆顶最大值换到末尾并调整堆。',
      analogy: '每次从人群里选出最高的站到队尾，剩下的人重新调整队形，再选下一个。',
      idea: '大顶堆是一棵完全二叉树，父节点永远不小于子节点，堆顶就是最大值。先自底向上建堆；然后不断把堆顶与当前末尾交换、缩小堆、向下调整，末尾就依次排好了。',
      steps: [
        '把数组看成一棵完全二叉树，从最后一个非叶子节点开始向下调整，建成大顶堆。',
        '交换堆顶（最大值）与当前末尾元素。',
        '堆的大小减一，对新堆顶做“下沉”调整。',
        '重复直到堆里只剩一个元素。'
      ],
      tips: [
        '原地排序，最坏也能保证 O(n log n)，这是它相对快排的最大优势。',
        '不稳定；访问跳跃，缓存局部性不如快排。',
        '建堆是 O(n)，之后 n 次调整共 O(n log n)。',
        '求 Top-K 时，维护大小为 K 的堆比全排序更高效。'
      ],
      when: '对最坏情况时间有要求、内存紧张，或需要求 Top-K 时。',
      javaName: 'HeapSort.java',
      java: `public class HeapSort {

    public static void sort(int[] a) {
        int n = a.length;
        // 1. 建大顶堆：从最后一个非叶子节点开始下沉
        for (int i = n / 2 - 1; i >= 0; i--) {
            siftDown(a, i, n);
        }
        // 2. 不断把堆顶换到末尾
        for (int end = n - 1; end > 0; end--) {
            swap(a, 0, end);
            siftDown(a, 0, end);                  // 只调整前 end 个元素
        }
    }

    private static void siftDown(int[] a, int i, int size) {
        while (true) {
            int largest = i;
            int l = 2 * i + 1, r = 2 * i + 2;
            if (l < size && a[l] > a[largest]) largest = l;
            if (r < size && a[r] > a[largest]) largest = r;
            if (largest == i) break;              // 已经满足堆性质
            swap(a, i, largest);
            i = largest;
        }
    }

    private static void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;

        function siftDown(i, size) {
          while (true) {
            var largest = i;
            var l = 2 * i + 1, r = 2 * i + 2;

            if (l < size) {
              t.stats.compare++;
              t.push('比较父节点 a[' + i + '] = ' + a[i] + ' 与左孩子 a[' + l + '] = ' + a[l], { compare: [i, l], range: [0, size - 1] });
              if (a[l] > a[largest]) largest = l;
            }
            if (r < size) {
              t.stats.compare++;
              t.push('比较当前最大 a[' + largest + '] = ' + a[largest] + ' 与右孩子 a[' + r + '] = ' + a[r], { compare: [largest, r], range: [0, size - 1] });
              if (a[r] > a[largest]) largest = r;
            }
            if (largest === i) {
              t.push('父节点已经是三者中最大的，停止下沉');
              break;
            }

            var x = a[i], y = a[largest];
            swap(a, i, largest);
            t.stats.move += 2;
            t.push('交换 ' + x + ' 与 ' + y + '，让大的往上走', { swap: [i, largest], range: [0, size - 1] });
            i = largest;
          }
        }

        t.push('第 1 步：从最后一个非叶子节点开始，自底向上建大顶堆');
        for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
          t.push('调整以 a[' + i + '] = ' + a[i] + ' 为根的子树', { compare: [i], range: [0, n - 1] });
          siftDown(i, n);
        }
        t.push('大顶堆建好了：堆顶 a[0] = ' + a[0] + ' 就是最大值');

        for (var end = n - 1; end > 0; end--) {
          swap(a, 0, end);
          t.stats.move += 2;
          t.sorted.add(end);
          t.push('把堆顶最大值 ' + a[end] + ' 换到末尾 a[' + end + ']，它归位了', { swap: [0, end], range: [0, end] });
          siftDown(0, end);
        }
        t.sorted.add(0);
        t.push('排序完成 🎉 堆空了，数组也有序了');
      }
    },

    /* ================================================================
       9. 计数排序
       ================================================================ */
    {
      id: 'counting',
      name: '计数排序',
      en: 'Counting Sort',
      group: '线性时间排序 · O(n + k)',
      tag: 'O(n + k)',
      best: 'O(n + k)', avg: 'O(n + k)', worst: 'O(n + k)', space: 'O(n + k)',
      stable: true, inPlace: false,
      summary: '统计每个整数出现的次数，用前缀和直接算出每个元素该站的位置。',
      analogy: '按身高区间数人头：先数每个身高有多少人，再按身高从小到大叫人站队。',
      idea: '不比较元素大小，而是开一个计数数组 count，count[v] 记录值 v 出现的次数；再把 count 累加成前缀和，得到每个值在结果中的“结束位置”；最后从后往前回填，保证稳定。',
      steps: [
        '找出最大值 max，建立长度为 max+1 的计数数组。',
        '扫描原数组，count[a[i]]++。',
        '对 count 求前缀和：count[v] 变成“≤ v 的元素个数”。',
        '从后往前扫描原数组，把元素放进结果数组的正确位置。',
        '把结果数组整体拷回原数组。'
      ],
      tips: [
        '只适合整数，且值域 k 不能太大，否则计数数组会非常浪费。',
        '稳定：从后往前回填，相等元素保持原来的相对顺序。',
        '时间复杂度 O(n+k)，k 是值域大小；空间也是 O(n+k)。',
        '本页演示数据都是正整数；Java 版对负数需要加偏移量。'
      ],
      when: '年龄、分数、等级等值域很小的整数排序。',
      javaName: 'CountingSort.java',
      java: `public class CountingSort {

    public static void sort(int[] a) {
        if (a.length == 0) return;
        int max = a[0];
        for (int v : a) max = Math.max(max, v);

        int[] count = new int[max + 1];           // 值域 [0, max]
        for (int v : a) count[v]++;                // 1. 统计次数
        for (int v = 1; v <= max; v++) {
            count[v] += count[v - 1];              // 2. 前缀和
        }

        int[] out = new int[a.length];
        for (int i = a.length - 1; i >= 0; i--) {  // 3. 倒序回填，保证稳定
            out[--count[a[i]]] = a[i];
        }
        System.arraycopy(out, 0, a, 0, a.length);
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;
        var max = Math.max.apply(null, a);
        var count = new Array(max + 1).fill(0);
        var present = Array.from(new Set(a)).sort(function (x, y) { return x - y; });

        function chips(activeValue, title) {
          return {
            kind: 'chips',
            title: title || '计数数组 count',
            items: present.map(function (v) {
              return { label: String(v), value: '×' + count[v], active: v === activeValue };
            })
          };
        }

        t.push('最大值是 ' + max + '，准备长度 ' + (max + 1) + ' 的计数数组', { aux: chips(-1) });

        for (var i = 0; i < n; i++) {
          count[a[i]]++;
          t.push('统计 a[' + i + '] = ' + a[i] + '：count[' + a[i] + '] 变成 ' + count[a[i]], {
            compare: [i],
            aux: chips(a[i])
          });
        }

        for (var v = 1; v <= max; v++) count[v] += count[v - 1];
        t.push('把 count 累加成前缀和：每个值知道了自己的“结束位置”', { aux: chips(-1) });

        var out = new Array(n);
        for (var k = n - 1; k >= 0; k--) {
          count[a[k]]--;
          out[count[a[k]]] = a[k];
          t.push('从后往前：' + a[k] + ' 放到结果数组下标 ' + count[a[k]] + '（倒序保证稳定）', {
            compare: [k],
            aux: {
              kind: 'chips',
              title: '结果数组 out',
              items: out.map(function (val, idx) {
                return { label: String(idx), value: val, active: idx === count[a[k]] };
              })
            }
          });
        }

        for (var w = 0; w < n; w++) {
          a[w] = out[w];
          t.stats.move++;
          t.push('把 out[' + w + '] = ' + out[w] + ' 拷回原数组', { swap: [w] });
        }
        markAll(t);
        t.push('排序完成 🎉 没有比较过任何两个元素');
      }
    },

    /* ================================================================
       10. 桶排序
       ================================================================ */
    {
      id: 'bucket',
      name: '桶排序',
      en: 'Bucket Sort',
      group: '线性时间排序 · O(n + k)',
      tag: 'O(n + k)',
      best: 'O(n + k)', avg: 'O(n + k)', worst: 'O(n²)', space: 'O(n + k)',
      stable: true, inPlace: false,
      summary: '按值域把元素分进若干个桶，桶内各自排序，再按桶的顺序拼接。',
      analogy: '把一堆试卷按分数段分摞，每摞内部排好，最后从低分摞到高分摞叠起来。',
      idea: '先求出最小值和最大值，把值域均分成 k 个区间（桶）。每个元素按值落进对应的桶；桶内元素通常很少，用插入排序即可；最后按桶编号从小到大把元素写回原数组。',
      steps: [
        '扫描一遍，得到最小值 min 和最大值 max。',
        '把 [min, max] 均分成 k 个桶，计算每个元素所属的桶号。',
        '把元素放进对应的桶，并记录每个桶的内容。',
        '对每个桶内部单独排序（演示里用插入排序）。',
        '按桶的顺序把元素依次写回原数组。'
      ],
      tips: [
        '数据分布越均匀，每个桶越短，整体越快；极端情况下全挤进一个桶会退化成 O(n²)。',
        '稳定性取决于桶内排序算法：用插入排序则稳定。',
        '桶排序不比较“元素之间的大小”来决定位置，而是按值域分桶。',
        '适合浮点数、均匀分布的大数据量场景。'
      ],
      when: '数据均匀分布、值域已知，尤其是浮点数排序。',
      javaName: 'BucketSort.java',
      java: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BucketSort {

    public static void sort(int[] a) {
        if (a.length == 0) return;
        int min = a[0], max = a[0];
        for (int v : a) {
            min = Math.min(min, v);
            max = Math.max(max, v);
        }

        int bucketCount = Math.max(1, (int) Math.sqrt(a.length));
        List<List<Integer>> buckets = new ArrayList<>();
        for (int i = 0; i < bucketCount; i++) {
            buckets.add(new ArrayList<>());
        }

        double width = (max - min + 1.0) / bucketCount;
        for (int v : a) {
            int idx = Math.min(bucketCount - 1, (int) ((v - min) / width));
            buckets.get(idx).add(v);               // 放入对应桶
        }

        int k = 0;
        for (List<Integer> bucket : buckets) {
            Collections.sort(bucket);              // 桶内排序（可用插入排序替代）
            for (int v : bucket) a[k++] = v;
        }
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;
        var min = Math.min.apply(null, a);
        var max = Math.max.apply(null, a);
        var bucketCount = Math.max(2, Math.round(Math.sqrt(n)));
        var width = (max - min + 1) / bucketCount;
        var buckets = [];
        for (var b = 0; b < bucketCount; b++) buckets.push([]);

        function bucketChips(activeBucket) {
          return {
            kind: 'chips',
            title: '桶（按值域分组）',
            items: buckets.map(function (bucket, idx) {
              var lo = Math.floor(min + idx * width);
              var hi = idx === bucketCount - 1 ? max : Math.floor(min + (idx + 1) * width) - 1;
              return {
                label: lo + '–' + hi,
                value: bucket.length ? bucket.join(' ') : '空',
                active: idx === activeBucket
              };
            })
          };
        }

        t.push('值域 [' + min + ', ' + max + ']，分成 ' + bucketCount + ' 个桶，每个桶宽约 ' + width, { aux: bucketChips(-1) });

        for (var i = 0; i < n; i++) {
          var idx = Math.min(bucketCount - 1, Math.floor((a[i] - min) / width));
          buckets[idx].push(a[i]);
          t.push(a[i] + ' 落在第 ' + (idx + 1) + ' 个桶', { compare: [i], aux: bucketChips(idx) });
        }

        t.push('分桶完成，接下来把每个桶内部排好序', { aux: bucketChips(-1) });

        for (var q = 0; q < bucketCount; q++) {
          if (buckets[q].length <= 1) continue;
          buckets[q].sort(function (x, y) { return x - y; });
          t.push('第 ' + (q + 1) + ' 个桶内部排序：' + buckets[q].join(', '), { aux: bucketChips(q) });
        }

        var pos = 0;
        for (var r = 0; r < bucketCount; r++) {
          for (var s = 0; s < buckets[r].length; s++) {
            a[pos] = buckets[r][s];
            t.stats.move++;
            t.push('按桶顺序写回：a[' + pos + '] = ' + a[pos], { swap: [pos], aux: bucketChips(r) });
            pos++;
          }
        }
        markAll(t);
        t.push('排序完成 🎉 桶有序，桶内也有序');
      }
    },

    /* ================================================================
       11. 基数排序
       ================================================================ */
    {
      id: 'radix',
      name: '基数排序',
      en: 'Radix Sort',
      group: '线性时间排序 · O(d(n + k))',
      tag: 'O(d(n + k))',
      best: 'O(d(n + k))', avg: 'O(d(n + k))', worst: 'O(d(n + k))', space: 'O(n + k)',
      stable: true, inPlace: false,
      summary: '从最低位开始，每一轮按一位数字做稳定的“分桶—回收”。',
      analogy: '先按个位数分 10 摞，再按十位数分 10 摞……最后一摞就是排好序的。',
      idea: '以十进制为例：先按个位数字把元素分进 0-9 号桶，按顺序回收；再按十位分桶、回收……因为每一轮都是稳定的，低位排好的相对顺序不会被高位打乱，最高位处理完就整体有序。',
      steps: [
        '确定最大值的位数 d。',
        '从最低位（个位）开始，按当前位的数字把元素分进 0-9 号桶。',
        '按桶号 0→9 依次回收，写回数组。',
        '处理下一位（十位、百位……），重复分桶与回收。',
        '最高位处理完后，整个数组有序。'
      ],
      tips: [
        '每一轮的分桶必须稳定，否则低位排好的顺序会被破坏。',
        '复杂度 O(d(n+k))，d 是位数，k 是进制（十进制 k=10）。',
        '适合位数不多的整数、定长字符串、身份证号等。',
        '本页演示用十进制 LSD（最低位优先）。'
      ],
      when: '大量位数固定的整数或字符串排序。',
      javaName: 'RadixSort.java',
      java: `public class RadixSort {

    public static void sort(int[] a) {
        int max = 0;
        for (int v : a) max = Math.max(max, v);

        // 依次处理个位、十位、百位……
        for (int exp = 1; max / exp > 0; exp *= 10) {
            countingSortByDigit(a, exp);
        }
    }

    // 按第 exp 位做一次稳定计数排序
    private static void countingSortByDigit(int[] a, int exp) {
        int n = a.length;
        int[] out = new int[n];
        int[] count = new int[10];

        for (int v : a) count[(v / exp) % 10]++;
        for (int i = 1; i < 10; i++) count[i] += count[i - 1];

        for (int i = n - 1; i >= 0; i--) {         // 倒序保证稳定
            int digit = (a[i] / exp) % 10;
            out[--count[digit]] = a[i];
        }
        System.arraycopy(out, 0, a, 0, n);
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;
        var max = Math.max.apply(null, a);

        function digitOf(v, exp) {
          return Math.floor(v / exp) % 10;
        }

        function bucketView(counts, activeDigit, title) {
          return {
            kind: 'bars',
            title: title || '0–9 号桶（当前位）',
            items: counts.map(function (c, d) {
              return { label: String(d), value: c, active: d === activeDigit };
            })
          };
        }

        for (var exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
          var place = exp === 1 ? '个位' : exp === 10 ? '十位' : exp === 100 ? '百位' : '第 ' + exp + ' 位';
          var counts = new Array(10).fill(0);
          for (var i = 0; i < n; i++) counts[digitOf(a[i], exp)]++;

          t.push('开始处理' + place + '：先数一数每个数字各有多少个', { aux: bucketView(counts, -1, place + ' → 0–9 号桶') });

          var buckets = [];
          for (var d = 0; d < 10; d++) buckets.push([]);
          for (var j = 0; j < n; j++) {
            var dig = digitOf(a[j], exp);
            buckets[dig].push(a[j]);
            t.push(a[j] + ' 的' + place + '是 ' + dig + ' → 放进 ' + dig + ' 号桶', {
              compare: [j],
              aux: bucketView(counts, dig, place + ' → 分桶中')
            });
          }

          var pos = 0;
          for (var b = 0; b < 10; b++) {
            for (var k = 0; k < buckets[b].length; k++) {
              a[pos] = buckets[b][k];
              t.stats.move++;
              t.push('回收 ' + buckets[b][k] + ' → a[' + pos + ']', { swap: [pos], aux: bucketView(counts, b, place + ' → 回收中') });
              pos++;
            }
          }
          t.push(place + '处理完：数组已经按' + place + '排好（低位有序）');
        }
        markAll(t);
        t.push('排序完成 🎉 从低位到高位，每一轮都稳定地排好一位');
      }
    },

    /* ================================================================
       12. 梳排序
       ================================================================ */
    {
      id: 'comb',
      name: '梳排序',
      en: 'Comb Sort',
      group: '趣味扩展',
      tag: '≈O(n log n)',
      best: 'O(n log n)', avg: 'O(n²/2^p)', worst: 'O(n²)', space: 'O(1)',
      stable: false, inPlace: true,
      summary: '冒泡排序的“跳着比”版本：先用大间隔消除远处的逆序，再逐步缩小间隔。',
      analogy: '先用大梳子把打结的头发梳开，再换小梳子精修。',
      idea: '冒泡排序一次只交换相邻元素，远处的逆序要挪很多次。梳排序用 gap 间隔比较 a[i] 与 a[i+gap]，一开始 gap 很大，能一次性把远处的元素换到位；gap 每次除以 1.3，最后变成 1 时就是普通冒泡。',
      steps: [
        '初始 gap = n，表示“完全没梳理”。',
        '每轮令 gap = floor(gap / 1.3)，至少为 1。',
        '按 gap 间隔比较并交换，把远处的逆序对快速消除。',
        'gap = 1 后如果还有交换，继续冒泡直到没有交换。'
      ],
      tips: [
        '收缩因子 1.3 是实验得出的经验值，效果通常最好。',
        '不稳定：跳跃交换会跨过相等元素。',
        '平均比冒泡快很多，但最坏仍是 O(n²)。',
        '常被用来展示“调整比较间隔”这个思路。'
      ],
      when: '教学演示，或想用极简代码比冒泡快一点的场景。',
      javaName: 'CombSort.java',
      java: `public class CombSort {

    public static void sort(int[] a) {
        int n = a.length;
        int gap = n;
        boolean swapped = true;

        while (gap > 1 || swapped) {
            gap = Math.max(1, (int) (gap / 1.3));  // 收缩间隔
            swapped = false;
            for (int i = 0; i + gap < n; i++) {
                if (a[i] > a[i + gap]) {          // 跳着比较
                    swap(a, i, i + gap);
                    swapped = true;
                }
            }
        }
    }

    private static void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    public static void main(String[] args) {
        int[] a = {42, 17, 93, 8, 56, 71, 3, 29};
        sort(a);
        System.out.println(java.util.Arrays.toString(a));
    }
}`,
      run: function (data, emit) {
        var t = makeTracer(data, emit);
        var a = t.a, n = a.length;
        var gap = n;
        var swapped = true;

        while (gap > 1 || swapped) {
          gap = Math.max(1, Math.floor(gap / 1.3));
          swapped = false;
          t.push('间隔缩小到 gap = ' + gap + '，按这个间隔两两比较');

          for (var i = 0; i + gap < n; i++) {
            t.stats.compare++;
            t.push('比较 a[' + i + '] = ' + a[i] + ' 与 a[' + (i + gap) + '] = ' + a[i + gap], { compare: [i, i + gap] });
            if (a[i] > a[i + gap]) {
              var x = a[i], y = a[i + gap];
              swap(a, i, i + gap);
              t.stats.move += 2;
              t.push('交换 ' + x + ' 与 ' + y + '，消除远处的逆序', { swap: [i, i + gap] });
              swapped = true;
            }
          }

          if (gap === 1 && !swapped) {
            t.push('gap = 1 且没有发生交换 → 已经有序');
          }
        }
        markAll(t);
        t.push('排序完成 🎉 大梳子粗梳，小梳子精修');
      }
    }
  ];

  /* ------------------------------------------------------------------
     对外暴露
     ------------------------------------------------------------------ */
  global.SORT_ALGORITHMS = LIST;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LIST;
  }
})(typeof window !== 'undefined' ? window : globalThis);
