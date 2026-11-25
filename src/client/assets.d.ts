/** 构建器把 CSS 作为字符串加载，样式范围限定在 .dpr 内。 */
declare module '*.css' {
  const text: string;
  export default text;
}
