// "1,234,567원" 형태의 금액 텍스트를 숫자와 "원" 사이 줄바꿈 없이 한 덩어리로 표시.
// 글자 수가 늘어나면 폰트 크기를 단계적으로 줄여 카드 폭 안에 한 줄로 들어오게 한다.
const SCALE_STEPS = [
  { maxLen: 8,  scale: 1 },
  { maxLen: 11, scale: 0.85 },
  { maxLen: 14, scale: 0.7 },
  { maxLen: 17, scale: 0.6 },
  { maxLen: Infinity, scale: 0.5 },
];

function scaleForLength(len) {
  return SCALE_STEPS.find(s => len <= s.maxLen).scale;
}

// 카드 여러 개의 금액 글자 크기를 맞추고 싶을 때, 개별 값이 아닌 이 함수로 미리 계산한
// scale을 AmountText의 scale prop으로 넘기면 자체 계산 대신 그 값을 그대로 쓴다.
export function scaleForValue(value) {
  const text = value == null || value === '' ? '-' : Math.round(Number(value)).toLocaleString('ko-KR') + '원';
  return scaleForLength(text.length);
}

export default function AmountText({ value, className, style, scale: scaleOverride }) {
  const text  = value == null || value === '' ? '-' : Math.round(Number(value)).toLocaleString('ko-KR') + '원';
  const scale = scaleOverride ?? scaleForLength(text.length);

  return (
    <span className={className} style={{ whiteSpace: 'nowrap', ...style }}>
      <span style={scale === 1 ? undefined : { fontSize: `${scale}em` }}>{text}</span>
    </span>
  );
}
