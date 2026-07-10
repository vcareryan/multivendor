import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, type ThemeConfig } from '@utanstore/shared';
import { ThemesService } from './themes.service';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('themes')
@Controller()
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Public()
  @Get('store/theme')
  @ApiOperation({ summary: 'Get the storefront theme' })
  publicTheme() {
    return this.themes.getTheme();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/theme')
  @ApiOperation({ summary: 'Get the store theme (admin)' })
  getTheme() {
    return this.themes.getTheme();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Put('admin/theme')
  @ApiOperation({ summary: 'Update the theme configuration' })
  update(@Body() config: ThemeConfig) {
    return this.themes.updateThemeConfig(config);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Get('admin/theme/templates')
  @ApiOperation({ summary: 'List available industry templates' })
  templates(@Query('industry') industry?: string) {
    return this.themes.listTemplates(industry);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/theme/apply/:templateId')
  @ApiOperation({ summary: 'Apply an industry template' })
  apply(@Param('templateId') templateId: string) {
    return this.themes.applyTemplate(templateId);
  }
}
