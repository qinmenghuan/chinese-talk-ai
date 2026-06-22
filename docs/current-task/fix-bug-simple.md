# bug:

修改admin端的scenarios功能样式，design-tokens的ui规范中按钮有圆角8px，页面为什么没有生效

# 目标：

- 查询，重置，新增，修改，删除按钮都需要有圆角，这个ui规范影响到共通的组件，影响admin和web端
- 按钮颜色
  - 按钮的背景如果是主题的红色，则字颜色为白色。

# 范围：

apps/admin,apps/web

# 验收：

1.apps/admin,apps/web两个端相关操作查询，重置，新增，修改，删除按钮都要有圆角

# Tasks

1. 找 root cause
2. 解释原因
3. 给修复方案
4. 修改代码
5. 增加测试
6. 运行测试
