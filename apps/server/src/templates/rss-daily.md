---
tags:
  - daily
  - RSS
title: RSS 日报 - {{date}}
date: {{date}}
---

# RSS 日报 - {{date}}

## 今日概览
- 阅读文章数: {{totalArticles}}
- 收藏文章数: {{starredArticles}}
- 保存到 Obsidian: {{savedArticles}}

## 重点文章
{{#each articles}}
### {{@index}}. {{title}}
- 来源: {{source}}
- 链接: [原文]({{url}})
- 摘要: {{summary}}

{{/each}}

## 今日收获
<!-- 记录今天的收获和感悟 -->

## 新发现
<!-- 今天发现的新知识点或新资源 -->

## 待深入研究
<!-- 需要后续深入研究的内容 -->

## 明日计划
<!-- 规划明天的阅读计划 -->

---
*生成时间: {{datetime}}*
