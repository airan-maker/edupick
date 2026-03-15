import {
  AcademyStatus,
} from '@prisma/client';
import {
  academySeedSyncInternals,
  type NormalizedSeedRecord,
} from '../src/scripts/academy-seed-sync';

describe('academy-seed-sync internals', () => {
  const baseRecord: NormalizedSeedRecord = {
    address: '서울특별시 강남구 테헤란로 123 (역삼동), 4층 401호',
    categories: ['영어'],
    districtName: '강남구',
    lat: null,
    lng: null,
    name: '에이스영어학원',
    officeCode: 'B10',
    phone: '02-123-4567',
    sourceRefs: [],
    status: AcademyStatus.ACTIVE,
  };

  it('parses --skip-kakao-geocoding without disabling all geocoding', () => {
    const options = academySeedSyncInternals.parseCliArgs(['--skip-kakao-geocoding']);

    expect(options.skipGeocoding).toBe(false);
    expect(options.skipKakaoGeocoding).toBe(true);
  });

  it('builds normalized address queries with detail-stripped fallbacks', () => {
    const queries = academySeedSyncInternals.buildAddressGeocodingQueries(baseRecord.address);

    expect(queries).toContain(baseRecord.address);
    expect(queries).toContain('서울특별시 강남구 테헤란로 123');
    expect(queries).toContain('서울 강남구 테헤란로 123');
    expect(new Set(queries).size).toBe(queries.length);
  });

  it('builds district-aware keyword queries for fallback search', () => {
    expect(academySeedSyncInternals.buildKeywordGeocodingQueries(baseRecord)).toEqual([
      '에이스영어학원 강남구',
      '에이스영어학원 영어 강남구',
      '에이스영어학원',
    ]);
  });

  it('prefers the Kakao keyword result that matches name and address best', () => {
    const selected = academySeedSyncInternals.selectBestKakaoKeywordDocument(
      [
        {
          address_name: '서울 서초구 서초대로 45',
          place_name: '에이스영어 서초캠퍼스',
          road_address_name: '서울 서초구 서초대로 45',
          x: '127.021',
          y: '37.501',
        },
        {
          address_name: '서울 강남구 테헤란로 123',
          place_name: '에이스영어학원',
          road_address_name: '서울 강남구 테헤란로 123',
          x: '127.032',
          y: '37.499',
        },
      ],
      baseRecord,
    );

    expect(selected).toMatchObject({
      place_name: '에이스영어학원',
      road_address_name: '서울 강남구 테헤란로 123',
    });
  });

  it('summarizes unresolved records with names and addresses', () => {
    expect(
      academySeedSyncInternals.summarizeUnresolvedRecords([
        baseRecord,
        {
          ...baseRecord,
          address: '서울 강남구 선릉로 55',
          lat: 37.5,
          lng: 127.0,
          name: '해결된학원',
        },
      ]),
    ).toEqual([
      {
        address: '서울특별시 강남구 테헤란로 123 (역삼동), 4층 401호',
        categories: ['영어'],
        districtName: '강남구',
        name: '에이스영어학원',
        phone: '02-123-4567',
        sourceRefs: [],
      },
    ]);
  });
});
