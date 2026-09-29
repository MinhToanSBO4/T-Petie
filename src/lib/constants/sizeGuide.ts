/**
 * Bảng hướng dẫn chọn size chuẩn cho bé theo tháng tuổi, cân nặng và chiều cao
 */

export interface SizeChartRow {
  size: string;
  age: string;
  weight: string;
  height: string;
}

export const SIZE_CHART_BABY: SizeChartRow[] = [
  { size: "0 - 3M", age: "0 - 3 tháng", weight: "3.5 - 5.5 kg", height: "50 - 59 cm" },
  { size: "3 - 6M", age: "3 - 6 tháng", weight: "5.5 - 7.5 kg", height: "60 - 66 cm" },
  { size: "6 - 9M", age: "6 - 9 tháng", weight: "7.5 - 9.0 kg", height: "67 - 72 cm" },
  { size: "9 - 12M", age: "9 - 12 tháng", weight: "9.0 - 10.5 kg", height: "73 - 78 cm" },
];

export const SIZE_CHART_HOC_XINH_KEM: SizeChartRow[] = [
  { size: "Size 90", age: "1 - 2 tuổi", weight: "10 - 12 kg", height: "80 - 90 cm" },
  { size: "Size 100", age: "2 - 4 tuổi", weight: "13 - 15 kg", height: "90 - 100 cm" },
  { size: "Size 110", age: "4 - 5 tuổi", weight: "16 - 20 kg", height: "100 - 110 cm" },
  { size: "Size 120", age: "6 - 7 tuổi", weight: "20 - 25 kg", height: "110 - 120 cm" },
  { size: "Size 130", age: "8 - 9 tuổi", weight: "25 - 30 kg", height: "120 - 130 cm" },
  { size: "Size 140", age: "10 - 11 tuổi", weight: "30 - 35 kg", height: "130 - 140 cm" },
  { size: "Size 150", age: "12 - 13 tuổi", weight: "35 - 40 kg", height: "140 - 150 cm" },
];

export const SIZE_SELECTION_TIPS = [
  "Độ tuổi chỉ mang tính tham khảo, không ưu tiên chọn size theo tuổi vì vóc dáng mỗi bé khác nhau.",
  "Ưu tiên chọn size theo chiều cao đối với các bé dáng cao, gầy (quần áo có thể hơi rộng so với người bé).",
  "Ưu tiên chọn size theo cân nặng đối với các bé tròn người (quần áo có thể hơi dài hơn một chút).",
  "Nếu chiều cao và cân nặng tương ứng 2 size khác nhau, nên chọn size ở giữa (Ví dụ: Cân nặng tương ứng size 120, Chiều cao tương ứng size 140 -> Nên chọn size 130).",
  "Một số sản phẩm có thể được thiết kế lệch size áo và size quần để phù hợp hơn với vóc dáng của các bé."
];
