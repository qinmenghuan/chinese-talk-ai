# Bug

修改admin端的scenarios功能模块几个问题

# Expected

- Scenario的title等相关字段数据都用英文，除了对话内容是中文，
- 列表的Scenario列的底部，不用显示id字段值
- 查询条件的label和控件在一行，并且查询框内的按钮高度和条件控件的高度一致，这个抽取到admin端的ui共通规范
- 查询，重置，新增，修改，删除按钮都需要有圆角，这个ui规范抽取到共通的ui规范，影响admin和web端
- 删除确认框，重复的文案
- 列表的image字段，显示图片缩略图
- request 失败，在lib/api.ts中统一加toast提示

# Actual

# Scope

不要看其他的docs

# Tasks

1. 找 root cause
2. 解释原因
3. 给修复方案
4. 修改代码
5. 增加测试
6. 运行测试
