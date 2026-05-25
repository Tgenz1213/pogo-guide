import { beforeEach, describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SiteHeader from "../app/components/SiteHeader.vue";

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.stubGlobal("useColorMode", () => ({
      value: "light",
      preference: "light",
    }));
    vi.stubGlobal("useSanity", () => ({
      fetch: vi.fn().mockResolvedValue([]),
    }));
    vi.stubGlobal("useRouter", () => ({ push: vi.fn() }));
  });

  const mountHeader = () =>
    mount(SiteHeader, {
      global: {
        stubs: {
          NuxtLink: { template: "<a><slot /></a>" },
          ClientOnly: { template: "<div><slot /></div>" },
        },
      },
    });

  it("renders primary links and search bar", () => {
    const wrapper = mountHeader();

    expect(wrapper.text()).toContain("Guides");
    expect(wrapper.text()).toContain("Resources");
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });

  it("opens as overlay and closes when clicking outside", async () => {
    const wrapper = mountHeader();
    const menuToggle = wrapper.find('button[aria-label="Toggle Menu"]');

    expect(menuToggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.text()).not.toContain("Dark Mode");

    await menuToggle.trigger("click");

    expect(menuToggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.text()).toContain("Dark Mode");

    const overlay = wrapper.find("div.fixed.inset-0");
    await overlay.trigger("click");

    expect(menuToggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.text()).not.toContain("Dark Mode");
  });
});
