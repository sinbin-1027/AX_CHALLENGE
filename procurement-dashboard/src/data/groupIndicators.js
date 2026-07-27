// 직군(department.group_name)별로 적용/제외되는 지표 목록
// - 기획관리/사업/금융업무지원/지역본지부: innovative_product(혁신제품)만 제외 (16개 적용)
// - 연수: 전부 적용 (16개 + 혁신제품 = 17개)
// - 특화기능: 창업기업/사회적기업/온누리상품권 3개만 적용, 나머지 전부 제외
export function buildExcludeTargets(groupName) {
  if (groupName === '연수') return [];
  if (groupName === '특화기능') {
    return [
      'sme', 'women_goods', 'women_service', 'women_construction',
      'disabled_enterprise', 'standard_workshop', 'severe_disabled',
      'cooperative', 'tech_development', 'pilot_purchase', 'nep',
      'green_product', 'jawal_veteran', 'innovative_product',
    ];
  }
  return ['innovative_product'];
}
