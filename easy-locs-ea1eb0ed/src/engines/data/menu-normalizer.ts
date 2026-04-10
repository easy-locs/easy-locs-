import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class MenuNormalizer extends BaseEngine {
  constructor() {
    super({
      id: "data-menu-normalizer",
      name: "Menu Normalizer",
      category: "data",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const menuItems = document.querySelectorAll("[data-menu-item]");
    menuItems.forEach(el => {
      const price = el.getAttribute("data-price");
      const name = el.getAttribute("data-item-name") || el.textContent?.trim() || "";

      if (price && (parseFloat(price) <= 0 || isNaN(parseFloat(price)))) {
        findings.push(`Invalid menu price: "${name}" = ${price}`);
      }
      if (name.length > 200) {
        findings.push(`Menu item name too long: ${name.substring(0, 50)}...`);
      }
      if (name && name === name.toUpperCase() && name.length > 5) {
        findings.push(`ALL-CAPS menu item: "${name.substring(0, 40)}"`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
