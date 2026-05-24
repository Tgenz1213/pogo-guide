import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IndexPage from "../app/pages/index.vue";

describe("IndexPage", () => {
  it("renders the action-oriented hero and Current State dashboard", () => {
    const wrapper = mount(IndexPage, {
      global: {
        stubs: {
          NuxtLink: { template: "<a><slot /></a>" },
        },
      },
    });
    expect(wrapper.text()).toContain("Master the Meta.");
    expect(wrapper.text()).toContain("Dominate Your Raids.");
    expect(wrapper.text()).toContain("Legendary Raid");
  });
});
