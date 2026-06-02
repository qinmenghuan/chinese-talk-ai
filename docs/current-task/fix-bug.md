# Bug

discovery列表没有缓存，跳转到practice页面没有返回按钮，返回后页面没有缓存数据。

# Expected

- discovery列表页面需要有前端缓存，这样跳转到practice页面，再返回，改页面的之前的状态还在，例如查询条件及页面滚动
- practice页面的返回组件抽取共同组件
- header中的菜单栏，除了home页面，其他有选中效果
- Search，Reset 按钮需要有圆角，并加到共同UI规范

# Actual

- discovery列表没有缓存，跳转到practice页面没有返回按钮

# Scope

不要看其他的docs，不要动apps/admin

# Tasks

1. 找 root cause
2. 解释原因
3. 给修复方案
4. 修改代码
5. 增加测试
6. 运行测试
