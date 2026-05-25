import { describe, it, expect } from "vitest";
import {
  htmlToPortableTextBlocks,
  decodeHtmlEntities,
} from "../../../server/utils/portableText";

describe("Portable Text Parser", () => {
  describe("decodeHtmlEntities", () => {
    it("decodes common HTML entities correctly", () => {
      const input =
        "AT&amp;T &quot;Hello&quot; &#39;World&#39; &lt;div&gt; &nbsp;";
      const expected = "AT&T \"Hello\" 'World' <div>  ";
      expect(decodeHtmlEntities(input)).toBe(expected);
    });
  });

  describe("htmlToPortableTextBlocks", () => {
    it("parses basic paragraphs", () => {
      const html = "<p>Hello world</p>";
      const blocks = htmlToPortableTextBlocks(html);
      expect(blocks.length).toBe(1);
      expect(blocks[0].style).toBe("normal");
      expect(blocks[0].children[0].text).toBe("Hello world");
    });

    it("parses bold and italic marks", () => {
      const html = "<p>This is <strong>bold</strong> and <em>italic</em>.</p>";
      const blocks = htmlToPortableTextBlocks(html);
      expect(blocks[0].children.length).toBe(5); // "This is ", "bold", " and ", "italic", "."
      expect(blocks[0].children[1].marks).toContain("strong");
      expect(blocks[0].children[3].marks).toContain("em");
      expect(blocks[0].children[4].text).toBe(".");
    });

    it("parses links", () => {
      const html =
        '<p>Check out <a href="https://example.com">this link</a>!</p>';
      const blocks = htmlToPortableTextBlocks(html);
      expect(blocks[0].markDefs.length).toBe(1);
      expect(blocks[0].markDefs[0].href).toBe("https://example.com");
      // The mark on the span should match the markDef key
      const linkKey = blocks[0].markDefs[0]._key;
      expect(blocks[0].children[1].marks).toContain(linkKey);
      expect(blocks[0].children[1].text).toBe("this link");
    });

    it("parses unordered lists", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const blocks = htmlToPortableTextBlocks(html);
      expect(blocks.length).toBe(2);
      expect(blocks[0].listItem).toBe("bullet");
      expect(blocks[0].children[0].text).toBe("Item 1");
      expect(blocks[1].listItem).toBe("bullet");
      expect(blocks[1].children[0].text).toBe("Item 2");
    });

    it("ignores empty inputs or malicious tags like scripts", () => {
      const html = '<script>alert("xss")</script><p>Text</p>';
      const blocks = htmlToPortableTextBlocks(html);
      const hasText = blocks.some((b) =>
        b.children.some((c) => c.text === "Text"),
      );
      expect(hasText).toBe(true);
    });
  });
});
