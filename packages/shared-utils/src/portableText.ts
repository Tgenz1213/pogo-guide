import sanitizeHtml from "sanitize-html";

interface PortableTextMarkDef {
  _key: string;
  _type: "link";
  href: string;
}

interface PortableTextSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

export interface PortableTextBlock {
  _type: "block";
  _key: string;
  style: "normal" | "h2" | "h3";
  listItem?: "bullet" | "number";
  level?: number;
  markDefs: PortableTextMarkDef[];
  children: PortableTextSpan[];
}

const createPortableTextKey = () =>
  crypto.randomUUID().replace(/-/g, "").slice(0, 12);

/** @public */
export const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ");

const stripTags = (value: string) =>
  decodeHtmlEntities(
    sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }),
  );

const splitTopLevelBlocks = (cleanHtml: string) => {
  const blockPattern = /<(p|h2|h3|ul|ol)\b[^>]*>[\s\S]*?<\/\1>|<br\s*\/?\s*>/gi;
  const matches = cleanHtml.match(blockPattern);

  if (!matches) {
    return cleanHtml.trim() ? ["<p>" + cleanHtml + "</p>"] : [];
  }

  return matches;
};

const createSpan = (text: string, marks: string[] = []): PortableTextSpan => ({
  _type: "span",
  _key: createPortableTextKey(),
  text,
  marks,
});

const parseInlineSegments = (
  html: string,
): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } => {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];

  const appendText = (text: string, marks: string[] = []) => {
    const normalized = normalizeWhitespace(decodeHtmlEntities(text));
    if (!normalized.trim()) {
      return;
    }

    children.push(createSpan(normalized, marks));
  };

  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    appendFormattedText(html.slice(lastIndex, linkMatch.index), appendText);

    const href = decodeHtmlEntities(linkMatch[1] ?? "");
    const markKey = createPortableTextKey();
    markDefs.push({
      _key: markKey,
      _type: "link",
      href,
    });
    appendFormattedText(linkMatch[2] ?? "", appendText, [markKey]);
    lastIndex = linkMatch.index + linkMatch[0].length;
  }

  appendFormattedText(html.slice(lastIndex), appendText);

  if (children.length === 0) {
    const fallbackText = stripTags(html).trim();
    if (fallbackText) {
      children.push(createSpan(fallbackText));
    }
  }

  return { children, markDefs };
};

const appendFormattedText = (
  html: string,
  appendText: (text: string, marks?: string[]) => void,
  extraMarks: string[] = [],
) => {
  const normalizedHtml = html.replace(/<br\s*\/?\s*>/gi, "\n");
  const tokenPattern =
    /<(strong|b)>([\s\S]*?)<\/\1>|<(em|i)>([\s\S]*?)<\/\3>|\n+|[^<\n]+/gi;

  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenPattern.exec(normalizedHtml)) !== null) {
    if (tokenMatch[0].startsWith("<strong") || tokenMatch[0].startsWith("<b")) {
      appendText(stripTags(tokenMatch[2] ?? ""), [...extraMarks, "strong"]);
      continue;
    }

    if (tokenMatch[0].startsWith("<em") || tokenMatch[0].startsWith("<i")) {
      appendText(stripTags(tokenMatch[4] ?? ""), [...extraMarks, "em"]);
      continue;
    }

    if (tokenMatch[0].includes("\n")) {
      appendText(" ", extraMarks);
      continue;
    }

    appendText(tokenMatch[0], extraMarks);
  }
};

const createBlock = (
  innerHtml: string,
  style: PortableTextBlock["style"] = "normal",
  options?: Pick<PortableTextBlock, "listItem" | "level">,
): PortableTextBlock | null => {
  const { children, markDefs } = parseInlineSegments(innerHtml);
  if (children.length === 0) {
    return null;
  }

  return {
    _type: "block",
    _key: createPortableTextKey(),
    style,
    markDefs,
    children,
    ...(options?.listItem ? { listItem: options.listItem } : {}),
    ...(options?.level ? { level: options.level } : {}),
  };
};

export const htmlToPortableTextBlocks = (
  cleanHtml: string,
): PortableTextBlock[] => {
  const blocks: PortableTextBlock[] = [];

  for (const blockHtml of splitTopLevelBlocks(cleanHtml)) {
    if (/^<br\s*\/?\s*>$/i.test(blockHtml)) {
      continue;
    }

    const paragraphMatch = blockHtml.match(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i);
    if (paragraphMatch) {
      const block = createBlock(paragraphMatch[1] ?? "", "normal");
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    const h2Match = blockHtml.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>$/i);
    if (h2Match) {
      const block = createBlock(h2Match[1] ?? "", "h2");
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    const h3Match = blockHtml.match(/^<h3\b[^>]*>([\s\S]*?)<\/h3>$/i);
    if (h3Match) {
      const block = createBlock(h3Match[1] ?? "", "h3");
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    const listMatch = blockHtml.match(/^<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>$/i);
    if (listMatch) {
      const listType =
        (listMatch[1] ?? "").toLowerCase() === "ul" ? "bullet" : "number";
      const itemPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      const listContent = listMatch[2] ?? "";
      let itemMatch: RegExpExecArray | null;

      while ((itemMatch = itemPattern.exec(listContent)) !== null) {
        const block = createBlock(itemMatch[1] ?? "", "normal", {
          listItem: listType,
          level: 1,
        });
        if (block) {
          blocks.push(block);
        }
      }
      continue;
    }

    const fallbackBlock = createBlock(blockHtml, "normal");
    if (fallbackBlock) {
      blocks.push(fallbackBlock);
    }
  }

  return blocks;
};
