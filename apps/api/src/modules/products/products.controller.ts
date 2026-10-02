import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { productSchema, UserRole, type ProductInput } from '@utanstore/shared';
import { ProductsService, type ProductQuery } from './products.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ---- Storefront (public) ----
  @Public()
  @Get('catalog/products')
  @ApiOperation({ summary: 'List active products (storefront, paginated)' })
  listPublic(@Query() query: ProductQuery) {
    return this.products.list(query, { publicOnly: true });
  }

  @Public()
  @Get('catalog/products/:slug')
  @ApiOperation({ summary: 'Get a product by slug (storefront)' })
  getBySlug(@Param('slug') slug: string) {
    return this.products.getBySlug(slug);
  }

  // ---- Admin ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/products')
  @ApiOperation({ summary: 'List products (admin)' })
  list(@Query() query: ProductQuery) {
    return this.products.list(query, { publicOnly: false });
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/products/:id')
  @ApiOperation({ summary: 'Get a product by id (admin)' })
  getById(@Param('id') id: string) {
    return this.products.getById(id);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/products')
  @ApiOperation({ summary: 'Create a product' })
  create(@Body(new ZodValidationPipe(productSchema)) dto: ProductInput) {
    return this.products.create(dto);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Patch('admin/products/:id')
  @ApiOperation({ summary: 'Update a product' })
  update(@Param('id') id: string, @Body(new ZodValidationPipe(productSchema.partial())) dto: Partial<ProductInput>) {
    return this.products.update(id, dto);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Delete('admin/products/:id')
  @ApiOperation({ summary: 'Delete a product (soft)' })
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
