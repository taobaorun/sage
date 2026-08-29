# 图像提示词模板

每张图单独生成，并把 `../assets/ad-character-reference.png` 作为参考图传入。根据当前内容填写变量，不要把多张图拼在一张里。

```text
Generate one standalone 16:9 horizontal illustration for a Chinese article.

Strict character identity reference:
Use the attached reference image as the authoritative identity reference for AD. Reproduce the same recurring character consistently: oversized blue D-shaped head with a flat left edge and rounded right side; blue A-shaped body with a clear triangular counter and two legs; thick black outline; two vertical white oval eyes with small black pupils; a short curved friendly smile; thin orange arms and legs; simple orange hands; blue shoes with orange toe caps. Preserve AD's blue-and-orange palette and recognizable D-head/A-body silhouette. Do not replace AD with a black creature, robot, human, animal, generic letter, or another mascot. Do not add clothes or redesign the face.

Visual DNA:
Pure white background. Minimal black hand-drawn line art for objects and structures, with slightly wobbly pen lines. AD remains fully colored as in the reference. Lots of empty white space. Sparse red/orange/blue handwritten Chinese annotations. Clear, witty product-sketch feeling. No gradients in the background, no paper texture, no complex scenery, no commercial vector poster, no PPT infographic, no children's illustration, no realistic UI.

Theme:
{正文配图主题}

Core idea:
{唯一需要表达的核心意思}

Structure:
{单向流程 / 系统局部 / 前后对比 / 角色状态 / 概念隐喻 / 方法分层 / 地图路线 / 小漫画分镜}

Composition and AD's action:
{AD 在哪里、正在做什么、主要物件是什么、动作如何表达因果关系}

Suggested elements:
{元素 1} / {元素 2} / {元素 3}

Chinese handwritten labels:
{短标注 1} / {短标注 2} / {短标注 3} / {可选短标注 4}

Color use:
Keep AD's brand blue and orange unchanged. Use black for object line art and main labels. Use orange sparingly for the single main path or action. Use red only for a warning, problem, turning point, or result. Use blue outside AD only for a small secondary system note.

Constraints:
AD performs the core conceptual action and is not decorative. One image explains one idea. Keep the main subject around 40%-60% of the canvas and preserve at least 35% blank white space. Use at most 5-8 short Chinese labels. Do not put a type-title in the top-left. Do not write the structure name on the image. Do not make a formal flowchart, slide, dense explainer, mascot poster, or logo. Invent a fresh physical metaphor for this content.
```

## 编辑现有配图

### 修复 AD 身份漂移

```text
Edit the provided illustration using the attached AD reference image as the strict identity source. Replace only the off-model character with the canonical AD: blue D-shaped head, blue A-shaped body with triangular counter, white oval eyes, black pupils, curved smile, orange limbs, blue shoes with orange toe caps, black outline. Preserve the original composition, action, objects, labels, white background, aspect ratio, and image quality. Do not add new text or objects.
```

### 去掉错误标题

```text
Edit the provided image. Remove only the handwritten title "{要删除的文字}" and its underline. Fill that area with the same clean white background. Preserve AD, all other labels, objects, line style, composition, aspect ratio, and image quality. Do not add new text or objects.
```

### 减少复杂度

```text
Regenerate the illustration with the same core meaning and AD performing the same central action, but remove secondary nodes, extra arrows, background decoration, and nonessential labels. Keep one main object, one action, 3-5 short Chinese annotations, and at least 35% clean white space. Preserve AD's exact identity from the attached reference.
```
