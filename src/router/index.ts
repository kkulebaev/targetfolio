import { defineComponent } from "vue";
import { createRouter, createWebHistory } from "vue-router";

const Empty = defineComponent({ render: () => null });

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/:pathMatch(.*)*", component: Empty }],
});
