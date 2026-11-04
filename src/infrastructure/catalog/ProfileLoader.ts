import fs from "fs";
import path from "path";
import { Profile } from "../../domain/profile/Profile";

const PROFILES_DIR = path.join(__dirname, "profiles");

/**
 * Templates de perfil carregados do disco UMA vez, no boot.
 * Diferente do Lawin, que usava require() e mutava o objeto cacheado,
 * aqui o template é congelado e sempre clonado antes de uso.
 */
class ProfileLoader {
  private templates = new Map<string, Profile>();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    if (!fs.existsSync(PROFILES_DIR)) {
      throw new Error(
        `Diretório de perfis não encontrado: ${PROFILES_DIR}\n` +
          `Crie a pasta e coloque os JSONs dos perfis da 6.31.`
      );
    }

    const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const profileId = path.basename(file, ".json");
      const raw = fs.readFileSync(path.join(PROFILES_DIR, file), "utf-8");
      const parsed = JSON.parse(raw) as Profile;
      Object.freeze(parsed);
      this.templates.set(profileId, parsed);
    }

    this.loaded = true;
    console.log(
      `[catalog] ${this.templates.size} templates carregados: ${[...this.templates.keys()].join(", ")}`
    );
  }

  has(profileId: string): boolean {
    this.load();
    return this.templates.has(profileId);
  }

  ids(): string[] {
    this.load();
    return [...this.templates.keys()];
  }

  /**
   * Clona profundamente o template e troca accountId + revisões.
   * Sem isso, duas contas apontariam para o mesmo objeto em memória.
   */
  instantiate(profileId: string, accountId: string): Profile {
    this.load();
    const template = this.templates.get(profileId);
    if (!template) {
      throw new Error(`Template de perfil inexistente: ${profileId}`);
    }

    const clone = structuredClone(template);
    const now = new Date().toISOString();

    return {
      ...clone,
      accountId,
      profileId,
      rvn: 0,
      commandRevision: 0,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export const profileLoader = new ProfileLoader();