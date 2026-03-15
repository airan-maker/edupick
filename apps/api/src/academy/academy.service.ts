import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { CreateAcademyDto } from './dto/create-academy.dto';

const dayLabelMap: Record<DayOfWeek, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
};

const landingDefaultLocation = {
  lat: 37.4918,
  lng: 127.0077,
  radius: 6,
};

@Injectable()
export class AcademyService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const academies = await this.prisma.academy.findMany({
      where: { ownerId: userId },
      include: {
        classes: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return academies.map((academy) => {
      const classCount = academy.classes.length;
      const activeEnrollmentCount = academy.classes.reduce(
        (sum, classItem) => sum + classItem.enrollments.length,
        0,
      );
      const openClassCount = academy.classes.filter(
        (classItem) => classItem.status === 'OPEN',
      ).length;

      return {
        id: academy.id,
        name: academy.name,
        address: academy.address,
        lat: academy.lat,
        lng: academy.lng,
        phone: academy.phone,
        categories: academy.categories,
        description: academy.description,
        hasShuttle: academy.hasShuttle,
        hasParking: academy.hasParking,
        monthlyFeeMin: academy.monthlyFeeMin,
        monthlyFeeMax: academy.monthlyFeeMax,
        rating: academy.rating,
        reviewCount: academy.reviewCount,
        createdAt: academy.createdAt,
        metrics: {
          classCount,
          openClassCount,
          activeEnrollmentCount,
        },
      };
    });
  }

  async findNearby(query: NearbyQueryDto) {
    const {
      lat,
      lng,
      radius = 3,
      category,
      keyword,
      ageGroup,
      shuttle,
      priceMin,
      priceMax,
      timeAfter,
      sortBy = 'distance',
      page = 1,
      limit = 20,
    } = query;

    const offset = (page - 1) * limit;

    const academies = await this.prisma.academy.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { categories: { has: category } } : {}),
        ...(shuttle !== undefined ? { hasShuttle: shuttle } : {}),
      },
      include: {
        classes: {
          where: { status: { in: ['OPEN', 'FULL'] } },
          include: {
            schedules: true,
          },
        },
      },
    });

    const requiresClassMatch =
      Boolean(ageGroup) ||
      Boolean(timeAfter) ||
      priceMin !== undefined ||
      priceMax !== undefined;

    const normalizedKeyword = keyword?.toLowerCase();

    const filtered = academies
      .map((academy) => {
        const distanceKm = this.calculateDistance(lat, lng, academy.lat, academy.lng);
        const academySearchable = [
          academy.name,
          academy.address,
          academy.categories.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        const matchesAcademyKeyword = normalizedKeyword
          ? academySearchable.includes(normalizedKeyword)
          : true;

        if (distanceKm > radius) {
          return null;
        }

        const matchingClasses = academy.classes.filter((classItem) => {
          const matchesAgeGroup = ageGroup
            ? classItem.ageGroup?.includes(ageGroup) ?? false
            : true;
          const matchesTime = timeAfter
            ? classItem.schedules.some((schedule) => schedule.startTime >= timeAfter)
            : true;
          const matchesPriceMin =
            priceMin !== undefined ? classItem.monthlyFee >= priceMin : true;
          const matchesPriceMax =
            priceMax !== undefined ? classItem.monthlyFee <= priceMax : true;
          const searchable = [
            academy.name,
            academy.address,
            academy.categories.join(' '),
            classItem.name,
            classItem.subject,
            classItem.ageGroup ?? '',
          ]
            .join(' ')
            .toLowerCase();
          const matchesKeyword = normalizedKeyword
            ? searchable.includes(normalizedKeyword)
            : true;

          return (
            matchesAgeGroup &&
            matchesTime &&
            matchesPriceMin &&
            matchesPriceMax &&
            matchesKeyword
          );
        });

        if (matchingClasses.length === 0 && (requiresClassMatch || !matchesAcademyKeyword)) {
          return null;
        }

        const representativeClass = [...matchingClasses].sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'OPEN' ? -1 : 1;
          }
          return a.monthlyFee - b.monthlyFee;
        })[0];

        const monthlyFees = matchingClasses.map((item) => item.monthlyFee);

        return {
          id: academy.id,
          name: academy.name,
          address: academy.address,
          lat: academy.lat,
          lng: academy.lng,
          categories: academy.categories,
          rating: academy.rating,
          reviewCount: academy.reviewCount,
          hasShuttle: academy.hasShuttle,
          hasParking: academy.hasParking,
          monthlyFeeMin:
            academy.monthlyFeeMin ?? (monthlyFees.length > 0 ? Math.min(...monthlyFees) : null),
          monthlyFeeMax:
            academy.monthlyFeeMax ?? (monthlyFees.length > 0 ? Math.max(...monthlyFees) : null),
          distanceM: Math.round(distanceKm * 1000),
          openClassCount: matchingClasses.filter((item) => item.status === 'OPEN').length,
          representativeClass: representativeClass
            ? {
                id: representativeClass.id,
                name: representativeClass.name,
                subject: representativeClass.subject,
                ageGroup: representativeClass.ageGroup,
                monthlyFee: representativeClass.monthlyFee,
                scheduleSummary: this.getScheduleSummary(representativeClass.schedules),
                spotsLeft: Math.max(
                  representativeClass.maxStudents - representativeClass.currentStudents,
                  0,
                ),
              }
            : null,
        };
      })
      .filter((academy): academy is NonNullable<typeof academy> => academy !== null);

    filtered.sort((left, right) => {
      switch (sortBy) {
        case 'rating':
          return right.rating - left.rating || left.distanceM - right.distanceM;
        case 'price':
          return (
            (left.monthlyFeeMin ?? Number.MAX_SAFE_INTEGER) -
              (right.monthlyFeeMin ?? Number.MAX_SAFE_INTEGER) ||
            left.distanceM - right.distanceM
          );
        default:
          return left.distanceM - right.distanceM || right.rating - left.rating;
      }
    });

    return {
      data: filtered.slice(offset, offset + limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    };
  }

  async findById(id: string) {
    const academy = await this.prisma.academy.findUnique({
      where: { id },
      include: {
        classes: {
          where: { status: { not: 'CLOSED' } },
          include: {
            schedules: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, profileImageUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    if (!academy) {
      throw new NotFoundException('학원을 찾을 수 없습니다.');
    }

    const monthlyFees = academy.classes.map((classItem) => classItem.monthlyFee);

    return {
      id: academy.id,
      name: academy.name,
      address: academy.address,
      lat: academy.lat,
      lng: academy.lng,
      phone: academy.phone,
      categories: academy.categories,
      description: academy.description,
      hasShuttle: academy.hasShuttle,
      hasParking: academy.hasParking,
      rating: academy.rating,
      reviewCount: academy.reviewCount,
      monthlyFeeMin:
        academy.monthlyFeeMin ?? (monthlyFees.length > 0 ? Math.min(...monthlyFees) : null),
      monthlyFeeMax:
        academy.monthlyFeeMax ?? (monthlyFees.length > 0 ? Math.max(...monthlyFees) : null),
      owner: academy.owner,
      reviewSummary: {
        averageRating: academy.rating,
        totalCount: academy.reviewCount,
      },
      classes: academy.classes.map((classItem) => ({
        id: classItem.id,
        name: classItem.name,
        subject: classItem.subject,
        ageGroup: classItem.ageGroup,
        monthlyFee: classItem.monthlyFee,
        currentStudents: classItem.currentStudents,
        maxStudents: classItem.maxStudents,
        status: classItem.status,
        spotsLeft: Math.max(classItem.maxStudents - classItem.currentStudents, 0),
        schedules: classItem.schedules,
        scheduleSummary: this.getScheduleSummary(classItem.schedules),
      })),
      reviews: academy.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        isVerified: review.isVerified,
        createdAt: review.createdAt,
        user: review.user,
      })),
    };
  }

  async findHighlights() {
    const nearbyResult = await this.findNearby({
      lat: landingDefaultLocation.lat,
      lng: landingDefaultLocation.lng,
      radius: landingDefaultLocation.radius,
      sortBy: 'rating',
      page: 1,
      limit: 6,
    });

    const featuredAcademies = [...nearbyResult.data]
      .sort((left, right) => {
        return (
          right.reviewCount - left.reviewCount ||
          right.rating - left.rating ||
          left.distanceM - right.distanceM
        );
      })
      .slice(0, 3);

    const featuredReviews = await this.getFeaturedReviews(
      featuredAcademies.map((academy) => academy.id),
    );

    return {
      featuredAcademies,
      featuredReviews,
    };
  }

  async create(ownerId: string, dto: CreateAcademyDto) {
    return this.prisma.academy.create({
      data: {
        ownerId,
        ...dto,
      },
    });
  }

  async update(
    academyId: string,
    userId: string,
    dto: Partial<CreateAcademyDto>,
  ) {
    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
    });

    if (!academy) {
      throw new NotFoundException('학원을 찾을 수 없습니다.');
    }

    if (academy.ownerId !== userId) {
      throw new ForbiddenException('학원 수정 권한이 없습니다.');
    }

    return this.prisma.academy.update({
      where: { id: academyId },
      data: dto,
    });
  }

  private calculateDistance(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const deltaLat = toRadians(toLat - fromLat);
    const deltaLng = toRadians(toLng - fromLng);
    const lat1 = toRadians(fromLat);
    const lat2 = toRadians(toLat);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2) *
        Math.cos(lat1) *
        Math.cos(lat2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getScheduleSummary(
    schedules: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }>,
  ) {
    if (schedules.length === 0) {
      return '일정 정보 없음';
    }

    const sorted = [...schedules].sort((left, right) => {
      const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      return order.indexOf(left.dayOfWeek) - order.indexOf(right.dayOfWeek);
    });

    const dayLabels = sorted.map((item) => dayLabelMap[item.dayOfWeek]).join('/');
    return `${dayLabels} ${sorted[0].startTime}~${sorted[0].endTime}`;
  }

  private async getFeaturedReviews(academyIds: string[]) {
    const primaryReviews = academyIds.length
      ? await this.prisma.review.findMany({
          where: {
            academyId: { in: academyIds },
            content: { not: null },
            academy: { status: 'ACTIVE' },
          },
          include: {
            academy: {
              select: {
                id: true,
                name: true,
                address: true,
                categories: true,
                hasShuttle: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
          take: 12,
        })
      : [];

    const fallbackReviews =
      primaryReviews.length >= 3
        ? []
        : await this.prisma.review.findMany({
            where: {
              content: { not: null },
              academy: { status: 'ACTIVE' },
              ...(academyIds.length
                ? {
                    academyId: {
                      notIn: academyIds,
                    },
                  }
                : {}),
            },
            include: {
              academy: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  categories: true,
                  hasShuttle: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
            take: 12,
          });

    const reviewPool = [...primaryReviews, ...fallbackReviews];
    const usedAcademies = new Set<string>();
    const selected: typeof reviewPool = [];

    for (const review of reviewPool) {
      if (!review.content?.trim()) {
        continue;
      }

      if (usedAcademies.has(review.academyId)) {
        continue;
      }

      selected.push(review);
      usedAcademies.add(review.academyId);

      if (selected.length === 3) {
        break;
      }
    }

    if (selected.length < 3) {
      for (const review of reviewPool) {
        if (!review.content?.trim()) {
          continue;
        }

        if (selected.some((item) => item.id === review.id)) {
          continue;
        }

        selected.push(review);

        if (selected.length === 3) {
          break;
        }
      }
    }

    return selected.map((review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      isVerified: review.isVerified,
      createdAt: review.createdAt,
      user: {
        id: review.user.id,
        name: review.user.name,
      },
      academy: {
        id: review.academy.id,
        name: review.academy.name,
        address: review.academy.address,
        category: review.academy.categories[0] ?? '기타',
        hasShuttle: review.academy.hasShuttle,
      },
    }));
  }
}
