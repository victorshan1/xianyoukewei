---
skill_name: MATHJS
display_name: math.js
description: an extensive math library for JavaScript
api_file: API_MATHJS.md
enable: true
---

# math.js

开发环境中已经集成了math.js，如需使用math.js，需要在对应的代码文件中引入，示例如下

```typescript
import * as math from 'mathjs'
// 示例1: 基本数学运算
const basicCalc = math.evaluate('2 + 3 * 4') // 14
// 示例2: 单位转换
const unitConvert = math.unit('5 km').to('mile') // 转换为英里
```
