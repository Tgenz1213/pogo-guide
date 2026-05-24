<script setup lang="ts">
// resources/index.vue
const sideMenu = [
  { name: "Fast Move Frame-Data", active: true },
  { name: "Search String Generator", active: false },
  { name: "Type Effectiveness Matrix", active: false },
];

const mockMoves = [
  { name: "Counter", type: "Fighting", turns: 2, ept: 3.5, dpt: 4.0 },
  { name: "Shadow Claw", type: "Ghost", turns: 2, ept: 4.0, dpt: 3.0 },
  { name: "Dragon Breath", type: "Dragon", turns: 1, ept: 3.0, dpt: 4.0 },
  { name: "Vine Whip", type: "Grass", turns: 2, ept: 4.0, dpt: 2.5 },
];
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-12 md:py-16">
    <div class="mb-10">
      <h1
        class="text-4xl md:text-5xl font-black text-white tracking-tight mb-4"
      >
        Resources
      </h1>
      <p class="text-brand-accent text-lg max-w-2xl">
        Hard data, calculators, and reference tables for advanced mechanics.
      </p>
    </div>

    <div class="flex flex-col md:flex-row gap-10">
      <!-- Sidebar Menu -->
      <aside class="w-full md:w-64 shrink-0">
        <nav class="flex flex-col space-y-2">
          <button
            v-for="item in sideMenu"
            :key="item.name"
            class="text-left px-4 py-3 rounded-xl font-semibold transition-all duration-200"
            :class="
              item.active
                ? 'bg-mystic-blue text-white shadow-md'
                : 'text-brand-accent hover:bg-brand-surface/50 hover:text-white'
            "
          >
            {{ item.name }}
          </button>
        </nav>
      </aside>

      <!-- Main Content Area: Data Table Stub -->
      <section
        class="flex-1 bg-brand-surface/20 border border-brand-surface rounded-3xl p-6 md:p-8 overflow-hidden"
      >
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold text-white">
            PvP Fast Move Frame-Data
          </h2>
          <div class="relative">
            <input
              type="text"
              placeholder="Filter moves..."
              class="bg-brand-bg border border-brand-surface rounded-full py-1.5 px-4 text-sm text-white placeholder-brand-accent focus:border-mystic-blue focus:outline-none"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-brand-surface">
                <th
                  class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-brand-accent"
                >
                  Move
                </th>
                <th
                  class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-brand-accent"
                >
                  Type
                </th>
                <th
                  class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-brand-accent"
                >
                  Turns
                </th>
                <th
                  class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-brand-accent"
                >
                  EPT
                </th>
                <th
                  class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-brand-accent"
                >
                  DPT
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-brand-surface/50">
              <tr
                v-for="move in mockMoves"
                :key="move.name"
                class="hover:bg-brand-surface/30 transition-colors"
              >
                <td class="py-4 px-4 font-bold text-white">{{ move.name }}</td>
                <td class="py-4 px-4 text-brand-accent">{{ move.type }}</td>
                <td class="py-4 px-4 text-brand-accent">{{ move.turns }}</td>
                <td
                  class="py-4 px-4 text-brand-accent font-semibold text-mystic-blue"
                >
                  {{ move.ept }}
                </td>
                <td
                  class="py-4 px-4 text-brand-accent font-semibold text-valor-red"
                >
                  {{ move.dpt }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>
