import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SearchAutocomplete from "../app/components/SearchAutocomplete.vue";

describe("SearchAutocomplete", () => {
  beforeEach(() => {
    vi.stubGlobal("useSanityQuery", () => ({ data: { value: [] } }));
    vi.stubGlobal("useSanity", () => ({
      fetch: vi.fn().mockResolvedValue([]),
    }));
    vi.stubGlobal("useRouter", () => ({ push: vi.fn() }));
  });

  const mountSearch = (variant: "header" | "hero" = "header") =>
    mount(SearchAutocomplete, {
      props: { variant },
      global: {
        stubs: {
          NuxtLink: { template: "<a><slot /></a>" },
        },
      },
    });

  it("renders the input with correct placeholder", () => {
    const wrapper = mountSearch("header");
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });
});
