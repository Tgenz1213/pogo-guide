import { h, Suspense } from "vue";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import IndexPage from "../app/pages/index.vue";

describe("IndexPage", () => {
  beforeEach(() => {
    vi.stubGlobal("useSanityQuery", () => ({
      data: { value: [] },
    }));
    vi.stubGlobal(
      "groq",
      (strings: TemplateStringsArray, ...values: unknown[]) =>
        String.raw({ raw: strings }, ...values),
    );
    vi.stubGlobal("useSanity", () => ({
      fetch: vi.fn().mockResolvedValue([]),
    }));
    vi.stubGlobal("useRouter", () => ({ push: vi.fn() }));
  });

  it("renders the action-oriented hero and Current State dashboard", async () => {
    const wrapper = mount(
      {
        render() {
          return h(Suspense, null, {
            default: () => h(IndexPage),
          });
        },
      },
      {
        global: {
          stubs: {
            NuxtLink: { template: "<a><slot /></a>" },
          },
        },
      },
    );

    await flushPromises();

    expect(wrapper.text()).toContain("Your Complete Pokémon GO");
    expect(wrapper.text()).toContain("Knowledge Base.");
    expect(wrapper.text()).toContain("evaluate Pokémon");
  });
});
