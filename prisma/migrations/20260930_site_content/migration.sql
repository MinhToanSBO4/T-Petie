CREATE TABLE "site_content" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

INSERT INTO "site_content" ("key", "data") VALUES
('size_guide', $$
{
  "baby": [
    {"size":"0 - 3M","age":"0 - 3 tháng","weight":"3.5 - 5.5 kg","height":"50 - 59 cm"},
    {"size":"3 - 6M","age":"3 - 6 tháng","weight":"5.5 - 7.5 kg","height":"60 - 66 cm"},
    {"size":"6 - 9M","age":"6 - 9 tháng","weight":"7.5 - 9.0 kg","height":"67 - 72 cm"},
    {"size":"9 - 12M","age":"9 - 12 tháng","weight":"9.0 - 10.5 kg","height":"73 - 78 cm"}
  ],
  "kids": [
    {"size":"Size 90","age":"1 - 2 tuổi","weight":"10 - 12 kg","height":"80 - 90 cm"},
    {"size":"Size 100","age":"2 - 4 tuổi","weight":"13 - 15 kg","height":"90 - 100 cm"},
    {"size":"Size 110","age":"4 - 5 tuổi","weight":"16 - 20 kg","height":"100 - 110 cm"},
    {"size":"Size 120","age":"6 - 7 tuổi","weight":"20 - 25 kg","height":"110 - 120 cm"},
    {"size":"Size 130","age":"8 - 9 tuổi","weight":"25 - 30 kg","height":"120 - 130 cm"},
    {"size":"Size 140","age":"10 - 11 tuổi","weight":"30 - 35 kg","height":"130 - 140 cm"},
    {"size":"Size 150","age":"12 - 13 tuổi","weight":"35 - 40 kg","height":"140 - 150 cm"}
  ],
  "tips": [
    "Độ tuổi chỉ mang tính tham khảo, không ưu tiên chọn size theo tuổi vì vóc dáng mỗi bé khác nhau.",
    "Ưu tiên chọn size theo chiều cao đối với các bé dáng cao, gầy (quần áo có thể hơi rộng so với người bé).",
    "Ưu tiên chọn size theo cân nặng đối với các bé tròn người (quần áo có thể hơi dài hơn một chút).",
    "Nếu chiều cao và cân nặng tương ứng 2 size khác nhau, nên chọn size ở giữa (Ví dụ: Cân nặng tương ứng size 120, Chiều cao tương ứng size 140 -> Nên chọn size 130).",
    "Một số sản phẩm có thể được thiết kế lệch size áo và size quần để phù hợp hơn với vóc dáng của bé."
  ]
}
$$::jsonb),
('home_features', $$
[
  {"id":"natural-fabric","src":"/images/vay-thi-tho-hong.jpg","icon":"🌿","title":"100% Cotton & Đũi Tự Nhiên","description":"Vải được dệt từ sợi tự nhiên hữu cơ, không sử dụng hóa chất nhuộm độc hại, an toàn với làn da non nớt.","objectPosition":"center 15%"},
  {"id":"seams","src":"/images/set-ao-thanh-yen-phoi-chan-vay-caro-xanh.jpg","icon":"🪡","title":"Đường May Lộn Ẩn Tinh Tế","description":"Mọi đường chỉ và cúc bấm đều được xử lý giấu mép kỹ càng, đảm bảo không cọ xát hay làm đau bé khi vận động.","objectPosition":"center 20%"},
  {"id":"comfortable-fit","src":"/images/set-ao-mut-cam-phoi-quan-sooc-be.jpg","icon":"🧸","title":"Form Dáng Dễ Mặc","description":"Thiết kế đũng quần và váy rộng rãi, có cúc bấm đũng tiện lợi cho mẹ thay bỉm cho bé chỉ trong 30 giây.","objectPosition":"center 10%"}
]
$$::jsonb);
