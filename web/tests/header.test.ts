import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SiteHeader from "../app/components/SiteHeader.vue";

describe("SiteHeader", () => {
  it("renders primary links and search bar", () => {
    const wrapper = mount(SiteHeader, {
      global: {
        stubs: {
          NuxtLink: { template: "<a><slot /></a>" },
        },
      },
    });
    expect(wrapper.text()).toContain("Guides");
    expect(wrapper.text()).toContain("Resources");
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });
});
