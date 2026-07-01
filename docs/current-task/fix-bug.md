# Bug

共同规范packages/design-tokens中按钮有圆角， web端登录页和discovery页的按钮Button组件圆角没有生效

# Expected

- 按共同规范的按钮都有圆角

# Actual

- 没有圆角

# Scope

不要看其他的docs，不用看apps/api

# Require

1.方案要规范，不要写死值解决问题
2.@source "../../../packages/ui/src"; 不要用这个方式引用，撤销该不规范的方案，另寻方案3.尽量少改动

# Tasks

1. 找 root cause
2. 解释原因
3. 给修复方案
4. 修改代码
5. 自动打开浏览器，自动验证web端相关页面discovery,首页，登录页的按钮都是圆角,直到解决问题
