import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { categorySchema, UserRole, type CategoryInput } from '@utanstore/shared';
import { CategoriesService } from './categories.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  // ---- Storefront (public) ----
  @Public()
  @Get('catalog/categories')
  @ApiOperation({ summary: 'List active categories for the storefront' })
  listPublic() {
    return this.categories.listPublic();
  }

  // ---- Admin ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/categories')
  @ApiOperation({ summary: 'List all categories (admin)' })
  list() {
    return this.categories.list();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/categories')
  @ApiOperation({ summary: 'Create a category' })
  create(@Body(new ZodValidationPipe(categorySchema)) dto: CategoryInput) {
    return this.categories.create(dto);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Patch('admin/categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  update(@Param('id') id: string, @Body(new ZodValidationPipe(categorySchema.partial())) dto: Partial<CategoryInput>) {
    return this.categories.update(id, dto);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Delete('admin/categories/:id')
  @ApiOperation({ summary: 'Delete a category (soft)' })
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
