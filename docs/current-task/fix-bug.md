# Bug

web端google登录，回跳报错

# Expected

- 正常使用google登录

# Actual

- http://localhost:3003/api/auth/google/callback?state=eyJuZXh0IjoiLyJ9&iss=https%3A%2F%2Faccounts.google.com&code=4%2F0AdkVLPw5IzD4_g4BR9w_inG7lWq72_0khfuBY2GYadxc7ETVtGgPglC07_kpt9Xvp1qaNQ&scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+openid&authuser=0&prompt=consent
  显示{"statusCode":500,"message":"Internal server error"}

# Scope

不要看其他的docs，不用看apps/admin

# Tasks

1. 找 root cause
2. 解释原因
3. 给修复方案
4. 修改代码
5. 增加测试
6. 运行测试
