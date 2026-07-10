import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@utanstore/shared';
import { StaffService } from './staff.service';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('staff')
@UseGuards(TenantGuard)
@Controller('admin/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Get()
  @ApiOperation({ summary: 'List staff users' })
  list() {
    return this.staff.list();
  }

  @Roles(UserRole.STORE_OWNER)
  @Post()
  @ApiOperation({ summary: 'Invite / create a staff user' })
  invite(@Body() body: { name: string; email: string; phone?: string; role: UserRole; password: string }) {
    return this.staff.invite(body);
  }

  @Roles(UserRole.STORE_OWNER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff user (role / active / name)' })
  update(@Param('id') id: string, @Body() body: { role?: UserRole; isActive?: boolean; name?: string }) {
    return this.staff.update(id, body);
  }

  @Roles(UserRole.STORE_OWNER)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a staff user' })
  remove(@Param('id') id: string) {
    return this.staff.remove(id);
  }
}
