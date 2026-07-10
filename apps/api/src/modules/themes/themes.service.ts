import { Injectable, NotFoundException } from '@nestjs/common';
import type { ThemeConfig } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { runBypassingRls } from '../../common/context/request-context';

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Available industry templates (global). */
  listTemplates(industry?: string) {
    return runBypassingRls(() =>
      this.prisma.raw.industryTemplate.findMany({
        where: { isActive: true, ...(industry ? { industry: industry as never } : {}) },
        orderBy: [{ industry: 'asc' }, { isPremium: 'asc' }],
      }),
    );
  }

  async getTheme() {
    const store = await this.prisma.client.store.findFirst();
    if (!store) throw new NotFoundException('Store not found');
    const theme = await this.prisma.client.theme.findUnique({ where: { tenantId: store.id }, include: { template: true } });
    return theme;
  }

  async updateThemeConfig(config: ThemeConfig) {
    const store = await this.prisma.client.store.findFirst();
    if (!store) throw new NotFoundException('Store not found');
    return this.prisma.client.theme.upsert({
      where: { tenantId: store.id },
      create: { tenantId: store.id, config: config as object },
      update: { config: config as object },
    });
  }

  /** Switch to a template (copies its default config as the starting point). */
  async applyTemplate(templateId: string) {
    const store = await this.prisma.client.store.findFirst();
    if (!store) throw new NotFoundException('Store not found');
    const template = await runBypassingRls(() => this.prisma.raw.industryTemplate.findUnique({ where: { id: templateId } }));
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.client.theme.upsert({
      where: { tenantId: store.id },
      create: { tenantId: store.id, templateId, config: template.defaultConfig as object },
      update: { templateId, config: template.defaultConfig as object },
    });
  }
}
