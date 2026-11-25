# 项目代码约定

本文件适用于当前插件目录及其所有子目录。后续新增、修改和重构代码均须遵守以下规范。

## 参数与类型

- 组件参数统一命名为 `props`。
- domain 和 services 中的纯函数使用 `params` 或有业务含义的参数名；本项目的 `shared`、`host` 业务函数同样遵循此约定。
- 参数类型单独声明为 `type XxxProps` 或 `type XxxParams`，不内联在函数参数列表中。
- 函数参数尽量不解构。组件内部通过 `props.xxx` 读取参数。
- 页面 props 类型在页面文件内声明，不集中定义通用的页面 props 类型。

## 导航

- 导航参数类型统一放在 `types/routes.ts`；本项目对应路径为 `src/client/types/routes.ts`。
- React Native 页面使用 `useNavigation<AppNavigation>()` 和 `useRoute()` 获取导航对象与路由，不通过 props 传入，不额外封装只转调 `useNavigation` 的 hook。
- 当前项目是 DSH Web 插件，不使用 React Native 导航库。页面使用现有导航上下文提供的 `useNavigation()` 和 `useRoute()`，不通过页面 props 传递导航对象、路由或跳转方法，不为套用上述 API 引入 React Native 依赖。

## 注释与行数

- 函数头注释使用 `/** */`，行内说明使用 `//`。
- 注释说明业务原因、约束和边界，省去只重复代码含义的注释。
- 按文件实际行数计数，结尾换行不另算一行。

## 格式与组件复用

- 使用 TypeScript / TSX，按功能模块组织代码，保留 `src/index.ts` 作为唯一的源码主入口文件；前端宿主注册由 `src/client/plugin.tsx` 负责。
- 使用项目 Prettier 配置格式化代码，避免多个语句、复杂 JSX 或长表达式挤在一行。
- 表单优先复用 `FormItem`、`Input`、`Select`、`Textarea`、`Checkbox`、`FormGrid`，避免页面重复实现原生控件及其样式。
- 保持统一的字号、控件高度、圆角、间距和状态样式。输入控件聚焦使用中性边框高亮，不显示蓝色外框。
- 修改完成后运行适用的检查；组件或业务代码变更使用 `npm run check`，更新插件产物使用 `npm run build`。
