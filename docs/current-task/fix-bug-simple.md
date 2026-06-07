# bug:

修改admin端的scenarios功能模块问题

# 目标：

- 查询条件的label和控件在一行，并且查询框内的按钮高度和条件控件的高度一致，
- 这个抽取到admin端的ui共通规范，并影响Users的列表页面

# 范围：

apps/admin,apps/api

# 验收：

1.scenarios，users页面查询条件的label和控件在一行2.运行完相关代码规范的验证例如eslint
