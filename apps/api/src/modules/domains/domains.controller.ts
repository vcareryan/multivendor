import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@utanstore/shared';
import { DomainsService } from './domains.service';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('domains')
@Controller()
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  // ---- Public: Caddy on-demand TLS authorization ----
  @Public()
  @Get('public/domains/authorize')
  @ApiOperation({ summary: 'Caddy on-demand TLS ask-endpoint (200 = allow issuance)' })
  async authorize(@Query('domain') domain: string, @Res() res: Response) {
    const allowed = domain ? await this.domains.isAuthorizedForTls(domain) : false;
    res.status(allowed ? 200 : 403).send(allowed ? 'ok' : 'denied');
  }

  // ---- Admin ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Get('admin/domains')
  @ApiOperation({ summary: 'List domains' })
  list() {
    return this.domains.list();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/domains')
  @ApiOperation({ summary: 'Add a custom domain' })
  add(@Body('hostname') hostname: string) {
    return this.domains.add(hostname);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Get('admin/domains/:id/instructions')
  @ApiOperation({ summary: 'Get DNS setup instructions' })
  instructions(@Param('id') id: string) {
    return this.domains.instructions(id);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/domains/:id/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify domain ownership (DNS TXT)' })
  verify(@Param('id') id: string) {
    return this.domains.verify(id);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/domains/:id/primary')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a domain as primary' })
  setPrimary(@Param('id') id: string) {
    return this.domains.setPrimary(id);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Delete('admin/domains/:id')
  @ApiOperation({ summary: 'Remove a custom domain' })
  remove(@Param('id') id: string) {
    return this.domains.remove(id);
  }
}
