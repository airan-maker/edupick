import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { normalizeRoleToView, SupportedViewRole } from './role-view.util';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return {
      ...user,
      role: normalizeRoleToView(user.role),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        profileImageUrl: true,
      },
    });

    return {
      ...user,
      role: normalizeRoleToView(user.role),
    };
  }

  async updateRole(id: string, role: Role | SupportedViewRole) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: normalizeRoleToView(role) },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        profileImageUrl: true,
      },
    });

    return {
      ...user,
      role: normalizeRoleToView(user.role),
    };
  }

  async addChild(parentId: string, dto: CreateChildDto) {
    return this.prisma.child.create({
      data: {
        parentId,
        ...dto,
      },
    });
  }

  async listChildren(parentId: string) {
    return this.prisma.child.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateChild(parentId: string, childId: string, dto: UpdateChildDto) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
    });

    if (!child) {
      throw new NotFoundException('자녀 정보를 찾을 수 없습니다.');
    }

    return this.prisma.child.update({
      where: { id: childId },
      data: dto,
    });
  }
}
