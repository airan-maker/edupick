import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { AcademyStatus, PrismaClient, Role } from '@prisma/client';

type SourceName = 'neis' | 'data-go';

interface RegionTarget {
  officeCode: string;
  districtName: string;
}

export interface CliOptions {
  dryRun: boolean;
  dataGoFilePath?: string;
  dataGoUrl?: string;
  maxRecords?: number;
  outputPath?: string;
  pageSize: number;
  regions: RegionTarget[];
  skipGeocoding: boolean;
  skipKakaoGeocoding: boolean;
}

interface SourceRef {
  source: SourceName;
  sourceId: string | null;
}

interface Coordinates {
  lat: number;
  lng: number;
}

export interface NormalizedSeedRecord {
  address: string;
  categories: string[];
  districtName: string | null;
  lat: number | null;
  lng: number | null;
  name: string;
  officeCode: string | null;
  phone: string | null;
  sourceRefs: SourceRef[];
  status: AcademyStatus;
}

interface SyncSummary {
  created: number;
  dataGoFetched: number;
  dryRun: boolean;
  geocoded: number;
  instructorOwnedDuplicates: number;
  merged: number;
  neisFetched: number;
  outputPath: string | null;
  readyToUpsert: number;
  skippedMissingCoordinates: number;
  unresolvedRecords: UnresolvedSeedRecordSummary[];
  updated: number;
}

interface UnresolvedSeedRecordSummary {
  address: string;
  categories: string[];
  districtName: string | null;
  name: string;
  phone: string | null;
  sourceRefs: string[];
}

const DEFAULT_REGIONS: RegionTarget[] = [
  { officeCode: 'B10', districtName: '강남구' },
  { officeCode: 'B10', districtName: '서초구' },
  { officeCode: 'B10', districtName: '송파구' },
];

const DEFAULT_PAGE_SIZE = 1000;
const IMPORT_OWNER_EMAIL = 'seed-import@edupick.local';
const IMPORT_OWNER_NAME = 'Edupick Seed Import';
const IMPORT_DESCRIPTION =
  '공공 데이터 기반 seed 학원입니다. 상세 정보는 강사 인증 후 업데이트됩니다.';
const MAX_UNRESOLVED_RECORDS_IN_SUMMARY = 20;

const INACTIVE_KEYWORDS = ['폐업', '휴업', '말소', '정지', '취소', 'CLOSED', 'INACTIVE'];
const ACTIVE_KEYWORDS = ['정상', '운영', '영업중', '개원', 'ACTIVE'];

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: '영어', keywords: ['영어', 'ENGLISH', '외국어', '토플', '토익'] },
  { category: '수학', keywords: ['수학', 'MATH'] },
  { category: '발레', keywords: ['발레', '무용', '댄스', 'BALLET'] },
  { category: '축구', keywords: ['축구', '풋살', 'SOCCER', 'FOOTBALL'] },
  { category: '태권도', keywords: ['태권도', '검도', '유도', '합기도', '무술'] },
  { category: '피아노', keywords: ['피아노', '음악', '작곡', '바이올린', '첼로'] },
  { category: '미술', keywords: ['미술', '그림', '디자인', '공예'] },
  { category: '코딩', keywords: ['코딩', '컴퓨터', 'SW', '소프트웨어', '프로그래밍'] },
];

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');

export async function runAcademySeedSync(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  loadEnvFile(ENV_PATH);

  const neisApiKey = process.env.NEIS_API_KEY?.trim();
  const dataGoServiceKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY?.trim();
  const naverMapClientId = process.env.NAVER_MAP_CLIENT_ID?.trim();
  const naverMapClientSecret = process.env.NAVER_MAP_CLIENT_SECRET?.trim();
  const dataGoUrl =
    options.dataGoUrl?.trim() || process.env.DATA_GO_KR_ACADEMY_API_URL?.trim();

  if (!neisApiKey) {
    throw new Error('NEIS_API_KEY 환경 변수가 설정되지 않았습니다.');
  }

  const neisRecords = await fetchNeisSeedRecords({
    apiKey: neisApiKey,
    pageSize: options.pageSize,
    maxRecords: options.maxRecords,
    regions: options.regions,
  });

  const dataGoRecords = await fetchDataGoSeedRecords({
    filePath: options.dataGoFilePath,
    maxRecords: options.maxRecords,
    pageSize: options.pageSize,
    serviceKey: dataGoServiceKey,
    url: dataGoUrl,
  });

  const mergedRecords = mergeSeedRecords([...neisRecords, ...dataGoRecords]);
  const missingCoordinateKeysBefore = new Set(
    mergedRecords
      .filter((record) => record.lat === null || record.lng === null)
      .map((record) => getRecordIdentityKey(record)),
  );
  const geocodedRecords = options.skipGeocoding
    ? mergedRecords
    : await enrichMissingCoordinates(mergedRecords, {
        kakaoApiKey: options.skipKakaoGeocoding ? undefined : kakaoApiKey,
        naverMapClientId,
        naverMapClientSecret,
      });

  const readyRecords = geocodedRecords.filter(
    (record) => record.lat !== null && record.lng !== null,
  );
  const skippedMissingCoordinates = geocodedRecords.length - readyRecords.length;

  const summary: SyncSummary = {
    created: 0,
    dataGoFetched: dataGoRecords.length,
    dryRun: options.dryRun,
    geocoded: geocodedRecords.filter(
      (record) =>
        record.lat !== null &&
        record.lng !== null &&
        missingCoordinateKeysBefore.has(getRecordIdentityKey(record)),
    ).length,
    instructorOwnedDuplicates: 0,
    merged: mergedRecords.length,
    neisFetched: neisRecords.length,
    outputPath: options.outputPath ?? null,
    readyToUpsert: readyRecords.length,
    skippedMissingCoordinates,
    unresolvedRecords: summarizeUnresolvedRecords(geocodedRecords),
    updated: 0,
  };

  if (options.outputPath) {
    writeSnapshot(options.outputPath, readyRecords);
  }

  if (options.dryRun) {
    printSummary(summary);
    return summary;
  }

  const prisma = new PrismaClient();

  try {
    const result = await upsertAcademySeeds(prisma, readyRecords);
    summary.created = result.created;
    summary.updated = result.updated;
    summary.instructorOwnedDuplicates = result.instructorOwnedDuplicates;
  } finally {
    await prisma.$disconnect();
  }

  printSummary(summary);
  return summary;
}

async function fetchNeisSeedRecords(input: {
  apiKey: string;
  maxRecords?: number;
  pageSize: number;
  regions: RegionTarget[];
}) {
  const records: NormalizedSeedRecord[] = [];

  for (const region of input.regions) {
    let pageIndex = 1;

    while (true) {
      if (input.maxRecords && records.length >= input.maxRecords) {
        return records.slice(0, input.maxRecords);
      }

      const url = new URL('https://open.neis.go.kr/hub/acaInsTiInfo');
      url.searchParams.set('KEY', input.apiKey);
      url.searchParams.set('Type', 'json');
      url.searchParams.set('pIndex', String(pageIndex));
      url.searchParams.set('pSize', String(input.pageSize));
      url.searchParams.set('ATPT_OFCDC_SC_CODE', region.officeCode);
      url.searchParams.set('ADMST_ZONE_NM', region.districtName);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`NEIS 요청 실패: ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const rows = extractNeisRows(payload);

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const normalized = normalizeSourceRecord('neis', row);
        if (normalized) {
          records.push(normalized);
        }
      }

      if (rows.length < input.pageSize) {
        break;
      }

      pageIndex += 1;
    }
  }

  return records;
}

async function fetchDataGoSeedRecords(input: {
  filePath?: string;
  maxRecords?: number;
  pageSize: number;
  serviceKey?: string;
  url?: string;
}) {
  const records: NormalizedSeedRecord[] = [];

  if (input.filePath) {
    const items = readDataGoFile(input.filePath);

    for (const item of items) {
      const normalized = normalizeSourceRecord('data-go', item);
      if (normalized) {
        records.push(normalized);
      }
    }
  }

  if (!input.url) {
    return trimToMax(records, input.maxRecords);
  }

  if (!input.serviceKey) {
    throw new Error(
      'DATA_GO_KR_SERVICE_KEY 환경 변수가 없어서 data.go.kr API 호출을 진행할 수 없습니다.',
    );
  }

  let pageNo = 1;

  while (true) {
    if (input.maxRecords && records.length >= input.maxRecords) {
      return records.slice(0, input.maxRecords);
    }

    const url = new URL(input.url);
    url.searchParams.set('serviceKey', input.serviceKey);
    url.searchParams.set('pageNo', String(pageNo));
    url.searchParams.set('numOfRows', String(input.pageSize));

    if (!url.searchParams.has('type')) {
      url.searchParams.set('type', 'json');
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`data.go.kr 요청 실패: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const items = extractDataGoItems(payload);

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const normalized = normalizeSourceRecord('data-go', item);
      if (normalized) {
        records.push(normalized);
      }
    }

    if (items.length < input.pageSize) {
      break;
    }

    pageNo += 1;
  }

  return trimToMax(records, input.maxRecords);
}

function normalizeSourceRecord(
  source: SourceName,
  rawRecord: Record<string, unknown>,
): NormalizedSeedRecord | null {
  const name = pickFirstString(rawRecord, [
    'ACA_NM',
    'ACADEMY_NAME',
    'INSTT_NM',
    'BSSH_NM',
    'FACLT_NM',
    'PEI_NM',
    '학원명',
  ]);
  const address = pickFirstString(rawRecord, [
    'FA_RDNMA',
    'REFINE_ROADNM_ADDR',
    'REFINE_LOTNO_ADDR',
    'ROAD_ADDRESS',
    'ROAD_NM_ADDR',
    '도로명주소',
    'ADDR',
    'ADDRESS',
    'ADRES',
  ]);

  if (!name || !address) {
    return null;
  }

  const categoryText = [
    pickFirstString(rawRecord, [
      'REALM_SC_NM',
      'CATEGORY',
      'CATEGORY_NM',
      'FCLTY_CATEGORY',
      'FLD_NM',
      '분야명',
    ]),
    pickFirstString(rawRecord, [
      'LE_CRSE_NM',
      'SUBJECT',
      'SUBJECT_NM',
      'COURSE_NM',
      'TRNG_AFLT_NM',
      'TRNG_CRS_LIST_NM',
      'TRNG_CRS_NM',
      '교습계열명',
      '교습과정목록명',
      '교습과정명',
    ]),
    pickFirstString(rawRecord, ['INDUTY_NM']),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  const phone = sanitizePhone(
    pickFirstString(rawRecord, ['FA_TELNO', 'TELNO', 'PHONE', 'PHONE_NO', 'TEL']),
  );

  const status = parseAcademyStatus(
    pickFirstString(rawRecord, [
      'TRDSTATE_NM',
      'SVCSTATNM',
      'STATUS',
      'BSN_STATE_NM',
      'REG_STTS_NM',
      '등록상태명',
    ]),
  );

  const lat = parseOptionalFloat(
    pickFirstString(rawRecord, [
      'LAT',
      'LATITUDE',
      'REFINE_WGS84_LAT',
      'YPOS',
      'Y',
    ]),
  );
  const lng = parseOptionalFloat(
    pickFirstString(rawRecord, [
      'LNG',
      'LON',
      'LONGITUDE',
      'REFINE_WGS84_LOGT',
      'REFINE_WGS84_LON',
      'XPOS',
      'X',
    ]),
  );

  const categories = normalizeCategories(categoryText || name);

  return {
    address: normalizeWhitespace(address),
    categories,
    districtName:
      pickFirstString(rawRecord, [
        'ADMST_ZONE_NM',
        'SIGUN_NM',
        'SIGUNGU_NM',
        'ADMDST_NM',
        '행정구역명',
      ]) ?? null,
    lat,
    lng,
    name: normalizeWhitespace(name),
    officeCode:
      pickFirstString(rawRecord, ['ATPT_OFCDC_SC_CODE', 'CTPRVN_CD', 'SIDO_CODE']) ?? null,
    phone,
    sourceRefs: [
      {
        source,
        sourceId:
          pickFirstString(rawRecord, [
            'ACA_ASNUM',
            'MGT_NO',
            'ID',
            'ROW_ID',
            'PEI_DSGN_NO',
            '학원지정번호',
          ]) ?? null,
      },
    ],
    status,
  };
}

function mergeSeedRecords(records: NormalizedSeedRecord[]) {
  const byPhone = new Map<string, NormalizedSeedRecord>();
  const byNameAddress = new Map<string, NormalizedSeedRecord>();

  for (const record of records) {
    const phoneKey = record.phone ? normalizePhone(record.phone) : null;
    const nameAddressKey = getNameAddressKey(record.name, record.address);
    const existing =
      (phoneKey ? byPhone.get(phoneKey) : undefined) ?? byNameAddress.get(nameAddressKey);

    if (!existing) {
      const cloned = cloneRecord(record);
      if (phoneKey) {
        byPhone.set(phoneKey, cloned);
      }
      byNameAddress.set(nameAddressKey, cloned);
      continue;
    }

    mergeIntoExisting(existing, record);

    const mergedPhoneKey = existing.phone ? normalizePhone(existing.phone) : null;
    if (mergedPhoneKey) {
      byPhone.set(mergedPhoneKey, existing);
    }
    byNameAddress.set(nameAddressKey, existing);
  }

  return [...new Set(byNameAddress.values())];
}

async function enrichMissingCoordinates(
  records: NormalizedSeedRecord[],
  input: {
    kakaoApiKey?: string;
    naverMapClientId?: string;
    naverMapClientSecret?: string;
  },
) {
  if (!input.kakaoApiKey && !hasNaverMapCredentials(input)) {
    return records;
  }

  const coordinateCache = new Map<string, Coordinates | null>();

  for (const record of records) {
    if (record.lat !== null && record.lng !== null) {
      continue;
    }

    const cacheKey = record.address;
    if (!coordinateCache.has(cacheKey)) {
      coordinateCache.set(cacheKey, await fetchCoordinates(record, input));
    }

    const cached = coordinateCache.get(cacheKey);
    if (cached) {
      record.lat = cached.lat;
      record.lng = cached.lng;
    }
  }

  return records;
}

function hasNaverMapCredentials(input: {
  naverMapClientId?: string;
  naverMapClientSecret?: string;
}) {
  return Boolean(input.naverMapClientId && input.naverMapClientSecret);
}

async function fetchCoordinates(
  record: NormalizedSeedRecord,
  input: {
    kakaoApiKey?: string;
    naverMapClientId?: string;
    naverMapClientSecret?: string;
  },
) {
  if (input.kakaoApiKey) {
    const kakaoCoordinates = await fetchCoordinatesFromKakao(record, input.kakaoApiKey);
    if (kakaoCoordinates) {
      return kakaoCoordinates;
    }
  }

  if (hasNaverMapCredentials(input)) {
    return fetchCoordinatesFromNaver(
      record,
      input.naverMapClientId!,
      input.naverMapClientSecret!,
    );
  }

  return null;
}

async function fetchCoordinatesFromKakao(
  record: NormalizedSeedRecord,
  apiKey: string,
): Promise<Coordinates | null> {
  for (const query of buildAddressGeocodingQueries(record.address)) {
    const addressUrl = new URL('https://dapi.kakao.com/v2/local/search/address.json');
    addressUrl.searchParams.set('query', query);

    const addressResponse = await fetch(addressUrl, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!addressResponse.ok) {
      continue;
    }

    const payload = (await addressResponse.json()) as {
      documents?: Array<{ x?: string; y?: string }>;
    };
    const firstDocument = payload.documents?.[0];

    if (firstDocument?.x && firstDocument.y) {
      return {
        lat: Number(firstDocument.y),
        lng: Number(firstDocument.x),
      };
    }
  }

  for (const query of buildKeywordGeocodingQueries(record)) {
    const keywordUrl = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
    keywordUrl.searchParams.set('query', query);
    keywordUrl.searchParams.set('category_group_code', 'AC5');

    const keywordResponse = await fetch(keywordUrl, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!keywordResponse.ok) {
      continue;
    }

    const payload = (await keywordResponse.json()) as {
      documents?: KakaoKeywordDocument[];
    };
    const selectedDocument = selectBestKakaoKeywordDocument(
      payload.documents ?? [],
      record,
    );

    if (selectedDocument?.x && selectedDocument.y) {
      return {
        lat: Number(selectedDocument.y),
        lng: Number(selectedDocument.x),
      };
    }
  }

  return null;
}

async function fetchCoordinatesFromNaver(
  record: NormalizedSeedRecord,
  clientId: string,
  clientSecret: string,
): Promise<Coordinates | null> {
  for (const query of buildAddressGeocodingQueries(record.address)) {
    const geocodeUrl = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
    geocodeUrl.searchParams.set('query', query);

    const response = await fetch(geocodeUrl, {
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
      },
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as {
      addresses?: Array<{ x?: string; y?: string }>;
    };
    const firstAddress = payload.addresses?.[0];

    if (firstAddress?.x && firstAddress.y) {
      return {
        lat: Number(firstAddress.y),
        lng: Number(firstAddress.x),
      };
    }
  }

  return null;
}

async function upsertAcademySeeds(prisma: PrismaClient, records: NormalizedSeedRecord[]) {
  const importOwner = await prisma.user.upsert({
    where: { email: IMPORT_OWNER_EMAIL },
    update: {
      name: IMPORT_OWNER_NAME,
      role: Role.INSTRUCTOR,
    },
    create: {
      email: IMPORT_OWNER_EMAIL,
      name: IMPORT_OWNER_NAME,
      role: Role.INSTRUCTOR,
    },
  });

  const academies = await prisma.academy.findMany({
    select: {
      address: true,
      categories: true,
      id: true,
      name: true,
      ownerId: true,
      phone: true,
    },
  });

  const phoneMap = new Map<string, typeof academies[number]>();
  const nameAddressMap = new Map<string, typeof academies[number]>();

  for (const academy of academies) {
    if (academy.phone) {
      const normalizedPhone = normalizePhone(academy.phone);
      if (normalizedPhone) {
        phoneMap.set(normalizedPhone, academy);
      }
    }
    nameAddressMap.set(getNameAddressKey(academy.name, academy.address), academy);
  }

  let created = 0;
  let updated = 0;
  let instructorOwnedDuplicates = 0;

  for (const record of records) {
    const phoneKey = record.phone ? normalizePhone(record.phone) : null;
    const existing =
      (phoneKey ? phoneMap.get(phoneKey) : undefined) ??
      nameAddressMap.get(getNameAddressKey(record.name, record.address));

    if (!existing) {
      const createdAcademy = await prisma.academy.create({
        data: {
          address: record.address,
          categories: record.categories,
          description: IMPORT_DESCRIPTION,
          hasParking: false,
          hasShuttle: false,
          lat: record.lat!,
          lng: record.lng!,
          name: record.name,
          ownerId: importOwner.id,
          phone: record.phone,
          status: record.status,
        },
      });

      const lookupAcademy = {
        address: createdAcademy.address,
        categories: createdAcademy.categories,
        id: createdAcademy.id,
        name: createdAcademy.name,
        ownerId: createdAcademy.ownerId,
        phone: createdAcademy.phone,
      };

      if (createdAcademy.phone) {
        const normalizedPhone = normalizePhone(createdAcademy.phone);
        if (normalizedPhone) {
          phoneMap.set(normalizedPhone, lookupAcademy);
        }
      }
      nameAddressMap.set(
        getNameAddressKey(createdAcademy.name, createdAcademy.address),
        lookupAcademy,
      );

      created += 1;
      continue;
    }

    if (existing.ownerId !== importOwner.id) {
      instructorOwnedDuplicates += 1;
      continue;
    }

    await prisma.academy.update({
      where: { id: existing.id },
      data: {
        address: record.address,
        categories: mergeCategoryLists(existing.categories, record.categories),
        lat: record.lat!,
        lng: record.lng!,
        name: record.name,
        phone: record.phone,
        status: record.status,
      },
    });

    updated += 1;
  }

  return {
    created,
    instructorOwnedDuplicates,
    updated,
  };
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    pageSize: DEFAULT_PAGE_SIZE,
    regions: DEFAULT_REGIONS,
    skipGeocoding: false,
    skipKakaoGeocoding: false,
  };

  for (const argument of argv) {
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (argument === '--skip-geocoding') {
      options.skipGeocoding = true;
      continue;
    }

    if (argument === '--skip-kakao-geocoding') {
      options.skipKakaoGeocoding = true;
      continue;
    }

    if (argument.startsWith('--regions=')) {
      const rawValue = argument.slice('--regions='.length);
      options.regions = rawValue
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [officeCode, districtName] = entry.split(':');
          if (!officeCode || !districtName) {
            throw new Error(
              '--regions 형식이 잘못되었습니다. 예시: --regions=B10:강남구,B10:서초구',
            );
          }

          return { districtName, officeCode };
        });
      continue;
    }

    if (argument.startsWith('--page-size=')) {
      options.pageSize = parsePositiveInteger(
        argument.slice('--page-size='.length),
        '--page-size',
      );
      continue;
    }

    if (argument.startsWith('--max-records=')) {
      options.maxRecords = parsePositiveInteger(
        argument.slice('--max-records='.length),
        '--max-records',
      );
      continue;
    }

    if (argument.startsWith('--output=')) {
      options.outputPath = path.resolve(PROJECT_ROOT, argument.slice('--output='.length));
      continue;
    }

    if (argument.startsWith('--data-go-url=')) {
      options.dataGoUrl = argument.slice('--data-go-url='.length);
      continue;
    }

    if (argument.startsWith('--data-go-file=')) {
      options.dataGoFilePath = path.resolve(
        PROJECT_ROOT,
        argument.slice('--data-go-file='.length),
      );
      continue;
    }

    throw new Error(`알 수 없는 옵션입니다: ${argument}`);
  }

  return options;
}

function extractNeisRows(payload: Record<string, unknown>) {
  const section = payload.acaInsTiInfo;

  if (!Array.isArray(section)) {
    return [];
  }

  const resultBlock = section.find(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      'head' in entry &&
      Array.isArray((entry as { head?: unknown[] }).head),
  ) as { head?: unknown[] } | undefined;

  const resultCode = extractNeisResultCode(resultBlock?.head ?? []);
  if (resultCode && resultCode !== 'INFO-000') {
    throw new Error(`NEIS 응답 오류: ${resultCode}`);
  }

  const rowBlock = section.find(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      'row' in entry &&
      Array.isArray((entry as { row?: unknown[] }).row),
  ) as { row?: unknown[] } | undefined;

  return (rowBlock?.row ?? []).filter(
    (row): row is Record<string, unknown> =>
      typeof row === 'object' && row !== null && !Array.isArray(row),
  );
}

function extractNeisResultCode(head: unknown[]) {
  for (const entry of head) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'RESULT' in entry &&
      typeof (entry as { RESULT?: { CODE?: unknown } }).RESULT?.CODE === 'string'
    ) {
      return (entry as { RESULT: { CODE: string } }).RESULT.CODE;
    }
  }

  return null;
}

function extractDataGoItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  if (Array.isArray(record.DATA)) {
    return record.DATA.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  const responseItems = (((record.response as Record<string, unknown> | undefined)?.body ??
    {}) as Record<string, unknown>).items;

  if (Array.isArray(responseItems)) {
    return responseItems.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  if (
    responseItems &&
    typeof responseItems === 'object' &&
    Array.isArray((responseItems as { item?: unknown[] }).item)
  ) {
    return (responseItems as { item: unknown[] }).item.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  return [];
}

function pickFirstString(record: Record<string, unknown>, candidates: string[]) {
  const value = pickValue(record, candidates);
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

interface KakaoKeywordDocument {
  address_name?: string;
  place_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
}

function buildAddressGeocodingQueries(address: string) {
  const normalizedAddress = normalizeWhitespace(address);
  const withoutParentheses = normalizeWhitespace(
    normalizedAddress.replace(/\([^)]*\)/g, ' '),
  );
  const withoutCommas = normalizeWhitespace(normalizedAddress.replace(/,/g, ' '));
  const simplifiedAddress = normalizeWhitespace(withoutParentheses.replace(/,/g, ' '));
  const compactAdministrative = compactAdministrativeAddress(normalizedAddress);
  const compactSimplifiedAddress = compactAdministrativeAddress(simplifiedAddress);

  return dedupeStrings([
    normalizedAddress,
    withoutParentheses,
    withoutCommas,
    simplifiedAddress,
    stripTrailingAddressDetails(normalizedAddress),
    stripTrailingAddressDetails(withoutParentheses),
    stripTrailingAddressDetails(withoutCommas),
    compactAdministrative,
    compactSimplifiedAddress,
    stripTrailingAddressDetails(compactAdministrative),
    stripTrailingAddressDetails(compactSimplifiedAddress),
  ]);
}

function buildKeywordGeocodingQueries(record: NormalizedSeedRecord) {
  const district =
    record.districtName ?? extractDistrictName(record.address) ?? extractDistrictName(record.name);
  const primaryCategory =
    record.categories.find((category) => category && category !== '기타') ?? null;

  return dedupeStrings([
    district ? `${record.name} ${district}` : null,
    primaryCategory && district ? `${record.name} ${primaryCategory} ${district}` : null,
    record.name,
  ]);
}

function selectBestKakaoKeywordDocument(
  documents: KakaoKeywordDocument[],
  record: NormalizedSeedRecord,
) {
  const normalizedName = normalizeName(record.name);
  const normalizedAddress = normalizeAddress(
    stripTrailingAddressDetails(compactAdministrativeAddress(record.address)),
  );
  const district = record.districtName ?? extractDistrictName(record.address);

  const rankedDocuments = documents
    .filter((document) => Boolean(document.x && document.y))
    .map((document, index) => ({
      document,
      index,
      score: scoreKakaoKeywordDocument(document, {
        district,
        normalizedAddress,
        normalizedName,
      }),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return rankedDocuments[0]?.document ?? null;
}

function scoreKakaoKeywordDocument(
  document: KakaoKeywordDocument,
  input: {
    district: string | null;
    normalizedAddress: string;
    normalizedName: string;
  },
) {
  let score = 0;

  const placeName = document.place_name ? normalizeName(document.place_name) : '';
  const roadAddress = document.road_address_name
    ? normalizeAddress(document.road_address_name)
    : '';
  const addressName = document.address_name ? normalizeAddress(document.address_name) : '';
  const documentDistrict = extractDistrictName(
    [document.road_address_name, document.address_name].filter(Boolean).join(' '),
  );

  if (
    placeName &&
    (placeName.includes(input.normalizedName) || input.normalizedName.includes(placeName))
  ) {
    score += 4;
  }

  if (
    roadAddress &&
    (roadAddress.includes(input.normalizedAddress) ||
      input.normalizedAddress.includes(roadAddress))
  ) {
    score += 3;
  } else if (
    addressName &&
    (addressName.includes(input.normalizedAddress) ||
      input.normalizedAddress.includes(addressName))
  ) {
    score += 2;
  }

  if (input.district && documentDistrict === input.district) {
    score += 1;
  }

  return score;
}

function compactAdministrativeAddress(value: string) {
  return normalizeWhitespace(
    value
      .replace(/대한민국/g, ' ')
      .replace(/서울특별시|서울시/g, '서울')
      .replace(/부산광역시|부산시/g, '부산')
      .replace(/대구광역시|대구시/g, '대구')
      .replace(/인천광역시|인천시/g, '인천')
      .replace(/광주광역시|광주시/g, '광주')
      .replace(/대전광역시|대전시/g, '대전')
      .replace(/울산광역시|울산시/g, '울산')
      .replace(/세종특별자치시/g, '세종')
      .replace(/경기도/g, '경기')
      .replace(/강원특별자치도|강원도/g, '강원')
      .replace(/충청북도/g, '충북')
      .replace(/충청남도/g, '충남')
      .replace(/전라북도|전북특별자치도/g, '전북')
      .replace(/전라남도/g, '전남')
      .replace(/경상북도/g, '경북')
      .replace(/경상남도/g, '경남')
      .replace(/제주특별자치도/g, '제주'),
  );
}

function stripTrailingAddressDetails(value: string) {
  let next = normalizeWhitespace(value);

  const detailPatterns = [
    /\s+[A-Za-z0-9가-힣-]*\d+층(?:\s.*)?$/u,
    /\s+[A-Za-z0-9가-힣-]*\d+호(?:\s.*)?$/u,
    /\s+(?:지하|반지하|옥탑)(?:\s.*)?$/u,
  ];

  for (const pattern of detailPatterns) {
    next = normalizeWhitespace(next.replace(pattern, ' '));
  }

  return normalizeWhitespace(next.replace(/[,./·-]+$/u, ' '));
}

function extractDistrictName(value: string) {
  const matches = value.match(/[가-힣]+(?:구|군|시)/g);
  if (!matches) {
    return null;
  }

  return matches.find((match) => match.endsWith('구') || match.endsWith('군')) ?? matches[0];
}

function dedupeStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function pickValue(record: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeKey(candidate)));

  for (const [key, value] of Object.entries(record)) {
    if (normalizedCandidates.has(normalizeKey(key)) && value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
}

function parseAcademyStatus(value: string | null) {
  if (!value) {
    return AcademyStatus.ACTIVE;
  }

  const upperValue = value.toUpperCase();

  if (INACTIVE_KEYWORDS.some((keyword) => upperValue.includes(keyword))) {
    return AcademyStatus.INACTIVE;
  }

  if (ACTIVE_KEYWORDS.some((keyword) => upperValue.includes(keyword))) {
    return AcademyStatus.ACTIVE;
  }

  return AcademyStatus.ACTIVE;
}

function normalizeCategories(rawCategoryText: string) {
  const upperText = rawCategoryText.toUpperCase();
  const categories = CATEGORY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => upperText.includes(keyword.toUpperCase())),
  ).map((rule) => rule.category);

  if (categories.length > 0) {
    return [...new Set(categories)];
  }

  const fallback = rawCategoryText
    .split(/[\/,>·|]/)
    .map((token) => normalizeWhitespace(token))
    .filter(Boolean)
    .find((token) => token.length <= 10);

  return fallback ? [fallback] : ['기타'];
}

function mergeIntoExisting(target: NormalizedSeedRecord, incoming: NormalizedSeedRecord) {
  target.name = pickBetterString(target.name, incoming.name);
  target.address = pickBetterString(target.address, incoming.address);
  target.phone = target.phone ?? incoming.phone;
  target.officeCode = target.officeCode ?? incoming.officeCode;
  target.districtName = target.districtName ?? incoming.districtName;
  target.lat = target.lat ?? incoming.lat;
  target.lng = target.lng ?? incoming.lng;
  target.status =
    target.status === AcademyStatus.ACTIVE || incoming.status === AcademyStatus.ACTIVE
      ? AcademyStatus.ACTIVE
      : AcademyStatus.INACTIVE;
  target.categories = mergeCategoryLists(target.categories, incoming.categories);
  target.sourceRefs = dedupeSourceRefs([...target.sourceRefs, ...incoming.sourceRefs]);
}

function mergeCategoryLists(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming])];
}

function dedupeSourceRefs(sourceRefs: SourceRef[]) {
  const seen = new Set<string>();

  return sourceRefs.filter((sourceRef) => {
    const key = `${sourceRef.source}:${sourceRef.sourceId ?? 'missing'}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function summarizeUnresolvedRecords(records: NormalizedSeedRecord[]) {
  return records
    .filter((record) => record.lat === null || record.lng === null)
    .slice(0, MAX_UNRESOLVED_RECORDS_IN_SUMMARY)
    .map((record) => ({
      address: record.address,
      categories: record.categories,
      districtName: record.districtName,
      name: record.name,
      phone: record.phone,
      sourceRefs: record.sourceRefs.map(
        (sourceRef) => `${sourceRef.source}:${sourceRef.sourceId ?? 'missing'}`,
      ),
    }));
}

function cloneRecord(record: NormalizedSeedRecord): NormalizedSeedRecord {
  return {
    address: record.address,
    categories: [...record.categories],
    districtName: record.districtName,
    lat: record.lat,
    lng: record.lng,
    name: record.name,
    officeCode: record.officeCode,
    phone: record.phone,
    sourceRefs: [...record.sourceRefs],
    status: record.status,
  };
}

function getNameAddressKey(name: string, address: string) {
  return `${normalizeName(name)}::${normalizeAddress(address)}`;
}

function getRecordIdentityKey(record: Pick<NormalizedSeedRecord, 'name' | 'address'>) {
  return getNameAddressKey(record.name, record.address);
}

function normalizeName(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/(학원|교습소|스튜디오|센터|교육원|아카데미)$/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
}

function normalizeAddress(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/(대한민국|서울특별시|서울시)/g, '서울')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
}

function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function sanitizePhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = normalizeWhitespace(value);
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function pickBetterString(current: string, incoming: string) {
  return incoming.length > current.length ? incoming : current;
}

function parseOptionalFloat(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKey(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function readDataGoFile(filePath: string) {
  if (path.extname(filePath).toLowerCase() === '.csv') {
    return readCsvFile(filePath);
  }

  return extractDataGoItems(readJsonFile(filePath));
}

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}

function readCsvFile(filePath: string) {
  const rawBuffer = readFileSync(filePath);
  const utf8Text = new TextDecoder('utf-8').decode(rawBuffer);
  const content = utf8Text.includes('\uFFFD')
    ? new TextDecoder('euc-kr').decode(rawBuffer)
    : utf8Text;

  return parseCsvRecords(content);
}

function parseCsvRecords(content: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (inQuotes && content[index + 1] === '"') {
        value += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && content[index + 1] === '\n') {
        index += 1;
      }

      row.push(value);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += character;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.replace(/^\uFEFF/, '').trim());

  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index]?.trim() ?? ''])),
  );
}

function trimToMax<T>(items: T[], maxItems?: number) {
  return maxItems ? items.slice(0, maxItems) : items;
}

function parsePositiveInteger(rawValue: string, optionName: string) {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} 값은 1 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).split('#')[0].trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function writeSnapshot(outputPath: string, records: NormalizedSeedRecord[]) {
  const directoryPath = path.dirname(outputPath);
  mkdirSync(directoryPath, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
}

function printSummary(summary: SyncSummary) {
  console.log(
    JSON.stringify(
      {
        created: summary.created,
        dataGoFetched: summary.dataGoFetched,
        dryRun: summary.dryRun,
        geocoded: summary.geocoded,
        instructorOwnedDuplicates: summary.instructorOwnedDuplicates,
        merged: summary.merged,
        neisFetched: summary.neisFetched,
        outputPath: summary.outputPath,
        readyToUpsert: summary.readyToUpsert,
        skippedMissingCoordinates: summary.skippedMissingCoordinates,
        unresolvedRecords: summary.unresolvedRecords,
        updated: summary.updated,
      },
      null,
      2,
    ),
  );
}

export const academySeedSyncInternals = {
  buildAddressGeocodingQueries,
  buildKeywordGeocodingQueries,
  parseCliArgs,
  selectBestKakaoKeywordDocument,
  summarizeUnresolvedRecords,
  stripTrailingAddressDetails,
};

if (require.main === module) {
  runAcademySeedSync().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
